---
id: "review-xdoc-prd-arch-dev-plan-r2"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data", "dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6", "ui-spec-wechat-flow-p001-p005"]
---
# 跨文档一致性审查：PRD × ARCH × DEV-PLAN（r2）

**审查范围**: PRD 主卷 + F-001..F-014 分卷；ARCH 主卷 + modules / api / data 三卷；DEV-PLAN 主卷 + Sprint 0..6 全分卷；ui-spec P-001..P-005（中文排版交叉引用）  
**审查类型**: 跨文档矛盾 / 遗漏 / 冗余 / 设计合理性 / 任务分解可验收性  
**文档版本**: PRD v0.3.0 · ARCH v0.4.0 · DEV-PLAN v0.2.0  
**审查方法**: Layer 1 `cataforge skill run doc-review`（三主卷 PASS）+ 3 路 Composer 2.5 子代理语义审查 + 对照 `REVIEW-xdoc-prd-arch-dev-plan-r1` 回归  
**基线**: r1（2026-05，verdict `needs_revision`）

---

## 审查结论

**verdict: needs_revision**

相对 r1，dev-plan v0.2.0 已闭合 Skill bundle、22 MCP Tool 包装、素材库上传、`composeCopy`→`simulatePaste`、M-014 幻影模块等 **6 项 HIGH**；Sprint 0 基础设施任务可启动。仍存在 **10 条开放 HIGH**（含 4 条 r1 延续 + 6 条 r2 新发现），集中在 PRD 语义冲突、ARCH 管线/鉴权、Variant≥120 与主卷依赖图。须在 Sprint 3 组件交付前由 product-manager / architect / tech-lead 协同 inline-fix，否则无法按 PRD §1.3 全量成功指标验收。

**分文档判定（供单文档门禁参考）**

| 文档 | 判定 |
|------|------|
| PRD | approved_with_notes |
| ARCH | approved_with_notes |
| DEV-PLAN | approved_with_notes |
| **三文档交叉** | needs_revision |

**Sprint 0**: **可启动**（T-001..T-004、T-DS-001、T-VAL-00）；并行修订文档，避免 Sprint 4 复制链与 Sprint 6 指标返工。

---

## r1 审查项回归

| r1 ID | 主题 | r2 状态 | 说明 |
|-------|------|---------|------|
| XDOC-001 | Block ≥40 vs dev-plan 阈值 | **部分闭合** | T-024 P0≥25、T-074≥30、T-075 Sprint 6≥40；Sprint 3 演示仍为 25，PRD §1.3 直至 Sprint 6 不可验收 → 见 [XDOC-001] |
| XDOC-002 | Variant ≥120 无任务 | **仍开放** | → [XDOC-002] |
| XDOC-003 | MCP Tool 7/16 无任务 | **已闭合** | T-080..T-084 thin wrapper；主卷声明 22 Tool |
| XDOC-004 | Skill bundle 缺失 | **已闭合** | ARCH `skill/` + T-085 + T-VAL-06 E2E |
| XDOC-005 | F-012 CRDT vs §4 非目标 | **部分闭合** | PRD 主卷 F-012 标注「不在当前发布范围」；分卷 AC-004 仍写 CRDT 多人协作；dev-plan 已移除 T-052..T-054 → [XDOC-005] |
| XDOC-006 | M-014 phantom | **已闭合** | T-043 改为 `packages/zh-typo（M-008 依赖包）` |
| XDOC-007 | upload_to_wechat_asset | **已闭合** | T-077/T-078/T-079 + T-VAL-05 |
| XDOC-008 | F-012 AC-003 版本历史 | **仍开放（MEDIUM）** | → [XDOC-008] |
| XDOC-009 | F-011 视觉矩阵 vs T-058 | **部分闭合** | T-058 动态枚举 variant；T-VAL-06 仍 ≥40 png，与 PRD「所有 Block/Mark/variant」有差距 → [XDOC-009] |
| XDOC-010 | Tool vs use case 双轨 | **已闭合** | T-079..T-084 显式 thin wrapper + R-007 |
| XDOC-011 | §4 ASSUMPTION 缺 F-012 后端 | **仍开放（LOW）** | → [XDOC-011] |
| XDOC-012 | Sprint 3 里程碑 ≥10 vs T-024 | **已闭合** | 主卷 Sprint 3 里程碑已改为「P0 必含 25 种 Block」 |

