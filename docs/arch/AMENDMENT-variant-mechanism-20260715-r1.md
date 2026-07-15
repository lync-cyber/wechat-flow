---
id: "amendment-variant-mechanism-20260715-r1"
doc_type: arch
author: architect
status: approved
deps: ["walkthrough-variant-render-gap-20260714-r2", "arch"]
consumers: ["orchestrator", "task-decomp"]
---

# 架构 amendment（草案）：变体注册机制裁定 — 候选 B「注册即实现」+ merge 语义结构收敛

> status=approved — 用户终审 sign-off 2026-07-15。
> **终审裁定**：Q-B1 = 补最小渲染期差分守卫（内部可判 `render(variant)≠render(default)`，兜注册硬拒的 decorate no-op / delta 空静态盲区）；Q-Merge = 确认 merge 语义 + 6 个 fat-base 块（callout/warning/announcement/compare/quote/pull-quote）拆「最小基座 + default delta」（default 字节保真、cross-runtime hash 不变为硬约束、唯一附带变动 steps.card ×5 快照重 seed）。
> **顶层架构原则（用户 2026-07-15 下达，统摄本方案）**：按长期最干净 / 最可维护 / 最可扩展架构 + 最佳微信公众号平台兼容性设计；避免向后兼容、重复包装、冗余设计等坏模式。
> **机制裁定**：采纳候选 B（注册期硬拒无实现变体）为主机制；变体样式解析采 **merge 语义**（块基线 ⊕ 变体 delta），消除 replace 语义下的 full-root 重复包装。ui-designer 并行裁定清单（IMPORT 47 / PATCH 36 / DELETE 11；落地后 155 − 11 = 144 > 120，`assertVariantFloor` 不崩）。两稿终审后由 task-decomp 拆卡。

## 0. 裁决基准

变体是**产品承诺面**。注册 155 个具名变体用户即可选中，其中 96 个（A 类 59 / B 类 37）渲染名不符实（走查 `walkthrough-variant-render-gap-20260714-r2` 坐实：设计问题 + 资产缺失，门禁全绿系坏渲染 vs 坏基线自证）。本 amendment 裁定：**登记与兑现如何在机制层强制对齐，使「注册但未实现」不可静默存在**（注册期硬拒），且**变体样式如何分层组合**（merge，令块基线单点改动传导全变体、变体只写 delta）。

## 1. 机制根因（已核实）

- **L1 解析入口**：`packages/core/src/registry/variant.ts:140-152` `getBlockBaseStyle(blockId, variantId)`：`default` → `blockDef.baseStyle.root`；具名变体 → `builtinVariant.baseStyle.root`（**替换块基线，非合并**）→ 自定义 store → `{}`。
- **消费点**：`packages/core/src/pipeline/inline-style.ts:213-236`，容器块路径 `merged = { ...L1, ...(L2 ?? {}) }`（L1=`getBlockBaseStyle`，L2=主题 token），M-002 stage 7 inline-style 相坐实为 inline style。A 类变体 L1=`{}` 且 L2 缺失 → 根零 style。
- **结构性土壤**：`packages/core/src/registry/block.ts:9-13` `BlockVariant.baseStyle?` 可选 + `:28` `variants: BlockVariant[]` 纯元数据——登记与兑现解耦、无对齐强制。`defineBlock`（`packages/blocks/src/factory.ts`）原样透传。
- **replace 语义的冗余代价（merge 决策依据）**：step-2 替换块基线，故对带块基线的块（`warning`/`announcement`/`callout`/`compare`/`quote`/`pull-quote`），变体须 full-root 重复声明块基线全部键——正是顶层原则反对的重复包装。
- **平行缺口**：slot 级 `getBlockSlotStyle`（`inline-style.ts:118-128`）`variant?.baseStyle?.[slot] ?? {}` 同为 replace，须与 root 同步改 merge（保单一语义，§4.2）。
- **测试锁**：`packages/core/src/registry/variant.test.ts:84-95` 锁定「无回退 → `{}`」为有意行为——候选 B + merge 下须重写（§4.4）。

## 2. 与既有裁定的对齐锚点

