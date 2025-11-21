import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { CreateSubscriptionDto } from "./sub.schema";
import { AppError } from "../../shared/utils/appError";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  target_url: string;
  is_active: boolean;
  metadata: {
    name: string;
    description?: string;
  };
  created_at: Date;
  deleted_at: Date | null;
}

export interface CreateSubscriptionInput {
  userId: string;
  targetUrl: string;
  isActive: boolean;
  name: string;
  description?: string | undefined;
}

export interface ISubscriptionRepository {
  create(payload: CreateSubscriptionInput): Promise<SubscriptionRecord>;
  findByUser(userId: string): Promise<SubscriptionRecord[]>;
  findById(id: string): Promise<SubscriptionRecord | null>;
  softDelete(id: string): Promise<void>;
}

export class SubscriptionRepository
  extends BaseRepository
  implements ISubscriptionRepository
{
  constructor(db: PostgresDatabase) {
    super(db);
  }

  async create(payload: CreateSubscriptionInput): Promise<SubscriptionRecord> {
    const query = `
      INSERT INTO subscriptions (user_id, target_url, is_active, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, target_url, is_active, metadata, created_at;
    `;
    const result: QueryResult<SubscriptionRecord> = await this.query(query, [
      payload.userId,
      payload.targetUrl,
      payload.isActive,
      {
        name: payload.name,
        description: payload.description,
      },
    ]);
    const subscription = result.rows[0];
    if (!subscription) {
      throw new AppError("Failed to create subscription", 500);
    }
    return subscription;
  }

  async findByUser(userId: string): Promise<SubscriptionRecord[]> {
    const query = `
      SELECT id, user_id, target_url, is_active, metadata, created_at, deleted_at
      FROM subscriptions
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `;
    const result: QueryResult<SubscriptionRecord> = await this.query(query, [
      userId,
    ]);
    return result.rows;
  }

  async findById(id: string): Promise<SubscriptionRecord | null> {
    const query = `
      SELECT id, user_id, target_url, is_active, metadata, created_at, deleted_at
      FROM subscriptions
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1;
    `;
    const result: QueryResult<SubscriptionRecord> = await this.query(query, [
      id,
    ]);
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<void> {
    const query = `
      UPDATE subscriptions
      SET deleted_at = NOW()
      WHERE id = $1;
    `;
    await this.query(query, [id]);
  }
}
