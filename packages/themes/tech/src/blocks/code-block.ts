import type { ThemeBlocks } from "@wechat-flow/contracts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "font-family": "SF Mono, JetBrains Mono, Fira Code, Menlo, Consolas, Courier New, monospace",
      "background-color": "#1A1A2E",
      color: "#E6EDF3",
      padding: "2px 4px",
      "border-radius": "4px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      "font-family": "SF Mono, JetBrains Mono, Fira Code, Menlo, Consolas, Courier New, monospace",
      "background-color": "#1A1A2E",
      color: "#E6EDF3",
      padding: "12px 16px",
      "border-radius": "6px",
      "font-size": "13px",
      "line-height": "1.6",
      margin: "0 0 12px",
      overflow: "auto",
    },
  },
};