- **构造守卫为主、output 补救为副**（arch M-005 §注册期构造守卫，已 sign-off）：`registerBlock`/`registerVariant` 命中平台禁区即 throw（`block.ts:37-70`）。候选 B 是其**直接延伸**——「无实现具名变体」纳入注册期硬拒集，同 throw-with-structured-error 机制、同「注册期拦截 > 渲染期补救」原则。
- **别过度设计**（本项目 TargetProfile / oracle-as-CI-gate 前科被删）：不照搬 wechat-typeset `render()`-per-file；采纳其结构性质「注册但未实现不可静默」，用既有声明式 `baseStyle`⊕`decorate` 模型 + 注册期静态谓词表达。merge 是既有 L1⊕L2 分层的自然延伸（把「块基线 ⊕ 变体」也做成分层），非新机制。

## 3. 三候选对比矩阵（决策记录）

| 维度 | 候选 A：基线回退止血 | 候选 B：注册即实现（**用户采纳**，realize with merge） | 候选 C：混合（回退 + 差分守卫） |
|---|---|---|---|
| 一句话 | 改 `getBlockBaseStyle` 具名变体无 baseStyle 时回退块基线 | 具名变体携带必选实现，`registerBlock` 硬拒无实现变体；样式采 merge 语义 | 回退 + 差分守卫（`variant ≠ default` 内部不变量） |
| 解决 A 类（根裸） | 是（回退块基线） | 是（裸变体无法注册，逼迫补实现或 DELETE；merge 使变体自动继承块基线） | 是 |
| 解决 B 类（≡default no-op） | 否（回退把 A 转 B） | 部分（元数据-only 注册期拒；delta 空 / decorate no-op 静态不可判——残余盲区 §6） | 是（差分守卫逐项暴露） |
| 与构造守卫一致性 | 相悖（渲染期偷补） | **强一致**（注册期 throw） | 强一致 |
| 冗余/重复包装 | 无 | **merge 消除 full-root 重复**（PATCH 只写 delta） | 未涉 |
| 迁移/过渡 | 即时 | 须过渡期 collect-only（§4.3）；merge 需 fat-base 重构（§4.2） | 守卫 WARN→RED |

**用户裁定选 B + merge 的取舍见 §7**。C 的差分守卫成分作 B 静态盲区兜底候选保留于 §6。

## 4. 候选 B + merge 落地设计（主体）

### 4.1 注册期硬拒接口

`registerBlock`（`block.ts:37-70`，现有 FORBIDDEN 守卫之后）追加**变体实现谓词校验**：对每个具名变体（`id !== "default"`），满足以下任一即通过，全不满足则收集为未实现项、非空即 throw：

1. 变体自带 **≥1 条非空 style 声明**（`baseStyle` 任一 slot 有非空 declaration）——IMPORT / PATCH 走此路；
2. 块声明了 `decorate` 钩子（该变体可能经 `ctx.variant` 分支产出结构/字面样式）；
3. 变体命中 **plain-allowlist**（`intentional-plain-variants.ts` 导出 `Set<"block::variant">`，显式豁免「本意即无装饰」变体，含「仅要块基线、无自身 delta」的纯 bare-base 变体）。

- **错误契约**（对齐现有 `rejectedDeclarations`）：抛 `E_VARIANT_NO_IMPL`，错误对象挂 `unimplementedVariants: Array<{ blockId, variantId, reason }>`，`reason` 含可执行指引（补 delta / 加 decorate 分支 / 登记 plain-allowlist）。成功路径无返回值携带清单，同 `variant.ts:100-107` 模式。
- **谓词 2 是宽松放行（静态边界）**：`decorate` 是块级钩子，可能只处理部分变体（如 `steps.ts:109` `if (ctx.variant !== "card") return`）——注册期静态**无法**判定 decorate 是否真处理某具名变体。这是 B 静态守卫的固有盲区，由 §6 承接，不假装已覆盖。

### 4.2 merge 语义（核心裁定）

**裁定：`getBlockBaseStyle` 及 `getBlockSlotStyle` 采 merge 语义，替换 replace；不保留 replace 兼容分支（避免向后兼容坏模式）。**

