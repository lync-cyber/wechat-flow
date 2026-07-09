---
id: "review-amendment-platform-fidelity-r1-r1"
doc_type: review
author: reviewer
status: approved
deps: ["amendment-platform-fidelity-r1"]
consumers: ["orchestrator"]
---

# REVIEW: 平台保真架构 amendment 下游传导（8 份文档）— r1

## 审查范围

本轮审查对象是**下游传导**是否忠实、完整、一致地落地了 `docs/arch/AMENDMENT-platform-fidelity-r1.md`（已收敛、不在本轮复审范围），覆盖 8 份文档的当前未提交改动（`git diff HEAD`）：

- `docs/arch/arch-wechat-flow-modules.md`（0.9.5→0.10.0）
- `docs/arch/arch-wechat-flow-api.md`（0.7.1→0.8.0）
- `docs/arch/AMENDMENT-platform-fidelity-r1.md`（§6 DAG 笔误修正）
- `docs/dev-plan/dev-plan-wechat-flow-s7.md`（0.2.0→0.3.0）
- `docs/deploy-spec/deploy-spec-wechat-flow.md`（0.1.0→0.2.0）
- `docs/ui-spec/ui-spec-wechat-flow.md`（0.3.1→0.4.0）
- `docs/ui-spec/ui-spec-wechat-flow-content-elements.md`（0.2.1→0.3.0）
- `docs/ui-spec/ui-spec-wechat-flow-block-variants.md`（0.2.1→0.3.0）

方法：reasoning-based Layer 2（`cataforge` CLI 不可用，Layer 1 脚本无法运行，已知环境限制不计缺陷）；逐文件 `git diff` 聚焦审查改动面，交叉核对权威源 amendment §11/§2/§4/§6，并对关键契约声明（`registerVariant` 抛异常语义）做了源码验证。

## 总体结论

amendment §11 下游清单的 7 个条目在 8 份文档中**全部有对应改动落地**（M-003/M-004/M-005/M-009、附录 A/B、dev-plan T-184..T-189 拆卡、ui-spec §1.2.5/§9.5/§9.8/§10.5、deploy-spec 指标改名）；`font-family` 模型、模拟器删除、指标改名、T-187/T-189 依赖方向四项关键跨文档不变量经核对**一致**；DAG 笔误修正正确、内部自洽；未发现 COMMON-RULES §禁止设计阶段与变更说明残留 的实质性命中。

但发现 **3 处 HIGH**：其中一处是 `arch-wechat-flow-modules.md` 内部两段关于「图片导出 font-family fontStack 开放项」的自相矛盾（一段仍写"待用户裁定"，另一段紧接着写"用户裁定 2026-07-09 已定"）——这恰是任务书明确要求核查的残留点（维度 B.2），需订正；另一处是同文件 M-005 对 `registerVariant()` 核心 API 返回语义的描述与实际代码及同批 dev-plan T-187 卡本身相矛盾（代码验证：核心函数**抛异常**，非返回值）；第三处是 5 个跨文档 `见 §5`/`见 §9 R3` 裸引用，与 arch 逻辑文档自身既有的 `§5`（非功能架构）编号冲突。三者均落在 `arch-wechat-flow-modules.md`（含 1 处 `arch-wechat-flow-api.md`），修复成本低（局部改写，不涉及架构决策本身）。

**结论：needs_revision**（存在 3 处 HIGH，按 COMMON-RULES §三态判定逻辑）。

---

## 问题列表

