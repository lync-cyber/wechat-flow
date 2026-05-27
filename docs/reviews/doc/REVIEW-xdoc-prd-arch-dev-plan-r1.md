---
id: "review-xdoc-prd-arch-dev-plan-r1"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "dev-plan-wechat-flow", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5"]
---
# 跨文档一致性审查：PRD × ARCH × DEV-PLAN（r1）

**审查范围**: PRD 主卷 + F-001..F-014 分卷；ARCH 主卷 + modules/api 分卷；DEV-PLAN 主卷 + Sprint 3..5 分卷（指标与 F-013/F-012/M-014 任务簇重点对照）
**审查类型**: 跨文档矛盾 / 遗漏 / 冗余（不重复单文档内部小问题）
**Layer 2**: 全量语义对照（用户指定必查项 + 抽样延伸）

---

## 审查结论

**verdict: needs_revision**

存在 5 条 HIGH 级跨文档缺口（Block/Variant 量化指标、F-013 Tool 与 Skill bundle 落地、F-005 素材库上传、F-012 与非目标冲突），阻塞 dev 阶段按 PRD 成功指标与 F-013 AC 验收。需 tech-lead / product-manager 协同修订 dev-plan 任务 AC 或 PRD 指标后再进入 Sprint 执行。

---

## 问题列表

### [XDOC-001] HIGH — consistency — PRD §1.3 / F-003 AC-006 vs dev-plan T-024

- **location**: `prd-wechat-flow.md` §1.3 成功指标「内置 Block 数 ≥ 40」；`prd-wechat-flow-f001-f014.md` F-003 AC-006；`dev-plan-wechat-flow-s3.md` T-024 AC-001；`dev-plan-wechat-flow.md` Sprint 3 里程碑「内置 Block ≥ 10 个」
- **description**: PRD 在成功指标与 F-003 AC 双层锁定内置 Block ≥ 40；dev-plan 唯一量化任务 T-024 仅要求 `listBlocks()` ≥ 20，且 Sprint 3 里程碑进一步降为 ≥ 10。三处数字互不一致，且均低于 PRD 门槛。
- **impact**: Sprint 3/6 完成后无法对照 PRD §1.3 验收；组件覆盖面缺口约 50%，左侧面板 Block 库与 F-011 视觉回归矩阵范围被系统性低估。
- **suggestion**: 统一口径为 PRD ≥ 40（或经 product-manager 正式 amend PRD 后同步三文档）。在 dev-plan 增加 Block 增量任务（Sprint 4–6）或拆分 T-024 为多 Sprint 交付，并将 Sprint 3 里程碑改为与 T-024 AC 一致。

---

### [XDOC-002] HIGH — completeness — PRD §1.3 / F-003 AC-007 vs dev-plan 全卷

- **location**: `prd-wechat-flow.md` §1.3「内置 Variant 皮肤数 ≥ 120」；`prd-wechat-flow-f001-f014.md` F-003 AC-007；`dev-plan-wechat-flow-s3.md` T-024 AC-002（callout variants ≥ 3）；`dev-plan-wechat-flow-s6.md` T-058 / T-VAL-06
- **description**: PRD 要求全局 variant 注册表统计 ≥ 120；dev-plan 仅在 T-024 对单个 Block（callout）要求 variants ≥ 3，无全局 `listBlockVariants()` 计数 AC，T-058 视觉矩阵也未绑定 variant 覆盖率。
- **impact**: PRD 第二大组件量化指标（120）在 dev-plan 中完全不可观测；主题/插件 variant 扩展（F-010 AC-006）缺少交付终点。
- **suggestion**: 新增任务（或扩展 T-024/T-048）含 AC：`registry.listAllVariants().length ≥ 120`，并在 T-VAL-06 增加 variant 注册表断言；T-058 story 矩阵需覆盖 PRD 列举的核心 Block variant 子集。

---

### [XDOC-003] HIGH — completeness — PRD F-013 AC-002 / ARCH API-001..016 vs dev-plan T-037~T-045

