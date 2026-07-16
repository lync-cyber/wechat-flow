---
id: "design-review-variant-impl-predicate-r1"
doc_type: design-review
author: architect
status: approved
deps: ["T-191", "T-192", "T-209", "T-210", "T-211"]
consumers: ["orchestrator"]
---

# 变体实现谓词裁定 — 批 C 翻转前置（缺陷 A / 缺陷 B）

## 0. 结论摘要（TL;DR）

批 C 翻转（T-209 register→throw、T-210 render→RED）前，两层守卫暴露两个谓词缺陷。核实源码后裁定如下：

- **缺陷 A（假阳性，`divider.{wave,dots,flower}`）**：**必须**在注册期静态谓词新增 **谓词④「external-implemented registry」**，从流水线实现的单一事实来源 `DIVIDER_SVG_VARIANTS` 派生投影为 `Set<"blockId::variantId">` 供 `isVariantImplemented` 消费。register 期 throw 早于 render，无法退给渲染兜底，故此项**只能**在注册期解决。派生投影天然排除 `thick/dotted/dashed`（不在 SSOT），不会过度豁免。
- **缺陷 B（假阴性，`decorate` 块级粒度）**：审计**确认存在**真实假阴性（12 个具名变体 `谓词②` 放行却渲染 ≡ default），但这是 **T-191 AC-002 明文设计**（`谓词②` 故意粗粒度、由 T-192 差分守卫兜底）。裁定：**不收紧 `谓词②`**（YAGNI + 尊重既定设计），改为**修正「归零对账口径」为两层守卫并集**（`getUnimplementedVariants ∪ runVariantDiffGuard`）——这才是缺陷 B 的真实修复点。另发现 13 个「退化变体」（渲染 ≠ default 但语义未实现）逃逸两层自动守卫，属命题4 正向保真盲区，由一次性零机制枚举 + T-212 真机走查兜住，**不新增永久守卫**。

翻转就绪判据见 §6。与 dev-plan 现有口径的差异见 §7（需 amend）。

---

## 1. 现状核实（代码为准）

### 1.1 四种变体实现机制（核实后完整集）

| 机制 | 载体 | 静态谓词可见 | 权威判据层 |
|------|------|------------|-----------|
| baseStyle delta | `variant.baseStyle` 任一 slot ≥1 非空声明 | 是（谓词①） | register 期 |
| block-level decorate | `definition.decorate` 存在（块级布尔） | 部分（谓词②，粗粒度） | render 期兜底 |
| external pipeline stage | `render.ts` 内 `injectDividerDecorations` 等阶段 | **否**（缺陷 A） | 待补谓词④ |
| intentional-plain 豁免 | `INTENTIONAL_PLAIN_VARIANTS`（当前空集） | 是（谓词③） | register 期 |

已排除的伪机制：**theme l2**（`themeTokens[blockId][variantId]`）——核实 `packages/themes/default/src/index.ts` 与各 `blocks/*.ts`，主题 block 样式按 **HTML 标签**（`hr`/`blockquote`/`h1`/`p`…）键控，非按 directive 块 id + 变体键控；`:::divider`/`:::steps` 等指令块的 `themeTokens["divider"]`/`["steps"]` 均 undefined，故 theme l2 对指令块变体**不构成**实现机制，无需为其增设谓词。ruleset（`builtinRules`）与 `decoration-injector` 亦不实现任何块变体（仅 strip-data-attr 保留 `data-variant` 语义属性、`decoration-injector` 仅处理 heading 主题资产、default 主题 `assets:{}`）。

### 1.2 两层守卫职责（现状）

- **第一层 T-191 静态谓词** `isVariantImplemented`（`block.ts:50-57`）：`谓词① ∨ 谓词② ∨ 谓词③`；`collect` 模式记入 `unimplementedCandidates`，`getUnimplementedVariants()` 导出；`throw` 模式抛 `E_VARIANT_NO_IMPL`（`block.ts:127-136`，store.set 前抛，未注册）。
- **第二层 T-192 差分守卫** `runVariantDiffGuard`（`variant-diff-guard.ts`）：跑**完整 `renderMarkdown` 流水线**，剥 `data-variant` 后逐字节比较变体 vs 同块 default，`≡ default` 且非 allowlist/exclude → finding（WARN）。因跑真实流水线，**能看见** external pipeline 阶段注入的效果。

---

## 2. 缺陷 A 裁定：external-implemented 变体识别

### 2.1 问题定性

