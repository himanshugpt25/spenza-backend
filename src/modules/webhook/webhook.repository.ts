import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { IngestWebhookDto } from "./webhook.schema";
import { AppError } from "../../shared/utils/appError";

export interface WebhookEventRecord {
  id: string;
  subscription_id: string;
  event_type: string;
  payload: unknown;
  status: "pending" | "processed" | "failed";
  created_at: Date;
  updated_at: Date;
}

export interface IWebhookRepository {
  createEvent(subscriptionId: string, payload: IngestWebhookDto): Promise<WebhookEventRecord>;
  markAsProcessed(eventId: string): Promise<void>;
  markAsFailed(eventId: string, reason: string): Promise<void>;
  findById(eventId: string): Promise<WebhookEventRecord | null>;
}

export class WebhookRepository
  extends BaseRepository
  implements IWebhookRepository
{
  constructor(db: PostgresDatabase) {
    super(db);
  }

  async createEvent(
    subscriptionId: string,
    payload: IngestWebhookDto,
  ): Promise<WebhookEventRecord> {
    const query = `
      INSERT INTO webhook_events (subscription_id, event_type, payload, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, subscription_id, event_type, payload, status, created_at, updated_at;
    `;
    const values = [subscriptionId, payload.eventType, payload.payload];
    const result: QueryResult<WebhookEventRecord> = await this.query(
      query,
      values,
    );
    const event = result.rows[0];
    if (!event) {
      throw new AppError("Failed to persist webhook event", 500);
    }
    return event;
  }

  async markAsProcessed(eventId: string): Promise<void> {
    await this.query(
      `UPDATE webhook_events SET status = 'processed', updated_at = NOW() WHERE id = $1`,
      [eventId],
    );
  }

  async markAsFailed(eventId: string, reason: string): Promise<void> {
    await this.query(
      `UPDATE webhook_events SET status = 'failed', updated_at = NOW(), error_reason = $2 WHERE id = $1`,
      [eventId, reason],
    );
  }

  async findById(eventId: string): Promise<WebhookEventRecord | null> {
    const query = `
      SELECT id, subscription_id, event_type, payload, status, created_at, updated_at
      FROM webhook_events
      WHERE id = $1
      LIMIT 1;
    `;
    const result: QueryResult<WebhookEventRecord> = await this.query(query, [
      eventId,
    ]);
    return result.rows[0] ?? null;
  }
}

