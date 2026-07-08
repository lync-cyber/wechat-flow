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
      color: "#5a4228",
      "font-weight": "500",
      "letter-spacing": "0.5px",
      "border-bottom": "1px solid #b8a882",
    },
  },
  td: {
    default: {
      padding: "8px 12px",
      "border-bottom": "1px solid #ddd4c0",
      "vertical-align": "top",
    },
  },
};
