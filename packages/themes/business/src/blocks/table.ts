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
      "background-color": "#1A4F8A",
      color: "#FFFFFF",
      "font-weight": "700",
      border: "none",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      border: "none",
      "border-bottom": "1px solid #D0D9E4",
    },
    even: {
      "background-color": "#EEF2F7",
    },
  },
};
