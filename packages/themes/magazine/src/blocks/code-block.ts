import type { ThemeBlocks } from "@wechat-flow/contracts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', monospace",
      "background-color": "#FFF3E8",
      color: "#3A2010",
      padding: "2px 4px",
      "border-radius": "4px",
      "font-size": "14px",
    },
  },
  pre: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', monospace",
      "background-color": "#FFF3E8",
      color: "#3A2010",
      padding: "14px 20px",
      "border-radius": "8px",
      "font-size": "14px",
      "line-height": "1.6",
      margin: "0 0 14px",
      overflow: "auto",
    },
  },
};