### [R-001] HIGH: `arch-wechat-flow-modules.md` 内部关于「图片导出 font-family fontStack」开放项残留自相矛盾的「待用户裁定」措辞
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `arch-wechat-flow-modules.md` 同一文件内两处对同一开放项给出矛盾结论：
  - §2.M-002「font-family 在所有 render target 缺席（构造守卫的逻辑后果）」段（第 74 行）：「若产品判定图片路径需保留主题字体身份，须引入独立的**主题级 `fontStack` 元数据**……——**此为超出本 amendment 范围的新增机制，登记为开放项待用户裁定**（详 §2.M-003 附录 B 决策① 开放项）。」
  - 紧邻的 §2.M-003 附录 B 决策①（第 259 行）：「**[用户裁定 2026-07-09] 图片导出路径的字体保真 = 接受全缺席**……用户裁定**接受全缺席、不引入 `fontStack` 机制**……」
  
  第 74 行把决策描述为"待用户裁定"的开放项，并把读者指向的附录 B 决策①实际上**已经**记录了同日（2026-07-09）的用户裁定结果（接受全缺席、不引入 fontStack）。这正是任务书维度 B.2 明确要求核查的残留点——"不得残留「待用户裁定」悬置措辞"，此处在同一份 diff、同一份文件内自相矛盾，新团队成员读到 M-002 段会误以为该问题仍未决，读到附录 B 又发现其实已裁定，产生困惑且无法确定哪段是权威态。
- **建议**: 把 M-002 第 74 行末句改为陈述已裁定结果（例如："产品经用户裁定（2026-07-09）接受图片路径 font-family 全缺席、不引入 fontStack 机制，详见 §2.M-003 附录 B 决策①"），保留"若未来产品重估"的重开条件即可，去掉"开放项待用户裁定"字样。

### [R-002] HIGH: `registerVariant()` 核心 API 契约被错误改写为"不抛异常返回结构化值"，与实际代码及同批 dev-plan T-187 卡矛盾
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `arch-wechat-flow-modules.md` §2.M-005「对外接口」新文本将 `registerVariant` 的**核心包级 API** 签名/行为改写为：

  > `registerVariant({ blockId, id, label, style }) → { registered: boolean, rejectedDeclarations?: RejectedDeclaration[] }`（style 即该 variant 的 base-style；命中平台禁区**不抛异常**，返回结构化 `rejectedDeclarations`……），MCP `register_variant` **直传此形**——见「注册期构造守卫」

  这与实际代码不符。经源码核实 `packages/core/src/registry/variant.ts:100-107`：命中拒绝时是 `throw Object.assign(new Error(...), { rejectedDeclarations })`——**核心函数抛异常**，`rejectedDeclarations` 挂在被抛出的 Error 对象上，函数本身**没有正常返回值路径**返回 `{registered, rejectedDeclarations}`。真正做"catch 后结构化为 `{registered:false, rejectedDeclarations}`"转换的是 **MCP 边界层** `apps/mcp-server/src/tools/register-variant.ts`（`try { registerVariant(...); return {registered:true,...} } catch (e) { ... return {registered:false, rejectedDeclarations: err.rejectedDeclarations} }`）——并非"直传"，而是一次 catch-and-restructure 转换。

  同一批 diff 里 dev-plan T-187 AC-001 的描述反而是正确的："遇 `FORBIDDEN_CSS_PROPS ∪ FORBIDDEN_DISPLAY_VALUES` 命中即 `throw({rejectedDeclarations})`（对齐 `registerVariant` 现状 `packages/core/src/registry/variant.ts:100-107` 模式）"，T-187 AC-004 也明确称 MCP 层是"现有 catch-and-structure 模式"。即：本次改写只发生在 arch-wechat-flow-modules.md 的 API 契约描述里，与代码现状、以及**同批**修订的 dev-plan 卡片本身相互矛盾。误导性质严重：一个仅读 arch §2.M-005 的实现者会认为调用 `registerVariant()` 不需要 try/catch，直接解构返回值即可，这与真实契约相反，会产生未捕获异常的生产缺陷。
- **建议**: 将 §2.M-005「对外接口」的 `registerVariant` 一行改回准确描述核心函数行为（校验失败**抛出**含 `rejectedDeclarations` 的结构化错误，`→ void`），并把"MCP `register_variant` 直传此形"改为"MCP 边界层 catch 该异常后转换为 `{registered:false, rejectedDeclarations}` 非抛出响应"，与 T-187 AC-004 的描述对齐。

