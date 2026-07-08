---
id: "review-s7-fix-amendments-r1"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow-modules", "ui-spec-wechat-flow-block-variants", "ui-spec-wechat-flow-content-elements", "ui-spec-wechat-flow-uc001-uc014"]
consumers: ["orchestrator", "tech-lead"]
---

# REVIEW-s7-fix-amendments-r1

## 审查范围

Sprint 7 修复批三张 amendment 任务卡（T-160/T-161/T-162）对四份文档的工作区未提交变更（`git diff` 口径），逐条核对 `dev-plan-wechat-flow-s7.md` 中对应 `acceptance_criteria`：

- T-160（ARCH amendment）→ `docs/arch/arch-wechat-flow-modules.md` §2.M-002/M-005/M-007
- T-161（DESIGN，内容渲染域）→ `docs/ui-spec/ui-spec-wechat-flow-block-variants.md` §10.3/§10.5、`docs/ui-spec/ui-spec-wechat-flow-content-elements.md` §9.8
- T-162（DESIGN，编辑器 chrome 域）→ `docs/ui-spec/ui-spec-wechat-flow-uc001-uc014.md` UC-006/UC-013/UC-023

Layer 1（`cataforge context review`）FAIL 均为分卷结构性假阳性（按整篇 doc-type 审分卷，非本次变更引入），已由 orchestrator 判定不在本轮 Layer 2 范围内，不重复检查。

## 问题列表

### T-160 — arch-wechat-flow-modules.md

#### [R-001] HIGH: M-007 结构化 attrsSchema 示例与 M-005 内置 Block 契约自相矛盾
- **category**: consistency
- **root_cause**: self-caused
- **描述**: §2.M-007 新增段落将 `attrsSchema`（结构化数据模型，"自持于 M-007 plugin-api surface"）的说明性示例定为「如 gallery `{ images: string[] }`、callout `{ text: string }`」。但 `gallery` 与 `callout` 均为已确认的**内置 Block**（`ui-spec-wechat-flow-block-variants.md` §10.1/§10.2 callout、§10.9 gallery），按本次修订 §2.M-005 AC-001 自身的 `directiveAttrs` 契约表，两者均不在 `pull-quote`/`dialog`/`compare` 例外清单中，应归为"其余全部内置 block | 空 strict object（不接受任何指令属性）"，即它们在 core 注册中心不应携带任何结构化属性模型。用同一批修订刚刚"收编进 core directiveAttrs 契约"的两个内置 Block 名，去反向举例"自持于 plugin-api、core 不承载"的结构化 `attrsSchema`，直接自相矛盾——读者无法判断 gallery/callout 的多图/文案内容模型究竟属于 core（directiveAttrs + decorate）还是 plugin-api（attrsSchema + render）。这正是 notes 字段所述"三方矛盾"意图根治的同类风险，在本次修订自身文本内复发。
- **建议**: 更换 M-007 示例为纯虚构/不与内置 Block ID 撞名的插件场景（如 `my-custom-timeline { events: string[] }`），或显式加注"以下示例为第三方插件场景，与同名内置 Block（如有）无关，内置 Block 的属性模型以 §2.M-005 directiveAttrs 为准"。

