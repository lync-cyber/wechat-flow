import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const QR_CARD_KICKER = "SUBSCRIBE";

function paragraphsOf(element: Element): Element[] {
  return element.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
}

function buildQrInfoLines(paragraphs: Element[]): Element[] {
  const lines: Element[] = [slotElement("kicker", [{ type: "text", value: QR_CARD_KICKER }])];
  const [title, desc] = paragraphs;
  if (title) lines.push(slotElement("title", title.children));
  if (desc) lines.push(slotElement("desc", desc.children));
  return lines;
}

function decorateCard(element: Element): void {
  const paragraphs = paragraphsOf(element);
  const qrCell = slotElement("qr", []);
  const infoCell = slotElement("info", buildQrInfoLines(paragraphs));
  element.children = [qrCell, infoCell];
}

export const qrcode = defineBlock(
  "qrcode",
  "二维码",
  z.object({}).strict(),
  "media",
  [
    { id: "default", label: "标准二维码" },
    {
      id: "card",
      label: "卡片二维码",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          border: "1px solid var(--color-border)",
          "border-radius": "6px",
          padding: "12px 16px",
        },
        qr: {
          display: "table-cell",
          width: "64px",
          height: "64px",
          "background-color": "var(--color-surface-alt)",
          border: "1px solid var(--color-border-strong)",
          "vertical-align": "middle",
        },
        info: {
          display: "table-cell",
          "vertical-align": "middle",
          "padding-left": "12px",
        },
        kicker: {
          color: "var(--color-brand)",
          "font-weight": "700",
          "font-size": "var(--font-size-sm)",
          "letter-spacing": "0.5px",
        },
        title: {
          "font-weight": "700",
          margin: "4px 0",
        },
        desc: {
          color: "var(--color-text-secondary)",
          "font-size": "var(--font-size-sm)",
        },
      },
    },
  ],
  {
    slots: ["root", "qr", "info", "kicker", "title", "desc"],
    directiveBody:
      "card 变体正文首段为标题，可另起一段作为说明；渲染为左 QR 占位 + 右 kicker/标题/说明三行卡片。",
    decorate: (element, ctx) => {
      if (ctx.variant === "card") decorateCard(element);
    },
  }
);