---

## 问题列表

### [XDOC-001] HIGH — consistency — PRD Block ≥40 与 dev-plan 分期交付

- **category**: consistency
- **root_cause**: upstream-caused
- **location**: `prd-wechat-flow.md` §1.3；`prd-wechat-flow-f001-f014.md` F-003 AC-006；`dev-plan-wechat-flow.md` Sprint 3 里程碑；`dev-plan-wechat-flow-s3.md` T-024；`dev-plan-wechat-flow-s6.md` T-075、T-VAL-06
- **description**: PRD 成功指标与 F-003 AC-006 锁定内置 Block ≥40。dev-plan Sprint 3 交付 25 种（T-024），Sprint 5 T-074 累计 ≥30，Sprint 6 T-075 才达 ≥40。相对 r1（20/10）已改善，但存在 Sprint 3–5 无法对照 PRD §1.3 的窗口期；Sprint 3 对外演示与最终指标口径不一致。
- **impact**: 中期里程碑评审可能误判「组件系统已满足 PRD」；F-011 视觉矩阵在 Block 未齐备时通过，后期扩容返工成本高。
- **suggestion**: 主卷 Sprint 3/4 里程碑脚注「PRD §1.3 终态 ≥40 见 T-075（Sprint 6）」；或将 T-074 部分 Block 前移至 Sprint 4；T-VAL-03 仅验收 ≥25 并显式标注非终态。

---

### [XDOC-002] HIGH — completeness — PRD Variant ≥120 在 dev-plan 仍不可验收

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow.md` §1.3；`prd-wechat-flow-f001-f014.md` F-003 AC-007；`dev-plan-wechat-flow-s3.md` T-024 AC-002；`dev-plan-wechat-flow-s6.md` T-058、T-VAL-06
- **description**: PRD 要求全局 variant 注册表 ≥120。dev-plan 仅验收 `describeBlock('callout').variants.length ≥ 3`；T-058 按 `listBlocks() × variants` 动态生成视觉 story，但无 `listAllVariants().length ≥ 120` 或按核心 Block 分配配额的全局 AC。r1 项，v0.2.0 未闭合。
- **impact**: PRD 第二大组件量化指标在 dev-plan 中不可观测；插件 `defineVariant`（T-048）与内置 variant 交付边界模糊。
- **suggestion**: 新增 Sprint 3 末或 Sprint 6 前任务（或扩展 T-024/T-075）：`registry.listAllVariants().length ≥ 120`；按 PRD 列举的 8 类核心 Block 分配最低 variant 数；T-VAL-06 增加 variant 计数断言。

---

### [XDOC-005] HIGH — consistency — PRD F-012 分卷 AC-004 vs 主卷 §4 非目标

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow.md` §4、§2 功能表 F-012 备注；`prd-wechat-flow-f001-f014.md` F-012 AC-004；`arch-wechat-flow-api.md` API-026/027（预留）
- **description**: 主卷 §4 声明「不做实时多人协作」，功能表写 F-012「不在当前发布范围；AC-004 仅作 ARCH 预留」。分卷 F-012 AC-004 仍要求「基于 CRDT 的多人协作」。dev-plan v0.2.0 已移除 Yjs 实现任务（T-052..T-054 不存在），与分卷 AC 脱节。仅读分卷的 implementer 仍可能按 AC-004 排期。
- **impact**: 产品边界与验收标准分裂；ARCH API-026/027 预留与 PRD 读者预期不一致。
- **suggestion**: product-manager 修订分卷：AC-004 标注 `[ARCH 预留 / v1 不验收]` 或删除并改引用 ARCH；ARCH §8.1 F-012 映射旁注「当前发布不交付」。

