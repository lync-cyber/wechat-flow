---
id: "review-arch-wechat-flow-r7"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-api", "prd-wechat-flow-f001-f014"]
---
# REVIEW: arch-wechat-flow r7（r6 revision 聚焦复审 + PRD r5 calibration 裁决）

**被审文档**: `docs/arch/arch-wechat-flow.md`（主卷）、`docs/arch/arch-wechat-flow-api.md`（api 分卷）、`docs/prd/prd-wechat-flow-f001-f014.md`（features 分卷）
**审查范围**: r6 revision 修复验证（R-001 HIGH / R-002 MEDIUM / R-004 LOW）+ calibration 裁决（arch r6 R-003 / prd r5 R-002）
**上轮报告**: `docs/reviews/doc/REVIEW-arch-wechat-flow-r6.md`（needs_revision）、`docs/reviews/doc/REVIEW-prd-wechat-flow-r5.md`（approved_with_notes）

---

## 修复验证结果

### [arch r6 R-001] HIGH — 验证结果: 已修复

**声明**: §8.1 F-013 映射行改为"24 Tool — 含 API-033 describe_template + API-034 register_variant"。

**实证**: 读取 `docs/arch/arch-wechat-flow.md` 第 406 行：

> `F-013 | 程序化调用 (MCP/CLI/Skill) | P1 | M-009 (MCP server, 24 Tool — 含 API-033 describe_template + API-034 register_variant) / M-011 (CLI) / M-008 (应用层 use case) / M-012 (schema 契约层) / skill/ 目录 (Skill bundle，编排说明与 prompts)`

Tool 计数已从 23 改为 24，API-034 已补入描述，与 §3 MCP Tool 总数对账段（24）、§8.2 Q3.16（"MCP Tool 总数 23 → 24"）、PRD §1.2.2（24）、M-009 职责行（24）全链路一致。

**结论**: R-001 修复完整，内部矛盾消除。

---

### [arch r6 R-002] MEDIUM — 验证结果: 已修复

**声明**: `docs/arch/arch-wechat-flow-api.md` API-034 errors 段已补 `SchemaValidationError: { code: "E_SCHEMA", http: 400, ... }`。

**实证**: 读取 api 分卷第 495 行：

> `SchemaValidationError: { code: "E_SCHEMA", http: 400, desc: "入参校验失败（blockId / variantId / label 为空字符串，或 style 不符合 Record<string, Record<string, string>> 结构 / 为空 map）" }`

400 路径已明确，错误码、http 状态码、触发条件描述齐全，与其他 API（API-017 等）`E_SCHEMA` 体例一致。

**结论**: R-002 修复完整，API-034 errors 契约补全。

---

### [arch r6 R-004] LOW — 验证结果: 已修复

**声明**: §8.2 Q3.15 详细决策记录"何时重新评估"段已扩为 3 条，含第 (3) 条退回方案 (A) 的触发条件。

**实证**: 读取 `docs/arch/arch-wechat-flow.md` 第 463 行：

> **何时重新评估**：(1) 若出现主题须覆盖结构骨架（非视觉 token 槽位）的真实需求，评估 override 槽位放宽或主题级 base-style 替换机制；(2) 若 token override 槽位语义与主题守护 token 覆盖率维度产生口径冲突，由 M-005 guard 维度定义先行收口；(3) 若 T-058 视觉回归实测发现三层合成存在无法在现有优先级模型（base ⊕ override ⊕ custom）内解决的样式冲突，或分层合成的调试成本实证高于样式重复的维护成本，退回方案 (A) 主题私有副本 + variant 维度。

三条重评条件已补全，第 (3) 条明确退回方案 (A) 的触发条件，决策记录完整。

**结论**: R-004 修复完整。

---

### [prd r5 R-001] LOW — 验证结果: 已修复

**声明**: `docs/prd/prd-wechat-flow-f001-f014.md` F-013 AC-002 render_markdown 行已补 `diagnostics` 中 `source: 'custom-css'` 条目语义。

**实证**: 读取第 280 行：

> `render_markdown`：主入口，返回 `{ html, diagnostics, rulesetVersion, themeVersion }`；支持可选 `customCss` 入参——[...] 被拒绝的选择器/声明以 `diagnostics` 中 `source: 'custom-css'` 条目回传（记录 property + value + 拒绝原因，供 LLM 修正重试），不阻断渲染

`diagnostics` 新增条目的完整语义（source 标识、property + value + 拒绝原因三元组、供 LLM 修正重试的用途）已在 PRD 层明示，与 arch API-001 response schema 对齐。

