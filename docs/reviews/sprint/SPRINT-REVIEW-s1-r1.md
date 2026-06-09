---
id: "sprint-review-s1-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s1", "T-005", "T-006", "T-007", "T-012", "T-008", "T-009", "T-010", "T-011"]
---

# Sprint-Review S1 — 三栏 UI 骨架 + 渲染管线核心

**Sprint 目标**: 编辑器三栏布局可见；输入 Markdown 后右栏实时出现 inline-styled HTML 预览；本地草稿自动持久化到 IndexedDB。

**审查档位**: standard（代码基础 T-005/T-006/T-007/T-012 采用 merged-review 横截面视角；T-008/T-009/T-010/T-011 已有 per-task CODE-REVIEW 报告）

---

## Layer 1 结果复核

以下 Layer 1 发现为已知误报，不计入问题清单：

- 12 条「任务状态="" 期望 done」HIGH：本项目 dev-plan 任务卡无 `status` 字段，状态由 CLAUDE.md §项目状态 + EVENT-LOG 追踪，非任务卡字段，框架 checker 误判。**root_cause: reviewer-calibration**，不阻塞。
- 1 条「T-011 deliverable packages/core/src/composers/render.ts 缺失」HIGH：任务卡 deliverables 注明"或 apps/editor/src/use-cases/render.ts，implementer 按 ARCH §7.2 决策"。实际选用后者以避免 core 循环依赖，二选一语义在 `project_features.deliverables_accept_alternation: true` 下应自动过。**root_cause: upstream-caused（framework 不识别 `|` 或条件语义）**，不阻塞。
- 15 条 gold-plating LOW（测试辅助文件 / tokens.css / constants.ts / use-cases/index.ts）：均属有效计划外配套产物（测试支撑 / 设计系统桥接），在 `unplanned_glob_patterns` 覆盖范围内。**root_cause: reviewer-calibration**，不阻塞。
- AC 覆盖字符串匹配：28 个 AC 全部通过。

---

## 问题清单（按严重等级）

---

### [SR-001] HIGH: T-108 AC-4 草稿自动持久化接线缺失 — Sprint 目标未完成

- **category**: missing-deliverable
- **root_cause**: self-caused
- **描述**: Sprint 1 目标明示"本地草稿自动持久化到 IndexedDB"。T-012 实现了 storage 层（`saveDraft`/`loadDocument`/`listDocuments`/`deleteDocument`），但**SourcePane 编辑内容从未接线到 `saveDraft`**。当前接线链路为：

  ```
  SourcePane onValueChange → editorStore.updatePreview → composeRender → previewHtml
  ```

  该链路仅驱动实时预览，不写 IndexedDB。T-108 AC-4（"在中栏输入内容，关闭浏览器标签页，重新打开后内容恢复"）在当前代码下**无法通过**：`editorStore` 无 `currentDocId` 赋值逻辑（仍为初始 `null`），`saveDraft` 从未在编辑路径中被调用，`loadDocument` 也从未在 `EditorPage` 初始化时调用。

  确认在整个 Sprint 1 已完成任务（T-005/T-006/T-007/T-008/T-009/T-010/T-011/T-012）的 deliverables 中，**没有任何一个任务卡声明"将 SourcePane 输入变化接线到 saveDraft"**。T-012 的 deliverables 仅覆盖 storage 层 API；T-011 的 deliverables 覆盖 `previewHtml` 接线（实时预览），不含草稿写入。这是 Sprint 1 任务拆分遗漏了"草稿 UI 接线"任务（M-013 与 M-001 之间的接线层），在任务卡粒度上属计划缺口。

- **建议**:
  1. **短期（补 Sprint 1 任务）**: 在 `editorStore.updatePreview` 中或在 `EditorShell.vue` 的 `SourcePane onValueChange` lambda 内，追加 `saveDraft({ id: docId, content: markdown, ... })` 调用，并在 `EditorShell` 初始化时调用 `loadDocument` 恢复内容。此为单点改动，在现有骨架上完成接线。
  2. **或 defer（修订 T-108）**: 若用户接受延期，需在 dev-plan 中新增一个 Sprint 2 接线任务（或归入 T-064 多文档管理的前置工作），并修订 T-108 AC-4 为"待接线任务完成后验证"，从 Sprint 1 验收条件中剔除。T-108 在当前状态下不具备全量通过条件。