---

### [XDOC-013] HIGH — consistency — F-001 自动输入辅助 vs F-014 显式确认修订 vs ui-spec

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-001 AC-007 vs F-014 AC-001/003/006 及备注；`ui-spec-wechat-flow-p001-p005.md` P-001 状态栏「自动加空格默认开」
- **description**: F-001 AC-007 要求中英文**自动**加空格、引号/破折号转换；F-014 要求 4 类规则**显式触发**、diff 预览 + 用户确认、备注「**非自动**应用」。ui-spec 草稿仍写输入辅助默认开启。三文档对同一能力给出互斥默认行为。
- **impact**: 阻塞编辑器输入层与 F-014/T-043/T-044 实现路径选择；无法编写统一 E2E 用例。
- **suggestion**: product-manager 二选一并三文档同步：（A）删除/收窄 F-001 AC-007，仅保留「打开 F-014 修订入口」；（B）F-014 为批量模式，实时辅助单独定义且默认关；同步修订 ui-spec `[DRAFT_UI_INPUT]` 区。

---

### [XDOC-014] HIGH — consistency — 视觉一致性 ≤5% 验收路径不统一

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow.md` §1.3；`prd-wechat-flow-f001-f014.md` F-004 AC-005、F-011 AC-004a；§4 ASSUMPTION（视口 1280×800 / 375×667）；`dev-plan-wechat-flow-s6.md` T-058、T-090；`dev-plan-wechat-flow.md` §6 E2E
- **description**: §1.3 写 Playwright 截图 diff；F-004 AC-005 要求**粘贴到公众号编辑器后**对比；F-011 AC-004a 为本地 Playwright（未要求真实粘贴）；ASSUMPTION 规定视口尺寸，F-004/F-002 未统一引用。dev-plan T-058 用 pixelmatch ≤0.05，T-090 为实地验证脚本，但未定义与 §1.3 的单一门禁关系。
- **impact**: CI 门禁 vs 发布前人工验证边界不清；T-VAL-04/06 可能各自通过却无法回答 PRD §1.3。
- **suggestion**: PRD §4 或 §1.3 增「视觉一致性验收规范」：CI 默认 = 本地 Playwright + simulate_paste（引用 F-011 AC-004a）；真实公众号粘贴 = T-090 周期任务；统一视口与 5 篇样本路径。

---

### [XDOC-015] HIGH — design — ARCH M-002 / M-004 / M-008 粘贴模拟调用边界

- **category**: consistency
- **root_cause**: self-caused
- **location**: `arch-wechat-flow-modules.md` M-002 五段管线、M-004「末 stage 调用」、M-008 `composeCopy` pipeline 约束
- **description**: M-002 声明管线含 post-paste-hast；M-004 被 M-002 在最后 stage 调用；M-008 `composeCopy` 强制 `composeRender → simulatePaste → …`。若 `composeRender` 已含 M-004，复制路径可能**双跑** simulatePaste；若未含，PreviewPane 展示 HTML 可能与复制产物不一致（F-002/F-004）。dev-plan T-030 分卷已要求 pipeline 顺序且依赖 T-017，但 ARCH 主卷/模块卷未给出唯一 stage 序列表。
- **impact**: implementer 在 M-002 与 M-008 分别实现时易产生预览/复制/MCP 三路径漂移。
- **suggestion**: M-002 增唯一 stage 序列表；明确 `composeRender` 响应是否 `postPaste: true`；若已含则 `composeCopy` 改为 `composeRender → buildDualMimePayload`；Preview / `render_markdown` / 复制三路径文档化同一布尔语义。

---

### [XDOC-016] HIGH — completeness — Editor SPA → Relay 鉴权（F-006 P0）

- **category**: completeness
- **root_cause**: self-caused
- **location**: PRD §3.2、`prd-wechat-flow-f001-f014.md` F-006；`arch-wechat-flow.md` §5.3、§6.1；`arch-wechat-flow-api.md`（MCP/Relay REST，无 Editor session）
- **description**: PRD 要求 AppID/图床 token 不进浏览器；F-006 为 P0。ARCH 描述 MCP Bearer + admin key，API 分卷无写作者短期 session / Hono RPC 契约。静态 CDN 上的 Editor 无法从 ARCH 推导如何安全调用 `POST /api/v1/images/upload`。
- **impact**: P0 图片上传全链路在 Sprint 4（T-033）前缺少安全架构输入；与 PRD §3.2 凭据隔离冲突风险。
- **suggestion**: API 分卷增补 Editor Session（如 `POST /api/v1/editor/session` → 短期 JWT）；`relay/route-contracts.ts` 单源；M-008 `composeUploadImage` 标注走 session 而非明文 API key。

---

### [XDOC-017] HIGH — consistency — dev-plan 主卷依赖图缺 T-017 → T-030

- **category**: consistency
- **root_cause**: self-caused
- **location**: `dev-plan-wechat-flow.md` §2 Mermaid（`T-011 --> T-030`）；`dev-plan-wechat-flow-s4.md` T-030 `dependencies: [T-011, T-017]`、AC-005
- **description**: 分卷 T-030 已依赖 T-017 且 AC 要求 `composeRender → simulatePaste`；主卷 §2 依赖图仅有 `T-011 --> T-030`，缺 `T-017 --> T-030`。主卷 Sprint 4 任务表 T-030 依赖列仅写 `T-011`。
- **impact**: 按主卷 DAG 调度可能先排 T-030 后 T-017，导致复制功能未接粘贴模拟即验收；与 PRD F-004 AC-004 及 ARCH M-008 约束不一致。
- **suggestion**: 主卷 Mermaid 与任务表补 `T-017 --> T-030`；T-030 依赖列改为 `T-011,T-017`。

---

### [XDOC-018] HIGH — completeness — PRD 多形态交付物未在主卷显式定义

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow.md` §1.2；`prd-wechat-flow-f001-f014.md` F-013、F-010；`arch-wechat-flow.md` §6.1；`dev-plan-wechat-flow.md` Sprint 4–6
- **description**: 项目定位含 Web App + npm 包 + MCP + CLI + Skill。PRD 无「交付形态」表；`@wechat-flow/core` 是否必须作为 npm 对外发布未定义。ARCH/dev-plan 已规划 MCP/CLI/Skill/Relay，PRD 读者无法单独判断 npm 库是否为 P0 交付物。
- **impact**: tech-lead 与 deploy-spec 对发布单元理解分歧；F-013 AC-001「共享 use case」与 npm 包边界不清。
- **suggestion**: PRD §1 增交付形态表：Web 编辑器、npm core、MCP server、CLI、Skill bundle、Relay；标注 P0/P1 与最小 AC 引用。