- **location**: `prd-wechat-flow-f001-f014.md` F-013 AC-002 Tool 枚举；`arch-wechat-flow-api.md` API-009..015 + API-016 簇；`dev-plan-wechat-flow-s4.md` T-037 / T-038 / T-039 / T-045
- **description**: ARCH 定义 16 个 MCP Tool（含 `list_tokens`/`describe_token`、`list_block_variants`/`describe_variant`、`derive_palette`、`simulate_paste`、`export_clipboard_payload`、`upload_to_wechat_asset`）。dev-plan T-037~T-039、T-045 仅覆盖其中 9 个；其余 7 个 Tool 无独立任务卡、无 AC、无 deliverables。T-023 实现了 `derivePalette` use case（M-006）但未映射为 MCP Tool 任务。
- **impact**: F-013 AC-002 与 ARCH M-009「16 Tool dispatcher」无法通过 dev-plan 任务矩阵闭环；PRD 备注中的 Agent 工作流（`describe_block` → `simulate_paste` → 上传素材库）在计划中断裂。
- **suggestion**: 增补 Sprint 4–5 MCP Tool 任务簇（建议 T-039b 或扩展 T-038/T-039）：`list_tokens`/`describe_token`、`list_block_variants`/`describe_variant`、`derive_palette`（复用 T-023）、`simulate_paste`（复用 T-017/M-004）、`export_clipboard_payload`（复用 T-030/M-008）；每项至少 1 条可观测 AC。

---

### [XDOC-004] HIGH — completeness — PRD F-013 AC-003 Skill bundle vs ARCH / dev-plan

- **location**: `prd-wechat-flow.md` §5 术语「Skill bundle」；`prd-wechat-flow-f001-f014.md` F-013 AC-003；`dev-plan-wechat-flow.md` Sprint 4–5 任务表；`arch-wechat-flow.md` §6.1 分发形态
- **description**: F-013 AC-003 明确要求第三种分发形态「Skill bundle（含 SKILL.md 与资源目录，语义级任务编排）」；ARCH §6.1 仅列 SPA / MCP stdio / MCP HTTP / CLI / Relay，未定义 Skill bundle 部署单元或目录结构；dev-plan 有 T-050（CLI）和 T-036+（MCP），无任何 Skill bundle 产出任务。
- **impact**: F-013 AC-003 三分发形态之一在 ARCH 与 dev-plan 双侧缺失，PRD P1 功能无法验收。
- **suggestion**: architect 在 ARCH §6.1 补充 Skill bundle 形态（建议 `packages/skill-bundle/` 或 `apps/skill/`）；dev-plan 新增任务：产出 SKILL.md + 示例编排（覆盖 PRD 备注场景：list_themes → describe_block → simulate_paste → upload_to_wechat_asset），并纳入 T-VAL-05 或独立 validation。

---

### [XDOC-005] HIGH — consistency — PRD §4 非目标 vs F-012 AC-004 vs dev-plan T-052~T-054

- **location**: `prd-wechat-flow.md` §4「不做实时多人协作」；`prd-wechat-flow-f001-f014.md` F-012 AC-004「基于 CRDT 的多人协作」；`dev-plan-wechat-flow-s5.md` T-052 AC-001（双客户端 ≤200ms 同步）；`arch-wechat-flow-api.md` API-026 maps_to F-012 AC-004
- **description**: PRD §4 非目标声明「不做实时多人协作」，同文档 F-012 AC-004 却要求 CRDT 多人协作；dev-plan 与 ARCH 按 AC-004 完整实现 Yjs 双端协作（T-052/T-053/T-054），与 §4 非目标字面冲突。§4 后半句「云端同步与版本历史作为可选能力按 F-012 路径迭代」不足以消解 AC-004 的多人协作要求。
- **impact**: 产品边界模糊：orchestrator 无法判断 v1 是否应交付多人协作；资源可能投入 PRD 非目标能力。
- **suggestion**: product-manager 二选一并三文档同步：（A）修订 §4，将「不做实时多人协作」改为「默认关闭、P2 可选」并保留 AC-004；或（B）降级 F-012 AC-004 为「架构预留、v1 不验收」，dev-plan 将 T-052 AC-001 改为单用户多设备同步 smoke test。

---

### [XDOC-006] MEDIUM — consistency — dev-plan M-014 vs ARCH M-001..M-013

