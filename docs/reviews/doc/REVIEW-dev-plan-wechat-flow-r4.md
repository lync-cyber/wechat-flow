---
id: "review-dev-plan-wechat-flow-r4"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6", "prd-wechat-flow", "arch-wechat-flow", "ui-spec-wechat-flow"]
---
# 审查报告：dev-plan-wechat-flow（r4 全量 Layer 2）

**被审文档**: dev-plan-wechat-flow v0.4.1（主卷 + Sprint 0..6 分卷，共 8 文件）  
**审查类型**: r3 → r4 全量 Layer 2（任务拆解 · 依赖/优先级 · PRD/ARCH/UI-SPEC 一致性 · ac-observability）  
**Layer 1**: 主卷 + 7 分卷全部 PASS（主卷 1 WARN 行数超阈值；分卷多为 ac-observability / ID 跳号 WARN，无 FAIL）  
**上游对照**: prd-wechat-flow v0.5.1 + prd-wechat-flow-f001-f014 · arch-wechat-flow v0.6.1 + modules/api/data · ui-spec-wechat-flow v0.2.1 + 组件/页面分卷  

**相对 r3 改进（已闭合）**: Block 分阶段补全（T-024→T-074→T-075）、variant≥120（T-075 AC-004 + T-058 AC-008）、F-005 素材库链路（T-077..T-079）、Skill bundle（T-085）、MCP Tool 补全（T-079..T-084 + T-092 describe_template）、composeCopy→simulatePaste（T-030 AC-005 + 依赖 T-017）、TemplateDefinition/9 维守护（T-004/T-092）等 r3 HIGH 项已在 0.4.1 体现。

---

## Findings

### Critical

（无）

---

### High

#### PLAN-001: F-005 P0 长图/封面导出缺少编辑器 UI 接线任务

- **严重度**: HIGH  
- **category**: completeness  
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-005 备注（v1 P0 含 AC-001/002/004 **UI 落地**）；`docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` UC-009 §导出组（复制 HTML / 下载 HTML / **导出长图 / 导出封面横版 / 导出封面方版**）；`docs/dev-plan/dev-plan-wechat-flow-s4.md` T-027（AC 仅覆盖主题切换）、T-028a（ContextMenu 无长图/封面项）、T-040（JobProgressBar 接线 SSE 但无触发入口）  
- **问题**: 后端链路（T-034/T-035 relay + T-039 MCP Tool）与进度 UI（T-040）已规划，但 **CommandPalette 导出组 5 条命令**及对应 `composeExportLongImage` / `composeExportCover` 编辑器 use case **无任务卡**；T-VAL-04 仅验证 MCP 路径调用 `export_long_image`，不覆盖写作者从 UI 触发的 P0 路径。  
- **影响**: Sprint 4 演示路径「一键导出长图/封面」无法按 PRD F-005 P0 验收；F-001 命令 registry 与 ui-spec UC-009 导出组不一致。  
- **修复建议**: 新增 Sprint 4 feature 任务（或扩展 T-027/T-028a）：在 command registry 注册导出组 5 命令；实现 M-008 长图/封面 composer + ContextMenu/CommandPalette 接线 + T-040 JobProgressBar 联动；T-VAL-04 增加 UI 触发 E2E。

---

#### PLAN-002: CompatibilityDiffView 数据源与 PRD「粘贴前后」语义不一致