**结论**: R-001（prd r5）修复完整。

---

## Calibration 裁决

### [arch r6 R-003] MEDIUM — reviewer-calibration 主张 — 裁决: agree（接受异议，R-003 撤销）

**原问题**: rn-006 frontmatter `doc_type: research` 与 doc-review SKILL.md 枚举 `research-note` 不匹配。

**证据核实**:

1. **模板权威来源**: `.cataforge/skills/context/templates/utility/research-note.md` frontmatter 第 3 行明确写 `doc_type: research`，不是 `research-note`。
2. **_registry.yaml 权威定义**: `research-note` 条目下 `doc_type: research`——这是模板实例化时写入文档 frontmatter 的实际值。
3. **doc-review SKILL.md 的 `research-note`** 出现在 `argument-hint:` 行，是 CLI 调用时传入的 *template_id*（文档类型名），并非 frontmatter 字段值；二者是不同层次的概念：template_id（`research-note`）→ frontmatter 值（`research`），框架自身已做此映射。
4. **`cataforge docs validate`** 返回 0 invalid，项目全部 6 个 research note 均使用 `doc_type: research`，符合项目约定与框架模板定义。
5. **doc-nav SKILL.md** 明确列出内置 doc_types 含 `research`，与模板 frontmatter 一致。

**裁决结论**: r6 R-003 属 reviewer-calibration 误报。`doc_type: research` 是 `research-note` 模板实例化后的正确 frontmatter 值，由框架模板与 registry 双重锚定，Layer 1 的"未知类型"判定源于 doc-review 脚本的 template_id 到 doc_type 映射缺失，属框架内部问题，不应要求文档作者修改 frontmatter。**R-003 从问题列表移除。**

---

### [prd r5 R-002] LOW — reviewer 误报主张 — 裁决: agree（接受异议，R-002 撤销）

**原问题**: r5 报告称"AC-006 `defineVariant`"说法混用，认为 `defineVariant` API 定义于 AC-005 而非 AC-006。

**证据核实**:

读取 `docs/prd/prd-wechat-flow-f001-f014.md`：

- **AC-005**（第 227 行）: "自动校验：白名单标签 / 白名单 CSS / token 依赖完整性 / variant 申报与实际注册一致性" — 这是自动校验链路描述，**未出现 `defineVariant`**。
- **AC-006**（第 228 行）: "Variant 注册扩展点：插件可向已有 Block 注册新 variant 皮肤（`defineVariant({ blockId, id, render })`）" — `defineVariant` API **明确定义于 AC-006**。
- **AC-010**（第 232 行）: "与 AC-006 `defineVariant` 共享同一注册语义与自动校验链路（白名单标签 / 白名单 CSS / variant 申报一致性，见 AC-005）" — 引用 AC-006 指向 `defineVariant`（注册语义），括号内另引 AC-005 指向自动校验链路，两处引用各有明确指向，**不存在混用**。

r5 报告将 AC-005 误认为是 `defineVariant` 的定义位置，实为审查员读错 AC 对应关系。AC-010 的文字"与 AC-006 `defineVariant` 共享…（见 AC-005）"语义清晰且准确。

**裁决结论**: prd r5 R-002 属 reviewer 误报。AC-010 现有措辞引用准确，无需修改。**R-002（prd r5）从问题列表移除。**

---

## 综合问题列表

本轮复审所有原始问题（4 项 arch r6 + 2 项 prd r5）状态汇总：

| 编号 | 严重等级 | 来源报告 | 状态 |
|------|---------|---------|------|
| arch r6 R-001 | HIGH | arch-wechat-flow-r6 | 已修复 |
| arch r6 R-002 | MEDIUM | arch-wechat-flow-r6 | 已修复 |
| arch r6 R-003 | MEDIUM | arch-wechat-flow-r6 | reviewer-calibration agree，撤销 |
| arch r6 R-004 | LOW | arch-wechat-flow-r6 | 已修复 |
| prd r5 R-001 | LOW | prd-wechat-flow-r5 | 已修复 |
| prd r5 R-002 | LOW | prd-wechat-flow-r5 | reviewer 误报 agree，撤销 |

**无新增问题。**

---

## 判定结论

**verdict: approved**

arch r6 的 1 HIGH（R-001）、2 MEDIUM（R-002 已修复，R-003 撤销）、1 LOW（R-004 已修复）全部闭环；prd r5 的 2 LOW（R-001 已修复，R-002 撤销）全部闭环。文档全集无残留 CRITICAL/HIGH/MEDIUM/LOW 开放问题。
