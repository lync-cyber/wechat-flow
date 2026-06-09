---
id: "code-review-t-011-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-011"]
---

# Code-Review T-011 — r2（revision 清账）

CODE-REVIEW-T-011-r1 判定 `needs_revision`（R-001 HIGH：EditorShell 自建独立 pinia 实例致生产状态割裂）。本轮 revision 修复确认，sprint-review SR-002 要求补发本报告清账。

## 修复确认

| 编号 | 原等级 | 问题 | 修复 | 状态 |
|------|--------|------|------|------|
| R-001 | HIGH | EditorShell 组件内 `createPinia()` 自建独立实例，与全局 pinia 隔离 | 改无参 `useEditorStore()` 消费全局 pinia；3 个 EditorShell 测试文件补 `global.plugins:[createPinia()]` | resolved |
| R-002 | MEDIUM | `ComposeRenderResult` 未复用 core `RenderResult` 类型 | `ComposeRenderResult = RenderResult & { versionTriple }` 超集 | resolved |
| R-003 | MEDIUM | `diagnostics: object[]` 弱类型 | 随 `RenderResult` 继承精确类型 | resolved |
| R-004 | MEDIUM | AC-002 debounce 300ms 端到端覆盖缺口 | 新增 `editorView.dispatch` + `advanceTimersByTimeAsync(299/1)` 真实 debounce 端到端测试 | resolved |
| R-006 | LOW | coreVersion 强断言固定版本号 | 改 `toMatch(/^\d+\.\d+\.\d+/)` 弹性断言 | resolved |
| R-005 | MEDIUM | core `RenderResult` 缺 `postPaste` 字段（arch §2.M-002） | upstream（packages/core 骨架遗漏，非 T-011 self-caused）→ defer 到 core 完善 | deferred |

## verdict: approved

R-001 HIGH 及 R-002/R-003/R-004/R-006 全部 resolved；R-005 为 upstream core 骨架问题，已 defer 至 core 完善（见 CLAUDE.md §待办 deferred）。门禁全绿：全量 vitest 125 passed / typecheck（含 tests-tsc）0 / biome 0。
