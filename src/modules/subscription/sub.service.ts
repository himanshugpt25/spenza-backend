import { AppError } from "../../shared/utils/appError";
import {
  ISubscriptionRepository,
  SubscriptionRecord,
} from "./sub.repository";
import { CreateSubscriptionDto } from "./sub.schema";

export interface SubscriptionResponse {
  id: string;
  name: string;
  callbackUrl: string;
  isActive: boolean;
}

export interface ISubscriptionService {
  create(payload: CreateSubscriptionDto): Promise<SubscriptionResponse>;
  getById(id: string): Promise<SubscriptionResponse>;
  toggleStatus(id: string, isActive: boolean): Promise<SubscriptionResponse>;
}

export class SubscriptionService implements ISubscriptionService {
  constructor(private readonly repository: ISubscriptionRepository) {}

  async create(payload: CreateSubscriptionDto): Promise<SubscriptionResponse> {
    const subscription = await this.repository.create(payload);
    return this.toResponse(subscription);
  }

  async getById(id: string): Promise<SubscriptionResponse> {
    const subscription = await this.repository.findById(id);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    return this.toResponse(subscription);
  }

  async toggleStatus(id: string, isActive: boolean): Promise<SubscriptionResponse> {
    const subscription = await this.repository.updateStatus(id, isActive);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    return this.toResponse(subscription);
  }

  private toResponse(record: SubscriptionRecord): SubscriptionResponse {
    return {
      id: record.id,
      name: record.name,
      callbackUrl: record.callback_url,
      isActive: record.is_active,
    };
  }
}

