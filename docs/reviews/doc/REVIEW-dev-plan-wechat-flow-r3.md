---
id: "review-dev-plan-wechat-flow-r3"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6", "prd-wechat-flow", "arch-wechat-flow"]
---
# 审查报告：dev-plan-wechat-flow（r3 全量 Layer 2）

**被审文档**: dev-plan-wechat-flow（主卷 v0.1.2）+ Sprint 0..6 分卷（共 8 文件）  
**审查类型**: r2 → r3 全量 Layer 2（F/M→T 覆盖 · Sprint/P0 · 依赖/tdd_acceptance · PRD/ARCH 一致性 · ac-observability）  
**Layer 1**: 主卷 PASS（2 WARN：行数超阈值、T-074..T-093 缺号）；r2 已知结构/tdd_acceptance 问题已闭合  
**上游对照**: prd-wechat-flow + prd-wechat-flow-f001-f014 · arch-wechat-flow + arch-wechat-flow-modules + arch-wechat-flow-api  

---

## 问题列表

### [DP-001] HIGH: F-003 Block 数量阈值与 PRD 严重偏离且无补全任务

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-003 AC-006 要求内置 Block ≥ 40；主卷 Sprint 3 唯一承载任务 T-024 目标为「≥ 20 个」，AC-001 同样以 20 为门槛。Sprint 6 视觉回归（T-058）依赖 Block 矩阵，但未安排将 Block 从 20 扩至 40 的补全任务。按当前计划 Sprint 3 结束即无法兑现 PRD P0 指标。
- **建议**: 将 T-024 门槛改为 ≥ 40 并扩展 deliverables 清单；或新增 Sprint 3/6 补全任务（如 T-074 blocks 补全），AC 显式引用 F-003 AC-006 所列 Block 类型覆盖。

---

### [DP-002] HIGH: F-003 Variant ≥ 120 无任务覆盖

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-003 AC-007 要求内置 variant ≥ 120（集中在 callout/quote/steps 等核心 Block）。T-024 AC-002 仅以 `callout` variants ≥ 3 为验收，无全局 variant 计数任务，T-048 仅覆盖插件 `defineVariant` 扩展点。PRD 主卷成功指标亦写「内置 Variant 皮肤数 ≥ 120」。
- **建议**: 新增 feature 任务（可挂 Sprint 3 末或 Sprint 6 前）：`listVariants()` 全局计数 ≥ 120；按 PRD 列出的核心 Block 分配 variant 配额；T-058 视觉回归矩阵须覆盖 variant 维度。

---

### [DP-003] HIGH: F-005 AC-003 公众号素材库上传链路缺失

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-005 AC-003 与 ARCH M-010 `wechat-asset/uploader.ts`、M-008 `composers/upload-wechat-asset.ts`、API `POST /api/v1/wechat-assets/upload`、MCP Tool `upload_to_wechat_asset` 均已定义。dev-plan 中 T-033 仅覆盖图床 proxy，T-039 含 `upload_image` 但无 `upload_to_wechat_asset`；T-042 配置 AppID/AppSecret UI 但未串联上传 use case 与中继 job（`wechat-asset-upload` kind）。F-005 四 AC 中 AC-003 无任务映射。
- **建议**: 新增任务链：`T-0xx` relay `wechat-asset/uploader.ts` + BullMQ kind · `T-0xx` M-008 `composeUploadWechatAsset` · `T-0xx` MCP `upload_to_wechat_asset` Tool · 扩展 T-042/T-VAL-04 验收素材库上传 E2E。

---

### [DP-004] HIGH: F-013 AC-003 Skill bundle 分发形态零任务

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-013 AC-003 明确要求三种分发形态：MCP server、**Skill bundle（含 SKILL.md 与资源目录）**、CLI。dev-plan 覆盖 MCP（T-036..T-039, T-051）与 CLI（T-050），全 8 文件 grep「Skill/SKILL.md/skill-bundle」零命中。PRD 备注典型 Agent 场景依赖 Skill 层编排多 Tool 调用，缺失将导致 F-013 AC-003 不可验收。
- **建议**: 新增 Sprint 5/6 任务（如 `apps/skill-bundle/` 或 `packages/skill/`）：产出 SKILL.md + 资源目录，编排 list_themes → describe_block → render_markdown → simulate_paste → upload_to_wechat_asset 语义流；AC 含目录结构可检索 + 示例 prompt 可跑通。

---

### [DP-005] HIGH: F-013 MCP Tool 契约多处未任务化

