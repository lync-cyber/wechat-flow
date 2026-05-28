---
id: "review-prd-wechat-flow-r4"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
---
# REVIEW: prd-wechat-flow r4

**被审文档**: `docs/prd/prd-wechat-flow.md` (主卷 v0.5.1) + `docs/prd/prd-wechat-flow-f001-f014.md` (分卷 v0.5.1)
**审查日期**: 2026-05-28
**审查轮次**: r4（v0.5.1 全量语义审查；上轮 r3 为增量确认）
**上轮报告**: `docs/reviews/doc/REVIEW-prd-wechat-flow-r3.md`

---

## Layer 1 结论

| 文件 | 结果 | 说明 |
|------|------|------|
| 主卷 | PASS (1 WARN) | WARN: 主卷 AC ID 不连续（AC 在分卷，属预期） |
| 分卷 | PASS (1 WARN) | WARN: 318 行，超出 DOC_SPLIT_THRESHOLD_LINES(300) |

Layer 2 未短路，执行全维度语义审查。

---

## Findings

### Critical

（无）

---

### High

#### PRD-001: Web SPA 最小 AC 与 F-005/F-006/Relay P0 范围冲突

- **严重度**: HIGH
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §1.2.2 交付形态表；`docs/prd/prd-wechat-flow-f001-f014.md` F-005、F-006
- **问题描述**: §1.2.2 将 Web 编辑器 SPA 的「最小 AC」限定为 `F-001..F-004 全部 P0 AC`，且标注「静态托管」。但 F-005（长图/封面，P0 v1 UI 落地）、F-006（图片处理，P0）均标注 P0，Relay 中继服务亦标注 `P0（依赖功能必需）`。F-001 备注与 `[DRAFT_UI_INPUT]` 区还列出「导出长图/封面」菜单入口。写作者 P0 路径与交付形态表的最小 AC 边界不一致。
- **影响**: tech-lead / dev-plan 无法判断 v1 Web 发布是否必须联调 Relay；静态托管 MVP 与 P0 功能集无法对齐，Sprint 0 范围易错切。
- **建议修复**: 在 §1.2.2 Web SPA 行将最小 AC 扩展为 `F-001..F-006` 的 v1 P0 AC 子集，或显式列出「纯静态可验收」与「依赖 Relay 的 P0 AC」两档；同步注明无 Relay 时的降级/不可用行为（对应 F-005 AC-001/002、F-006 云图床）。

#### PRD-002: 视觉一致性 CI 矩阵在三处定义不一致

- **严重度**: HIGH
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §1.3、§3.5；`docs/prd/prd-wechat-flow-f001-f014.md` F-011 AC-004a
- **问题描述**: §1.3 / §3.5 定义 CI 样本为「5 主题 × 1 篇典型样本」固定路径 `tests/visual/samples/{theme}/article.md`。F-011 AC-004a 要求「5 主题 × 8 类基础场景 + ≥8 综合场景」的 Playwright 矩阵（heading / paragraph / blockquote / code-block / image / callout / highlight-mark / badge-mark 等）。两套矩阵的目录结构、场景粒度、样本数量均不同，且未互相引用。
- **影响**: F-011 / F-004 AC-005 的 ≤5% 像素门禁无法绑定唯一 fixture 集；QA 与 CI 实现会出现双轨 baseline，回归结果不可比。
- **建议修复**: 指定单一权威矩阵（建议以 F-011 AC-004a 为准），§1.3 / §3.5 改为引用该矩阵或说明「article.md 为综合场景之一」；统一 fixture 路径与场景枚举表。

#### PRD-003: 粘贴过滤模拟（simulatePaste）与规则集（F-007）关系未定义

