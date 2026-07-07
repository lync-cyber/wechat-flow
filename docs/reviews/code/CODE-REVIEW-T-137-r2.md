---
id: "code-review-T-137-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-137"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-137-r2

审查对象：T-137 revision（r1 R-001/R-002 修复），working tree 未提交改动（基于 commit `f1a9bd9`）：
- `apps/editor/src/components/editor/DirectiveAutocompletePopover.vue`（R-001 修复：UC-021 分类标签行新实现）
- `apps/editor/src/components/editor/__tests__/DirectiveAutocompletePopover.test.ts`（新增 9 条分类标签用例，原 2 条守护用例保留）
- `apps/editor/src/components/panel/category-labels.ts`（R-002 修复：kebab-case 重命名自 `CATEGORY_LABELS.ts`）
- `apps/editor/src/components/panel/InsertDrawer.vue`（import 路径同步）

本轮为 `task_type=revision` 增量复审：r1 报告中无 CRITICAL/HIGH 的维度不重复审查；R-001（HIGH）/ R-002（MEDIUM）涉及维度 + diff 新增代码全维度复核。R-003（LOW，duplication）r1 判定非阻塞可延后，本次未要求修复，现状确认见下文，不计入 verdict。

Layer 1：复用 r1 判定（未配置匹配 `Edit|Write` 的 lint hook，独立核验 `pnpm biome check` 对 4 个目标文件 `Checked 4 files in 12ms. No fixes applied.`，全绿；`arch_guard` / `complexity_gate` / `wiring_empty_handler` / `ui_fidelity` 无 finding）。

## r1 问题逐条判定

### [R-001] HIGH → **resolved**
- r1 描述：`DirectiveAutocompletePopover.vue` 未落地 UC-021 spec 要求的 6 分类标签行，RED 阶段仅做回归守护未新增分类相关实现。
- 本轮复核：`cataforge context read "ui-spec-wechat-flow#§2.UC-021"` 与 `ui-spec-wechat-flow-block-taxonomy#§8` 逐项核对新实现：
  - **32px 高**：`.dap__category-row { height: 32px; }`（`DirectiveAutocompletePopover.vue:373-382`），测试 `分类标签行高 32px` 断言渲染后 computed/inline height，非字面存在。
  - **水平滚动**：`.dap__category-row { overflow-x: auto; }` 同上。
  - **数据驱动自 `BlockDefinition.category`**：`availableCategories` computed 由 `props.blocks.map(b => b.category)` 派生（`:64-69` 行 tabs computed 与此为不同维度，`:71-74` 行 `availableCategories` 才是分类标签行数据源），非硬编码分类清单。
  - **与 UC-015 共用同一映射常量**：`import { CATEGORY_LABELS, CATEGORY_ORDER } from "../panel/category-labels.ts"`（`:8` 行）——核查 `InsertDrawer.vue:6` 同样 `import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category-labels.ts"`，确认两组件共用单一模块，无第二份 labels 表。
  - **点击过滤 + 与搜索 AND 叠加**：`categoryFilteredBlocks` computed 先按 `activeCategory` 过滤，再喂给 `buildCandidates`（含 `currentInput` 搜索过滤），两次过滤链式叠加（`:80-88` 行），语义上是 AND 关系。
  - **顺序=`CATEGORY_ORDER`**（即 `BlockCategory` 枚举声明顺序）：`availableCategories` 用 `CATEGORY_ORDER.filter(...)` 保序过滤，非集合运算丢失顺序。
  - 测试新增 9 条用例覆盖以上全部要点（见下文 test-quality 复核），实测 `pnpm vitest run` 全绿（11 tests，含 2 条既有守护 + 9 条新增）。
