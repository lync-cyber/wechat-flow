---
id: "sprint-review-s2-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow"]
---
# Sprint 2 审查报告

**Sprint**: Sprint 2 — 规则集引擎 + 粘贴过滤 + 兼容性报告
**审查日期**: 2026-06-10
**门禁终态**: vitest 292/292, typecheck 31/31, biome 0, tests-tsc 0
**审查档位**: merged-review（per-task Layer 2 由本报告承担；已有独立 CODE-REVIEW 的任务：T-016 r1/r2, T-094 r1/r2）
**Layer 1**: orchestrator 已验证（53 交付物存在，32 AC 有引用，门禁全绿，此处直接进入 Layer 2）

---

## 1. per-task L2 批量审查表

取证策略：每任务抽查 1–2 个核心实现文件 + 对应测试；T-016/T-094 已有独立 CODE-REVIEW，本表仅概括，不重复 Layer 2 全维度展开。

| 任务 | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | 小结 |
|------|-----------|---------------|-------------|-------------|-----------|-----------|---------|---------|------|
| **T-013** | OK：applyRuleset 返回 `{hast, report}` 与 arch M-003 契约一致；五类 scope 执行器职责清晰 | OK：空规则集早返回，null 节点安全处理 | OK：AC-001/002/003 均有真实断言绑定返回值；getRulesetVersion 断言值绑定 `"0.0.0"` 而非动态，见 SR-001 | OK：css-helpers 被所有 strip 规则复用，无重复 | OK | 低：scope 执行器 stripNode/clampNode 递归深度受 hast 树约束，无循环依赖 | OK：仅依赖 contracts + hast | OK：无安全相关操作 | MEDIUM: SR-001 (coreVersion/themeVersion 硬编码 "0.0.0") |
| **T-014** | OK：10 个 strip 规则均通过 css-helpers 统一 removeCssDeclarations | OK | MEDIUM：strip 单规则选择器（`rules.find`）导致同一节点多 CSS 属性不同规则静默跳过，无边界测试，见 SR-002 | OK：css-helpers 充分复用 | OK | 低 | OK | OK | MEDIUM: SR-002 (strip scope 单规则-per-node 限制未测试) |
| **T-015** | OK：15 个 clamp/transform/patch/lint 规则结构一致 | OK：clamp 在无匹配 prop 时 removeCssDeclarations 返回原节点（same reference），无分配浪费 | OK：AC-001/002/003/004/005 均有具名测试及真实返回值断言 | OK：clamp 规则全复用 css-helpers parseDeclarations/serializeDeclarations | OK | 低 | OK | lint-grid-layout、lint-filter-backdrop、lint-position-fixed 均通过 diagnose 函数输出 diagnostic，不在 transform 内副作用 | OK |
| **T-017** | OK：simulatePaste 顶层 API 经 simulator 子模块组合 | OK：droppedAttrs 字段结构完整 | OK：AC-001/002/003 有真实验证；before/after 对字段绑定真实 outerHTML 差异 | OK | OK | 低 | 依赖 ruleset builtinRules，与 T-013 共享边界合理 | OK：输入为 HTML string，内部通过 rehype parse，不执行脚本 |
| **T-018** | MEDIUM：CompatibilityDiffView 已实现但 EditorShell 未挂载，show-diff 事件链断裂，见 SR-003 HIGH | OK | test-quality LOW：AC-003 测试仅验证 show-diff 事件被 emit，未验证 EditorShell 端 CompatibilityDiffView 开启（因从未挂载），见 SR-004 | OK | OK | 低 | OK | OK | **HIGH: SR-003** (wiring gap); LOW: SR-004 (test验证不到生产路径) |
| **T-019** | OK：StatusBar + DiagnosticsPanel 均字面挂载于 EditorShell，shared diagnostics prop，符合 AC-004 | OK | OK：EditorShellStatusBarWiring.test.ts 用 readFileSync 验证字面模板接线，是真实管线测试 | OK | OK | 低 | OK | OK | OK |
| **T-052** | OK：三态状态机（idle/warn/error）通过 computed statusState + CSS class 表达 | OK：onResize/onMounted/onUnmounted 正确配对，避免 listener 泄漏 | OK：三态 class、平板断点切换、tooltip 内容三类测试均绑定可观测属性 | OK（与 StatusBar 合并实现，无重复） | OK | 低 | OK | OK：window.innerWidth 在 SSR 环境下无守卫，但本项目为纯 Web App，已知不影响当前目标 | OK |

---

## 2. AC 覆盖有效性抽查（ac-coverage）