---

### [SR-002] HIGH: T-011 R-001 Pinia 实例隔离（已知 needs_revision，修复状态待核实）

- **category**: structure
- **root_cause**: self-caused
- **描述**: CODE-REVIEW-T-011-r1 判定 `needs_revision`，核心问题为 `EditorShell.vue` 在组件内自建独立 pinia 实例（`createPinia()`），导致其 `editorStore` 与全局 pinia 实例隔离。该问题已进入 revision 流程。

  **当前代码验核**：查阅最新 `EditorShell.vue`（第 10 行）：`const editorStore = useEditorStore();` — **无参调用，已修复**。`main.ts` 全局 `app.use(createPinia())` 正确。`EditorShellWiringT011.test.ts` 使用 `global: { plugins: [createPinia()] }`，测试侧修复也已落地。

  R-001 HIGH 已修复，CODE-REVIEW-T-011-r1 判定 needs_revision 对应问题已消除。**本条问题记录为历史追踪，不计入当前阻塞**。revision 完成后 CODE-REVIEW-T-011 应更新为 approved_with_notes。

- **建议**: 请确认 CODE-REVIEW-T-011 revision 报告（-r2）是否已补发；若未补发，应出具 r2 并将 status 改为 approved。

---

### [SR-003] MEDIUM: EditorPage 未挂载 EditorShell — 路由入口与组件间存在 wiring gap

- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: `apps/editor/src/pages/EditorPage.vue` 当前内容仅为 `<template><main>Editor</main></template>`，并未渲染 `EditorShell`。`router/index.ts` 将 `/` 路由指向 `EditorPage`，但 `EditorShell` 未在任何页面组件中引用。

  实际路由链：`/ → EditorPage → <main>Editor</main>`，**EditorShell 从未挂入生产路径**。用户在浏览器访问 `http://localhost:5173` 只会看到字符串"Editor"，三栏布局不可见。

  T-108 AC-1（"可见三栏布局"）在当前生产路径下无法通过。EditorShell 仅存在于测试（`mount(EditorShell, ...)`），未进入真实 DOM 树。

  此问题在 T-008/T-009/T-010/T-011 的 per-task code-review 中均未被标记，因为各任务测试均直接 mount EditorShell，绕过了路由层。

- **建议**: 在 `EditorPage.vue` 中 `import EditorShell from '../components/layout/EditorShell.vue'` 并在 `<template>` 中渲染 `<EditorShell />`。此为 wiring 遗漏（接线对象存在但未挂入消费点），单行+单行修复。

---

### [SR-004] MEDIUM: 代码基础批量审查 — inline-style.ts 注入面漏洞：blockquote 非 phrasing content 场景下嵌套元素丢失样式

- **category**: structure
- **root_cause**: self-caused
- **描述**: `inlineStyle` 函数（`inline-style.ts` 第 93-138 行）使用递归向下 `applyInlineStyles` 遍历 hast 树，对 `node.type === 'element'` 时应用 `tagName` 对应的 `styleMap` 样式。`DEFAULT_TOKENS` 仅覆盖：h1/h2/h3、p、strong、em、code、blockquote，共 8 个顶层标签。

  问题：`blockquote` 内部通常包含 `<p>` 子元素。当 `blockquote` 节点被处理时，其 `properties` 会被设置为 blockquote 的 styleMap 值。随后递归进入 `blockquote.children`，这些 `<p>` 子节点确实也会被 styleMap 命中。但 `mergedStyle` 合并逻辑（第 102-106 行）：`mergedStyle = tagStyle ?? ""`，对 `<p>` 子节点会正确取到 `p` 的 styleMap 值，行为正确。

  **实际问题（较隐蔽）**：`buildStyleMap` 函数（第 140-162 行）使用正则 `/<([\w]+)[^>]*\sstyle="([^"]+)"/g` 从 juice 产出中提取 tag→style 映射。该正则在 placeholderHtml（`<div><blockquote>...<p>...</p></blockquote></div>`）中，若 blockquote 和 p 的 style 解析时 `<p>` 出现在 blockquote 子结构中，正则仍能匹配每个 tag 的第一次出现（`if (!styleMap.has(tag))`）。但 `buildPlaceholderHtml` 函数（第 76-81 行）仅生成顶层平铺的标签，不嵌套，因此 blockquote 内不含 p，p 单独在顶层出现，styleMap 构建正确。

  **真正的问题**：`DEFAULT_TOKENS` 不含 `a`、`ul`、`ol`、`li`、`table`、`th`、`td`、`pre`、`img` 等常见元素。这些元素在渲染时不会被 `applyInlineStyles` 赋 style（tagStyle = undefined → mergedStyle = ""），最终 `newProps.style = undefined`（行 114），相当于原样通过，**保留了 remark-rehype 可能添加的 class 属性**。

  查看 `applyInlineStyles` 中 `propsWithoutClass`（第 100 行）始终移除 `class` 属性（`stripClassFromProperties`）。因此所有未被 styleMap 覆盖的元素（如 `<a>`、`<li>`）会**丢失 class 但不获得 style**，产出零样式裸元素。`<a>` 链接无颜色、`<li>` 无 margin，是合理的骨架 skeleton 行为（Sprint 1 "默认 token" 即如此定义），但不是完整的微信兼容输出。

  这不构成功能缺陷（Sprint 1 deliverable 允许 skeleton），但 `tests/core/inline-style.test.ts` 的 AC-002 测试不验证 `<a>` 等元素是否真的无 class（只验证 `# 标题\n\n段落内容` 场景），覆盖有效性存在边界缺口。

