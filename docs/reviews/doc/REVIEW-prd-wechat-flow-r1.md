---
id: "review-prd-wechat-flow-r1"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
---
# REVIEW: prd-wechat-flow r1

**被审文档**: `docs/prd/prd-wechat-flow.md` (主卷 163 行) + `docs/prd/prd-wechat-flow-f001-f014.md` (分卷 302 行)
**审查日期**: 2026-05-26
**审查轮次**: r1

---

## Layer 1 结论

### 主卷检查结果

```
检查: docs/prd/prd-wechat-flow.md (type=prd, volume=main)
FAIL: 无验收标准 (AC-NNN)
TOTAL FAILURES: 1
```

**分析**: Layer 1 检查器在主卷中未找到 AC-NNN 格式的验收标准。主卷 §2 功能需求仅包含功能列表概览表格，将全部 F-NNN + AC-NNN 定义下放至分卷 `prd-wechat-flow-f001-f014.md`。这是一个合法的分卷架构设计选择（product-manager 在生成时拆分），但 Layer 1 检查器跨卷检查能力不足，将其误报为 FAIL。

**处理**: 此 FAIL 属于 reviewer-calibration 类问题，在 Layer 2 中作为 convention/completeness 问题评估，不直接阻塞 Layer 2 执行。

### 分卷检查结果

```
检查: docs/prd/prd-wechat-flow-f001-f014.md (type=prd, volume=features)
WARN: 文档行数(302)超过300行阈值，建议通过doc-gen拆分为分卷
PASS: 所有检查通过 (1 WARN)
```

**分析**: 分卷已是拆分后产物，行数 302 超出 DOC_SPLIT_THRESHOLD_LINES(300) 仅 2 行，属于边界情况，不强制要求进一步拆分。

---

## Layer 2 结论

**执行范围**: 全维度语义审查（completeness / consistency / feasibility / security / convention / ambiguity）

**短路判定**: prd 不在 DOC_REVIEW_L2_SKIP_DOC_TYPES 白名单，分卷 302 行超过 DOC_REVIEW_L2_SKIP_THRESHOLD_LINES(200)，Layer 2 强制执行。

---

## 问题列表

### [R-001] HIGH: §3 非功能需求缺少安全专项章节

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 主卷 §3 非功能需求包含 §3.1 性能 / §3.2 可靠性与确定性 / §3.3 兼容性，但完全缺少 §3.2 安全专项（模板标准章节为 `3.2 安全`，当前文档用"可靠性与确定性"替换了该位置，无安全相关内容）。对于一个具有以下能力的工具，安全需求不可缺失：MCP server 需要 API key 鉴权；AppID/AppSecret 中继服务需要密钥管理；第三方插件沙箱需要隔离边界；图床配置包含用户 credentials。F-013 AC-004 已提及"API key + per-key 配额"，但这仅是功能需求层，非功能需求层的安全基线（密钥存储、传输加密、XSS 防护边界、CSP 策略）完全缺失，无法指导 architect 做安全架构决策。
- **建议**: 在 §3 中补充 §3.2 安全章节，至少覆盖：(1) 用户凭据（AppID/AppSecret/API key/图床 token）的存储隔离策略；(2) 第三方插件沙箱的代码执行隔离边界；(3) MCP server 鉴权机制基线要求；(4) XSS 防护边界（对于接受用户 Markdown 并渲染 HTML 的工具，XSS 防护策略是关键安全非功能需求）。

---

### [R-002] HIGH: 主卷 Layer 1 FAIL——分卷架构下主卷 AC-NNN 可达性声明缺失

- **category**: convention
- **root_cause**: self-caused
- **描述**: Layer 1 在主卷中报 FAIL（无验收标准 AC-NNN）。虽然这是分卷设计的合理结果，但主卷 §2 功能需求仅引用了分卷文档路径（`prd-wechat-flow-f001-f014.md`），没有在 required_sections / frontmatter / 正文中明确声明"验收标准定义在分卷中"——导致 Layer 1 和其他工具无法自动感知这是"分卷存放 AC"的有意选择，而非遗漏。这是分卷架构下的结构合规性问题。
- **建议**: 在主卷 frontmatter 中添加 `ac_in_volumes: ["prd-wechat-flow-f001-f014"]` 声明，或在主卷 §2 中用标准格式明示"验收标准见分卷：`prd-wechat-flow-f001-f014#§2`"，使自动化检查工具可识别。