`divider.{wave,dots,flower}` 在 `packages/blocks/src/blocks/divider.ts` 为空条目（仅 `{id,label}`），divider 块无 `decorate`、变体无 `baseStyle`、不在 allowlist → `谓词①②③` 全不命中 → `getUnimplementedVariants` 判为未实现。但其实现落在流水线阶段 `divider-decoration.ts`（`render.ts:75` 调用 `injectDividerDecorations`），`walk()` 按 `DIVIDER_SVG_VARIANTS = {wave,dots,flower}`（`divider-decoration.ts:4`，SSOT）匹配 `data-block="divider"` + `data-variant∈SSOT` 注入 SVG（path/circle/line，色取 `--color-border`/`--color-border-strong`/`--color-brand`）。核实 `tests/core/blocks/divider-svg-variants.test.ts` 断言三变体渲染产物含 `<svg>` 及子节点，即变体渲染 **≠ default**——T-192 差分守卫能正确放行，唯 T-191 静态谓词盲视流水线阶段。

**关键约束（决定方案空间）**：T-209 把注册期切 throw。`registerBlock` 在**模块导入期**执行、**早于任何 render**。若静态谓词对 external 变体判「未实现」，throw 会在渲染发生前触发 → divider 块整体注册失败 → 系统崩溃。故 external 变体的识别**必须**在注册期完成，**不能**退给渲染期兜底（与缺陷 B 的可退性形成对称差异，见 §4）。

### 2.2 方案对比矩阵

| 方案 | SSOT 派生 | 防漂移 | 注册期可判 | 依赖方向 | 加载序风险 | 裁定 |
|------|----------|--------|-----------|---------|-----------|------|
| **A1 派生静态清单（推荐）** | 从 `DIVIDER_SVG_VARIANTS` 投影 `Set<block::variant>` | 强（SSOT 增删变体自动传播） | 是（静态 import 求值期完成） | registry → pipeline 叶子（无环，divider-decoration 不反向 import registry） | 无（静态求值，非运行时副作用） | **采纳** |
| A2 运行时自注册 API | pipeline 阶段 load 时 `registerExternalImpl("divider", v)` | 强 | 依赖注册序 | pipeline → registry | **有**（阶段模块须先于 divider 块注册加载，可重置态易碎） | 备选（更多活动件、加载序脆弱） |
| A3 塞 `INTENTIONAL_PLAIN_VARIANTS` | 否 | 无 | 是 | — | — | **禁止**（语义相反：这些变体有丰富装饰，非「故意留白」；且掩盖真缺口） |
| A4 手工平行清单 | 否（手写 `divider::wave`…） | **无**（SSOT 增删变体清单忘改 → 假绿） | 是 | — | — | **禁止**（违「派生自 SSOT」约束） |

推荐 **A1**：纯静态派生、无加载序脆弱、SSOT 单点。相较 A2，A1 的 `Set` 在 import 图求值期一次算定、早于任何 `registerBlock`，无「阶段是否先加载」的时序耦合，是关键优势。

### 2.3 推荐改法（签名级示意，勿写进源码）

```ts
// pipeline/divider-decoration.ts —— SSOT 不动，仅新增描述符导出
export const DIVIDER_SVG_VARIANTS = new Set(["wave", "dots", "flower"]);
export const DIVIDER_EXTERNAL_IMPL: ExternalImplDescriptor = {
  blockId: "divider",
  variantIds: DIVIDER_SVG_VARIANTS,        // 引用同一 Set，非复制
};

// registry/externally-implemented-variants.ts —— 新增派生聚合器（叶子）
const DESCRIPTORS: ExternalImplDescriptor[] = [DIVIDER_EXTERNAL_IMPL];
export const EXTERNALLY_IMPLEMENTED_VARIANTS: Set<string> = new Set(
  DESCRIPTORS.flatMap((d) => [...d.variantIds].map((v) => `${d.blockId}::${v}`))
);

// registry/block.ts —— isVariantImplemented 增谓词④
function isVariantImplemented(def, variant): boolean {
  if (hasNonEmptyBaseStyleDelta(variant)) return true;                               // ①
  if (def.decorate) return true;                                                     // ②（粗粒度，见缺陷 B）
  if (EXTERNALLY_IMPLEMENTED_VARIANTS.has(`${def.id}::${variant.id}`)) return true;  // ④ NEW
  return INTENTIONAL_PLAIN_VARIANTS.has(`${def.id}::${variant.id}`);                 // ③
}
```

