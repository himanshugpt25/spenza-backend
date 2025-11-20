import { NextFunction, Response } from "express";
import { tokenManager } from "../utils/tokenManager";
import { AppError } from "../utils/appError";
import { AuthenticatedRequest } from "../types/express";

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid authorization header", 401);
  }

  const token = authorization.split(" ")[1];
  if (!token) {
    throw new AppError("Missing bearer token", 401);
  }
  try {
    const payload = tokenManager.verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (error) {
    throw new AppError("Invalid or expired token", 401, false);
  }
}
