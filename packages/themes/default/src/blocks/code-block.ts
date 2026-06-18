import type { ThemeBlocks } from "@wechat-flow/contracts";

export const codeBlocks: ThemeBlocks = {
  code: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      "background-color": "#F0EDE8",
      color: "#292524",
      padding: "2px 4px",
      "border-radius": "3px",
      "font-size": "13px",
    },
  },
  pre: {
    default: {
      "font-family": "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      "background-color": "#F0EDE8",
      color: "#292524",
      padding: "12px 16px",
      "border-radius": "6px",
      "font-size": "13px",
      "line-height": "1.6",
      margin: "0 0 12px",
      overflow: "auto",
    },
  },
};
