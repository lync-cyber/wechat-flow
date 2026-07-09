import type { ThemeBlocks } from "@wechat-flow/contracts";
import { tokens } from "../tokens.ts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "background-color": "#1a1a2e",
      color: "#e6edf3",
      padding: "2px 4px",
      "border-radius": "4px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      get "background-color"() {
        return tokens["--color-code-block-bg"];
      },
      color: "#e6edf3",
      padding: "12px 16px",
      "border-radius": "6px",
      "font-size": "13px",
      "line-height": "1.6",
      margin: "0 0 12px",
      overflow: "auto",
    },
  },
};