- **两处实现取舍核验**（均与 spec 自洽，非缺陷）：
  1. **inline 触发（`:`）不渲染分类标签行**：`v-if="activeTab === 'block'"`（`:206` 行）。`MarkDefinition`（`packages/core/src/registry/mark.ts`）无 `category` 字段，UC-021 spec 原文分类标签行明确"数据驱动自 `BlockDefinition.category`"，mark 无该维度可分类，故 inline 场景不渲染分类行是被 spec 数据模型约束的必然取舍，非任意省略。
  2. **默认不过滤（`activeCategory = null`），点击单选、再点取消**：核对 UC-021 spec 状态表 `open-empty` 态定义："显示全量 Block 列表，搜索框聚焦，第一项默认高亮"——与 UC-015（默认选中首个 Tab `text`，单选排他）不同，UC-021 默认态是"全量列表"，实现的 `activeCategory: BlockCategory | null = null` 初始态直接对应 spec 的 `open-empty` 语义，非随意设计。UC-015 与 UC-021 default 态不同是两个组件各自 spec 状态模型使然（UC-015 是常驻面板式单选 Tab，UC-021 是弹出式全量列表+可选精筛），两者内部均自洽。
  - 结论：R-001 已完整修复，无遗留缺口。

### [R-002] MEDIUM → **resolved**
- r1 描述：`CATEGORY_LABELS.ts` 文件名违反 kebab-case 约定。
- 本轮复核：文件已重命名为 `category-labels.ts`（`git status` 显示 `D apps/editor/.../CATEGORY_LABELS.ts` + `?? apps/editor/.../category-labels.ts`，确认删旧增新非复制遗留）。全仓搜索 `CATEGORY_LABELS\.ts|panel/CATEGORY_LABELS` 零命中，`InsertDrawer.vue` 与 `DirectiveAutocompletePopover.vue` 均已切换到新路径相对 import（`./category-labels.ts` / `../panel/category-labels.ts`），无遗留旧路径引用、无死文件。内部导出标识符 `CATEGORY_LABELS` / `CATEGORY_ORDER` 保持 SCREAMING_SNAKE 不变，符合 r1 建议（文件名与导出标识符命名规则分离）。
- 结论：已完整修复。

### [R-003] LOW → **未要求修复，现状确认**
- r1 判定为非阻塞、duplication、可延后到后续重构窗口。本轮复核 `getParamFields`（`InsertDrawer.vue:67`）与 `paramFieldsOf`（`DirectiveAutocompletePopover.vue:111`）两处仍独立实现，逻辑重复现状未变，符合 r1"非阻塞可延后"的处置意见，不计入本轮 verdict。

## 新增测试 test-quality 复核（9 条新用例）

逐条核对断言绑定的是渲染/计算后可观测状态，非字面存在性：

1. "标签集合仅含 blocks 实际出现的 category（顺序=CATEGORY_ORDER）" — 断言渲染出的 `data-testid` 列表顺序与预期派生序列相等，强断言。
2. "分类标签文案取自与 UC-015 共用的 CATEGORY_LABELS 映射" — 断言渲染文本包含共享常量值（非硬编码字符串比对），能感知常量表被误改或映射错位。
3. "分类标签行高 32px" — 断言 `el.style.height || getComputedStyle(el).height`，渲染后计算值，符合 COMMON-RULES §保真类 AC 断言渲染效果而非源码字面。
4. "默认不过滤分类，列表显示全部 block 候选" — 断言初始渲染项数 = `BLOCKS.length`，强断言。
5. "点击某分类标签后列表仅显示该分类 block，标签呈激活态" — 断言 class 变化 + 渲染项数量 + 具体名称文本存在性/排除性（含"提示框"不应出现的反向断言），强断言，覆盖过滤边界。
6. "再次点击已激活分类标签取消过滤，恢复全量列表" — 断言 class 移除 + 数量恢复，验证 toggle 语义（非仅单向选中），强断言。
7. **"分类过滤与搜索框过滤叠加生效（AND 语义）"** — 见下方独立发现 [R2-001]，断言强度不足以证伪该失效模式。
8. "triggerType=inline 时不渲染分类标签行" — 断言容器不存在，验证 §UC-021 mark 无 category 维度的取舍落地，非弱断言（有明确失败路径：若代码误渲染该行，`exists()` 会翻转为 true）。
9. "从 block 切到 inline 再切回 block 时分类过滤态被重置为不过滤" — 断言 watch 副作用（`activeCategory.value = null`）经由渲染项数量间接验证，覆盖状态重置边界。