- **category**: completeness
- **root_cause**: self-caused
- **描述**: ARCH API 定义 21 个 Tool；T-036 router 占位「16 Tool」但 T-037/038/039 合计仅实现子集。对照 PRD F-013 AC-002，以下 Tool 无独立任务卡或 AC：`list_tokens`、`list_block_variants`、`describe_variant`、`derive_palette`（M-006 在 T-023 实现但无 MCP 暴露）、`simulate_paste`（M-004 在 T-017 实现但无 MCP 暴露）、`export_clipboard_payload`、`upload_to_wechat_asset`。T-038 deliverables 含 `describe-mark.ts` 但 acceptance_criteria 未覆盖 `describe_mark`。
- **建议**: 扩展 T-038/039 或新增 T-0xx MCP Tool 补全任务，逐 Tool 对齐 arch-wechat-flow-api Tool 清单；每 Tool 至少 1 条可观测 AC（JSON 字段/数组长度/HTTP 200）。

---

### [DP-006] HIGH: F-004 AC-004 复制前粘贴过滤模拟未接入 composeCopy

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-004 AC-004 要求复制前自动跑粘贴过滤模拟，确保与本地预览一致。ARCH M-008 依赖 M-004，deliverables 含 `composers/copy.ts`。T-030 `composeCopy` 依赖仅 `[T-011]`，AC 仅验证 dual-MIME 与 inline style，未调用 `simulatePaste`；T-017（M-004）在 Sprint 2 完成但与 T-030 无依赖边。主卷依赖图 T-011→T-030 跳过 M-004。
- **建议**: T-030 增加依赖 T-017；AC 新增「composeCopy 产出 HTML 经 simulatePaste 后写入 clipboard」；deliverables 明确 pipeline：`composeRender → simulatePaste → dual-mime`。

---

### [DP-007] MEDIUM: F-003 AC-008/AC-009/AC-010 子能力无任务

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-003 另有三项 P0 能力未映射任务：(1) AC-008 主题装饰资产 `assets` 字典 + `{{tokenId}}` SVG 注入；(2) AC-009 上下文敏感渲染（H2 在卡片内外不同样式、heading 装饰策略）；(3) AC-010 编辑器侧「自定义配色」drawer + color picker 双向绑定 frontmatter `paint`（T-029 仅覆盖 frontmatter 解析与 diagnostic，无 UI 任务）。
- **建议**: 在 Sprint 3/6 拆分任务：T-021/022 主题包补充 assets AC · 渲染管线 heading 策略 · LeftPanel 或 Settings 增加 paint drawer 组件任务，AC 引用 F-003 AC-008..AC-010。

---

### [DP-008] MEDIUM: F-011 AC-007/AC-008 质量门禁未落地

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-011 AC-007（违规关键词检测，P1）与 AC-008（实地验证辅助脚本，P1）均无任务卡。主卷 §5.1 R-002 风险表引用「F-011 AC-008 提供实地验证脚本」作为缓解措施，但 Sprint 6 任务表（T-056..T-073）未包含对应实现。T-060/T-061 仅覆盖 AC-005/AC-006。
- **建议**: Sprint 6 新增两条 feature 任务或扩展现有 T-061/T-057：关键词 lint 规则 + 可热更新词库 · 生成 HTML 测试用例脚本 + EVENT-LOG 回写流程。

---

### [DP-009] MEDIUM: F-008 优先级与 AC-002 覆盖不足

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-008 优先级 P1；T-073 为 P2 且 Sprint 6 末才交付。PRD AC-002 要求「每套内置主题 ≥ 2 内容模板」；T-073 仅实现 `/templates` 占位 + 本地 CRUD，不含 per-theme 模板 seed 或 frontmatter `template` 消费（F-008 AC-003）。
- **建议**: T-073 升为 P1 并前移 Sprint；新增子任务或在 T-022 验收中要求五主题各 ≥ 2 模板 seed；AC 引用 F-008 AC-001..AC-004。

---

### [DP-010] MEDIUM: ac-observability — 多处 AC 仍含主观视觉措辞

- **category**: ac-observability
- **root_cause**: self-caused
- **描述**: doc-review ac-observability 维度命中：(1) T-022 AC-002「代码块背景色与 default 主题**明显不同**」；(2) T-VAL-04「视觉效果与本地预览差异 ≤ 5%（**目视判断**，无明显格式错乱）」；(3) 主卷 §6 Sprint 6 E2E「粘贴到模拟公众号编辑器并**视觉一致**」。主观措辞无法自动生成失败测试或 CI 门禁。
- **建议**: 替换为可观测断言：computed style 色值 diff · Playwright screenshot diff ≤ 5% 像素 · DOM 结构 selector 计数；T-VAL 任务引用 T-058 基线或具体 CSS 属性值。

