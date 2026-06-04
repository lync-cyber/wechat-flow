import { z } from "zod";

export const clipboardPayloadSchema = z.object({
  html: z.string(),
  text: z.string(),
});

export type ClipboardPayload = z.infer<typeof clipboardPayloadSchema>;