- **root 解析（统一 default 与具名变体为同一规则）**：
  ```
  getBlockBaseStyle(block, variant) = { ...blockBase.root, ...variantDelta(variant).root }
  ```
  其中 `variantDelta("default")` = 该块 `default` 变体条目自身的 `baseStyle.root`（无则 `{}`）。**`default` 降为普通变体**——不再特判「default 直接返回块基线」，与具名变体走同一 base⊕delta 规则（单一语义、可扩展）。
- **slot 解析同步 merge**（避免两套语义）：`getBlockSlotStyle` = `{ ...blockBase[slot], ...variantDelta[slot] }`。当前块基线未声明非 root slot，故 slot merge 现值零变化，仅统一模型、未来防漂移。
- **块基线 redefine 为「最小共享基座」**：块基线 = 全部变体（含 default）合法共享的最小基础（通常仅间距节奏 / 结构共享属性），**非 default 变体的完整装饰外观**。
- **fat-base 重构（merge 反例的干净解，不是折衷退让）**：核查发现 6 个块的块基线是「default 的完整外观」而非最小基座，其具名变体是**替代性完整外观**、故意省略 default 的部分键——`callout`（tip/warning/info/danger 省 `border-left`/`background-color`）、`warning`、`announcement`、`compare`（ledger 省 root `display:table`）、`quote`（large-quote-mark/dropcap 省 `border-left`）、`pull-quote`。对这些块**盲目 merge 会把 default 装饰污染进替代变体**。干净解：把这 6 块的块基线拆为「最小基座 + `default` 变体 delta」——default 装饰移入 default 变体条目，块基线只留真共享键。此重构**对 default 变体输出保真**（`最小基座 ⊕ default delta` == 原 fat 基线，经 `serializeDeclarations` 排序后字节相同，是硬约束，§5.3 校验）。
- **PATCH 授权（顶层原则直接受益）**：merge 下 PATCH 变体只写**相对最小基座的 delta**（1-3 条），块基线其余键自动继承；replace 语义下的「PATCH 须 full-root」硬约束**消除**。ui-designer 交叉发现 §5 第 2 条所问「轻量变体是否需独立标记」——**裁定否**：PATCH 满足谓词 1（≥1 非空 delta），与 IMPORT 对守卫无差别，无需新增 taxonomy 轴（别过度设计）。
- **无不可绕过反例**：唯一理论反例是「变体须删除基座某键」（spread-merge 只能覆盖不能删键）。最小基座只含间距等键，变体要「无该键」用显式 reset 值表达（`margin:0`/`background:transparent`/`border:none`，CSS 均可表达）；核查现有变体（如 callout.warning 已显式 `background:transparent`）证实此模式可用，且基座最小化后连 reset 都少需。故无硬反例。

### 4.3 big-bang 迁移路径（collect-only 为一次性脚手架，零残留）

守卫一旦 throw，进程启动注册内置资产时若仍有未实现变体 → 注册中断 → 全 suite 无法加载注册表（同 M-005 §内置资产 FORBIDDEN 清理硬阻塞）。故三阶段与 ui-designer 清单交错：

1. **阶段一 · collect-only**：守卫以「收集不抛」运行，`registerBlock` 汇集 `unimplementedVariants`，CI 测试断言清单收敛或 WARN；注册表照常加载，不阻断。merge 语义 + fat-base 重构同批合入（merge 是纯解析改动、不涉守卫 throw，可先落）。
2. **阶段二 · ui-designer 清单落地**：IMPORT 47（导入 delta）+ PATCH 36（补 delta）→ 满足谓词 1；DELETE 11 → 移除注册；对账（47+36+11 = 94 vs 走查 A59+B37 = 96 含属性门控假阳性）**以 ui-designer 清单为准**；机制侧只要求三桶落地后 `unimplementedVariants` 归零。落三桶之外的元数据-only 变体须 ui-designer 补裁归桶或 architect 补 allowlist（orchestrator 收口核对 collected list 真空）。
3. **阶段三 · 翻 throw + 一次重 seed + 拆脚手架**：清单归零后守卫翻硬 throw；**同批从 `registerBlock` 移除 collect-only 分支**——最终交付只留 throw 态、零 mode 开关、零 deprecated / 双轨残留（贯彻「避免向后兼容」）。同批 `VISUAL_FULL=1` 全矩阵重 seed。