- **location**: `dev-plan-wechat-flow.md` T-043「M-014 附属模块」；`dev-plan-wechat-flow-s5.md` T-043 模块字段；`arch-wechat-flow-modules.md` §2 M-001..M-013；`arch-wechat-flow.md` §7 packages 树 `packages/zh-typo/`
- **description**: dev-plan 引入不存在的模块编号 M-014；ARCH 将中文排版映射为 `packages/zh-typo` 包，由 M-008 use case 消费（`@wechat-flow/zh-typo` 依赖），模块边界在 M-008，非独立 M-NNN。
- **impact**: 任务 `relates_to` / Layer 1 双向覆盖检查可能误判 M-014 未覆盖或 phantom 模块；新成员模块索引混乱。
- **suggestion**: T-043 改为 `relates_to: [F-014, M-008]`，模块字段写「packages/zh-typo（M-008 依赖）」；删除 M-014 字样。若需独立模块，architect 正式增补 M-014 并更新 ARCH 模块表。

---

### [XDOC-007] HIGH — completeness — PRD F-005 AC-003 / F-013 `upload_to_wechat_asset` vs dev-plan

- **location**: `prd-wechat-flow-f001-f014.md` F-005 AC-003、F-013 AC-002；`arch-wechat-flow-api.md` API-016 `upload_to_wechat_asset` + API-018 `/api/v1/wechat-assets/upload`；`dev-plan-wechat-flow-s4.md` T-033（图床）/ T-039（upload_image，无 upload_to_wechat_asset）
- **description**: PRD 与 ARCH 均定义微信公众号素材库上传（中继 + 异步 job）；dev-plan T-033 仅覆盖通用图床 proxy，T-039 仅实现 `upload_image` MCP Tool，全卷无 `wechat-assets` 路由或 `upload_to_wechat_asset` 任务/AC。
- **impact**: F-005 AC-003（P1）与 F-013 自动化发布链路（PRD 备注「经中继上传到素材库」）无法在 v1 计划内验收。
- **suggestion**: 新增 relay 任务（API-018 实现 + 微信凭据托管）及 MCP Tool 任务（`upload_to_wechat_asset`，依赖 T-033 job 队列）；T-VAL-04/05 增加素材库上传 smoke test（mock 微信 API）。

---

### [XDOC-008] MEDIUM — completeness — F-012 AC-003 版本历史 vs ARCH API-027 vs dev-plan

- **location**: `prd-wechat-flow-f001-f014.md` F-012 AC-003；`arch-wechat-flow-api.md` API-027 GET/POST snapshots；`dev-plan-wechat-flow-s5.md` T-052 AC-002（后台快照写入）
- **description**: F-012 要求版本历史、回滚、差异对比；ARCH 暴露 API-027 列出/恢复快照；dev-plan T-052 仅验收 Y.Doc 周期性快照写入 E-009，无 API-027 REST 端点任务、无回滚 UI/CLI、无 diff 对比 AC。
- **impact**: F-012 AC-003 用户可感知能力（查看历史、回滚）在 dev-plan 中遗漏；与 AC-004 多人协作任务（T-052~T-054）不成比例——后端有快照无消费端。
- **suggestion**: 增补 T-055 级任务：relay snapshots API（API-027）+ 编辑器版本历史面板或 CLI `wechat-flow history/rollback`；AC 引用 F-012 AC-003 可观测动词（列出 ≥N 快照、回滚后文档内容恢复）。

---

### [XDOC-009] MEDIUM — consistency — PRD F-011 AC-004 / §1.3 vs dev-plan T-058 / T-VAL-06

- **location**: `prd-wechat-flow-f001-f014.md` F-011 AC-004「5 套主题 × 所有 Block/Mark/variant story 矩阵」；`dev-plan-wechat-flow-s6.md` T-058 AC-002（每主题 8 固定场景）；T-VAL-06「≥ 40 个 .png（5 主题 × ≥ 8 场景）」
- **description**: PRD 要求覆盖全部 Block/Mark/variant 的 story 矩阵；dev-plan T-058 仅 8 类场景 × 5 主题，T-VAL-06 以 40 张截图作为通过条件，与 PRD「所有 Block/Mark/variant」差距巨大，且与 XDOC-001/002 的低 Block/variant 门槛形成叠加偏差。
- **impact**: 视觉回归门禁无法证明 PRD §1.3「粘贴后视觉一致性 ≤ 5%」在完整组件集上成立。
- **suggestion**: 将 T-058 AC 改为与 PRD 对齐的矩阵生成策略（按 registry 动态生成 story）；T-VAL-06 截图数量改为 `≥ 5 × listBlocks().length × avgVariants` 或引用 T-058 动态计数 AC。

