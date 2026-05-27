---
id: "review-cross-doc-predev-r1"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data", "dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6"]
---
# 跨文档预开发审查：PRD × ARCH × DEV-PLAN（pre_dev r1）

**审查日期**: 2026-05-27  
**审查类型**: pre_dev 门禁 — Layer 1 脚本 + Layer 2 语义（4 路 reviewer 子代理，模型 composer-2.5-fast）  
**被审文档集**:

| 文档 | 版本 | 分卷 |
|------|------|------|
| prd-wechat-flow | 0.2.0 | prd-wechat-flow-f001-f014 |
| arch-wechat-flow | 0.3.0 | modules / api / data |
| dev-plan-wechat-flow | 0.1.2 | s0..s6 |

**子报告**（本轮并行产出，供增量追溯）:

- `REVIEW-arch-wechat-flow-r4.md` — ARCH 单卷 Layer 2  
- `REVIEW-dev-plan-wechat-flow-r3.md` — DEV-PLAN 全量 Layer 2  
- `REVIEW-xdoc-prd-arch-dev-plan-r1.md` — 跨文档专审（与本文高度重叠，本文为主卷合并版）

**历史基线**: PRD r3、ARCH r3、DEV-PLAN r2 均已 approved；本轮为 **pre_dev 增量**，重点验证三文档在指标、Tool 契约、模块编号、非目标边界上是否仍可执行。

---

## Layer 1 结论

| 文档 | 结果 | 主要 WARN |
|------|------|-----------|
| prd-wechat-flow（主卷） | PASS | AC 编号不连续（按 F 分域，可接受） |
| prd-wechat-flow-f001-f014 | PASS | 行数 304 > 300 |
| arch-wechat-flow（四卷） | PASS | 行数超阈值；API/E/M ID 分域跳号 |
| dev-plan-wechat-flow（主卷） | PASS | 行数超阈值；NAV 声明 T-074..T-093 缺号 |

Layer 1 无 FAIL；**语义缺口由 Layer 2 暴露**，不阻塞脚本门禁，但阻塞「按 PRD 成功指标无歧义验收」。

---

## 三态判定

**verdict: needs_revision**

| 严重等级 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 0 | — |
| HIGH | 12 | 指标/TR 链路、Tool 契约、产品边界 |
| MEDIUM | 14 | NFR 追溯、ARCH 细节、排期与 AC 可观测性 |
| LOW | 6 | 文档惯例、冗余、部署清单 |
| **合计** | **32** | 去重合并后；同类项已归并 |

**门禁建议**: 允许进入 `pre_dev` **人工讨论**，但 **不建议在未处理 HIGH 项前启动 Sprint 1 功能开发**；Sprint 0（Monorepo / 工具链 / Penpot）可并行，同时由 product-manager + tech-lead + architect 修订文档或显式 `[ASSUMPTION]` 分期。

**分文档建议 verdict**:

| 文档集 | verdict |
|--------|---------|
| PRD | needs_revision（§4 vs F-012；视觉/性能验收规范） |
| ARCH | needs_revision（22 Tool 计数；Skill bundle 形态） |
| DEV-PLAN | needs_revision（F/M→T 量化与 MCP 缺口） |
| **跨文档整体** | **needs_revision** |

---

## 设计合理性总评

| 维度 | 结论 |
|------|------|
| 架构风格 | Monorepo + 纯函数渲染 stage 链 + pack 扩展 + 多端壳 — **合理**，与 PRD 确定性/多形态交付对齐 |
| 模块划分 | M-001..M-013 职责清晰（UI / core / ruleset / relay / MCP / CLI）— **可落地** |
| 安全模型 | 凭据中继、插件 Worker 仅事件通道、iframe `sandbox=""` + CSP — **与产物零 JS 一致**（ARCH r3 已验） |
| 任务分解 | Sprint 0→6 + design/validation 任务 — **结构良好**；与 PRD 量化指标、F-013 Tool 全集 **系统性偏差** |
| 文档冗余 | F-001 `[DRAFT_UI_INPUT]`、PDF 非目标双处 — **可控**；「16 Tool」与 22 Tool  — **需消除** |

