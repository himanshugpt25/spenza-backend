import { Request } from "express";

export type TypedRequestBody<T> = Request<unknown, unknown, T>;
export type TypedRequestParams<T> = Request<T>;
export type TypedRequestQuery<T> = Request<unknown, unknown, unknown, T>;

