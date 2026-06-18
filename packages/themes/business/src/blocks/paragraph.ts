import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'Inter', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#0D1B2A",
      "line-height": "1.75",
      margin: "0 0 12px",
      "text-align": "left",
    },
  },
  strong: {
    default: {
      "font-weight": "600",
      color: "#1A4F8A",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#2D4057",
    },
  },
  a: {
    default: {
      color: "#1A4F8A",
      "text-decoration": "none",
    },
  },
};
