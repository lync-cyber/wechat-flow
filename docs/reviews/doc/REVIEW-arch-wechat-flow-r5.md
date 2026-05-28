---
id: "review-arch-wechat-flow-r5"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data"]
---
# ARCH 文档 Layer 2 语义审查报告 — wechat-flow r5

**被审文档**: arch-wechat-flow **0.6.1**（主卷）+ arch-wechat-flow-modules 0.6.1 + arch-wechat-flow-api 0.6.1 + arch-wechat-flow-data 0.6.1

**上游依赖**: `docs/prd/prd-wechat-flow.md`（0.5.1）、`docs/prd/prd-wechat-flow-f001-f014.md`

**交叉对照**: `docs/ui-spec/ui-spec-wechat-flow*.md`（0.2.1）、`docs/dev-plan/dev-plan-wechat-flow*.md`（0.4.1）

**审查模式**: 全量 Layer 2；Layer 1 四卷均 exit 0（主卷 + modules/api/data 分卷 PASS，共 11 条 WARN：行数超 300、跨卷 ID 编号不连续）

**历史基线**: r4（0.3.0）已闭环 Tool 计数 16→23、Skill bundle、jobId uuid、juice 锁定、iframe 沙箱、M-007 assertNetIsolation 等；本轮对 0.6.1 增量（template/Q3.14、nodeChangeRecords、API-033、E-011）做重点回归，不重复开已修复项。

---

## Findings

### Critical

（无）

---

### High

#### [ARCH-001] §8.1 F→M 覆盖表仍将 F-005 标为 P1，与 PRD 0.5.1 升 P0 不一致

- **严重度**: High
- **category**: consistency
- **root_cause**: upstream-caused（PRD 已修订，ARCH 附录未同步）
- **证据**: `docs/arch/arch-wechat-flow.md` §8.1 F→M 覆盖表 F-005 行；`docs/prd/prd-wechat-flow.md` §2 功能列表（F-005 P0）；`docs/prd/prd-wechat-flow-f001-f014.md` F-005 AC-001/002/004（P0, v1）
- **问题描述**: PRD 已将长图/封面/异步 job 升为 P0 v1 交付，Relay 亦标 P0。ARCH §6.1/§6.3、API-032 maps_to、M-010 职责已按 P0 写作者路径规划 Headless + Relay，但 §8.1 覆盖表仍写 `F-005 | … | P1`，与 PRD 优先级矩阵矛盾。
- **影响**: Sprint 排期、门禁 scope、F→M 追溯表会被误读为 v1 可延后；与 dev-plan Sprint 4（T-091 Editor Session、长图 job）P0 编排冲突。
- **修复建议**: §8.1 F-005 优先级改为 P0；可选在 §6.1 Editor SPA 行补充「P0 含 F-005 AC-001/002/004（经 Relay）」与 PRD §1.2.2 最小 AC 边界对齐说明。

---

#### [ARCH-002] 兼容性 Diff 面板数据源绑定 M-003 规则集变更，与 PRD 粘贴模拟语义冲突

- **严重度**: High
- **category**: consistency
- **root_cause**: self-caused（0.6.0 template 修订引入 nodeChangeRecords 时未回写 PRD 或保留双通道）
- **证据**:
  - `docs/arch/arch-wechat-flow-modules.md` M-001 DiagnosticsPanel / CompatibilityDiffView → 消费 `DiagnosticReport.nodeChangeRecords`（M-003）
  - `docs/arch/arch-wechat-flow-modules.md` M-004 → `simulatePaste` 产出 `nodeDiffs`
  - `docs/arch/arch-wechat-flow-data.md` E-008 → `nodeDiffs`（M-004，F-002 AC-006）与 `nodeChangeRecords`（M-003）并存
  - `docs/prd/prd-wechat-flow-f001-f014.md` F-002 备注「兼容性报告是 F-011 **粘贴过滤模拟**产物的可视化」；F-011 AC-002「**粘贴过滤模拟**…作为兼容性详情面板的核心可视化数据」
  - `docs/ui-spec/ui-spec-wechat-flow-c001-c014.md` C-013.1 声明数据来自 M-003 `nodeChangeRecords`