---

## 问题列表（按严重度）

### CRITICAL

（无）

---

### HIGH

### [R-001] HIGH: PRD Block ≥40 vs DEV-PLAN T-024 ≥20 vs Sprint 里程碑 ≥10

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `prd-wechat-flow` §1.3 / F-003 AC-006 要求内置 Block ≥ **40**；`T-024` AC-001 仅 ≥ **20**；主卷 Sprint 3 里程碑写 ≥ **10**。三处数字互不一致且均低于 PRD。
- **建议**: 统一为 PRD ≥40（或正式 amend PRD 后三文档同步）；增补 Sprint 4–6 Block 增量任务；修正 Sprint 3 里程碑与 T-024 AC 一致。  
- **来源**: XDOC-001 / DP-001 / PRD-4（矩阵规模）

---

### [R-002] HIGH: PRD Variant ≥120 在 DEV-PLAN 无全局可验收任务

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-003 AC-007 与 §1.3 要求 variant ≥ **120**；`T-024` 仅要求 `callout` variants ≥ 3，无 `listAllVariants().length` 类 AC，`T-058` 未绑定 variant 覆盖率。
- **建议**: 新增任务或扩展 T-024/T-048：全局 variant ≥120 + 核心 Block 最低分布；`T-VAL-06` 增加注册表断言。  
- **来源**: XDOC-002 / DP-002

---

### [R-003] HIGH: F-005 素材库上传 — PRD/ARCH 有、DEV-PLAN 无

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-005 AC-003、`upload_to_wechat_asset` Tool、ARCH API-016/API-018 均已定义；dev-plan 仅有图床 `T-033` 与 `upload_image`（T-039），无 `wechat-assets` 路由与素材库 MCP/relay 任务链。
- **建议**: 增补 relay uploader + M-008 compose + MCP Tool + validation smoke test。  
- **来源**: XDOC-007 / DP-003

---

### [R-004] HIGH: F-013 MCP Tool — PRD 枚举 22 个、ARCH 文档写 16 个、DEV 仅任务化 ~9 个

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-013 AC-002 列出约 **22** 个 tool；API 分卷正文覆盖 22 名，但 M-009/router/鉴权等多处写「**16 个 Tool**」。dev-plan T-037~039、T-045 未覆盖：`list_tokens`/`describe_token`、`list_block_variants`/`describe_variant`、`derive_palette`（Tool 面）、`simulate_paste`、`export_clipboard_payload`、`upload_to_wechat_asset` 等（约 **7** 个缺口）。`T-023`/`T-017`/`T-030` 已实现 use case 但未映射为 Tool 任务。
- **建议**: ARCH 全局改为「22 Tool（16 同步 + 6 异步）」；dev-plan 增补 Tool 薄包装任务簇，AC 声明调用 M-008/M-004/M-006，禁止重复业务逻辑。  
- **来源**: ARCH-001 / XDOC-003 / DP-005 / XDOC-010

---

### [R-005] HIGH: F-013 AC-003 Skill bundle — PRD 要求、ARCH/DEV 无交付物

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-013 AC-003 要求 MCP + **Skill bundle** + CLI 三分发；ARCH §6.1 无 Skill 部署单元；dev-plan 无 SKILL.md / 编排示例任务（grep 零命中）。
- **建议**: ARCH §6.1/§7.2 补 Skill bundle 路径；dev-plan 新增 Sprint 5/6 任务 + validation。  
- **来源**: ARCH-002 / XDOC-004 / DP-004

---

### [R-006] HIGH: PRD §4「不做实时多人协作」vs F-012 AC-004 CRDT vs DEV T-052~054

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: 主卷 §4 非目标排除「实时多人协作」；F-012 AC-004 要求「基于 CRDT 的多人协作」；dev-plan/ARCH 按 AC-004 实现 Yjs 双端协作（T-052 AC 含双客户端 ≤200ms 同步）。
- **建议**: PM 二选一并三文档同步：（A）§4 改为「v1 默认关闭、P2 可选」；（B）降级 AC-004 为架构预留、v1 不验收，调整 T-052 AC。  
- **来源**: XDOC-005 / PRD-1 / DP（隐含）

