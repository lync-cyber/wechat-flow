import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const CHAT_BUBBLE_SHARED_STYLE = {
  "border-radius": "12px",
  "max-width": "80%",
  padding: "10px 14px",
  display: "inline-block",
};

type DialogSide = "left" | "right";

interface DialogDocState {
  sides?: Record<string, DialogSide>;
  next?: DialogSide;
}

function buildDialogAvatar(src: string, side: DialogSide): Element {
  return {
    type: "element",
    tagName: "img",
    properties: {
      src,
      alt: "",
      width: 24,
      height: 24,
      "data-dialog-avatar": side,
      style: "border-radius: 50%",
    },
    children: [],
  };
}

export const dialog = defineBlock(
  "dialog",
  "对话",
  z
    .object({
      speaker: z.string().optional(),
      avatar: z.string().optional(),
    })
    .strict(),
  "structured",
  [
    { id: "default", label: "标准对话" },
    {
      id: "chat-bubbles",
      label: "聊天气泡",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          "table-layout": "fixed",
          "margin-bottom": "8px",
        },
        "cell-left": {
          display: "table-cell",
          "text-align": "left",
        },
        "cell-right": {
          display: "table-cell",
          "text-align": "right",
        },
        "bubble-left": {
          ...CHAT_BUBBLE_SHARED_STYLE,
          background: "var(--color-surface-alt)",
          color: "var(--color-text-primary)",
        },
        "bubble-right": {
          ...CHAT_BUBBLE_SHARED_STYLE,
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
        },
      },
    },
    {
      id: "interview",
      label: "访谈对话",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          "table-layout": "fixed",
          "margin-bottom": "16px",
        },
        name: {
          display: "table-cell",
          width: "90px",
          "vertical-align": "top",
          "text-align": "right",
          "padding-right": "16px",
          "text-transform": "uppercase",
          "font-weight": "700",
          "letter-spacing": "0.15em",
          color: "var(--color-text-muted)",
        },
        answer: {
          display: "table-cell",
          "vertical-align": "top",
          "font-size": "var(--font-size-lg)",
          "line-height": "1.8",
          "border-left": "1px solid var(--color-border)",
          "padding-left": "16px",
        },
      },
    },
  ],
  {
    slots: ["root", "cell-left", "cell-right", "bubble-left", "bubble-right", "name", "answer"],
    directiveBody:
      "每一轮对话独立写一个 dialog 指令块，正文为该轮说话内容；speaker 属性标识说话人，相邻轮次 speaker 不同时决定气泡左右交替；avatar 属性可选，指定该轮头像图片 URL。",
    decorate: (element, ctx) => {
      if (ctx.variant === "interview") {
        const speakerLabel = (ctx.attrs.speaker ?? "").toUpperCase();
        const nameEl = slotElement(
          "name",
          speakerLabel.length > 0 ? [{ type: "text", value: speakerLabel }] : []
        );
        const answerEl = slotElement("answer", element.children);

        const {
          "data-dialog-speaker": _speaker,
          "data-dialog-avatar": _avatar,
          ...restProps
        } = element.properties ?? {};

        element.properties = restProps;
        element.children = [nameEl, answerEl];
        return;
      }

      if (ctx.variant !== "chat-bubbles") return;

      if (!ctx.docState.dialog) {
        ctx.docState.dialog = {} as DialogDocState;
      }
      const state = ctx.docState.dialog as DialogDocState;
      if (!state.sides) state.sides = {};
      if (!state.next) state.next = "left";

      const speaker = ctx.attrs.speaker ?? "";
      let side = state.sides[speaker];
      if (!side) {
        side = state.next;
        state.sides[speaker] = side;
        state.next = side === "left" ? "right" : "left";
      }

      const avatarSrc = ctx.attrs.avatar;
      const bubble = slotElement(
        side === "left" ? "bubble-left" : "bubble-right",
        element.children
      );
      const cell = slotElement(side === "left" ? "cell-left" : "cell-right", [bubble]);

      const rowChildren: Element[] =
        typeof avatarSrc === "string" && avatarSrc.trim() !== ""
          ? side === "left"
            ? [buildDialogAvatar(avatarSrc, side), cell]
            : [cell, buildDialogAvatar(avatarSrc, side)]
          : [cell];

      const {
        "data-dialog-speaker": _speaker,
        "data-dialog-avatar": _avatar,
        ...restProps
      } = element.properties ?? {};

      element.properties = restProps;
      element.children = rowChildren;
    },
  }
);