- **建议**: 在 `tests/core/inline-style.test.ts` 中补充一个含 `[链接](url)` 的 Markdown 输入，验证产出 HTML 中 `<a>` 无 class 属性（确认 stripClass 行为）。完整 token 覆盖属后续 Sprint token 扩展工作。

---

### [SR-005] MEDIUM: 代码基础批量审查 — indexeddb-adapter 模块级单例 `dbInstance` 在 SSR/测试隔离场景下存在状态泄漏风险

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `packages/core/src/storage/indexeddb-adapter.ts` 第 36 行 `let dbInstance: IDBPDatabase<WechatFlowDb> | null = null` 为模块级单例。在 Vitest 测试套件中，`afterEach` 通过 `closeDb()` + `indexedDB.deleteDatabase(...)` 正确清理，问题可控。

  但问题在于：`closeDb` 仅将 `dbInstance` 置 null 并调用 `db.close()`。若两个并发调用 `getDb()` 在 `dbInstance === null` 的窗口期同时进入（两者都 `await openDB(...)`），会创建两个 IDBPDatabase 实例，第二个 `openDB` 在第一个完成前发起会导致版本冲突（IndexedDB 不允许同一数据库并发多次 `open` 到不同 upgrade 状态）。

  在实际浏览器使用中，应用单进程单线程，`getDb()` 并发窗口期极短，实践上很少命中。但在测试环境下并行测试文件可能共享模块实例（Vitest `--pool=threads` 下每个 worker 独立 module graph，不会共享；`--pool=forks` 同理）。然而**同一测试文件内若有并发 `it` 块（`concurrent` 关键字）**，则可能触发竞态。当前 `indexeddb.test.ts` 未使用 `concurrent`，无实际问题。

  **更直接的问题**：`getDb()` 在 `closeDb()` 被调用后若有任何悬挂 Promise 还在使用旧 `dbInstance`（因为 `closeDb` 不等待正在进行的事务完成），可能产生"数据库已关闭"错误。当前测试中 `afterEach` 在 `await closeDb()` 前不等待所有 DB 操作完成，存在隐式竞态（实际测试未发生，因为单测用例均同步等待 DB 操作）。

- **建议**: 添加一个 `resetDb()` 测试工具函数（仅在 test 环境暴露），合并 closeDb + deleteDatabase 逻辑；或为 `getDb()` 添加并发 guard（如 `if (openingPromise) return openingPromise`），避免并发多次 `openDB`。现有骨架层级此为 LOW/MEDIUM 改进，不阻塞当前功能。

---

