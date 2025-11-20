import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { formatError } from "../utils/responseFormatter";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Unexpected error";

  if (!isOperational) {
    logger.error({ err }, "Unhandled application error");
  }

  res.status(statusCode).json(formatError(message));
}

