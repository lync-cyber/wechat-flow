import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const divider = defineBlock("divider", "分隔线", z.object({}).strict(), "text", [
  { id: "default", label: "细线分隔" },
  { id: "thick", label: "粗线分隔" },
  { id: "wave", label: "波浪分隔" },
  { id: "dots", label: "圆点分隔" },
  { id: "flower", label: "花饰分隔" },
  { id: "dotted", label: "点线分隔" },
  { id: "dashed", label: "虚线分隔" },
]);
