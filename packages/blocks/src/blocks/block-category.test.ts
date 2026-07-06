import type { BlockCategory, BlockDefinition } from "@wechat-flow/core";
import { describe, expect, it } from "vitest";
import { advertCard } from "./advert-card.ts";
import { announcement } from "./announcement.ts";
import { audio } from "./audio.ts";
import { authorCard } from "./author-card.ts";
import { callout } from "./callout.ts";
import { card } from "./card.ts";
import { citation } from "./citation.ts";
import { codeBlock } from "./code-block.ts";
import { compare } from "./compare.ts";
import { definitionList } from "./definition-list.ts";
import { dialog } from "./dialog.ts";
import { disclaimer } from "./disclaimer.ts";
import { divider } from "./divider.ts";
import { footerCta } from "./footer-cta.ts";
import { footnote } from "./footnote.ts";
import { gallery } from "./gallery.ts";
import { heading } from "./heading.ts";
import { highlightBlock } from "./highlight-block.ts";
import { imageCaption } from "./image-caption.ts";
import { image } from "./image.ts";
import { kpiCard } from "./kpi-card.ts";
import { list } from "./list.ts";
import { miniprogramCard } from "./miniprogram-card.ts";
import { paragraph } from "./paragraph.ts";
import { publicationSkeleton } from "./publication-skeleton.ts";
import { pullQuote } from "./pull-quote.ts";
import { qa } from "./qa.ts";
import { qrcode } from "./qrcode.ts";
import { quote } from "./quote.ts";
import { readingTime } from "./reading-time.ts";
import { recommendation } from "./recommendation.ts";
import { relatedCards } from "./related-cards.ts";
import { socialCta } from "./social-cta.ts";
import { steps } from "./steps.ts";
import { subscribeCta } from "./subscribe-cta.ts";
import { table } from "./table.ts";
import { timeline } from "./timeline.ts";
import { tipGrid } from "./tip-grid.ts";
import { video } from "./video.ts";
import { warning } from "./warning.ts";

const EXPECTED_CATEGORY: Record<string, BlockCategory> = {
  heading: "text",
  paragraph: "text",
  list: "text",
  table: "text",
  "code-block": "text",
  quote: "text",
  divider: "text",
  "definition-list": "text",
  image: "media",
  "image-caption": "media",
  gallery: "media",
  video: "media",
  audio: "media",
  qrcode: "media",
  callout: "emphasis",
  warning: "emphasis",
  "highlight-block": "emphasis",
  "pull-quote": "emphasis",
  "tip-grid": "emphasis",
  announcement: "emphasis",
  disclaimer: "emphasis",
  card: "structured",
  steps: "structured",
  compare: "structured",
  timeline: "structured",
  dialog: "structured",
  qa: "structured",
  "kpi-card": "structured",
  "footer-cta": "marketing",
  "social-cta": "marketing",
  "subscribe-cta": "marketing",
  "advert-card": "marketing",
  "miniprogram-card": "marketing",
  recommendation: "marketing",
  "related-cards": "marketing",
  "author-card": "meta",
  "publication-skeleton": "meta",
  "reading-time": "meta",
  footnote: "meta",
  citation: "meta",
};

const ALL_BLOCKS: BlockDefinition[] = [
  heading,
  paragraph,
  list,
  table,
  codeBlock,
  quote,
  divider,
  definitionList,
  image,
  imageCaption,
  gallery,
  video,
  audio,
  qrcode,
  callout,
  warning,
  highlightBlock,
  pullQuote,
  tipGrid,
  announcement,
  disclaimer,
  card,
  steps,
  compare,
  timeline,
  dialog,
  qa,
  kpiCard,
  footerCta,
  socialCta,
  subscribeCta,
  advertCard,
  miniprogramCard,
  recommendation,
  relatedCards,
  authorCard,
  publicationSkeleton,
  readingTime,
  footnote,
  citation,
];

describe("block category taxonomy (ui-spec-wechat-flow-block-taxonomy#§8.2)", () => {
  it("registers exactly 40 blocks matching the frozen taxonomy table", () => {
    expect(ALL_BLOCKS.length).toBe(40);
    expect(ALL_BLOCKS.length).toBe(Object.keys(EXPECTED_CATEGORY).length);
  });

  it.each(ALL_BLOCKS.map((block) => [block.id, block] as const))(
    "block %s has the category frozen in ui-spec §8.2",
    (id, block) => {
      const expected = EXPECTED_CATEGORY[id];
      expect(expected, `no expected category recorded for block id "${id}"`).toBeDefined();
      expect(block.category).toBe(expected);
    }
  );

  it("counts blocks per category matching the frozen distribution (text 8 / media 6 / emphasis 7 / structured 7 / marketing 7 / meta 5)", () => {
    const counts: Record<BlockCategory, number> = {
      text: 0,
      media: 0,
      emphasis: 0,
      structured: 0,
      marketing: 0,
      meta: 0,
    };
    for (const block of ALL_BLOCKS) {
      counts[block.category] += 1;
    }
    expect(counts).toEqual({
      text: 8,
      media: 6,
      emphasis: 7,
      structured: 7,
      marketing: 7,
      meta: 5,
    });
  });

  it("classifies table as a basic text element, not a structured container", () => {
    expect(table.category).toBe("text");
    expect(table.category).not.toBe("structured");
  });

  it("classifies definition-list as a basic text element, not a structured container", () => {
    expect(definitionList.category).toBe("text");
    expect(definitionList.category).not.toBe("structured");
  });

  it("classifies disclaimer as an attention/emphasis container, not trailing metadata", () => {
    expect(disclaimer.category).toBe("emphasis");
    expect(disclaimer.category).not.toBe("meta");
  });
});