### [SR-006] MEDIUM: 代码基础批量审查 — render.ts 未集成 inlineStyle 阶段，渲染管线不完整

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `packages/core/src/render.ts`（T-006 deliverable）当前实现：

  ```ts
  export async function renderMarkdown(input, options) {
    const mdast = parseMarkdown(input);
    const hast = transformToHast(mdast, options);
    const html = serializeHast(hast);
    return { html, diagnostics: [], ... };
  }
  ```

  **`inlineStyle` 阶段（T-007 deliverable）完全未被调用**。`render.ts` 直接从 hast → html，产出的 HTML 含 class 属性、无 inline style，不满足 arch §2.M-002 描述的五段管线（parse → transform → **inline-style** → serialize → sanitize）。

  `inlineStyle` 函数在 `tests/core/inline-style.test.ts` 中被独立测试，但从未被集成到 `renderMarkdown` 的生产路径中。这意味着：
  1. `composeRender` → `renderMarkdown` 的实时预览产出的 HTML 含 class 属性，不符合微信编辑器粘贴兼容要求（微信过滤 class）。
  2. T-108 AC-2（"右栏 iframe 内出现对应 HTML，含 `<h1>`"）在技术上可以通过（`<h1>` 确实出现），但产出 HTML 是非 inline-styled 版本，不符合产品目标。
  3. arch M-002 "renderMarkdown → inline-styled HTML" 的接口契约未兑现。

  T-007 任务卡仅声明产出 `inline-style.ts`，未声明"将 inlineStyle 接入 render.ts"；T-006 任务卡未声明接入 inline-style 阶段。这是两个任务间的接线职责未在任务卡中明确划定，导致接线缺口。

- **建议**:
  在 `packages/core/src/render.ts` 中：
  ```ts
  import { inlineStyle } from "./pipeline/inline-style.ts";
  // ...
  const hast = transformToHast(mdast, options);
  const styledHast = inlineStyle(hast);      // 添加此行
  const html = serializeHast(styledHast);    // 替换此行
  ```
  同时在 `tests/core/render.test.ts` 中补充 AC-001 的断言：产出 `html` 中 `<h1>` 含 `style=` 属性且无 `class=` 属性，确认管线集成正确。

---

### [SR-007] MEDIUM: T-009 R-001/R-002/R-003 dead-code 三处（cmHighlightStyle/tok-规则/directiveTheme 未使用导出）— 已触发 refactor 建议未执行

- **category**: dead-code
- **root_cause**: self-caused
- **描述**: CODE-REVIEW-T-009-r1 标记三处 dead-code（MEDIUM/LOW），并触发了 TDD_REFACTOR_TRIGGER 的 dead-code 维度，建议 orchestrator 调度 refactorer。当前代码库中这三处问题均未修复：
  - `cmHighlightStyle` 仍以 `export const` 暴露（未降为 module-private）
  - `cmBaseTheme` 中 9 条 `.tok-*` CSS 规则仍存在（永远不匹配任何 CodeMirror DOM 元素）
  - `directiveTheme` 仍以 `export const` 暴露

  这三处中，R-002（`.tok-*` 死规则）是误导性最强的——维护者可能误以为这些规则在生效，实际上真实高亮路径完全走 `HighlightStyle.define()` → `hl-*` 类名。

- **建议**: 按 CODE-REVIEW-T-009-r1 [R-001/R-002/R-003] 建议执行：(1) 删除 `cmBaseTheme` 中全部 `.tok-*` CSS 规则；(2) `cmHighlightStyle` 去掉 export；(3) `directiveTheme` 去掉 export。优先执行 R-002，单文件修改，不影响其他模块。

---

### [SR-008] LOW: 代码基础批量审查 — renderMarkdown 返回 `themeVersion: "0.0.0"` 硬编码，缺乏主题版本追踪机制

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `packages/core/src/render.ts` 第 18–19 行 `rulesetVersion: options?.rulesetVersion ?? "0.0.0"` 和 `themeVersion: "0.0.0"`（硬编码，无论传入什么 `themeId` 均返回 "0.0.0"）。arch §2.M-002 定义 `RenderResult` 含 `themeVersion`，但未要求 Sprint 1 完成主题版本注册。当前行为在 Sprint 1 骨架层是可接受的（`rulesetVersion: '0.0.0'` 已在 T-011 AC-003 明确允许）。

  问题在于：`options` 中有 `themeId` 参数，但 `renderMarkdown` 完全忽略它（不影响任何管线行为）。`DEFAULT_TOKENS` 与 themeId 无关，主题系统尚未接入。目前 `composeRender` 传入 `{ themeId: input.themeId }` 到 `renderMarkdown` 但该参数无任何作用。

