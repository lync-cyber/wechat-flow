import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const table = defineBlock("table", "表格", z.object({}).strict(), "text", [
  { id: "default", label: "标准表格" },
  { id: "striped", label: "条纹表格" },
  { id: "bordered", label: "全边框表格" },
  { id: "compact", label: "紧凑表格" },
  { id: "highlight-header", label: "高亮表头表格" },
]);
