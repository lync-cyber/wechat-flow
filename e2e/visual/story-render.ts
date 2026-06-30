import { renderMarkdown } from "../../packages/core/src/index.ts";

export type { VisualStory } from "./story-matrix.ts";
import type { VisualStory } from "./story-matrix.ts";

// Build a minimal markdown directive that exercises the given block and variant.
// Container directive syntax: :::blockId{class=variantId}\ncontent\n:::
function buildMarkdown(blockId: string, variantId: string): string {
  const cls = variantId === "default" ? "" : `{class=${variantId}}`;
  const content = sampleContent(blockId);
  if (cls) {
    return `:::${blockId}${cls}\n${content}\n:::`;
  }
  return `:::${blockId}\n${content}\n:::`;
}

function sampleContent(blockId: string): string {
  switch (blockId) {
    case "heading":
      return "## Sample Heading";
    case "paragraph":
      return "Sample paragraph text for visual testing.";
    case "quote":
      return "A sample quoted passage for visual testing.";
    case "callout":
      return "This is a callout message for visual testing.";
    case "card":
      return "Card body content for visual testing.";
    case "divider":
      return "";
    case "steps":
      return "Step one content.";
    case "pull-quote":
      return "A pull quote for visual testing.";
    case "highlight-block":
      return "Highlighted text content.";
    case "announcement":
      return "Announcement text for visual testing.";
    case "list":
      return "- Item one\n- Item two";
    case "table":
      return "| Col A | Col B |\n|-------|-------|\n| val 1 | val 2 |";
    case "code-block":
      return "```\nconsole.log('hello');\n```";
    case "image":
      return "![alt](https://example.com/img.png)";
    case "image-caption":
      return "Caption text for image.";
    case "gallery":
      return "Gallery content.";
    case "timeline":
      return "Timeline event content.";
    case "compare":
      return "Comparison content.";
    case "qa":
      return "Q: Question text?\nA: Answer text.";
    case "footnote":
      return "Footnote text content.";
    case "tip-grid":
      return "Tip grid item content.";
    case "warning":
      return "Warning message content.";
    case "disclaimer":
      return "Disclaimer text content.";
    case "reading-time":
      return "Reading time content.";
    case "citation":
      return "Citation reference content.";
    case "definition-list":
      return "Term: Definition content.";
    case "advert-card":
      return "Advertisement card content.";
    case "related-cards":
      return "Related article card content.";
    case "social-cta":
      return "Follow us on social media.";
    case "subscribe-cta":
      return "Subscribe to our newsletter.";
    case "author-card":
      return "Author bio content.";
    case "footer-cta":
      return "Footer call to action content.";
    case "dialog":
      return "A: Hello!\nB: Hi there!";
    case "kpi-card":
      return "KPI metric value content.";
    case "miniprogram-card":
      return "MiniProgram card content.";
    case "publication-skeleton":
      return "Publication skeleton content.";
    case "qrcode":
      return "QR code content.";
    case "recommendation":
      return "Recommendation list content.";
    case "video":
      return "Video content placeholder.";
    case "audio":
      return "Audio content placeholder.";
    default:
      return `${blockId} content for visual testing.`;
  }
}

export async function renderStory(story: VisualStory): Promise<string> {
  const md = story.markdown ?? buildMarkdown(story.blockId, story.variantId);
  const result = await renderMarkdown(md, { themeId: story.themeId });
  return result.html;
}