#### [R-002] HIGH: `describe_block`（M-009/API-006）及关联下游文档未随 attrsSchema 移除同步修订
- **category**: consistency
- **root_cause**: self-caused
- **描述**: AC-001/AC-003 将 `attrsSchema` 从核心 `BlockDefinition` 移除、替换为 `directiveAttrs`，并声明"core 注册中心不承载结构化 schema"。但以下**未被本次 T-160 diff 触碰**的既有文档仍假设 `describe_block`（M-009 对外 Tool，覆盖全部 41 个内置 Block，非仅插件）能从被查询 Block 上取得 `attrsSchema` 并转 JSON Schema 供 LLM 消费：
  - `arch-wechat-flow-modules.md` §2.M-012（第 397 行，未改动）："`component/attrs-schema.ts` — Block / Mark 的 `attrsSchema` 类型工厂；`describe_block` 调用 `toJSON(block.attrsSchema)` 输出 JSON Schema"
  - `arch-wechat-flow-api.md` API-006 `describe_block` 响应 schema（第 176 行）：`attrsSchema: { type: "JSONSchema", desc: "Block 属性的 JSON Schema 表达，便于 LLM 生成合法 Markdown" }`（第 206 行 `describe_mark` 同构复用）
  - `arch-wechat-flow-data.md`（第 187 行）、`arch-wechat-flow.md`（第 110 行）同样默认 `attrsSchema` 经 `describeBlock` 可查得

  内置 Block 的 `directiveAttrs` 仅覆盖 `{}` 语法域少量标注属性（且大多数是空 strict object），无法承担"输出完整 JSON Schema 便于 LLM 生成合法 Markdown"的既有语义（该语义需要覆盖块正文/子结构的完整内容模型，而非仅 `{}` 属性）。`describe_block` 面向全部 41 个内置 Block（非仅插件），T-160 未说明其取数来源如何调整，导致该 MCP Tool 契约在此次修订后处于未定义状态。
- **建议**: 本次或后续 arch amendment 需明确 `describe_block` 对内置 Block 的响应来源——若继续输出 `attrsSchema` 字段则需说明其新语义来源（如由块的 markdown 语法示例/schema 描述层另行提供），若改为输出 `directiveAttrs` 的 JSON Schema 则需同步更新 API-006/M-012/M-009 措辞，避免 `attrsSchema` 一词在同一契约体系内同时指向"已废弃的核心字段"与"独立于 core 的 plugin-only 字段"两种不同含义。

### T-161 — ui-spec-wechat-flow-block-variants.md / ui-spec-wechat-flow-content-elements.md

#### [R-003] MEDIUM: compare `left-label`/`left-value` 拆分未回填 §10.6 ledger 渲染描述
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: T-160 新增的 `compare` `directiveAttrs` 契约表将该 Block 的指令属性正式拆分为 5 个标量字段：`left-label`/`left-value`/`right-label`/`right-value`/`title`。但 `ui-spec-wechat-flow-block-variants.md` §10.6（ledger 双色账本，本次修订未触碰）仍以「`left` 字段」「`right` 字段」「`title` 字段」描述左右列内容来源，未说明 label 与 value 在列内的排布关系（同行「label: value」、上下堆叠、或仅渲染 value 忽略 label 等）。§10.6 由 T-160 新契约首次把"标签/值"拆成两个独立属性后暴露此空白，读者无法从现有文字推断出实际 DOM/视觉结构。
- **建议**: 由 T-168（视觉修正实施）或后续 ui-spec amendment 补充 §10.6 中 `left-label`/`left-value` 二者在列内的具体排布规则（字号/字重/是否同行），与 T-160 新契约对齐。

### T-162 — ui-spec-wechat-flow-uc001-uc014.md

#### [R-004] MEDIUM: UC-013 诊断分组（兼容性/可读性/违规词）缺少数据侧判别字段
- **category**: completeness
- **root_cause**: self-caused
- **描述**: AC-002 要求 UC-013 展开列表"诊断列表按分组渲染（组序固定：兼容性/可读性/违规词/夜间风险）"。夜间风险分组有独立字段 `DiagnosticReport.nightRiskIssues: NightRiskEntry[]` 支撑，但"兼容性/可读性/违规词"三组均来自同一个 `diagnostics: Diagnostic[]` 数组，该类型（`arch-wechat-flow-api.md` 第 32 行：`{severity, ruleId?, nodeRef?, message}`）没有 `category`/`group` 一类判别字段可供 UI 层区分三者归属。当前代码库中存在 `ruleId` 前缀隐式约定（`readability-*` → 可读性、`keyword-lint` → 违规词、其余 → 兼容性，见 `packages/ruleset/src/rules/readability/*.ts` 与 `packages/ruleset/src/lints/keyword-lint.ts`），但该约定未在 arch 或 ui-spec 任何位置书面声明，仅存于源码命名习惯，且与 `packages/ruleset/src/rules/builtin/lint-*.ts`（`lint-filter-backdrop`/`lint-grid-layout`/`lint-position-fixed`，实际语义是"兼容性"而非"可读性"）存在前缀混淆风险（`scope: lint` ≠ UI 分组"可读性"）。仅凭 ui-spec 与 arch 现有文字，新团队成员无法确定性地实现分组逻辑。
- **建议**: 补充说明"兼容性/可读性/违规词"三组的判别依据——建议在 `arch#§2.M-003`/`M-012` `Diagnostic` schema 补充显式 `category` 字段（值域对齐 `anchorGroup` 的 `compat`/`readability`/`keyword`），而非依赖 `ruleId` 前缀隐式约定。