---

### [XDOC-019] HIGH — consistency — ARCH quotaConfig 跨 API 与 DATA 不一致

- **category**: consistency
- **root_cause**: self-caused
- **location**: `arch-wechat-flow-api.md` API-028；`arch-wechat-flow-data.md` E-010
- **description**: API-028 使用 `requestsPerMinute` / `requestsPerDay` / `maxConcurrentJobs`；E-010 DDL 使用 `rpm` / `burstSize` / `monthlyJobCap`。M-009 rate-limit 中间件无单一字段来源。
- **impact**: `packages/contracts` 落地时类型分裂；admin 配额 UI（T-042）与 DB 迁移不一致。
- **suggestion**: `packages/contracts` 定义 `QuotaConfigSchema` 单源导出；API 与 E-010 全量对齐字段名。

---

### [XDOC-020] HIGH — consistency — 规则集包名三处不一

- **category**: convention
- **root_cause**: self-caused
- **location**: `arch-wechat-flow.md` §7.2 `packages/ruleset/` vs §1.4 `@wechat-flow/ruleset` vs M-003 `packages/wechat-spec/`；`dev-plan-wechat-flow-s2.md` T-013 标题 `wechat-spec`
- **description**: 目录树、npm 包名、M-003 实现路径、dev-plan 任务标题互相冲突。T-013 deliverables 与 ARCH M-003 路径可能指向不同包。
- **impact**: Monorepo 脚手架（T-001）与 Sprint 2 规则集任务可能创建错误包路径。
- **suggestion**: ARCH §8.2 决策锁定唯一包名（建议 `@wechat-flow/ruleset` 或 `@wechat-flow/wechat-spec`）；三文档 + dev-plan 任务卡全量替换。