- **严重度**: HIGH  
- **category**: consistency  
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-002 AC-006（「粘贴前后逐节点变更对照」）；`docs/dev-plan/dev-plan-wechat-flow-s2.md` T-018 AC-005（绑定 `DiagnosticReport.nodeChangeRecords`，来源 M-003 规则集执行期）；`docs/arch/arch-wechat-flow-modules.md` M-004（simulatePaste 产出 nodeDiffs，仅在 composeCopy 路径）  
- **问题**: 预览态（postPaste:false）展示的是规则集 strip/clamp 变更，**非** M-004 粘贴模拟 diff；与 F-002 AC-006「粘贴前后」及 F-004 AC-004/005 复制路径语义可能脱节（ARCH r5 亦标记此跨文档风险）。  
- **影响**: 写作者看到的 Diff 与复制后公众号粘贴行为可能对不上；T-VAL-04/T-057 E2E 可能「面板全绿但复制后漂移」。  
- **修复建议**: 在 dev-plan 明确 T-018 数据契约（跟 ARCH 修订或 PRD 修订二选一）：(A) Diff 视图改绑 M-004 `nodeDiffs`（预览态可选懒加载 simulatePaste）；(B) 若维持 nodeChangeRecords，则在 T-018 AC 与 T-VAL-02 中改写验收措辞为「规则集过滤前后」，并引用 PRD amendment 记录。

---

#### PLAN-003: Sprint 6 多任务 deliverables 使用不存在的 `packages/app/` 路径

- **严重度**: HIGH  
- **category**: feasibility  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow-s0.md` T-001 AC-003（Monorepo 为 `apps/editor/` 等，**无** `packages/app`）；`docs/dev-plan/dev-plan-wechat-flow-s6.md` T-064/T-066/T-067/T-068/T-069 deliverables 均写 `packages/app/src/...`  
- **问题**: 与 Sprint 0 确立的目录结构及 Sprint 1..5 一致的 `apps/editor/src/...` 路径矛盾；implementer 无法按 deliverables 落盘。  
- **影响**: Sprint 6 编辑器收尾任务（多文档、undo/查找、夜间预警、设置偏好）执行路径错误，阻塞 GREEN。  
- **修复建议**: 将 s6 分卷上述任务 deliverables 统一改为 `apps/editor/src/...`（与 T-008/T-026 等同源）；主卷 §3 分卷索引无需改，仅修 s6 任务卡。

---

#### PLAN-004: T-004 contracts 仍声明 16 Tool，与 ARCH 23 Tool 对账漂移

- **严重度**: HIGH  
- **category**: consistency  
- **证据**: `docs/arch/arch-wechat-flow-api.md` §3.1（**23 Tool = 19 同步 + 4 异步**）；`docs/dev-plan/dev-plan-wechat-flow-s0.md` T-004 deliverables（「16 个 Tool 的 request/response Zod schema 骨架」）；`docs/dev-plan/dev-plan-wechat-flow-s4.md` T-036 deliverables（router 占位 23 Tool）  
- **问题**: Sprint 0 契约层范围偏小，缺 `describe_template`、`upload_to_wechat_asset` 及 Sprint 5 thin-wrapper Tool 等 schema 占位；contracts 与 router 数量不一致易在 T-036 引发补 schema 返工。  
- **影响**: M-012 单源 schema 在 Sprint 0 不完整，后续 Tool 实现可能重复定义或缺 Zod 校验。  
- **修复建议**: T-004 deliverables 改为 23 Tool 全量占位（可标注 7 个 Sprint 4+ 再填实）；AC 增加 `toolContracts.length === 23` 可观测断言；与 ARCH API 分卷 Tool 清单一一引用。

---

#### PLAN-005: F-003 P0「≥40 Block / ≥120 variant」终态任务优先级为 P1

- **严重度**: HIGH  
- **category**: consistency  
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-003 优先级 P0 + AC-006/AC-007；`docs/dev-plan/dev-plan-wechat-flow.md` T-074/T-075 均为 **P1**；`docs/dev-plan/dev-plan-wechat-flow-s6.md` T-VAL-06（P0 门禁要求 listBlocks≥40、listAllVariants≥120）  
- **问题**: 终态量化指标由 P1 任务承载，但 Sprint 6 P0 validation 硬门禁依赖 T-075；若 Sprint 5 资源挤占，P1 任务可能被延后导致 T-058/T-VAL-06 失败。  
- **影响**: 关键路径与 PRD P0 语义不对齐；Sprint 5 范围风险高。  
- **修复建议**: 将 T-074/T-075 升为 P0，或把 variant≥120 门槛前移到 T-024 并拆分 T-075 为 Sprint 3/4 增量；T-VAL-05 增加 Block≥40 中间检查点。

---

#### PLAN-006: T-064 多文档管理 — 主卷与 s6 分卷优先级/范围/依赖不一致

- **严重度**: HIGH  
- **category**: consistency  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow.md` §1 Sprint 6 表（T-064 **P0**，「UC-006 Tab 3 + **P-002** 文档列表」，依赖 T-012,T-026）；`docs/dev-plan/dev-plan-wechat-flow-s6.md` T-064（**P1**，依赖 T-012,T-005，deliverables 无 P-002/UC-006 UI，仅 store/composable）  
- **问题**: F-001 AC-005（多文档管理 P0）在分卷任务卡中降级且缺少 LeftPanel Tab 3 / P-002 侧栏文档列表 UI 交付物；与 T-026 UC-006 衔接断裂。  
- **影响**: 写作者 P0 多文档流程（切换/列表/备份）无法在 Sprint 6 按 PRD 验收。  
- **修复建议**: 对齐主卷：T-064 升 P0；dependencies 加 T-026；deliverables 补 `LeftPanelTabs` 文档 Tab + P-002 桌面侧栏列表组件；修正 `packages/app` 路径（见 PLAN-003）。

