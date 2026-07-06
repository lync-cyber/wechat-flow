---
id: "ui-spec-wechat-flow-content-elements"
version: "0.1.0"
doc_type: ui-spec
author: ui-designer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules"]
consumers: [tech-lead, developer]
volume: content-elements
volume_type: theme
split_from: "ui-spec-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 9. Markdown 基础元素排版规格"
---
# UI Specification 分卷 — Markdown 基础元素排版规格: wechat-flow

[NAV]
- §9 Markdown 基础元素排版规格 → §9.1 微信平台硬约束通则, §9.2 table, §9.3 blockquote, §9.4 strong 字重梯度, §9.5 代码块, §9.6 列表 marker, §9.7 heading accent, §9.8 首字下沉
[/NAV]

<!-- 权威源（design_tool=penpot 时）：本卷规格是渲染内容（Block/markdown 元素视觉），非编辑器 chrome；验收走 render-verify（渲染实测），不要求逐条 Penpot 帧对照。 -->

## 9. Markdown 基础元素排版规格

本卷为 5 套内置主题（default 简约通用 / business 商务 / literary 文学 / magazine 杂志 / tech 科技）的 markdown 基础元素（table、blockquote、strong、code、list、heading、首字段）补充排版规格。所有色值标注对应主题包 `packages/themes/{theme}/src/tokens.ts` 的现行 token 名与实值；新增 token 在 ARCH E-002 open record 范围内（非破坏性追加）。

### 9.1 微信平台硬约束通则

所有本卷描述的视觉手法须满足以下平台约束，任何变体设计违反本通则视为不可交付：

| 约束 | 说明 |
|------|------|
| 禁用伪元素 | `::before` / `::after` 生成的内容与样式在微信公众号编辑器粘贴过滤中被剥离；任何依赖伪元素承载视觉信息（图标、序号徽章、装饰符号）的方案不可用，必须改用真实 DOM 节点（如 inline SVG、真实文本字符） |
| 禁用 `float` | 浮动定位在粘贴后行为不可预测（微信编辑器会重排文档流）；首字下沉等依赖 `float` 的经典 CSS 技法一律禁用，须用替代方案（见 §9.8） |
| 慎用 `position: absolute` | 绝对定位脱离文档流，在粘贴后容器尺寸丢失时表现异常；仅在明确不依赖父容器尺寸的场景（如图注角标）谨慎使用，默认避免 |
| Flex / Grid 不可依赖 | `display: flex` 与 `display: grid` 在微信编辑器粘贴过滤中会被降级或丢失布局语义；多列布局须使用 `display: table` / `table-cell` 作为主要实现，不依赖 flex/grid 生效 |
| 全部样式 inline | 所有 CSS 声明须以 `style` 属性内联到元素上（对应 ARCH M-002 stage 5 inline-style 合成），不依赖外部样式表或 `<style>` 标签（`<style>` 标签本身会被粘贴过滤剥离） |
| SVG inline 可用 | `<svg>` 内联进 HTML 是微信编辑器兼容的视觉扩展手段（已验证可行），装饰性图形（分隔线波浪/圆点/花饰）优先用 inline SVG 实现而非依赖 CSS 伪元素或背景图 |

### 9.2 表格（table / th / td）

表格是当前 5 主题完全缺失的视觉规格——现状渲染为浏览器默认边框样式，无主题识别度。统一基线：

- `table`: `border-collapse: collapse`，`width: 100%`
- `th` / `td`: `padding: 8px 12px`（紧凑型主题可收至 `6px 10px`，见 tech 主题）

各主题分化：

#### default（简约通用）

- `th`: 浅底表头，背景 `--color-surface-alt`（`#F3F0EB`），文字 `--color-text-primary`（`#1C1917`），字重 `600`，`border: 1px solid --color-border`（`#D6D3CE`）
- `td`: `border: 1px solid --color-border`（四边完整边框，中性通用风格），文字 `--color-text-primary`
- 不使用斑马纹——default 定位「简约通用」，完整边框已提供足够的行列辨识度，斑马纹会引入额外视觉噪音

#### business（商务）

- `th`: 暗表头反白，背景 `--color-brand`（`#1A4F8A`），文字 `--color-text-inverse`（`#FFFFFF`），字重 `700`，无边框（`border: none`）——深底与四周边框叠加会显得笨重
- `td`: 仅横向 hairline，`border: none`，`border-bottom: 1px solid --color-border`（`#D0D9E4`），无竖线（账本感，横向分隔即可辨识行）
- 使用斑马纹：偶数行背景 `--color-surface-alt`（`#EEF2F7`），强化数据行的可扫描性——商务场景常呈现较长数据表，斑马纹显著提升逐行阅读效率

#### literary（文学）

- `th`: 透明表头（背景透明，不反白），文字 `--color-text-secondary`（`#5A4228`），字重 `500`，字距 `0.5px`，仅 `border-bottom: 1px solid --color-border-strong`（`#B8A882`）——呼应古籍「栏目小字」行款，无框无底色
- `td`: 无竖线无外框，仅 `border-bottom: 1px solid --color-border`（`#DDD4C0`），`vertical-align: top`
- 不使用斑马纹——文学主题的克制美学不引入行间背景色差，留白本身即是节奏

