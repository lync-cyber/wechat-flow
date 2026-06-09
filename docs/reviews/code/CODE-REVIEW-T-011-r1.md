---
id: "code-review-T-011-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-011"]
---

# CODE-REVIEW T-011: M-008 composeRender use case 端到端接线

Layer 1 delegated to hook（PostToolUse Edit matcher → `lint_format`，编码阶段实时修复，已通过门禁 biome 0 error）

---

## 审查范围

| 文件 | 角色 |
|------|------|
| `apps/editor/src/use-cases/render.ts` | composeRender use case |
| `apps/editor/src/stores/editor.ts` | previewHtml state + updatePreview action |
| `apps/editor/src/components/layout/EditorShell.vue` | SourcePane/PreviewPane 接线 |
| `tests/app-layer/compose-render.test.ts` | AC-001/AC-003 单元测试 |
| `apps/editor/src/components/layout/__tests__/EditorShellWiringT011.test.ts` | AC-002 端到端测试 |

---

## 问题列表

### [R-001] HIGH: EditorShell 组件内自建独立 pinia 实例导致生产状态割裂

- **category**: structure
- **root_cause**: self-caused
- **描述**: `EditorShell.vue` 第 11–12 行 `const pinia = createPinia(); const editorStore = useEditorStore(pinia)` 在组件内部创建了一个全新的 pinia 实例，并将其显式传入 `useEditorStore`。与此同时 `main.ts` 已通过 `app.use(createPinia())` 向 Vue app 注册了全局 pinia。结果：`EditorShell` 使用的 `editorStore` 与全局应用注入的 pinia 实例完全隔离——两者不共享任何状态。在 Sprint 1 单组件场景下此问题暂不可见，但一旦任何其他组件（如 TopBar 同步状态显示、文档列表等）通过无参 `useEditorStore()` 访问全局 store，将取到与 EditorShell 完全不同的实例，导致 previewHtml / currentTheme 等状态静默割裂，极难调试。这是 Pinia 的已知反模式（组件内构建 pinia 而非消费注入的 pinia）。
- **建议**: 
  1. 删除 `EditorShell.vue` 中 `import { createPinia } from "pinia"` 及 `const pinia = createPinia()` 两行。
  2. 将 `useEditorStore(pinia)` 改为无参调用 `useEditorStore()`，让 Pinia 自动使用全局注入的实例。
  3. 在 `EditorShellWiringT011.test.ts` 中，`mount(EditorShell, ...)` 调用需补充 `global: { plugins: [createPinia()] }` 选项（或在 `beforeEach` 调用 `setActivePinia(createPinia())`），为测试提供正确的 pinia 上下文，无需在组件内自建。

---

### [R-002] MEDIUM: `ComposeRenderResult` 未复用 core `RenderResult` 类型，与 arch M-008 契约命名存在偏差

- **category**: consistency
- **root_cause**: self-caused
- **描述**: arch M-008 声明 `composeRender(input) → RenderResult`（即复用 core 的 `RenderResult` 类型）。当前实现在 `render.ts` 中自定义了 `ComposeRenderResult`，将 core `RenderResult` 的平铺版本字段（`coreVersion`、`themeVersion`、`rulesetVersion`）重新包装为嵌套的 `versionTriple` 对象。虽然 AC-003 明确要求 `versionTriple` 字段，但返回类型签名未与 core `RenderResult` 对齐（也未将其作为超集），形成一个独立的"并行类型"而非架构定义的 `RenderResult`。未来若 core 添加字段（如 `postPaste: boolean`，arch §2.M-002 line 56 明确声明 `RenderResult` 含此字段），use case 层将静默丢失该字段传播。
- **建议**: 考虑将 `ComposeRenderResult` 定义为 `RenderResult & { versionTriple: VersionTriple }` 的超集形式（从 core 导入 `RenderResult`），并在 composeRender 函数返回时 spread core 原始结果再附加 `versionTriple`。这样既满足 AC-003 的 versionTriple 要求，又与 arch M-008 的接口命名对齐，且不会在 core 扩展字段时静默丢失。

---

### [R-003] MEDIUM: `ComposeRenderResult.diagnostics: object[]` 弱类型，丢失 core 契约类型信息

- **category**: convention
- **root_cause**: self-caused
- **描述**: `render.ts` 第 16 行 `diagnostics: object[]`，而 core `RenderResult` 的 `diagnostics` 类型来自 `renderMarkdownResponseSchema`（`z.array(z.object({}).passthrough())`），对应 TypeScript 类型为 `Record<string, unknown>[]` 或等效形态，并非裸 `object[]`。`object[]` 是 TypeScript 中极弱的类型（不可访问任何属性），使下游消费 diagnostics 字段时完全无类型安全保障。packages/contracts 中已有 `diagnosticSchema` 可导入。
- **建议**: 将 `diagnostics: object[]` 改为 `diagnostics: z.infer<typeof diagnosticSchema>[]`（从 `@wechat-flow/contracts` 导入 `diagnosticSchema`），与 core 层 `RenderResult` 的诊断类型对齐。若 R-002 建议被采纳（ComposeRenderResult 继承 core RenderResult），此问题自然消除。

---

