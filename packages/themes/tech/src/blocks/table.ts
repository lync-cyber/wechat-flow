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
      padding: "6px 10px",
      "background-color": "#21262D",
      color: "#E6EDF3",
      "font-weight": "600",
      border: "1px solid #30363D",
    },
  },
  td: {
    default: {
      padding: "6px 10px",
      border: "1px solid #30363D",
      color: "#E6EDF3",
    },
    even: {
      "background-color": "#0F1117",
    },
  },
};