#### magazine（杂志）

- `th`: 透明表头，文字 `--color-text-primary`（`#1A1208`），字重 `700`，仅 `border-bottom: 2px solid --color-brand`（`#D4521A`，杂志主题惯用的粗分隔线语言，呼应 heading accent 手法）
- `td`: 仅 `border-bottom: 1px solid --color-border`（`#E8D8C4`），无竖线
- 不使用斑马纹——保持杂志版式的留白节奏

#### tech（科技）

- `th`: 浅蓝灰表头，背景 `--color-surface-alt`（`#21262D`，暗色主题下的次级表面色），文字 `--color-text-primary`（`#E6EDF3`），字重 `600`，`border: 1px solid --color-border`（`#30363D`）
- `td`: `border: 1px solid --color-border`，紧凑 padding `6px 10px`（tech 主题定位「教程 / How-to」，表格常用于参数速查，紧凑排布提升信息密度）
- 使用斑马纹：偶数行背景 `--color-background`（`#0F1117`，比 surface 更深一档制造条纹）——教程场景的参数表/命令速查表用斑马纹提升逐行辨识

### 9.3 引用块（blockquote）差异化

当前 5 主题的 blockquote 视觉几乎雷同（均为左侧色条 + 浅底），本节按主题气质拉开差异：

#### default（简约通用，现状微调）

- `border-left: 4px solid --color-quote-border`（`#2D5A4E`）
- `background-color: --color-quote-bg`（`#F3F0EB`）
- `padding: --spacing-blockquote-v --spacing-blockquote-h`（`10px 16px`）
- 保留斜体正常使用（default 无中文斜体发虚顾虑场景限制，UI 语境非古籍语境）

#### business（商务）

- 双侧 1px 细线，无底色：`border-left: 1px solid --color-brand`（`#1A4F8A`），`border-right: 1px solid --color-brand`，`background-color: transparent`
- `padding: 8px 20px`
- 文字色 `--color-text-secondary`（`#2D4057`）
- `column-rule` 式的双竖线是研究报告/内参的高级感语言，避免大面积底色的「便签感」

#### literary（文学）

- 左竖条古籍感：`border-left: 1px solid --color-brand`（`#7B4F2E`），无右边框，无底色
- `padding: --spacing-blockquote-v --spacing-blockquote-h`（`12px 20px`）
- **去斜体**：不使用 `font-style: italic`——中文斜体渲染发虚、损失可读性，改用色彩区分：文字色 `--color-text-secondary`（`#5A4228`，比正文 `--color-text-primary` 浅一档）+ 字距 `1.2px`（比正文字距略宽，制造「引文腔调」的视觉节奏，替代斜体的强调功能）

#### magazine（杂志）

- 大字拉引感：`font-size` 相对正文放大至 `1.15em`，`border-left: 3px solid --color-brand`（`#D4521A`）
- `padding: 12px 20px`
- 字重 `500`（比正文 `400` 略重，配合放大字号制造「杂志摘引」的视觉冲击）

#### tech（科技）

- 简洁竖条：`border-left: 3px solid --color-brand`（`#58A6FF`），无底色（深色主题下额外底色易与 `bgSoft` 混淆）
- `padding: 8px 16px`
- 文字色 `--color-text-secondary`（`#8B949E`）

### 9.4 `strong` 字重梯度

不全部使用 `700`——按主题气质分化字重，为「强调」与「重要」之间留出层次：

| 主题 | `strong` 字重 | 依据 |
|------|--------------|------|
| default | `600` | 简约通用定位不需要最强对比，`600` 已提供清晰强调而不过分抢眼 |
| business | `700` | 商务语境的强调需要明确的视觉权重（数据结论、关键术语） |
| literary | `500` | 文学主题字重梯度最克制——全文重字重会破坏散文的阅读节奏，`500` 是能被辨认的最小强调阈 |
| magazine | `700` | 杂志排版惯用强对比字重制造视觉焦点 |
| tech | `600` | 深底场景下 `700` 会产生光晕/发虚感（深色文字在暗底上过粗易糊字），`600` 是深底可读性与强调力度的平衡点 |

### 9.5 代码块（pre / code）主题感知

区分 `code-block` Block（对应 `<pre>`）与 inline `<code>` 的底色：inline code 沿用现有 `--color-code-bg` / `--color-code-text`；`pre` 新增专属 token `--color-code-block-bg`（ARCH E-002 open record 内非破坏性追加），使代码块可独立于 inline code 呈现暗底/亮底效果。