### [R-003] HIGH: 5 处跨文档 `见 §5` / `见 §9 R3` 裸引用与 arch 逻辑文档自身既有编号冲突
- **category**: consistency
- **root_cause**: self-caused
- **描述**: 本批新增文本在 `arch-wechat-flow-modules.md`（4 处：L240「缺口登记见 §9 R3」、L300「breaking npm API，见 §5」、L498「breaking 见 §5」、L499「breaking，见 §5」）与 `arch-wechat-flow-api.md`（1 处：L326「保留一个过渡窗口后移除（breaking，见 §5）」）中用裸编号 `§5`/`§9 R3` 指代 `AMENDMENT-platform-fidelity-r1.md` 自身的 §5（破坏性变更与版本化）/ §9（风险与开放问题）章节。

  违反 COMMON-RULES §文档引用格式（跨文档引用须 `{doc_id}#§{section_number}`）本身是轻微问题，但此处更严重：`arch` 是同一逻辑文档下的分卷集合（`arch-wechat-flow.md` + `-modules` + `-api` + …），而 `arch-wechat-flow.md` 主卷**自身已有 §5 = "非功能架构"**（与破坏性变更版本化毫无关系）。同批 diff 里其他裸编号引用（如 `§8.2 Q3.16`、`§2.M-002`）是合法的同逻辑文档跨卷引用（arch 家族内部编号，pre-existing 惯例），但 `§5`/`§9` 属于 amendment 这个**独立 doc_id**（`doc_type: amendment`，不属于 arch 逻辑文档族），两种引用语义在裸编号写法下无法区分——新读者按 arch 既有惯例会把"见 §5"理解为 `arch-wechat-flow.md#§5`（非功能架构），而不是 `AMENDMENT-platform-fidelity-r1.md#§5`（破坏性变更），造成实际的错误跳转。
- **建议**: 5 处引用全部改为显式 `AMENDMENT-platform-fidelity-r1#§5` / `AMENDMENT-platform-fidelity-r1#§9`（dev-plan-wechat-flow-s7.md 在本批中已正确使用该前缀写法，可直接对齐同一约定）。

### [R-004] MEDIUM: `arch-wechat-flow-api.md` 缺少与 `arch-wechat-flow-modules.md` 对等的"实现状态"过渡态免责声明
- **category**: completeness
- **root_cause**: self-caused
- **描述**: `arch-wechat-flow-modules.md` 在 §2 开头维护了一段详细的"实现状态（2026-07-09）"提示，明确区分"已交付"（T-182/T-183）与"待收口的过渡态"（`simulate-paste.ts` 仍在、`RenderResult.postPaste` 仍在、`PlatformAdapter`/`inspect` 尚未建等），并提醒"下游判定……勿据目标态措辞误判为已交付"。

  但 `arch-wechat-flow-api.md` 本批对 API-001/API-014/API-015 的改写（新增 `platform` 参数、`report` 字段、`E_UNSUPPORTED_PLATFORM`、`patchedHtml`/`changes` 响应形）同样是尚未落地的目标态（对应 T-185/T-186，当前均未开始），却全部以现在时描述、无任何过渡态提示。只读 `arch-wechat-flow-api.md`（不交叉核对 dev-plan）的读者——包括潜在的 LLM Agent 消费方（MCP 契约的直接使用者）——会误以为这些字段已在生产环境生效。鉴于 `arch-wechat-flow-modules.md` 已经确立了"现状 vs 目标"分离的文档惯例，`arch-wechat-flow-api.md` 在同一批改动里对同一目标态内容缺失同等提示，是批内文档处理不一致造成的完整性缺口。
- **建议**: 在 `arch-wechat-flow-api.md` 顶部（或至少 API-001/API-014/API-015 各条目开头）补一句实现状态提示，指向 dev-plan T-185/T-186 的交付状态，与 arch-modules 的既有惯例对齐。

