---
id: "review-ui-spec-wechat-flow-r4"
doc_type: review
author: reviewer
status: approved
deps: ["ui-spec-wechat-flow", "ui-spec-wechat-flow-uc001-uc014", "ui-spec-wechat-flow-block-taxonomy", "ui-spec-wechat-flow-content-elements", "ui-spec-wechat-flow-block-variants"]
consumers: [ui-designer, tech-lead, developer]
---
# REVIEW: ui-spec-wechat-flow r4（视觉升级 amendment 批 — Block 分类 + 内容元素排版 + 组件变体规格）

**被审文档**: 主卷 `ui-spec-wechat-flow.md`（v0.3.0，§2.1/§6/§7 amend）、分卷 `ui-spec-wechat-flow-uc001-uc014.md`（v0.3.0，UC-015/UC-021 amend）、新增分卷 `ui-spec-wechat-flow-block-taxonomy.md`（v0.1.0）、`ui-spec-wechat-flow-content-elements.md`（v0.1.0）、`ui-spec-wechat-flow-block-variants.md`（v0.1.0）
**审查范围**: 本轮仅审增量 amendment 与新增分卷，不重审既有 UC-001..UC-014/UC-016..UC-022/UC-023/P-001..P-005 全文
**上轮报告**: `docs/reviews/doc/REVIEW-ui-spec-wechat-flow-r3.md`（approved）

---

## Layer 1 结果

`cataforge skill run doc-review -- ui-spec docs/ui-spec/{file} --docs-dir docs/ui-spec/` 对 5 份被审文件的结果：

| 文件 | exit | 关键输出 |
|------|------|---------|
| 主卷 ui-spec-wechat-flow.md | 1 | FAIL：图内 P-001/P-002/P-003 三个 level-2 tile 与实际章节不一致（"修订未到达导出视图"）；WARN：[NAV] 列出 §8/§9/§10（分卷交叉引用）被误判为"实际章节"缺失；WARN：行数 557 超阈值 |
| uc001-uc014.md | 1 | FAIL×6：缺少必填章节 设计方向/设计系统/页面布局/§0；仅 2 色彩 Token（模板期望整卷 ≥5）；WARN：23 组件中 21 缺状态视觉差异描述 |
| block-taxonomy.md（新增）| 1 | FAIL×7：同上模式（整卷模板套到分卷）+ ID 编号不连续 UC-016..020（分卷天然不含这些 UC） |
| content-elements.md（新增）| 1 | FAIL×6：同上模式 |
| block-variants.md（新增）| 1 | FAIL×7：同上模式 |

**判定：4 份分卷的 FAIL 属 checker 已知模板不匹配假阳性，非内容缺陷**——`check_required_sections` 对 `doc_type=ui-spec` 的分卷套用整卷模板必填章节表（设计方向/设计系统/组件清单/页面布局）与色彩 Token 数量下限，未按 frontmatter 自声明的 `required_sections` 收敛（自声明回退仅在模板解析失败时触发，ui-spec 模板可解析故不触发）；`check_status_provenance` 按分卷自身 id 找审查报告，与本项目分卷审查合并进单一 `REVIEW-ui-spec-wechat-flow-r{N}.md` 的既有惯例（r1~r3）不符。三个新分卷（block-taxonomy/content-elements/block-variants）属首次纳入 Layer 1 检查，同一假阳性模式对旧分卷（uc001-uc014.md）同样成立，说明是 checker 对分卷类文档的系统性行为而非新文件特有问题。按 COMMON-RULES §Layer 1 调用协议，此类判定为 reviewer-calibration，不计入 verdict，转入 Layer 2。

**主卷 FAIL 需要单独说明**：图内 P-001/P-002/P-003 tile 不一致 FAIL 与 [NAV] WARN 均与本次 amendment 无关——git diff 确认本次仅改动 [NAV] 尾部追加、§2.1 新增小节、§6.A-014、§7.PS-011 四处，P-001..P-005 分卷本身及主卷中 §3 页面布局的挂载点未被触碰。该 FAIL 疑似图后端（KG）与导出 md 视图之间的既有漂移（"修订未到达导出视图，经 `cataforge context ingest` 重建"提示指向此类漂移的标准修复路径），先于本次 amendment 存在，超出"仅审增量"范围，仅记录不计入本轮 verdict。

WARN 项（跨卷 UC 编号不连续、色彩 Token 数量、状态视觉差异描述覆盖率）均为既有信号或 checker 对分卷范围理解偏差，非本次新增分卷内容质量问题，不重复登记。

---

## Layer 2 Findings

### Critical

（无）

---

### High

#### [UI-001] HIGH: block-taxonomy §8.3「与 ARCH M-005 对齐说明」描述与 arch 当前文本不符，误导后续对齐动作

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `ui-spec-wechat-flow-block-taxonomy.md` §8.3 声称当前 arch `BlockCategory` 枚举注释存在两处偏差：①`structured` 示例含「表格」（应 `table`→`text`）；②`meta` 示例含「免责声明」（应 `disclaimer`→`emphasis`）。经比对 `arch-wechat-flow-modules.md` 本次 amend 后的实际文本：
  - `text` 枚举注释已含「表格」（`// 正文类：段落、标题、列表、引用、分隔线、代码块、表格 等基础排版`），与本表 `table`→`text` **已经一致**——§8.3 所称"structured 含表格"的偏差并不存在于当前 arch 文本。
  - `emphasis` 枚举注释已含「免责声明」（`// 强调类：提示框、高亮块、警示、小技巧、拉引、免责声明 等注意力容器`），与本表 `disclaimer`→`emphasis` **已经一致**——§8.3 所称"meta 含免责声明"的偏差同样不存在。
  - 真正未被 §8.3 提及、且确实存在的分歧：arch `structured` 枚举注释含「定义列表」（`// 结构类：卡片、步骤、时间线、对比、问答、定义列表 等信息骨架`），但本表 §8.2 冻结 `definition-list`→`text`（"基础排版元素（列表变体）"）——两者矛盾且完全未被 §8.3 登记。
