import { type ZodType, toJSONSchema } from "zod";

export type { ZodStandardJSONSchemaPayload as JSONSchema7 } from "zod/v4/core";

export function toJSON(schema: ZodType): object {
  return toJSONSchema(schema);
}
