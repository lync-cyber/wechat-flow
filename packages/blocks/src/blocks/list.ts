import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const list = defineBlock("list", "列表", z.object({}).strict(), "text", [
  { id: "bullet", label: "圆点列表" },
  { id: "numbered", label: "编号列表" },
  { id: "checklist", label: "清单列表" },
]);
