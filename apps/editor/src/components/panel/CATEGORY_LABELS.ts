import type { BlockCategory } from "@wechat-flow/core";

export const CATEGORY_ORDER: readonly BlockCategory[] = [
  "text",
  "media",
  "emphasis",
  "structured",
  "marketing",
  "meta",
];

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  text: "基础排版",
  media: "图文媒体",
  emphasis: "强调提示",
  structured: "结构化",
  marketing: "运营引流",
  meta: "元信息",
};
