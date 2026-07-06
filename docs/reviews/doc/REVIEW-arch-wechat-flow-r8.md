---
id: "review-arch-wechat-flow-r8"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow-modules", "arch-wechat-flow-api"]
consumers: [architect, tech-lead, ui-designer]
---
# REVIEW: arch-wechat-flow r8（视觉升级 amendment 批 — Block/Variant 注册契约 + 主题 token 契约）

**被审文档**: `docs/arch/arch-wechat-flow-modules.md`（v0.7.1，§M-005 amend）、`docs/arch/arch-wechat-flow-api.md`（v0.7.0，API-005/API-006 amend）
**审查范围**: 本轮仅审增量 amendment 段落（§M-005「Block / Variant 注册契约」+「主题 token 契约」、API-005/API-006 的 category 字段补充），不重审全文既有内容
**上轮报告**: `docs/reviews/doc/REVIEW-arch-wechat-flow-r7.md`（approved）

---

## Layer 1 结果

`cataforge skill run doc-review -- arch docs/arch/arch-wechat-flow-modules.md --docs-dir docs/arch/` 与同参数下的 `arch-wechat-flow-api.md` 均返回 `exit 1`，FAIL 项为「缺少必填章节: 架构概览/接口契约/数据模型」+「status=approved 但缺少审查报告 `REVIEW-arch-wechat-flow-modules-r*.md`」。

**判定：checker 对分卷文档的已知模板不匹配假阳性，非内容缺陷**。核实依据：
1. `check_required_sections` 按 `doc_type=arch` 从**模板**取整卷必填章节清单（架构概览/模块划分/接口契约/数据模型），当模板解析成功时**不**回退到 frontmatter 自声明的 `required_sections`（该回退仅在模板缺失时触发）；两份分卷各自的 frontmatter 已正确自声明 `required_sections: ["## 2. 模块划分"]` / `["## 3. 接口契约"]`，但被忽略。
2. `check_status_provenance` 按分卷自身 `id`（`arch-wechat-flow-modules` / `arch-wechat-flow-api`）拼路径找审查报告，而本项目历史上（r1~r7）分卷审查结论一律记入统一的 `REVIEW-arch-wechat-flow-r{N}.md`（本报告即是），从未按分卷 id 单独出报告；`docs/reviews/doc/REVIEW-arch-wechat-flow-r7.md` 已确认覆盖 modules/api 两分卷。
3. 该 FAIL 签名在 r3~r7 全部复现（`REVIEW-arch-wechat-flow-r5.md` 记「Layer 1 四卷均 exit 0」与本次实测不一致，说明历史 reviewer 也曾对同一 checker 行为做出不同解读，但 r6 已明确将同签名 FAIL 定性为"同主卷 Layer 1 假阳性，r5 已存在"），本轮未见 checker 行为回归或恶化。

按 COMMON-RULES §Layer 1 调用协议，运行时/环境异常降级进入 Layer 2；此处判定为 reviewer-calibration 类假阳性，不计入 verdict，全量转入 Layer 2 语义审查。WARN 项（行数超阈值、跨卷 API/E/M 编号不连续）为既有信号，非本次 amendment 引入，不重复登记。

---

## Layer 2 Findings

本文档（arch-wechat-flow-modules.md / arch-wechat-flow-api.md）本次 amend 内容经核实**内部自洽**：`BlockCategory` 6 值枚举定义、`BlockDefinition.category` required 字段、`BlockVariant.baseStyle?` 可选字段、`getBlockBaseStyle` 四步解析顺序、API-005/API-006 的 `category` 响应字段描述，彼此一致且与 §3.1 Tool 契约整体风格统一。跨文档一致性问题（ui-spec block-taxonomy §8.3 对本文档枚举注释的描述有误）记录在 `REVIEW-ui-spec-wechat-flow-r4.md` [UI-001]（缺陷文本物理位于 ui-spec 分卷，不在本文档内，故不在此报告登记为 arch 侧问题）。

### High

（无 —— arch 侧本次 amend 内容无 HIGH 级问题；跨卷一致性问题的责任文件位于 ui-spec，见上）

---

### Medium

#### [R-002] MEDIUM: getBlockBaseStyle 四步解析顺序与当前实现存在未声明的实现滞后

- **category**: completeness
- **root_cause**: self-caused（架构先行于实现是合理顺序，但契约段未显式标注实现状态，读者可能误判为已落地）
- **描述**: §M-005「Block / Variant 注册契约」定义的 `getBlockBaseStyle(blockId, variantId)` 四步解析顺序（default → 内置 variant.baseStyle → 运行时 registerVariant store → `{}`）与 `packages/core/src/registry/variant.ts` 当前实际实现（仅两分支：`default` → `blockDef.baseStyle.root`；否则 → `store.get(key)?.style?.root`）不一致——当前实现缺少契约第 2 步（命中内置 `variants` 中某项且该项自带 `baseStyle` 的情形），且 `packages/core/src/registry/block.ts` 的 `BlockVariant` interface 本身还没有 `baseStyle` 字段，`BlockDefinition` 也还没有 `category` 字段。这与 arch M-005 契约描述的目标状态存在实现缺口。
- **影响**: 该缺口本身是预期的"架构先行"正常状态（非本次 amendment 缺陷），且已被 CLAUDE.md §待办 的 UC-015 分类 tab defer 间接覆盖，但 arch 契约段没有显式标注"目标契约，`category`/`BlockVariant.baseStyle` 字段待 implementer 落地"，纯读 arch 文档的下游（tech-lead 排 Sprint 任务时）可能误判为已可直接消费。
- **建议**: 在「Block / Variant 注册契约」小节末尾补一句实现状态提示，例如："`BlockDefinition.category`、`BlockVariant.baseStyle` 字段与四步解析顺序为目标契约；当前 `packages/core` 尚未落地，落地纳入后续 dev-plan 任务"。不要求本轮阻塞，可与其他 MEDIUM 一并选择性修复。

---

### Low

（无）

---

## Verdict

**approved_with_notes**

无 CRITICAL/HIGH 问题（Layer 2 未在 arch 侧发现 HIGH 级问题；跨卷一致性问题的缺陷文本位于 ui-spec，已在该报告单独判定，见 `REVIEW-ui-spec-wechat-flow-r4.md`）。存在 1 个 MEDIUM（R-002：`getBlockBaseStyle` 目标契约与当前实现滞后未显式标注），按三态判定归 approved_with_notes。

Layer 1 的两处 FAIL 判定为 checker 对分卷文档的已知假阳性（reviewer-calibration，详见上），不计入判定。