---

### [XDOC-008] MEDIUM — completeness — F-012 AC-003 版本历史消费端缺失

- **category**: completeness
- **root_cause**: upstream-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-012 AC-003；`arch-wechat-flow-api.md` API-027；dev-plan 全卷（无 snapshots REST / 回滚 UI 任务）
- **description**: F-012 要求版本历史、回滚、差异对比；ARCH 有 API-027；dev-plan 无列出/恢复快照 REST、编辑器历史面板或 CLI 回滚任务。F-012 为 P2 且主卷标注不交付，但 AC-003 仍在分卷，与 ARCH 预留不对齐。
- **impact**: 若未来启用 F-012，缺少从 API 到 UI 的计划断层。
- **suggestion**: dev-plan §5.2 增 F-012 AC-003 `[DEFER v2]`；或增补 P2 占位任务含 `listSnapshots` / `rollbackTo` 可观测 AC。

---

### [XDOC-009] MEDIUM — consistency — F-011 视觉矩阵 vs dev-plan T-058 / T-VAL-06

- **category**: consistency
- **root_cause**: upstream-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-011 AC-004；`dev-plan-wechat-flow-s6.md` T-058、T-VAL-06
- **description**: PRD 要求 5 主题 × **所有** Block/Mark/variant story。T-058 v0.2.0 已改为动态枚举（`listBlocks() × variants`），但 T-VAL-06 仍写「≥40 个 .png（5 主题 × ≥8 场景）」作为通过条件之一，与 PRD 字面及 XDOC-002（variant 120）叠加后，门禁仍无法证明完整组件集覆盖。
- **impact**: 视觉回归通过 ≠ PRD §1.3 在完整 registry 上成立。
- **suggestion**: T-VAL-06 改为引用 T-058 动态计数 AC；核心矩阵每 PR 必跑，全量 variant 夜间 job（dev-plan R-004 已述，写入 T-058 AC）。

---

### [XDOC-021] MEDIUM — ambiguity — PRD F-006 宽度上限与 2.5MB 混用

- **category**: ambiguity
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-006 AC-002 与备注 `[ASSUMPTION]`
- **description**: AC-002 写「正文图**宽度**上限」；备注写按 **2.5MB** 处理。2.5MB 为文件大小非像素宽度，与 F-007 图片宽度规则及 implementer 压缩策略冲突。
- **impact**: T-033 sharp 预处理与 relay 配额策略可能实现错误。
- **suggestion**: 拆分为两个可观测阈值（maxWidthPx + maxFileSizeMb）或标注待 architect 实测后填入；ARCH M-010 同步。

---

### [XDOC-022] MEDIUM — completeness — ARCH Editor 侧 Hono RPC 契约空白

- **category**: completeness
- **root_cause**: self-caused
- **location**: `arch-wechat-flow.md` §6.1/§6.2「Hono RPC」；`arch-wechat-flow-api.md` §3.2 REST/MCP；与 [XDOC-016] 关联
- **description**: 多处声明 Editor 经 Hono RPC 连 Relay，但 API 分卷仅 REST（API-017..021）与 MCP，无 editor typed route 列表（上传、job 轮询、SSE）。
- **impact**: `apps/editor` 无法生成类型安全 client；与 [XDOC-016] 同属 P0 写作者路径缺口。
- **suggestion**: API 分卷增 §3.6 Editor RPC（复用 API-017..020 schema + session auth）；或删除 Hono RPC 表述改 REST-only。