### T-013 apply.test.ts — 取证结论

- AC-001：测试断言 `JSON.stringify(result.hast)` 与原始 hast 相等，验证 hast 不被修改；`report.diagnostics/nodeChangeRecords/nightRiskIssues` 均断言为 `[]`。断言强度：有效，绑定真实返回值结构。
- AC-002：测试断言 transformed hast 中 `p.properties` 不含 `style` 属性，且 `nodeChangeRecords[0].triggerRuleId === "strip-style"`。断言强度：有效，跨字段双重验证。
- AC-003：`getRulesetVersion()` 断言值绑定字面量 `"0.0.0"`。断言强度：低——绑定当前版本字面量而非"是字符串且非空"等契约级断言；当版本变更时测试需同步维护。标为 SR-001 LOW。

### T-019/T-052 StatusBar.test.ts + EditorShellStatusBarWiring.test.ts — 取证结论

- T-019 AC-004（production path）：`EditorShellStatusBarWiring.test.ts` 通过 `readFileSync` 读取 EditorShell.vue 源文件，正则断言模板含 `<StatusBar :diagnostics=` 和 `@toggle-diagnostics=`。这是真实管线测试，未使用 `vi.mock` 替换被测包顶层，满足 sprint-review §Step 2 ac-coverage 要求。
- T-052 AC-001/002/003：`StatusBar.test.ts` 所有断言绑定 `data-testid` 可观测 DOM 属性（class、data-color、data-state、title），非常量真值，断言有效。

### editor-report-wiring.test.ts — 管线集成取证

`tests/editor/stores/__tests__/editor-report-wiring.test.ts` 直接调用 `store.updatePreview("- 第一项\n- 第二项")`（不 mock composeRender），断言 `store.lastReport.nodeChangeRecords` 含 `triggerRuleId === "transform-list-to-table"`。这是 Sprint 2 中唯一不依赖 vi.mock 全替换被测模块的端到端管线集成测试，满足要求。

---

## 3. Wiring 完成度核实（wiring-completeness）

### T-018 CompatibilityDiffView 挂载缺失（HIGH）

取证路径：
1. `DiagnosticsItem.vue` 定义 `showDiff` emit，点击"查看变更"按钮触发（Vue 3 自动 kebab 转换为 `show-diff`）。
2. `DiagnosticsPanel.vue` 监听 `@show-diff="handleShowDiff"` 并通过 `emit("show-diff", nodeSelector)` 向上冒泡。
3. `EditorShell.vue` 挂载 `<DiagnosticsPanel @toggle="onToggleDiagnostics" />`——**未处理 `@show-diff` 事件**，未挂载 `<CompatibilityDiffView>`。

结论：`CompatibilityDiffView.vue` 仅在测试中被独立挂载，生产路径中从未被任何父组件消费。T-018 AC-003（"点击「查看变更」→ CompatibilityDiffView Modal 打开"）在生产路径无法实现。

### T-019 StatusBar/DiagnosticsPanel 接线（已完成）

`EditorShell.vue` 第 54 行：`const diagnostics = computed<DiagnosticReport>(() => editorStore.lastReport)`；第 201–208 行字面挂载 `<DiagnosticsPanel :diagnostics="diagnostics" :is-expanded="isDiagnosticsExpanded" @toggle="onToggleDiagnostics" />` 和 `<StatusBar :diagnostics="diagnostics" ... @toggle-diagnostics="onToggleDiagnostics" />`。T-019 AC-001/002/003/004 全部满足。

### T-094 双向高亮（已完成）

T-094 r2 CODE-REVIEW 判定 `approved`，四个 AC 均已验证接线完成，此处不重复。

---

## 4. 范围偏移核查（scope-drift）

### applyRuleset 签名

`packages/ruleset/src/apply.ts`：返回 `{ hast: Root, report: DiagnosticReport }`，与 arch M-003 完全一致，无偏移。

### sanitize 在管线中的位置

`packages/core/src/pipeline/sanitize.ts` 位于 transform 之后、规则集之前，符合 T-016 deliverable 和 arch M-002 管线顺序。

### contracts diagnostic 文件名

实际路径：`packages/contracts/src/diagnostic/diagnostic-report.ts`；arch M-012 所写：`diagnostic/structure.ts`。文件名不一致，属 LOW 偏移——`diagnostic-report.ts` 比 `structure.ts` 语义更明确，且 T-013 deliverable 中已写明 `diagnostic-report.ts`，偏移来源为 arch 文档未同步。记为 SR-005 LOW。

### RenderResult.report 扩展

