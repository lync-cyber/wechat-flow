---
id: "code-review-zh-typo-vertical-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-043","T-044","T-045","T-046"]
---

# CODE-REVIEW: 中文排版垂直切片（T-043~T-046）Layer 2 批量审查

Layer 1: biome clean（项目 formatter）；cataforge 默认 Prettier 工具链对 zh-typo 规则文件报 FAIL 属工具链不匹配的 false-positive，本项目不使用 Prettier，已排除，不作为 finding。

## 审查范围

| 任务 | 文件 |
|------|------|
| T-043 | `packages/zh-typo/src/apply.ts`、`rules/{zh-en-space,fullwidth-punctuation,smart-quotes,ellipsis-dash}.ts`、`src/index.ts`、`tests/zh-typo/apply.test.ts` |
| T-044 | `packages/core/src/composers/apply-zh-typo.ts`、`packages/core/src/index.ts`（导出行）、`tests/app-layer/compose-apply-zh-typo.test.ts` |
| T-045 | `apps/mcp-server/src/tools/apply-zh-typo.ts`、`tools/router.ts`（注册行）、`tests/mcp-server/tools/apply-zh-typo.test.ts` |
| T-046 | `apps/editor/src/components/zh-typo/ZhTypoPreviewModal.vue`、`composables/use-zh-typo.ts`、`EditorShell.vue`（接线）、`ContextMenu.vue`（prop）、`__tests__/ZhTypoPreviewModal.test.ts`、`__tests__/use-zh-typo.test.ts` |

---

## 问题列表

### [R-001] MEDIUM: `fullwidth-punctuation.ts` 将 `--` 转破折号逻辑语义偏位

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `applyFullwidthPunctuation` 在函数名和注释暗示"全角标点"的职责内额外完成了 `--` → `——` 的破折号转换（`rDoubleDash` 正则）。但 `ellipsis-dash.ts` 的模块名（`applyEllipsisDash`）按文件名语义本应同时承载省略号与破折号两类规则。F-014 AC-001 明确将「省略号与破折号」列为同一类规则，而实现分散在两个不同函数中（`ellipsis-dash.ts` 只做省略号，破折号混入 `fullwidth-punctuation.ts`），导致规则 ID `ellipsis-dash` 的统计计数不含破折号命中。若用户查询 `perRule["ellipsis-dash"]`，实际只能看到 `...` 被转换的次数，`--` 转换的次数被计入 `fullwidth-punctuation`，与 F-014 AC-001 的"省略号与破折号"同类规则的分类预期不一致。
- **建议**: 将 `rDoubleDash` 及其替换逻辑从 `applyFullwidthPunctuation` 移到 `applyEllipsisDash`，使 `ellipsis-dash` 规则的 perRule 计数完整涵盖「省略号 + 破折号」两类命中，与 F-014 AC-001 语义对齐；同步更新相关测试用例验证 perRule 字段。

---

### [R-002] MEDIUM: `applyZhTypo` 不支持 `rules` 过滤参数，与 API-013 契约不符

- **category**: consistency
- **root_cause**: self-caused
- **描述**: arch API-013 `apply_zh_typo` 的 request schema 声明可选参数 `rules: ('zh-en-space'|'punctuation'|'quotes'|'ellipsis-dash')[]`（缺省 4 类全启）。当前 `applyZhTypo(input: { markdown: string })` 函数签名不接受 `rules` 过滤参数，始终全量运行 4 类规则。MCP Tool `applyZhTypoTool` 直接忽略了 `args.rules`（仅取 `args.markdown`），使契约的过滤能力缺失。虽然缺省全启行为在无 `rules` 参数时正确，但存在参数时用户期望的过滤不会生效，静默失败。
- **建议**: 在 `applyZhTypo` 函数签名补充可选 `rules?: string[]` 参数，`RULES` 数组按此过滤执行；`applyZhTypoTool` 读取 `args.rules` 并透传；同步补充 `rules` 过滤生效的测试用例。优先级与 AC-005 程序化调用完整性相关，建议在 Sprint 5 内修复。

---

