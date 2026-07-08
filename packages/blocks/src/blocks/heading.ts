import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const heading = defineBlock("heading", "标题", z.object({}).strict(), "text", [
  { id: "default", label: "默认标题" },
  { id: "underline", label: "下划线标题" },
  { id: "centered", label: "居中标题" },
]);
