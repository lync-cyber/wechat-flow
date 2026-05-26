---
id: "review-prd-wechat-flow-r2"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
---
# REVIEW: prd-wechat-flow r2（增量审查）

**被审文档**: `docs/prd/prd-wechat-flow.md` (主卷 183 行) + `docs/prd/prd-wechat-flow-f001-f014.md` (分卷 305 行)
**审查日期**: 2026-05-26
**审查轮次**: r2（基于 r1 verdict: needs_revision 后的增量审查）
**上轮报告**: `docs/reviews/doc/REVIEW-prd-wechat-flow-r1.md`

---

## Layer 1 重跑结论

### 主卷检查结果

```
检查: docs/prd/prd-wechat-flow.md (type=prd, volume=main)
  ac_in_volumes: ["prd-wechat-flow-f001-f014"] — 已声明，Layer 1 跨卷 AC 检查可感知分卷存放
PASS: 无 FAIL（R-002 根本原因已消除）
```

**分析**: 主卷 frontmatter 新增 `ac_in_volumes: ["prd-wechat-flow-f001-f014"]`，Layer 1 工具链可识别"AC 在分卷中"为有意设计而非遗漏，r1 的 FAIL 根本原因已消除。

### 分卷检查结果

```
检查: docs/prd/prd-wechat-flow-f001-f014.md (type=prd, volume=features)
  deps: ["prd-wechat-flow"] — 已正确声明上游依赖
  行数: 305 行（超出 DOC_SPLIT_THRESHOLD_LINES=300 共 5 行，边界情况可接受）
PASS with WARN: R-005 已修复，行数 WARN 延续（边界情况不要求进一步拆分）
```

---

## 增量审查范围说明

按 Revision Protocol §Step 4 增量审查规则：

| 维度 | 审查状态 | 说明 |
|------|---------|------|
| completeness (R-001/R-007/R-011 涉及) | 重点审查 | r1 HIGH/MEDIUM 涉及维度 |
| convention (R-002/R-004 涉及) | 重点审查 | r1 HIGH/MEDIUM 涉及维度 |
| consistency (R-003/R-005 涉及) | 重点审查 | r1 MEDIUM 涉及维度 |
| feasibility (R-008 涉及) | 重点审查 | Zod 软化验证 |
| ambiguity (R-006 涉及) | 重点审查 | F-011 优先级歧义修复验证 |
| security (§3.2 新增章节) | 重点审查 | 新增内容全维度审查 |
| structure (R-009 涉及) | [previously-approved, r1-LOW] | r1 仅 LOW，无需重审；新增 [DRAFT_UI_INPUT] 标记验证纳入 convention 维度 |

---

## Layer 2 增量审查结论

### 已修复问题验证

| r1 问题 | 修复状态 | 验证结论 |
|---------|---------|---------|
| R-001 HIGH: §3 安全章节缺失 | 已修复 | §3.2 安全新增 4 个维度，见下方详细验证 |
| R-002 HIGH: 主卷 Layer 1 FAIL | 已修复 | `ac_in_volumes` 声明 + §2 跨卷引用句，格式规范 |
| R-003 MEDIUM: F-007 规则表说明不完整 | 已修复 | F-007 正文增加示例性说明段，明确"≥42 条目标，19 条为代表性示例" |
| R-004 MEDIUM: NAV 与章节结构不一致 | 已修复 | NAV 更新为"§3.2 安全, §3.3 可靠性与确定性, §3.4 兼容性"，与实际章节对齐 |
| R-005 MEDIUM: 分卷 deps 缺失 | 已修复 | `deps: ["prd-wechat-flow"]` 已声明 |
| R-006 MEDIUM: F-011 优先级混合标注 | 已修复 | 主卷表格改为 P0，备注列补充"AC 级细分见分卷 (AC-001~004 P0 / AC-005~008 P1)" |
| R-007 MEDIUM: 术语表缺失 6 个术语 | 已修复 | 新增 Zod / AppID/AppSecret / EXIF / SHA-256 / CommonMark / mdast→hast 共 6 条 |
| R-008 MEDIUM: Zod 硬编码写入 AC | 已修复（含残留问题，见 R2-001） | F-010 AC-004 与 F-013 AC-002 均已软化，但 F-013 AC-002 引入新歧义 |
| R-009 LOW: F-001 UI 规格越界 | 已修复 | `[DRAFT_UI_INPUT]` 标记 + "ui-spec 阶段以 ui-designer 产出为准"说明，边界清晰 |
| R-010 LOW: §1.3 性能数字重复 | 已修复 | §1.3 成功指标表中性能行改为"见 §3.1 性能详表"，消除重复 |
| R-011 LOW: §4 服务端依赖不汇总 | 已修复 | §4 ASSUMPTION 明确列出 F-005/F-006/F-013 服务端依赖范围 |

