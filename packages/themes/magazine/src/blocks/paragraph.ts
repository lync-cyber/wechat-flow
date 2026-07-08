import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'PingFang SC', 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif",
      "font-size": "16px",
      "font-weight": "400",
      color: "#1a1208",
      "line-height": "1.9",
      margin: "0 0 14px",
      "text-align": "left",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#4a3728",
    },
  },
  a: {
    default: {
      color: "#d4521a",
      "text-decoration": "none",
    },
  },
};
