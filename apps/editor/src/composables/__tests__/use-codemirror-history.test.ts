import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

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

function makeView(doc: string): EditorView {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [history(), keymap.of([...defaultKeymap, ...historyKeymap])],
    }),
    parent,
  });
}

describe("AC-001/002: undo / redo 行为", () => {
  it("AC-001: undo 命令将文档回退到编辑前状态", () => {
    view = makeView("hello");

    view.dispatch({
      changes: { from: 5, to: 5, insert: " world" },
    });
    expect(view.state.doc.toString()).toBe("hello world");

    undo(view);
    expect(view.state.doc.toString()).toBe("hello");
  });

  it("AC-002: redo 命令将文档重新应用撤销的修改", () => {
    view = makeView("hello");

    view.dispatch({
      changes: { from: 5, to: 5, insert: " world" },
    });
    undo(view);
    expect(view.state.doc.toString()).toBe("hello");

    redo(view);
    expect(view.state.doc.toString()).toBe("hello world");
  });

  it("AC-002: historyKeymap 含 Mod-y 或 Mod-Shift-z redo 键位绑定", () => {
    const hasRedoBinding = historyKeymap.some(
      (b) => b.key === "Mod-y" || b.key === "Mod-Shift-z" || b.mac === "Cmd-Shift-z"
    );
    expect(hasRedoBinding).toBe(true);
  });

  it("AC-001: historyKeymap 含 Mod-z undo 键位绑定", () => {
    const hasUndoBinding = historyKeymap.some((b) => b.key === "Mod-z" || b.mac === "Cmd-z");
    expect(hasUndoBinding).toBe(true);
  });
});
