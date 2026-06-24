import { z } from "zod";

export const templateDefinitionSchema = z.object({
  templateId: z.string(),
  themeId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  markdown: z.string().optional(),
  metadata: z.object({ description: z.string().optional() }).optional(),
});

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
