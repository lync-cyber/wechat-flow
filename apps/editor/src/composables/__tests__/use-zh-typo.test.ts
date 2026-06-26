import { undo } from "@codemirror/commands";
import { history } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "../../stores/editor.ts";
import { useZhTypo } from "../use-zh-typo.ts";

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    composeApplyZhTypo: vi.fn((input: { markdown: string }) => {
      if (input.markdown === "") {
        return { fixed: "", perRule: {}, totalChanges: 0, diff: [] };
      }
      if (input.markdown === "这是没有问题的中文") {
        return { fixed: "这是没有问题的中文", perRule: {}, totalChanges: 0, diff: [] };
      }
      return {
        fixed: "这是 GitHub 的项目",
        perRule: { "zh-en-space": 2 },
        totalChanges: 2,
        diff: [
          { original: "这是GitHub的项目", revised: "这是 GitHub 的项目", ruleId: "zh-en-space" },
        ],
      };
    }),
    saveDraft: vi.fn().mockResolvedValue(undefined),
    loadDocument: vi.fn().mockResolvedValue(null),
    closeDb: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../../use-cases/render.ts", () => ({
  composeRender: vi.fn().mockResolvedValue({
    html: "<p>preview</p>",
    nodeLocations: [],
    versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    report: {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    },
  }),
}));

describe("use-zh-typo composable", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("AC-001: openZhTypoPreview 触发 diff 预览 Modal 数据", () => {
    it("openZhTypoPreview 后 isPreviewOpen 变为 true", () => {
      const { isPreviewOpen, openZhTypoPreview } = useZhTypo();
      expect(isPreviewOpen.value).toBe(false);
      openZhTypoPreview("这是GitHub的项目");
      expect(isPreviewOpen.value).toBe(true);
    });

    it("openZhTypoPreview 后 diff 包含条目", () => {
      const { diff, openZhTypoPreview } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      expect(diff.value.length).toBeGreaterThan(0);
    });

    it("openZhTypoPreview 后 perRule 包含 zh-en-space 规则计数", () => {
      const { perRule, openZhTypoPreview } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      expect(perRule.value["zh-en-space"]).toBe(2);
    });

    it("openZhTypoPreview 后 totalChanges 为 2", () => {
      const { totalChanges, openZhTypoPreview } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      expect(totalChanges.value).toBe(2);
    });
  });

  describe("AC-002: confirmRevision 写回编辑器 + Toast 提示", () => {
    it("confirmRevision 后 isPreviewOpen 变为 false", async () => {
      const { isPreviewOpen, openZhTypoPreview, confirmRevision } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      expect(isPreviewOpen.value).toBe(true);
      await confirmRevision();
      expect(isPreviewOpen.value).toBe(false);
    });

    it("confirmRevision 后 editorStore.content 等于 fixed 值", async () => {
      const store = useEditorStore();
      store.content = "这是GitHub的项目";
      const { openZhTypoPreview, confirmRevision } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      await confirmRevision();
      expect(store.content).toBe("这是 GitHub 的项目");
    });

    it("confirmRevision 调用 editorView.dispatch 写回 fixed（CM undo 栈路径）", async () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const view = new EditorView({
        state: EditorState.create({
          doc: "这是GitHub的项目",
          extensions: [history()],
        }),
        parent: el,
      });

      const { openZhTypoPreview, confirmRevision } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      await confirmRevision({ editorView: view });

      expect(view.state.doc.toString()).toBe("这是 GitHub 的项目");

      view.destroy();
      el.remove();
    });
  });

  describe("AC-003: 确认修订后 Ctrl+Z 可撤销", () => {
    it("通过 EditorView + history() 写回后 undo 可恢复原文", async () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const view = new EditorView({
        state: EditorState.create({
          doc: "这是GitHub的项目",
          extensions: [history()],
        }),
        parent: el,
      });

      const { openZhTypoPreview, confirmRevision } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      await confirmRevision({ editorView: view });

      expect(view.state.doc.toString()).toBe("这是 GitHub 的项目");

      undo(view);
      expect(view.state.doc.toString()).toBe("这是GitHub的项目");

      view.destroy();
      el.remove();
    });
  });

  describe("AC-004: hasZhTypoIssues 判定", () => {
    it("空内容时 hasZhTypoIssues 返回 false", () => {
      const { hasZhTypoIssues } = useZhTypo();
      expect(hasZhTypoIssues("")).toBe(false);
    });

    it("无排版问题时 hasZhTypoIssues 返回 false", () => {
      const { hasZhTypoIssues } = useZhTypo();
      expect(hasZhTypoIssues("这是没有问题的中文")).toBe(false);
    });

    it("有排版问题时 hasZhTypoIssues 返回 true", () => {
      const { hasZhTypoIssues } = useZhTypo();
      expect(hasZhTypoIssues("这是GitHub的项目")).toBe(true);
    });
  });

  describe("cancel", () => {
    it("cancel 后 isPreviewOpen 变为 false", () => {
      const { isPreviewOpen, openZhTypoPreview, cancel } = useZhTypo();
      openZhTypoPreview("这是GitHub的项目");
      expect(isPreviewOpen.value).toBe(true);
      cancel();
      expect(isPreviewOpen.value).toBe(false);
    });
  });
});