---

### Medium

#### PLAN-007: UC-020 BaseColorDeriveModal 仅有设计任务、无实现任务

- **严重度**: MEDIUM  
- **category**: completeness  
- **证据**: `docs/ui-spec-wechat-flow-uc001-uc014.md` UC-009 主题组「调色板派生 → UC-020」、UC-020 规格；`docs/dev-plan/dev-plan-wechat-flow-s4.md` T-DS-012（Penpot 设计）；`docs/dev-plan/dev-plan-wechat-flow-s3.md` T-023（后端 derivePalette）；T-082（MCP derive_palette）  
- **问题**: F-003 AC-011 除 frontmatter 解析（T-029）外，ui-spec 要求 CommandPalette 触发 **base-color 派生 Modal**；dev-plan 无对应 Vue 组件实现任务。  
- **影响**: 写作者无法从 UI 使用 base-color 派生；CommandPalette 主题组命令无法落地。  
- **修复建议**: 新增 Sprint 3/4 任务（如 T-0xx）：实现 UC-020 + CommandPalette 接线 + T-029 写回 frontmatter；依赖 T-023、T-DS-012。

---

#### PLAN-008: T-046 中文排版 UI 引用 UC-012，与 ui-spec UC-017 组件 ID 不一致

- **严重度**: MEDIUM  
- **category**: consistency  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow-s5.md` T-046 AC-001/deliverables（UC-012 form-variant、`ZhTypoPreviewModal.vue`）；`docs/ui-spec-wechat-flow-uc001-uc014.md` UC-017 ZhTypoReviseDialog；T-DS-012 设计 UC-017  
- **问题**: 实现任务与 ui-spec 正式组件编号/结构（UC-017 双栏 diff + rule 计数）不对齐；Penpot sign-off（T-DS-012）与代码验收对象不一致。  
- **影响**: 设计评审与实现验收双轨；implementer 可能按错误组件规格实现。  
- **修复建议**: T-046 AC/deliverables/relates_to 改为 UC-017；组件路径改为 `ZhTypoReviseDialog.vue`；增加 T-DS-012 依赖。

---

#### PLAN-009: 主卷与分卷任务依赖字段多处漂移

- **严重度**: MEDIUM  
- **category**: convention  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow.md` T-033 依赖 `[T-032, T-091]` vs `s4` T-033 仅 `[T-032]`；主卷 T-077 `[T-033,T-042,T-091]` vs `s5` T-077 `[T-033,T-042]`；主卷 T-072 `[T-004]` vs `s6` T-072 `[T-037,T-038,T-039]`；主卷 T-VAL-06 含 **T-075**，`s6` T-VAL-06 依赖列表**缺 T-075**  
- **问题**: 依赖图（§2 Mermaid）与分卷任务卡不同源，orchestrator 按分卷调度时可能漏 JWT 前置（T-091）或 Block 终态（T-075）。  
- **影响**: 并行调度/validation 门禁顺序错误。  
- **修复建议**: 以主卷 Mermaid + 分卷任务卡双向同步；validation 任务 dependencies 与 AC 断言项一一对应。