`composeRender` 返回值包含 `report: DiagnosticReport`，已通过 `use-cases/render.ts` 正确扩展，未越界进入 MCP schema（MCP tool-contracts.ts 的 renderMarkdownResponseSchema 不含 report 字段，符合有意为之的设计边界）。

### coreVersion/themeVersion 硬编码

`apply.ts` 中 `coreVersion: "0.0.0"` / `themeVersion: "0.0.0"` 硬编码。arch M-003 versionTriple 要求运行时读取，当前骨架阶段此为已知简化；T-013 AC-003 测试已绑定 `"0.0.0"` 字面量，若后续实现动态读取则需同步更新测试。记为 SR-001 LOW（已知技术债，不阻塞当前功能）。

---

## 5. Gold-plating 甄别（gold-plating）

以下计划外文件已逐一甄别：

| 文件 | 判定 | 理由 |
|------|------|------|
| `packages/ruleset/src/rules/builtin/css-helpers.ts` | **合理的重构产物** | T-014/T-015 共 25 条规则均需 parseDeclarations/serializeDeclarations，提取为共享 helper 属于合理去重，非计划外功能扩展 |
| `packages/ruleset/src/rules/builtin/index.ts` | **合理的 continuation 产物** | T-019 editor-report-wiring 需要 builtinRules 数组，index.ts 是将 25 条规则聚合并按 SCOPE_ORDER 排序的必要聚合点；功能未超出 Sprint 目标 |
| `apps/editor/src/stores/__tests__/editor-report-wiring.test.ts` | **合理的 continuation 补接线测试** | orchestrator 在 Sprint 2 G0 发现 T-094 零件绿但端到端未接线，续写测试验证管线真实流通；该文件是系统视角拦截盲区的直接产物，明确记录在 CLAUDE.md 状态区 |

无 gold-plating 问题。

---

## 6. 偏移率（drift-rate）

**规划 AC 总数**（排除 design/validation 任务 T-099/T-109）：

| 任务 | 规划 AC 数 |
|------|-----------|
| T-013 | 3 |
| T-014 | 5 |
| T-015 | 5 |
| T-016 | 5 |
| T-017 | 3 |
| T-018 | 6 |
| T-019 | 4 |
| T-052 | 3 |
| T-094 | 4 |
| **合计** | **38** |

**延期 AC**：T-018 AC-003（CompatibilityDiffView 在生产路径未挂载，点击"查看变更"不触发 Modal 开启）= **1 个**。

**计划外 AC**：0 个（builtin/index.ts / css-helpers 等为内部重构产物，未增加对外 AC）。

**偏移率** = (1 + 0) / 38 = **2.6%**，低于 20% 阈值，不标 HIGH。

---

## 7. 质量聚合（quality-summary）

### 既有 CODE-REVIEW 问题模式（T-016 r1/r2 + T-094 r1/r2）

- **T-016 r1/r2**：主要问题集中在 CSS 转义绕过防御（security HIGH，已闭环）。遗留 MEDIUM：`postPaste: true` 穿透测试缺失（T-030 前补）、applySanitizeExtension 元组类型强转（LOW）。模式：security_sensitive 任务测试覆盖不足，需专门补充攻击向量测试。
- **T-094 r1/r2**：r1 有 srcdoc 刷新后 click listener 重绑 bug（HIGH，已闭环）。最终 approved。

### 本轮批量审查新发现问题模式

- **strip scope 单规则-per-node**（T-014，MEDIUM）：`executeStrip` 中 `rules.find` 每次只选取首匹配规则，同节点多 CSS 属性跨规则场景下后续规则静默跳过，无测试覆盖边界。潜在用户可见影响：含 `position:fixed;gap:8px` 的元素只剥除 position，gap 保留。
- **wiring 断链**（T-018，HIGH）：CompatibilityDiffView 组件完整但未消费——典型"零件测试绿但端到端不工作"模式，与 Sprint 2 G0 T-094 接线盲区同型。

---

## 问题清单

### [SR-001] LOW: T-013 getRulesetVersion 测试绑定版本字面量而非契约级断言
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `apply.test.ts` AC-003 断言 `version === "0.0.0"`，绑定当前版本字面量；同时 `apply.ts` versionTriple 中 `coreVersion: "0.0.0"` / `themeVersion: "0.0.0"` 硬编码，未从 core / theme 包动态读取，偏离 arch M-003 运行时 versionTriple 语义。
- **建议**: AC-003 测试改为断言 `typeof version === "string" && version.length > 0`；后续 Sprint 中 arch M-003 动态 versionTriple 路径落实时，同步更新 apply.ts 读取逻辑。