### §3.2 安全章节详细验证

**4 个维度覆盖完整性**:

- **用户凭据存储与传输隔离**: 明确"不进浏览器"约束、TLS 传输要求，凭据类型枚举（AppID/AppSecret/API key/图床 token）完整。具体加密算法与密钥轮换策略以"交 architect 阶段决策"明确委托，PRD 边界清晰。
- **第三方插件沙箱代码执行隔离**: 明确不可访问的资源范围（主线程 DOM/凭据存储/网络白名单外），正确引用"Web Worker + Comlink RPC 为架构候选"而非写入约束，降级策略引用 F-010 AC-008，可验证性良好。
- **MCP server 鉴权机制基线**: 明确"须鉴权"的不可妥协基线，引用 F-013 AC-004 的具体 AC，key 生命周期管理明确委托 architect。
- **XSS 防护边界**: 明确 sanitizer 白名单过滤要求，"任何等价于 dangerouslySetInnerHTML 的逃逸路径须由 sanitizer 守门"具有可验证性，CSP 具体策略以前言"CSP 头部细则交 architect 阶段决策"委托，不越界。

**安全章节整体评价**: 4 个维度定义了"什么是不可妥协的安全基线"而非"怎么实现"，与 architect 边界划分合理。

### 术语表新增 6 条验证

| 术语 | 定义准确性 | 覆盖度 |
|------|---------|--------|
| Zod | "TypeScript 优先的 schema 校验库，提供运行时校验与类型推导一体能力" — 准确，符合行业定义 | 覆盖 F-010 AC-004 / F-013 AC-002 使用场景 |
| AppID / AppSecret | "微信公众号开发者账号凭证，AppSecret 必须服务端持有，不进浏览器" — 准确，包含关键安全约束 | 覆盖 F-005 AC-003 / §3.2 安全 |
| EXIF | "Exchangeable Image File Format，图片元数据格式，含拍摄时间、地理位置等敏感字段" — 准确，"敏感字段"说明点出了 PRD 要求去 EXIF 的安全动机 | 覆盖 F-006 AC-003 |
| SHA-256 | "256-bit 安全哈希算法，用于产物字节级一致性验证" — 准确 | 覆盖 §1.3 / §3.3 / F-013 AC-001 |
| CommonMark | "Markdown 规范化标准，工具的基础 Markdown 语法对齐 CommonMark + GFM 扩展" — 准确，明确与 GFM 的扩展关系 | 覆盖 F-001 AC-001 |
| mdast→hast | "渲染管线中的语法树转换阶段（Markdown AST → HTML AST）" — 准确，已有 mdast / hast 单独定义，此条补充组合概念 | 覆盖 F-003 AC-002 / F-002 备注 |

术语表新增条目定义准确，覆盖度充分。

### Zod 软化验证

**F-010 AC-004**（r1 原文：「schema 由 Zod 定义，props 类型自动推导」）

r2 文本：「全链路类型推导：组件 schema 与 props 类型在 TypeScript 层自动推导，开发者无需手写类型标注，schema 校验库支持运行时校验能力。」

评价：技术实现（Zod）已移除，改为能力要求（TypeScript 类型推导 + 运行时校验能力）。Architect 仍有选型空间（Zod / ArkType / TypeBox / 自研等均可满足）。**软化彻底**。

**F-013 AC-002**（r1 原文：「入参/出参由 Zod schema 定义」）

r2 文本：「Tool 契约（入参/出参具备强类型 schema 定义，含运行时校验能力；schema 与插件组件 schema 复用同一套类型源）」

评价：Zod 已移除，但"schema 与插件组件 schema 复用同一套类型源"引入新问题，见 R2-001。

---

## 新发现问题

### [R2-001] MEDIUM: F-013 AC-002 Zod 软化后引入实现架构约束

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: F-013 AC-002 软化后的文本中包含"schema 与插件组件 schema 复用同一套类型源"——这一约束要求 MCP Tool 契约 schema 与插件组件 schema 必须来自"同一套类型源"（即同一库/模块实例）。这是一个实现架构决策：使用同一套类型源意味着约束了模块拆分方式、依赖图、甚至 monorepo 结构（Tool 契约代码与插件 SDK 代码须共享一个 schema 定义包）。PRD 应描述"什么能力"（两者 schema 类型契约保持一致性，不发生类型漂移），而非"怎么实现"（复用同一套类型源）。若 architect 选择用不同库分别定义 Tool 契约与插件 schema，但通过代码生成保持一致性，同样满足 PRD 的本意，但会被当前 AC 文字约束排除。
- **建议**: 将"schema 与插件组件 schema 复用同一套类型源"改为"Tool 契约 schema 与插件组件 schema 定义保持类型一致性，避免两套类型漂移（具体共享机制由 architect 决策）"，将架构实现细节留给 architect，仅锁定"类型一致"这一业务能力目标。

