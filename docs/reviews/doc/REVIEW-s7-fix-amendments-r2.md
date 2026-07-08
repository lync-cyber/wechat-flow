---
id: "review-s7-fix-amendments-r2"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow-modules", "ui-spec-wechat-flow-block-variants", "ui-spec-wechat-flow-content-elements", "ui-spec-wechat-flow-uc001-uc014"]
consumers: ["orchestrator", "tech-lead"]
---

# REVIEW-s7-fix-amendments-r2

## 审查范围

复审 `REVIEW-s7-fix-amendments-r1.md`（verdict=needs_revision，R-001/R-002 HIGH + R-003/R-004 MEDIUM）针对性修订。核验对象（工作区未提交变更，`git diff` 口径）：

- R-001/R-002（architect 修订，T-160）→ `docs/arch/arch-wechat-flow-modules.md`（v0.7.2→v0.8.1）、`docs/arch/arch-wechat-flow-api.md`（v0.7.0→v0.7.1）、`docs/arch/arch-wechat-flow-data.md`（v0.6.1→v0.6.2）、`docs/arch/arch-wechat-flow.md`（v0.6.1→v0.6.2）
- R-003（ui-designer 修订，T-161）→ `docs/ui-spec/ui-spec-wechat-flow-block-variants.md` §10.6（v0.1.1→v0.2.0）
- R-004（architect 修订，T-160）→ `docs/arch/arch-wechat-flow-modules.md` §2.M-003 诊断分组判别契约

本轮聚焦四条问题是否真实解决 + 修订是否引入新问题，不重开 T-160/161/162 的全面审查（AC 覆盖已在 r1 核对完毕，不复核未涉及问题的条目）。

## 问题列表

### [R-005] LOW: M-007 新增插件示例段自相矛盾地出现「内置 41 块」表述，权威计数为 40

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 修复 R-001 时，`arch-wechat-flow-modules.md` §2.M-007 新增段落（第 298 行）为消解 gallery/callout 撞名问题换用 `promo-banner`/`plugin-timeline` 虚构插件示例，措辞称"其 blockId 命名空间与内置 **41 块**无交集"。但同文件第 214 行（本次修订未触碰的既有文本）明确写"全部 **40 个**内置 block 必须声明"，且 `packages/blocks/src/blocks/block-category.test.ts:132` 断言 `ALL_BLOCKS.length).toBe(40)` 是权威计数来源。修复 R-001 的同一段新增文本引入了与文件内部既有表述、与代码真值均矛盾的块数字面值，是本轮修订自身引入的新一致性问题（非 r1 遗留）。
- **建议**: 将第 298 行「内置 41 块」改为「内置 40 块」。

## R-001/R-002/R-003/R-004 逐条复核结论

### R-001（HIGH → resolved）: M-007 结构化 attrsSchema 示例与 M-005 内置 Block 契约自相矛盾

`arch-wechat-flow-modules.md` §2.M-007 新增段落（第 298 行）已将示例从内置 Block（`gallery`/`callout`）替换为不与内置 blockId 命名空间撞名的虚构插件场景（`promo-banner { headline, cta, imageUrl }`、`plugin-timeline { events }`），并显式加注"示例均为第三方插件场景，其 blockId 命名空间与内置块无交集，内置 Block 的属性模型以 §2.M-005 `directiveAttrs` 为准"。`grep "gallery\|callout" ... | grep attrsSchema` 核验零命中，原自相矛盾的举例已消除。**判定 resolved**，但修订本身引入 R-005（块数字面值笔误，见上）。

### R-002（HIGH → resolved）: `describe_block`（API-006）及关联下游文档未随 attrsSchema 移除同步修订

四份下游文档均已同步收口：

- `arch-wechat-flow-api.md` API-006 响应 schema 新增 `source: 'builtin'|'plugin'` 判别字段，`attrsSchema` 字段 desc 显式拆分语义——`source=builtin` 时为 core `directiveAttrs`（M-005，多数内置块为空 strict object）的 JSON Schema，`source=plugin` 时为 plugin-api 结构化 `attrsSchema`（M-007）的 JSON Schema；另新增 `directiveBody` 字段说明内置块正文/子结构写法。`describe_mark`（第 208 行）同步改为"core mark 行内指令属性的 JSON Schema…mark 均为内置，无 plugin 结构化数据域"，消除与 `describe_block` 的字段语义歧义。
- `arch-wechat-flow-modules.md` §2.M-012（第 393/404 行）"组件 schema"表述与 `component/attrs-schema.ts` 组件描述同步改写为"内置 Block `directiveAttrs` 指令域 / 插件 Block 结构化 `attrsSchema` 数据域"双轨措辞，且明确 `describe_block` 按 `source` 判别输出对应 JSON Schema。
- `arch-wechat-flow-data.md`（第 187 行）pack manifest `schemas` 字段 desc 改为"插件注册的 Block 结构化 `attrsSchema`…内置 Block 的指令域 `directiveAttrs` 归 core 注册中心，不落此字段"，消除内置块被误期待出现在 pack manifest schemas 集合的歧义。
- `arch-wechat-flow.md`（第 110 行）Zod 选型理由同步改写为"`describeBlock` 对内置 Block 输出 `directiveAttrs` JSON Schema、对插件 Block 输出结构化 `attrsSchema` JSON Schema"。

