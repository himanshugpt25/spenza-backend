import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { AppError } from "../utils/appError";

type RequestPart = "body" | "query" | "params";

export function validateRequest(
  schema: ZodSchema,
  part: RequestPart = "body",
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req[part]);
      (req as Record<RequestPart, unknown>)[part] = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((issue) => issue.message).join(", ");
        throw new AppError(message, 400);
      }
      next(error);
    }
  };
}

