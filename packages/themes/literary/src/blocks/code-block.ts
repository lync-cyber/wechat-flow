import type { ThemeBlocks } from "@wechat-flow/contracts";
import { tokens } from "../tokens.ts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "background-color": "#f2ece0",
      color: "#2c1f0a",
      padding: "2px 4px",
      "border-radius": "2px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      get "background-color"() {
        return tokens["--color-code-block-bg"];
      },
      color: "#2c1f0a",
      padding: "12px 20px",
      get border() {
        return `1px solid ${tokens["--color-border"]}`;
      },
      get "border-radius"() {
        return tokens["--decoration-border-radius-sm"];
      },
      "font-size": "13px",
      "line-height": "1.7",
      margin: "0 0 16px",
      overflow: "auto",
    },
  },
};
