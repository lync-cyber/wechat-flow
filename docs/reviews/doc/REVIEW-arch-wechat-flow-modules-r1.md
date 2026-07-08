---
id: "review-arch-wechat-flow-modules-r1"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow-modules"]
consumers: [architect, tech-lead, orchestrator]
---

# REVIEW: arch-wechat-flow-modules (T-181 ruleset 双语义域 amendment) — r1

审查对象: `docs/arch/arch-wechat-flow-modules.md` version 0.9.2
审查范围: T-181 amendment 引入的内容——§2.M-002/M-003/M-004/M-005/M-008 两相执行契约、管线 stage 序列、附录 A（45 条规则归域裁定）、附录 B（用户决策矩阵）。不重审 amendment 之外的 pre-existing 正文，除非与新内容直接矛盾。

Layer 1 机检代偿（`cataforge` 在本环境不可用，手工核对）：
- frontmatter 完整性（id/doc_type/author/status/deps/consumers/version）：通过，7 字段齐全，`version: "0.9.2"`。
- 无未标注 TODO/TBD/FIXME：通过（唯一 `[ASSUMPTION]` 标注于 M-003 §「PRD 19 条 vs ARCH ≥42 条差距」，属 pre-existing 且已正确标注）。
- 内部 §编号引用可解析：本卷仅一个顶层章节 `## 2. 模块划分`，`§2.M-00N` 类自引用全部可在本文件内解析；`arch#§3` / `§5.2` / `§5.3` / `§6.3` / `§8.2` 等跨卷引用指向主卷 `arch-wechat-flow.md`，无法在本环境验证，按环境限制处理（见文末）。
- 设计过程/变更叙事残留 regex 自检：未命中 `之前|previously|used to|MVP|原方案|之前是|现已废弃|issue\s*#?\d+|PR\s*#?\d+|closes#|fixes#` 等禁用模式；但发现 T-NNN 任务票号大量嵌入正文（见 R-005），已按 §统一问题分类体系 单独评估，未套用 regex 硬性判定（T-NNN 不在 COMMON-RULES 明文 regex 清单内，按 reviewer-calibration 单独裁量记为 MEDIUM）。

---

## 问题列表

### [R-001] HIGH: strip-data-attr 的"须在生成管线语义 data-* 前清理"表述与 stage 序列表直接矛盾
- **category**: consistency
- **root_cause**: self-caused
- **描述**: 附录 A.1 对 `strip-data-attr` 的不迁移理由写道："须在 injectNodeIds / decorate 生成管线语义 data-*/data-block/data-variant/data-slot/data-{block}-{attr} 透传前清理"（隐含承诺：strip-data-attr 执行时刻早于 `data-{block}-{attr}` 透传发生）。但 §2.M-002 管线 stage 序列表明确：`data-{block}-{attr}` 透传与 `decorate(element, ctx)` 钩子调用发生在 **stage 2 transform**（"指令属性透传（transform stage）"，见 stage 表第 2 行 + 「通用渲染机制」第 1 条），而 `strip-data-attr` 所在的 ruleset authoring 相是 **stage 5**（sanitize 之后、injectNodeIds 之前）。stage 2 严格早于 stage 5，即 `strip-data-attr` 执行时 `data-{block}-{attr}` 早已存在于树上——"须在……透传前清理"这一时序保证在本文档自己的 stage 表中根本不成立。
  真正起作用的安全机制只能是**属性名排除**（matcher 显式跳过 `data-node-id` / `data-block` / `data-variant` / `data-slot` / `data-{block}-{attr}` 前缀），而非"执行顺序早于生成"。文档当前把一个（在本文档自证为假的）时序保证当作 authoring 相不迁移的依据之一，会误导 T-182 实现者：要么误以为调整 stage 顺序即可获得安全性（不可能，transform 恒早于任何 ruleset stage），要么忽略必须显式实现的属性名排除逻辑，造成 `strip-data-attr` 在真实执行时把 T-163 已交付的 `data-{block}-{attr}` 透传机制（dialog speaker / pull-quote author / compare 标签等）连带清除的功能回归。
  §2.M-003 正文（"归此的规则其目标构造...或迁至 output 会破坏管线语义脚手架"）的措辞是准确的（论证的是"不能迁 output"，不是"必须先于 transform"）；矛盾具体出在附录 A.1 表格行的措辞，与正文不同源。
- **建议**: 修正附录 A.1 `strip-data-attr` 行的"不迁移理由"为准确表述——例如："matcher 须显式排除 `data-node-id` / `data-block` / `data-variant` / `data-slot` / `data-{block}-{attr}` 前缀（该透传已在 transform stage 2 生成，早于本规则所在的 authoring stage 5）；若迁至 output 相，届时树上已积累 injectNodeIds / decorate / customCss 全部生成的 data-* 脚手架，误清除面更大——故仍应留 authoring 相，但安全性来自属性名排除而非执行顺序"，并与 §2.M-003 正文措辞对齐。

