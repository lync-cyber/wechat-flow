import type { ThemeDefinition } from "@wechat-flow/contracts";
import { codeBlocks } from "./blocks/code-block.ts";
import { dividerBlocks } from "./blocks/divider.ts";
import { headingBlocks } from "./blocks/heading.ts";
import { paragraphBlocks } from "./blocks/paragraph.ts";
import { quoteBlocks } from "./blocks/quote.ts";
import { tokens } from "./tokens.ts";

const techTheme: ThemeDefinition = {
  id: "tech",
  name: "科技数码",
  tokens,
  blocks: {
    ...headingBlocks,
    ...paragraphBlocks,
    ...quoteBlocks,
    ...codeBlocks,
    ...dividerBlocks,
  },
  paintable: {},
  assets: {},
  meta: {
    author: "wechat-flow",
    version: "1.0.0",
    wcagContrast: {
      checked: true,
      minRatio: 8.2,
    },
  },
};

export default techTheme;
