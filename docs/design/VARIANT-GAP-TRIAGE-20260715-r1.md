---
id: "variant-gap-triage-20260715-r1"
doc_type: design-review
author: ui-designer
status: approved
deps: ["walkthrough-variant-render-gap-20260714-r2"]
consumers: ["orchestrator", "architect", "task-decomp"]
---

# 变体渲染缺口簇 — 清单裁定（草案，待用户 sign-off）

本报告对 `walkthrough-variant-render-gap-20260714-r2` 清点出的 A 类 59 项 + B 类 37 项（共 96 项）逐项裁定处置，以 wechat-typeset 仓（`C:\Users\huanc\Work\GitRepo\wechat-typeset\src\core\variants\`，19 个 kind、145 个具名资产文件，每文件 `meta.name` / `meta.description` 承载明确视觉语义）为基准。裁定依据两处一手材料：wechat-typeset 各 kind 目录下逐文件 `meta` 语义扫描，以及本仓库 `packages/blocks/src/blocks/*.ts` 逐文件源码核实（含 zod 属性 schema、block 级/变体级 `baseStyle`、decorate 钩子）。

status=approved — 用户终审 sign-off 2026-07-15。**OQ-1 裁定：接受 PATCH 类目**（保留 83 = IMPORT 47 + PATCH 36 / 删注册 11 / 豁免 2；变体总数 144 > floor 120）。**architect ARCH 层裁定覆盖三项**（权威高于清单）：`audio.*`/`video.*` 6 变体 → blocked（块 DOM 契约未厘清，不计入 collect-list 必归零）；`highlight-block.gradient` → feasibility 立项（拆卡前核微信真机 `linear-gradient` 存活，不存活转 DELETE）；`video.autoplay` → DELETE。PATCH 落地按 merge 语义只写 delta（非 full-root）。

## 0. 处置类目说明（含需用户裁定的方法论问题）

任务书给出三选一处置：**保留并成建制导入** / **删注册** / **属性门控豁免**。逐项核实后发现，59+37 项中相当一部分（约三分之一）是**无装饰意图的简单版式/密度/对齐参数**（如 `heading.centered` 仅需 `text-align: center`、`paragraph.indented` 仅需 `text-indent: 2em`、`table.compact` 仅需收紧 padding），而非 wechat-typeset 资产库所专精的**承载具体设计意图的装饰手法**（如「双层朱字边框」「巨号编号」「聊天气泡」）。

对这批简单参数变体，两种处置都不理想：
- 强行从 wechat-typeset 挑一个装饰资产"对号入座"，会把变体名承诺的"简单"实现成"复杂"，制造新的名不符实；
- 一律删注册，会误删本身语义清晰、只是实现缺位的正当变体（如 `image.rounded` 就该是圆角图片，不需要一整套装饰资产）。

因此本裁定在三选一之外，为这批变体引入第四类处置 **PATCH（保留·轻量原生补丁）**：不导入 wechat-typeset 资产，只用变体名本身已言明的 1-3 条 CSS 声明实现（不发明新视觉手法，不违反"不为自造名从零设计"的原则——因为没有"设计"这一步，只是把变体名兑现为对应的现有 CSS/token 组合）。**是否接受此第四类处置是 §4 Open Question 1，需用户裁定**；若用户裁定不接受，则本报告标记 PATCH 的全部 36 项按"严格二选一"退回 **删注册**（更安全的默认，因保留即视为需强制导入的产品承诺）。

四类处置标记：
- **IMPORT**：从 wechat-typeset 挑选具体资产成建制导入（含跨 kind 借用整体 chrome 图案，标注为 IMPORT-lite，见各条说明）
- **PATCH**：待裁定的轻量原生 CSS 补丁（非 wechat-typeset 导入）
- **DELETE**：删注册
- **EXEMPT**：属性门控假阳性，或经核实为既有 ui-spec/机制文档化的既定行为，非真实缺口

## 1. 逐项裁定表 — A 类（59 项，丢失块级基线）

### table（4 项）— 源 kind：`table-card`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `table.striped` | IMPORT | `table-card/zebra-rows.ts`（斑马表：奇偶行底色+顶底 hairline，无垂直边框）—「striped」语义直接对应 | 单点：迁移 baseStyle + 斑马行 nth-child 等价的显式行样式（微信平台无 `:nth-child`，需按行索引显式赋色，属 render 逻辑改动） |
| `table.bordered` | IMPORT | `table-card/rule-grid.ts`（全 1px 边框，规格清单/数据表骨架）—「bordered」语义直接对应 | 单点：baseStyle 迁移 |
| `table.compact` | PATCH（待裁）| 无 wechat-typeset 对应资产（7 个 table-card 资产均非"密度"取向）；收紧 cell padding + 字号 -1px | 单点 CSS 参数 |
| `table.highlight-header` | IMPORT | `table-card/three-line-table.ts`（报刊 booktabs 三线：顶底 2px + header 后 1px，无垂直线）—以线型强调表头分界，语义最接近"高亮表头" | 单点：baseStyle 迁移 |

table 块本身无块级 `baseStyle`（`table.ts` 仅 4 个位置参数 + variants 数组），default 变体现状同样无根样式——超出本次 A/B 裁定范围，但建议随本批一并给 `table.default` 补最基础的 `border-collapse` 与 cell padding，否则 default 长期呈裸表格。

### quote（7 项）— 源 kind：`quote`（`large-quote-mark`←`oversized-mark`、`dropcap`←`magazine-dropcap` 已导入，不占用；以下从剩余 12 个未用资产中选取）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `quote.bordered` | IMPORT | `quote/double-frame.ts`（双层朱字边框+引文 italic Lora+朱色 byline）—「bordered」语义直接对应，双层边框比默认左边框视觉层次更丰富 | 跨文件：新增 baseStyle + byline 装饰逻辑（现有 `injectLeadingInlineNode` 可复用） |
| `quote.centered` | IMPORT | `quote/classic.ts`（大引号金句：浅底+装饰引号，居中大号）—「centered」+ 居中大号语义对应 | 跨文件：需 decorate 钩子注入装饰引号（可复用 `injectLeadingInlineNode`） |
| `quote.filled` | IMPORT | `quote/editorial-block.ts`（左 6px 实色条+浅底+大写字距 byline）—浅底填充对应「filled」 | 单点：baseStyle 迁移（byline 装饰可选，先落浅底+左色条） |
| `quote.minimal` | PATCH（待裁，[OQ-6]）| 无 wechat-typeset 对应（12 个未用资产均为承载具体设计意图的装饰手法，无一是"去装饰"取向）；若保留，语义应为"去除 `default` 左边框，仅留 padding/margin"（对应走查报告 r2 注："本意即无装饰"）| 单点 CSS（若裁定保留） |
| `quote.large` | DELETE | 与已导入的 `large-quote-mark` 语义重复（均为"引用文字放大"），不同 ID 承载同一视觉承诺构成用户侧混淆；建议直接删注册，用户需要「大字引用」时用 `large-quote-mark` | — |
| `quote.italic` | PATCH（待裁，[OQ-6]）| 无 wechat-typeset 对应资产以"斜体"为独立视觉签名（斜体多作为其他装饰手法的子元素，如 `double-frame` 的引文 italic 是整体设计的一部分，非可孤立抽取的"斜体变体"）；若保留，仅需 `font-style: italic`（非 font-family，不触碰 §1.2.5 字体族禁令）| 单点 CSS（若裁定保留） |
| `quote.card` | IMPORT | `quote/specimen-quote.ts`（标本引文：SPEC.NO 测量括弧+学名样 byline，卡片化标本呈现）—"标本卡"呈现方式对应「card」语义 | 跨文件：需 decorate 钩子构建测量括弧装饰 |

### card（4 项）— 无对应 wechat-typeset kind（generic 无插槽包装卡片，跨 kind 借用纯 chrome 图案）

`card` 块 `props schema` 为空（`z.object({}).strict()`），无内容插槽约定，是纯 CSS chrome 包装器——wechat-typeset 19 个 kind 均围绕特定内容结构设计（Q/A、byline、compare 双列等），无一是"任意 markdown body + 纯 chrome"的通用卡片。以下为跨 kind 借用**纯 chrome 图案**（仅取 root 级边框/阴影/背景处理，不借用对方的插槽结构），标记 IMPORT-lite：

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `card.elevated` | IMPORT-lite | `admonition/card-shadow.ts`（悬浮卡：白底+顶部色条+单层柔和阴影）—仅借用其 root chrome（阴影+顶色条），不借用 admonition 的 kind 语义（tip/warning/info/danger 着色） | 单点：root baseStyle 迁移，去除 admonition kind 专属着色逻辑 |
| `card.outlined` | IMPORT-lite | `admonition/sidenote-latex.ts`（细边框+小型大写标题，LaTeX 定理框语汇）—仅借用其细边框 root chrome | 单点：root baseStyle 迁移 |
| `card.horizontal` | DELETE（[OQ-7]）| 需要"图文左右并排"的媒体布局能力，`card` 现有 schema 无 image/media 属性字段承载——这不是装饰手法缺口，是需要新 props schema 的结构性功能，超出本次"变体视觉资产导入"范围 | — |
| `card.minimal` | PATCH（待裁，[OQ-6]）| 无对应资产；若保留，语义为"去除 border/background，仅留 padding" | 单点 CSS（若裁定保留） |

### steps（8 项）— 源 kind：`steps`（`card`←`step-card` 已导入，不占用）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `steps.horizontal` | IMPORT | `steps/ruler-row.ts`（顶部一根实线作主轴，h3 充当刻度标签，博物笔记风格）—实线主轴横贯的版式最贴近"横向步骤"直觉 | 跨文件：需重排 DOM 结构（当前 steps 各项纵向堆叠，横向需改变父级 display） |
| `steps.numbered` | IMPORT | `steps/seal-cjk.ts`（汉字印章步骤：作者以 h3 手写一/二/三，宋本批注风格）—以中文序数替代默认列表符号，作为区别于 `circle-numbered` 的"编号"取向 | 单点：baseStyle + 序数替换逻辑 |
| `steps.circle-numbered` | IMPORT | `steps/number-circle.ts`（编号圆圈步骤：h3 手写编号，标题加粗）—「circle-numbered」字面直接对应 | 单点：baseStyle 迁移 |
| `steps.timeline` | IMPORT | `steps/timeline-dot.ts`（时间轴步骤：左侧点线+主色小圆点）—「timeline」字面直接对应 | 跨文件：左侧点线连接线需 decorate 钩子生成 |
| `steps.arrow` | PATCH（待裁）| 6 个 steps 资产均无箭头图形语汇；若保留，用文本箭头符号 `→` 作步骤间分隔前缀，不构造 SVG/CSS 箭头图形 | 单点：decorate 钩子插入文本节点（若裁定保留） |
| `steps.minimal` | PATCH（待裁，[OQ-6]）| 无对应资产；若保留，语义为"去除默认列表符号，仅保留纯文本行" | 单点 CSS（若裁定保留） |
| `steps.filled` | PATCH（待裁）| 无独立资产命名"filled"；若保留，建议作为已导入 `card` 变体的参数变体（背景改实色 `var(--color-brand)` 替代 `surface-alt` + 边框），非独立资产导入 | 单点 CSS 参数（若裁定保留） |
| `steps.compact` | PATCH（待裁）| 同上，作为 `card` 变体的参数变体（收紧 padding/margin） | 单点 CSS 参数（若裁定保留） |

### compare（3 项）— 源 kind：`compare`（`ledger` 已导入，不占用）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `compare.highlight-right` | IMPORT | `compare/paired-shape.ts`（圆方几何对照：圆环描边 vs 实心方块，包豪斯风格）—两侧非对称视觉权重（描边 vs 实心）天然承载"突出一侧"语义，比单纯改色更有设计辨识度 | 跨文件：需按 slot（pros/cons）分别应用不同图形处理 |
| `compare.table-style` | IMPORT | `compare/measurement-table.ts`（测量数据对照：纵向双行 block，标签固定宽+数据跟排，数据并列感）—「table-style」的表格化并列感对应 | 单点：baseStyle 迁移 |
| `compare.compact` | IMPORT | `compare/stacked-row.ts`（上下堆叠对比：两行全宽，小屏可读性高）—专为紧凑/窄屏场景设计，与「compact」语义一致 | 单点：baseStyle 迁移（结构从两列变两行） |

### pull-quote（3 项）— 源 kind：`pull-quote`（`decorated` 为已实现真变体，见 B 类豁免项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `pull-quote.large` | IMPORT | `pull-quote/giant-mark.ts`（装饰巨号：巨号 SVG 引号+大字左对齐，人物特稿母本）—「large」大字左对齐语义对应 | 跨文件：需 SVG 装饰引号 + 左对齐排版调整 |
| `pull-quote.minimal` | IMPORT | `pull-quote/centered-rule.ts`（居中夹线：上下细线+居中 kicker，gallery placard 体）—12 个 pull-quote 资产中视觉负荷最轻的一个，符合"简约但仍是设计"的定位 | 单点：baseStyle 迁移 |
| `pull-quote.bordered` | IMPORT | `pull-quote/with-gloss.ts`（夹注式拉引：双行夹注+上下朱色细线）—上下线夹注对应「bordered」的边界感 | 跨文件：需夹注双行结构 |

### author-card（2 项）— 无对应 wechat-typeset kind

`author-card` 无内容插槽（schema 空），root 已有背景+圆角的基础卡片 chrome。wechat-typeset 无"作者简介卡"这一内容原型（其 byline 装饰均依附于 quote/pull-quote 正文，非独立卡片）。

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `author-card.centered` | PATCH（待裁）| 无对应资产；语义为 `text-align: center` | 单点 CSS（若裁定保留） |
| `author-card.minimal` | PATCH（待裁）| 无对应资产；语义为去除 `background-color`/`border-radius`，保留纯 padding | 单点 CSS（若裁定保留） |

### publication-skeleton（2 项）— 无对应 wechat-typeset kind，且疑似错位注册（[OQ-4]）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `publication-skeleton.magazine` | DELETE（[OQ-4]）| `publication-skeleton` 的 baseStyle（`max-width`/`line-height`/`margin: 0 auto`）是**整篇文章级排版参数**，不是单个内容块的装饰变体；wechat-typeset 171 个资产全部是"块级变体"，没有一个是"全文排版预设"，无从对应导入 | — |
| `publication-skeleton.minimal` | DELETE（[OQ-4]）| 同上 | — |

### kpi-card（2 项）— 跨 kind 借用（`compare` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `kpi-card.highlight` | IMPORT-lite | `compare/data-card.ts`（顶 3px 色条+大号数字，data-brief 签名）—仅借用其"大号数字+顶色条"chrome 图案（该资产本用于 compare 双列语境，但"大号数字强调"图案本身与 compare 结构无关，可独立借用） | 单点：root baseStyle 迁移 + 数字放大排版 |
| `kpi-card.compact` | PATCH（待裁）| 无对应资产；收紧 padding | 单点 CSS（若裁定保留） |

### qa（2 项）— 跨 kind 借用（`qa-block` kind，注意与 `dialogue` kind 区分：`qa` 块是问/答段落对，非说话人轮次对话）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `qa.bubble` | IMPORT-lite | `qa-block/seal-stamp.ts`（问答朱印：CJK 问/答朱印徽章，实心 vs 描边）—两枚形态不同的徽章是 8 个 qa-block 资产中最接近"气泡"视觉隐喻（独立圆形色块）的一个；字面"聊天气泡"（`dialogue/chat-bubbles.ts`）不适用，因 qa 结构无说话人轮次概念 | 跨文件：需问/答分别渲染不同徽章 |
| `qa.bold-q` | IMPORT | `qa-block/numbered-faq.ts`（Q.NN 序号+加粗设问+底线分隔+下方答复段）—"加粗设问"字面直接对应「bold-q」 | 单点：baseStyle + 问句加粗 |

### footnote（2 项）— 源 kind：`footnotes`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `footnote.numbered` | IMPORT | `footnotes/lined.ts`（逐条：一条一行+hanging indent，编号悬挂）—"编号悬挂"字面对应 | 单点：baseStyle 迁移 |
| `footnote.inline` | IMPORT | `footnotes/inline-flow.ts`（流式：同段流式排列+内滚动，长引用列表）—「inline」流式排列字面对应 | 单点：baseStyle 迁移 |

### tip-grid（2 项）— 无直接对应 kind（多项网格结构，非单一 chrome 内容原型）

`tip-grid` 渲染多个并列小项（table-cell 网格），wechat-typeset 每个资产渲染**一个**内容块，无"多项网格"原型。

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `tip-grid.two-column` | PATCH（待裁）| 无对应资产；2 列 table-cell 是布局基元（技术上与 `compare` 双列同构），非装饰手法，不构成"设计资产导入"对象 | 单点：table-cell 双列布局（复用 compare 已验证技术） |
| `tip-grid.card-style` | IMPORT-lite | `note/box-callout.ts`（边框补注：1px 全边框+textMuted 标题，明确块界）—借用为每个网格项的**单元格级**chrome（而非整个 root），每项独立描边成小卡片 | 跨文件：需按网格项循环应用 cell chrome |

### warning（2 项）— 跨 kind 借用（`admonition` kind），存在与 `callout`/`announcement` 的分类交叠（[OQ-2]）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `warning.banner` | IMPORT-lite | `admonition/slab-corner.ts`（顶部 6px 硬条+右上 accent 徽章方块+zero-radius，粗野板块）—强烈醒目感对应"横幅警告" | 单点：root baseStyle 迁移 |
| `warning.inline` | PATCH（待裁）| admonition 25 个资产均为块级 chrome（无一是 `display: inline` 的行内警示样式）；若保留，语义为去除卡片化处理，改为行内小号文字 + 图标前缀 | 单点 CSS（若裁定保留） |

### disclaimer（2 项）— 跨 kind 借用（`announcement` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `disclaimer.bordered` | IMPORT | `announcement/mono-disclaimer.ts`（免责声明：全边框无填充+uppercase 宽字距标题，法律气质）—命名与内容语义均直接对应"免责声明" | 单点：baseStyle 迁移 |
| `disclaimer.compact` | PATCH（待裁）| 收紧 padding/字号，作为 `mono-disclaimer` 导入后的参数变体 | 单点 CSS（若裁定保留，建议在 IMPORT 落地后再定） |

### reading-time（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `reading-time.badge` | DELETE | `reading-time` 的 `default` 本身已是徽章形态（`display: inline-block` + `border-radius: 12px` + 底色）——`badge` 与 `default` 视觉承诺完全重合，属命名冗余，非独立变体 | — |
| `reading-time.inline` | PATCH（待裁）| 去除 badge 化的背景/圆角/padding，改为跟随正文的纯文字，与 `default` 形成真实差异 | 单点 CSS（若裁定保留） |

### citation（2 项）— 跨 kind 借用（`footnotes` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `citation.footnote-style` | IMPORT | `footnotes/dense-academic.ts`（论文 bibliography：2px 章节杆+2.4em 深 hanging+11px）—「footnote-style」学术引用格式直接对应 | 单点：baseStyle 迁移 |
| `citation.inline-link` | PATCH（待裁）| 去除左边框，改为跟随正文、下划线提示链接感的行内样式 | 单点 CSS（若裁定保留） |

### definition-list（2 项）— 同 tip-grid，多项网格结构

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `definition-list.two-column` | PATCH（待裁）| 同 `tip-grid.two-column`，2 列 table-cell 布局基元 | 单点（若裁定保留） |
| `definition-list.card-style` | IMPORT-lite | `note/box-callout.ts` 单元格级 chrome（同 `tip-grid.card-style` 手法，每组 term/definition 独立描边） | 跨文件：按条目循环应用 cell chrome |

### advert-card（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `advert-card.horizontal` | DELETE（[OQ-7]）| 同 `card.horizontal`，需要图文左右并排的媒体布局能力，现有 schema 无媒体字段，属结构性功能缺口而非装饰手法缺口 | — |
| `advert-card.minimal` | PATCH（待裁）| 去除 border/background，保留 padding | 单点 CSS（若裁定保留） |

### related-cards（2 项）— 跨 kind 借用（`recommend` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `related-cards.compact` | PATCH（待裁）| 收紧 padding/margin | 单点 CSS（若裁定保留） |
| `related-cards.grid` | IMPORT-lite | `recommend/card-list.ts`（推荐列表：粗体标题+bullet 链接列表）逐项 chrome + table-cell 双列网格布局基元（同 tip-grid 手法组合） | 跨文件：需网格布局 + 逐项 chrome |

### social-cta（2 项）— 跨 kind 借用（`announcement` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `social-cta.icon-left` | IMPORT-lite | `announcement/ai-notice.ts`（pill 形态+芯片图标+灰字告知）—19 个 kind 中少数带图标左置版式的资产，借用其"图标+文字"pill 布局技术 | 跨文件：需图标资源 + pill 布局 |
| `social-cta.full-width` | PATCH（待裁）| `default` 已有 `width: 100%`；若保留，语义须与 default 形成真实差异——去除 `border-radius`/`border`，做到边到边贴边（bleed）观感，而非单纯宽度 | 单点 CSS（若裁定保留） |

### subscribe-cta（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `subscribe-cta.centered` | DELETE | `default` 的 root baseStyle 已含 `text-align: center`——「centered」与 `default` 视觉承诺完全重合，命名冗余 | — |
| `subscribe-cta.banner` | IMPORT-lite | `footer-cta/button-led.ts`（居中标题+主色胶囊按钮，默认款）—CTA 按钮 chrome 与"订阅引导"域临近，借用其按钮化处理 | 跨文件：需按钮元素生成 |

## 2. 逐项裁定表 — B 类（37 项，含属性门控假阳性）

**属性门控假阳性复核结论（先于逐项裁定）**：走查报告 r2 要求复核 `qrcode`/`video`/`audio`/`miniprogram-card` 族是否同属 `pull-quote.decorated` 式假阳性（测试未传媒体属性所致 no-op）。经核实这四个块的 zod schema 均为 **`z.object({}).strict()`——不接受任何属性**（`qrcode.ts`/`video.ts`/`audio.ts`/`miniprogram-card.ts` 源码确认），与 `pull-quote` 的 `z.object({ author: z.string().optional() })` 结构性不同：`pull-quote.decorated` 是"传了属性才生效"的真实实现被测试漏传属性命中；这四族没有属性可传，是**真实的空实现（无 baseStyle、无 decorate 钩子）**，不是假阳性。此结论覆盖走查报告 r2 的初步猜测，仅 `pull-quote.decorated` 一项成立豁免。

### heading（2 项）— 跨 kind 借用（`section-title` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `heading.underline` | IMPORT | `section-title/bordered.ts`（2px 主色底线+角饰，默认款）—「underline」字面直接对应 | 单点：baseStyle 迁移 |
| `heading.centered` | PATCH（待裁）| 无对应资产；语义为 `text-align: center` | 单点 CSS（若裁定保留） |

### paragraph（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `paragraph.indented` | PATCH（待裁）| 中文排版惯例"首行缩进"（`text-indent: 2em`），是标准排版参数非装饰手法，无 wechat-typeset 对应资产 | 单点 CSS（若裁定保留） |
| `paragraph.spaced` | PATCH（待裁）| `line-height` 加大（如 1.6→2.0），同上性质 | 单点 CSS（若裁定保留） |

### list（3 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `list.bullet` | PATCH（待裁）| 自定义圆点 marker 颜色/形态，非 wechat-typeset 资产范畴 | 单点 CSS（若裁定保留） |
| `list.numbered` | PATCH（待裁）| 确保有序列表编号样式生效，同上 | 单点 CSS（若裁定保留） |
| `list.checklist` | PATCH（待裁）| 项前缀 `☐`/`☑` unicode 字符，纯文本符号级实现，非装饰资产 | 单点：decorate 钩子插入符号（若裁定保留） |

### code-block（2 项）— 跨 kind 借用（`codeBlock` kind）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `code-block.minimal` | IMPORT | `codeBlock/bare.ts`（无外框，纯 pre/code）—「minimal」字面直接对应 | 单点：baseStyle 迁移 |
| `code-block.light` | PATCH（待裁）| "亮/暗"是语法高亮**配色主题**维度，不是 5 个 codeBlock chrome 资产（bare/header-bar/inline-card/line-numbers/terminal-frame）承载的"外框结构"维度——两者正交；若保留，应在 `bare.ts` chrome 基础上替换为浅色调色板（背景/文字/语法高亮 token 全部切换），不是从 wechat-typeset 挑一个新 chrome | 跨文件：需浅色语法高亮 token 集（若裁定保留，且应与主题色板机制对齐而非孤立硬编码） |

### divider（3 项）— 已有 ui-spec §10.2 权威规格，属纯实现缺口

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `divider.thick` | PATCH（按 spec 实现）| ui-spec §10.2 已明确："`default`/`thick`/`dotted`/`dashed`……均为 CSS `border-style` 原生实现，不涉及本次视觉升级"——即产品侧已裁定这三者是简单边框粗细/线型参数，**非**待导入的装饰资产；缺口纯粹是 `divider.ts` 从未把这句规格落成 `baseStyle`（增大 `border-width`） | 单点：按 ui-spec §10.2 原文补 baseStyle |
| `divider.dotted` | PATCH（按 spec 实现）| 同上，`border-style: dotted` | 单点 |
| `divider.dashed` | PATCH（按 spec 实现）| 同上，`border-style: dashed` | 单点 |

此三项与其余 PATCH 项性质不同——**已有明文 ui-spec 权威背书**，不占用 [OQ-1] 的裁定范围，无论 OQ-1 结论如何都应直接进入实现，不适用"若用户不接受 PATCH 则退回删注册"的兜底规则。

### image（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `image.rounded` | PATCH（待裁）| `border-radius`，单一 CSS 属性，变体名已完整表达实现 | 单点 CSS（若裁定保留） |
| `image.full-width` | PATCH（待裁）| `width: 100%`，同上 | 单点 CSS（若裁定保留） |

### image-caption（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `image-caption.overlay` | DELETE（[OQ-9]）| 需图片上叠加文字说明，依赖 `position: absolute`——ui-spec §9.1 通则"慎用 absolute"；171 个 wechat-typeset 资产**无一例**在图片上做文字叠加（该库同样服务于微信平台，其规避本身即信号）。可行性存疑，建议先删注册，如产品仍需要则走独立 feasibility 调研 | — |
| `image-caption.side` | IMPORT-lite | 借用 `gallery/duo.ts` 的 table-cell 双列技术（图片 cell + 文字说明 cell 并排），非"叠加"而是"并排"，规避 absolute 定位风险 | 跨文件：需 table-cell 双列结构 |

### gallery（1 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `gallery.grid` | EXEMPT | 经核实非真实缺口。ui-spec §10.9 明文："`grid`/`masonry`/`carousel` 三个既有变体 ID 保留……但其视觉实现按 `duo`……或 `triptych`……的 table 布局渲染"——`gallery.ts` 的 decorate 钩子对**任意**已授权变体（含 `default`）统一按 `GALLERY_COLUMNS_BY_VARIANT` 折算实际渲染列数，`grid`→2 列→折算为 `duo` 同构渲染，与 `default` 视觉一致是该 fallback 机制的直接推论，非缺陷。与 `default` byte-identical 恰恰证明该 fallback 按 spec 生效 | — |

### pull-quote（1 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `pull-quote.decorated` | EXEMPT | 已核实为属性门控假阳性：`baseStyle` 完整、decorate 钩子完整，仅在 `author` 属性缺席时因未注入装饰节点而与 default 视觉一致；传 `author` 属性即正常生效。走查报告 r2 已定性，本报告复核代码确认无误 | — |

### highlight-block（4 项）— 源 kind：`highlight`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `highlight-block.underline` | IMPORT | `highlight/dotted-underline.ts`（整段底部点状线+中性底色，编辑部轻强调）—「underline」字面直接对应 | 单点：baseStyle 迁移 |
| `highlight-block.bold` | IMPORT | `highlight/tracked-emphasis.ts`（整段 letter-spacing 加大+bold+textMuted，编辑部印刷感）—描述含"bold"字面对应 | 单点：baseStyle 迁移 |
| `highlight-block.background` | IMPORT | `highlight/wash-ground.ts`（整段米黄色块底色+略大行高，博物笔记观察段）—「background」色块底对应 | 单点：baseStyle 迁移 |
| `highlight-block.gradient` | DELETE（[OQ-8]）| 9 个 highlight 资产**无一例**使用 CSS gradient；171 个资产全库同样无 gradient 先例。该库同为微信平台设计，其系统性回避是强信号——`background: linear-gradient(...)` 在微信粘贴过滤下的兼容性存疑，需 architect 先确认平台兼容性再论是否值得单独设计，本次先删注册 | — |

### dialog（1 项）— 源 kind：`dialogue`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `dialog.interview` | IMPORT | `dialogue/interview-column.ts`（杂志访谈栏：左列大写姓名+右列长答+hairline 沟槽）—「interview」字面直接对应 | 跨文件：左列姓名/右列内容双栏结构 |

### timeline（2 项）— 与 `steps` 块概念交叠（[OQ-3]）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `timeline.horizontal` | IMPORT-lite | `steps/ruler-row.ts`（同 `steps.horizontal` 复用同一资产手法）—两个块概念本身交叠（见 [OQ-3]），此处沿用一致的横向主轴处理 | 跨文件：同 steps.horizontal |
| `timeline.compact` | PATCH（待裁）| 收紧默认纵向时间线的间距/padding | 单点 CSS（若裁定保留） |

### qrcode（2 项）— 源 kind：`qrcode`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `qrcode.card` | IMPORT | `qrcode/follow-card.ts`（订阅二维码卡：左 QR+右 kicker/标题/说明三行）—「card」字面直接对应 | 单点：baseStyle 迁移 |
| `qrcode.with-logo` | DELETE（[OQ-5]）| "Logo 嵌入二维码中心"是 **QR 码生成层**能力（改变二维码位图本身），不是 block variant 的 CSS chrome 层能力——`defineBlock` variant 体系管辖渲染样式，管不到二维码图像生成逻辑。命名与实现层错位，非本次裁定范围内可解的缺口，建议删注册；如产品仍需要，应作为 QR 生成服务的 attrs schema 功能立项，非变体资产导入 | — |

### video（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `video.with-caption` | IMPORT-lite | 借用 `gallery` 的 caption slot 处理技术（`GALLERY_IMAGE_SLOT_STYLE.caption`：居中小字+`--color-text-muted`），视频下方渲染同构说明文字 | 跨文件：需 caption 插槽 |
| `video.autoplay` | DELETE（[OQ-5]/[OQ-10]）| "自动播放"是**播放行为**（HTML5 `autoplay` 属性/JS 交互），不是视觉 chrome——与 ui-spec §10.9 排除 gallery 轮播的既有先例同构："瀑布流/轮播依赖 JS 交互……与「产物是静态 inline-styled HTML」的产品定位冲突"。同一冲突适用于 autoplay，建议删注册 | — |

### audio（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `audio.full` | IMPORT-lite | 借用 `qrcode/qr-stack.ts`（垂直堆叠二维码：上 QR+下 kicker/标题/说明）的纵向信息卡技术，改造为"播放器占位+标题/时长元信息"纵向卡片 | 跨文件：需元信息插槽（[OQ-10] 待确认 audio 块实际 DOM 输出契约） |
| `audio.mini` | PATCH（待裁）| 单行紧凑播放器卡片，收紧 padding | 单点 CSS（若裁定保留，同待 [OQ-10] 确认） |

### miniprogram-card（2 项）

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `miniprogram-card.large` | IMPORT-lite | 借用 `qrcode/follow-card.ts`（左图标+右三行信息）的"图标+信息"卡片技术，适配小程序图标+标题+描述 | 跨文件：需信息插槽 |
| `miniprogram-card.compact` | PATCH（待裁）| 收紧 padding，作为 large 导入落地后的参数变体 | 单点 CSS（若裁定保留） |

### footer-cta（2 项）— 源 kind：`footer-cta`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `footer-cta.centered` | IMPORT | `footer-cta/button-led.ts`（居中标题+主色胶囊按钮，默认款）—`footer-cta` 块本身无块级 baseStyle（默认即裸奔，属 C 类），此项是从零建立居中按钮 chrome 的合理落点 | 跨文件：需按钮元素生成 |
| `footer-cta.full-width` | IMPORT | `footer-cta/triptych-actions.ts`（赞同/收藏/转发三栏：左右描边+中实色）—三栏满宽动作条对应「full-width」 | 跨文件：需三栏动作元素 |

### recommendation（2 项）— 源 kind：`recommend`

| 变体名 | 处置 | 映射 / 理由 | 复杂度 |
|---|---|---|---|
| `recommendation.card` | IMPORT | `recommend/card-list.ts`（推荐列表：粗体标题+bullet 链接列表）—2 个 recommend 资产中相对更具"卡片感"（成组呈现）的一个 | 单点：baseStyle 迁移 |
| `recommendation.compact` | PATCH（待裁）| 收紧间距，作为 card 导入落地后的参数变体 | 单点 CSS（若裁定保留） |

## 3. 裁定摘要统计

96 项（A 类 59 + B 类 37）逐项裁定分布：

| 处置类目 | 数量 | 说明 |
|---|---|---|
| IMPORT（含 IMPORT-lite 跨 kind 借用，共 47 项，其中 IMPORT 直接映射 32 / IMPORT-lite 跨 kind 借用 15）| 47 | 从 wechat-typeset 具体资产成建制导入（或借用其 root chrome 图案），映射关系见 §1/§2 各表 |
| PATCH（待 [OQ-1] 裁定，含 3 项已有 ui-spec §10.2 权威背书、不受 [OQ-1] 结论影响的 divider 项）| 36 | 简单版式/密度/对齐参数，非装饰资产范畴；[OQ-1] 若裁定不接受此类目，其中 33 项（36 减去 3 项 divider）退回 DELETE |
| DELETE | 11 | 命名冗余（与 default 或已导入变体重复）/结构性功能缺口（超出装饰资产范畴）/层错位（QR 生成、播放行为）/无先例风险信号（gradient）/page 级参数错误注册为 block 变体 |
| EXEMPT | 2 | `pull-quote.decorated`（属性门控假阳性，复核确认）、`gallery.grid`（ui-spec §10.9 已文档化的既定 fallback，非缺口）|
| **合计** | **96** | — |

对齐任务书要求的三分类口径（若 [OQ-1] 裁定接受 PATCH 视为"保留"的一种）：**保留 83（IMPORT 47 + PATCH 36）/ 删注册 11 / 豁免 2**；若 [OQ-1] 裁定不接受 PATCH（严格二选一），则：**保留 50（IMPORT 47 + divider 已获 ui-spec 背书的 3 项）/ 删注册 44（DELETE 11 + PATCH 退回 33）/ 豁免 2**。

## 4. Open Questions（需用户 sign-off）

### [OQ-1]（方法论，影响面最大）PATCH 类目是否成立

任务书给出的三选一（保留成建制导入 / 删注册 / 属性门控豁免）未预留"轻量原生 CSS 补丁"选项。本报告为 36 项简单版式/密度/对齐参数变体（如 `heading.centered`、`paragraph.indented`、`image.rounded`）引入 PATCH 处置，理由见 §0。

- **选项 A（推荐）**：接受 PATCH 作为"保留"的一种实现路径——这类变体名本身已完整定义实现（1-3 条 CSS 声明），强行导入 wechat-typeset 装饰资产反而制造新的名实不符。
- **选项 B**：不接受，严格二选一，36 项中不属于"已获 ui-spec 背书"的 33 项一律退回 DELETE（§3 已给出该口径下的统计）。

### [OQ-2] `warning` 块与 `callout`/`announcement` 的分类交叠

`callout`（ui-spec §10.1 已收敛为 tip/warning/info/danger 四态，源自 `admonition/accent-bar.ts`）、`warning`（本次裁定对象，独立 block）、`announcement`（含已导入的 `danger-bar`）三个 block 都承载"让文字带警示/提示感"的产品意图，命名与视觉语义存在交叠。本报告为完成本次裁定范围内的 `warning.banner`/`warning.inline` 仍给出了处置（IMPORT-lite/PATCH），但建议 architect + ui-designer 另行评估：`warning` 块是否应在后续版本并入 `callout`（保留一个权威提示框概念），本报告的 `warning` 裁定视为过渡期止血，非长期结构建议。

### [OQ-3] `timeline` 块与 `steps.timeline`/`steps.horizontal` 的分类交叠

两个 block 均围绕"时间/顺序排列的项目列表"语义，`timeline.horizontal` 与 `steps.horizontal` 在本报告中被裁定复用同一 wechat-typeset 资产（`steps/ruler-row.ts`），视觉上会趋同。是否应合并为一个 block 或明确划分职责边界（如 `timeline` 专注日期锚点、`steps` 专注操作步骤），建议 architect 后续评估，本次仍按现有 block 边界分别裁定。

### [OQ-4] `publication-skeleton.magazine`/`.minimal` 是否应整体移出 block-variant 注册表

这两项管辖的是**全文排版参数**（`max-width`/`line-height`/页面级 `margin`），不是单个内容块的装饰变体，与 wechat-typeset "块级变体"的资产口径不在同一层次，无法从中导入。本报告建议删注册；若产品仍需要"杂志排版模式"/"简洁排版模式"的整篇切换能力，应作为独立的文档级设置项（非 `defineBlock` variant）重新立项，不在本次裁定范围内解决。

### [OQ-5] `qrcode.with-logo` / `video.autoplay` 的层错位问题

这两项要求的能力分属 QR 码生成逻辑与视频播放行为，不是 block variant 管辖的 CSS 渲染层。本报告建议删注册。若产品仍需要这两项能力，需求应重新表述为对应子系统（图床/QR 生成服务、播放器交互层）的功能需求，而非变体资产缺口——继续放在变体注册表里只会重复触发本类"渲染缺口"误报。

### [OQ-6] "minimal"/"简约" 系变体的产品语义

`quote.minimal`、`quote.italic`、`card.minimal`、`steps.minimal` 等多个 `minimal` 或轻量取向的变体，wechat-typeset 全库无一对应资产（该库的产品定位就是"提供有辨识度的装饰手法"，天然不覆盖"故意不装饰"的取向）。需要用户明确：**"minimal"是否是一个值得保留的独立产品承诺**（即"提供一个刻意克制的选项，与 default 及其他装饰变体并列"），还是这类变体普遍属于"看似需求实则空占位"，应随本次裁定批量删除？本报告默认按"值得保留"处理（归入 PATCH），但请用户确认这一默认判断。

### [OQ-7] `card.horizontal` / `advert-card.horizontal` 的功能缺口性质

两项都要求"图文左右并排"的媒体布局，现有 block schema 均无图片/媒体属性字段承载，属于需要新增 props schema 的结构性功能，超出"变体视觉资产导入"的范围。建议本次删注册，如产品仍需要该布局能力，应作为独立功能需求重新提交（含 props schema 设计），不适合在变体清单裁定中顺带解决。

### [OQ-8] `highlight-block.gradient` 的平台兼容性风险需 architect 确认

171 个 wechat-typeset 资产全库无一使用 CSS gradient，本报告据此推断为已知的微信粘贴过滤兼容性风险规避（该库同为微信平台设计），建议 architect 核实 `background: linear-gradient(...)` inline style 在微信编辑器粘贴过滤下的实际行为后再定夺——若证实不兼容，删注册结论确定；若证实兼容，可重新评估是否值得单独设计（因无先例可导入，仍需从零设计，与"不为自造名从零设计"的裁定原则冲突，即便平台兼容也可能仍应删）。

### [OQ-9] `image-caption.overlay` 的可行性需独立评估

同样基于"171 资产全库无先例"的风险信号，加上 ui-spec §9.1 通则"慎用 absolute"的既有警示，建议本次删注册。如产品认为图片叠加文字说明是刚需，应作为独立 feasibility 调研立项（可能需要探索 `background-image` + 文字层的替代实现路径，而非 `position: absolute`）。

### [OQ-10] `audio`/`video` 块的实际 DOM 输出契约需 architect 确认

本报告为 `audio.mini`/`audio.full`/`video.with-caption` 给出了处置，但建立在"这些块渲染真实可控的 HTML5 媒体标签或等效卡片结构"的假设上。微信公众号平台对音视频的处理通常经由其自有的卡片化嵌入机制（而非原始 `<audio>`/`<video>` 标签在粘贴过滤后原样保留），如果 `audio`/`video` 块的实际渲染契约是"占位卡片 + 微信侧异步替换"，则本报告给出的 chrome 级变体裁定需要按该实际契约重新评估（可能所有可裁定的视觉自由度都局限在占位卡片本身，播放器"mini/full"尺寸概念可能根本不成立）。建议 architect 在 task-decomp 拆卡前先核实这两个块当前的渲染实现路径。

## 5. 交叉发现（非本次裁定范围，供 architect / orchestrator 参考立项）

以下发现在本次逐项裁定过程中浮现，均超出"A/B 类清单裁定"的任务边界，不在本报告中给出处置，仅记录供后续立项参考：

1. **`table`/`gallery`/`footer-cta` 等多个 block 的 `default` 变体本身无块级 `baseStyle`**（walkthrough r2 C 类清单已列出 16 项，含此三者）。本次裁定聚焦 A/B 类"具名变体名不符实"问题，未处理 C 类"default 裸奔"问题——但部分裁定方案（如 `footer-cta.centered`/`footer-cta.full-width` 均需从零建立 chrome）客观上会让 `default` 与具名变体的视觉差距进一步拉大，建议随本批一并评估是否给这些 block 的 `default` 补最基础的 baseStyle。
2. **PATCH 类目一旦落地，需要一处"轻量变体清单"的显式登记**，避免其与真正的"名不符实"问题在未来的渲染管线全量清点中被再次一并误判——建议 architect 在机制裁定（走查报告 r2 处置建议 2）中一并考虑：具名变体如果只声明极少量 CSS 属性（如仅 1-2 条），是否应有独立于"完整设计资产导入"的注册标记，供未来 no-op 检测守卫区分对待。
3. **`code-block.light` 暴露的"配色主题"维度与"chrome 结构"维度正交问题**，可能不止 code-block 一处——如果项目后续要支持多主题下的语法高亮配色，这属于主题 token 体系的扩展，不是单个 block 的变体资产问题，建议纳入主题系统的后续规划而非本次变体裁定的收尾。