- **建议**: 在 `render.ts` 的 `themeVersion: "0.0.0"` 处添加注释 `// cataforge: wiring-placeholder — theme registry wiring deferred`，明确这是骨架占位，避免后续开发者误认为主题系统已接入。

---

### [SR-009] LOW: T-008 R-001 tokens.css 大量 Token 缺失 — 未在后续任务中补全

- **category**: completeness
- **root_cause**: self-caused
- **描述**: CODE-REVIEW-T-008-r1 [R-001/R-002] 标记约 40 个 ui-spec §1 Token 缺失（功能色、诊断色、阴影、z-index、间距、圆角、字重、行高、断点等）。该问题在 T-008 审查时建议"T-009 启动前修复"，但在 T-009/T-010/T-011 实现期间未被修复。下游组件（SourcePane、PreviewPane、SyncStateIndicator）中部分 CSS Token 引用仅使用了已定义的基础集，缺失 Token 主要影响功能色（success/warning/error）和 SyncStateIndicator 的 `--color-brand`（conflict 状态）等。

  Sprint 1 功能交付不被此阻塞（骨架行为不依赖功能色），但 T-098 设计稿对照签字将发现视觉差异（Token 未定义时回退 CSS 属性）。

- **建议**: 按照 CODE-REVIEW-T-008-r1 [R-001] 建议，在 Sprint 1 收尾前补全 tokens.css。优先补：`--color-success/warning/error`（功能色）+ `--color-diag-safe/warn/error`（诊断色）+ `--font-weight-normal/bold` + `--line-height-tight/base/relaxed` + `--bp-desktop`。

---

### [SR-010] LOW: T-011 R-002/R-003 ComposeRenderResult 类型偏差（diagnostics: object[]; ComposeRenderResult 未继承 core RenderResult）

- **category**: consistency
- **root_cause**: self-caused
- **描述**: CODE-REVIEW-T-011-r1 [R-002/R-003] 标记的类型设计问题。

  **当前代码核查**：`apps/editor/src/use-cases/render.ts` 第 14 行：`export type ComposeRenderResult = RenderResult & { versionTriple: VersionTriple }`，已采用 `RenderResult &` 超集形式（T-011 CODE-REVIEW R-002 建议已被采纳）。`diagnostics` 类型从 core `RenderResult`（通过 `z.infer<typeof renderMarkdownResponseSchema>`）继承，不再是 `object[]`（R-003 亦自然消除）。

  此条问题**在当前代码中已修复**，记录为历史追踪。

- **建议**: 确认 T-011 revision 报告（r2）已记录 R-002/R-003 已修复，不需要进一步行动。

---

### [SR-011] LOW: T-011 R-004 EditorShellWiringT011 AC-002 测试绕过 SourcePane 内部 debounce — 端到端 300ms 时序仍有缺口

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: CODE-REVIEW-T-011-r1 [R-004] 指出测试直接调用 `onValueChange` prop 绕过了 SourcePane 内部 debounce。**当前代码核查**：`EditorShellWiringT011.test.ts` 第 90-129 行新增了第三个测试，通过 `editorView.dispatch(...)` 触发 CodeMirror 真实 document change，使用 `vi.advanceTimersByTimeAsync(299)` → `(1)` 验证精确 300ms debounce 时序。**此问题已在代码中修复**，debounce 端到端验证已落地。

- **建议**: 确认 revision 报告已记录 R-004 修复，无需进一步行动。

---

## T-005/T-006/T-007/T-012 合并代码审查（八维横截面）