- **严重度**: HIGH
- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-002 AC-005、F-004 AC-004/AC-005、F-007、F-011 AC-002；`docs/prd/prd-wechat-flow.md` §1.3
- **问题描述**: F-007 定义 hast 层过滤规则集（≥42 条）；F-011 AC-002 定义「粘贴过滤模拟」复现公众号编辑器粘贴行为；F-002 兼容性报告「基于规则集」；F-004 复制前须过 `simulatePaste`。文档未说明：(a) simulatePaste 是否等于规则集子集、超集或独立层；(b) 兼容性报告 red/yellow/green 与 simulatePaste 逐节点 diff 是否同一数据源。
- **影响**: 可能出现「规则集 CI 全绿但复制后 simulatePaste 仍漂移」或重复实现两条管线；architect 模块边界（M-003 vs M-004）缺乏 PRD 级语义锚点。
- **建议修复**: 在主卷 §3.3 或 F-007/F-011 交叉备注增加一段「规则集 vs 粘贴模拟」关系图：输入/输出树类型、执行顺序（渲染管线中的 stage）、诊断字段是否合并；明确 F-002 报告的数据来源。

#### PRD-004: 四运行时字节级 SHA-256 一致缺乏容差与可验收例外

- **严重度**: HIGH
- **category**: feasibility
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §3.3；`docs/prd/prd-wechat-flow-f001-f014.md` F-013 AC-001
- **问题描述**: PRD 要求浏览器主线程 / Web Worker / Node / Edge 四环境下相同输入产出「逐字符 SHA-256 相同」的 HTML。未定义：浮点/LCH 色彩序列化差异、空白规范化、平台特定 Unicode 归一化等是否允许 canonicalization 预处理；亦未给出失败时的验收降级策略。
- **影响**: 目标在工程上极难稳定达成，易成为发布阻断项或导致 implementer 与 QA 对「一致」理解分裂。
- **建议修复**: 区分「语义一致」（DOM 结构 + 关键 style 属性等价）与「字节一致」两层 AC；或限定 canonicalization 规则（如固定 JSON/HTML serializer、禁止环境相关字段）并附例外清单（ASSUMPTION → 可测约束）。

---

### Medium

#### PRD-005: F-005 AC-003 版本相位标签自相矛盾

- **严重度**: MEDIUM
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-005 AC-003
- **问题描述**: 同行标注 `（P1, v2）` 与 `` `[v1 API only / UI deferred]` ``。读者无法判断 v1 是否验收该 AC（API 暴露是否算 P1 延期还是 v1 部分交付）。
- **影响**: dev-plan 任务优先级与 v1 发布门禁歧义。
- **建议修复**: 拆为两条 AC 或统一标签，例如 `AC-003a（P1, v1-API-only）` / `AC-003b（P1, v2-UI）`，并在备注明确 v1 API 的最小可观测 AC（如 MCP tool 可调用且 relay 存在时返回 job_id）。

#### PRD-006: §3.1 图片性能基线（5MB）与 F-006 上传上限（10MB）不一致

- **严重度**: MEDIUM
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §3.1 性能表；`docs/prd/prd-wechat-flow-f001-f014.md` F-006 AC-002b
- **问题描述**: §3.1 性能目标针对「单张 5MB 图片上传 < 10s」，F-006 AC-002b 硬上限为 10MB、压缩目标 2.5MB。性能 SLA 未覆盖 AC 声明的最大载荷。
- **影响**: 性能测试与 AC 验收使用不同输入规模，P0 性能指标可能虚假通过。
- **建议修复**: §3.1 增加 10MB Worst-case 行，或性能表明确「测试载荷 = 5MB 典型 / 10MB 上限」两档。

#### PRD-007: F-003 AC-006 内嵌 P0/P1 Block 清单与 Feature 级 P0 发布相位混淆

- **严重度**: MEDIUM
- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-003 AC-006
- **问题描述**: F-003 Feature 优先级 P0，但 AC-006 将 Block 分为「P0 必含 25 种」与「P1 必含 15 种」，且要求「P0 25 与 P1 15 全部注册」才满足 `listBlocks().length ≥ 40`。内层 P1 标签易被解读为可延后至 v2，与 Feature 级 P0 冲突。
- **影响**: Sprint 排期可能错误地将 15 个 Block 后移，导致 v1 无法通过 AC-006。
- **建议修复**: 将 AC-006 内层标签改为「核心 25 / 扩展 15」或「Tier-A / Tier-B」，并显式写「v1 P0 发布须 40 种全部注册」。

#### PRD-008: F-006 多图床 P0 未定义无 Relay 时的最小可验收范围