---

#### PLAN-010: F-003 AC-008/009/010 与 AC-010 UI 推迟至 Sprint 6 且为 P1

- **严重度**: MEDIUM  
- **category**: consistency  
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-003 P0 + AC-008/009/010；`docs/dev-plan/dev-plan-wechat-flow-s6.md` T-087/T-088 均为 **P1** Sprint 6；T-088 无 T-DS-012（UC-019 设计）依赖  
- **问题**: 主题装饰/上下文渲染/paint drawer 均在最后一 Sprint 以 P1 交付，与 F-003 Feature 级 P0 存在优先级落差；paint UI 晚于 T-029 解析能力 3 个 Sprint。  
- **影响**: Sprint 3/4 演示无法验收 AC-008..010 的编辑器侧能力。  
- **修复建议**: T-087 升 P0 或并入 Sprint 3 主题包任务；T-088 升 P0 并加 T-DS-012 依赖；T-VAL-03/04 增加 paint/装饰 smoke 项。

---

#### PLAN-011: F-005 核心 relay 基建任务优先级低于 MCP/UI 出口

- **严重度**: MEDIUM  
- **category**: feasibility  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow.md` T-032/T-034/T-035 均为 **P1**，T-039/T-040 为 **P0**；PRD F-005 AC-001/002/004 为 P0 v1  
- **问题**: P0 MCP Tool 与 JobProgressBar 依赖 P1 队列/Playwright 池；关键路径上优先级倒置，Sprint 4 末易出「Tool 可调但 UI/relay 未就绪」。  
- **影响**: T-VAL-04 长图导出项失败风险；Sprint 4 演示依赖 MCP 绕过而非写作者路径。  
- **修复建议**: T-032/T-034/T-035 升为 P0，或 T-039/T-040 显式依赖并在 AC 中标注「relay 未就绪时 skip」。

---

#### PLAN-012: T-071 交付路径与 Monorepo 布局不一致

- **严重度**: MEDIUM  
- **category**: convention  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow-s6.md` T-071 deliverables `packages/mcp-server/src/...`；Sprint 0 T-001 / Sprint 4 T-036 均为 `apps/mcp-server/`  
- **问题**: 冷启动优化任务写入错误包路径。  
- **影响**: implementer 修改位置错误或与 T-036 冲突。  
- **修复建议**: 统一为 `apps/mcp-server/src/startup.ts` 等。

---

### Low

#### PLAN-013: Layer 1 ac-observability 批量 WARN（尤其 s5/s6）

- **严重度**: LOW  
- **category**: ac-observability  
- **证据**: Layer 1 对 s5（38 条）、s6（72+ 条）AC 报「无可观测动词 / 非 GWT 格式」WARN  
- **问题**: T-056/T-057/T-VAL-06 等 validation/feature 卡 AC 多为声明式清单，自动化门禁难以解析。  
- **影响**: 不影响功能理解，但降低 TDD RED 阶段可执行性。  
- **修复建议**: 分批将高频 AC 改写为 Given-When-Then + 可观测终点（返回值/退出码/文件路径/DOM 选择器）。

---

#### PLAN-014: T-055 错误引用 F-004 AC-007 编号