---

### [DP-011] MEDIUM: 跨运行时一致性范围与 PRD/ARCH 不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-013 备注要求浏览器主线程 / Web Worker / Node / Edge 四运行时字节级一致。T-063 与 T-VAL-06 仅覆盖 Node / Worker / Edge 三 target，缺浏览器主线程（editor SPA 内 render pipeline）SHA-256 对照。
- **建议**: T-063 增第四 target（Vitest browser 或 Playwright evaluate）；或主卷 §5.3 以 `[ASSUMPTION]` 声明 v1 豁免 browser 主线程并同步 amend PRD。

---

### [DP-012] MEDIUM: 主卷任务 ID 范围声明错误

- **category**: convention
- **root_cause**: self-caused
- **描述**: 主卷 `[NAV]` 与 §3 写「T-001..T-094」，实际最高编号 T-073（另 T-DS-001..010、T-VAL-00..06）。Layer 1 持续 WARN「缺少 T-074..T-093」。与 r2 接受的 R-006 编号空间说明未在主卷落地。
- **建议**: 修正 NAV 为实际范围；或在 §1 脚注说明 T-DS/T-VAL 独立编号空间；若预留 T-074+ 用于补全任务，在 Sprint 表占位并标注 planned。

---

### [DP-013] LOW: Sprint 3 演示路径与 T-024 阈值自相矛盾

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 主卷 §1 Sprint 3 关键里程碑写「内置 Block ≥ **10** 个可插入」；同表 T-024 与 s3 分卷 Sprint 目标写「≥ **20** 个」。同一 Sprint 内两处 Block 门槛不一致，影响 demo 路径预期。
- **建议**: 统一为 PRD 对齐后的目标值（≥ 40 或分阶段 ≥ 20→40），Sprint 总览与任务卡同步。

---

### [DP-014] LOW: T-038 tdd_acceptance 与 deliverables 不对齐

- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-038 deliverables 列出 `describe-mark.ts` 等 6 个 Tool 文件，但 `tdd_acceptance: [AC-001, AC-002, AC-003]` 仅覆盖 list_themes / describe_block / list_marks；`describe_mark`、`describe_theme` 无对应 AC 与 TDD 范围声明。
- **建议**: 补充 AC-004/005 或扩展 tdd_acceptance 为 `all`；避免 GREEN 阶段遗漏已实现 deliverable 的测试。

---

### [DP-015] LOW: F-012 AC-003 版本历史/回滚无独立任务

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-012 AC-003 要求版本历史、回滚、差异对比。T-052/T-053 实现 Yjs CRDT 同步（P2），T-012 IndexedDB 多文档存储不含 version snapshot / rollback API。F-012 P2 可延后，但 dev-plan 未标注 AC-003 defer 策略。
- **建议**: §5.2 假设表增加 F-012 AC-003 `[DEFER v2]` 声明，或新增 P-2 任务卡含 `listVersions`/`rollbackTo` 可观测 AC。

---

## F/M→T 覆盖速查（审查摘要）

| 维度 | 结论 |
|------|------|
| M-001..M-013 | 均有任务映射；M-010 素材库子模块、M-008 upload-wechat-asset 未任务化 |
| F-001..F-014 | F-003/004/005/008/011/012/013 存在显著 AC 缺口（见 DP-001..015） |
| Sprint/P0 | F-003 P0 阈值偏低；F-008 P1 任务 T-073 为 P2；F-005 AC-003 P1 无任务 |
| tdd_acceptance | r2 已闭合全量字段；T-038 等仍存在 AC↔tdd 子集不对齐（DP-014） |
| 依赖图 | T-030 缺 T-017 边；F-005 素材库链缺失 |

---

## 总结

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 6 |
| MEDIUM | 6 |
| LOW | 3 |
| **合计** | **15** |

**verdict: needs_revision**

r2 结构性问题（tdd_acceptance、Sprint 6 frontmatter、M-012 覆盖）已闭合；r3 全量 Layer 2 发现 **6 项 HIGH** 集中于 PRD P0/P1 功能覆盖缺口（F-003 Block/variant 阈值、F-005 素材库、F-013 Skill bundle + MCP Tool 补全、F-004 复制前粘贴模拟）及 PRD/ARCH 一致性。建议在 pre_dev checkpoint 后、Sprint 0 启动前修订 dev-plan 并 re-review。