| 任务 | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | 小结 |
|------|-----------|----------------|--------------|-------------|-----------|------------|----------|----------|------|
| T-005 (editor 骨架) | OK：Router/Pinia/App 职责清晰 | N/A（骨架无业务逻辑） | tdd_mode=skip，无测试，符合任务卡声明 | 无 | EditorPage 仅"Editor"文字（见 SR-003） | 低 | Vue Router → main 单点依赖，合理 | 无特殊暴露 | MEDIUM（SR-003 未接 EditorShell） |
| T-006 (渲染管线) | OK：parse/transform/serialize 职责单一，每文件 ≤11 行 | OK：parseMarkdown 无状态，错误由 unified 抛出，调用方 renderMarkdown async 可捕获 | 4 AC 全覆盖，断言有效（html 结构 + diagnostics 数组 + coreVersion）；AC-004 `toBe('0.0.0')` 脆性断言（T-011 compose-render.test.ts 已改用 regex，此处仍硬绑） | 无 | 无 | 低 | `renderMarkdown` 依赖 core 子模块，正确单向依赖 | 无 | MEDIUM（SR-006 inlineStyle 未集成；AC-004 脆性断言） |
| T-007 (inline-style) | OK：buildStyleMap/buildCssString/applyInlineStyles 职责清晰；`createRequire` CJS 桥接有效 | OK：`filterCssAttrs` 阻断 4 种 CSS 注入模式；juice 调用无异常路径；applyInlineStyles 递归无深度限制（hast 树深度有限） | 6+4 测试覆盖 AC + filterCssAttrs；juice 集成测试（AC-003）有效；缺少 `<a>`/`<li>` 等非默认 token 标签的覆盖（SR-004） | 无 | 无 | 中：`applyInlineStyles` 递归函数结构清晰但值 spread 较多 | core 内部单向依赖，合理 | 安全：filterCssAttrs 阻断 expression/javascript/behavior/@import，关键路径覆盖；未覆盖 `url(data:` 伪协议（data URI 可内嵌恶意内容但微信通常阻断）| MEDIUM（SR-004；安全 LOW） |
| T-012 (IndexedDB) | OK：adapter/manager/preferences 三层职责分离清晰 | MEDIUM：模块级单例 dbInstance 并发初始化竞态（SR-005）；closeDb 不等待正在进行事务 | 4 AC 全覆盖，含边界（undefined key）；使用 fake-indexeddb/auto，无假绿风险 | `getDb()` 在 manager.ts 和 preferences.ts 均通过 import 引用，无重复 | 无 | 低 | idb 8.x 通过 getDb 单点访问，合理 | N/A（本地 IndexedDB，无网络暴露） | MEDIUM（SR-005） |

**横截面模式总结**：
- **test-quality 系统性偏弱**：`tests/core/render.test.ts` AC-004 仍使用 `toBe('0.0.0')` 硬绑版本号（脆性断言，与 compose-render.test.ts 的 `/^\d+\.\d+\.\d+/` 不一致）。
- **接线缺口（SR-003/SR-006）** 是代码基础任务的主要问题：editorStyle 未集成 inlineStyle 管线、EditorPage 未挂 EditorShell，两处均导致生产路径不可用。
- T-006/T-007/T-012 单任务内部结构良好，无 duplication / dead-code / coupling 问题。

---

## 范围偏移 / 完成度分析

### Sprint 1 AC 总表

| 任务 | 规划 AC | 已交付 AC | 延期 AC | 计划外 AC |
|------|---------|----------|---------|----------|
| T-005 | AC-001/002/003 (tdd=skip) | 骨架交付（无测试） | — | — |
| T-006 | AC-001/002/003/004 | 4 AC 测试覆盖 | — | — |
| T-007 | AC-001/002/003 | 3 AC 测试覆盖 | — | — |
| T-008 | AC-001/002/003/004/005 | 5 AC 测试覆盖（AC-003 top-bar-toolbar 已补强） | — | — |
| T-009 | AC-001/002/003/004 | 4 AC 测试覆盖 | — | — |
| T-010 | AC-001/002/003/004/005 | 5 AC 测试覆盖 | — | — |
| T-011 | AC-001/002/003 | 3 AC 测试覆盖（AC-002 debounce 端到端已补强）| — | — |
| T-012 | AC-001/002/003/004 | 4 AC 测试覆盖 | — | — |
| T-108 Sprint 目标 | "草稿持久化"（隐含接线） | **未交付** | 草稿 UI 接线 | — |

**延期 AC 数**：1 个功能点（草稿 UI 接线，属 Sprint 目标但无对应任务卡 AC 承载）
**规划 AC 总数**：28 个（T-005~T-012 单元测试层面）
**偏移率**：草稿接线缺口 / 28 ≈ 3.6%（数字层面偏移率低，但该缺口直接影响 Sprint 目标 —— 不符合"草稿自动持久化"核心交付物）

