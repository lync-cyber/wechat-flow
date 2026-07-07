---
id: "code-review-T-137-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-137"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-137-r1

审查对象：T-137（UC-015 InsertDrawer 分类 Tab 数据驱动 + 搜索框 + UC-021 同步），commit `f1a9bd9`。

Layer 1: 未配置 lint hook 匹配 `Edit|Write` 的 `lint_format.py`（settings.json 中 `PostToolUse.Edit|Write` 命中的是 `lint_format` 脚本，判定为已委托）。为保险起见仍执行 `cataforge skill run code-review -- review apps/editor/src/components/panel/` 独立核验：`prettier` 检查对整目录（含多个与本任务无关的既有文件）报 FAIL，但项目实际格式化工具是 biome（CLAUDE.md 执行环境声明），对本任务四个目标文件单独跑 `pnpm biome check` 结果为 `Checked 4 files in 18ms. No fixes applied.`（全绿）。`arch_guard` / `complexity_gate` / `wiring_empty_handler` / `ui_fidelity` 均无 finding。Layer 1 generic prettier FAIL 判定为工具口径与项目真实格式化工具不符的噪声，不计入本报告问题，进入 Layer 2。

## 问题列表

### [R-001] HIGH: UC-021 同步范围裁定与 ui-spec 权威条文相悖，DirectiveAutocompletePopover 未落地 6 分类 Tab
- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-137 卡 notes 将 UC-021 同步范围界定为条件分支："若查证 UC-021 触发路径本身不承载 6 分类导航（`:::` 触发已是搜索输入语境）则本卡 AC 聚焦 UC-015，UC-021 侧仅需确认无冲突不新增交互面"。RED 阶段选择了该分支，仅在 `DirectiveAutocompletePopover.test.ts` 新增一份纯回归守护（断言既有 `block`/`inline` 触发类型 Tab 不受影响），未新增任何 6 分类相关断言或实现。

  但复核 `ui-spec-wechat-flow#§2.UC-021` 原文与 `ui-spec-wechat-flow-block-taxonomy#§8` 均明确记载 UC-021 应具备独立的 6 分类标签行：
  - UC-021 原文：「分类标签行（高 `32px`，水平滚动）：6 个分类标签，数据驱动自 `BlockDefinition.category`，与 UC-015 InsertDrawer 共用同一 `category` → 中文标签映射与顺序（...）；点击标签过滤下方组件列表，与顶部搜索框叠加生效」。
  - taxonomy §8 开篇即声明该表「驱动 UC-015 InsertDrawer **与** UC-021 DirectiveAutocompletePopover 的分类 Tab 数据化」；§8.1 明确「UC-015 / UC-021 均不保留「全部」Tab——6 个分类 Tab 已完整覆盖全部 40 个 Block」——该表述的前提是 UC-021 侧确实存在 6 个分类 Tab（否则不会有"是否保留全部 Tab"的讨论）。

  当前 `DirectiveAutocompletePopover.vue` 的 `tabs` computed 仍只产出 `block`/`inline` 两个 tab（依据候选类型，非 `category`），与 UC-015 的 6 分类 Tab 是不同维度（触发类型 vs 内容分类），二者并非互斥关系——ui-spec 描述的是"触发类型隐含在 `:::` vs `:` 输入语法中，分类标签行是 6 分类内容过滤器，二者叠加"，而非"分类标签行等价于触发类型 Tab"。RED 阶段的"`:::` 触发已是搜索输入语境"推理不能否定 spec 对独立分类标签行的明确要求——搜索框与分类标签在 spec 中本就是"叠加生效"关系（UC-021 原文："点击标签过滤下方组件列表，与顶部搜索框叠加生效"），并非二选一。

  此外该"同步"缺口并非全新引入：Sprint 6 BC-11（`SPRINT-REVIEW-s6-r3.md`）已将"UC-021 分类 tab"列为 developer 待办并经 PR #95 关闭，但 PR #95 实际交付的正是当前这套 `block`/`inline` 两态 tab（数据驱动依 registry 有無，非依 `category`），并非 6 分类 Tab。T-137 是本 Sprint 唯一显式以"UC-021 同步"命名并排期的任务，其 RED 裁定复用了与 BC-11 相同的口径混淆（把"触发类型 tab 数据驱动"等同于"6 分类 tab"），使 UC-021 侧的 spec 差距被再次搁置而未被识别为真实缺口。