---

### [XDOC-023] MEDIUM — design — M-003 applyRuleset vs M-004 simulatePaste 职责边界

- **category**: feasibility
- **root_cause**: self-caused
- **location**: `arch-wechat-flow-modules.md` M-003、M-004；PRD F-007、F-011 AC-002
- **description**: 二者均做 strip/transform，ARCH 未界定作者侧主动适配（pre-paste）与编辑器粘贴行为模拟（post-inline）的调用边界与共享规则子集。
- **impact**: 重复过滤或行为分叉；规则集 fixture 与粘贴模拟 fixture 维护成本上升。
- **suggestion**: ARCH §8.2 增决策：M-003=作者侧 ruleset；M-004=微信编辑器粘贴模拟；共享 `wechat-spec` strip 子集并文档化。

---

### [XDOC-024] MEDIUM — completeness — PRD F-011 P1 子能力 ARCH 模块归属弱

- **category**: completeness
- **root_cause**: upstream-caused
- **location**: PRD F-011 AC-006/007/008；`arch-wechat-flow-modules.md`；`dev-plan-wechat-flow-s6.md` T-089、T-090
- **description**: 可读性运行时检查、违规词、实地验证脚本在 PRD 为 P1。dev-plan 已有 T-089/T-090，ARCH 无对应 M-NNN / Diagnostic 扩展说明。
- **impact**: implementer 可能将 T-089 逻辑散落在 M-001 而非 M-003 ruleset。
- **suggestion**: M-003 增 `lint/readability.ts`、`lint/keywords.ts` 职责；或 §8.2 显式映射 F-011 AC-006..008 → M-003 + T-089/T-090。

---

### [XDOC-025] MEDIUM — consistency — ARCH Q3.9 黄金 fixture「5 篇」vs dev-plan T-057「≥10 场景」

- **category**: consistency
- **root_cause**: self-caused
- **location**: `arch-wechat-flow.md` §8.2 Q3.9 `tests/golden/inline-styled/`；`dev-plan-wechat-flow-s6.md` T-057
- **description**: ARCH 决策写 5 篇样本双向 SHA-256；T-057 要求 ≥10 个独立场景快照。路径与数量未对齐。
- **impact**: Sprint 6 确定性验收与 ARCH CI 门禁描述不一致。
- **suggestion**: 统一为 5 篇 PRD 典型样本 + 5 篇补充场景，或 Q3.9 改为「≥10 fixture，其中 5 篇为 PRD 锁定样本」。

---

### [XDOC-026] MEDIUM — feasibility — 四运行时一致性缺 browser 主线程

- **category**: feasibility
- **root_cause**: upstream-caused
- **location**: PRD F-013 备注；`arch-wechat-flow.md` §5.2、§7.3；`dev-plan-wechat-flow-s6.md` T-063
- **description**: PRD 要求 browser / Worker / Node / Edge 四运行时一致。T-063 与 T-VAL-06 覆盖 Node/Worker/Edge，缺编辑器主线程 SHA-256 对照。
- **impact**: 编辑器内 render 与 MCP/CLI 路径可能静默漂移。
- **suggestion**: T-063 增 Vitest browser 或 Playwright evaluate 第四 target；或 PRD `[ASSUMPTION]` 声明 v1 豁免主线程并同步 amend。

---

### [XDOC-027] MEDIUM — ac-observability — dev-plan 主观视觉 AC 残留

- **category**: ac-observability
- **root_cause**: self-caused
- **location**: `dev-plan-wechat-flow-s3.md` T-022；`dev-plan-wechat-flow-s4.md` T-VAL-04；`dev-plan-wechat-flow.md` §6
- **description**: 仍存在「明显不同」「目视判断」「视觉一致」等不可自动化措辞（相对 r3 DP-010 部分改善，T-058 已 pixelmatch）。
- **impact**: GREEN 阶段无法判定失败；与 T-058 基线脱节。
- **suggestion**: 统一改为 pixelmatch ≤0.05 或 computed style 断言；T-VAL-04 引用 T-058 子集。