---

### [R-007] HIGH: F-004 AC-004 复制前粘贴模拟 — composeCopy 未串联 simulatePaste

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-004 AC-004 要求复制前跑粘贴过滤模拟；ARCH M-008 依赖 M-004；`T-030` 仅依赖 `T-011`，AC 未含 `simulatePaste`，依赖图 `T-011→T-030` 跳过 `T-017`。
- **建议**: `T-030` 增依赖 `T-017`；AC/deliverables 明确 `composeRender → simulatePaste → dual-MIME`。  
- **来源**: DP-006

---

### [R-008] HIGH: 粘贴/视觉「≤5% 像素差异」无可执行验收规范

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: §1.3、§3.4、F-004 AC-005 重复「≤5% 像素差异」，未定义算法、容差、样本 fixture；`T-VAL-04` 使用「目视判断」。
- **建议**: PRD 增「视觉一致性验收规范」；F-011/T-058/T-VAL 引用 Playwright pixelmatch 阈值与 5 篇样本路径。  
- **来源**: PRD-2 / DP-010

---

### [R-009] HIGH: 性能 NFR（50ms/200ms）无功能 AC 承接

- **category**: completeness
- **root_cause**: self-caused
- **描述**: §3.1 与 §1.3 锁定万字键入 P95 < 50ms、主题切换 < 200ms；F-001..F-003 无对应 AC（仅 F-013 MCP 800ms）。
- **建议**: F-001 或 F-011 增性能 AC；dev-plan 增 benchmark 任务或 Sprint VAL 门禁。  
- **来源**: PRD-3

---

### [R-010] HIGH: F-011 AC-004 全量 story 矩阵 vs Block/variant 低门槛 — CI 不可行或名不副实

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: F-011 要求 5 主题 × **所有** Block/Mark/variant story；结合 R-001/R-002 当前计划仅 20 Block、无 120 variant AC，`T-058` 仅 8 场景/主题、`T-VAL-06` 以 ≥40 张 png 通过。
- **建议**: PRD 分层：P0 核心矩阵 + P1 全量 variant；dev-plan T-058 按 registry 动态生成 story。  
- **来源**: PRD-4 / XDOC-009

---

### [R-011] HIGH: dev-plan 引用 phantom 模块 M-014

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: `T-043` 标注 M-014；ARCH 仅 M-001..M-013，`packages/zh-typo` 由 M-008 消费。
- **建议**: T-043 改为 `relates_to: [F-014, M-008]`；或 architect 正式增补 M-014。  
- **来源**: ARCH-003 / XDOC-006

---

### [R-012] HIGH: （归并项）ARCH「16 Tool」与 PRD/API 22 Tool — 实施范围误判风险

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 与 R-004 同源；单独强调对 scope-guard、契约测试、OpenAPI 生成的系统性影响。
- **建议**: 见 R-004。  
- **来源**: ARCH-001

---

### MEDIUM

### [R-013] MEDIUM: F-003 AC-008/009/010 — 装饰资产、上下文敏感渲染、paint 配色 UI

- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-020 仅 `assets` 骨架；T-029 覆盖 frontmatter paint/base-color 管线，无「自定义配色」drawer UI；无 heading 上下文敏感渲染任务。
- **建议**: Sprint 3/6 拆分 UI + 渲染任务，AC 引用 F-003 AC-008..010。  
- **来源**: DP-007

---

### [R-014] MEDIUM: F-011 AC-007/008 — 违规词检测、实地验证脚本无任务

- **category**: completeness
- **root_cause**: self-caused
- **描述**: P1 AC 无任务；R-002 风险表引用 AC-008 作缓解但未任务化。
- **建议**: Sprint 6 增补或标 defer + PRD 修订。  
- **来源**: DP-008

---

### [R-015] MEDIUM: F-008 P1 — T-073 P2 骨架，缺每主题 ≥2 模板

- **category**: consistency
- **root_cause**: self-caused
- **描述**: F-008 AC-002 要求每内置主题 ≥2 内容模板；T-073 仅市场骨架。
- **建议**: 提升优先级并增 template seed 任务。  
- **来源**: DP-009 / ARCH-004