---

### [R-003] MEDIUM: F-007 规则表展示 19 条，与"≥ 42 条"目标存在说明不完整

- **category**: consistency
- **root_cause**: self-caused
- **描述**: F-007 AC-001 声明"规则集覆盖度 ≥ 42 条"，主卷 §1.3 成功指标和 §3.3 兼容性也使用相同数字。然而 F-007 正文中的规则示例表格仅列出 19 条具体规则，覆盖率低于目标值的一半。PRD 中没有说明：(a) 另外 23+ 条规则将在哪里定义（是 architect 阶段、还是已知但未在 PRD 中列出）；(b) 19 条示例表格的定位是"示例"还是"完整枚举"——这个歧义会让 architect 无法判断规则集的完整范围。
- **建议**: 在 F-007 规则表前后添加说明，明确当前 19 条是"已知规则示例子集"，另外 ≥ 23 条已知规则见"实测记录/补充文档"（如有），或由 architect 阶段补充完整清单。避免出现"目标 42 条、文档仅列 19 条"的数字落差。

---

### [R-004] MEDIUM: §3.2 非功能需求章节替换了模板规范的安全位置，NAV 与模板不一致

- **category**: convention
- **root_cause**: self-caused
- **描述**: PRD 模板标准结构为 `§3.1 性能 / §3.2 安全 / §3.3 兼容性`，当前文档将 §3.2 改为"可靠性与确定性"，将安全章节完全省略。NAV 块中也列为"§3.2 可靠性与确定性"，与标准 PRD 结构出现偏差，且未在文档中注明这是有意偏离模板。这会使 doc-review Layer 1 检查器误判章节结构，也会让 architect 无法通过 PRD §3.2 获取安全架构输入。
- **建议**: 恢复 §3.2 安全章节（见 R-001 建议），将当前"可靠性与确定性"内容归入 §3.1（作为性能&可靠性合并节）或单独作为 §3.4，保持与模板结构的对齐。

---

### [R-005] MEDIUM: 分卷 frontmatter 中 deps 声明与实际依赖关系不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 分卷 `prd-wechat-flow-f001-f014.md` 的 frontmatter 中 `deps: []`，但该分卷是从主卷 `prd-wechat-flow` 拆分而来（split_from 字段已正确声明），主卷是分卷的逻辑上游（分卷通过 split_from 声明）。deps 字段应反映依赖关系，使文档工具链能正确追踪分卷与主卷的关系，当前空 deps 会导致双向依赖链缺失一端。
- **建议**: 将分卷 frontmatter 中 `deps: []` 改为 `deps: ["prd-wechat-flow"]`，与 `split_from: "prd-wechat-flow"` 保持一致。

---

### [R-006] MEDIUM: F-011 优先级混合标注在主卷功能列表中显示为 P0/P1，定义不明确

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: 主卷 §2 功能列表中 F-011 标注优先级为 `P0/P1`，这在 PRD 优先级体系中是一个非标准值——优先级应该是每个 Feature 的单一值（P0/P1/P2），而非范围。虽然分卷 F-011 内部通过 AC 级标注（`AC-001（P0）` / `AC-005（P1）`）提供了细粒度优先级，但主卷的 `P0/P1` 对不了解分卷内容的下游（如 tech-lead 做任务优先级估排时）可能产生歧义，不知道该将 F-011 整体视为 P0 还是 P1。
- **建议**: 主卷功能列表中 F-011 优先级改为 `P0`（以最高优先级 AC 为准，与 architect 阶段决策对齐），在备注列中注明"详见分卷 AC 级细分"；或主卷不列优先级，统一引用分卷。

---

