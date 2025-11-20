import { ConsumeMessage, Channel } from "amqplib";
import { RabbitMQService } from "../../config/rabbitmq";
import { IWebhookRepository } from "./webhook.repository";
import { logger } from "../../shared/utils/logger";

const WEBHOOK_QUEUE = "webhook.ingest";

interface QueuePayload {
  eventId: string;
  subscriptionId: string;
}

export class WebhookWorker {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly webhookRepository: IWebhookRepository,
  ) {}

  async start(): Promise<void> {
    await this.rabbitMQService.assertQueue(WEBHOOK_QUEUE);
    await this.rabbitMQService.consume(
      WEBHOOK_QUEUE,
      async (message, channel) => {
        await this.handleMessage(message, channel);
      },
    );
    logger.info("Webhook worker listening");
  }

  private async handleMessage(message: ConsumeMessage, _channel: Channel): Promise<void> {
    const payload = JSON.parse(message.content.toString()) as QueuePayload;
    logger.info({ eventId: payload.eventId }, "Processing webhook event");
    try {
      // Placeholder for downstream processing logic (HTTP calls, etc.)
      await this.webhookRepository.markAsProcessed(payload.eventId);
    } catch (error) {
      logger.error({ error, payload }, "Failed to process webhook event");
      await this.webhookRepository.markAsFailed(
        payload.eventId,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }
}