### 4.4 测试锁重写

- `variant.test.ts:84-95`「builtin variant with no baseStyle ... falls through to `{}`」：候选 B 下其 `registerBlock({... variants:[{id:"plain"}] ...})` 被守卫 throw → **重写为守卫拒绝测试**（断言抛 `E_VARIANT_NO_IMPL`，`unimplementedVariants` 含 `{blockId, variantId:"plain"}`），对齐 `variant.test.ts:116-177` FORBIDDEN 拒绝测试结构。
- **merge 解析测试重写**：`getBlockBaseStyle four-step resolution` 全组按 merge 重写——① `default` = `base ⊕ defaultDelta`；② 具名变体 = `base ⊕ variantDelta`（断言块基线键被继承 + 变体键覆盖同名）；③ 无块基线块（如 dialog）具名变体 = variantDelta（merge no-op）；④ unknown variant / 未注册块仍安全返回 `{}`。
- **新增测试**：① 谓词 2/3 放行（decorate 块、allowlist 变体不被拒）；② fat-base 重构 default 保真（重构后 `getBlockBaseStyle(block,"default")` 字节等于重构前 fat 基线，锁 §5.3 硬约束，断言渲染/序列化产物非源码字面，遵 COMMON-RULES §保真类 AC）；③ 若 §6 采纳差分兜底：`variant ≡ default` 时 finding 非空。

## 5. 影响评估（候选 B + merge）

### 5.1 现有已实现变体产物冲击（merge 唯一改一处）

merge + fat-base 重构对**已实现（非缺口）变体**的产物冲击**收敛到唯一一处**：

- **`steps.card` 变**：`steps` 块基线 `{margin:"16px 0", padding:"0"}` 是**合法最小节奏基座**（非 fat）；card 自身 delta 省略 `margin` 简写键，merge 后 card 获得 `margin:"16px 0"`（正确——card 应有块节奏）。→ card × 5 主题 = **5 快照重 seed**。
- **其余已实现变体全部保真**：① 6 个 fat-base 块的已实现变体（`announcement.danger-bar/compact`、`compare.ledger`、`quote.large-quote-mark/dropcap`、`pull-quote.decorated`、callout tip/warning/info/danger）均已声明最小基座键（padding/margin 等），重构后 `base⊕delta` == 自身 = 保真；② 无块基线块（`dialog.chat-bubbles`、`gallery.duo/triptych`、`paragraph.dropcap`）merge no-op = 保真；③ 全部 `default` 变体经 fat-base 重构保真约束 = 保真。
- **缺口变体（96）产物变更由 ui-designer IMPORT/PATCH/DELETE 落地驱动**，非 merge 机制附带（merge 只是让它们从裸基线上叠 delta 更省），随其落地一并重 seed。

### 5.2 视觉基线（Playwright `e2e/visual/`）

- 全矩阵 = `block × variant × 5 themes`（`story-matrix.ts:35-56`）。**merge 附带的已实现变体重 seed = 仅 `steps.card` × 5 = 5 快照**；缺口变体重 seed（83 变更 + 11 删除，×5）随 ui-designer 落地（同 §4.3 阶段三一次 seed）。
- **`assertVariantFloor` 重推导**：144 > 120 不崩，本批不阻断；建议随本批把阈值按最终 144 计数重推导（`story-matrix.ts:27-33`），归 task-decomp。

### 5.3 cross-runtime golden SHA（硬约束：字节不变）

- 5 fixture（`fixtures.ts:12-40`）逐一核：cjk-heading / frontmatter（无块）、block-directive = callout **default**、dialog-slot-typography = dialog.**chat-bubbles**、gallery-table-cell = gallery.**duo**。
  - callout default：fat-base 重构后 = `最小基座 ⊕ default delta`，**保真约束**要求字节等于原 fat 基线 → **不变**。
  - chat-bubbles / duo：`dialog`/`gallery` **无块基线** → merge no-op → **不变**。
