import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
});

const env = envSchema.parse(process.env);

export const config = {
  ...env,
  isProduction: env.NODE_ENV === "production",
};

export type AppConfig = typeof config;

