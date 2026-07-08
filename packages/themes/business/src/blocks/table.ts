import type { ThemeBlocks } from "@wechat-flow/contracts";

export const tableBlocks: ThemeBlocks = {
  table: {
    default: {
      "border-collapse": "collapse",
      width: "100%",
    },
  },
  th: {
    default: {
      padding: "8px 12px",
      "background-color": "#1a4f8a",
      color: "#ffffff",
      "font-weight": "700",
      border: "none",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      border: "none",
      "border-bottom": "1px solid #d0d9e4",
    },
    even: {
      "background-color": "#eef2f7",
    },
  },
};