---

### [SR-002] MEDIUM: T-014 strip scope 单规则-per-node 限制未覆盖多属性节点场景
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `executeStrip`（strip.ts line 11）使用 `rules.find` 每次仅选取首匹配规则并对该节点停止继续尝试其他规则。对含 `style="position:fixed;gap:8px"` 的节点，`strip-position`（priority 90）命中后 `strip-flex-gap`（priority 80）在同一遍历中不再被调用，`gap` 属性被静默保留。当前 strip 规则中共有 10 条 CSS 属性类规则均依赖 `hasStyleProp` matcher，多属性元素受影响。无测试覆盖此边界。
- **建议**: 在 `strip-rules.test.ts` 或 `scope-rules.test.ts` 中增加多属性剥除测试（`style="position:fixed;gap:8px"`，期望两属性均被剥除）；待测试红通后，修复 `executeStrip` 为循环应用所有匹配规则（或改用 `filter` + reduce 管线），而非 `find` 取首匹配停止。

---

### [SR-003] HIGH: T-018 CompatibilityDiffView 未在 EditorShell 挂载——show-diff 事件链断裂
- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: `DiagnosticsPanel` 向上 emit `show-diff` 事件（携带 `nodeSelector`），但 `EditorShell.vue` 的 `<DiagnosticsPanel>` 挂载处未监听 `@show-diff`，且 `CompatibilityDiffView.vue` 从未在任何生产路径组件中被挂载。T-018 AC-003（"点击「查看变更」→ CompatibilityDiffView Modal 打开"）在生产路径中无法实现。仅测试中独立挂载了 CompatibilityDiffView，属测试假绿。
- **建议**: 在 `EditorShell.vue` 中：（1）为 `<DiagnosticsPanel>` 添加 `@show-diff="onShowDiff"` 监听；（2）新增 `isDiffOpen` ref 和 `diffNodeSelector` ref；（3）挂载 `<CompatibilityDiffView :is-open="isDiffOpen" :node-selector="diffNodeSelector" :node-change-records="filteredRecords" @close="isDiffOpen = false" />`；（4）补充 EditorShell 集成测试验证点击"查看变更"后 CompatibilityDiffView 出现在 DOM。

---

### [SR-004] LOW: T-018 AC-003 测试仅验证事件 emit，未覆盖消费端 Modal 开启
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `CompatibilityDiffView.test.ts` 中"AC-003 集成"测试（line 221–244）仅断言 DiagnosticsPanel 发出 `show-diff` 事件，未构造包含 CompatibilityDiffView 的父组件场景验证 Modal 实际打开。该测试在 SR-003 wiring gap 修复前会保持绿色，无法作为接线完整的有效证据。
- **建议**: SR-003 修复后，将此测试升级为挂载含 CompatibilityDiffView 的父组件（或 EditorShell 集成测试），断言点击后 `[data-testid="compat-diff-modal"]` 出现在 DOM。

---

### [SR-005] LOW: contracts diagnostic 文件名与 arch M-012 所写不一致
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: arch M-012 引用路径为 `diagnostic/structure.ts`（arch-wechat-flow-modules.md line 87），实际交付路径为 `packages/contracts/src/diagnostic/diagnostic-report.ts`（T-013 deliverable 已明确写出 `diagnostic-report.ts`）。两者语义内容一致，但 arch 文档路径落后于实际。
- **建议**: 下次 arch amendment 时将 arch M-012 中的 `diagnostic/structure.ts` 更新为 `diagnostic/diagnostic-report.ts`，消除文档与代码的路径偏差。

---

## 判定

**verdict: needs_revision**

存在 HIGH 问题（SR-003）：T-018 CompatibilityDiffView 未在 EditorShell 挂载，show-diff 事件链断裂，T-018 AC-003 在生产路径无法实现。需 implementer 修复后重入 sprint-review。

| 编号 | severity | category | 任务 | 状态 |
|------|---------|---------|------|------|
| SR-001 | LOW | test-quality | T-013 | notes |
| SR-002 | MEDIUM | test-quality | T-014 | notes |
| SR-003 | HIGH | wiring-completeness | T-018 | **needs_revision** |
| SR-004 | LOW | test-quality | T-018 | notes（SR-003 修复后同步处理） |
| SR-005 | LOW | consistency | contracts/arch | notes（下次 arch amendment 对齐） |

**需要重入 TDD 的任务**：T-018（SR-003 HIGH wiring gap）。T-013/T-014/T-015/T-017/T-019/T-052/T-094 保持 done 状态。
