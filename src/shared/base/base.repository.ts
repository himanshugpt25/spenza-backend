import {
  PoolClient,
  QueryConfig,
  QueryResult,
  QueryResultRow,
} from "pg";
import { PostgresDatabase } from "../../config/database";

export abstract class BaseRepository {
  protected constructor(protected readonly db: PostgresDatabase) {}

  protected query<T extends QueryResultRow>(
    queryText: string | QueryConfig,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.db.query<T>(queryText, values);
  }

  protected async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

