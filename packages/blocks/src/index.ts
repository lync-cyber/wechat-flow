import { onRegistryReset, registerBlock } from "@wechat-flow/core";
import { advertCard } from "./blocks/advert-card.ts";
import { announcement } from "./blocks/announcement.ts";
import { audio } from "./blocks/audio.ts";
import { authorCard } from "./blocks/author-card.ts";
import { callout } from "./blocks/callout.ts";
import { card } from "./blocks/card.ts";
import { citation } from "./blocks/citation.ts";
import { codeBlock } from "./blocks/code-block.ts";
import { compare } from "./blocks/compare.ts";
import { definitionList } from "./blocks/definition-list.ts";
import { dialog } from "./blocks/dialog.ts";
import { disclaimer } from "./blocks/disclaimer.ts";
import { divider } from "./blocks/divider.ts";
import { footerCta } from "./blocks/footer-cta.ts";
import { footnote } from "./blocks/footnote.ts";
import { gallery } from "./blocks/gallery.ts";
import { heading } from "./blocks/heading.ts";
import { highlightBlock } from "./blocks/highlight-block.ts";
import { imageCaption } from "./blocks/image-caption.ts";
import { image } from "./blocks/image.ts";
import { kpiCard } from "./blocks/kpi-card.ts";
import { list } from "./blocks/list.ts";
import { miniprogramCard } from "./blocks/miniprogram-card.ts";
import { paragraph } from "./blocks/paragraph.ts";
import { publicationSkeleton } from "./blocks/publication-skeleton.ts";
import { pullQuote } from "./blocks/pull-quote.ts";
import { qa } from "./blocks/qa.ts";
import { qrcode } from "./blocks/qrcode.ts";
import { quote } from "./blocks/quote.ts";
import { readingTime } from "./blocks/reading-time.ts";
import { recommendation } from "./blocks/recommendation.ts";
import { relatedCards } from "./blocks/related-cards.ts";
import { socialCta } from "./blocks/social-cta.ts";
import { steps } from "./blocks/steps.ts";
import { subscribeCta } from "./blocks/subscribe-cta.ts";
import { table } from "./blocks/table.ts";
import { timeline } from "./blocks/timeline.ts";
import { tipGrid } from "./blocks/tip-grid.ts";
import { video } from "./blocks/video.ts";
import { warning } from "./blocks/warning.ts";

const ALL_BLOCKS = [
  heading,
  paragraph,
  list,
  table,
  codeBlock,
  quote,
  card,
  callout,
  divider,
  image,
  imageCaption,
  gallery,
  steps,
  compare,
  pullQuote,
  highlightBlock,
  announcement,
  dialog,
  timeline,
  qrcode,
  video,
  audio,
  miniprogramCard,
  footerCta,
  recommendation,
  authorCard,
  publicationSkeleton,
  kpiCard,
  qa,
  footnote,
  tipGrid,
  warning,
  disclaimer,
  readingTime,
  citation,
  definitionList,
  advertCard,
  relatedCards,
  socialCta,
  subscribeCta,
];

function registerAll(): void {
  for (const block of ALL_BLOCKS) {
    registerBlock(block);
  }
}

registerAll();
onRegistryReset(registerAll);
