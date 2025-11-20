import { QueryResult } from "pg";
import { BaseRepository } from "../../shared/base/base.repository";
import { PostgresDatabase } from "../../config/database";
import { RegisterDto } from "./auth.schema";
import { AppError } from "../../shared/utils/appError";

export interface IUserRepository {
  createUser(payload: RegisterDto & { passwordHash: string }): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: Date;
}

export class UserRepository extends BaseRepository implements IUserRepository {
  constructor(db: PostgresDatabase) {
    super(db);
  }

  async createUser(payload: RegisterDto & { passwordHash: string }): Promise<UserRecord> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash, first_name, last_name, created_at;
    `;
    const values = [
      payload.email,
      payload.passwordHash,
      payload.firstName,
      payload.lastName,
    ];

    const result: QueryResult<UserRecord> = await this.query(query, values);
    const user = result.rows[0];
    if (!user) {
      throw new AppError("Failed to create user", 500);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, created_at
      FROM users
      WHERE email = $1
      LIMIT 1;
    `;
    const result: QueryResult<UserRecord> = await this.query(query, [email]);
    return result.rows[0] ?? null;
  }
}

