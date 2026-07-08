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
      "background-color": "transparent",
      color: "#1a1208",
      "font-weight": "700",
      "border-bottom": "2px solid #d4521a",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      "border-bottom": "1px solid #e8d8c4",
    },
  },
};