---

### [R2-002] LOW: 分卷 version 未随内容修订递增

- **category**: convention
- **root_cause**: self-caused
- **描述**: 主卷 version 已从 `0.1.0` 升至 `0.2.0` 以反映本轮修订，但分卷 `prd-wechat-flow-f001-f014.md` 的 frontmatter `version` 仍为 `0.1.0`。本轮修订涉及分卷内容变更：F-007 正文新增说明段、F-010 AC-004 软化、F-011 主卷表格 P0 标注与 AC 级细分说明（分卷内 F-011 优先级注释已体现）、F-013 AC-002 软化。分卷 version 未随内容修订递增，不符合版本号单一事实来源原则——下游 agent（architect / tech-lead）无法通过 version 字段感知分卷是否已同步更新。
- **建议**: 将分卷 frontmatter `version: "0.1.0"` 改为 `version: "0.2.0"`，与主卷版本对齐，表明本轮修订已同步至分卷。

---

### [R2-003] LOW: §3.2 安全"网络白名单"术语未在术语表中定义，且缺乏范围说明

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: §3.2 安全第二个维度中使用了"网络白名单"一词（"沙箱内代码不得访问...网络白名单以外的资源"），但术语表中未定义"网络白名单"，正文也未说明该白名单的内容（哪些域/协议被许可）或由谁来定义（是 architect 阶段决策还是已有默认值）。对新团队成员而言，"白名单以外的资源"是一个空洞约束——如果白名单内容未定义，则禁止条件无法验证。
- **建议**: 在§3.2 安全"沙箱隔离"维度中补充说明"网络白名单具体范围由 architect 阶段定义"，或将"网络白名单以外的资源"改为"architect 阶段指定的网络访问白名单以外的资源"，消除白名单来源的歧义；无需在术语表中专门定义该词，仅需在使用处明确其来源与定义归属即可。

---

## [previously-approved] 维度（引自 r1）

以下维度在 r1 审查中无 CRITICAL/HIGH 问题，且 r2 的新增/修订内容未触及这些维度，标注为 previously-approved：

- **structure**: r1 R-009 为 LOW（F-001 UI 规格越界），已修复（[DRAFT_UI_INPUT] 标记）；结构维度整体 [previously-approved, REVIEW-prd-wechat-flow-r1]
- **consistency（内部一致性）**: r1 R-003/R-005 为 MEDIUM，均已修复；r2 新增内容内部一致性良好（§3.2 引用 F-010/F-013 的 AC 编号与分卷一致，§4 列出的功能编号与分卷匹配）[previously-approved, REVIEW-prd-wechat-flow-r1]
- **ambiguity（非 R-006 部分）**: r1 无 CRITICAL/HIGH ambiguity 问题；r2 新增术语覆盖了 r1 提及的 6 个高频术语 [previously-approved, REVIEW-prd-wechat-flow-r1]

---

## 综合评估

### Layer 1 结论
- 主卷: PASS（`ac_in_volumes` 声明消除 r1 FAIL）
- 分卷: PASS with WARN（行数 305，超出阈值 5 行，边界情况可接受）

### Layer 2 结论

| 严重等级 | 数量 | 问题编号 |
|---------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 1 | R2-001 |
| LOW | 2 | R2-002, R2-003 |

### 正向确认（r2 修订质量评价）

- r1 全部 11 条问题（2 HIGH + 6 MEDIUM + 3 LOW）的修复意图均已落实，主要修复方向正确
- §3.2 安全章节新增质量良好：4 个维度均在"基线约束（PRD 职责）"与"实现决策（architect 职责）"之间划定了清晰边界，未出现过度规定
- 术语表新增 6 条定义准确，无需进一步追问
- F-007 规则说明段的措辞（"代表性规则示例子集"）清晰解决了数字落差歧义
- F-010 AC-004 Zod 软化彻底，技术选型空间已还给 architect
- [DRAFT_UI_INPUT] 标记 + 边界说明规范，F-001 UI 规格越界风险已消除
- §4 约束与假设汇总服务端依赖范围（F-005/F-006/F-013）简洁有效

---

## 最终 Verdict

**approved_with_notes**

r2 修订消除了 r1 的 2 个 HIGH 问题和全部 MEDIUM/LOW 问题。新发现 1 个 MEDIUM（R2-001）和 2 个 LOW（R2-002/R2-003），无 CRITICAL/HIGH，按三态判定逻辑判定为 **approved_with_notes**。

建议 product-manager 在下一轮迭代中处理 R2-001（F-013 AC-002 架构约束残留），R2-002/R2-003 优先级较低，可随下一内容修订顺带修复。当前版本可推进至 architect 阶段。
