import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const subscribeCta = defineBlock(
  "subscribe-cta",
  "订阅引导",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准订阅引导" },
    { id: "centered", label: "居中订阅引导" },
    { id: "banner", label: "横幅订阅引导" },
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
  }
);
