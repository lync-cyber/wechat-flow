import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#1C1917",
      "line-height": "1.85",
      margin: "0 0 12px",
      "text-align": "left",
    },
  },
  strong: {
    default: {
      "font-weight": "700",
      color: "#1C1917",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#44403C",
    },
  },
  a: {
    default: {
      color: "#2D5A4E",
      "text-decoration": "underline",
    },
  },
};
