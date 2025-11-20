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

export interface ISubscriptionService {
  addSubscription(
    userId: string,
    payload: CreateSubscriptionDto
  ): Promise<SubscriptionResponse>;
  listSubscriptions(userId: string): Promise<SubscriptionResponse[]>;
  getById(id: string): Promise<SubscriptionResponse>;
}

export class SubscriptionService implements ISubscriptionService {
  constructor(private readonly repository: ISubscriptionRepository) {}

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
    const subscription = await this.repository.create(data);
    return this.toResponse(subscription);
  }

  async listSubscriptions(userId: string): Promise<SubscriptionResponse[]> {
    const subscriptions = await this.repository.findByUser(userId);
    return subscriptions.map((subscription) => this.toResponse(subscription));
  }

  async getById(id: string): Promise<SubscriptionResponse> {
    const subscription = await this.repository.findById(id);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    return this.toResponse(subscription);
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