与既有 2 条守护用例（`triggerType=block/inline` 默认 Tab + 候选数）无冲突：新增用例复用相同 `BLOCKS`/`MARKS` fixture，未修改既有断言期望值；`testid` 命名空间 `autocomplete-category-tab-{category}` 与既有 `autocomplete-tab-{id}` 前缀不同，无碰撞。

## 新发现问题

### [R2-001] MEDIUM: "AND 语义"测试用例断言强度不足以区分"分类过滤生效"与"分类过滤被忽略"两种实现路径
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: 测试 `分类过滤与搜索框过滤叠加生效（AND 语义）`（`DirectiveAutocompletePopover.test.ts:166-179`）用 `currentInput: "引用"` + 点击 `text` 分类 tab，断言结果为 1 项且内容含"引用"。

  实测推导：`BLOCKS` fixture 中仅 `quote`（`category: "text"`, `name: "引用"`）的 `name` 含搜索词"引用"；`buildCandidates` 按 `id`/`name` 子串匹配，搜索本身已将候选收窄为 `[quote]`。此时无论是否点击 `text` 分类 tab、无论 `categoryFilteredBlocks` 是否真的按 `activeCategory` 过滤（例如若实现退化为直接把 `props.blocks` 传给 `buildCandidates`，完全忽略 `activeCategory`），结果都恒为 `[quote]`（1 项，含"引用"）。该测试的期望值与"分类过滤被静默忽略、仅搜索生效"的错误实现路径下的实际输出完全重合，无法把这一失效模式与正确实现区分开——即断言无法证伪"AND 叠加未生效，只是搜索单独生效"这一具体假设。

  非阻塞：该用例仍是有效断言（非"永远 true"式空断言），只是不能覆盖其命名所声称的"AND 交集"场景边界；分类过滤本身的正确性已被其他用例（#4/#5/#6）充分证实，此处缺口窄化为"叠加"特性本身未被独立证明。当前实现按人工读码核验 `categoryFilteredBlocks` 确实先于 `buildCandidates` 生效（`:80-88` 行链式 computed），判定为测试盲点而非实现缺陷。
- **建议**: 调整 fixture 使搜索词命中 ≥2 个跨分类的 block（例如新增一个 `category: "media"` 且 `name`/`id` 也含"引用"关键字的 fixture block，或改用一个能同时匹配 `emphasis` 分类 `callout` 与 `text` 分类 `quote` 的搜索词），断言"点击 text 分类后结果收窄到仅 `text` 分类项、原本搜索命中的其他分类项被排除"，使测试真正区分 AND 与"仅搜索生效"两条路径。非阻塞，可作为后续测试加固项处理，不影响本轮 verdict。

## 回归面确认

- `pnpm vitest run`（apps/editor 全量）：78 test files / 703 tests 全绿，含本次改动涉及的 `DirectiveAutocompletePopover.test.ts`（11 tests）与 `InsertDrawer.test.ts`（21 tests，含既有 AC-001/AC-002 用例与 T-137 新增 AC-001~AC-006 用例）单独重跑均通过。
- `InsertDrawer.vue` 既有行为（渲染 320px 抽屉、参数表单、`onInsert` 回调）未被 import 路径调整波及——21 条用例含既有回归用例全部通过，import 语句改动（`./CATEGORY_LABELS.ts` → `./category-labels.ts`）为纯路径同步，无逻辑变更。
- `npx vue-tsc --noEmit`（apps/editor）：无输出，类型检查通过。
- `pnpm biome check`（4 个目标文件）：`Checked 4 files in 12ms. No fixes applied.`，全绿。

## Verdict

**approved_with_notes**

问题计数：CRITICAL 0 / HIGH 0 / MEDIUM 1（R2-001 新发现，非阻塞）/ LOW 1（R-003，r1 遗留，非阻塞）。r1 的 R-001（HIGH）与 R-002（MEDIUM）均已完整修复（resolved），无 CRITICAL/HIGH 残留，按 COMMON-RULES §三态判定逻辑不触发 needs_revision。

R2-001 与 R-003 均为非阻塞改进项，可延后到后续测试加固/重构窗口处理，不阻塞 T-137 收口。