### [R-004] MEDIUM: AC-002 debounce 300ms 覆盖缺口——测试绕过了 SourcePane 内部 debounce，AC 声明的 300ms 行为未被验证

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `EditorShellWiringT011.test.ts` 第 49–53 行注释明确说明"SourcePane already debounces internally — we call handler directly"，测试直接调用从 props 取出的 `onValueChange` 函数，完全绕过了 SourcePane 的 debounce 实现。AC-002 的文字是"debounce 300ms → composeRender 被调用"，明确把 300ms debounce 列为端到端验证点。当前测试只验证了"handler 调用后 PreviewPane 更新"，不覆盖 debounce 时序契约。SourcePane 的 debounce 由 T-009 负责，但 T-009 的测试覆盖的是 SourcePane 单元级 debounce，而非 EditorShell 集成路径下的 300ms 端到端时序。
- **建议**: 在 `EditorShellWiringT011.test.ts` 的 AC-002 测试中，通过 CodeMirror 模拟用户输入（或触发底层 dispatch 事件）而非直接调用 onValueChange prop，然后用 `vi.advanceTimersByTime(299)` 断言 composeRender 尚未被调用，再 `vi.advanceTimersByTime(1)` 后断言已调用，以正式验证 300ms debounce 的端到端时序。若 happy-dom 环境下 CodeMirror 输入触发成本过高，可在 SourcePane 的集成测试层补充此时序断言，但需在 AC-002 测试文件的注释中明确标注测试边界与缺口。

---

### [R-005] MEDIUM: `RenderResult` 缺少 `postPaste: boolean` 字段，与 arch §2.M-002 契约偏差

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: arch `arch-wechat-flow-modules.md` §2.M-002 第 56 行明确声明"`RenderResult` 含 `postPaste: boolean`"，并要求三条路径（renderMarkdown / Preview / composeCopy）通过此字段对账。当前 `renderMarkdownResponseSchema`（`packages/contracts/src/mcp/tool-contracts.ts`）及 core `types.ts` 的 `RenderResult` 类型均未包含 `postPaste` 字段，`renderMarkdown` 返回值也未赋值该字段。`composeRender` use case 因此无法传播 `postPaste: false` 语义。此问题的根因在上游 contracts/core 层（schema 未声明字段），但已影响 T-011 的 use case 层完整性。
- **建议**: 在 `renderMarkdownResponseSchema` 中添加 `postPaste: z.boolean()`，在 core `render.ts` 的 `renderMarkdown` 返回值中赋 `postPaste: false`。若此修复属于 T-011 范围之外（contracts/core 变更），则应在 T-011 deliverable 的 `composeRender` 返回对象中显式附加 `postPaste: false as const`，并在任务卡或 backlog 记录上游修复需求。

---

### [R-006] LOW: 测试对 `coreVersion` 值强断言为 `'0.0.0'` 而非版本号格式校验，测试脆性风险

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `compose-render.test.ts` 第 32–34 行断言 `result.versionTriple.coreVersion` 严格等于 `'0.0.0'`。当 core 包版本号升级时（如 Sprint 2 发布 0.1.0），此测试将因版本号变更而失败，成为脆性测试。而该测试的实际意图是验证 versionTriple 字段存在且为有效版本格式，不应绑定具体版本字符串。
- **建议**: 将 `expect(result.versionTriple.coreVersion).toBe('0.0.0')` 改为 `expect(result.versionTriple.coreVersion).toMatch(/^\d+\.\d+\.\d+/)` 或使用 `semver.valid(result.versionTriple.coreVersion)` 断言为有效 SemVer，解耦测试与具体版本号。

---

## 接线完整性（integration-wiring）确认

**端到端链路验证通过**:

```
SourcePane(:onValueChange)
  → EditorShell lambda: (v) => editorStore.updatePreview(v)  [EditorShell.vue:119]
  → editorStore.updatePreview(markdown)                       [editor.ts:10-12]
  → composeRender({ markdown, themeId: currentTheme.value })  [render.ts:21]
  → renderMarkdown(input.markdown, { themeId })               [render.ts via core]
  → return { html, diagnostics, versionTriple }
  → previewHtml.value = result.html                           [editor.ts:12]
  → PreviewPane(:html-content="editorStore.previewHtml")      [EditorShell.vue:140]
```

链路存在且非空 stub。TopBar、ResizableSplitter、SourcePane、PreviewPane 等 T-008/T-009/T-010 已审组件未被 T-011 改动回归。`wiring-placeholder` 注解（TopBar onUndo/onRedo/onCopy）正确使用，豁免有效。

---

## TDD_REFACTOR_TRIGGER 分析

| 维度 | 命中 | 说明 |
|------|------|------|
| complexity | 否 | render.ts 31 行，editor.ts 16 行，圈复杂度均 ≤ 2 |
| duplication | 否 | versionTriple 组装局部，无跨文件克隆 |
| coupling | 否 | use case 层依赖 core 单点，符合架构定义 |

REFACTOR 阶段无需触发。

---

## P1 问题评级结论（orchestrator 预报告评级请求）

orchestrator 预报告的 pinia 实例隔离问题评级为 **HIGH / structure**，理由如下：

- 该问题直接破坏生产语义：多组件共享 store 时各自取到不同 pinia 实例，状态静默割裂，行为在运行时不可预测。
- Sprint 1 单组件场景下暂不可见，但等到 Sprint 2+ 添加第二个消费 editorStore 的组件时，调试成本极高（症状是状态更新了但视图不响应，且无任何错误日志）。
- 正确修复路径清晰（删除 2 行，测试侧补 `plugins: [createPinia()]`），无歧义。

---

## 三态判定

存在 HIGH 级别问题 [R-001]，判定为 **needs_revision**。

关联报告路径: `docs/reviews/code/CODE-REVIEW-T-011-r1.md`
