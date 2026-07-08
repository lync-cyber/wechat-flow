import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#1c1917",
      "line-height": "1.85",
      margin: "0 0 12px",
      "text-align": "left",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#44403c",
    },
  },
  a: {
    default: {
      color: "#2d5a4e",
      "text-decoration": "underline",
    },
  },
};