- **问题描述**: PRD 明确要求兼容性详情展示「**粘贴**前后」逐节点对照（M-004 simulatePaste）；ARCH 0.6.1 将 C-013.1 CompatibilityDiffView 唯一数据源改为 M-003 规则集执行期的 `nodeChangeRecords`（strip/clamp/transform/patch）。二者阶段不同：M-003 在 render 管线内（Q3.13 与 M-004 边界已分），M-004 仅在 composeCopy / simulate_paste 路径。预览态（postPaste:false）不会跑 M-004，却可能展示 M-003 变更——无法满足 F-002 AC-006「粘贴前后」语义，也与 F-004 AC-004/005 复制路径的 simulatePaste 验收脱节。
- **影响**: implementer 按 ARCH 实现将导致兼容性面板在 PRD/F-011 门禁下不可验收；dev-plan T-002（M-004 nodeDiffs）与 T-003（CompatibilityDiffView 绑 nodeChangeRecords）存在任务级分裂。
- **修复建议**: 二选一并在 ARCH/PRD/ui-spec/dev-plan 四方同步：(A) CompatibilityDiffView 改绑 M-004 `nodeDiffs`（预览态可选懒加载 simulatePaste），nodeChangeRecords 仅服务规则命中列表；(B) 若产品确认「预览态展示规则集变更即可」，则修订 PRD F-002 备注/AC-006 与 F-011 AC-002 措辞，并删除 E-008 中易误导的 `nodeDiffs` 字段或标注废弃。

---

#### [ARCH-003] `defineTemplate` API 签名 `render` 与 TemplateDef/E-011 `markdown` 字段不一致

- **严重度**: High
- **category**: ambiguity
- **root_cause**: self-caused
- **证据**:
  - `docs/arch/arch-wechat-flow-modules.md` M-005 → `defineTemplate({ themeId, templateId, render })`
  - 同文件 TemplateDef → `markdown: string`
  - `docs/arch/arch-wechat-flow-data.md` E-011 → `markdown` 字段
  - `docs/arch/arch-wechat-flow.md` §8.2 Q3.14 → 仍写 `render`
  - `docs/dev-plan/dev-plan-wechat-flow-s4.md` T-092 AC-001 → 使用 `markdown` 参数
- **问题描述**: 注册 API、实体 schema、dev-plan AC 三处参数名/类型不统一。`render` 暗示函数回调，`markdown` 暗示静态字符串；PRD F-008 AC-001 沿用 `render`，加剧歧义。
- **影响**: M-005 实现与 contracts `TemplateDefSchema`、主题 pack 文件格式（`templates/{id}.md`）无法定稿；CLI validate / 9 维守护输入契约模糊。
- **修复建议**: 统一为 `markdown: string`（与 E-011、文件落盘一致），删除 `render` 回调签名；同步修订 PRD F-008 AC-001 与 §8.2 Q3.14。若需动态生成，明确 `render?: () => string` 为可选且与静态 `markdown` 互斥。

---

### Medium

#### [ARCH-004] Editor Session 续期端点未作为正式 API 条目定义

- **严重度**: Medium
- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/arch/arch-wechat-flow-api.md` §3.6 API-032 behavior 第 2 条 → `POST /api/v1/editor/session/refresh`；同节仅定义 `POST /api/v1/editor/session`；dev-plan T-091 AC-003 依赖 refresh 路由
- **问题描述**: 续期是 Editor JWT 生命周期的必要路径（≤15min + exp 前 1min 续期），但 API 分卷无 request/response schema、错误码、与 sessionId 吊销语义。
- **影响**: M-010 `auth/editor-session.ts` 与 contracts `relay/route-contracts.ts` 易漏实现；与 API-032 主入口不对等。
- **修复建议**: 增补 **API-032b** 或同级条目 `POST /api/v1/editor/session/refresh`：Bearer 旧 JWT、响应 schema 同 API-032 200、401/403 错误码、grace 期旧 JWT 可用规则。

---

#### [ARCH-005] Job 结果对象存储缺乏架构层抽象

- **严重度**: Medium
- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/arch/arch-wechat-flow.md` §6.3 Job Worker →「写结果到**对象存储**后回写 Job 记录」；`docs/arch/arch-wechat-flow-modules.md` M-010 `headless/playwright-pool.ts` 同述；E-005 `result` 仅为 `TEXT (JSON)` 无 storageRef 字段
- **问题描述**: 长图/封面 PNG 可能达数 MB，架构声明写对象存储，但无 StorageProvider 接口、bucket 配置、local dev 回退（dev-plan T-032 仅写 `public/exports/`）、result JSON 中 URL 字段 schema。
- **影响**: devops deploy-spec 与 implementer 对 Job.result 形状各自猜测；多 Worker 实例间文件可见性未定义。
- **修复建议**: §6.3 或 M-010 增「对象存储抽象」：`StorageBackend`（local/fs | s3-compatible）、`Job.result` 统一 schema `{ artifactUrl, mimeType, sizeBytes, storageKey? }`；local 模式约定路径前缀。