### [R-007] MEDIUM: 术语表缺少多个 PRD 正文中频繁使用的专有术语

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 术语表包含 24 个术语，但以下在分卷功能需求中频繁使用、且对新成员有歧义的术语未被定义：
  - `Zod`：用于 AC-004/F-010、AC-002/F-013，首次出现仅有代码样例，未定义其是什么（类型安全的 schema 校验库）
  - `AppID / AppSecret`：用于 F-005 AC-003，涉及微信公众号开发者凭证，专有名词需定义边界（不进浏览器的安全约束）
  - `EXIF`：用于 F-006 AC-003，图片元数据格式
  - `SHA-256`：用于 F-013 AC-001，哈希算法，与"确定性渲染"核心概念强关联
  - `CommonMark`：用于 F-001 AC-001，PRD 的基础 Markdown 规范，是整个功能依赖的标准
  - `mdast→hast`：F-002 备注和 F-003 AC-002 使用，表示渲染管线阶段，与术语表中"mdast"/"hast"分开定义但组合概念未解释
- **建议**: 在 §5 术语表中补充上述 6 个（或以上）高频专有术语，确保下游 architect / tech-lead 首次读 PRD 时不依赖额外背景知识。

---

### [R-008] MEDIUM: F-010 AC-004 将 Zod 作为实现技术硬性写入 AC，越过了 PRD 边界

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: F-010 AC-004 写道"全链路类型推导，schema 由 Zod 定义，props 类型自动推导"——将 Zod 作为实现技术写入了验收标准。PRD 应该描述"什么行为"（全链路类型安全，schema 与 props 类型自动推导）而非"用什么实现"（Zod），后者是 architect 技术选型的职责范围。类似地，F-013 AC-002 也写道"入参/出参由 Zod schema 定义"。Zod 虽然是合理的架构候选，但写入 AC 会锁死 architect 的技术选型空间。
- **建议**: F-010 AC-004 改为"全链路类型推导：组件 schema 与 props 类型在 TypeScript 层自动推导，开发者无需手写类型标注"；F-013 AC-002 改为"Tool 契约入参/出参有强类型 schema 定义（含运行时校验能力）"，将具体库选型留给 architect。

---

### [R-009] LOW: F-001 UI 规格区内容超出 PRD 职责范围，与 ui-spec 阶段产出存在重叠风险

- **category**: structure
- **root_cause**: self-caused
- **描述**: F-001 功能条目中包含大量 UI 骨架规格（三栏布局、顶部状态栏细节、抽屉/对话框清单、命令面板行为），并注明"留给 ui-designer 在 ui-spec 阶段细化"。这份描述的详细程度已接近 ui-spec 的内容（各区域名称、交互模式、组件列表），若 ui-designer 后续生成 ui-spec 时与此不一致将产生矛盾；若照单全收则 ui-spec 阶段冗余。
- **建议**: F-001 中 UI 骨架部分保留核心约束（如"三栏布局：编辑器居中，预览在右，文档管理在左"、"支持移动端 375px 视口"），删除具体交互细节（具体组件清单、操作路径）；或明确标注 `[DRAFT_UI_INPUT]` 表示这是给 ui-designer 的参考输入，非 PRD 规范性内容，避免 ui-spec 审查时出现"两份来源"冲突。

---

### [R-010] LOW: §3.1 性能指标表与 §1.3 成功指标部分重叠，存在单一事实来源风险

- **category**: consistency
- **root_cause**: self-caused
- **描述**: §1.3 成功指标中包含"万字文档键入延迟 < 50ms（P95）"、"MCP render_markdown 冷启动 P95 < 800ms"，§3.1 性能表中也有相同数字（数值一致）。当前两处数值相同不构成矛盾，但如果后续调整性能目标时需要同时修改两处，违反单一事实来源原则，存在未来不一致的风险。
- **建议**: §1.3 成功指标保留高层次目标（"实时响应的键入体验"、"秒级 MCP 渲染"），具体数字仅在 §3.1 性能表中定义；或在 §1.3 中用"详见 §3.1 性能"引用，消除重复。