### [R-003] MEDIUM: M-008 契约文档中 `composeApplyZhTypo` 返回签名不含 `diff` 字段，实现扩展了契约

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `arch-wechat-flow-modules.md` §2.M-008 中 `composeApplyZhTypo` 的对外接口声明为 `composeApplyZhTypo(markdown) → {fixed, perRule, totalChanges}`，没有 `diff` 字段。实际实现的 `ZhTypoComposerResult` 返回 `{fixed, perRule, totalChanges, diff}`，并由 `apply.ts` 的 `ZhTypoResult.changes` 映射为 `diff`。T-046 `use-zh-typo.ts` 消费了 `result.diff` 驱动 Modal 展示。实现超出了 arch 声明的范围，文档与实现不一致，后续消费方无法通过 arch 文档感知 `diff` 字段存在。
- **建议**: 在 `arch-wechat-flow-modules.md` §2.M-008 对外接口描述中补充 `diff: DiffEntry[]` 字段；或确认该字段为"实现内部细节"后在 T-046 Modal 侧直接消费 `applyZhTypo` 的 `changes`（绕过 M-008 接口）。前者更推荐，因为 `diff` 是 UI 功能的核心数据，应属于公开接口。

---

### [R-004] MEDIUM: `use-zh-typo.ts` 存在幂等性风险——连续两次调用 `openZhTypoPreview` 会产生竞态

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `_pendingFixed` 是模块级闭包变量。当 `openZhTypoPreview` 被调用时立即覆盖 `_pendingFixed`。若用户快速点击触发 Modal（第一次 Modal 未关闭就再次触发），第二次 `_pendingFixed` 覆盖第一次的值，但 Modal 状态 `isPreviewOpen` 在第二次调用时已为 `true`，不会重置 `diff`/`perRule`/`totalChanges`（实际会重新赋值，但不会关闭重开 Modal），存在竞争的 `confirm` 操作会使用最新的 `_pendingFixed`，与 Modal 显示的 diff 条目一致，这个场景在当前实现下实际无数据错乱。但 `_pendingFixed` 是模块作用域的可变状态，在 `useZhTypo()` 每次调用都返回新函数闭包但共享 `_pendingFixed` 变量的情况下，若多个组件同时实例化 `useZhTypo()`，会出现意外状态共享（不同实例的 confirm 操作读同一 `_pendingFixed`）。当前 `EditorShell.vue` 只调用一次，风险未现，但实现的架构脆弱。
- **建议**: 将 `_pendingFixed` 移入 `ref()` 使其成为响应式状态，或封装为返回值的一部分以确保每次 `useZhTypo()` 调用得到独立实例。

---

### [R-005] LOW: `use-zh-typo.ts` 确认修订路径 `editorView` 不可用时静默回退到 `store.setContent`，行为未在 Modal 层区分

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `confirmRevision` 有两条写回路径：`editorView` 可用时走 `view.dispatch` 进 CodeMirror undo 栈（AC-004），否则 fallback 到 `store.setContent`。当前 `EditorShell.vue` 传递 `sourcePaneRef.value?.editorView ?? null`，若 `sourcePaneRef` 挂载前用户快速触发确认，`editorView` 为 null，会走 `store.setContent` 写回——该路径不进 CodeMirror undo 栈，导致 AC-004 undo 要求静默失败。用户不会收到任何提示说明 undo 能力不可用。
- **建议**: 在 `editorView` 为 null 时补充 toast 提示或 console.warn，告知用户此次操作不在 undo 栈中。长远看，应确保 `confirmRevision` 在生产路径上始终有可用的 `editorView`，或将 undo 功能降级为 `store.setContent` + 保存快照恢复的方式明确支持。

---

### [R-006] LOW: `smart-quotes.ts` 不处理单引号，与 F-014 AC-001 部分不符

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-014 AC-001 中"智能引号"规则描述为 `"x"` / `'x'` → `"x"` / `'x'`（含单引号转换）。当前 `applySmartQuotes` 使用 `/"([^"]+)"/g` 仅处理双引号，不处理成对直单引号 `'...'` 到弯单引号 `'...'`。单引号在中文排版中使用频率相对低，但 PRD 明确列入功能范围。
- **建议**: 在 `applySmartQuotes` 中补充直单引号 `'([^']+)'` → `'${inner}'` 转换，并在 `apply.test.ts` 中补充单引号场景测试用例。

---