- **严重度**: LOW  
- **category**: consistency  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow-s5.md` T-055 AC-004 引用「F-004 AC-007」；PRD 已拆为 **AC-007a**（桌面 execCommand）/ **AC-007b**（移动长按）  
- **问题**: 引用编号过时；且桌面降级应在 T-030 composeCopy 覆盖，不仅 P-005 移动页。  
- **影响**: 验收时引用歧义；桌面 Clipboard 降级可能漏测。  
- **修复建议**: T-030 增 AC-007a；T-055 改引 AC-007b。

---

#### PLAN-015: 预留任务编号未在风险章说明调度策略

- **严重度**: LOW  
- **category**: convention  
- **证据**: `docs/dev-plan/dev-plan-wechat-flow.md` §3（T-053/T-054/T-065/T-076 预留）  
- **问题**: Layer 1 对各分卷报 ID 跳号 WARN；无预留号分配规则（何种变更占用）。  
- **影响**: 后续 amendment 可能重复占用或跳号混乱。  
- **修复建议**: §5 增「预留编号」表：编号、预留原因、计划 Sprint。

---

## Open Questions

1. **CompatibilityDiffView 权威数据源**：产品确认预览态 Diff 展示 **规则集变更（M-003 nodeChangeRecords）** 还是 **粘贴模拟变更（M-004 nodeDiffs）**？这将决定 T-018 是否修订还是触发 PRD/ARCH amendment（关联 PLAN-002）。

2. **F-005 长图/封面 UI 入口范围**：ui-spec UC-009 导出组含 5 命令，UC-016 ContextMenu **不含**长图/封面；v1 P0 是否 **仅 CommandPalette 导出组** 即可，还是需在 ContextMenu 增项（关联 PLAN-001）？

3. **F-005 AC-003（素材库上传）v1 边界**：PRD 标注「v1 API only / UI deferred」，但 dev-plan Sprint 5 已排 T-077..T-079（P1）；v1 发布是否必须交付该 API 链，还是可整体移至 Sprint 7+？

4. **Sprint 6 `packages/app` 是否为笔误**：是否存在未写入 T-001 的 `packages/app` 别名包，还是 s6 分卷应全部回写 `apps/editor`（关联 PLAN-003）？

5. **T-064 与 P-002 桌面文档列表**：F-001 AC-005 桌面侧栏内嵌 P-002 是否必须在 T-064 同一任务交付，还是可拆独立任务并挂 T-026？

---

## Overall Assessment

**verdict: needs_revision**

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 6 |
| MEDIUM | 6 |
| LOW | 3 |
| **合计** | **15** |

**总结**: dev-plan v0.4.1 相对 r3 **显著改进**——96 任务卡结构完整、Mermaid 依赖图可追踪、r3 多数 P0 覆盖缺口（Block 分阶段、MCP 23 Tool、Skill bundle、素材库链、composeCopy 粘贴模拟）已闭合，Layer 1 全绿。当前阻塞 pre_dev→Sprint 0 的主要是 **6 项 HIGH**：(1) F-005 P0 编辑器导出 UI 缺失；(2) 兼容性 Diff 与 PRD 粘贴语义；(3) Sprint 6 错误 `packages/app` 路径；(4) contracts 16 vs 23 Tool；(5) Block/variant 终态任务 P1 vs P0 门禁；(6) T-064 多文档主卷/分卷分裂。建议 tech-lead 修订 0.4.2 后做 r5 复审；**不必回退 PRD/ARCH**，但 PLAN-002 可能需四方（PRD/ARCH/ui-spec/dev-plan）择一同步。

**任务拆解评价（简要）**:
- **粒度**: Sprint 0–4 整体合理（M-008/M-009/M-010 拆分清晰）；Sprint 6 部分任务 deliverables 路径错误拉低可执行性。
- **依赖**: 主路径（渲染核→规则集→复制→质量门禁）完整；分卷与主卷依赖字段需对齐（PLAN-009）。
- **优先级**: F-003/F-005 终态 P0 与任务 P1 标签多处倒挂（PLAN-005/011）。
- **AC 可观测性**: Sprint 0–4 多数 feature 卡 GWT 良好；Sprint 5–6 validation/收尾卡需加强（PLAN-013）。
