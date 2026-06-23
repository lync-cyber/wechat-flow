import { zValidator } from "@hono/zod-validator";
import type { MiddlewareHandler } from "hono";
import type { ZodType } from "zod";

const malformedJsonResponse = {
  error: "validation_error" as const,
  issues: [{ code: "invalid_json", message: "Request body is not valid JSON" }],
};

export function jsonValidator(schema: ZodType): MiddlewareHandler {
  const validate = zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "validation_error", issues: result.error.issues }, 400);
    }
  });

  return async (c, next) => {
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await c.req.text();
      if (raw.length > 0) {
        try {
          JSON.parse(raw);
        } catch {
          return c.json(malformedJsonResponse, 400);
        }
      }
    }
    return validate(c, next);
  };
}
