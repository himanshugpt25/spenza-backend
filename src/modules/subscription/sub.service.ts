import { AppError } from "../../shared/utils/appError";
import {
  CreateSubscriptionInput,
  ISubscriptionRepository,
  SubscriptionRecord,
} from "./sub.repository";
import { CreateSubscriptionDto } from "./sub.schema";

export interface SubscriptionResponse {
  id: string;
  targetUrl: string;
  isActive: boolean;
  createdAt: Date;
  name: string;
  description?: string | undefined;
}

import { IWebhookRepository } from "../webhook/webhook.repository";
import { WebhookEventRecord } from "../webhook/webhook.repository";

export interface ISubscriptionService {
  addSubscription(
    userId: string,
    payload: CreateSubscriptionDto
  ): Promise<any>;
  listSubscriptions(userId: string): Promise<SubscriptionResponse[]>;
  getEvents(
    subscriptionId: string,
    page: number,
    limit: number
  ): Promise<{ events: WebhookEventRecord[]; total: number; page: number; limit: number }>;
  getById(id: string): Promise<SubscriptionResponse>;
  deleteSubscription(userId: string, subscriptionId: string): Promise<void>;
}

export class SubscriptionService implements ISubscriptionService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly webhookRepository: IWebhookRepository
  ) {}

  async addSubscription(
    userId: string,
    payload: CreateSubscriptionDto
  ): Promise<SubscriptionResponse> {
    const data: CreateSubscriptionInput = {
      userId,
      targetUrl: payload.targetUrl,
      isActive: payload.isActive,
      name: payload.name,
      description: payload.description,
    };
    const subscription = await this.subscriptionRepository.create(data);
    return this.toResponse(subscription);
  }

  async listSubscriptions(userId: string): Promise<SubscriptionResponse[]> {
    const subscriptions = await this.subscriptionRepository.findByUser(userId);
    return subscriptions.map((sub) => this.toResponse(sub));
  }

  async getEvents(
    subscriptionId: string,
    page: number,
    limit: number
  ): Promise<{ events: WebhookEventRecord[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const { events, total } = await this.webhookRepository.getEventsBySubscriptionId(
      subscriptionId,
      limit,
      offset
    );
    return { events, total, page, limit };
  }

  async getById(id: string): Promise<SubscriptionResponse> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    return this.toResponse(subscription);
  }

  async deleteSubscription(userId: string, subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    if (subscription.user_id !== userId) {
      throw new AppError("Unauthorized to delete this subscription", 403);
    }
    await this.subscriptionRepository.softDelete(subscriptionId);
  }

  private toResponse(record: SubscriptionRecord): SubscriptionResponse {
    return {
      id: record.id,
      targetUrl: record.target_url,
      isActive: record.is_active,
      createdAt: record.created_at,
      name: record.metadata.name,
      description: record.metadata.description,
    };
  }
}