### [R-002] HIGH: readability-* 规则的执行落点在 stage 11（ruleset output 相）与 stage 12（collectNightRiskIssues）之间自相矛盾
- **category**: consistency
- **root_cause**: self-caused
- **描述**: 附录 A.2 将 `readability-font-size-min` / `readability-line-height-min` / `readability-paragraph-length` 三条规则明确归入 **output 相**（"命中全部生成小字号——与 clamp-font-size 同源，决策矩阵②"等表述隐含它们经由 stage 11 `applyRuleset(hast, rules, "output")` 统一分发执行,§2.M-003 "两相执行契约"也声明"单一注册表两相执行")。
  但 §2.M-002 管线 stage 表第 12 行 `collectNightRiskIssues`（`pipeline/readability.ts`）的备注写道："后移至 output 相后的最终树；**夜间风险 / 可读性诊断**消费真实产物计算样式"——字面把"可读性诊断"也归入这个独立于 stage 11 的第 12 步骤。stage 11 与 stage 12 在表中是两个先后独立的 hast 变换/收集步骤，若 readability-* 三条规则真的经 stage 11 的 `applyRuleset(..., "output")` 执行，那 stage 12 就不该再重复"消费可读性诊断"；若 readability-* 实际是在 stage 12 的 `collectNightRiskIssues`/`pipeline/readability.ts` 中执行，则附录 A.2 把它们标注为经由 stage 11 output-phase ruleset 统一分发（"单一注册表"）就不准确，且与 M-003 §「规则语义域契约」"单一注册表两相执行"的强声明矛盾。
  此外文件路径本身也不统一：M-003 §内部关键组件用单文件 `lint/readability.ts` 描述该模块（同时产 readability Diagnostic 与 nightRiskIssues），M-003 §内部关键组件列表另一行又称 `rules/readability/` 为**目录**（"另注册 3 条可读性 lint 规则"，暗示遵循 `rules/builtin/{rule-id}.ts` 一文件一规则的目录惯例），M-002 stage 12 又引用第三个路径 `pipeline/readability.ts`（M-002 包内）。三处路径描述指向同一功能域却互不统一，且未说明 M-002 的 `pipeline/readability.ts` 与 M-003 的 `lint/readability.ts` / `rules/readability/` 是否为同一实现、谁调用谁。
  这直接关系 T-182 的可实现性：实现者无法从本文档唯一确定 readability-* 三条规则应该以什么代码路径、在 stage 11 还是 stage 12 被调用一次而非两次。
- **建议**: 二选一并统一全文表述：(a) readability-* 三条规则就是 stage 12 `collectNightRiskIssues` 的内部实现，此时应删除或改写附录 A.2 中暗示它们经 stage 11 通用 `applyRuleset` 分发的措辞，并说明 stage 12 是否也算广义"output 相执行"（即 stage 11+12 是同一语义域下的两个物理步骤）；或 (b) readability-* 确实经 stage 11 `applyRuleset(..., "output")` 统一执行产出 `Diagnostic[]`，此时 stage 12 `collectNightRiskIssues` 仅负责从最终树独立计算 `nightRiskIssues`（对比度专属，不含 readability-* 三条规则的字号/行高/段长检查），需改写 stage 12 备注去掉"可读性诊断"字样，只保留"夜间风险"。无论选哪种，统一 `lint/readability.ts` / `rules/readability/` / `pipeline/readability.ts` 三处路径为单一权威路径。

### [R-003] MEDIUM: keyword-lint 在 13-stage 管线表中的执行落点未显式标注，与"单一注册表"表述的覆盖范围存疑
- **category**: completeness
- **root_cause**: self-caused
- **描述**: 附录 A.1 标题写"6 条 + keyword-lint"，且该行明确标注"（非 builtin 文件规则）"——即 keyword-lint 不计入 "42 条 builtin + 3 条 readability = 45 条注册" 的头部统计。但 §2.M-003"规则语义域契约"声称"单一注册表两相执行——`applyRuleset(hast, ruleset, stage)` 先按 stage 过滤规则子集再执行"，暗示全部规则（含 keyword-lint）经同一 `applyRuleset` 调度。若 keyword-lint 确实不属于 `RuleDefinition` 注册表（其"非 builtin 文件规则"的定语暗示如此），则 §2.M-002 13-stage 管线表理应在 stage 5（ruleset — authoring 相）之外单独列出 keyword-lint 的调用点，但当前表中不存在此行，keyword-lint 的实际调用位置（是否被塞进 stage 5 内部、还是独立于 stage 5 之外的另一次调用）不可从文档确定。
- **建议**: 明确 keyword-lint 是否也是一个 `RuleDefinition`（只是文件不在 `rules/builtin/` 目录、而在别处，因此不计入"42条"的文件计数，但仍参与同一 `applyRuleset` 调度）；或它确实是完全独立于 `applyRuleset` 之外的调用（此时需要在 stage 表中新增一行或在 stage 5 备注中显式写出"含 keyword-lint 独立调用"），并相应修正"单一注册表两相执行"的覆盖范围表述，避免读者误以为该声明无条件覆盖全部 authoring 相行为。