---

#### [ARCH-006] 跨 runtime 测试中 Worker target 仍用 happy-dom 模拟，验证可信度不足

- **严重度**: Medium
- **category**: feasibility
- **root_cause**: self-caused
- **证据**: `docs/arch/arch-wechat-flow.md` §5.2 → 四运行时（浏览器主线程 / Web Worker / Node / Edge）字节级一致；§7.3 → worker target 为 `vitest --environment happy-dom` + Worker harness（非真实 browser worker 或 `@vitest/browser` worker 模式）
- **问题描述**: r4 ARCH-006 中「缺少 browser-main target」已在 0.6.1 通过 Vitest browser mode 补充；但 **Worker runtime** 仍非 PRD §3.3 字面意义的浏览器 Web Worker，happy-dom 与 V8 isolate/workerd 行为差异可能漏检 §5.2 确定性规范违规。
- **影响**: F-013 AC-001 / PRD §3.3 跨 runtime 门禁可能在生产 Worker 沙箱（M-007）才暴露差异。
- **修复建议**: §7.3 矩阵将 worker 行改为 `@vitest/browser` WebWorker 或 Playwright `page.evaluate` + `new Worker(blob)`；或显式 `[ASSUMPTION]` 声明 happy-dom harness 为 CI 近似并补充 nightly 真实 browser worker 矩阵。

---

#### [ARCH-007] E-009 YDocSnapshot.docId 引用客户端 Document，服务端 ACL 语义缺失

- **严重度**: Medium
- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: `docs/arch/arch-wechat-flow-data.md` E-009 `docId FK→Document`；E-001 Document 仅 IndexedDB 客户端；API-026 docId ACL「仅 docId 所属用户/团队 apiKeyId 可连」未定义 docId 如何在服务端注册/绑定
- **问题描述**: 可选拓扑 F-012 保留设计下，服务端 YDocSnapshot / y-websocket 需 docId，但 Document 实体无服务端镜像或 ownership 表；API-026 403 条件无法落地。
- **影响**: 后续激活 F-012 需返工数据模型；当前虽标注不部署，但接口与 ER 图已对外暴露给 dev-plan。
- **修复建议**: ER 图标注 Document 客户端专属；增服务端 `DocumentRef { docId, ownerRef, apiKeyId }` 轻量表或 `[ASSUMPTION]` 声明 F-012 启用前 docId 由首次 sync 握手注册；API-026 ACL 指向该表。

---

#### [ARCH-008] 第三方 template pack 扩展点仅声明性描述，缺少 manifest 契约

