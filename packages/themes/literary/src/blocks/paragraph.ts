import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'Source Han Serif CN', 'Noto Serif CJK SC', 'SimSun', Georgia, serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#2c1f0a",
      "line-height": "2.0",
      margin: "0 0 16px",
      "text-align": "justify",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#5a4228",
    },
  },
  a: {
    default: {
      color: "#7b4f2e",
      "text-decoration": "underline",
    },
  },
};
