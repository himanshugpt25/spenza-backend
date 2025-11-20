import { RabbitMQService } from "../../config/rabbitmq";
import { AppError } from "../../shared/utils/appError";
import { ISubscriptionRepository } from "../subscription/sub.repository";
import { IWebhookRepository } from "./webhook.repository";
import { IngestWebhookDto } from "./webhook.schema";

export interface IWebhookService {
  ingest(subscriptionId: string, payload: IngestWebhookDto): Promise<{ eventId: string }>;
  markProcessed(eventId: string): Promise<void>;
  markFailed(eventId: string, reason: string): Promise<void>;
}

const WEBHOOK_QUEUE = "webhook.ingest";

export class WebhookService implements IWebhookService {
  constructor(
    private readonly webhookRepository: IWebhookRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async ingest(subscriptionId: string, payload: IngestWebhookDto): Promise<{ eventId: string }> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription || !subscription.is_active) {
      throw new AppError("Subscription inactive or missing", 404);
    }

    await this.rabbitMQService.assertQueue(WEBHOOK_QUEUE);
    const event = await this.webhookRepository.createEvent(subscriptionId, payload);
    await this.rabbitMQService.sendToQueue(WEBHOOK_QUEUE, {
      eventId: event.id,
      subscriptionId,
    });

    return { eventId: event.id };
  }

  markProcessed(eventId: string): Promise<void> {
    return this.webhookRepository.markAsProcessed(eventId);
  }

  markFailed(eventId: string, reason: string): Promise<void> {
    return this.webhookRepository.markAsFailed(eventId, reason);
  }
}