---

### [XDOC-010] MEDIUM — redundancy — F-013 Tool 与 M-008/M-004 use case 双轨未在 dev-plan 声明

- **location**: `prd-wechat-flow-f001-f014.md` F-013 AC-001；`arch-wechat-flow-modules.md` M-008 / M-009；`dev-plan-wechat-flow-s4.md` T-030（composeCopy）/ T-017（simulatePaste） vs T-037~T-039
- **description**: PRD/ARCH 要求 MCP Tool 与编辑器共享 M-008 use case；dev-plan 在 T-030/T-017 实现了 copy/simulate 的 use case，但 F-013 对应 Tool（`export_clipboard_payload`、`simulate_paste`）无 MCP 包装任务，形成「use case 已建、Tool 面缺失」的计划冗余——工作重复风险与验收缺口并存。
- **impact**: Implementer 可能在 T-030 重复实现 clipboard 逻辑而未暴露 MCP；Agent 调用路径与编辑器路径行为漂移。
- **suggestion**: 在 T-037~T-039 修订说明中显式声明「Tool 层 thin wrapper 调用 M-008/M-004 composer，禁止 duplicate 业务逻辑」；合并为单一 deliverable 路径。

---

### [XDOC-011] LOW — completeness — PRD §4 ASSUMPTION 服务端依赖 vs F-012 协作后端

- **location**: `prd-wechat-flow.md` §4 ASSUMPTION（F-005/F-006/F-013 服务端依赖）；`arch-wechat-flow.md` §6.2 拓扑含 YwsServer；`dev-plan-wechat-flow.md` R-005
- **description**: PRD §4 汇总 ASSUMPTION 列出 F-005/F-006/F-013 三类服务端依赖，未列入 F-012（Yjs/y-websocket）；ARCH 与 dev-plan 均规划独立 YwsServer + T-052 relay 集成，形成跨文档服务端边界清单不完整。
- **impact**: deploy-spec 阶段可能低估后端部署单元（遗漏 y-websocket 进程与 Redis awareness）。
- **suggestion**: PRD §4 ASSUMPTION 补充 F-012（可选 y-websocket + 快照存储）；或 dev-plan R-005 升格为 ARCH §6.3 正式条目。

---

### [XDOC-012] LOW — ambiguity — dev-plan Sprint 3 里程碑 vs T-024 内部 AC

- **location**: `dev-plan-wechat-flow.md` Sprint 3 里程碑「内置 Block ≥ 10 个」；同卷 T-024「≥ 20 个」
- **description**: dev-plan 主卷 Sprint 3 交付里程碑（≥ 10）与 T-024 任务 AC（≥ 20）自相矛盾；虽非 PRD 直接冲突，但会导致 Sprint 3 评审以较低里程碑提前 DONE，与 T-024 AC 及 PRD ≥ 40 形成三级落差。
- **impact**: Sprint review 误判 Sprint 3 完成度；与 XDOC-001 叠加放大 Block 交付风险。
- **suggestion**: 统一 Sprint 3 里程碑为 T-024 AC 值（≥ 20），并在里程碑脚注指向 PRD v1 最终目标 ≥ 40 的后续 Sprint。

---

## 必查项对照摘要

| 必查项 | 结论 |
|--------|------|
| Block 40 vs dev-plan 20/10 | **未对齐**（XDOC-001、XDOC-012） |
| Variant 120 | **dev-plan 无全局 AC**（XDOC-002） |
| F-013 tools vs ARCH vs T-037~045 | **7/16 Tool 无任务**（XDOC-003、XDOC-010） |
| upload_to_wechat_asset | **ARCH 有、dev-plan 无**（XDOC-007） |
| Skill bundle | **PRD 有、ARCH/dev-plan 无**（XDOC-004） |
| F-012 vs §4 非目标 | **多人协作冲突**（XDOC-005） |
| M-014 vs M-001..013 | **phantom 模块编号**（XDOC-006） |

---

## 统计

| 严重等级 | 数量 |
|----------|------|
| CRITICAL | 0 |
| HIGH | 5 |
| MEDIUM | 4 |
| LOW | 2 |
| **合计** | **11** |
