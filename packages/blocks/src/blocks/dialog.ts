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
          background: "#F3F0EB",
          color: "#1C1917",
        },
        "bubble-right": {
          ...CHAT_BUBBLE_SHARED_STYLE,
          background: "#2D5A4E",
          color: "#FAFAF9",
        },
      },
    },
    { id: "interview", label: "访谈对话" },
  ],
  undefined,
  ["root", "cell-left", "cell-right", "bubble-left", "bubble-right"],
  "每一轮对话独立写一个 dialog 指令块，正文为该轮说话内容；speaker 属性标识说话人，相邻轮次 speaker 不同时决定气泡左右交替；avatar 属性可选，指定该轮头像图片 URL。",
  (element, ctx) => {
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
    const bubble = slotElement(side === "left" ? "bubble-left" : "bubble-right", element.children);
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
  }
);
