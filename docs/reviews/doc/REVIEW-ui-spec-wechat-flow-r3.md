---
id: "review-ui-spec-wechat-flow-r3"
doc_type: review
author: reviewer
status: approved
deps: ["ui-spec-wechat-flow", "ui-spec-wechat-flow-uc001-uc014", "ui-spec-wechat-flow-p001-p005"]
---
# REVIEW: ui-spec-wechat-flow r3

**被审文档**: 主卷 `ui-spec-wechat-flow` v0.2.1 + 分卷 `ui-spec-wechat-flow-uc001-uc014` v0.2.1 + 分卷 `ui-spec-wechat-flow-p001-p005` v0.2.1  
**审查轮次**: r3（相对 r2：版本 0.1.2→0.2.1，跨文档修订轮次后的全量语义复审 + Layer 1 重跑）  
**Layer 1 结果**: 主卷 PASS（WARN×1 行数 547）；components 分卷 **FAIL×1**（UC-023 缺 variant）+ WARN×2；pages 分卷 PASS（WARN×3）  
**Layer 2**: 已执行（ui-spec 专项维度 + PRD/ARCH/DEV-PLAN 交叉一致性）

---

## Findings

### Critical

#### UI-001: components 分卷 Layer 1 门禁未通过（UC-023 缺少变体定义）

- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` §2.UC-023；`cataforge skill run doc-review` 输出 `FAIL: 23个组件中1个缺少变体定义`
- **问题**: UC-001..UC-022 均有 `**变体 (variant)**` 声明，UC-023 StatusBar 在 Props 之后直接结束，未声明 variant。自动化检查 FAIL，按 doc-review 协议不得视为全卷通过。
- **影响**: 阻塞「Layer 1 全绿」门禁；下游若仅扫描 components 分卷会误判文档未就绪。
- **修复建议**: 在 UC-023 末补充与其他组件一致的变体行，例如 `**变体 (variant)**: 单一形态组件，无 variant 区分`；重跑 Layer 1 确认 PASS。

---

### High

#### UI-002: UC-023 与 DEV-PLAN T-052 对 StatusBar「状态机」语义不一致

- **category**: consistency
- **root_cause**: upstream-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` §2.UC-023 状态表（`loading` / `populated` / `error`）+ A-006 按指标三态着色；`docs/dev-plan/dev-plan-wechat-flow-s2.md` T-052 目标与 AC-001（聚合 `idle` / `warn` / `error` 三态）
- **问题**: UI-SPEC 描述的是组件装载态 + 诊断聚合展示；DEV-PLAN 要求可 DOM 断言的 `idle|warn|error` 根状态机。两套状态名与切换条件未建立映射表。
- **影响**: T-052 实现与 UI 验收可能对不齐（测试断言 `data-state="warn"` 而设计稿只有 `populated` + 子项变色）。
- **修复建议**: 在 UC-023 增「与 T-052 对齐」子段：根状态机 `idle|warn|error` 的判定规则（如：任一 diagnostic severity≥warn → `warn`）；`loading|populated|error` 作为数据加载子状态；或修订 T-052 AC 引用 UC-023 实际状态表。

#### UI-003: T-052 平板断点与 UI-SPEC 响应式档位矛盾

- **category**: consistency
- **root_cause**: upstream-caused
- **证据**: `docs/dev-plan/dev-plan-wechat-flow-s2.md` T-052 AC-002/AC-003（`视口宽度 < 768px` 标注为「平板断点」）；`docs/ui-spec/ui-spec-wechat-flow.md` §5.2–§5.3（平板 768–1279 有 StatusBar 简化；移动 <768 为 P-005 只读、无编辑器 StatusBar）
- **问题**: DEV-PLAN 在 <768px 验证 StatusBar 图标降级，但 UI-SPEC 移动端编辑路由不渲染 P-001 底部状态栏（仅预览 + 底栏）。平板简化定义在 UC-023「平板简化」段（768–1279），与 T-052 断点相反。
- **影响**: Sprint 2 可能按错误断点实现/测试；移动端 AC-003「违规词图标」在无处挂载的 StatusBar 上无法验收。
- **修复建议**: 修订 T-052：AC-002/AC-003 改为 `768px ≤ vw < 1280px`（与 §1.6 `--bp-tablet` / UC-023 平板简化一致）；移动端 StatusBar 相关 AC 删除或改为 P-005 底栏的替代指标。

#### UI-004: UC-005.1 对 M-013 同步枚举的描述与 ARCH 矛盾

- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` §2.UC-005.1 首段（`getSyncState` 返回含 `offline|conflict` 的 7 态）；同节「状态来源」段（5 态直传 + M-008 合成）；`docs/arch/arch-wechat-flow-modules.md` §2.M-013 `YDocBinding.sync.status` 仅 5 态
- **问题**: 同组件内前后叙述冲突：前文写 M-013 已含 7 态，后文正确写明 `offline`/`conflict` 由 M-008 合成。与 ARCH 5 态定义不一致，易误导实现者在 M-013 层扩展枚举。
- **影响**: M-008/M-013 边界实现错误；协作 v2 启用时接口契约漂移。
- **修复建议**: 删改 UC-005.1 首段为「M-013 暴露 5 态；UI 7 态由 M-008 合成后注入 Prop」，与「状态来源」段合并为单一权威表述。

#### UI-005: 平板档底部状态栏规格三处不一致

- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow.md` §5.2 ASCII（简化：字数 | 兼容性图标 | 可读性图标 | 夜间风险图标，4 项）；`docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` §2.UC-023 平板简化（字数/兼容性/可读性/夜间风险，违规词图标降级，共 5 项语义）；`docs/ui-spec/ui-spec-wechat-flow-p001-p005.md` §3.P-001 平板布局（「字数 + 兼容性图标」，2 项）
- **问题**: 同一断点下状态栏展示项数量与文案不一致，开发无法确定平板应隐藏哪些指标。
- **影响**: T-052 平板降级、Penpot PS-006 线框、实现 CSS 断点样式均可能分叉。
- **修复建议**: 以 UC-023「平板简化」为单一来源，同步修订主卷 §5.2 与 P-001 平板 ASCII/功能矩阵；明确违规词在平板为图标 + tooltip 是否算「保留项」。

#### UI-006: F-005 P0 长图/封面导出缺少导出配置 UI 规格

- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-005 AC-001/002/004（P0，横版 900×383 / 方版 900×900）；`docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` UC-009 导出组、UC-012（仅泛化 `form-variant`）、UC-014 JobProgressBar；无独立 ExportDialog 或 UC-012 内字段表
- **问题**: 命令面板列出「导出长图 / 封面横版 / 封面方版」，但未定义触发后 Modal 内表单（尺寸确认、范围、文件名、取消/提交）、与 UC-014 的嵌套关系及错误态。UC-012 映射 F-005 但无对应内部结构。
- **影响**: F-005 P0 前端入口无法按 UI-SPEC 实现；实现者需猜测是否零配置直接起 Job。
- **修复建议**: 新增 UC-012 子节或 UC-024 ExportJobDialog：字段（导出类型、规格只读展示）、按钮（开始/取消）、内嵌 UC-014、完成态下载链接；命令面板动作映射到该 Dialog。

---

### Medium

#### UI-007: a11y 基线引用的 `--focus-ring` 未在设计系统定义

- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow.md` §0.3；§1.1–§1.6 Token 表（无 `--focus-ring`）
- **问题**: 全局焦点环颜色引用未注册 Token，实现需临时硬编码或自行命名。
- **影响**: 主题切换 / 暗色扩展时焦点样式不一致；与「Token 单一来源」原则冲突。
- **修复建议**: 在 §1.1 增补 `--focus-ring`（建议 `2px solid var(--color-brand)` 或派生自 brand）；UC-003 等已写 outline 的组件交叉引用。

#### UI-008: UC-019/UC-020/UC-023 使用未定义 Token 名

- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` UC-019/UC-020（`color-danger`）；UC-023（`--color-surface-hover`）
- **问题**: 设计系统仅有 `--color-error*` 与 `--color-surface-overlay` 等，无 `color-danger` / `--color-surface-hover`。与 §1 命名约定不一致。
- **影响**: 实现分叉（有的映射 error，有的写死 CSS）；主题守卫无法校验。
- **修复建议**: 统一为 `--color-error` 边框与 `--color-surface-overlay`（或新增 hover Token 并写入 §1.1）。

#### UI-009: P-001 未将 UC-023 列入使用组件，与 T-052/dev-plan 引用脱节

- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-p001-p005.md` §3.P-001 使用组件列表（含 UC-001..UC-021，无 UC-023）；页脚注释称 StatusBar 为子组件；`docs/dev-plan/dev-plan-wechat-flow-s2.md` T-052 `relates_to` UC-023
- **问题**: 主卷 §2 与 dev-plan 已索引 UC-023，P-001 页面级装配清单缺失，底部栏仍用 ASCII 内联描述而非组件引用。
- **影响**: 页面级任务拆分易漏 StatusBar；设计与开发对照困难。
- **修复建议**: P-001「使用组件」追加 UC-023；布局 ASCII 标注 `UC-023 StatusBar`；与页脚 ASSUMPTION 对齐（正式组件编号 UC-023）。

#### UI-010: UC-023 `loading` 骨架数量与桌面 6 指标不匹配

- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` §2.UC-023（`loading` 为 4 个脉冲占位；桌面 6 项指标）
- **问题**: 骨架屏数量与最终指标项不一致，视觉加载态与 populated 布局可能对不齐。
- **影响**: 实现/UI 回归时 loading→populated 产生布局跳动。
- **修复建议**: loading 改为 6 个占位（或按平板 4 个分档说明）。

#### UI-011: P-001 / P-005 缺少 Layer 1 要求的「空间构成」显式段落

- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-p001-p005.md` §3.P-001（有「视觉重心」但未标 **空间构成**）；§3.P-005（仅布局 ASCII）；Layer 1 `WARN: 5个页面中1个缺少空间构成说明`
- **问题**: P-002/003/004 已有 **空间构成** 段；P-001 内容等价但未用规范标题；P-005 移动只读页无留白/拇指区节奏描述。
- **影响**: 自动化检查持续 WARN；移动端 PS-009 设计缺少空间节奏输入。
- **修复建议**: P-001 将现有视觉重心段改为 **空间构成** 标题；P-005 补充底栏拇指热区与预览区留白（可引用 PS-009）。

#### UI-012: 21/23 组件仍缺「状态视觉差异」结构化描述（Layer 1 WARN）

- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: Layer 1 `WARN: 23个组件中21个缺少状态视觉差异描述`；抽检 UC-006/UC-008 等仅有简略状态表
- **问题**: r2 已对 UC-004 等补强；批量组件仍依赖「状态表一行概括」，hover/active/disabled 差异未达脚本期望粒度。
- **影响**: 不阻塞功能，但增加实现猜测成本；Penpot/implement 阶段返工风险。
- **修复建议**: 对高频交互组件（UC-006/UC-008/UC-010/UC-015）优先补全状态表列（背景/边框/字色/指针）；或文档 frontmatter 声明 checker 豁免策略并记录理由。

#### UI-013: 分卷命名与 NAV 未覆盖 UC-023

- **category**: convention
- **root_cause**: self-caused
- **证据**: 文件名 `ui-spec-wechat-flow-uc001-uc014.md`；分卷 NAV `UC-001..UC-022`；正文含 UC-023
- **问题**: 文件名与 NAV 滞后于组件规模，交叉引用易指向错误范围。
- **影响**: doc-nav / 新人导航困惑；非功能性但增加协作成本。
- **修复建议**: 重命名分卷为 `c001-c023`（或更新 NAV 与 split 说明，声明文件名历史遗留）。

---

### Low

#### UI-014: 主卷与 components 分卷行数持续超过 300 行拆分阈值

- **category**: convention
- **root_cause**: self-caused
- **证据**: Layer 1 WARN（主卷 547 行、components 865 行）；`split_policy: no-further-split` 已声明
- **问题**: 与 DOC_SPLIT_THRESHOLD_LINES 冲突，仅靠 policy 抑制 WARN。
- **影响**: 按需加载 token 成本高；审查与 diff 噪音大。
- **修复建议**: 维持 no-further-split 则在 doc-index 注明；或按 UC-017+ / 页面 再拆第三分卷。

#### UI-015: UC-019/UC-020 z-index 使用裸数字 40/50，与 §1.4 Token 体系并存

- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` UC-019/UC-020 颜色选择器规格
- **问题**: 全局 z-index 已 Token 化（`--z-dropdown` 100 等），抽屉写死 40/50 与层叠表关系未说明。
- **影响**: 与 Modal/CommandPalette 叠放顺序在 edge case 下难推理。
- **修复建议**: 改为引用 `--z-dropdown` / `--z-modal` 或补充层叠注释图。

---

## Open Questions

1. **T-052 与 UC-023 以谁为准**：是否在 dev-plan 修订中采纳 UI-SPEC 的 `loading|populated` + 指标着色模型，还是反过来收紧 UC-023 为 T-052 的三态根状态机？
2. **F-005 导出是否零配置**：长图/封面是否无需 Modal 表单、命令即启 Job？若需配置，封面横/方是否已在命令层区分而无需二次选择？
3. **Layer 1 variant 规则**：对明确「无 variant」的组件，checker 是否应接受标准声明句式，避免 UC-023 类回归？
4. **v0.2.1 相对 r2 inline-fix**：本轮未逐条 diff 验证 r2 闭合项是否仍在 0.2.1 中保留；若 orchestrator 有 amendment changelog，建议附对照表供 r4 增量审。

---

## Overall Assessment

**verdict**: **needs_revision**

**摘要**：

- **优势（相对 r2）**：§0.3 WCAG 4.5 基线、UC-009 键盘表、UC-017 双栏滚动联动、UC-019/UC-020 颜色选择器、P-001 `history.replace`、A-013/A-014 假设、UC-005.1 状态来源段落、跨文档 template/Tool 口径在 0.2.1 中整体可执行性明显提升。
- **阻塞项**：components 分卷 **Layer 1 FAIL**（UI-001）单独即可触发 needs_revision；另有多项 **HIGH** 级 UI↔DEV-PLAN↔ARCH 不一致（StatusBar 状态机/断点、M-013 同步枚举、平板状态栏项、F-005 导出 Dialog 缺失），建议在进入 Sprint 实现前由 ui-designer + tech-lead 联合修订 ui-spec 与 dev-plan T-052，并单次重跑 Layer 1 全绿。
- **非阻塞**：MEDIUM/LOW 以 Token 命名统一、页面空间构成标题、骨架数量对齐为主，可在 approved 后 inline-fix 或并入 Sprint 0 设计债。

`notes_summary`: v0.2.1 设计方向与大部分 P0 交互规格成熟，但 UC-023 导致自动化门禁失败，且 StatusBar/F-005 与 dev-plan、ARCH 存在可实施性风险。修复 UI-001 与 UI-002–UI-006 后建议重审 r4。
