import { NextFunction, Response, RequestHandler } from "express";
import { tokenManager } from "../utils/tokenManager";
import { AppError } from "../utils/appError";
import { AuthenticatedRequest } from "../types/express";

export const authenticate: RequestHandler = (req, _res, next: NextFunction) => {
  const authorization = req.headers.authorization;
  let token: string | undefined;

  if (authorization?.startsWith("Bearer ")) {
    token = authorization.split(" ")[1];
  } else if (req.cookies?.["spenza-accessToken"]) {
    token = req.cookies["spenza-accessToken"];
  }

  if (!token) {
    throw new AppError("Missing bearer token", 401);
  }

  try {
    const payload = tokenManager.verifyAccessToken(token);
    (req as AuthenticatedRequest).user = { id: payload.sub };
    next();
  } catch (error) {
    throw new AppError("Invalid or expired token", 401, false);
  }
};