- **结论**：`EXPECTED_HASHES`（`fixtures.ts:78-84`）**必须保持字节不变**。校验方式：merge + 重构合入后跑 `pnpm test:cross-runtime` 应**直接绿、不得重算 hash**；若变红 = fat-base 重构未做到 default 保真（bug），**修重构、不改 hash**。orchestrator 收口时把此作为 merge 正确性的判据之一。

## 6. B 类残余盲区兜底（merge 语义下重新确认，仍为必要补全，非冗余）

候选 B 注册期静态守卫的两类残余 no-op，在 merge 语义下重核**仍存在**：

1. **「delta 为空 / delta ≡ 无差分」→ merge 后 ≡ default**：变体 delta 恰好为空或被覆盖成与 default 同值，渲染 ≡ default，守卫谓词 1 仍放行（有 delta 声明即过），但是 no-op。
2. **「decorate 对该变体 no-op」**（谓词 2 放行的静态盲区，merge 不影响）：块有 decorate 但其 `ctx.variant` 分支不处理该变体，渲染 ≡ default。

这两类都是**注册期静态守卫在原理上抓不到的真实盲区**（前者需渲染求值判 delta 净效果、后者需运行 decorate），**非与注册守卫冗余叠层**——与 [[avoid-over-engineering-design]]「最小≠砍主防线、加机器须举出简单解抓不到的具体失败场景」一致：注册守卫（简单解）抓「零实现声明」，抓不到「有声明但净渲染 ≡ default」。

- **architect 推荐（选项 ①）**：补最小渲染期差分守卫——CI 遍历每块每具名变体，渲染 canonical fixture 与同块 `default` 产物字节比对，`≡default`（且非 plain-allowlist）即 finding。**内部可判性质**（`render(variant) ≠ render(default)`，不引外部 oracle，避开被删的 oracle-as-CI-gate 陷阱）。与「构造守卫为主、output 补救为副」同构：注册守卫=主、差分测试=副。
- **选项 ②（纯纪律）**：不加自动守卫，靠作业纪律 + code review。**回退走查已证失效的老路**（走查 §门禁盲区：无外部 oracle 时 no-op 静默过关）。
- **推荐选项 ①**——这是候选 B 的必要补全（B 单独留两类盲区），且刻意限定内部可判差分、不违别过度设计。**此为呈用户终审的唯一实质机制点（§9 Q-B1）。**

## 7. 次级 OQ 补裁（用户已授权 architect 裁定）

### OQ-2 / OQ-3 · taxonomy 交叠
- **`warning` ↔ `callout` ↔ `announcement`**：三块 alert/notice 语义重叠。**裁定：本批不合并，标「后续版本 taxonomy 评估」边界**——合并块是破坏性变更（改指令名破坏已有文档源、动 F-003 变体面），超「变体渲染缺口修复」批 scope；三块 default 各有区分、不产渲染缺陷，仅命名冗余。重评条件：出现用户混淆反馈或新增第四个 alert 类块时统一收敛。
- **`timeline` ↔ `steps`**：`timeline` 块基线 undefined（`timeline.ts:14`）、三变体全元数据-only（B 类）；`steps` 有最小基座 + card。**裁定：不合并**（语义确有区分）；`timeline` 三变体走 ui-designer 清单 IMPORT（从 wechat-typeset `timeline-dot` 等）或 DELETE。

