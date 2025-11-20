import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { AppError } from "../../shared/utils/appError";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  refresh_token_hash: string | null;
  created_at: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface IUserRepository {
  create(payload: CreateUserInput): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string
  ): Promise<void>;
}

export class UserRepository extends BaseRepository implements IUserRepository {
  constructor(db: PostgresDatabase) {
    super(db);
  }

  async create(payload: CreateUserInput): Promise<UserRecord> {
    const query = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, password_hash, refresh_token_hash, created_at;
    `;

    const result: QueryResult<UserRecord> = await this.query(query, [
      payload.email,
      payload.passwordHash,
    ]);
    const user = result.rows[0];
    if (!user) {
      throw new AppError("Failed to create user", 500);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const query = `
      SELECT id, email, password_hash, refresh_token_hash, created_at
      FROM users
      WHERE email = $1
      LIMIT 1;
    `;
    const result: QueryResult<UserRecord> = await this.query(query, [email]);
    return result.rows[0] ?? null;
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string
  ): Promise<void> {
    await this.query(
      `
        UPDATE users
        SET refresh_token_hash = $2
        WHERE id = $1
      `,
      [userId, refreshTokenHash]
    );
  }
}
