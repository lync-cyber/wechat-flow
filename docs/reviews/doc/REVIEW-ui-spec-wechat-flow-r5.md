---
id: "review-ui-spec-wechat-flow-r5"
doc_type: review
author: reviewer
status: approved
deps: ["ui-spec-wechat-flow", "ui-spec-wechat-flow-block-taxonomy", "ui-spec-wechat-flow-block-variants"]
consumers: [ui-designer, tech-lead, developer]
---
# REVIEW: ui-spec-wechat-flow r5（r4 HIGH 消除复审 — delta 复审）

**被审文档**: 分卷 `ui-spec-wechat-flow-block-taxonomy.md`（v0.1.1，§8.3）、分卷 `ui-spec-wechat-flow-block-variants.md`（v0.1.1，正文首段计数）、主卷 `ui-spec-wechat-flow.md`（v0.3.1，§2.1 索引段计数）
**审查范围**: 本轮仅复核 r4 报告的 2 个 HIGH（UI-001、UI-002）是否消除，不重审全文
**上轮报告**: `docs/reviews/doc/REVIEW-ui-spec-wechat-flow-r4.md`（needs_revision，2 HIGH）

---

## 消除验证

### UI-001（block-taxonomy §8.3 与 ARCH M-005 对齐说明失真）— 已消除

r4 指出 §8.3 原文声称 arch `BlockCategory` 枚举注释存在 `table`→`text`、`disclaimer`→`emphasis` 两处"偏差"，但经核对当时 arch 文本这两处其实已一致，真正的分歧（`structured` 注释含"定义列表"而冻结表把 `definition-list` 归 `text`）反而未被登记。

本轮核对：本次 revision 未止步于改写 ui-spec 陈述，而是由 architect 侧同步修订了 `arch-wechat-flow-modules.md`（v0.6.1→v0.7.2），新增完整的 `BlockCategory` 枚举定义与注释（此前 arch 文本中该枚举定义整体不存在，经 `git show <PR#101-commit>:docs/arch/arch-wechat-flow-modules.md` 核实）：

```
| 'text'        // 正文类：段落、标题、列表、引用、分隔线、代码块、表格、定义列表 等基础排版
| 'emphasis'    // 强调类：提示框、高亮块、警示、小技巧、拉引、免责声明 等注意力容器
| 'structured'  // 结构类：卡片、步骤、时间线、对比、问答 等信息骨架
```

§8.3 现文本逐句核对：
- 「`text` 枚举注释含「表格、定义列表」对应本表 `table`/`definition-list` 归 `text`」—— 与 arch 实际文本逐词一致
- 「`emphasis` 枚举注释含「免责声明」对应本表 `disclaimer` 归 `emphasis`」—— 与 arch 实际文本逐词一致
- 「`structured` 枚举注释（卡片、步骤、时间线、对比、问答）与本表 `structured` 全部条目（含 `dialog`/`kpi-card`，注释为非穷举示例）一致」—— arch `structured` 注释原文即为「卡片、步骤、时间线、对比、问答」，逐字引用无误；`dialog`/`kpi-card` 未被字面列出但文本已明确注明「非穷举示例」加以说明，不构成矛盾登记缺口

r4 原先指出的"definition-list 真正分歧未登记"问题已通过 arch 侧同步修订从根源消除（`text` 注释现直接包含「定义列表」，不再与 `structured` 冲突），不是靠 ui-spec 单方面文字规避矛盾。§8.3 现无失实陈述，无遗留分歧。**判定：消除，无新问题**。

### UI-002（block-variants.md 计数不一致：声称 10 实际 9）— 已消除

核对两处声明：
- `ui-spec-wechat-flow-block-variants.md` 正文首段：现文本为「本卷为 **9** 个内置 Block 的变体（`BlockVariant`）补充视觉规格」
- 主卷 `ui-spec-wechat-flow.md` §2.1 索引段：现文本为「`ui-spec-wechat-flow-block-variants.md`（§10）— **9** 个内置 Block 的变体（`BlockVariant.baseStyle`）视觉规格」

两处均已同步订正为 9，与实际 §10.1~§10.9 共 9 个小节（callout / divider / pull-quote / steps / quote / compare / dialog / announcement / gallery）及 [NAV] 块列出的 9 项完全一致。未发现遗漏第 10 个 Block 变体规格的迹象（未新增第 10 节，属于按 r4 建议(a) 路径修复：訂正数字为实际交付范围，非补齐遗漏项）。**判定：消除，无新问题**。

---

## 无回归核查

- `git diff` 确认本轮改动范围与声明落点吻合：主卷 §2.1 索引段计数、block-taxonomy.md §8.3 措辞、block-variants.md 正文首段计数，以及作为根治手段同步的 arch `BlockCategory` 枚举定义（architect 侧，非本次 ui-spec 审查对象，但与 UI-001 消除直接相关）
- 主卷 `uc001-uc014.md` / `arch-wechat-flow-api.md` 的 diff 内容（UC-015/UC-021 分类 Tab 数据化、API-006/API-005 schema 加 `category` 字段）与 r4 审查批次（PR #101）同源，非本次 r4→r5 修订新引入，不在本轮复审范围，未见新增问题
- Layer 1 对三份文件重跑，FAIL 模式与 r4 记录完全一致（分卷 checker 模板不匹配假阳性 + 主卷既有 P-001/P-002/P-003 图导出漂移），无新增 FAIL，确认本轮修订未引入回归

---

## Carry-over（不阻塞 verdict）

### [UI-003] MEDIUM: 主卷 P-001..P-003 图导出漂移与本次 amendment 无关（原样保留，来自 r4）

- **category**: consistency
- **root_cause**: upstream-caused（图后端/导出视图既有漂移）
- **描述**: Layer 1 对主卷持续报 FAIL："图内 36 个章节与其 level-2 tile 不一致 (P-001/P-002/P-003)...修订未到达导出视图"。本轮重跑确认该 FAIL 依旧存在且内容与 r4 记录时完全相同，本次 r4→r5 修订未触碰 §3 页面布局挂载点，与本次 revision 无关。
- **建议**: 同 r4——独立执行 `cataforge context ingest` 重建主卷 P-001..P-003 一致性，不在本次 revision 范围内处理。

---

## Verdict

**approved_with_notes**

r4 的 2 个 HIGH（UI-001、UI-002）均已消除，本轮复审未发现新增 CRITICAL/HIGH。唯一遗留项 UI-003 为 MEDIUM 且是既有、与本次 revision 无关的图导出漂移问题，按三态判定归入 approved_with_notes，不阻塞后续流程。

**notes_summary**: UI-003（P-001..P-003 图导出漂移）建议独立执行 `cataforge context ingest` 处理，非本次 revision 引入、非阻塞项。