`grep -n "attrsSchema" docs/arch/*.md` 全部 8 处引用逐一核对，语义归属清晰（builtin/plugin 双轨判别在四份文档措辞完全一致），无悬空引用。**判定 resolved**。

### R-003（MEDIUM → resolved）: compare `left-label`/`left-value` 拆分未回填 §10.6 ledger 渲染描述

`ui-spec-wechat-flow-block-variants.md` §10.6 左列/右列描述已从"（`left` 字段）"改为"（指令属性 `left-label` + `left-value`，渲染为「{label}：{value}」）"，右列同构改为"渲染同左列"；标题字段措辞同步从"`title` 字段"改为"指令属性 `title`"。label/value 排布关系（同行「label：value」格式）已明确落地，与 T-160 `directiveAttrs` 新契约的字段拆分对齐。**判定 resolved**。

### R-004（MEDIUM → resolved）: UC-013 诊断分组（兼容性/可读性/违规词）缺少数据侧判别字段

`arch-wechat-flow-modules.md` §2.M-003（第 123-129 行）新增「UC-013 诊断分组判别契约」公开契约段，明确：违规词组 ← `ruleId === "keyword-lint"`；可读性组 ← `ruleId` 前缀 `readability-`；兼容性组 ← 其余全部条目（含无 `ruleId` 项）；夜间风险组 ← 独立 `nightRiskIssues` 数组。并显式声明判别依据是既有 `Diagnostic.ruleId` 字段、不新增 `category`/`group` 字段，同时点名 `lint-*` 前缀（`lint-filter-backdrop`/`lint-grid-layout`/`lint-position-fixed`）归兼容性组以消解与 `readability-` 前缀的混淆风险——这正是 r1 指出的具体混淆点。

代码级核验：`packages/ruleset/src/rules/readability/*.ts` 三条规则 id 均为 `readability-*` 前缀，`packages/ruleset/src/lints/keyword-lint.ts` id 为 `keyword-lint`，`packages/ruleset/src/rules/builtin/lint-{filter-backdrop,grid-layout,position-fixed}.ts` id 均为 `lint-*` 前缀——新增契约文字与代码实际 ruleId 命名完全吻合。`arch-wechat-flow-data.md`（第 312 行）`diagnostics` 字段 desc 同步补充"判别契约见 arch#§2.M-003"交叉引用。ui-spec 侧 UC-013/UC-023（T-162 amendment）的 `anchorGroup?: 'compat'|'readability'|'keyword'|'night-risk'` 枚举值与本契约的四组划分语义对齐。**判定 resolved**（采用"公开既有 `ruleId` 前缀约定为契约"而非 r1 建议的"新增 `category` 字段"，属等效解法——既消除文档空白，又不需要 schema 破坏性变更，可接受）。

## 修订未引入新问题核验

- **设计残留自检**: 对四份文档本轮 diff 逐一执行 COMMON-RULES §禁止设计阶段与变更说明残留 regex（`之前|previously|used to|修复了|替代了|MVP|原方案|改为|之前是|现已废弃|v[0-9]+\.[0-9]+\.[0-9]+\s*(起|新增|前后)|issue\s*#?[0-9]+|PR\s*#?[0-9]+|closes\s*#[0-9]+|fixes\s*#[0-9]+|本次新增|本轮加入|现已支持`），仅对新增行（`git diff | grep '^\+'`）扫描，零命中。
- **版本号递增**: 七份文档 frontmatter `version` 均单调递增（modules 0.7.2→0.8.1、api 0.7.0→0.7.1、data 0.6.1→0.6.2、主卷 0.6.1→0.6.2、block-variants 0.1.1→0.2.0、content-elements 0.1.0→0.2.0、uc001-uc014 0.3.0→0.4.0），无回退或冲突。
- **内部交叉引用**: `attrsSchema`/`directiveAttrs` 双轨措辞在 arch 四文件间交叉引用一致（§2.M-005 ↔ §2.M-007 ↔ §2.M-012 ↔ API-006 ↔ data.md schemas 字段 ↔ 主卷 Zod 选型行），UC-013 分组契约在 M-003 ↔ data.md ↔ ui-spec anchorGroup 枚举间对齐。未发现悬空引用。
- **块数表述**: 除 R-005（新增文本引入的「41 块」笔误）外，扫描本轮 diff 新增行未发现其他块数字面值错误；既有「全部 40 个内置 block」（第 214 行）未被本次修订触碰，保持正确。

## Verdict

**approved_with_notes**

问题计数：CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 1（R-005）。

r1 的两条 HIGH（R-001/R-002）与两条 MEDIUM（R-003/R-004）均已核实解决：R-001 示例改用不撞内置 blockId 的虚构插件场景；R-002 describe_block 契约完整重定义并四文档同步对齐、无悬空引用；R-003 §10.6 左右列排布关系明确为「label：value」同行渲染；R-004 诊断分组判别契约公开化且与代码 ruleId 命名实证吻合。本轮修订未引入设计残留或版本号问题，仅在解决 R-001 时新增一处独立的块数字面值笔误（R-005，LOW），不构成阻塞。T-160 AC-004（doc-review 门禁）可视本报告判定满足。