### [R-004] MEDIUM: `rules/readability/`（目录）与 `lint/readability.ts`（单文件）两种路径表述并存，指向同一功能域
- **category**: consistency
- **root_cause**: self-caused
- **描述**: 见 R-002 描述中的路径部分单独摘出：M-003 §内部关键组件同时给出 `rules/readability/`（"另注册 3 条可读性 lint 规则"，目录语义，暗示遵循一文件一规则惯例）与 `lint/readability.ts`（单文件，"F-011 AC-006 可读性运行时检查……遍历过程中对 contrastRatio < 4.5 的节点产 NightRiskEntry"）两种路径描述，均未标注彼此关系。即便 R-002 的 stage 归属矛盾得到澄清，路径表述本身仍需统一，避免实现者按文档字面创建两套并存代码。
- **建议**: 与 R-002 一并修正；若 3 条 readability-* 规则确按 `rules/builtin/{rule-id}.ts` 惯例各自独立文件存放于 `rules/readability/{rule-id}.ts`，则 M-003 §内部关键组件的 "`lint/readability.ts`" 行应改写为准确指向该目录，或说明其为聚合入口/re-export。

### [R-005] MEDIUM: T-NNN 任务票号密集嵌入架构正文，模糊 arch（稳定技术契约）与 dev-plan（执行追踪）的层次边界
- **category**: convention
- **root_cause**: self-caused
- **描述**: 附录 A/B 内多处以任务票号驱动叙事而非纯技术依据，例如：附录 A 标题"（T-183 分组开闸执行清单）"、"开闸风险……是 T-183 逐组基线 diff 审计的预警"、"决策①已裁定剥除……T-183 直接开闸"、`strip-width-height-inline`"T-178 已裁移除——生产实证过严"、`dropcap/装饰行高`冲突项"首字下沉紧排 T-168"。COMMON-RULES §禁止设计阶段与变更说明残留 禁止在长期文档中留存"指向追踪票或里程碑的注脚"（如 issue/PR 引用），意图是让长期技术文档不随执行节奏腐化。T-NNN 虽非 GitHub issue/PR，但同属"外部追踪票号"性质——本文档大量使用 T-183 作为"这批规则何时开闸执行"的组织主线，把执行调度信息（本该属于 dev-plan）编织进 arch 的技术裁定表述中，二者耦合后：dev-plan 里程碑变化（如 T-183 被拆分或重排）需要同步回改 arch 措辞，制造不必要的跨文档同步负担。
- **建议**: 保留决策依据与技术事实（如"decision①已裁定剥除，wechat profile 开启 strip-font-family"），移除或收敛纯执行调度性质的 T-NNN 引用（如"T-183 直接开闸""T-183 逐组基线 diff 审计的预警"可改为"归域裁定，需在开闸时逐组基线 diff 审计验证"，不点名具体任务票号）；确需标注执行归属时，统一放在附录标题或一处"执行入口"说明，不逐条散布。

### [R-006] LOW: `patch-pseudo-element-materialize` 规则 id 前缀 `patch-` 与其 `scope: lint` 字段不一致
- **category**: convention
- **root_cause**: self-caused
- **描述**: 附录 A.2 中 `patch-pseudo-element-materialize` 行的 `scope` 列标注为 `lint`，但其 ruleId 以 `patch-` 前缀命名，与同表 `patch-flex-to-block`（`scope: patch`，命名一致）形成对比，容易被误读为 scope 列填写错误。
- **建议**: 核对 `packages/ruleset/src/rules/builtin/patch-pseudo-element-materialize.ts` 的 `metadata.json` 中真实 `scope` 字段；若确为 `lint`（该规则只诊断不改写树，属合理设计——伪元素物化需要 juice 处理后才能"诊断"而非"清除"），建议在该行加一句简短旁注说明"scope=lint 因该规则仅诊断不改写树"，消除命名与 scope 字段视觉不一致造成的误读。

