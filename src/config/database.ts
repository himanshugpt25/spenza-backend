import {
  Pool,
  PoolClient,
  PoolConfig,
  QueryConfig,
  QueryResult,
  QueryResultRow,
} from "pg";
import { config } from "./config";
import { logger } from "../shared/utils/logger";

export class PostgresDatabase {
  private pool: Pool;

  constructor() {
    const poolConfig: PoolConfig = {
      connectionString: config.DATABASE_URL,
      max: 10,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(poolConfig);
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
    logger.info("Connected to PostgreSQL");
  }

  query<T extends QueryResultRow>(
    queryText: string | QueryConfig,
    values?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(queryText, values);
  }

  getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info("PostgreSQL pool closed");
  }
}
