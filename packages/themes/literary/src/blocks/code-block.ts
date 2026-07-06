import type { ThemeBlocks } from "@wechat-flow/contracts";
import { tokens } from "../tokens.ts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', monospace",
      "background-color": "#F2ECE0",
      color: "#2C1F0A",
      padding: "2px 4px",
      "border-radius": "2px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', monospace",
      get "background-color"() {
        return tokens["--color-code-block-bg"];
      },
      color: "#2C1F0A",
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
