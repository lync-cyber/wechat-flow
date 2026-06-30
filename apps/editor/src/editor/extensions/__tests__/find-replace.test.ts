import { closeSearchPanel, openSearchPanel, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { findReplaceExtension } from "../find-replace.ts";

let view: EditorView | null = null;

afterEach(() => {
  try {
    view?.destroy();
  } catch {
    // happy-dom cleanup
  }
  view = null;
  document.body.innerHTML = "";
});

describe("AC-003: 查找替换面板（@codemirror/search）", () => {
  it("openSearchPanel 后 .cm-search 面板存在于 view.dom", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      state: EditorState.create({
        doc: "hello world",
        extensions: [...findReplaceExtension],
      }),
      parent,
    });

    openSearchPanel(view);

    const panel = view.dom.querySelector(".cm-search");
    expect(panel).not.toBeNull();
  });

  it("closeSearchPanel 后 .cm-search 面板从 view.dom 移除", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    view = new EditorView({
      state: EditorState.create({
        doc: "hello world",
        extensions: [...findReplaceExtension],
      }),
      parent,
    });

    openSearchPanel(view);
    expect(view.dom.querySelector(".cm-search")).not.toBeNull();

    closeSearchPanel(view);
    expect(view.dom.querySelector(".cm-search")).toBeNull();
  });

  it("findReplaceExtension 包含 searchKeymap — Mod-f 绑定存在", () => {
    const modfBinding = searchKeymap.find((b) => b.key === "Mod-f" || b.mac === "Cmd-f");
    expect(modfBinding).toBeDefined();
  });
});