## AC 覆盖核对（逐条）

| 任务 | AC | 覆盖情况 |
|------|----|---------|
| T-160 | AC-001 `directiveAttrs`/`decorate` 契约 | 覆盖，`pull-quote`/`dialog`/`compare` 属性集与其余空 strict object 均按 AC 措辞落地 |
| T-160 | AC-002 两条通用渲染机制（透传 + typography 下推 cascade） | 覆盖，六项可继承属性集（text-align/color/font-size/line-height/font-family/letter-spacing）与优先级顺序均逐字对齐 AC |
| T-160 | AC-003 plugin-api `attrsSchema` 自持于 M-007 | 措辞层面覆盖，但示例选取与下游 `describe_block` 契约未同步收口，见 R-001/R-002 |
| T-160 | AC-004 doc-review 门禁 | 由本报告出具 |
| T-161 | AC-001 无边框 root 基线 + 装饰同行 | 覆盖 |
| T-161 | AC-002 署名前缀 + typography 生效声明 | 覆盖，「—— {author}」措辞逐字对齐 |
| T-161 | AC-003 §9.8 悬挂裁定（选 b：table-cell） | 覆盖，§9.8/§10.5/§10.6 技法互相引用一致 |
| T-161 | AC-004 `line-height: 1` 两处一致 | 覆盖，§9.8 与 §10.5 均含 |
| T-161 | AC-005 用户裁定 sign-off | 覆盖，`docs/EVENT-LOG.jsonl` 含 `design_signoff T-161` 事件，`ref=T-161` |
| T-162 | AC-001 UC-006 收纳交互规格 | 覆盖，收起按钮/rail 形态/命令联动/持久化四项均落地 |
| T-162 | AC-002 UC-013 折叠态去计数 + 夜间风险明细 | 覆盖，分组渲染机制存在数据侧判别字段缺口，见 R-004 |
| T-162 | AC-003 UC-023 指标段 button 化 + 锚定 | 覆盖，`anchorGroup` 枚举与 UC-013 完全一致 |
| T-162 | AC-004 Penpot 帧更新 + sign-off | sign-off 已记录（`ref=T-162`），Penpot 帧导出按用户决策显式延后至 T-172 复验会话（`docs/EVENT-LOG.jsonl` 第 738 行注明"不阻塞实现"），非本报告范围内的缺陷 |

## 设计残留自检

对四份文档 diff 逐一执行 COMMON-RULES §禁止设计阶段与变更说明残留 regex 自检（`之前|previously|used to|修复了|替代了|MVP|原方案|本次新增|本轮加入|现已支持|issue #|PR #|closes #|fixes #`），零命中。`（原 X）` 类表述均为既有变体重命名的可追溯性标注（设计系统命名资产的合法用法，非本次修订过程叙事），符合既定文档惯例。

## Verdict

**needs_revision**

问题计数：CRITICAL 0 / HIGH 2（R-001, R-002）/ MEDIUM 2（R-003, R-004）/ LOW 0。

存在 HIGH 级问题（R-001 M-007 示例自相矛盾、R-002 `describe_block` 下游契约未同步），按 COMMON-RULES §三态判定逻辑判定为 `needs_revision`。两项均落在 T-160（arch amendment）范围内，建议 T-160 增补修订后重新提交审查；T-161/T-162 的 ui-spec 变更本身 AC 覆盖完整，仅 R-003/R-004 两项 MEDIUM 建议后续任务卡处理，不构成 T-161/T-162 本体的 needs_revision 理由。