依赖方向说明：`externally-implemented-variants.ts`（registry）import `divider-decoration.ts`（pipeline）。核实 `divider-decoration.ts` 仅 import `@wechat-flow/contracts` 与 `hast` 类型，**不**反向 import registry，故无环、divider-decoration 相对 registry 是叶子。若追求分层纯度，可把 `DIVIDER_SVG_VARIANTS` 抽到一个更细的叶子常量模块，由 divider-decoration 与聚合器同时 import（消除 registry→pipeline 方向）；此为可选优化，不改变裁定。

### 2.4 防漂移断言（必带测试）

```ts
it("EXTERNALLY_IMPLEMENTED_VARIANTS 严格是 DIVIDER_SVG_VARIANTS 投影，且不含非 SSOT 变体", () => {
  for (const v of DIVIDER_SVG_VARIANTS)
    expect(EXTERNALLY_IMPLEMENTED_VARIANTS.has(`divider::${v}`)).toBe(true);
  for (const v of ["thick", "dotted", "dashed"])           // 非 SSOT，不得被豁免
    expect(EXTERNALLY_IMPLEMENTED_VARIANTS.has(`divider::${v}`)).toBe(false);
});
```

### 2.5 验证性副产品：谓词④不过度豁免

`divider` 声明了 7 个具名变体：`{wave,dots,flower}` 属 SSOT（谓词④放行），`{thick,dotted,dashed}` **不属** SSOT——核实其无 baseStyle、无 decorate、无 theme l2（divider 主题按 `hr` 标签键控，非 divider 块变体），且 `divider-svg-variants.test.ts` R-002 断言 `thick` 渲染不含 `<svg>`（与 default 同）。故（本裁定成文时）`thick/dotted/dashed` 是**真缺口**，谓词④派生自 SSOT 后**仍正确 flag 它们**。这坐实了「派生自实现 SSOT」优于「块级布尔/手工清单」：识别粒度恰好落在实现真实覆盖的变体上，不多不少。

> **落地注（orchestrator，批 B 后）**：批 B（已入 main）已给 `divider.{thick,dotted,dashed}` 补 baseStyle delta（谓词①实现），三者不再是真缺口；`getUnimplementedVariants()` 中 divider 项归零。谓词④仅识别 `{wave,dots,flower}`（流水线实现），且因 `thick/dotted/dashed` 不在 `DIVIDER_SVG_VARIANTS` SSOT，**谓词④不豁免它们**——「不过度豁免」的结论不因批 B 的 IMPORT 而改变，防漂移测试锁定此性质。

---

## 3. 缺陷 B 裁定：decorate 块级粒度

### 3.1 审计方法与全量结论

对 7 个带 `decorate` 的块（`pull-quote/quote/steps/paragraph/dialog/compare/gallery`，grep 核实 `tip-grid/definition-list/list/recommendation` **无 decorate**，task 前提有误——它们是普通零机制块，由谓词①②③正常 flag，不属缺陷 B）逐变体核实：某具名变体既无 baseStyle、decorate 又不实际处理它时的渲染净效果。

| block | decorate 实处理 | 谓词②放行但 decorate no-op 的变体 | 渲染 vs default | 类别 |
|-------|----------------|-------------------------------|----------------|------|
| paragraph | dropcap | indented, spaced | ≡ default | **B-true** ×2 |
| steps | card | horizontal, numbered, circle-numbered, timeline, arrow, minimal, filled, compact | ≡ default | **B-true** ×8 |
| dialog | chat-bubbles | interview | ≡ default | **B-true** ×1 |
| gallery | 全部（按列数重映射） | grid（列数=2→重映射为 duo，与 default 同为 duo） | ≡ default | **B-true** ×1 |
| quote | large-quote-mark, dropcap | bordered, centered, filled, minimal, large, italic, card | ≠ default（缺 default 的 border-left，更「素」） | degenerate ×7 |
| pull-quote | decorated | large, minimal, bordered | ≠ default（缺 default 的居中样式） | degenerate ×3 |
| compare | ledger | highlight-right, table-style, compact | ≠ default（缺 default 的 table display） | degenerate ×3 |
| gallery | — | masonry, carousel（重映射为 triptych，≠ default 但 == triptych 别名） | ≠ default | degenerate ×2 |

**两类真实假阴性均存在**：

