import axios from "axios";
import { Channel, ConsumeMessage } from "amqplib";
import { RabbitMQService } from "../../config/rabbitmq";
import { WebhookRepository } from "./webhook.repository";
import { logger } from "../../shared/utils/logger";
import { config } from "../../config/config";
import { ISubscriptionRepository } from "../subscription/sub.repository";
import { socketService, SocketService } from "../../shared/services/socket.service";

const WEBHOOK_EXCHANGE = "webhook_exchange";
const WEBHOOK_ROUTING_KEY = "deliver";
const WEBHOOK_QUEUE = "webhook.ingest";
const WEBHOOK_DLX = "webhook_dlx";
const WEBHOOK_DLX_ROUTING_KEY = "retry";
const WEBHOOK_WAIT_QUEUE = "webhook.retry";

interface QueuePayload {
  eventId: string;
  subscriptionId: string;
}

export class WebhookWorker {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly webhookRepository: WebhookRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly socketService: SocketService
  ) {}

  async start(): Promise<void> {
    await this.setupQueues();
    await this.rabbitMQService.consume(
      WEBHOOK_QUEUE,
      async (message, channel) => {
        await this.handleMessage(message, channel);
      }
    );
    logger.info("Webhook worker listening");
  }

  private async setupQueues(): Promise<void> {
    await this.rabbitMQService.assertExchange(WEBHOOK_EXCHANGE, "direct");
    await this.rabbitMQService.assertExchange(WEBHOOK_DLX, "direct");

    await this.rabbitMQService.assertQueue(WEBHOOK_QUEUE, {
      arguments: {
        "x-dead-letter-exchange": WEBHOOK_DLX,
        "x-dead-letter-routing-key": WEBHOOK_DLX_ROUTING_KEY,
      },
    });
    await this.rabbitMQService.bindQueue(
      WEBHOOK_QUEUE,
      WEBHOOK_EXCHANGE,
      WEBHOOK_ROUTING_KEY
    );

    await this.rabbitMQService.assertQueue(WEBHOOK_WAIT_QUEUE, {
      arguments: {
        "x-message-ttl": config.WEBHOOK_RETRY_TTL_MS,
        "x-dead-letter-exchange": WEBHOOK_EXCHANGE,
        "x-dead-letter-routing-key": WEBHOOK_ROUTING_KEY,
      },
    });
    await this.rabbitMQService.bindQueue(
      WEBHOOK_WAIT_QUEUE,
      WEBHOOK_DLX,
      WEBHOOK_DLX_ROUTING_KEY
    );
  }

  private async handleMessage(
    message: ConsumeMessage,
    channel: Channel
  ): Promise<void> {
    const payload = JSON.parse(message.content.toString()) as QueuePayload;
    logger.info({ eventId: payload.eventId }, "Processing webhook event");

    const event = await this.webhookRepository.findById(payload.eventId);
    const subscription = await this.subscriptionRepository.findById(
      payload.subscriptionId
    );
    if (!event) {
      logger.warn({ eventId: payload.eventId }, "Event not found");
      channel.ack(message);
      return;
    }
    if (!subscription) {
      logger.warn(
        { subscriptionId: payload.subscriptionId },
        "Subscription not found"
      );
      channel.ack(message);
      return;
    }

    const nextAttempt = event.attempt_count + 1;
    await this.webhookRepository.updateStatus(
      event.id,
      "PROCESSING",
      nextAttempt
    );

    try {
      const response = await axios.post(subscription.target_url, event.payload);
      await this.webhookRepository.updateStatus(
        event.id,
        "SUCCESS",
        nextAttempt,
        null
      );
      channel.ack(message);

      // Emit real-time event
      this.socketService.emit(`subscription:${event.subscription_id}`, "event_processed", {
        id: event.id,
        status: "SUCCESS",
        last_error: null,
        created_at: event.created_at,
        attempt_count: nextAttempt,
      });

      logger.info(
        { eventId: event.id, subscriptionId: event.subscription_id, status: response.status },
        "Webhook delivered successfully"
      );

    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown delivery error";

      const hasAttemptsRemaining = nextAttempt < config.WEBHOOK_MAX_ATTEMPTS;

      await this.webhookRepository.updateStatus(
        event.id,
        hasAttemptsRemaining ? "PENDING" : "FAILED",
        nextAttempt, // Keep nextAttempt as the third argument
        errorMessage
      );

      // Emit real-time event for failure
      this.socketService.emit(`subscription:${event.subscription_id}`, "event_processed", {
        id: event.id,
        status: hasAttemptsRemaining ? "PENDING" : "FAILED",
        last_error: errorMessage,
        created_at: event.created_at,
        attempt_count: nextAttempt,
      });

      if (hasAttemptsRemaining) {
        logger.warn(
          { eventId: event.id, nextAttempt },
          "Delivery failed, scheduling retry"
        );
        channel.nack(message, false, false);
      } else {
        logger.error(
          { eventId: event.id },
          "Max delivery attempts reached, dropping event"
        );
        channel.ack(message);
      }
    }
  }
}
