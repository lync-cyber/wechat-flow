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
      "background-color": "#f3f0eb",
      color: "#1c1917",
      "font-weight": "600",
      border: "1px solid #d6d3ce",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      border: "1px solid #d6d3ce",
      color: "#1c1917",
    },
  },
};
