import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'Inter', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#0d1b2a",
      "line-height": "1.75",
      margin: "0 0 12px",
      "text-align": "left",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#2d4057",
    },
  },
  a: {
    default: {
      color: "#1a4f8a",
      "text-decoration": "none",
    },
  },
};
