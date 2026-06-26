import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const publicationSkeleton = defineBlock(
  "publication-skeleton",
  "排版骨架",
  z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    coverImage: z.string().optional(),
    category: z.string().optional(),
  }),
  [
    { id: "default", label: "标准骨架" },
    { id: "magazine", label: "杂志骨架" },
    { id: "minimal", label: "简洁骨架" },
  ],
  {
    root: {
      margin: "0 auto",
      padding: "24px 16px",
      "max-width": "680px",
      "line-height": "1.8",
    },
  }
);
