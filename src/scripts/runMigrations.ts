import fs from "fs/promises";
import path from "path";
import { Client } from "pg";
import { logger } from "../shared/utils/logger";
import { config } from "../config/config";

async function runMigrations() {
  const connectionString =
    process.env.MIGRATION_DATABASE_URL ?? config.DATABASE_URL;
  const client = new Client({
    connectionString,
  });

  await client.connect();
  logger.info("Connected to database. Running migrations...");

  const migrationsDir = path.resolve(__dirname, "../../migrations");
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((file) => file.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, "utf-8");

    logger.info({ migration: file }, "Applying migration");
    await client.query(sql);
    logger.info({ migration: file }, "Migration applied");
  }

  await client.end();
  logger.info("All migrations applied successfully");
}

runMigrations().catch((error) => {
  logger.error({ error }, "Migration failed");
  process.exit(1);
});