- **严重度**: MEDIUM
- **category**: completeness
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-006 AC-001、AC-004；`docs/prd/prd-wechat-flow.md` §3.2、§4 ASSUMPTION
- **问题描述**: AC-001 枚举本地 + 五类云图床 + 自定义，均为 P0 级能力描述；§3.2 要求云图床凭据经 Relay。未说明 v1 若 Relay 未就绪，「本地图床」是否 alone 满足 P0，云图床是否可标记为 P1 或 relay-dependent。
- **影响**: F-006 P0 验收边界不清，与 PRD-001 Web SPA 静态托管矛盾叠加。
- **建议修复**: AC-001 按「纯前端可验收（local/blob）」与「relay-required（云图床/微信素材）」分组，并映射到 v1 最小 AC。

#### PRD-009: Tool/API 命名在 PRD 内混用 camelCase 与 snake_case

- **严重度**: MEDIUM
- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-001 `[DRAFT_UI_INPUT]`（`describeBlock`）；F-011 AC-004b（`describeBlock`）；F-013 AC-002（`describe_block`）；主卷 §1.3（`simulatePaste`）vs F-013（`simulate_paste`）
- **问题描述**: 同一概念在 UI 草稿、质量 AC、Public Tool Schema 三处命名风格不统一，PRD 未声明哪一层为权威命名。
- **影响**: MCP Tool 注册名、前端 SDK、文档生成易出现双命名；F-013 AC-002 的 23 Tool 清单难以与 UI 描述自动对账。
- **建议修复**: 在 §5 术语表或 F-013 备注增加「Public Tool 以 snake_case 为准；应用层 TS API 以 camelCase 为准」的映射规则，并统一 PRD 引用写法。

#### PRD-010: 主卷 F-011 备注「AC-001~004」未区分 AC-004a/004b 优先级

- **严重度**: MEDIUM
- **category**: ambiguity
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §2 功能列表 F-011 备注；分卷 F-011 AC-004a/004b
- **问题描述**: 主卷备注写 `AC-001~004 + AC-009 P0`，分卷中 AC-004 已拆为 004a（P0）与 004b（P1）。「AC-004」范围是否含 004b 不明确。
- **影响**: 发布门禁可能误将 variant 全量视觉回归（004b）纳入 v1 阻断项，或相反遗漏。
- **建议修复**: 主卷备注改为 `AC-001~003 + AC-004a + AC-009 P0 / AC-004b + AC-005~008 P1`。

#### PRD-011: F-008（P1）与 F-003 AC-012（P0）template 职责重叠

- **严重度**: MEDIUM
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-003 AC-012、F-008 AC-001~002、F-011 AC-009
- **问题描述**: template 注册、白名单覆盖、CI 守护在 F-003/F-008/F-011 三处重复定义，F-003/F-008 优先级不同（P0 vs P1），新读者难以判断「template 市场 UX」与「每主题 ≥1 template 内容」的验收归属。
- **影响**: 文档修订时易漂移（改 F-008 漏 F-003）；task 拆分可能重复或遗漏。
- **建议修复**: F-003 AC-012 仅保留「数据/覆盖」P0 约束；F-008 专注市场 UX 与 MCP describe API；F-011 AC-009 引用单一白名单定义（DRY 交叉引用）。

#### PRD-012: F-001 AC-004 双向高亮缺少 iframe 沙箱下的可验收边界

- **严重度**: MEDIUM
- **category**: ac-observability
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md` F-001 AC-004；F-002 AC-001（iframe 沙箱）
- **问题描述**: AC-004 要求预览 ↔ 源码双向定位，但未定义跨 iframe 边界的定位精度（块级 vs 字符级）、延迟上限、失败降级（如 sandbox 限制导致无法映射时是否允许仅块级高亮）。
- **影响**: UI 实现与 E2E 测试缺少可观测终点，易争议「是否满足 AC」。
- **建议修复**: 补充可观测 AC：如「点击预览块级元素后 200ms 内源码光标定位到对应 directive 块起始行；失败时 Toast + 块级滚动定位」。

---

### Low

#### PRD-013: §4 ASSUMPTION 与 §3.5 视觉验收参数完全重复

- **严重度**: LOW
- **category**: consistency
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow.md` §3.5、§4 假设列表末条
- **问题描述**: pixelmatch 参数、视口、样本路径、计算口径在 §3.5 与 §4 各写一遍，违反单一事实来源。
- **影响**: 后续修订易漏改一处。
- **建议修复**: §4 改为「视觉验收参数见 §3.5」，删除重复枚举。