### [R-005] LOW: `dev-plan-wechat-flow-s7.md` 中已完成任务 T-183 的 AC-002 残留过时的"非微信 profile"措辞
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: T-183（已 `[x]` 全部勾选、PR #112 已合并交付）AC-002 原文：「若剥除：ui-spec §10.5 等字体条款 amendment 同步（owner=ui-designer），**主题字体保留语义收窄至非微信 profile**」。该措辞是 2026-07-08（T-183 交付时）的模型描述，在 2026-07-09 amendment 落地后已被推翻——现行架构（本批 arch 附录 B 决策①、ui-spec §1.2.5）是"font-family 在所有 render target 均缺席，不存在保留语义的非微信 profile"。全仓搜索确认，这是当前 `docs/` 树内**唯一**残留"非微信 profile"表述的位置（`docs/.doc-index.json` 与旧 REVIEW 报告除外，两者不在本次维护范围）。由于该任务卡属历史已完成记录、且被 amendment 时序上"追认过时"而非本批直接产生，归因判 upstream-caused；但因其位于本批 8 份文档之一且本批已大量编辑同一文件的邻近任务卡，建议顺手订正以消除"已勾选 AC = 仍然真实"的误导风险。
- **建议**: 在 T-183 AC-002 或其 notes 追加一行订正指针（"该措辞已被 2026-07-09 amendment 推翻，现状见 AMENDMENT-platform-fidelity-r1#§10 与附录 B 决策①"），或直接改写该分句为当前准确表述。

### [R-006] LOW: 同一 dev-plan 段落内 hex 色值大小写不一致（历史引述 vs 当前"统一小写"决策）
- **category**: convention
- **root_cause**: self-caused
- **描述**: `dev-plan-wechat-flow-s7.md` 修复批二来源说明段（T-176 之前，"来源：T-172 粘贴回归 r2……"）沿用旧文本引用 `#1C1917`/`#2D5A4E`（大写），而紧随其后 T-176 的 notes（本批新写）遵循"hex 色值按用户裁定统一小写"改为 `#1c1917`/`#2d5a4e`。二者描述同一事实（对比度缺陷），大小写不一致，容易让读者误以为是两个不同的取值来源。
- **建议**: 顺手将"来源"段落的历史引述统一为小写，与本批新写的 notes 保持一致（非强制，纯 convention 收敛）。

---

## 未发现问题的维度（供参考）

- **amendment §11 完整性**：arch-modules（M-003/M-004/M-005/M-009、附录 A/B）、arch-api（API-001/014/015）、dev-plan（T-184..T-189 拆卡、T-178 重写、T-179 并入 T-189）、ui-spec（§1.2.5/§9.5/§9.8/§10.5）、deploy-spec（指标改名+发布清单）全部有对应落地，未发现遗漏条目。
- **font-family 模型三方一致性**：arch 附录 A/B、dev-plan T-189/T-187、ui-spec §1.2.5/§9.5/§9.8/§10.5 用语与结论一致（无差别剥除、构造守卫禁声明、图片路径同缺席），ui-spec 三份文档均无残留"非微信 profile 保留 font-family"旧叙事（仅 R-005 指出的历史已完成任务卡例外）。
- **模拟器删除一致性**：arch M-004（PlatformAdapter 重写）、dev-plan T-186、arch-api API-014 三处对 `simulatePaste`/`postPaste`/`TargetProfile` 的删除范围完全一致。
- **指标改名一致性**：deploy-spec `fallback_platform_patch_hits` 与 dev-plan T-186 AC-005 一致。
- **T-187/T-189 依赖方向**：amendment §6 mermaid（本批已修正为 `T-189 --> T-187`）、dev-plan 架构专项依赖图 mermaid、T-187 `dependencies: [T-184, T-189]`、T-189 `dependencies: [T-184]` 四处方向一致，无反向残留。
- **dev-plan 卡质量**：T-184..T-189 六卡 `dependencies`/`deliverables`/`context_load`/`task_kind` 完整；AC 断言以 T-188 AC-002/003（渲染后计算 `width` 值）、T-189 AC-003（渲染产物 hast 遍历零 `font-family`）、T-176 AC-001/002（渲染后计算 `color`/`line-height`）为代表，符合 COMMON-RULES §保真类 AC 断言渲染效果而非源码字面；`context_load` 交叉引用 amendment 均正确使用 `amendment-platform-fidelity-r1#§N` doc_id 前缀（与 R-003 指出的 arch 文档裸引用形成对照，佐证 R-003 是可改正的孤立问题而非项目通例）。
- **§禁止设计阶段与变更说明残留自检**：对 8 份文档新增行做了 COMMON-RULES 末尾 regex 自检（`之前|previously|修复了|原方案|改为|issue#|PR#|closes#|本次新增` 等），命中均为误报（"之前"作方位介词、"改为"作任务卡正向实现指令/决策记录，非回溯叙事）；附录 B「用户裁定（日期）」符合 §决策记录要求 许可格式，不算残留。
- **AMENDMENT-platform-fidelity-r1.md §6 DAG 修正**：mermaid 从 `T-187 --> T-189` 改为 `T-184 --> T-189 --> T-187` + `T-184 --> T-187`，与紧随其后的文字说明（"T-187…依赖 T-189"）内部自洽，且与 dev-plan 侧改动方向一致。