- **严重度**: Medium
- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/arch/arch-wechat-flow-modules.md` M-005 职责「扩展点支持第三方主题与 template pack 注册」；E-003 Pack manifest 无 template 数组字段；PRD F-008 备注模板市场插件化由 architect 规划
- **问题描述**: 内置 template 路径清晰（`themes/*/templates/*.md` + E-011），但第三方 template 如何随 plugin/theme pack 发布、与 M-007 沙箱边界、版本化及 `validateTemplateCoverage` 触发点均未定义。
- **影响**: v1 若仅内置 template 可接受；与 F-010 插件体系、ui-spec P-003「可扩展更多 template」的长期叙事不一致，tech-lead 无法拆分 pack 级 template 任务。
- **修复建议**: M-005 增「第三方 template pack」小节：E-003 manifest 增 `templates[]` 或约定 theme pack 内 `templates/` 目录；加载路径经 M-007 validate 后注册；或 §8.2 `[ASSUMPTION]` 声明 v1 仅内置 + 回写 PRD F-008 备注。

---

#### [ARCH-009] API-033 响应 `coveredElements` 结构与 M-005 `CoverageReport` 字段不对齐

- **严重度**: Medium
- **category**: convention
- **root_cause**: self-caused
- **证据**:
  - `docs/arch/arch-wechat-flow-api.md` API-033 → `coveredElements: { baseElements[], coreBlocks[] }`
  - `docs/arch/arch-wechat-flow-modules.md` M-005 CoverageReport → 顶层 `coveredElements[]` / `missingElements[]` / `coveredBlocks[]` / `missingBlocks[]`
  - dev-plan T-092 AC-006 期望 `{ themeId, templateId, markdown, metadata }` 与 API-033 schema 亦不一致
- **问题描述**: 同一概念三套形状；MCP Tool 与包级 API、contracts schema 无法单源。
- **影响**: `describe_template` Tool 与 `validateTemplateCoverage` 返回值需手工映射，易 drift。
- **修复建议**: 以 M-005 `CoverageReport` 或 API-033 其一为权威，contracts `describeTemplateResponseSchema` 复用 `CoverageReportSchema`；dev-plan AC 同步。

---

#### [ARCH-010] 与 dev-plan T-004 的 Tool schema 数量漂移（交叉文档风险）

- **严重度**: Medium
- **category**: consistency
- **root_cause**: downstream-caused（dev-plan 未随 0.6.1 更新）
- **证据**: ARCH M-012 / API 分卷 → 23 Tool；`docs/dev-plan/dev-plan-wechat-flow-s0.md` T-004 deliverables →「16 个 Tool 的 request/response Zod schema 骨架」
- **问题描述**: ARCH 已统一 23 Tool，Sprint 0 任务卡仍写 16，contracts 骨架范围偏小。
- **影响**: T-004 GREEN 后 Sprint 4/5 大量补 schema 返工；非 ARCH 正文错误，但 ARCH 消费者 dev-plan 未对齐。
- **修复建议**: dev-plan T-004 改为 23 Tool（或「16+7 占位，Sprint 4 前补全」并引用 ARCH §3 对账段）；ARCH 无需改，审查侧记录交叉风险。

---

### Low

#### [ARCH-011] M-001 未文档化 P-003 `/themes` 路由与 ui-spec 导航约定

- **严重度**: Low
- **category**: completeness
- **root_cause**: self-caused
- **证据**: M-001 含 `ThemeMarketGallery`；ui-spec P-003 `/themes`、`history.replace`、空文档跳转；ARCH 无 editor 路由表
- **问题描述**: 页面级路由与 ARCH 模块边界（M-001 展示 vs M-005 数据）仅在 ui-spec 定义，ARCH 未给 apps/editor 路由索引。
- **影响**: 纯 ui-spec 可实施，但 ARCH→代码追溯链不完整。
- **修复建议**: M-001 增「Editor 路由」子节：`/` → P-001、`/themes` → P-003（ThemeMarketGallery 宿主），引用 ui-spec P-003。

---

#### [ARCH-012] 主卷/分卷行数持续超 DOC_SPLIT_THRESHOLD_LINES（Layer 1 WARN）

- **严重度**: Low
- **category**: convention
- **root_cause**: self-caused
- **证据**: Layer 1 — 主卷 429 行、modules 400、api **1032**、data 455（阈值 300）
- **问题描述**: api 分卷超 3 倍阈值，doc-nav 加载 token 压力大；属文档工程问题非设计缺陷。
- **影响**: Agent context 预算、按需加载效率。
- **修复建议**: 按 §3 子节拆 api 分卷（如 api-mcp / api-relay / api-admin）或 doc-gen 自动拆分。

---

#### [ARCH-013] §8.2 决策记录与 M-005 template 章节内容高度重复

- **严重度**: Low
- **category**: convention
- **root_cause**: self-caused
- **证据**: Q3.14 与 modules M-005 template 命名空间 / 注册 API / 9 维守护大段重叠
- **问题描述**: 双处维护增加修订漂移概率（如 Q3.14 仍写 `render` 而 TemplateDef 写 `markdown`）。
- **影响**: 文档维护成本。
- **修复建议**: Q3.14 压缩为决策摘要 + 指向 modules M-005 唯一权威段落。

---

## Open Questions

1. **兼容性 Diff 产品语义**：C-013.1 应展示「规则集执行变更」（M-003）还是「粘贴模拟变更」（M-004），或两者分 Tab？当前 PRD 与 ARCH 0.6.1 答案相反，需产品确认后再改文档（关联 ARCH-002）。

2. **`defineTemplate` 参数模型**：template 是否仅为静态 Markdown 文件，还是需要 `render()` 动态生成？若仅静态，PRD/ARCH/dev-plan 是否统一改为 `markdown`（关联 ARCH-003）？

3. **F-005 P0 与 PRD §1.2.2 Web SPA「最小 AC = F-001..F-004」**：长图/封面菜单（F-001 次级菜单）是否强制纳入 Web SPA P0 最小集？ARCH §6.1 已假设 Editor 调 Relay，但 PRD 交付形态表未扩最小 AC——是否在 PRD 或 ARCH §6.1 显式闭合（关联 ARCH-001）？

4. **F-012 启用时 docId 服务端注册模型**：是否在 v1 预留 `document_refs` 表，还是维持纯客户端 docId + 首次 WS 握手注册（关联 ARCH-007）？

5. **v1 第三方 template**：是否明确「仅内置 5 主题 template，第三方延至 post-MVP」，以避免 M-005 扩展点过度设计（关联 ARCH-008）？

---

## Overall Assessment

**结论**: `needs_revision`

**理由**: 存在 **3 项 High**（F-005 优先级漂移、兼容性 Diff 与 PRD 粘贴模拟语义冲突、defineTemplate/markdown 契约分裂），均直接影响 Sprint 0–4 实现边界与 PRD/F-011 门禁可验收性。架构主体（monorepo + 共享 core、M-002↔M-012 解耦、23 Tool 对账、Skill bundle、Editor JWT、确定性规范、iframe 沙箱）在 0.6.1 已较 r4 显著成熟，Layer 1 全绿。

**相对 r4 的改进（回归确认，不开项）**: Tool 23（19+4）全库一致；API-016 jobId uuid；Skill bundle §6.1 + `skill/`；M-007 assertNetIsolation；juice Q3.9 锁定；browser-main 纳入 §7.3 矩阵；F-008 template 模型 Q3.14 + API-033 + E-011；M-014 已收敛为 dev-plan「M-008 依赖包」。

**建议修订顺序**: (1) ARCH-002 + ARCH-003 与 PRD/ui-spec 联合定稿 → (2) ARCH-001 §8.1 优先级 → (3) ARCH-004/009 API 补全与 schema 对齐 → (4) dev-plan T-004/T-092 跟随 ARCH 同步（ARCH-010）。

---

## 审查焦点摘要

| 焦点 | 结论 |
|------|------|
| 模块边界 / 接口契约 | M-001..M-013 边界清晰；M-002↔M-005 经 M-012 解耦合理；M-004 与 M-003 分责（Q3.13）明确，但与 UI 数据绑定冲突（ARCH-002） |
| 数据模型 | E-001..E-011 覆盖主流程；E-008 双 diff 字段与 UI 消费不一致；E-009 客户端/服务端 docId 断层 |
| 非功能 / 可扩展性 | §5.2 确定性规范可执行；§5.3 安全链完整；pack/template 第三方扩展仍薄 |
| PRD 一致性 | F-005 P0 未回写 §8.1；粘贴模拟 vs 规则集 Diff 语义冲突 |
| UI-SPEC 一致性 | C-013.1 与 ARCH 一致但与 PRD 冲突；P-003 路由 ARCH 未索引 |
| DEV-PLAN 一致性 | T-004 16 Tool、T-092 describe_template 响应形状与 ARCH 0.6.1 漂移 |
