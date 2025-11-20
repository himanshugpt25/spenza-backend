import pino, { LoggerOptions } from "pino";

const isProduction = process.env.NODE_ENV === "production";

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
};

export const logger = pino(
  isProduction
    ? baseOptions
    : {
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      },
);

