import type { ThemeBlocks } from "@wechat-flow/contracts";

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
      "background-color": "#F2ECE0",
      color: "#2C1F0A",
      padding: "12px 20px",
      "border-radius": "4px",
      "font-size": "13px",
      "line-height": "1.7",
      margin: "0 0 16px",
      overflow: "auto",
    },
  },
};
