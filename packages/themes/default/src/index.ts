import type { ThemeDefinition } from "@wechat-flow/contracts";
import { codeBlocks } from "./blocks/code-block.ts";
import { dividerBlocks } from "./blocks/divider.ts";
import { emphasisBlocks } from "./blocks/emphasis.ts";
import { headingBlocks } from "./blocks/heading.ts";
import { listBlocks } from "./blocks/list.ts";
import { mediaBlocks } from "./blocks/media.ts";
import { paragraphBlocks } from "./blocks/paragraph.ts";
import { quoteBlocks } from "./blocks/quote.ts";
import { tableBlocks } from "./blocks/table.ts";
import { templates } from "./templates/index.ts";
import { tokens } from "./tokens.ts";

const defaultTheme: ThemeDefinition = {
  id: "default",
  name: "简约通用",
  tokens,
  blocks: {
    ...headingBlocks,
    ...paragraphBlocks,
    ...emphasisBlocks,
    ...quoteBlocks,
    ...codeBlocks,
    ...dividerBlocks,
    ...listBlocks,
    ...mediaBlocks,
    ...tableBlocks,
  },
  paintable: Object.keys(tokens).filter((key) => key.startsWith("--color-")),
  assets: {},
  meta: {
    author: "wechat-flow",
    version: "1.0.0",
    description: "中性排版 · 墨绿点缀",
    wcagContrast: {
      checked: true,
      minRatio: 7.1,
    },
  },
  templates,
};

export default defaultTheme;