- **B-true（12 项）**：谓词②放行、渲染 ≡ default → **T-192 差分守卫能捕获**（该变体渲染 ≡ default 即 finding）。这正是 T-192 目标声明的「decorate 对该变体实际 no-op」盲区。
- **degenerate（15 项）**：谓词②放行、渲染 ≠ default（仅比 default 更素/被别名化）→ **两层自动守卫皆不捕获**。这是命题4 正向保真盲区（`inspect(render(x))===[]` 自证性质无法验证「bordered 真的有边框」）。

（`steps::horizontal`/`steps::numbered` 被现有 `tests/core/guard/variant-guard-builtin-registry.test.ts:57-63` 断言「不在候选集」并注为「谓词②真实放行内置数据」——该测试锁定的正是 B-true 假阴性行为；口径修正后这些变体将经差分守卫进入并集 census，该测试的断言语义需随 T-210 一并复核。）

### 3.2 谓词②是「按设计粗粒度」，非缺陷

核实 dev-plan T-191 **AC-002**（`dev-plan-wechat-flow-s7.md:2070`）：

> 谓词② decorate 放行 —— 给定块声明 decorate 钩子（**不论其内部是否真处理该具名变体，本谓词是静态放行，运行时真实覆盖由 T-192 差分守卫兜底**）……

及 T-192 目标（`:2089`）：明确差分守卫用于「兜 T-191 注册期静态守卫的两类残余盲区（……**decorate 对该变体实际 no-op**）」。

故谓词②的块级粗粒度是**明文设计选择**：静态层不判 decorate 是否处理某变体，交渲染层坐实。缺陷 B 的真实问题**不在谓词②本身**，而在 **dev-plan 的「归零对账口径」（`:1935`）只取 `getUnimplementedVariants()` 静态输出、未并入差分守卫 finding**——这使 B-true 变体（静态漏、渲染捕）落在对账口径之外，制造**假零**。

### 3.3 方案对比矩阵

| 方案 | 变更面 | B-true 覆盖 | degenerate 覆盖 | fixture 依赖 | 漂移风险 | 尊重既定设计 | 裁定 |
|------|-------|-----------|----------------|-------------|---------|------------|------|
| **P1 并集口径（推荐）** | 仅口径定义 + 编排脚本（无 block.ts 谓词改动）；配合缺陷 C fixture | 是（差分守卫捕获） | 否（转 §3.5 人工路径） | 有（需缺陷 C 内容感知 fixture） | 无 | 是（谓词②不动） | **采纳** |
| P2 变体级 `decorateVariants`（B1a） | `DefineBlockOptions` 增字段 + 7 块声明其处理集 + 理想上 decorate 消费同集 | 是（静态直捕） | 是（零机制变体静态直捕） | 无（fixture 无关） | 需管控声明与 decorate 体一致 | 否（推翻 AC-002） | 备选（见 §3.6） |
| P0 现状 | 无 | 否（假零） | 否 | — | — | — | **拒绝**（违「不掩盖遗漏」） |

### 3.4 推荐裁定（P1）

**不收紧谓词②。** 缺陷 B 的修复是**系统级并集**而非谓词改写：

1. **口径修正**：「归零对账」重定义为 `getUnimplementedVariants() ∪ runVariantDiffGuard() findings`，再扣除 `INTENTIONAL_PLAIN_VARIANTS ∪ KNOWN_BLOCKED_VARIANTS/exclude`。B-true 由差分守卫补入并集，假零消除。
2. **缺陷 C 前置**：差分守卫的通用 fixture（`DEFAULT_DIRECTIVE_BODY` 单段文字）对结构化块（list/code-block/gallery/steps 的 decorate 需 ul/pre/img）不触发装饰，会制造 fixture 伪 finding **并**可能掩盖真实差异。T-210 翻 RED 前须给差分守卫**内容感知 fixture**（list→列表 markdown、code-block→代码块、gallery→图片列表、steps→步骤列表）。此为 T-210 已识别技术前置（(c)），并入本裁定作为缺陷 B 修复的硬依赖。

YAGNI 依据（对照「别过度设计」逃逸条款「须举出简单解抓不到的具体失败场景」）：简单解 P1 对 **B-true 无遗漏**（差分守卫捕获全部 render-≡-default）。P2 相对 P1 唯一多捕的是 **degenerate 类**——但 degenerate 类是既有且已接受的命题4 盲区（正向保真须人工/真机 oracle，上游 #473/#474 deferred），且 P2 的「已声明机制」只保证「有机制」不保证「机制正确」（错误 baseStyle 仍蒙混过关），并不真正抵达正向保真。既有 T-212 真机走查已是该类的既定 oracle，P1 未留**无人兜底**的洞。故不为 degenerate 类新增永久静态机制。

