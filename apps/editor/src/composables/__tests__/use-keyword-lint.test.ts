import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "../../stores/editor.ts";
import { useKeywordLint } from "../use-keyword-lint.ts";

vi.mock("@wechat-flow/ruleset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/ruleset")>();
  return {
    ...actual,
    lintMarkdown: vi.fn((content: string) => {
      if (content.includes("最佳")) {
        return [
          {
            severity: "warning",
            ruleId: "keyword-lint",
            message: "违规关键词「最佳」",
            matchedKeyword: "最佳",
            location: { line: 1, column: 1 },
          },
        ];
      }
      return [];
    }),
  };
});

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
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

// ── AC-003: use-keyword-lint composable 行为 ──────────────────────────────────

describe("AC-003: useKeywordLint composable", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("初始 keywordDiagnostics 为空数组", () => {
    const { keywordDiagnostics } = useKeywordLint();
    expect(keywordDiagnostics.value).toEqual([]);
  });

  it("runKeywordLint 后 keywordDiagnostics 含 severity=warning 项（当内容含违规词时）", () => {
    const store = useEditorStore();
    store.content = "这是最佳方案";
    const { keywordDiagnostics, runKeywordLint } = useKeywordLint();

    runKeywordLint();

    expect(keywordDiagnostics.value.length).toBeGreaterThan(0);
    expect(keywordDiagnostics.value[0].severity).toBe("warning");
    expect(keywordDiagnostics.value[0].ruleId).toBe("keyword-lint");
    expect(keywordDiagnostics.value[0].matchedKeyword).toBe("最佳");
  });

  it("runKeywordLint 后 keywordDiagnostics 为空数组（当内容无违规词时）", () => {
    const store = useEditorStore();
    store.content = "这是普通内容";
    const { keywordDiagnostics, runKeywordLint } = useKeywordLint();

    runKeywordLint();

    expect(keywordDiagnostics.value).toEqual([]);
  });

  it("clear() 清空 keywordDiagnostics", () => {
    const store = useEditorStore();
    store.content = "这是最佳方案";
    const { keywordDiagnostics, runKeywordLint, clear } = useKeywordLint();

    runKeywordLint();
    expect(keywordDiagnostics.value.length).toBeGreaterThan(0);

    clear();
    expect(keywordDiagnostics.value).toEqual([]);
  });
});
