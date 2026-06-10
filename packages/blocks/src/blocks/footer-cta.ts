import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const footerCta = defineBlock(
  "footer-cta",
  "底部行动号召",
  z.object({
    text: z.string(),
    url: z.string().optional(),
    buttonLabel: z.string().optional(),
  }),
  [
    { id: "default", label: "标准 CTA" },
    { id: "centered", label: "居中 CTA" },
    { id: "full-width", label: "全宽 CTA" },
  ]
);