### [R-007] LOW: T-045 MCP Tool 测试仅覆盖 `zh-en-space` 场景，其余 3 类规则无 e2e 测试

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/mcp-server/tools/apply-zh-typo.test.ts` 仅使用 `"这是GitHub的项目"` 样本测试 `zh-en-space`，未覆盖 `fullwidth-punctuation`、`smart-quotes`、`ellipsis-dash` 三类规则的 Tool 端到端路径。若工具接线层在特殊字符场景下有问题（如 JSON 序列化时的全角字符），不会被发现。
- **建议**: 补充至少一个覆盖多规则的测试样本（例：`"这是"测试"..."`），验证 e2e 路径上全角字符正确序列化和返回。

---

### [R-008] LOW: `ZhTypoPreviewModal.vue` 未设置 `aria-labelledby`，无障碍属性不完整

- **category**: convention
- **root_cause**: self-caused
- **描述**: Modal 使用了 `role="dialog"` 和 `aria-modal="true"`，但缺少 `aria-labelledby` 指向标题元素（`zh-typo-modal__title`），屏幕阅读器无法关联对话框标题，不满足 ARIA 规范最佳实践。
- **建议**: 为标题 `<h2>` 添加 `id="zh-typo-modal-title"`，并在 `.zh-typo-modal__backdrop` 上补 `aria-labelledby="zh-typo-modal-title"`。

---

## Integration Wiring 验证摘要（T-046 user-facing critical path）

全链路核对：

1. `EditorShell.vue` → `ContextMenu` 的 `on-command` handler 中 `commandId === "content-zh-typo"` 分支调用 `zhTypo.openZhTypoPreview(editorStore.content)`——**真实调用点存在，非空 stub**。
2. `ZhTypoPreviewModal` 挂载在 `EditorShell` 模板底部，`:is-open="zhTypo.isPreviewOpen.value"` 绑定，`:on-confirm="onZhTypoConfirm"`——**Modal 挂载完整**。
3. `onZhTypoConfirm` 取 `sourcePaneRef.value?.editorView ?? null` 后调用 `zhTypo.confirmRevision({ editorView: view })`——**写回路径已接线**。
4. `confirmRevision` 中 `view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: fixed } })` 是真实 CodeMirror dispatch，纳入 history extension 的 undo 栈——**AC-004 路径真实可用**（条件：`history()` extension 已在 SourcePane EditorView 挂载，此为前提依赖）。
5. `ContextMenu` `isZhTypoDisabled` prop 由 `!zhTypo.hasZhTypoIssues(editorStore.content)` 驱动，无排版问题时 disable——**双入口 guard 正确**。

Integration wiring 结论：生产路径完整，无空 stub。

---

## Security 专项核查

- **XSS（Modal 渲染 diff 文本）**: `ZhTypoPreviewModal.vue` 使用 `{{ entry.original }}`、`{{ entry.revised }}` 等 Vue 模板插值，均为文本绑定，Vue 默认 HTML 转义，**无 v-html 注入**，XSS 风险不存在。
- **ReDoS（正则）**: 四个规则函数的正则分析：
  - `zh-en-space.ts`: `([CJK])([ASCII])` 线性匹配，无灾难性回溯风险。
  - `fullwidth-punctuation.ts`: `([CJK_PAT])([,.?!():;])` + `/--/g` 线性，安全。
  - `smart-quotes.ts`: `/"([^"]+)"/g` — `[^"]+` 为否定字符类，无回溯放大，安全。
  - `ellipsis-dash.ts`: `/\.\.\./g` 字面匹配，安全。
- **代码/URL/HTML 字面量误伤面**: `applyZhTypo` 使用 `visit(tree, "text", ...)` 精确访问 mdast `text` 节点，跳过 `code`、`inlineCode`、`html`、`link.url`、`image.url` 等节点——F-014 AC-002 的字面量保护机制有效。
- **MCP 输入验证**: `applyZhTypoTool` 使用 `String(args.markdown ?? "")` 对入参做强制 String 转换，避免类型注入，安全合理。

---

## Verdict

**approved_with_notes**

| 严重等级 | 数量 | 问题编号 |
|---------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 4 | R-001, R-002, R-003, R-004 |
| LOW | 4 | R-005, R-006, R-007, R-008 |

无 CRITICAL/HIGH 问题，Integration wiring 完整，undo 路径（AC-004）由 use-zh-typo.test.ts 中的真实 `EditorView + history()` 测试验证（非伪造），Security 面无注入/ReDoS 风险。主要 MEDIUM 问题：破折号规则分类偏位（R-001）、API-013 `rules` 过滤参数缺失（R-002）、M-008 arch 文档漏声明 `diff` 字段（R-003）、`_pendingFixed` 可变状态隔离脆弱（R-004）。建议用户选择接受并继续，4 个 MEDIUM 在 Sprint 5 适当时机跟进修复。
