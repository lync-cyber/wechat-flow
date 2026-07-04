import type { ThemeDefinition } from "@wechat-flow/contracts";
import { codeBlocks } from "./blocks/code-block.ts";
import { dividerBlocks } from "./blocks/divider.ts";
import { headingBlocks } from "./blocks/heading.ts";
import { listBlocks } from "./blocks/list.ts";
import { mediaBlocks } from "./blocks/media.ts";
import { paragraphBlocks } from "./blocks/paragraph.ts";
import { quoteBlocks } from "./blocks/quote.ts";
import { templates } from "./templates/index.ts";
import { tokens } from "./tokens.ts";

const magazineTheme: ThemeDefinition = {
  id: "magazine",
  name: "生活杂志",
  tokens,
  blocks: {
    ...headingBlocks,
    ...paragraphBlocks,
    ...quoteBlocks,
    ...codeBlocks,
    ...dividerBlocks,
    ...listBlocks,
    ...mediaBlocks,
  },
  paintable: Object.keys(tokens).filter((key) => key.startsWith("--color-")),
  assets: {},
  meta: {
    author: "wechat-flow",
    version: "1.0.0",
    description: "杂志风 · 活力橙",
    wcagContrast: {
      checked: true,
      minRatio: 5.2,
    },
  },
  templates,
};

export default magazineTheme;