### OQ-8 / OQ-9 · 零先例微信兼容 feasibility
- **`highlight-block.gradient`（`highlight-block.ts:11`）**：块无 baseStyle、变体元数据-only、wechat-typeset 无先例；渐变须 `linear-gradient`。**裁定：标 feasibility 立项**——拆卡前须核实 (a) highlight-block 实际输出 DOM tag（微信剥 div 及其样式，若为 div 则 gradient 必被剥）、(b) 若非 div，linear-gradient inline 于公众号真机存活性需真机 fixture 验证。真机不存活 → 转 DELETE；存活 → IMPORT。归 §9 待验证缺口。
- **`image-caption.overlay`（`image-caption.ts:11`）**：overlay 须 `position:absolute`，属 arch M-005 `FORBIDDEN_POSITION_PROPS` 注册期**构造守卫直接拒**；ui-spec §9.1（`ui-spec-wechat-flow-content-elements.md:36`）明示「慎用 absolute……粘贴后容器尺寸丢失表现异常……默认避免」，仅「图注角标」例外。**裁定：强建议 DELETE**——真 overlay 布局在微信粘贴模型不可兑现；若 ui-designer 坚持保留，只能降级为「图注角标」式（不依赖父容器尺寸的小角标，§9.1 例外口径）并重命名、明确非全覆盖语义、仍须真机验证。默认 DELETE。

### OQ-10 · `audio` / `video` DOM 输出契约
- `audio.ts` / `video.ts`：`directiveAttrs = z.object({}).strict()`（**空属性**，不接受 src）、无 baseStyle、无 decorate → 当前只是空容器裹正文，非真实音视频嵌入；且微信公众号不允许任意音视频嵌入（仅经微信媒体素材/qqmusic）。**裁定：标「task-decomp 拆卡前须核实渲染实现路径」**——须先厘清真实 DOM 输出契约与产品意图（占位卡片？待接微信媒体 API？），再判 mini/full/autoplay/with-caption 变体归桶。契约厘清前这 6 变体**归 blocked**，不纳本批 collect-list「必归零」硬约束。

## 8. 决策记录

- **考虑的选项**：候选 A（回退止血）/ 候选 B（注册即实现 + merge）/ 候选 C（回退 + 差分守卫）。矩阵见 §3。样式分层子选项：replace（现状）vs merge。
- **architect 原推荐**：候选 C。**用户裁定**：候选 B（结构性根治，注册期硬拒，「构造守卫为主」直接延伸）+ 接受 big-bang 分阶段迁移 + 接受 PATCH 类目。
- **merge over replace（顶层原则直接指向）**：用户下达「最干净 / 避免重复包装、冗余」原则，replace 语义强制变体 full-root 重复块基线 = 被否的重复包装；merge 令变体只写 delta、块基线单点改动传导全变体，是更干净可扩展模型。fat-base 污染反例以「最小基座 + default 变体 delta」重构干净化解（对 default 输出保真），非退回 replace。default 降为普通变体（base⊕delta 单一规则）提升一致性与可扩展性。
- **候选 C 的保留价值**：C 层二差分守卫是 B 两类静态盲区（§6）的唯一机器兜底——作 §9 Q-B1 推荐选项 ① 保留；B 为主、C 差分守卫可作 B 补全层，非互斥。
- **何条件重评**：① §6 不补差分守卫且事后暴露 no-op 逃逸 → 回补差分守卫；② merge 最小基座出现须删键的硬反例（当前核查无）→ 重评；③ taxonomy backlog（OQ-2/3）积累到影响可用性 → 统一收敛块。
- **版本新鲜度**：内部机制，不引入新外部依赖，无 tech-eval 版本/生命周期核验项。

## 9. 留待用户终审的 open questions（≤2）

- **⚠️ Q-B1（唯一实质机制点，§6）· B 类残余盲区兜底**：是否补最小渲染期差分守卫（选项 ①，architect 推荐，兜「delta 空 ≡default」「decorate 对该变体 no-op」两类注册守卫抓不到的真实盲区）？还是纯纪律（选项 ②，回退走查已证失效老路）？
- **Q-Merge（§4.2 / §5.3）· fat-base 重构确认**：确认对 6 个 fat-base 块（callout/warning/announcement/compare/quote/pull-quote）做「最小基座 + `default` 变体 delta」重构 + `default` 降为普通变体的 merge 模型？（重构对 default 输出保真、cross-runtime hash 不变为硬约束；唯一已实现变体附带变更 = `steps.card` 获块节奏 margin，重 seed 5 快照。）
- 次级 OQ（OQ-8/9/10 待验证缺口 / feasibility / blocked）见 §7，按用户授权已由 architect 裁定，非终审阻塞项，仅需 orchestrator 收口时纳入 task-decomp 输入。