### 3.5 degenerate 类处置（不新增守卫）

15 个 degenerate 变体逃逸两层自动守卫，若「归零对账」仅凭两守卫会**假零掩盖**它们，违反 T-209 AC-001「不掩盖遗漏」。裁定用**一次性零机制枚举**（非永久守卫）在 T-211 前置产出，喂给 sign-off 处置 + T-212 走查：

- **零机制判据**（一次性脚本，编排临时执行，非入库守卫）：枚举全部具名变体，标出**同时**满足「无非空 baseStyle delta」∧「不在 external registry」∧「decorate 对其不实际改变 DOM（no-op 或仅别名化为另一已实现变体）」者。
- 每个枚举项按变体缺口 sign-off 定稿处置：应视觉可辨但未实现 → **IMPORT**（补 baseStyle delta 或专门实现）；不应独立存在 → **DELETE**；确认与 default 视觉一致属设计 → 登记 `INTENTIONAL_PLAIN_VARIANTS`（须 sign-off，非缺口垃圾桶）。
- **T-212 真机走查是该类最终 oracle**，与 T-206 gradient / T-172 r3 真机采集合并执行。

此路径把 degenerate 类**显式路由到人工 oracle**（命题4 既定处置），而非留在自动守卫的假零里——满足「不掩盖遗漏」且不过度设计。

### 3.6 备选 P2 的触发条件

若后续出现「新增具名变体屡屡零机制、一次性枚举脚本腐化失效」的证据（即 degenerate 类**反复复发**而非一次性存量），则升级至 P2：`DefineBlockOptions` 增 `decorateVariants: Set<string>`，谓词②收紧为 `def.decorate && def.decorateVariants?.has(variant.id)`，并令 decorate 体消费同一 `decorateVariants` 作为其守卫（`if (!decorateVariants.has(ctx.variant)) return`），使声明=行为、零漂移。此时静态 census 完备、fixture 无关、degenerate 类亦被静态直捕，差分守卫退为纯回归网。当前证据不足以支撑此成本，记为条件触发。

---

## 4. 两层守卫职责边界（T-209/T-210 翻转后）

| 层 | 时机 | 判据 | 对「external 变体」 | 对「decorate no-op 变体」 | 权威性 |
|----|------|------|-------------------|--------------------------|--------|
| 谓词①（baseStyle delta） | register | 有非空 delta | — | — | 该类的完全权威 |
| 谓词②（decorate，块级） | register | 块有 decorate → 不 throw（**延给 render**） | — | **不 throw、不证实现**，交 render 坐实 | 无独立权威（仅防误杀 decorate 块） |
| 谓词③（allowlist） | register | 命中 intentional-plain | — | 仅「设计上 ≡ default」者 | 显式豁免权威（须 sign-off） |
| **谓词④（external registry，新增）** | register | 命中 SSOT 投影 | **该类的完全权威**（render 延后不可用） | — | external 变体的唯一注册期判据 |
| 差分守卫（render diff） | render | 变体渲染 ≡ default | 放行（渲染 ≠ default） | **捕获 no-op（≡ default）** | render-≡-default 的完全权威 + 全局回归网 |

**核心不对称（须在设计中显式承认）**：

- **external 变体不可延后**：throw 早于 render，谓词④**必须**在注册期给出确定答案。裁定明确「不设 render-time 兜底代替谓词④」——注册期对 external 变体的 throw 决策不能依赖尚未发生的渲染。
- **decorate no-op 变体可延后**：块有 decorate 时谓词②不 throw（块能注册），no-op 变体的真缺口由差分守卫在 render 期捕获。谓词②的职责是**防止对真 decorate 块误杀**，差分守卫的职责是**捕获 decorate 块内的真 no-op 缺口**——两者分工互补，**并集**才是完整缺口 census。谓词④ 防**假 throw**（保护真 external 实现），差分守卫捕**真缺口**，职责不同不可相互替代。

---

## 5. 与 dev-plan 现有口径的差异（需 amend）

dev-plan `:1935`「collect-list 归零对账口径」当前定义为 `getUnimplementedVariants()` 输出扣除 allowlist 与 known-blocked——**静态单层**。本裁定要求改为**两层并集**：