### [R-007] LOW: divider 装饰（stage 3，sanitize 之前）与八类装饰注入（stage 9，inlineStyle 之后）分为两个独立注入点，缺少并存依据说明
- **category**: completeness
- **root_cause**: self-caused
- **描述**: §2.M-002 stage 表将 `dividerDecorations`（stage 3，"divider SVG 装饰变体注入（主题相关）"）与 `injectDecorations`（stage 9，"八类装饰经 M-005 `BlockDefinition.decorate` 注册表分发注入槽位/字面样式"）列为管线中两个时序相隔甚远的独立装饰注入点，但正文未说明为何 divider 装饰必须早于 sanitize（stage 4）而其余装饰类型必须晚于 inlineStyle（stage 7）——是否因为 divider 需要在 sanitize 白名单校验前完成结构替换（例如把 `<hr>` 替换为自定义 SVG 容器需要 sanitize schema 识别该结构），还是历史遗留分工。鉴于本次修订已把 stage 序列定为"唯一权威"，建议补一句依据，避免读者误以为两处装饰注入可以合并或存在遗漏。
- **建议**: 补充一句技术依据（例如"divider 结构替换需先于 sanitize 完成以便 sanitize schema 校验其生成的 SVG 容器结构；其余七类装饰只涉及槽位样式/字面样式注入，不改变可被 sanitize 拦截的标签结构，故置于样式合成后"），或明确这属于 pre-existing 设计、不在本次修订范围内。

---

## 正向核实（无问题，供归档）

- **font-family 四处表述自洽**（M-002 §2.42/§2.67、M-003 §2.91/§2.97/附录A 行181/附录B 决策①、M-005 §2.286-287）：统一模型一致——主题/块 baseStyle 允许声明 font-family（注册期放行，不在 `WECHAT_PASTE_STRIPPED_STYLE_PROPS`），output 相按 target profile 分治剥除（wechat）或保留（非微信，长图导出等）；用户已裁定选项 A（剥除）。四处表述互不矛盾，无残留"注册期拒绝 font-family"或"strip-font-family 无物可命中"的逻辑洞。
- **M-005 注册期拒绝集与契约常量一致**：`WECHAT_PASTE_STRIPPED_STYLE_PROPS = {position, top, right, bottom, left, z-index, float}`（`packages/contracts/src/platform/wechat-paste.ts` 实测）与 §2.M-005"注册期平台合规校验"逐字一致，不含 font-family，与决策①模型吻合。
- **附录 A 规则计数自洽**：A.1（6 strip + keyword-lint）+ A.2（38 条，按 strip/clamp/transform/patch/lint 逐类清点得 8+11+11+1+1+3+3=38）+ A.3（1 条已移除）= 45 条注册 / 44 条参与两相执行，算术与头部声明一致（keyword-lint 计入范围的表述问题见 R-003，不影响本条算术本身）。
- **附录 B 决策矩阵无悬置残留**：三项决策（font-family 策略 / ②-i 小字下限 / ②-ii 淡背景透明度）均标注"用户裁定（2026-07-08）"具体选项，且明示唯一剩余动作（②-ii 新样张基准需 T-183 门 sign-off）为执行时门槛而非未决事项，符合"无遗留待确认项"的自我声明。
- **M-008 composeCopy 管线约束**（`composeRender → simulatePaste → buildDualMimePayload → navigator.clipboard.write`）与 M-002/M-003/M-004 关于"output 相已建模平台合规、simulatePaste 对自家产物零 diff、仅置 postPaste=true"的收敛不变量表述一致，无矛盾。

---

## 环境限制说明（不计入缺陷）

- `cataforge` CLI 在本环境不可用，无法运行 doc-review Layer 1 脚本与 `cataforge context index`；doc-index 对本文件可能 stale，不作为本次审查依据。
- 跨卷引用（`arch#§3` / `§5.2` / `§5.3` / `§6.3` / `§8.2` 等指向主卷 `arch-wechat-flow.md`）未做跨卷解析校验，超出本次审查范围。

---

## Verdict

**needs_revision**

严重等级分布：CRITICAL 0 / HIGH 2（R-001, R-002）/ MEDIUM 3（R-003, R-004, R-005）/ LOW 2（R-006, R-007）。

按 COMMON-RULES §三态判定逻辑，存在 HIGH 问题即 needs_revision。R-001 与 R-002 均直接影响 T-182（管线两相顺序落地）的可实现性与正确性——一名新团队成员按当前文档字面实现，either 会在 authoring 相错误清除 `data-{block}-{attr}` 透传（回归 T-163 已交付特性），either 会在 readability-* 规则的调用点上做出与文档意图不符的选择（stage 11 vs stage 12 重复或遗漏执行）。建议 architect 在 T-182 启动前修订 R-001/R-002，MEDIUM/LOW 项可与修订同批处理或酌情顺延。
