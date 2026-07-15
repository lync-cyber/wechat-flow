import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const timeline = defineBlock(
  "timeline",
  "时间线",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "竖向时间线" },
    { id: "horizontal", label: "横向时间线" },
    { id: "compact", label: "紧凑时间线" },
  ],
  {
    directiveBody:
      "正文写为 Markdown 无序列表，每项以「**日期**：事件描述」形式书写一个时间节点，按时间先后顺序排列。",
  }
);