---

### [R-016] MEDIUM: F-012 AC-003 版本历史/回滚 — API-027 有、DEV 仅后台快照写入

- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-052 验收 Y.Doc 快照写入，无 REST/UI/回滚 AC。
- **建议**: 增补 snapshots API + 历史 UI 或 CLI；或弱化 F-012 AC-003。  
- **来源**: XDOC-008

---

### [R-017] MEDIUM: 四运行时一致性 — PRD/ARCH 四端 vs T-063 三 target

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD §3.3 / F-013 要求含浏览器主线程；ARCH §7.3 写 cross-runtime 三 target + e2e 间接覆盖；T-063 无 browser 主线程 SHA-256。
- **建议**: T-063 增第四 target 或 PRD/ARCH 声明 v1 豁免并 `[ASSUMPTION]`。  
- **来源**: ARCH-006 / DP-011 / PRD（跨运行时）

---

### [R-018] MEDIUM: P0 写作体验（双向高亮、撤销/查找）挤在 Sprint 6

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: F-001 P0 AC-004/006 对应 T-065/T-066 在 Sprint 6；Sprint 1 VAL 无法覆盖核心写作 AC。
- **建议**: 部分前移至 Sprint 1–2 或调整 PRD 优先级。  
- **来源**: （主会话审查 / DP 排期）

---

### [R-019] MEDIUM: F-003 Block/Mark 枚举清单与数值阈值未绑定

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: AC-006 枚举约 30 种 Block 要求 ≥40；AC-005 枚举 13 种 Mark 要求 ≥11 — 可机械凑数过线。
- **建议**: 发布 P0 必含 Block/Mark 具名清单。  
- **来源**: PRD-6 / PRD-11

---

### [R-020] MEDIUM: F-012 云端安全基线未在 PRD §3.2 覆盖

- **category**: security
- **root_cause**: self-caused
- **描述**: 协作/同步上云无加密、鉴权、租户隔离 NFR；§3.2 仅 AppID/API key/沙箱/XSS。
- **建议**: §3.2 增云端文稿安全基线；F-012 AC 引用。  
- **来源**: PRD-9

---

### [R-021] MEDIUM: §3.4 Firefox 剪贴板降级 — F-004 无 AC

- **category**: completeness
- **root_cause**: self-caused
- **描述**: §3.4 要求 Firefox 移动端降级；F-004 仅 Clipboard API + 手势。
- **建议**: F-004 增 fallback AC；T-055 已部分覆盖可交叉引用。  
- **来源**: PRD-10

---

### [R-022] MEDIUM: §4 ASSUMPTION 未列 F-012 服务端依赖

- **category**: completeness
- **root_cause**: self-caused
- **描述**: §4 枚举 F-005/F-006/F-013 后端依赖，未列 F-012 y-websocket；ARCH §6.2 含 YwsServer。
- **建议**: §4 补充 F-012；deploy-spec 前置。  
- **来源**: XDOC-011

---

### [R-023] MEDIUM: MCP API-016 `jobId` 无 uuid 约束

- **category**: convention
- **root_cause**: self-caused
- **描述**: REST 202 已用 uuid；MCP 长任务 `jobId` 仍为裸 string，与 E-008 不一致。
- **建议**: API-016 统一 `z.string().uuid()`。  
- **来源**: ARCH-005

---

### [R-024] MEDIUM: M-007 Worker 网络隔离缺 bundler/Comlink 兜底说明

- **category**: security
- **root_cause**: self-caused
- **描述**: `delete fetch` 策略未声明 polyfill 检测与启动断言。
- **建议**: §5.3/M-007 补充集成测试与依赖禁令。  
- **来源**: ARCH-007

---

### [R-025] MEDIUM: juice / css-inline 未锁定 — 影响确定性

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: §1.4 两库 implementer 择优，与 §5.2 字节级一致承诺可能冲突。
- **建议**: §8.2 决策锁定 + 黄金 fixture。  
- **来源**: ARCH-008

---