- **建议**: 重新裁定 UC-021 范围：either（a）本卡追加 6 分类标签行实现（与 UC-015 共享 `CATEGORY_LABELS`/`CATEGORY_ORDER`，作为叠加于现有 block/inline 触发类型 Tab 之上或之下的独立过滤维度），或（b）经与用户/product-manager 确认后将 ui-spec UC-021 该段文字判定为过时/待 amendment（例如若产品决策认为 UC-021 场景不需要独立分类导航），显式提交 ui-spec amendment 修订该段描述，避免 spec 与实现的矛盾持续累积。当前状态是"实现未做，spec 未改"的悬空态，不应通过 code-review 附注一次性合规化——按 T-137 卡 notes 原文要求，此裁定需与 ui-spec 条文核对后才能定论，而核对结果显示裁定与条文不符。

### [R-002] MEDIUM: `CATEGORY_LABELS.ts` 文件名违反项目 kebab-case 命名约定
- **category**: convention
- **root_cause**: self-caused
- **描述**: CLAUDE.md §全局约定明确「文件名（kebab-case，`my-module.ts`）」。新增文件 `apps/editor/src/components/panel/CATEGORY_LABELS.ts` 使用 SCREAMING_SNAKE_CASE 命名文件本体，与同目录/邻近目录既有 `.ts` 文件（如 `apps/editor/src/components/common/block-glyphs.ts`）的 kebab-case 命名不一致。任务卡 deliverables 亦写作 `CATEGORY_LABELS.ts`，说明此命名在任务设计阶段就未对齐约定，非实现阶段孤立偏差。
- **建议**: 重命名为 `category-labels.ts`（内部导出常量名 `CATEGORY_LABELS`/`CATEGORY_ORDER` 保持 SCREAMING_SNAKE 不变，文件名与导出标识符命名规则本可不同）。

### [R-003] LOW: `getParamFields`（InsertDrawer）与 `paramFieldsOf`（DirectiveAutocompletePopover）逻辑重复
- **category**: duplication
- **root_cause**: upstream-caused
- **描述**: 两组件均实现几乎相同的 `attrsSchema.shape` 提取 + try/catch 兜底逻辑，用于从 Zod schema 派生参数字段列表。该重复在 T-137 之前已存在（`InsertDrawer.vue` 的 `getParamFields` 未在本次改动中新增或修改），非本任务引入的新增重复，但本任务是最近一次同时触碰两个组件的机会点，未顺带收敛。
- **建议**: 抽取共享 helper（如 `apps/editor/src/components/common/attrs-schema.ts` 内 `extractParamFields(schema): string[]`），供 InsertDrawer 与 DirectiveAutocompletePopover 共用；非阻塞，可延后到后续重构窗口处理。

## 复核结论：test-quality（RED 阶段两处机械修复）

1. `InsertDrawer.test.ts` 两处既有测试断言调整——「渲染注册中心所有 Block」→「渲染当前分类 Tab 下注册中心的 Block」（`listBlocks()` → `listBlocks().filter(b => b.category === "text")`）、以及 callout 图标断言前插入 `category-tab-emphasis` 点击触发——均属对新增分类 Tab 前置状态的机械适配：旧断言假设扁平无分类列表，新实现下列表默认按 `text` Tab 过滤，测试必须先切到正确 Tab 或按 Tab 过滤预期，否则会因组件树变化产生假失败而非真回归。两处修改后断言仍绑定真实可观测状态（渲染的 `block-lib-item` 数量、图标文案），断言强度未被稀释，判定为合规的机械修复。
2. `DirectiveAutocompletePopover.test.ts` 为全新文件，非既有 testid 前缀改名——核查后 `InsertDrawer` 用 `category-tab-{category}`、`DirectiveAutocompletePopover` 用 `autocomplete-tab-{id}`，两者 testid 前缀本身即不同命名空间，不存在真实碰撞风险；该文件仅对 UC-021 既有 `block`/`inline` 两态行为做回归守护，断言均绑定真实渲染状态（tab 激活态 class + 候选项数量），无弱断言。但该文件的存在被用作"UC-021 侧已确认无冲突"的证据支撑了 R-001 的范围裁定，而其覆盖范围（触发类型 tab）与 spec 缺口（分类标签行）是不同维度，不能作为 UC-021 侧无缺口的证明。

## Verdict

**needs_revision**

问题计数：CRITICAL 0 / HIGH 1 / MEDIUM 1 / LOW 1。存在 HIGH（R-001）触发 needs_revision。

R-001 需要 orchestrator/用户裁决后重新进入 TDD（若裁定为(a)需实现 UC-021 6 分类标签行；若裁定为(b)需先出 ui-spec amendment 再收口 T-137），R-002 建议随重做一并处理（文件重命名成本低），R-003 可延后。
