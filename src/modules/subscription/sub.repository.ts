import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { CreateSubscriptionDto } from "./sub.schema";
import { AppError } from "../../shared/utils/appError";

export interface SubscriptionRecord {
  id: string;
  name: string;
  callback_url: string;
  is_active: boolean;
  created_at: Date;
}

export interface ISubscriptionRepository {
  create(payload: CreateSubscriptionDto): Promise<SubscriptionRecord>;
  findById(id: string): Promise<SubscriptionRecord | null>;
  updateStatus(id: string, isActive: boolean): Promise<SubscriptionRecord | null>;
}

export class SubscriptionRepository
  extends BaseRepository
  implements ISubscriptionRepository
{
  constructor(db: PostgresDatabase) {
    super(db);
  }

  async create(payload: CreateSubscriptionDto): Promise<SubscriptionRecord> {
    const query = `
      INSERT INTO subscriptions (name, callback_url, is_active)
      VALUES ($1, $2, $3)
      RETURNING id, name, callback_url, is_active, created_at;
    `;
    const values = [payload.name, payload.callbackUrl, payload.isActive];
    const result: QueryResult<SubscriptionRecord> = await this.query(
      query,
      values,
    );
    const subscription = result.rows[0];
    if (!subscription) {
      throw new AppError("Failed to create subscription", 500);
    }
    return subscription;
  }

  async findById(id: string): Promise<SubscriptionRecord | null> {
    const query = `
      SELECT id, name, callback_url, is_active, created_at
      FROM subscriptions
      WHERE id = $1
      LIMIT 1;
    `;
    const result: QueryResult<SubscriptionRecord> = await this.query(query, [
      id,
    ]);
    return result.rows[0] ?? null;
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<SubscriptionRecord | null> {
    const query = `
      UPDATE subscriptions
      SET is_active = $2
      WHERE id = $1
      RETURNING id, name, callback_url, is_active, created_at;
    `;
    const result: QueryResult<SubscriptionRecord> = await this.query(query, [
      id,
      isActive,
    ]);
    return result.rows[0] ?? null;
  }
}

