import { Request } from "express";

export type TypedRequestBody<T> = Request<unknown, unknown, T>;
export type TypedRequestParams<T> = Request<T>;
export type TypedRequestQuery<T> = Request<unknown, unknown, unknown, T>;

export interface AuthenticatedRequest<
  Params = Record<string, unknown>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user: {
    id: string;
  };
}