- **影响**: architect 若照 §8.3 字面执行"措辞对齐"，会修改本已正确的 `text`/`emphasis` 枚举注释示例词（造成不必要变更），同时遗漏真正需要处理的 `structured` 注释「定义列表」词条，使对齐工作产出与实际冻结表继续脱节，问题不降反增。
- **建议**: 将 §8.3 改写为：「ARCH `arch-wechat-flow-modules.md` §M-005「Block / Variant 注册契约」中 `BlockCategory` 枚举的注释示例词，与本表的冻结结论存在一处偏差，供 architect 后续措辞对齐（不改变枚举值本身）：`structured` 枚举注释示例含「定义列表」，本表冻结 `definition-list` 归 `text`（列表变体，与 `list`/`heading`/`paragraph` 等同属基础排版）。`packages/blocks` 各 Block 定义文件的 `category` 字段实现以本表为准。」，删除关于 `table`/`disclaimer` 两条已不成立的偏差描述。

---

#### [UI-002] HIGH: block-variants.md 声称覆盖「10 个内置 Block」，实际内容仅 9 个

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `ui-spec-wechat-flow-block-variants.md` 正文首段（"本卷为 10 个内置 Block 的变体...补充视觉规格"）与主卷 `ui-spec-wechat-flow.md` §2.1 索引段（"`ui-spec-wechat-flow-block-variants.md`（§10）— 10 个内置 Block 的变体...视觉规格"）均声明覆盖 10 个 Block，但实际正文仅含 §10.1~§10.9 共 **9** 个小节（`callout` / `divider` / `pull-quote` / `steps` / `quote` / `compare` / `dialog` / `announcement` / `gallery`），与 [NAV] 块列出的 9 项一致。经全文扫描未发现第 10 个 Block 的隐藏小节或遗漏引用。
- **影响**: 数量声明与实际交付不一致是可观测的完整性缺陷；下游（tech-lead 排 dev-plan 任务、ui-designer 后续核对）若信任"10"这一数字会误以为遗漏了一个 Block 的变体规格查找，或反向误判"应有 10 个但文档只写了 9 个是漏项"从而发起不必要的返工调查。
- **建议**: 二选一修复：(a) 若 9 个 Block 变体即为本轮完整范围，将「10 个内置 Block」改为「9 个内置 Block」（主卷 §2.1 索引段与 block-variants.md 正文首段两处同步修正）；(b) 若确有第 10 个 Block（例如 `card` 或 `timeline`，taxonomy 中 `structured` 分类下的其余成员）遗漏，补齐该 Block 的变体视觉规格小节。以磁盘实际章节数为准核实后二选一，不可仅调整数字掩盖遗漏。

---

### Medium

#### [UI-003] MEDIUM: 主卷 P-001..P-003 图导出漂移与本次 amendment 无关但共处同一文件

- **category**: consistency
- **root_cause**: upstream-caused（图后端/导出视图既有漂移，非本次 amendment 引入）
- **描述**: Layer 1 对主卷 `ui-spec-wechat-flow.md` 报 FAIL："图内 36 个章节与其 level-2 tile 不一致 (P-001/P-002/P-003)...修订未到达导出视图"。git diff 确认本次 amendment 未触碰 §3 页面布局挂载点或 P-001..P-005 分卷本身，此 FAIL 先于本次修订已存在。
- **影响**: 不阻塞本次 amendment，但该 FAIL 会在下次任何触及主卷的 Layer 1 运行中持续复现，掩盖新引入问题的可见性（"狼来了"效应）。
- **建议**: 建议独立执行 `cataforge context ingest` 重建主卷 P-001..P-003 一致性（不在本次 amendment 范围内处理），避免长期带 FAIL 状态运行 Layer 1。

---

### Low

（无）

---

## Verdict

**needs_revision**

存在 2 个 HIGH（UI-001、UI-002），按 COMMON-RULES §三态判定逻辑归 needs_revision。两项均为 ui-designer 可自行修复的文字/计数订正，不涉及语义重新设计：

- UI-001：改写 block-taxonomy.md §8.3 对齐说明（用真实的 `structured`/「定义列表」分歧替换已不成立的 `table`/`disclaimer` 两条描述）
- UI-002：核实 block-variants.md 实际 Block 数量并同步修正「10」为「9」（或补齐遗漏的第 10 个 Block 变体规格）

其余内容（40 Block 冻结分类表与 `packages/blocks/src/index.ts` 的 `ALL_BLOCKS` 逐一核对确认 1:1 无遗漏无重复；content-elements.md 全部排版规格与 §9.1 微信平台硬约束通则自洽，无禁用手法；block-variants.md 除 UI-002 计数问题外的具体变体规格本身可实现、无 float/伪元素/flex-grid 依赖；UC-015/UC-021 分类 Tab 标签与顺序跨文档一致）经审查判为高质量交付，UI-001/UI-002 修复后建议直接进入 approved，无需重跑全量 Layer 2。
