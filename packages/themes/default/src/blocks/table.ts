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
      "background-color": "#F3F0EB",
      color: "#1C1917",
      "font-weight": "600",
      border: "1px solid #D6D3CE",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      border: "1px solid #D6D3CE",
      color: "#1C1917",
    },
  },
};
