import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const steps = defineBlock(
  "steps",
  "步骤",
  z.object({
    steps: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
  [
    { id: "default", label: "竖排步骤" },
    { id: "horizontal", label: "横排步骤" },
    { id: "numbered", label: "编号步骤" },
  ]
);
