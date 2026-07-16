import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const publicationSkeleton = defineBlock(
  "publication-skeleton",
  "排版骨架",
  z.object({}).strict(),
  "meta",
  [{ id: "default", label: "标准骨架" }],
  {
    baseStyle: {
      root: {
        margin: "0 auto",
        padding: "24px 16px",
        "max-width": "680px",
        "line-height": "1.8",
      },
    },
  }
);
