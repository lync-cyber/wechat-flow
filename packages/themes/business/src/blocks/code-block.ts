import type { ThemeBlocks } from "@wechat-flow/contracts";
import { tokens } from "../tokens.ts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "background-color": "#eef2f7",
      color: "#0d1b2a",
      padding: "2px 4px",
      "border-radius": "3px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      get "background-color"() {
        return tokens["--color-code-block-bg"];
      },
      color: "#0d1b2a",
      padding: "12px 16px",
      "border-radius": "4px",
      "font-size": "13px",
      "line-height": "1.6",
      margin: "0 0 12px",
      overflow: "auto",
    },
  },
};