注：T-096/T-097 设计任务已用户 sign-off。T-098/T-108 尚未执行（待 UI 代码接线修复后触发）。

---

## T-008/T-009/T-010/T-011 per-task CODE-REVIEW 质量聚合

| 报告 | verdict | MEDIUM 模式 | HIGH 模式 | refactor 触发 |
|------|---------|------------|-----------|--------------|
| T-008 | approved_with_notes | tokens.css 缺失 Token（completeness）、test-quality 间接断言 | 无 | 未触发 |
| T-009 | approved_with_notes | dead-code 3 处（cmHighlightStyle/tok-rules/directiveTheme） | 无 | 触发（dead-code，未执行） |
| T-010 | approved_with_notes | test-quality XSS 假绿（happy-dom 局限） | 无 | 未触发 |
| T-011 | needs_revision → [已修复] | type 偏差（ComposeRenderResult / diagnostics: object[]）| Pinia 实例隔离（已修复）| 未触发 |

**系统性模式识别**：
1. **happy-dom 测试环境局限**：T-009/T-010 均出现 happy-dom 无法验证真实浏览器行为（CodeMirror 高亮强度偏弱断言、iframe sandbox 假绿）。这是环境约束系统性表现，需 Playwright E2E（T-058）兜底，非代码问题。
2. **dead-code 未清理**（T-009 R-001/R-002/R-003）：refactorer 建议未被 orchestrator 调度执行，三处死代码仍保留在代码库中。
3. **接线注解一致性**：T-008/T-011 wiring-placeholder 注解符合规范，不产生误报。

---

## 判定

| 严重等级 | 数量 | 阻塞项 |
|---------|------|--------|
| CRITICAL | 0 | — |
| HIGH | 2 | SR-001（草稿 UI 接线缺失）、SR-002（T-011 Pinia HIGH 已代码修复，待报告更新）|
| MEDIUM | 5 | SR-003（EditorPage 未挂 EditorShell）、SR-004（inline-style 覆盖）、SR-005（DB 单例竞态）、SR-006（render.ts 未集成 inlineStyle）、SR-007（dead-code 未清理）|
| LOW | 4 | SR-008（themeVersion 占位注释）、SR-009（tokens.css 缺失）、SR-010/SR-011（T-011 已修复项历史追踪）|

**SR-001 和 SR-006 是最关键的阻塞项**：
- SR-001：草稿 UI 接线未实现 → Sprint 目标"本地草稿自动持久化"未完成
- SR-006：`renderMarkdown` 未集成 `inlineStyle` → 产品核心价值（inline-styled HTML）在生产路径中未兑现
- SR-003：EditorShell 未在路由入口挂载 → T-108 AC-1/AC-2 在浏览器中实际不可见

**SR-002（Pinia）、SR-010/SR-011（T-011 类型/debounce）**：代码已修复，需补充 revision 报告（CODE-REVIEW-T-011-r2）后清账。

**verdict: needs_revision**

标记修订任务：T-005（SR-003 EditorPage wiring）、T-011（CODE-REVIEW revision 报告 -r2 补发）；新增任务：草稿 UI 接线（SR-001）、`render.ts` 集成 `inlineStyle`（SR-006）。

---

## 草稿持久化 Gap 评级与归属建议

- **评级**: HIGH（直接违背 Sprint 1 明示目标"本地草稿自动持久化到 IndexedDB"；T-108 AC-4 在当前代码下无法通过）
- **归属建议**:
  - 选项 A（补 Sprint 1）：在现有任务框架内追加一个"草稿 UI 接线"小任务（task_kind: feature, tdd_mode: light），实现：`editorStore` 初始化时 `loadDocument(docId)` 恢复内容 + `updatePreview` 后异步调用 `saveDraft`。此为单点改动，不影响已通过测试。
  - 选项 B（defer Sprint 2）：将草稿接线纳入 S2 T-025 或 T-064 前置任务，修订 T-108 验收条件删除 AC-4。需明确告知用户 Sprint 1 目标缩水。
  - **推荐选项 A**：草稿接线实现简单，storage 层 API 已就绪，接线是直接连线不是新功能开发。defer 会让 Sprint 1"三件套目标"缺一，影响里程碑完整性。
