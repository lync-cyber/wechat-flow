---
id: "code-review-T-009-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-009"]
---

# CODE-REVIEW-T-009-r1 — SourcePane (CodeMirror 6 + Markdown 高亮)

Layer 1 delegated to hook (PostToolUse Edit → `lint_format`)

---

## 审查摘要

**verdict**: approved_with_notes
**refactor 触发评估**: dead-code (命中) — 建议 orchestrator 评估是否触发 refactorer

---

## 问题列表

### [R-001] MEDIUM: `cmHighlightStyle` 导出未被任何外部消费

- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `apps/editor/src/lib/cm-theme.ts` 第 78 行以 `export const cmHighlightStyle` 暴露，但项目内唯一消费者是同文件的 `cmSyntaxHighlighting`（第 144 行 `syntaxHighlighting(cmHighlightStyle)`）。外部没有任何文件 `import { cmHighlightStyle }` — `use-codemirror.ts` 只 import `cmBaseTheme` 和 `cmSyntaxHighlighting`。此 export 为未使用导出（dead export），会误导后续开发者认为该对象可被外部扩展。
- **建议**: 将 `cmHighlightStyle` 改为 `const`（去掉 `export`）；若将来有外部扩展需求再酌情导出。

---

### [R-002] MEDIUM: `cmBaseTheme` 中 `.tok-*` CSS 规则永远不匹配任何 DOM 元素

- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `cm-theme.ts` 第 29–73 行在 `EditorView.theme()` 中定义了 `.tok-heading`、`.tok-directive-keyword`、`.tok-directive-arg`、`.tok-list-mark`、`.tok-quote`、`.tok-frontmatter`、`.tok-inlinecode`、`.tok-link-text`、`.tok-link-url` 共 9 条 CSS 规则。这些类名遵循了一套不存在于 CodeMirror 6 DOM 中的命名约定。CodeMirror 6 的 `HighlightStyle.define()` 通过 `StyleModule.newName()` 生成随机 `hl-*` 类名，并由 `syntaxHighlighting` 向文档 `<head>` 注入对应的 `<style>` 元素；EditorView.theme 中的选择器只有能匹配到实际 DOM 元素或 CodeMirror 内部生成类名时才生效。`.tok-*` 不是 CodeMirror 任何官方生成或约定的 DOM class 前缀，因此这 9 条规则在运行时从不被应用。
  真正生效的标题高亮来自 `cmHighlightStyle` 中 `tags.heading1/2/3/heading` → `hl-*` 路径；directive 高亮来自 `directivePlugin` 的 `class: "cm-directive-keyword"` DOM class（由 `directiveTheme` 处理）。`.tok-heading` 等同名规则与实际渲染路径完全脱钩，构成误导性死代码。
- **建议**: 删除 `cmBaseTheme` 中全部 `.tok-*` CSS 规则（第 29–74 行）；如需为 EditorView.theme 添加自定义属性，使用 CodeMirror 实际生成的选择器（`cm-content`、`cm-line`、`cm-cursor` 等标准内部类）或确保 class 名与实际 DOM 一致的自定义选择器。

---

### [R-003] LOW: `directiveTheme` 导出未被任何外部消费

- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `cm-markdown-lang.ts` 第 90 行以 `export const directiveTheme` 暴露，但唯一消费点是同文件 `markdownLanguageExtension()` 第 106 行。外部没有文件直接 import 此 export。
- **建议**: 去掉 `directiveTheme` 的 `export`，保持模块封装性；仅通过 `markdownLanguageExtension()` 对外暴露组合扩展。

---

### [R-004] LOW: AC-001 第二个测试断言强度偏弱 — 无法区分"高亮生效"与"仅挂载"

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `SourcePane.test.ts` 第 36–61 行的 "heading token receives a highlight class..." 测试断言 `allSpans.length > 0`（确认存在 `span` 元素），但未验证任何 `span` 携带与高亮样式对应的 `hl-*` class（来自 `HighlightStyle`）或验证 `span` 的 `style` 属性含 `color` 值。happy-dom 环境下 CodeMirror 确实为高亮内容生成带 `hl-*` class 的 `<span>`，当前断言无法排除"EditorView 挂载但高亮扩展未生效"的假绿场景。
  对比：AC-002 的测试已做到 `querySelectorAll(".cm-directive-keyword").length > 0`，断言强度明显更高。
- **建议**: 在 AC-001 第二个测试中追加：`const hlSpans = editorEl.element.querySelectorAll('.cm-line span[class]'); expect(hlSpans.length).toBeGreaterThan(0);`，或更强地断言某个 span 包含以 `hl-` 开头的 class（`Array.from(hlSpans).some(s => [...s.classList].some(c => c.startsWith('hl-')))`）。

---

### [R-005] LOW: `use-codemirror.ts` 中 `onBeforeUnmount` 的 `destroy()` 双重调用路径

- **category**: structure
- **root_cause**: self-caused
- **描述**: `use-codemirror.ts` 第 93–95 行在 composable 内部注册了 `onBeforeUnmount(() => destroy())`，同时 `SourcePane.vue` 第 40–42 行也在 `onBeforeUnmount` 中调用 `destroy()`。结果当 SourcePane 正常卸载时 `destroy()` 被调用两次（组件的 onBeforeUnmount 先于 composable 的 onBeforeUnmount 执行，EditorView 先被 destroy，`editorView.value` 置 null；第二次 destroy 因 null 检查幂等通过）。虽然当前 `destroy()` 实现是幂等的，但双路调用属于不必要的模式重复，若 destroy 逻辑扩展（如析构回调）可能产生副作用。
- **建议**: 从 `SourcePane.vue` 中移除显式的 `onBeforeUnmount` 调用，依赖 composable 内部的 lifecycle 钩子即可；或反之在 composable 内移除，由组件统一调用，确保调用权归属单一。

---

## AC 覆盖核查

| AC | 测试文件 | 覆盖评估 |
|----|---------|---------|
| AC-001 (标题高亮) | SourcePane.test.ts describe AC-001 | 覆盖，但断言强度偏弱（见 R-004） |
| AC-002 (directive 高亮) | SourcePane.test.ts describe AC-002，第二个测试验证 `.cm-directive-keyword` 存在 | 覆盖，断言有效 |
| AC-003 (300ms debounce) | SourcePane.test.ts describe AC-003 + use-codemirror.test.ts | 覆盖完整：fake timers 验证精确，含 300ms 触发 + 299ms 不触发 |
| AC-004 (readonly banner + styling) | SourcePane.test.ts describe AC-004 | 覆盖完整：存在断言、class 断言、无 banner 断言均有效 |

注：`use-codemirror.test.ts` 中的 debounce 单元测试属于白盒逻辑复现（replicate 实现代码而非调用 composable），不能替代集成层验证，但与 SourcePane.test.ts AC-003 互补可接受。

## 已知背景确认

- `wiring_complete=false`（SourcePane 未挂入 EditorShell 中栏）：符合设计预期，T-011 接线任务约束，不计入本次审查。

---

## Refactor 触发评估

- **dead-code** 命中（R-001: 未使用导出 `cmHighlightStyle`；R-002: 9 条永远不生效的 `.tok-*` CSS 规则；R-003: 未使用导出 `directiveTheme`）
- 建议 orchestrator 依据 `TDD_REFACTOR_TRIGGER` 中 dead-code 维度评估是否调度 refactorer 清理上述 3 处，优先 R-002（影响最大，误导性最强）