| 主题 | `pre` 底色策略 | Token | 值 | 字体 |
|------|---------------|-------|-----|------|
| default | 亮底 | `--color-code-block-bg`（新增）| `#F0EDE8`（沿用现有 `--color-code-bg`，与 inline code 一致） | `--font-family-mono` |
| business | 亮底 | `--color-code-block-bg`（新增）| `#EEF2F7`（沿用现有 `--color-code-bg`） | `--font-family-mono` |
| literary | 暖米亮底 | `--color-code-block-bg`（新增）| `#F2ECE0`（沿用现有 `--color-code-bg`，暖米调延续古籍纸感） | `--font-family-mono` |
| magazine | 亮底 | `--color-code-block-bg`（新增）| `#FFF3E8`（沿用现有 `--color-code-bg`） | `--font-family-mono` |
| tech | 暗底（Atom-One-Dark 系）| `--color-code-block-bg`（新增）| `#1A1A2E`（沿用现有 `--color-code-bg`，本就是暗底，语义从「inline code 底色」扩展为「代码块底色」，两处一致） | `--font-family-mono` |

说明：default / business / magazine 三主题的 `pre` 与 inline `code` 复用同一底色值（视觉一致，无需区分两个 token 实值，但保留 `--color-code-block-bg` 独立 token 名以支持未来单独调整）；tech 主题的深色基调下 `pre` 与 inline code 天然同暗底；literary 保持暖米色呼应古籍纸感。`pre` 边框统一 `1px solid --color-border`（各主题取该主题现有 `--color-border` 值），`border-radius` 取该主题 `--decoration-border-radius-sm`。

### 9.6 列表 marker 主题色设计

微信公众号编辑器粘贴过滤会剥离 `li::marker` 伪元素样式（§9.1 通则），marker 着色须依赖 `list-style` 原生能力与 `color` 继承，不可用伪元素定制符号形状：

- **实现约束成文**：`<ul>` / `<ol>` 的 `list-style-type` 保持原生取值（`disc` / `decimal` 等），marker 颜色通过设置 `<li>` 元素的 `color` 属性使其被 marker 继承（浏览器默认行为：marker 颜色继承自 `<li>` 文字色，无需额外声明）——若 `<li>` 内文字色与 marker 期望色不同（例如文字用 `--color-text-primary` 但希望 marker 用主题色点缀），受限于粘贴过滤对伪元素的剥离，此差异化诉求**不可实现**，成文声明为已知平台限制，不承诺开发
- 各主题 `<li>` 文字色统一取该主题 `--color-text-primary`，marker 随文字色继承，不做跨主题差异化设计——marker 色彩差异化是低价值投入（读者阅读列表时关注文字内容而非项目符号颜色），维持默认继承行为即可满足可用性

### 9.7 Heading Accent（h2 左竖条）

`h2` 左侧 `border-left` accent 竖条是纯 CSS 实现（`border` 属性不依赖伪元素，可安全应用）：

| 主题 | 是否启用 | 规格 |
|------|---------|------|
| default | 否 | 保持无 accent 竖条的简约排版，避免视觉噪音 |
| business | 是 | `border-left: 4px solid --color-brand`（`#1A4F8A`），`padding-left: 8px` |
| literary | 否 | 依赖 `h2Prefix` 类装饰在文学主题语境不适用竖条手法，保持现有 `border-bottom` 下划线风格（见现有 tokens `--decoration-*`），不新增左竖条 |
| magazine | 是 | `border-left: 6px solid --color-brand`（`#D4521A`，杂志主题惯用粗竖条），`padding-left: 10px` |
| tech | 是 | `border-left: 3px solid --color-brand`（`#58A6FF`），`padding-left: 8px` |

**明确排除**：序号徽章（如「01」「02」章节编号）等依赖 `::before` / `::after` 伪元素承载数字或符号的手法一律排除——微信编辑器粘贴过滤剥离伪元素后，序号徽章会完全消失且不可预测地影响布局，任何此类需求须改用真实文本字符前缀（写入 Markdown 源码本身，非 CSS 生成），不作为本次视觉升级范围。

### 9.8 首字下沉（可选 variant，低优先级）

经典首字下沉技法依赖 `float: left` 将首字符脱离文档流，与正文环绕；该实现在微信编辑器粘贴过滤中会因 `float` 被清除而完全失效（§9.1 通则）。

**变通方案**：不追求「首字环绕正文」的真实下沉效果，改为「段首独立大号衬线字符块」——将段落首字符抽取为独立 `<span>`，赋予放大字号（`2.2em`）与主题强调色，作为**段前装饰**而非环绕排版，不使用 `float`：

```
<p>
  <span style="font-size: 2.2em; font-weight: 700; color: {主题 --color-brand};
    line-height: 1; display: inline-block; margin-right: 4px; vertical-align: top;
    font-family: {主题 --font-family-heading}">首</span>字后面的正文内容照常排版……
</p>
```

- `display: inline-block` + `vertical-align: top` 保证首字符与后续正文在同一行内起始对齐，不产生环绕效果
- 各主题的 `color` 取该主题 `--color-brand`，`font-family` 取该主题 `--font-family-heading`
- 登记为**可选 variant**（`paragraph` Block 的一个可选形态，非默认渲染），供 literary / magazine 等强调「开篇仪式感」的场景选用；不建议 business / tech 主题使用（与其克制/工程化调性不符）
