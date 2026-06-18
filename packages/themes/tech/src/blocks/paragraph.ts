import type { ThemeBlocks } from "@wechat-flow/contracts";

export const paragraphBlocks: ThemeBlocks = {
  p: {
    default: {
      "font-family": "'SF Pro Text', 'Inter', 'Helvetica Neue', Arial, sans-serif",
      "font-size": "15px",
      "font-weight": "400",
      color: "#E6EDF3",
      "line-height": "1.8",
      margin: "0 0 12px",
      "text-align": "left",
    },
  },
  strong: {
    default: {
      "font-weight": "600",
      color: "#58A6FF",
    },
  },
  em: {
    default: {
      "font-style": "italic",
      color: "#8B949E",
    },
  },
  a: {
    default: {
      color: "#58A6FF",
      "text-decoration": "none",
    },
  },
};
