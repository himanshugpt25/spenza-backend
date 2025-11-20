import { RabbitMQService } from "../../config/rabbitmq";
import { AppError } from "../../shared/utils/appError";
import { ISubscriptionRepository } from "../subscription/sub.repository";
import { IWebhookRepository } from "./webhook.repository";
import { IngestWebhookDto } from "./webhook.schema";

const WEBHOOK_EXCHANGE = "webhook_exchange";
const WEBHOOK_ROUTING_KEY = "deliver";
const WEBHOOK_QUEUE = "webhook.ingest";
const WEBHOOK_DLX = "webhook_dlx";
const WEBHOOK_DLX_ROUTING_KEY = "retry";

export interface IWebhookService {
  ingest(
    subscriptionId: string,
    payload: IngestWebhookDto
  ): Promise<{ eventId: string }>;
}

export class WebhookService implements IWebhookService {
  constructor(
    private readonly webhookRepository: IWebhookRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly rabbitMQService: RabbitMQService
  ) {}

  async ingest(
    subscriptionId: string,
    payload: IngestWebhookDto
  ): Promise<{ eventId: string }> {
    const subscription = await this.subscriptionRepository.findById(
      subscriptionId
    );
    if (!subscription || !subscription.is_active) {
      throw new AppError("Subscription inactive or missing", 404);
    }

    await this.ensureMessagingTopology();

    const event = await this.webhookRepository.createEvent(
      subscriptionId,
      payload
    );

    await this.rabbitMQService.publish(WEBHOOK_EXCHANGE, WEBHOOK_ROUTING_KEY, {
      eventId: event.id,
      subscriptionId,
    });

    return { eventId: event.id };
  }

  private async ensureMessagingTopology(): Promise<void> {
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
  }
}
