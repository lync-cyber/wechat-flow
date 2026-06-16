---
id: "dev-plan-wechat-flow-s2"
version: "0.4.1"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "ui-spec-wechat-flow", "ui-spec-wechat-flow-uc001-uc014"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 2: 规则集引擎 + 粘贴过滤 + 兼容性报告

[NAV]
- Sprint 2 任务卡 → T-013..T-019, T-052, T-094, T-099, T-109
[/NAV]

**Sprint 目标**: 渲染结果经 ≥25 条规则过滤；DiagnosticsPanel 展示兼容性分级；粘贴模拟可在 UI 中可视化。

---

## 3. 任务卡详细

### T-099: [DESIGN] Penpot — UC-013 DiagnosticsPanel + UC-013.1 Diff 视图视觉稿

- **目标**: 产出 DiagnosticsPanel 和 CompatibilityDiffView 的视觉稿，覆盖三色诊断展示和双栏 Diff 视图布局
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: UC-013 视觉稿覆盖 `empty-no-issues`、`has-issues`、`running`、`collapsed`、`expanded` 5 个状态，每条诊断项含左侧色块（红/黄/绿）
  - [ ] AC-002: UC-013.1 CompatibilityDiffView 视觉稿含双栏 before/after 布局，属性 diff 子列表（`+`/`-`/`=` 前缀行），命中规则行
  - [ ] AC-003: 通过 Penpot MCP `find_shape` 可检索到 `UC-013` 和 `UC-013.1` 组件
- **deliverables**:
  - [ ] Penpot 项目：UC-013, UC-013.1 视觉稿页面
