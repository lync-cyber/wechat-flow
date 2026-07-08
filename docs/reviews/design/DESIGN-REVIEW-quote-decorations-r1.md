---
id: "design-review-quote-decorations-r1"
doc_type: design-review
author: reviewer
status: draft
deps: ["T-168"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — 四个装饰变体（T-168 AC-006）

## 审查方式

对照对象（两源）：
- spec 条目：`ui-spec-wechat-flow-block-variants#§10.3`（pull-quote decorated）、`#§10.5`（quote large-quote-mark / dropcap）、`ui-spec-wechat-flow-content-elements#§9.8`（首字下沉 table 双格悬挂技法）
- 设计样张 PNG：`docs/design/frames/specimens/block-variants-pull-quote.png`、`block-variants-quote.png`、`content-elements-dropcap.png`（三者均为 T-140 同批产出，PR #108，`design_signoff` 已确认；`content-elements-dropcap.png` 为 5 主题色值对照表）

渲染实证路径：在 scratchpad 编写独立脚本，`import` `packages/core/src/index.ts` 的 `renderMarkdown`/`registerTheme` 与 `packages/blocks/src/index.ts`，并显式 `registerTheme` 注册 `@wechat-flow/themes/{default,literary,tech}` 三包（复现 `apps/editor/src/main.ts` 等真实入口的主题注册序列，而非仅传 `themeId` 字面量——后者在未注册主题时静默回退 core 内置 `DEFAULT_TOKENS`，不代表任何一个 wechat-flow 主题包的真实视觉），用 `npx tsx` 执行取得四个装饰变体的最终 inline-styled HTML；另用 Playwright headless Chromium 对渲染 HTML 截图（含多行换行场景 + `default`/`tech` 主题对照），与设计样张裁剪局部逐像素比对。全部临时脚本审查后已删除（`_tmp-review-render.ts` / `_tmp-review-render2.ts` / `_tmp-crop.mjs`，均为本次新建的仓内临时文件，未提交）。

容差判定：hex/px/em/字符串值要求完全一致；悬挂对齐与定位关系（inline-block + vertical-align、table/table-cell 结构）逐项核对结构与样式声明。

## 结论

**needs_revision** —— 四个装饰变体自身的定位/无边框/行高/署名前缀/悬挂技法（T-168 AC-001~AC-005 对应的修正点）渲染结果与样张一致，T-157 报告的断行与视觉症状已消除；但发现 1 项 HIGH（装饰色值/字体跨主题不生效，与 arch Q3.15 契约、ui-spec 明文、`content-elements-dropcap.png` 样张三方矛盾）与 2 项 LOW。

## 一、pull-quote decorated（引号进首段行首 + 居中署名）

**渲染实证**（`:::pull-quote{.decorated author="鲁迅"}\n横眉冷对千夫指，俯首甘为孺子牛。\n:::`，`themeId: "default"`，已注册真实 `default` 主题包）：

```html
<div data-block="pull-quote" data-variant="decorated" style="font-size: 1.25em; margin: 24px 0; padding: 24px 16px; text-align: center">
  <p style="color: #1C1917; font-family: 'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif; font-size: 1.25em; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: center">
    <span style="color: #2D5A4E; display: inline-block; font-size: 28px; line-height: 1; opacity: 0.35; position: relative; vertical-align: top">「</span>横眉冷对千夫指，俯首甘为孺子牛。
  </p>
  <div style="color: #78716C; font-size: 13px; margin-top: 10px; text-align: center">—— 鲁迅</div>
</div>
```

| 维度 | spec `#§10.3` | 渲染实际值 | 结论 |
|------|---------------|-----------|------|
| 引号节点位置 | 首个 `<p>` 的第一个子节点，与正文同行 | `<span>` 确为 `<p>` 的第一个子节点，正文紧随其后同一 `<p>` | 一致（AC-001） |
| 引号字符 | 真实字符「「」 | `「` | 一致 |
| 引号 font-size/opacity/color/display/vertical-align/line-height | `28px`/`0.35`/`--color-brand`/`inline-block`/`top`/`1` | `28px`/`0.35`/`#2D5A4E`/`inline-block`/`top`/`1` | 一致 |
| root typography 下推 | 正文 `<p>` 计算 `text-align`=`center`、字号反映 `1.25em` | `<p>` style 含 `text-align: center; font-size: 1.25em` | 一致（T-167 下推 cascade 生效） |
| 署名行文本 | 「—— {author}」 | `—— 鲁迅` | 一致（AC-004） |
| 署名行样式 | `margin-top:10px`/`text-align:center`/`font-size:13px`/`--color-text-muted` | `margin-top: 10px; text-align: center; font-size: 13px; color: #78716C` | 一致 |
| root baseStyle | `text-align:center`/`padding:24px 16px`/`margin:24px 0`/`font-size:1.25em` | 完全一致 | 一致 |

**样张对照**（`block-variants-pull-quote.png`）：引号「呈小号浅色标记，位于首行文字左上方、与文字同行（非独立成行）；正文居中两行；署名居中于正文下方，前缀「——」。局部裁剪比对（Playwright 截图 vs 样张裁剪区）位置关系与视觉层次一致，长文本换行（2 行）时引号不随行重复、不产生断行，署名位置不受影响。

**T-157 症状核验**：原「quote-mark 以 `<p>` 兄弟节点注入必断行」症状已消除——`injectLeadingInlineNode` 现将装饰节点插入目标 `<p>` 的 `children` 数组首位而非作为兄弟节点，结构与渲染截图均确认同行。

**结论**：一致（AC-001/AC-004 通过）；跨主题色值问题见 §问题列表 R-001。

## 二、quote large-quote-mark（大引号同行 + 无边框）

**渲染实证**（`:::quote{.large-quote-mark}\n好的排版让读者忘记排版，只记住内容本身，这是我们对每一位读者的承诺。\n:::`，`themeId: "default"`）：

```html
<div data-block="quote" data-variant="large-quote-mark" style="color: #555; margin: 16px 0; padding: 8px 16px">
  <p style="color: #555; font-family: 'LXGW WenKai', ...; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">
    <span style="color: #2D5A4E; display: inline-block; font-size: 2em; line-height: 0.6; margin-right: 4px; opacity: 0.4; vertical-align: top">"</span>好的排版让读者忘记排版，只记住内容本身，这是我们对每一位读者的承诺。
  </p>
</div>
```

| 维度 | spec `#§10.5` | 渲染实际值 | 结论 |
|------|---------------|-----------|------|
| 引号节点位置 | 首个 `<p>` 第一个子节点，与正文同行 | 确认为 `<p>` 首子节点 | 一致（AC-001） |
| root 无 `border-left` | 无边框引用基线 | `getBlockBaseStyle("quote","large-quote-mark")` 与渲染后容器 `style` 均不含 `border-left`（跨 default/literary/tech 三主题复测一致） | 一致（AC-002） |
| root padding/margin/color | `8px 16px`/`16px 0`/`#555` | 完全一致 | 一致 |
| 引号 font-size/color/opacity/line-height/display/vertical-align/margin-right | `2em`/`--color-brand`/`0.4`/`0.6`/`inline-block`/`top`/`4px` | `2em`/`#2D5A4E`/`0.4`/`0.6`/`inline-block`/`top`/`4px` | 一致 |
| root color 下推 | 正文 `<p>` 计算 `color` = root 声明色值 | `<p>` style 含 `color: #555`（覆盖全局 tag token `#1C1917`） | 一致（T-167 下推 cascade 生效） |

**样张对照**（`block-variants-quote.png` 左面板）：无边框浅灰底卡片，大引号位于首行文字左侧同一行，字重明显、色浅偏灰绿。裁剪局部比对：结构位置一致；渲染实际字符为 ASCII 直引号 `"`（默认无衬线字体渲染下呈现为两道细直线），样张标注字符本身与 spec 描述相符（真实字符「"」，非要求特定字体），但视觉粗细/弧度与样张呈现的粗体卷曲引号观感有差异——样张渲染环境的字体选择使同一字符呈现更饱满的视觉效果，而代码未对该 `quote-mark` 装饰 span 声明 `font-family`（该 span 走 `data-block-slot` 路径，不继承容器 typography 下推的字体族，退回消费环境默认字体）。此项记入 R-002（LOW，不违反 spec 明文）。

**T-157「两种引用格式同时渲染」症状核验**：原症状为 root 遗留 `border-left: 3px solid #888`（default 变体的边框引用基线）与大引号装饰同时出现，形成"边框引用 + 大引号引用"两种视觉语言叠加；现 root 计算样式确认不含 `border-left`，仅保留大引号单一装饰语言，症状消除。

**多行换行核验**：Playwright 截图下 2 行换行场景，引号仅出现一次于首行行首，无重复、无断行，第二行左对齐正常延续。

**结论**：一致（AC-001/AC-002 通过）；跨主题色值问题见 R-001，quote-mark 字体未锁定见 R-002。

## 三、quote dropcap（首字下沉 table 双格悬挂）

**渲染实证**（`:::quote{.dropcap}\n书如交友，引文如引荐，郑重其事方显诚意，多一行文字来验证悬挂换行是否稳定对齐。\n:::`，`themeId: "default"`）：

```html
<div data-block="quote" data-variant="dropcap" style="color: #555; margin: 16px 0; padding: 8px 16px">
  <div style="display: table; width: 100%">
    <div style="color: #2D5A4E; display: table-cell; font-family: 'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif; font-size: 2.2em; font-weight: 700; line-height: 1; padding-right: 8px; vertical-align: top; white-space: nowrap; width: 1%">书</div>
    <p style="color: #555; font-family: 'LXGW WenKai', ...; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left; display: table-cell; vertical-align: top">如交友，引文如引荐，郑重其事方显诚意，多一行文字来验证悬挂换行是否稳定对齐。</p>
  </div>
</div>
```

| 维度 | spec `#§9.8`/`#§10.5` | 渲染实际值 | 结论 |
|------|----------------------|-----------|------|
| root 无 `border-left` | 无边框引用基线 | 不含 `border-left`（跨三主题复测一致） | 一致（AC-002） |
| 外层 wrapper | `display:table; width:100%` | 完全一致 | 一致（AC-005） |
| 首字 cell | `width:1%`/`white-space:nowrap`/`vertical-align:top`/`padding-right:8px`/`font-size:2.2em`/`font-weight:700`/`line-height:1`/`--color-brand`/`--font-family-heading` | 全部字段值完全一致，含 `line-height: 1`（T-157 报告缺失项，现已补齐） | 一致（AC-003/AC-005） |
| 正文 cell | `<p>` 标签，`display:table-cell`/`vertical-align:top` | 一致，且容器 `color:#555` 下推同时对正文 `<p>` 生效 | 一致（AC-005 + typography 下推） |

**样张对照**（`content-elements-dropcap.png` "default" 面板 + `block-variants-quote.png` 右面板）：首字明显放大（约 2.2em），左侧独立占位，正文多行整体悬挂于首字右侧、行首对齐一致，无边框浅灰底卡片。裁剪局部逐像素比对：结构布局、字符尺寸比例、悬挂对齐关系一致。

**多行悬挂核验**（Playwright 截图，2 行换行场景）：首字"书"占据左侧独立列，正文两行均在同一右侧列内左对齐换行，未出现环绕/塌陷/错位，与样张三行悬挂示例（`作/是一场漫长的自我/对话，每一次落笔都是/与读者的一次会面。`）呈现的悬挂效果结构一致。

**结论**：一致（AC-002/AC-003/AC-005 通过）；跨主题色值/字体问题见 R-001。

## 四、paragraph dropcap（段落首字下沉，同 table 双格悬挂技法）

**渲染实证**（`:::paragraph{.dropcap}\n作是一场漫长的自我对话，每一次落笔都是与读者的一次会面，愿这次会面值得被记住很久很久。\n:::`，`themeId: "default"`）：

```html
<div data-block="paragraph" data-variant="dropcap">
  <div style="display: table; width: 100%">
    <div style="color: #2D5A4E; display: table-cell; font-family: 'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif; font-size: 2.2em; font-weight: 700; line-height: 1; padding-right: 8px; vertical-align: top; white-space: nowrap; width: 1%">作</div>
    <p style="color: #1C1917; font-family: 'LXGW WenKai', ...; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left; display: table-cell; vertical-align: top">是一场漫长的自我对话，每一次落笔都是与读者的一次会面，愿这次会面值得被记住很久很久。</p>
  </div>
</div>
```

| 维度 | spec `#§9.8` | 渲染实际值 | 结论 |
|------|-------------|-----------|------|
| 外层 wrapper | `display:table; width:100%` | 一致 | 一致（AC-005） |
| 首字 cell 全部声明 | `width:1%`/`white-space:nowrap`/`vertical-align:top`/`padding-right:8px`/`font-size:2.2em`/`font-weight:700`/`line-height:1`/`--color-brand`/`--font-family-heading` | 全部字段值完全一致，含 `line-height:1`（T-157 报告缺失项，现已补齐） | 一致（AC-003/AC-005） |
| 正文 cell | `<p>` 标签 `display:table-cell`/`vertical-align:top` | 一致；`<p>` 自身颜色/字体不受容器下推影响（`paragraph` block 无 root baseStyle，无额外强制色值），符合预期——首字下沉不改变正文自身 typography | 一致 |
| 与 quote dropcap 技法一致性 | §10.5 声明"quote 的 dropcap 变体复用本方案" | `packages/blocks/src/decorate-utils.ts` 的 `injectDropcapMutation` 为两处 quote.ts/paragraph.ts 共用同一实现 | 一致（同源实现，非重复代码分叉） |

**样张对照**（`content-elements-dropcap.png` "default" 面板）：与 quote dropcap 结构一致，唯 paragraph 无引用框底色/边框（正文段落语境），首字视觉比例与悬挂行为一致。

**结论**：一致（AC-003/AC-005 通过）；跨主题色值/字体问题见 R-001。

## 问题列表

### [R-001] HIGH: 装饰色值/字体跨主题渲染不生效——L1 baseStyle 违规内嵌主题域声明，与 arch Q3.15 契约、ui-spec 明文、T-140 样张三方矛盾

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**:
  四个装饰变体涉及的全部主题相关视觉值（`quote` root 基线色 `#555`、`quote-mark` 装饰色 `#2D5A4E`、`dropcap` 装饰色 `#2D5A4E` + 字体族、`pull-quote` 署名行色 `#78716C`）在 `packages/blocks/src/blocks/{quote,pull-quote,paragraph}.ts` 中以字面量硬编码在 `BlockVariant.baseStyle`（L1）内，跨 `default`/`literary`/`tech` 三主题实测（显式 `registerTheme` 注册真实主题包后渲染，非仅传 `themeId` 字面量）**渲染结果字节级相同**，不随激活主题变化。

  这与三个独立权威源直接矛盾：
  1. **arch `arch-wechat-flow.md` Q3.15 决策记录**明文：L1 base-style 定位为"结构骨架——layout/spacing/排版结构，**主题无关**"；颜色/字体/边框/背景等视觉声明应属 **L2 主题 token override**。当前实现把颜色/字体族塞进 L1，直接违反该分层契约。
  2. **ui-spec `#§10.3`/`#§10.5`/`#§9.8` 明文**：`color: #555（default 主题基准，**跨主题渲染替换实值**）`、`color: {主题 --color-brand}`、`color: {主题 --color-text-muted}`、`font-family: {主题 --font-family-heading}` —— 均要求随激活主题解析为该主题的 token 实值，而非固定字面量。
  3. **`content-elements-dropcap.png` 样张**（T-140 产出，与本次审查的其余两张样张同批 sign-off）为显式 5 主题色值对照表：`default #2D5A4E` / `business #1A4F8A` / `literary #7B4F2E` / `magazine #D4521A` / `tech #58A6FF`——直接证明跨主题变色是被 sign-off 的设计意图,而非仅 default 主题下的偶然取值。

  架构层面的确认：`packages/core/src/pipeline/inline-style.ts` 的 `getBlockSlotStyle()`（`data-block-slot` 装饰路径，供 quote-mark/dropcap/author 消费）**仅读取 `variant.baseStyle[slot]`，完全不查询 `themeTokens`**——即便某主题包补注册了对应 L2 覆盖也不会被消费，这不是"数据缺失"而是"合成路径缺失"。容器 `data-block` 路径（root 层级）虽有 `l1 ⊕ l2` 合并逻辑，但当前 5 个主题包均未在 `ThemeBlocks` 中注册 `quote`/`pull-quote`/`paragraph` 键（只注册了 `blockquote`/`p`/`em`/`a` 等标签级键），故 root 的 `#555` 基线同样未被替换。

  **视觉后果实测**（Playwright 截图，`tech` 主题深色背景 `#161B22` 对照）：`quote-mark`/`dropcap` 装饰色 `#2D5A4E`（深墨绿）在深色背景上呈现为低对比度的灰绿色调，既不匹配 tech 主题品牌色 `#58A6FF`，视觉上也明显弱于 default 主题浅色背景下的呈现效果——不只是"品牌色不对"，而是叠加了实际可读性/视觉分量下降。

- **建议**: 新增 amendment 任务（owner=architect + 各主题包维护者）：① 把 `quote`/`pull-quote`/`paragraph` 三个 block 的 `quote-mark`/`dropcap`/`author`/`root` 涉及颜色与字体的声明从 `baseStyle`（L1）迁出；② 扩展 `packages/core/src/pipeline/inline-style.ts` 的 `getBlockSlotStyle()`，比照容器 `data-block` 路径补上 L2 主题 token 合并（`themeTokens[blockId]?.[variantId]?.[slot]`）；③ 5 个主题包的 `blocks/{quote,pull-quote,paragraph}.ts` 补注册对应 `variantId` 键下的颜色/字体覆盖（对齐 `content-elements-dropcap.png` 已给出的 5 主题色值）。本项不阻塞 T-168 AC-001~AC-005（各自的定位/边框/行高/前缀修正均已正确落地且不涉及此问题），但阻塞 AC-006"与样张对照一致"的完整达成，建议作为独立后续任务卡处理，不与 T-168 已完成的结构性修正混批。

### [R-002] LOW: quote-mark 装饰字符未锁定 font-family，视觉粗细/形态随消费环境字体波动

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: `large-quote-mark`/`pull-quote decorated` 的引号装饰 `<span data-block-slot="quote-mark">` 声明了 `font-size`/`color`/`opacity`/`line-height`/`display`/`vertical-align`/`margin-right`，但未声明 `font-family`；该 span 走 `data-block-slot` 路径，不继承容器 typography 下推的字体族（T-167 下推 cascade 仅施加于"容器内无 slot 子元素"，slot 装饰元素本身不在下推范围）。实际渲染中该字符退回消费环境默认字体栈渲染。裁剪对照 `block-variants-quote.png` 样张：样张中的引号字形呈现为较饱满的弧形/卷曲视觉（推测为 Penpot 画布默认字体渲染同一 ASCII 字符的效果），与常见无衬线系统字体下的细直线呈现观感有差异。spec `#§10.5`/`#§10.3` 文字本身未要求 `font-family`，故不构成对现有 spec 明文的违反，但构成与已 sign-off 样张的视觉观感差异，且该差异会随 WeChat 客户端在不同操作系统的默认字体（iOS PingFang SC / Android 各异 / Windows 微信客户端 Microsoft YaHei）表现不同权重。
- **建议**: 若需强化与样张的视觉贴合度，可在 ui-spec 补充明确的 `font-family` 声明（如复用 dropcap 的 heading 字体族）并同步实现；当前不作为阻塞项，仅供后续视觉打磨参考。

### [R-003] LOW: paragraph dropcap 变体的正文段落自身颜色未受 quote 场景同等约束（信息性观察，非缺陷）

- **category**: consistency
- **root_cause**: reviewer-calibration
- **描述**: `paragraph{.dropcap}` 变体 root 无 `baseStyle`，正文 `<p>` 颜色/排版完全由全局 tag token（或所在主题的 `p` 覆盖）决定，不像 `quote{.dropcap}` 那样有 root 层 `color:#555` 强制下推。经核对 `#§9.8` 与 `#§10.5` 文字，这是设计上刻意的差异（paragraph 首字下沉是"正文段落"的可选装饰，不应改变正文自身颜色语义；quote 场景才需要引用基线色下推），故本条仅作记录，不计入缺陷统计，供后续如有疑义时复核裁定依据。

## 三态判定

存在 1 项 HIGH（R-001）→ 按 COMMON-RULES §三态判定逻辑，结论为 **needs_revision**。R-002/R-003 为 LOW，不改变该结论。
