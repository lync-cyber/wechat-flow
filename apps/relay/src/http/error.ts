import { randomUUID } from "node:crypto";
import type { Context } from "hono";

export type HttpErrorStatus = 400 | 401 | 403 | 404 | 413 | 429 | 500 | 501 | 502;

export interface ErrorBody {
  code: string;
  message: string;
  requestId: string;
}

export interface ErrorEnvelope {
  error: ErrorBody;
}

export function resolveRequestId(c: Context): string {
  const header = c.req.header("x-request-id");
  return header && header.length > 0 ? header : randomUUID();
}

export function buildErrorEnvelope(
  code: string,
  message: string,
  requestId: string
): ErrorEnvelope {
  return { error: { code, message, requestId } };
}

export function errorResponse(
  c: Context,
  status: HttpErrorStatus,
  code: string,
  message: string
): Response {
  const requestId = resolveRequestId(c);
  c.header("x-request-id", requestId);
  return c.json(buildErrorEnvelope(code, message, requestId), status);
}