---

### [XDOC-028] MEDIUM — convention — 三卷业务文档 frontmatter `status: draft`

- **category**: convention
- **root_cause**: self-caused
- **location**: PRD / ARCH / DEV-PLAN 全套 frontmatter；`CLAUDE.md` 项目状态写 prd/arch/dev-plan approved
- **description**: 文档元数据 `status: draft` 与 PROJECT-STATE / 用户认知「已通过 pre_dev 文档门禁」分裂，影响 doc-review 与变更追踪。
- **impact**: Layer 1 与 orchestrator 门禁判断歧义。
- **suggestion**: 审查闭环后 orchestrator 将已通过门禁的卷标为 `approved`，或注明 draft 仅表示待本轮 inline-fix。

---

### [XDOC-010] MEDIUM — redundancy — F-013 Tool 与 use case 双轨（r1 延续，已缓解）

- **category**: completeness
- **root_cause**: self-caused
- **location**: `dev-plan-wechat-flow-s5.md` T-079..T-084；`arch-wechat-flow-modules.md` M-009
- **description**: r1 描述 use case 已建、Tool 缺失。v0.2.0 已增 thin wrapper 任务与 R-007。残余风险：implementer 在 GREEN 阶段仍可能在 Tool 层重写业务逻辑。
- **impact**: Agent 路径与编辑器路径行为漂移（低概率，靠 code-review 捕获）。
- **suggestion**: 保持现状；code-review duplication 维度命中即 REFACTOR（R-007 已述）。

---

### [XDOC-011] LOW — completeness — PRD §4 ASSUMPTION 未列 F-012 协作后端

- **category**: completeness
- **root_cause**: upstream-caused
- **location**: `prd-wechat-flow.md` §4；`arch-wechat-flow.md` §6.2 YwsServer；`dev-plan-wechat-flow.md` R-005
- **description**: §4 汇总 F-005/F-006/F-013 服务端依赖，未列 F-012（y-websocket / 快照）。ARCH 拓扑仍含可选 YwsServer。
- **impact**: deploy-spec 可能遗漏协作进程（P2 场景）。
- **suggestion**: §4 增 F-012 可选依赖一行，或 ARCH 标注 YwsServer 仅 P2 启用。

---

