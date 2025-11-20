import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { IngestWebhookDto } from "./webhook.schema";
import { AppError } from "../../shared/utils/appError";

export type EventStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface WebhookEventRecord {
  id: string;
  subscription_id: string;
  payload: IngestWebhookDto;
  status: EventStatus;
  attempt_count: number;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IWebhookRepository {
  createEvent(
    subscriptionId: string,
    payload: IngestWebhookDto
  ): Promise<WebhookEventRecord>;
  updateStatus(
    eventId: string,
    status: EventStatus,
    attemptCount?: number,
    lastError?: string | null
  ): Promise<void>;
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
    payload: IngestWebhookDto
  ): Promise<WebhookEventRecord> {
    const query = `
      INSERT INTO events (subscription_id, payload, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING id, subscription_id, payload, status, attempt_count, created_at, updated_at;
    `;
    const values = [subscriptionId, JSON.stringify(payload)];
    const result: QueryResult<WebhookEventRecord> = await this.query(
      query,
      values
    );
    const event = result.rows[0];
    if (!event) {
      throw new AppError("Failed to persist webhook event", 500);
    }
    return this.mapPayload(event);
  }

  async updateStatus(
    eventId: string,
    status: EventStatus,
    attemptCount?: number,
    lastError?: string | null
  ): Promise<void> {
    const query = `
      UPDATE events
      SET status = $2,
          attempt_count = COALESCE($3, attempt_count),
          last_error = $4,
          updated_at = NOW()
      WHERE id = $1
    `;
    await this.query(query, [
      eventId,
      status,
      attemptCount ?? null,
      lastError ?? null,
    ]);
  }

  async findById(eventId: string): Promise<WebhookEventRecord | null> {
    const query = `
      SELECT id, subscription_id, payload, status, attempt_count, created_at, updated_at
      FROM events
      WHERE id = $1
      LIMIT 1;
    `;
    const result: QueryResult<WebhookEventRecord> = await this.query(query, [
      eventId,
    ]);
    const event = result.rows[0];
    return event ? this.mapPayload(event) : null;
  }

  private mapPayload(record: WebhookEventRecord): WebhookEventRecord {
    const rawPayload = record.payload as unknown;
    const parsedPayload =
      typeof rawPayload === "string"
        ? (JSON.parse(rawPayload) as IngestWebhookDto)
        : (rawPayload as IngestWebhookDto);
    return {
      ...record,
      payload: parsedPayload,
    };
  }
}
