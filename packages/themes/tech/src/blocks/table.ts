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
      "background-color": "#21262d",
      color: "#e6edf3",
      "font-weight": "600",
      border: "1px solid #30363d",
    },
  },
  td: {
    default: {
      padding: "6px 10px",
      border: "1px solid #30363d",
      color: "#e6edf3",
    },
    even: {
      "background-color": "#0f1117",
    },
  },
};
