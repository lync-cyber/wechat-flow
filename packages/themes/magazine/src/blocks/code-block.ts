import type { ThemeBlocks } from "@wechat-flow/contracts";
import { tokens } from "../tokens.ts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "background-color": "#fff3e8",
      color: "#3a2010",
      padding: "2px 4px",
      "border-radius": "4px",
      "font-size": "14px",
    },
  },
  pre: {
    default: {
      get "background-color"() {
        return tokens["--color-code-block-bg"];
      },
      color: "#3a2010",
      padding: "14px 20px",
      "border-radius": "8px",
      "font-size": "14px",
      "line-height": "1.6",
      margin: "0 0 14px",
      overflow: "auto",
    },
  },
};