#### PRD-014: 分卷行数略超拆分阈值

- **严重度**: LOW
- **category**: convention
- **root_cause**: self-caused
- **证据**: `docs/prd/prd-wechat-flow-f001-f014.md`（318 行）；Layer 1 WARN
- **问题描述**: 分卷 318 行超出 DOC_SPLIT_THRESHOLD_LINES(300) 18 行，14 个 Feature 同卷维护成本上升。
- **影响**: 并行编辑冲突、review diff 噪声。
- **建议修复**: 按 F-001~007 / F-008~014 或 P0/P1 拆为两卷，主卷 `ac_in_volumes` 同步更新。

#### PRD-015: 下游 ARCH 仍标 F-005 为 P1（跨文档漂移）

- **严重度**: LOW
- **category**: consistency
- **root_cause**: upstream-caused（PRD 升 P0 后 ARCH 未同步）
- **证据**: `docs/prd/prd-wechat-flow.md` §2（F-005 P0）；`docs/arch/arch-wechat-flow.md` §8.1 F→M 覆盖表（F-005 P1）
- **问题描述**: PRD v0.5.1 已将 F-005 升为 P0，ARCH §8.1 仍列 P1。
- **影响**: 以 ARCH 为输入的模块优先级可能与 PRD 不一致（非 PRD 正文错误，但实施风险源）。
- **建议修复**: PRD 侧在 §2 F-005 备注加「优先级以本表为准，ARCH 同步待 amendment」；或触发 arch 修订。

---

## Open Questions

1. **v1 无 Relay 部署时**，Web SPA 的 P0 验收是否允许「长图/封面/云图床」整族标记为 unavailable，还是必须随 v1 一起交付 Relay？
2. **simulatePaste 与 F-007 规则集**是同一引擎的两阶段，还是独立实现？若独立，不一致时以哪条为复制/兼容性权威？
3. **F-003 AC-006 的 15 个「P1 Block」**是否必须在首个 public release 全部实现，还是仅 25 个核心 Block 即可先行？
4. **四运行时 SHA-256 字节一致**是否为硬发布门禁，还是仅 MCP/CLI 路径强制、浏览器路径允许 canonicalization？
5. **F-005 AC-003「v1 API only」**是否计入 v1 发布范围（需 relay + 集成测试），还是 API stub 即可？

---

## Overall Assessment

1. **v0.5.1 在 r1~r3 已知 HIGH 项上已显著改善**（§3.2 安全、ac_in_volumes、F-007 示例说明、术语表、Zod 软化、`[DRAFT_UI_INPUT]` 边界），Layer 1 双卷均 PASS。
2. **当前最大阻塞是交付形态表（§1.2.2）与 P0 功能集不一致**：静态 Web SPA + F-001..F-004 最小 AC 无法覆盖 F-005/F-006/Relay P0，实施范围必须在 PRD 层先收敛。
3. **视觉一致性与粘贴模拟存在「三套口径」风险**（§1.3/§3.5 样本 vs F-011 AC-004a 矩阵 vs simulatePaste/规则集关系），不澄清则 CI 与 F-004 AC-005 无法落地。
4. **F-005 升 P0 后**，服务端 Headless + Relay 成为 v1 关键路径，但 PRD 未给出无后端时的降级策略，可行性风险高于文档结构风险。
5. **AC 可观测性整体良好**（数字指标、fixture、Tool 枚举），但 F-001 AC-004、四运行时一致性等少数 AC 仍缺可测边界。
6. **Verdict: `needs_revision`** — 存在 4 项 HIGH（PRD-001~004），需 product-manager 修订后重审；MEDIUM/LOW 建议同轮处理但不单独阻塞若 HIGH 已清零。

---

## 最终 Verdict

**needs_revision**