- **relates_to**: [ui-spec-wechat-flow-uc001-uc014#§2.UC-013]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-013

---

### T-013: packages/ruleset 规则集骨架 + 注册中心（M-003）

- **目标**: 建立 `@wechat-flow/ruleset` 包，实现规则注册中心、`RuleDefinition` 类型、五类 scope 执行器骨架、规则集版本管理
- **模块**: M-003 (过滤规则集引擎)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `applyRuleset(hast, ruleset)` 调用，When 规则集为空数组，Then 返回 `{ hast: 原始hast, report }`，其中 `report` 为 `DiagnosticReport`（`diagnostics: []`、`nodeChangeRecords: []`、`nightRiskIssues: []`、`versionTriple` 由 `getRulesetVersion` 等填充），hast 未被修改 [ARCH#§2.M-003]
  - [ ] AC-002: Given 注册一条 `scope: 'strip'` 的测试规则（移除所有 `style` 属性），When 调用 `applyRuleset`，Then 返回的 hast 所有元素无 `style` 属性，且 `report` 中含该规则 ID（通过 `report.nodeChangeRecords[].triggerRuleId` 或 `report.diagnostics[].ruleId` 可追溯）[ARCH#§2.M-003]
  - [ ] AC-003: Given `getRulesetVersion()` 调用，When 执行，Then 返回 `@wechat-flow/ruleset` 的 `package.json` version 字段字符串值 [ARCH#§2.M-003]
- **deliverables**:
  - [ ] `packages/contracts/src/diagnostic/diagnostic-report.ts` — `DiagnosticReport` / `NodeChangeRecord` / `AttrDiffEntry` / `NightRiskEntry` schema（M-012 单源；T-004 未建立则在此补骨架）[ARCH#§2.M-003]
  - [ ] `packages/ruleset/src/rules/registry.ts` — `registerRule` / `getRules` / `getRulesetVersion`
  - [ ] `packages/ruleset/src/rules/scope/strip.ts` — strip scope 执行器骨架
  - [ ] `packages/ruleset/src/rules/scope/clamp.ts` — clamp scope 执行器骨架
  - [ ] `packages/ruleset/src/rules/scope/transform.ts` — transform scope 执行器骨架
  - [ ] `packages/ruleset/src/rules/scope/patch.ts` — patch scope 执行器骨架
  - [ ] `packages/ruleset/src/rules/scope/lint.ts` — lint scope 执行器骨架
  - [ ] `packages/ruleset/src/apply.ts` — `applyRuleset(hast, ruleset) → { hast, report: DiagnosticReport }` [ARCH#§2.M-003]
  - [ ] `packages/ruleset/src/version/manifest.ts` — 版本号读取
  - [ ] `tests/ruleset/apply.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-007, M-003]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-003
  - prd-wechat-flow-f001-f014#§2.F-007

---

### T-014: 规则集 strip 类 ≥ 10 条 + fixture

- **目标**: 实现 strip 作用域内置规则 ≥ 10 条（覆盖 `<style>` 剥除、`id` 属性剥除、`<script>` 剥除、`position` 属性、`flex/grid` 降级等），每条规则含 input/expected fixture
- **模块**: M-003 (过滤规则集引擎)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 2
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: false
- **dependencies**: [T-013]
- **acceptance_criteria**:
  - [ ] AC-001: Given `packages/ruleset/src/rules/builtin/` 目录，When 统计 strip scope 规则文件数，Then ≥ 10 个 `RuleDefinition` 文件，每个含 `id`、`scope: 'strip'`、`priority`、`matcher`、`transform` 字段 [ARCH#§2.M-003]
  - [ ] AC-002: Given `strip-style-tag` 规则，When 输入含 `<style>body{color:red}</style>` 的 hast，Then 输出 hast 中 `style` 标签被完全移除 [ARCH#§2.M-003 + prd-wechat-flow-f001-f014#§2.F-007]
  - [ ] AC-003: Given `strip-id-attr` 规则，When 输入含 `<div id="anchor">` 的 hast，Then 输出 hast 中所有元素的 `id` 属性被移除
  - [ ] AC-004: Given `strip-position` 规则（含 CSS 属性过滤），When 输入含 `style="position:fixed;color:red"` 的元素，Then 输出 style 为 `color:red`（position 被移除，其余保留）
  - [ ] AC-005: Given 运行 `pnpm turbo ruleset-fixture`（或等效命令），When 所有 strip 规则 fixture 执行，Then 100% 通过（`input.html` 经规则处理后 = `expected.html`）[F-007 AC-002]
- **deliverables**:
  - [ ] `packages/ruleset/src/rules/builtin/strip-style-tag.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-script.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-id-attr.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-position.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-js-events.ts` — 移除所有 `on*` 属性
  - [ ] `packages/ruleset/src/rules/builtin/strip-pseudo-classes.ts` — `:hover` / `::before` / `::after` 诊断
  - [ ] `packages/ruleset/src/rules/builtin/strip-flex-gap.ts` — flex gap/justify/align 降级
  - [ ] `packages/ruleset/src/rules/builtin/strip-transform-origin.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-font-family.ts`
  - [ ] `packages/ruleset/src/rules/builtin/strip-css-var.ts` — CSS 变量展开（`var(--x)` → 字面量）
  - [ ] 以上每条规则对应 `tests/ruleset-fixtures/{rule-id}/input.html` + `expected.html` + `metadata.json`
- **relates_to**: [F-007, M-003]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-003
  - prd-wechat-flow-f001-f014#§2.F-007

---

### T-015: 规则集 clamp/transform/patch/lint 类 ≥ 15 条 + fixture

- **目标**: 实现 clamp/transform/patch/lint 四类作用域内置规则 ≥ 15 条（含字号夹值、行高夹值、rgba alpha 夹值、ul/ol → table 布局转换、SVG url 规范化、data URI 去引号等），每条含 fixture
- **模块**: M-003 (过滤规则集引擎)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 2
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: false
- **dependencies**: [T-013]
- **acceptance_criteria**:
  - [ ] AC-001: Given `clamp-font-size` 规则，When 输入含 `style="font-size:8px"` 的元素，Then 输出 `font-size` 被夹至 `14px`（下限）；输入 `font-size:40px`，输出夹至 `32px`（上限）[prd-wechat-flow-f001-f014#§2.F-007]
  - [ ] AC-002: Given `transform-list-to-table` 规则，When 输入 `<ul><li>A</li><li>B</li></ul>`，Then 输出为 `<table>` 布局，`<li>` 内容以 table-row 形式展示，含 marker 列
  - [ ] AC-003: Given `clamp-rgba-alpha` 规则，When 输入 `style="color:rgba(0,0,0,0.1)"` （alpha < 0.15），Then 输出 alpha 被夹至 `0.15`
  - [ ] AC-004: Given `lint-grid-layout` 规则，When 输入含 `style="display:grid"` 的元素，Then 返回的 `diagnostics` 数组含一条 `level: 'error'`、`ruleId: 'lint-grid-layout'` 诊断 [ARCH#§2.M-003]
  - [ ] AC-005: 运行所有 clamp/transform/patch/lint fixture，100% 通过
- **deliverables**:
  - [ ] `packages/ruleset/src/rules/builtin/clamp-font-size.ts`
  - [ ] `packages/ruleset/src/rules/builtin/clamp-line-height.ts`
  - [ ] `packages/ruleset/src/rules/builtin/clamp-rgba-alpha.ts`
  - [ ] `packages/ruleset/src/rules/builtin/clamp-image-width.ts`
  - [ ] `packages/ruleset/src/rules/builtin/transform-list-to-table.ts`
  - [ ] `packages/ruleset/src/rules/builtin/transform-svg-url-normalize.ts` — SVG `url("#x")` → `url(#x)`
  - [ ] `packages/ruleset/src/rules/builtin/transform-svg-white-offset.ts` — SVG 纯白 `#ffffff` → `#fefefe`
  - [ ] `packages/ruleset/src/rules/builtin/transform-data-uri-unquote.ts`
  - [ ] `packages/ruleset/src/rules/builtin/patch-flex-to-block.ts` — `display:flex` → `display:block`
  - [ ] `packages/ruleset/src/rules/builtin/lint-grid-layout.ts`
  - [ ] `packages/ruleset/src/rules/builtin/lint-filter-backdrop.ts`
  - [ ] `packages/ruleset/src/rules/builtin/lint-position-fixed.ts`
  - [ ] `packages/ruleset/src/rules/builtin/patch-pseudo-element-materialize.ts` — `::before`/`::after` 降级提示
  - [ ] `packages/ruleset/src/rules/builtin/clamp-image-max-width.ts`
  - [ ] `packages/ruleset/src/rules/builtin/transform-ul-marker-type.ts`
  - [ ] 以上每条规则对应 `tests/ruleset-fixtures/{rule-id}/input.html` + `expected.html` + `metadata.json`
- **relates_to**: [F-007, M-003]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-003
  - prd-wechat-flow-f001-f014#§2.F-007

---

### T-016: M-002 sanitize 阶段（rehype-sanitize + wechatFlowSanitizeSchema）

- **目标**: 在渲染管线 `transform` 之后、规则集之前插入 sanitize 阶段：`rehype-sanitize` + `wechatFlowSanitizeSchema`；实现 `extendSanitizeSchema` 供 Block 注册中心在运行时合入自定义 Block 标签
- **模块**: M-002 (渲染管线核心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: true
- **dependencies**: [T-006, T-013]
- **acceptance_criteria**:
  - [ ] AC-001: Given 含 `<script>alert(1)</script>` 的 HTML 输入，When 经过 sanitize 阶段，Then 输出 HTML 中 `<script>` 标签完全移除 [ARCH#§2.M-002]
  - [ ] AC-002: Given 含 `style="color:red; javascript:void(0)"` 的元素，When 经过 `css-attr-filter`，Then `javascript:` 声明被移除，`color:red` 保留
  - [ ] AC-003: Given `extendSanitizeSchema(['wf-card'], { 'wf-card': ['variant', 'accent'] })` 调用，When 后续输入含 `<wf-card variant="feature">` 的 hast，Then 该标签通过 sanitize 不被移除
  - [ ] AC-004: Given 含 `expression(alert(1))` 的 CSS 值，When 经过 css-attr-filter，Then 该 CSS 声明被过滤，不出现在输出 style 属性中
  - [ ] AC-005: Given `renderMarkdown(md, options)` 主路径调用，When 渲染完成，Then 返回的 `RenderResult.postPaste === false`（`renderMarkdownResponseSchema` 含 `postPaste: z.boolean()`，`renderMarkdown` 返回值赋 `false`），符合 arch postPaste 三路径对账契约（renderMarkdown / Preview / render_markdown 恒 false，composeCopy 路径才置 true）[ARCH#§2.M-002]
- **deliverables**:
  - [ ] `packages/core/src/pipeline/sanitize.ts` — rehype-sanitize 集成，位置：transform 之后、规则集之前
  - [ ] `packages/core/src/sanitize/schema.ts` — `wechatFlowSanitizeSchema`（基于 `defaultSchema` deepmerge）+ `extendSanitizeSchema(tagSet, attrMap)` [ARCH#§2.M-002]
  - [ ] 更新 `packages/core/src/pipeline/css-attr-filter.ts` — 拒绝 `expression(` / `javascript:` / `behavior:` / `@import` [ARCH#§2.M-002]
  - [ ] 更新 `packages/contracts/src/mcp/tool-contracts.ts` — `renderMarkdownResponseSchema` 增加 `postPaste: z.boolean()` [ARCH#§2.M-002]
  - [ ] 更新 `packages/core/src/render.ts` — `renderMarkdown` 返回值赋 `postPaste: false`
  - [ ] `tests/core/sanitize.test.ts` — AC-001..AC-005 单元测试
- **relates_to**: [F-002, M-002]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002

---

### T-017: M-004 粘贴过滤模拟器（simulatePaste(html) + per-node diff）

- **目标**: 实现 `simulatePaste(html: string) → { filteredHtml, nodeDiffs, droppedAttrs }`，复现微信编辑器对粘贴 HTML 的过滤行为，输出逐节点变更对照
- **模块**: M-004 (粘贴过滤模拟器)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-013]
- **acceptance_criteria**:
  - [ ] AC-001: Given 含 `<div id="x" style="position:fixed">text</div>` 的 HTML 字符串，When 调用 `simulatePaste`，Then 返回的 `filteredHtml` 中该元素无 `id` 属性，`style` 中 `position:fixed` 被移除；`nodeDiffs` 含对应节点的 before/after 记录 [ARCH#§2.M-004]
  - [ ] AC-002: Given `simulatePaste` 调用，When 输入含 5 个元素的 HTML，Then `nodeDiffs` 数组长度 ≤ 5，每个条目含 `nodeSelector`、`before` (outerHTML string)、`after` (outerHTML string) 字段
  - [ ] AC-003: Given 含 `<style>` 标签的 HTML（应被完全剥除），When `simulatePaste`，Then 返回的 `droppedAttrs` 或 `nodeDiffs` 中有对应剥除记录，且最终 `filteredHtml` 无 `<style>` 标签
- **deliverables**:
  - [ ] `packages/core/src/simulator/strip-tags.ts` — 标签级剥除
  - [ ] `packages/core/src/simulator/strip-attrs.ts` — 属性级剥除
  - [ ] `packages/core/src/simulator/rewrite-structure.ts` — 结构改写（ul/ol → table）
  - [ ] `packages/core/src/diff/per-node-diff.ts` — `diffNodes` 计算
  - [ ] `packages/core/src/simulate-paste.ts` — `simulatePaste(html: string)` 顶层 API [ARCH#§2.M-004]
  - [ ] `tests/core/simulate-paste.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-002, F-011, M-004]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-004
  - prd-wechat-flow-f001-f014#§2.F-002

---

### T-018: M-001 DiagnosticsPanel（UC-013）+ CompatibilityDiffView（UC-013.1）

- **目标**: 实现 DiagnosticsPanel 组件（UC-013）和兼容性 Diff 视图（UC-013.1），接收 `DiagnosticReport` 数据，展示分级诊断列表和 before/after 节点对照
- **moduli**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-017, T-099]
- **acceptance_criteria**:
  - [ ] AC-001: Given `diagnostics` 含 2 条 error 级别和 1 条 warn 级别诊断，When DiagnosticsPanel 展开，Then 每条 error 项左侧色块为 `--color-diag-error`（赤陶红），warn 项为 `--color-diag-warn`（暖黄棕），符合 `ui-spec-wechat-flow-uc001-uc014#§2.UC-013`
  - [ ] AC-002: Given `isExpanded: false`，When DiagnosticsPanel 渲染，Then 高度为 `32px`，仅显示标题行；`isExpanded: true` 时高度 auto（最大 200px 可滚动）
  - [ ] AC-003: Given 诊断列表项右侧「查看变更」链接，When 点击，Then CompatibilityDiffView Modal 打开，左栏 before HTML 和右栏 after HTML 均非空，命中规则 ID 可见
  - [ ] AC-004: Given `diagnostics` 含 error，When DiagnosticsPanel 处于折叠态（A-010 假设），Then 面板自动展开（`isExpanded` 状态切换为 `true`）
  - [ ] AC-005: Given `DiagnosticReport.nodeChangeRecords` 数组非空，When CompatibilityDiffView 渲染，Then UC-013 CompatibilityDiffView 展示 before/after 双栏对比（每条 nodeChangeRecord 各占一行）；`nodeChangeRecords` 为空时该视图区域隐藏 [ARCH#§2.M-003]
  - [ ] AC-006: Given `DiagnosticReport.nightRiskIssues` 数组非空，When DiagnosticsPanel 渲染，Then 面板进入 `night-risk-alert` CSS 态（边框色 `--color-diag-error`，面板标题前置风险标记图标）；`nightRiskIssues` 为空时恢复常规态 [ARCH#§2.M-003]
- **deliverables**:
  - [ ] `apps/editor/src/components/diagnostics/DiagnosticsPanel.vue` — UC-013 实现
  - [ ] `apps/editor/src/components/diagnostics/CompatibilityDiffView.vue` — UC-013.1 实现（含 nodeChangeRecords 双栏对比）
  - [ ] `apps/editor/src/components/diagnostics/DiagnosticsItem.vue` — 单条诊断列表项
- **relates_to**: [F-002, F-011, M-001, UC-013]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-013
  - prd-wechat-flow-f001-f014#§2.F-002

---

### T-019: 底部状态栏兼容性摘要接线（M-001 → M-003 诊断流）

- **目标**: 实现 EditorShell 底部状态栏，将 M-003 规则集诊断结果接线到状态栏兼容性摘要（绿/黄/红三色指示）+ DiagnosticsPanel 联动
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: skip
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-018]
- **acceptance_criteria**:
  - [ ] AC-001: Given 编辑器内容无任何兼容性问题，When 渲染管线完成，Then 底部状态栏兼容性摘要文字颜色为 `--color-text-muted`（全绿时弱化显示），符合 `ui-spec-wechat-flow#§6 A-006`
  - [ ] AC-002: Given 诊断结果含 1 条 error，When 状态栏更新，Then 兼容性摘要文字变为 `--color-error`，显示"严重 1 项"
  - [ ] AC-003: Given 点击底部状态栏兼容性摘要区域，When 点击，Then DiagnosticsPanel 展开（`isExpanded` 切换为 `true`）
  - [ ] AC-004（production path）: `EditorShell.vue` 的 `<template>` 底部含字面 `<StatusBar :diagnostics="diagnostics" @toggle-diagnostics="onToggleDiagnostics" />`，且 `DiagnosticsPanel` 通过同一 `diagnostics` prop 共享数据
- **deliverables**:
  - [ ] `apps/editor/src/components/layout/StatusBar.vue` — 底部状态栏（字数 + 阅读时长 + 兼容性摘要）
  - [ ] 更新 `apps/editor/src/components/layout/EditorShell.vue` — 接线 StatusBar + DiagnosticsPanel
- **relates_to**: [F-002, F-011, M-001]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-p001-p005#§3.P-001

---

### T-094: 源码 ↔ 预览双向高亮联动（F-001 AC-004）

- **目标**: 实现 SourcePane ↔ PreviewPane 的双向高亮联动 —— 点击预览中某段落定位源码光标；源码光标移动时高亮预览对应块
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 2
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-009, T-010]
- **acceptance_criteria**:
  - [ ] AC-001: Given 用户在预览 iframe 中点击某个 `<p data-node-id="...">`，When 触发，Then SourcePane CodeMirror 光标定位到该节点对应的源码行 [F-001 AC-004 + ui-spec-wechat-flow-uc001-uc014#§2.UC-004]
  - [ ] AC-002: Given 源码光标移动到某行，When CodeMirror selectionChange 事件触发，Then PreviewPane 内对应 `data-node-id` 节点高亮 `.cm-highlighted` 类 200ms 后淡出
  - [ ] AC-003: Given 节点映射建立，When mdast → hast 阶段，Then 每个块级节点产出 `data-node-id="{sourceLine}:{nodeIndex}"` 属性
  - [ ] AC-004: 高亮联动通过主线程 `iframe.contentDocument` 通信，不向 iframe 内注入脚本
- **deliverables**:
  - [ ] `packages/core/src/pipeline/node-id-injector.ts` — hast 节点注入 `data-node-id` 属性
  - [ ] `apps/editor/src/composables/use-bidirectional-highlight.ts` — 双向联动 composable
  - [ ] `apps/editor/src/components/source/source-cursor-tracker.ts` — 光标位置 → preview node-id 映射
  - [ ] `tests/editor/bidirectional-highlight.test.ts` — AC-001..AC-004
- **relates_to**: [F-001, M-001, M-002]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-001
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-004

---

### T-052: StatusBar 状态机与平板降级（UC-023）

- **目标**: 实现 StatusBar 三态状态机（idle / warn / error）+ 平板断点下的图标降级模式，关联 UI-SPEC UC-023
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 2
- **tdd_mode**: light
- **tdd_refactor**: skip
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-019]
- **acceptance_criteria**:
  - [ ] AC-001: Given `diagnostics` 为空，When StatusBar 渲染，Then 状态机处于 `idle` 态，兼容性摘要以 `--color-text-muted` 弱化色显示；`diagnostics` 含 warn 时切换为 `warn` 态，`diagnostics` 含 error 时切换为 `error` 态（三态可观测：每态 CSS class 变化可在 DOM 中断言）[UI-SPEC#§2.UC-023]
  - [ ] AC-002: Given 视口宽度 < 768px（平板断点），When StatusBar 渲染，Then 兼容性摘要区改为图标（`i`）+ hover/focus 显示 tooltip，不截断文字；视口 ≥ 768px 时恢复文字摘要模式
  - [ ] AC-003: Given 移动端违规词（如 `position:fixed`）出现在诊断报告，When StatusBar 渲染，Then `i` 图标旁可见警告色标记，tooltip 文字描述违规内容
- **deliverables**:
  - [ ] 更新 `apps/editor/src/components/layout/StatusBar.vue` — 三态状态机实现 + 平板断点图标降级
  - [ ] `apps/editor/src/components/layout/__tests__/StatusBar.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-002, M-001, UC-023]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-023
  - arch-wechat-flow-modules#§2.M-001

---

### T-109: [VALIDATION] Sprint 2 验证：规则集过滤 + 诊断面板

- **目标**: 用户手动验证规则集引擎可过滤不兼容 CSS，DiagnosticsPanel 展示分级诊断
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **sprint**: 2
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-014, T-015, T-017, T-018, T-019, T-052, T-094]
- **acceptance_criteria**:
  - [ ] 在编辑器中输入含 `position:fixed` 样式的 Markdown（如 `:::card{style="position:fixed"}\ncontent\n:::`），右栏 PreviewPane HTML 中对应元素无 `position:fixed`（被规则剥除）
  - [ ] 底部状态栏兼容性摘要显示红色"严重 N 项"（N ≥ 1），点击后 DiagnosticsPanel 在编辑器底部展开
  - [ ] DiagnosticsPanel 展开后，含 error 级诊断条目，条目左侧色块为赤陶红色
  - [ ] 点击诊断条目右侧"查看变更"链接，CompatibilityDiffView Modal 弹出，左侧 before 列含 `position:fixed`，右侧 after 列该属性已不存在
  - [ ] 运行 `pnpm turbo ruleset-fixture`（或等效 CI 命令），输出全绿（所有 fixture 通过）
  - [ ] 点击预览段落，源码光标跳转到对应行（T-094 双向高亮联动）
- **relates_to**: [F-007, F-011, M-003, M-004]