---

### [R-011] LOW: F-005 / F-006 / F-013 中的服务端架构依赖未在 §4 约束与假设中统一声明

- **category**: completeness
- **root_cause**: self-caused
- **描述**: F-005（长图/封面 Headless 渲染需要服务端）、F-005 AC-003（素材库上传需要中继服务）、F-006 AC-001（多图床需要服务端 relay）均在各自备注中分散提及"需后端服务"，但主卷 §4 约束与假设中只有一条 [ASSUMPTION] 涵盖"云端功能（协作、素材库上传、Headless 渲染）需要后端服务"。这导致服务端依赖信息分散在多个 F-NNN 备注中，architect 需要逐条阅读分卷才能获取完整后端服务需求列表。
- **建议**: 在 §4 约束与假设中补充一条汇总型约束，明确列出所有依赖服务端的功能范围（F-005/F-006/F-013），帮助 architect 快速定位后端架构边界。

---

## 综合评估

### Layer 1 结论
- 主卷: FAIL（无 AC-NNN，分卷架构下的 reviewer-calibration 问题）
- 分卷: PASS with WARN（302 行边界超限，可接受）

### Layer 2 结论

| 严重等级 | 数量 | 问题编号 |
|---------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 2 | R-001, R-002 |
| MEDIUM | 5 | R-003, R-004, R-005, R-006, R-007, R-008 |
| LOW | 3 | R-009, R-010, R-011 |

> 注: MEDIUM 问题共 6 个（R-003 至 R-008），表格中数量有误，以上列详细问题为准。

| 严重等级 | 数量 | 问题编号 |
|---------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 2 | R-001, R-002 |
| MEDIUM | 6 | R-003, R-004, R-005, R-006, R-007, R-008 |
| LOW | 3 | R-009, R-010, R-011 |

### 关键发现说明

**R-001（HIGH，安全章节缺失）** 是最实质性的问题：对于一个具有 MCP server、第三方插件沙箱、用户凭据管理（AppID/AppSecret/图床 token）、XSS 攻击面（接受用户 Markdown 渲染 HTML）的工具，非功能需求中安全章节的完全缺失会导致 architect 在安全架构方面缺乏 PRD 输入指引。

**R-002（HIGH，Layer 1 FAIL 的根本原因）** 是结构合规性问题：主卷没有以自动化工具可识别的方式声明"AC 在分卷中"，导致 Layer 1 误报 FAIL 且无法自动消除。

**R-008（MEDIUM，Zod 写入 AC）** 的实质是 architect 技术选型权被 PRD 提前约束，两处 AC 均需要软化。

### 正向确认（质量优点）

- 14 个 F-NNN 条目结构完整（用户故事/AC/优先级/备注），无一缺失字段
- AC 可验证性高：绝大多数 AC 含数字指标（≥ 42 条、< 50ms、≤ 5%）或可观测行为描述
- [ASSUMPTION] 标注规范：4 处不确定项均已正确标注，覆盖平台行为、参数确认、后端部署形态
- 技术架构候选已正确"软化"：Web Worker + Comlink、Playwright、CRDT 均在备注中标为"架构候选"，未写入 AC 主体（F-010 AC-004 和 F-013 AC-002 中的 Zod 是例外，见 R-008）
- 过程标签残留扫描通过：未发现"本次新增"、"原方案"、版本里程碑、issue/PR 引用等违规残留
- 用户工作流一致性：§1.2 三类用户与 F-001/F-010/F-013 角色对应清晰
- 术语表覆盖率高：24 个核心术语全部在正文中有实际引用，定义与使用一致

---

## 最终 Verdict

**needs_revision**

存在 2 个 HIGH 级别问题（R-001 安全章节缺失、R-002 主卷分卷架构 Layer 1 FAIL 根本原因），按三态判定逻辑判定为 needs_revision。

需 product-manager 修订 CRITICAL/HIGH 问题后重新提交审查。MEDIUM/LOW 问题建议一并处理但不强制阻塞。
