import { z } from "zod";

export const registerVariantRequestSchema = z.object({
  blockId: z.string(),
  variantId: z.string(),
  label: z.string(),
  style: z.record(z.string(), z.record(z.string(), z.string())),
});

export const rejectedDeclarationSchema = z.object({
  slot: z.string(),
  property: z.string(),
  value: z.string(),
  reason: z.string(),
});

export const registerVariantResponseSchema = z.object({
  registered: z.boolean(),
  variantId: z.string(),
  rejectedDeclarations: z.array(rejectedDeclarationSchema),
});

export type RejectedDeclaration = z.infer<typeof rejectedDeclarationSchema>;