```
census = ( getUnimplementedVariants()  ∪  runVariantDiffGuard(exclude=KNOWN_BLOCKED).findings )
         \ ( INTENTIONAL_PLAIN_VARIANTS  ∪  KNOWN_BLOCKED_VARIANTS )
翻转就绪 ⇔ census == ∅   且   §3.5 零机制枚举全部已处置
```

owner=orchestrator 在 T-209/T-211 卡执行前 amend 该口径行（与本裁定同批落地）。注：本工作树（`feature/variant-gap-batch-c-prep` = main + T-191/T-192）尚无 `packages/blocks/src/known-blocked-variants.ts`（T-207/批 B 未并入本枝）；口径以机制名（`KNOWN_BLOCKED_VARIANTS`/`exclude`）表述，批 B 并入后即生效，audio/video contract-pending 项归此桶。

---

## 6. 翻转就绪 checklist（交 orchestrator）

**缺陷 A 修复落地**
- [ ] 谓词④ `EXTERNALLY_IMPLEMENTED_VARIANTS` 实现，从 `DIVIDER_SVG_VARIANTS` 派生投影；`isVariantImplemented` 消费。
- [ ] `getUnimplementedVariants()` **不再含** `divider::wave/dots/flower`。
- [ ] 防漂移测试（§2.4）绿：SSOT 投影严格、`thick/dotted/dashed` 不被豁免。
- [ ] `divider::wave/dots/flower` 在差分守卫中**亦不出现**（渲染 ≠ default，双层皆放行=真实现）。

**缺陷 B 修复落地**
- [ ] dev-plan `:1935` 归零对账口径 amend 为两层并集（§5）。
- [ ] 缺陷 C 内容感知 fixture 就绪（list/code-block/gallery/steps 等结构化块），差分守卫无 fixture 伪 finding、无 fixture 掩盖真差异。
- [ ] B-true 12 项（paragraph.{indented,spaced} / steps.{8} / dialog.interview / gallery.grid）经差分守卫进入并集 census，各获处置（IMPORT/DELETE/allowlist/known-blocked）。
- [ ] §3.5 零机制一次性枚举产出，degenerate 15 项（quote.{7}/pull-quote.{3}/compare.{3}/gallery.{masonry,carousel}）逐项处置并纳入 T-212 走查清单。

**归零对账为空集判据（区分三类）**
- [ ] **真实现变体**：不得出现在任一守卫输出（如 `divider::wave` 谓词④后双层皆无、`callout::tip` 谓词①放行且渲染 ≠ default）。
- [ ] **真缺口变体**：必须出现在并集 census 直到被真实现或 DELETE（如 `steps::horizontal`、`divider::thick`、`tip-grid::two-column` 在处置前须在册）。
- [ ] **contract-pending 变体**：必须在 `KNOWN_BLOCKED_VARIANTS`/`exclude`（audio/video），从有效 census 扣除。
- [ ] **allowlist**：`INTENTIONAL_PLAIN_VARIANTS` 仅收「设计上 ≡ default」且经 sign-off 者；**不得**作缺口豁免（现状空集，翻转后若非空须逐条 sign-off 依据）。

**翻转执行门（全绿方可翻）**
- [ ] `census == ∅`（§5 公式）且 §3.5 枚举全部已处置。
- [ ] T-209：`setVariantGuardMode` 默认 collect→throw、移除 collect-only 脚手架；回归探针：零机制探针块（无 baseStyle/无 decorate/非 external/非 allowlist）注册抛 `E_VARIANT_NO_IMPL`。
- [ ] T-210：差分守卫 WARN→RED；回归探针：注册通过但渲染 ≡ default 的探针变体被 RED 捕获（证两层皆活）。
- [ ] T-206 `highlight-block.gradient` 用户门卡已裁（IMPORT/DELETE），不再悬留于 census（owner=user，硬前置）。

---

## 7. root_cause 与遗留注记

- 缺陷 A：`root_cause: upstream-caused`——T-191 谓词集设计时未建模「块外/流水线实现」这一机制类别，非实现者失误。
- 缺陷 B：`root_cause: self-caused`（对账口径层）——T-191 AC-002 明文接受谓词②粗粒度并指定 render 兜底，但 dev-plan `:1935` 归零口径漏并入差分守卫，口径与守卫设计脱节。
- degenerate 类正向保真盲区归属既有 deferred 项（命题4，上游 #473/#474），本裁定不重复立项，仅确立「一次性枚举 + T-212 走查」的处置通道。