### [R-026] MEDIUM: Token ≥60 未进 PRD §1.3 成功指标

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-003 AC-004 要求 ≥60 token；顶层 KPI 表未收录（T-021 AC 已覆盖实现侧）。
- **建议**: §1.3 增行或备注 token 仅作 F-003 内部 AC。  
- **来源**: PRD-5

---

### LOW

### [R-027] LOW: dev-plan NAV「T-001..T-094」与实际 T-073 不符

- **category**: convention
- **root_cause**: self-caused
- **描述**: Layer 1 持续 WARN 缺 T-074..T-093。
- **建议**: 修正 NAV 为 `T-001..T-073` + DS/VAL 说明。  
- **来源**: DP-012 / XDOC-012

---

### [R-028] LOW: Sprint 3 里程碑 Block ≥10 vs T-024 ≥20

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: dev-plan 主卷内部两级落差（叠加 R-001）。
- **建议**: 里程碑对齐 T-024。  
- **来源**: XDOC-012 / DP-013

---

### [R-029] LOW: PDF 非目标 — §4 与 F-004 备注重复

- **category**: convention
- **root_cause**: self-caused
- **建议**: F-004 备注改为「见主卷 §4」。  
- **来源**: PRD-12

---

### [R-030] LOW: `get_ruleset_version.builtAt` 可能影响快照回归

- **category**: completeness
- **root_cause**: self-caused
- **建议**: 注明不参与确定性 AC；或改为确定性字段。  
- **来源**: ARCH-010

---

### [R-031] LOW: F-008 八类场景无 ARCH 模板清单

- **category**: completeness
- **root_cause**: self-caused
- **建议**: M-005 或 §8.2 补内置模板 ID 表。  
- **来源**: ARCH-011

---

### [R-032] LOW: T-038 deliverables 与 tdd_acceptance 不对齐

- **category**: convention
- **root_cause**: self-caused
- **描述**: deliverables 含 describe-mark 等，tdd_acceptance 未全覆盖。
- **建议**: 对齐 tdd_acceptance 列表。  
- **来源**: DP-014

---

## 必查项对照（用户指定）

| 必查项 | 状态 | 主问题 ID |
|--------|------|-----------|
| 设计是否合理 | 架构合理；指标与计划偏差见 R-001~R-012 | — |
| 任务分解是否合理 | Sprint 结构合理；量化/MCP/复制链路见 R-001~R-007 | — |
| Block 40 vs 20/10 | **未对齐** | R-001, R-028 |
| Variant 120 | **无任务** | R-002 |
| F-013 Tools vs T-037~045 | **~7 Tool 缺口 + 16/22 计数** | R-004, R-012 |
| upload_to_wechat_asset | **DEV 缺失** | R-003 |
| Skill bundle | **ARCH/DEV 缺失** | R-005 |
| F-012 vs §4 非目标 | **冲突** | R-006 |
| M-014 vs M-001..013 | **phantom** | R-011 |
| 缺失/冗余/矛盾 | 见上表 32 项 | — |

---

## 修订优先级（给 orchestrator / 人工 pre_dev）

| 优先级 | 动作 | 责任 |
|--------|------|------|
| P0 | 统一 Block/variant 数字或 amend PRD + 补 dev-plan 任务 | product-manager + tech-lead |
| P0 | 闭合 F-013：22 Tool 计数 + Tool 任务簇 + Skill bundle | architect + tech-lead |
| P0 | 决议 F-012 vs §4；素材库上传链路 | product-manager |
| P1 | T-030 串联 T-017；性能/5% 视觉验收规范 | tech-lead |
| P1 | M-014 命名；MCP jobId uuid；四 runtime 测试矩阵 | architect |
| P2 | MEDIUM/LOW 项在 Sprint 0 并行消化或标 defer | tech-lead |

---

## 统计汇总

| 严重等级 | 数量 |
|----------|------|
| CRITICAL | 0 |
| HIGH | 12 |
| MEDIUM | 14 |
| LOW | 6 |

**closed-by**: reviewer 子代理（composer-2.5-fast）×4 + orchestrator 合并起草 `REVIEW-cross-doc-predev-r1`