## Verdict

**needs_revision**（3 处 HIGH：R-001、R-002、R-003；2 处 MEDIUM/LOW 组合不影响三态判定但建议一并处理）。

按 COMMON-RULES §三态判定逻辑，存在 CRITICAL 或 HIGH 即 needs_revision；三处 HIGH 均定位在 `arch-wechat-flow-modules.md`（R-001、R-002、R-003 之 4/5）与 `arch-wechat-flow-api.md`（R-003 之 1/5），且修复范围为局部文字改写（不涉及重新决策、不影响已裁定的架构方向），预期为单文件小范围 revision 即可闭环。

---

## 修订处置（r1 → 已收口）

| finding | 严重度 | resolver | 落点 |
|---------|--------|----------|------|
| R-001 fontStack 自相矛盾 | HIGH | architect + orchestrator | `arch-wechat-flow-modules.md` §2.M-002 第 74 行改为陈述已裁定「接受全缺席、不引入 fontStack」，指向附录 B 决策①；同步核对 ui-spec §1.2.5 L231 收口一致 |
| R-002 registerVariant 契约错写 | HIGH | architect | `arch-wechat-flow-modules.md` §2.M-005 更正为「核心 `registerVariant` 命中禁区**抛异常**（`rejectedDeclarations` 挂 Error）、MCP 边界层 catch-and-restructure 为 `{registered:false,...}`，非直传」，与 `variant.ts:100-107` 源码一致 |
| R-003 5 处裸 §ref 冲突 | HIGH | architect | `arch-wechat-flow-modules.md`/`arch-wechat-flow-api.md` 裸 `见 §5`/`见 §9 R3` 全部改为限定 `amendment-platform-fidelity-r1#§N` 跨文档锚点，消与 arch 逻辑文档自身 §5 编号冲突 |
| R-004 arch-api 缺实现状态免责 | MEDIUM | architect | `arch-wechat-flow-api.md` §3.1 补与 arch-modules 对等的过渡态实现状态免责声明 |
| R-005 T-183 AC-002 stale 措辞 | LOW | tech-lead | `dev-plan-wechat-flow-s7.md` T-183 AC-002 去「非微信 profile」stale 措辞，改准确当前态（全 render target 缺席、无 profile 分支） |
| R-006 hex 大小写不一致 | LOW | tech-lead | `dev-plan-wechat-flow-s7.md` 修复批二「来源」段 `#1C1917`/`#2D5A4E` → 小写，与 T-176 notes 一致 |

**收口判定**：3 HIGH + 1 MED + 2 LOW 全部 disposition，修订均为局部文字/契约措辞对齐、不改架构决策；`cataforge` CLI 不可用故未跑 Layer 1，reasoning-based 复核由 orchestrator 主线程做跨文档一致性坐实（两个跨文档不变量 fontStack 全缺席 / registerVariant 抛异常语义已在 arch↔dev-plan↔ui-spec 间对齐）。最终合并门由用户 PR 审阅承担。