### [XDOC-029] LOW — redundancy — PRD 性能指标多处重复

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow.md` §1.3/§3.1；F-001 AC-009；F-013 AC-006
- **description**: 万字 P95、主题切换、MCP 冷启动等数值在四处硬编码，§1.3 已部分引用 §3.1，功能 AC 仍重复。
- **suggestion**: 功能 AC 改为「满足 §3.1 性能表对应行」。

---

### [XDOC-030] LOW — ambiguity — F-010 ts-cli vs F-013 渲染 CLI 未区分

- **category**: ambiguity
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-010 备注 vs F-013 AC-003
- **description**: F-010 写 `ts-cli init/dev/validate/publish`（插件脚手架）；F-013 写面向 CI 的 Tool 契约 CLI。是否为同一二进制未说明。
- **suggestion**: 术语表区分 `pack-cli`（插件开发）与 `wechat-flow`（渲染 Tool CLI）；ARCH §6.1 同步。

---

### [XDOC-031] LOW — completeness — PRD 缺 US-NNN / NFR-NNN 全局 ID

- **category**: convention
- **root_cause**: self-caused
- **location**: PRD 全套
- **description**: F-NNN、局部 AC-NNN 有规范；用户故事与 NFR 无全局 ID，dev-plan `tdd_acceptance` 追溯依赖章节号。
- **suggestion**: 可选增 `US-001..`、`NFR-001..` 与框架 convention 对齐（非阻塞）。

---

## 设计合理性与任务分解评估（摘要）

| 维度 | 评估 |
|------|------|
| **架构设计** | Monorepo + 共享 core + 粘贴模拟 + 22 Tool + Relay 凭据隔离整体可行；风险在管线单次 simulate 边界（XDOC-015）与 Editor 鉴权（XDOC-016/022） |
| **PRD→ARCH** | F-001..F-014 均有 M 映射；P0 最大缺口为 Editor→Relay 与 F-001/F-014 语义冲突 |
| **ARCH→DEV** | v0.2.0 任务矩阵显著改善；Variant 120、主卷 DAG、Block 分期仍为结构性缺口 |
| **Sprint 分组** | Sprint 0–2 基础设施与管线合理；Sprint 3–4 组件/输出与 PRD 量化指标时间线需对齐（XDOC-001/002） |
| **AC 可观测性** | 多数任务卡已可测试；主观视觉措辞与 Variant 全局计数仍弱（XDOC-027、XDOC-002） |

---

## 必查项对照摘要（相对 r1）

| 必查项 | r1 | r2 |
|--------|----|----|
| Block ≥40 vs dev-plan | 未对齐（20/10） | **部分对齐**（Sprint 6 T-075≥40；Sprint 3 仅 25） |
| Variant ≥120 | 无全局 AC | **仍无** |
| F-013 22 Tool vs 任务 | 7/16 无任务 | **已对齐**（T-037..039 + T-080..084） |
| upload_to_wechat_asset | dev-plan 无 | **已有** T-077..079 |
| Skill bundle | ARCH/dev-plan 无 | **已有** T-085 + ARCH `skill/` |
| F-012 vs §4 非目标 | 多人协作冲突 | **主卷/计划已澄清**；分卷 AC-004 仍冲突 |
| M-014 phantom | 存在 | **已消除** |
| composeCopy → simulatePaste | 缺依赖 | **分卷已修**；**主卷 DAG 未修**（XDOC-017） |
| 中文排版自动 vs 手动 | （r1 未单列） | **三向冲突**（XDOC-013） |

---

## 统计

| 严重等级 | r1 开放 | r2 新增/延续 | r2 合计（开放） |
|----------|---------|--------------|-----------------|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 5+2* | 6 新 + 4 延续 | **10** |
| MEDIUM | 4 | 9 | **11** |
| LOW | 2 | 3 | **5** |
| **合计** | 11 | — | **26**（含 6 项 r1 已闭合不计入开放列） |

\* r1 统计含 XDOC-006/007/008 等；r2 仅计当前仍需处理的项。

**r2 开放 HIGH 清单（处理优先级）**: XDOC-013 → XDOC-014 → XDOC-015 → XDOC-016/022 → XDOC-017 → XDOC-002 → XDOC-001 → XDOC-005 → XDOC-018 → XDOC-019/020

---

## 建议修复责任分工

| 责任方 | 优先处理 ID |
|--------|-------------|
| product-manager | XDOC-013, XDOC-014, XDOC-005, XDOC-018, XDOC-021 |
| architect | XDOC-015, XDOC-016, XDOC-019, XDOC-020, XDOC-022, XDOC-023 |
| tech-lead | XDOC-001, XDOC-002, XDOC-017, XDOC-009, XDOC-027 |
| ui-designer | XDOC-013（ui-spec 自动加空格与 PRD 对齐） |
| orchestrator | XDOC-028（frontmatter status 与 PROJECT-STATE 对齐） |

---

## 与单文档审查的关系

本报告不重复以下单卷 Layer 2 的全部条目，仅保留**跨文档**或**三卷交叉**问题。单文档细节见：

- `docs/reviews/doc/REVIEW-prd-wechat-flow-r3.md`
- `docs/reviews/doc/REVIEW-arch-wechat-flow-r4.md`
- `docs/reviews/doc/REVIEW-dev-plan-wechat-flow-r3.md`

修订完成后建议运行 `cataforge docs index` 并发起 r3 跨文档审查（或 inline-fix 后标记本报告对应 ID 为已关闭）。
