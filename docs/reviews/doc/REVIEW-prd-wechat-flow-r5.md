---
id: "review-prd-wechat-flow-r5"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
---
# REVIEW: prd-wechat-flow r5（amendment 增量审查）

**被审文档**: `docs/prd/prd-wechat-flow.md` + `docs/prd/prd-wechat-flow-f001-f014.md`
**审查范围**: amendment 增量（customCss / register_variant / Tool 计数 23→24）
**上轮报告**: `docs/reviews/doc/REVIEW-prd-wechat-flow-r4.md`

---

## Layer 1 结论

| 文件 | 结果 | 说明 |
|------|------|------|
| prd-wechat-flow.md（主卷） | exit 1 | FAIL: status=approved 但检查器未找到审查报告（已存在 r4，Layer 1 文件路径匹配缺陷，历史可知假阳性，不作为本轮新问题）；WARN: ID 编号不连续（AC-007/010/011 跳号，因分卷拆分所致，预期 WARN） |
| prd-wechat-flow-f001-f014.md（features 分卷） | exit 0 + WARN | WARN: 文档行数 319 超过 300 行阈值（旧有，不新增） |

**Layer 1 评估**：两项 FAIL / WARN 均为历史既存或框架已知假阳性（Layer 1 FAIL 的"status=approved 但无审查报告"实际 r4 报告已存在，ID 跳号因分卷分布合理）。进入 Layer 2。

---

## Layer 2 语义审查

### 审查维度

**一致性 (consistency)**

增量修改处：

1. **§1.2.2 MCP server 行 Tool 计数**：`prd-wechat-flow.md` 第 56 行将计数从 23 更新为 24（"覆盖 24 个 Tool（20 同步 + 4 异步）"）。字面准确，与 arch#§3 对账行、API-016 说明、M-009 职责行均为 24。

2. **F-013 AC-002 `customCss` 描述**（`prd-wechat-flow-f001-f014.md` 第 280 行）：描述"调用方按需随调提交原生 CSS 文本（无状态 per-call），工具将其内联进产物并执行与主题样式同一份 CSS 白名单过滤，被拒绝的选择器/声明以结构化诊断回传（供 LLM 修正重试）"。与 arch API-001 request 参数、§5.3 自定义样式提交行、Q3.16 决策语义一致。

3. **F-010 AC-010**（第 232 行）：描述 `register_variant` 注册语义、与 AC-006 共享注册语义与自动校验链路。与 arch API-034 定义、M-005 注册接口、Q3.16 决策一致。

**完整性 (completeness)**

- F-010 AC-010 声明"注册条目的生命周期与持久化语义由 architect 阶段决策"——arch §8.2 Q3.16 已明确答复：进程内生命周期、不持久化、持久化需求出现时重评。PRD 的 defer 语义与 ARCH 决策衔接完整。
- F-013 AC-002 新增 `customCss` 描述，但**未更新 F-013 AC-002 的 response 字段枚举**：原有 `render_markdown` 返回 `{ html, diagnostics, rulesetVersion, themeVersion }`，`diagnostics` 字段说明未明确新增 `source=custom-css` 的诊断条目说明。arch API-001 response schema 已有对应描述，PRD 层未同步。此为 LOW 级别改善项（PRD 通常不至 response 字段粒度，但 AC-002 的契约描述作为 arch 下游锚点，增加 `customCss` 入参后 diagnostics 的语义扩展在 PRD 层有明示价值）。

**歧义 (ambiguity)**

- F-010 AC-010 第 232 行："与 AC-006 `defineVariant` 共享同一注册语义与自动校验链路"——AC-006 在第 228 行声明"标准化 variant 语法 `::: card{variant=custom-a}`"，但未明确"注册语义"的 AC 原文位置。通过 F-010 AC-005（白名单校验）可追溯，但 AC-010 中的"AC-006 `defineVariant`"说法实为 AC-005/AC-006 混合引用（AC-005 是 `defineVariant` 的 API，AC-006 是 variant ID 规范），措辞可进一步明确。评为 LOW 级别（不影响实现，下游 arch 已清晰定义）。

**安全 (security)**

- PRD §3.2 安全约束原有"CSS 属性白名单"描述；F-013 AC-002 新增 `customCss` 的白名单描述在功能层——与 §3.2 兜底安全要求语义一致，无矛盾。

**可行性 (feasibility)**

- juice/client 条件分支（无 customCss 时字节级不变）的可行性由 arch rn-006 技术调研论证，PRD 层不要求额外论证。
- 既有 CI SHA-256 fixture 基线兼容性：PRD 无直接涉及，由 arch Q3.9 决策保证（条件分支，token 路径产物字节级不变）。

---

## 问题列表

### [R-001] LOW: F-013 AC-002 未明示 diagnostics 字段的 custom-css source 扩展
- **category**: completeness
- **root_cause**: self-caused
- **描述**: `render_markdown` 新增 `customCss` 入参后，被拒绝声明将以结构化诊断回传；F-013 AC-002 仅在新增段落描述了白名单过滤，但 `render_markdown` 的 response 概要（`{ html, diagnostics, rulesetVersion, themeVersion }`）未注明 diagnostics 新增 `source=custom-css` 条目的语义扩展，下游 LLM 调用方阅读 PRD 时难以预期该字段。arch API-001 response 层已有完整描述，属 PRD→ARCH 传播缺口。
- **建议**: 在 F-013 AC-002 对 `render_markdown` response 的描述处补充"其中 `diagnostics` 含 `source: 'custom-css'` 条目，记录被白名单拒绝的选择器/声明（property + value + reason），供 LLM 修正重试"，与 arch API-001 response schema 对齐。

### [R-002] LOW: F-010 AC-010 引用措辞"AC-006 `defineVariant`"轻度混用两个 AC
- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: "与 AC-006 `defineVariant` 共享同一注册语义与自动校验链路"——`defineVariant` API 实定义于 AC-005，AC-006 是 variant ID 命名规范（namespace 前缀）。混用不影响下游实现（arch 已清晰），但文本稍有歧义。
- **建议**: 将"AC-006 `defineVariant`"修正为"AC-005 `defineVariant`（API 注册）/ AC-006（命名规范）共享同一注册语义与自动校验链路"，或简化为"与 plugin-api `defineVariant`（见 AC-005）共享"。

---

## 判定结论

**verdict: approved_with_notes**

无 CRITICAL / HIGH 问题；存在 2 条 LOW 级别改善项：R-001（PRD 层 diagnostics 语义未随 customCss 扩展同步）和 R-002（AC-010 内 AC-006 引用措辞轻度混用）。两项均不影响 arch 实现正确性。
