import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const subscribeCta = defineBlock(
  "subscribe-cta",
  "文末引导",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准文末引导" },
    {
      id: "banner",
      label: "横幅文末引导",
      baseStyle: {
        root: {
          "background-color": "var(--color-surface-alt)",
          border: "none",
          padding: "28px 16px",
          "font-size": "18px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        "text-align": "center",
        padding: "24px 16px",
        margin: "24px 0",
        "border-radius": "8px",
        "background-color": "#f5f0ff",
        border: "1px solid #d6b4fc",
      },
    },
    slots: ["root"],
    directiveBody:
      "正文写引导文字，如「点击上方蓝字关注」或「点亮下方『在看』并转发给需要的朋友」；渲染为居中静态引导卡，不含按钮。",
  }
);
