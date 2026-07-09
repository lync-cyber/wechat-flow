---
id: "ui-spec-wechat-flow-block-variants"
version: "0.3.0"
doc_type: ui-spec
author: ui-designer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules"]
consumers: [tech-lead, developer]
volume: block-variants
volume_type: theme
split_from: "ui-spec-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 10. Block 变体视觉规格"
---
# UI Specification 分卷 — Block 变体视觉规格: wechat-flow

[NAV]
- §10 Block 变体视觉规格 → callout, divider, pull-quote, steps, quote, compare, dialog, announcement, gallery
[/NAV]

<!-- 权威源（design_tool=penpot 时）：本卷规格是渲染内容（Block 变体视觉），非编辑器 chrome；验收走 render-verify，不要求逐条 Penpot 帧对照。 -->

## 10. Block 变体视觉规格

本卷为 9 个内置 Block 的变体（`BlockVariant`）补充视觉规格，对应 ARCH M-005「Block / Variant 注册契约」的 `BlockVariant.baseStyle` 承载点（`getBlockBaseStyle` L1 解析入口）。所有色值标注引用主题 token 名与当前值（以 default 主题 `packages/themes/default/src/tokens.ts` 为基准举例，跨主题渲染时替换为各主题对应 token 实值）；变体样式声明遵循 §9.1 微信平台硬约束通则（禁伪元素/float，慎用 absolute，flex/grid 须 table fallback，全部 inline）。

### 10.1 callout（提示框）— 四态形态差异化

**现状变体清单收敛**：`callout` 现有 10 个变体 ID（`default` / `filled` / `minimal` / `info` / `success` / `warning` / `error` / `tip` / `note` / `important`），其中多数为空壳（无独立 `baseStyle`，仅 `label` 不同，无真实视觉差异）。空壳变体名不是契约资产——收敛为 **4 个具备真实形态差异的变体**：`tip` / `warning` / `info` / `danger`。

收敛映射（原变体 ID → 新变体 ID，供迁移参照）：

| 原变体 ID | 收敛去向 | 说明 |
|-----------|---------|------|
| `default` | `info` | 默认提示语义等价于信息类提示 |
| `filled` | `tip` | 填充视觉最接近 tip 的圆角不对称形态 |
| `minimal` | `info`（全边框）| minimal 语义与 info 的克制线框感一致 |
| `success` | `tip` | 成功语义收敛至 tip（积极/建议类提示） |
| `error` | `danger` | 直接语义映射 |
| `note` | `info` | 附注语义收敛至 info |
| `important` | `warning` | 重要提示收敛至 warning（需要读者留意） |
| `info` / `warning` / `tip` | 保留 | 已是目标变体 ID，直接沿用 |

四态形态规格（同色系不同形态区分，不单纯依赖色差）：

- **`tip`**：不对称圆角 `border-radius: 8px 0 8px 8px`（左上/右下直角，右上/左下圆角，制造「便签角」形态识别度）+ 右侧 inset 色条：`box-shadow: inset -4px 0 0 0 {主题 status.tip.accent 对应 token，default 主题取 --color-brand #2d5a4e}`；背景 `--color-surface-alt`（`#f3f0eb`）
- **`warning`**：顶部 `2px` 虚线 + 底部 `2px` 实线：`border-top: 2px dashed {主题 warning 色，default 取 --color-accent #b94a3e 或主题自定义 warning token}`，`border-bottom: 2px solid` 同色；无左右边框，背景透明；虚实对比制造「警示但非致命」的视觉强度分级
- **`info`**：全边框 `1px solid {主题 brand/info 色}` + 顶部 inset 高光：`box-shadow: inset 0 2px 0 0 {同色}, 0 1px 3px rgba(0,0,0,0.06)`（浅阴影提供轻微浮起感，与全边框配合制造「信息卡片」的完整框定感）；背景 `--color-surface`
- **`danger`**：顶部 `8px` 实条 + 零圆角：`border-top: 8px solid {主题 danger/accent 色}`，`border-radius: 0`；粗色条制造最强的视觉优先级，零圆角强化「不容忽视」的严肃感；背景 `--color-accent-light` 对应的浅底色（各主题按其 `--color-accent-light` 的低饱和变体取值，若无现成浅底 token 则复用 `--color-surface-alt`）

四态共用：`padding: 12px 16px`，`margin: 16px 0`（沿用 `--spacing-lg` `--spacing-md` 组合）。

### 10.2 divider（分隔线）— 装饰变体

**现状变体清单收敛**：现有 `default` / `thick` / `decorative` / `dotted` / `dashed` 5 个变体中，`decorative` 是空壳（无具体实现）。将 `decorative` 拆解为 3 个具名装饰变体，`default` / `thick` / `dotted` / `dashed` 保留（均为 CSS `border-style` 原生实现，不涉及本次视觉升级）：

- **`wave`**：inline SVG 正弦波路径，`stroke` 取该主题 `--color-border` token；`viewBox="0 0 240 20"`，`<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10" stroke="{--color-border}" stroke-width="1.5" fill="none" />`；居中显示，上下 `margin: 24px 0`
- **`dots`**：三圆点，inline SVG，`fill` 取该主题 `--color-border-strong`；`viewBox="0 0 60 10"`，三个 `<circle r="2">` 等距排列（`cx=20/30/40, cy=5`）；居中显示，上下 `margin: 20px 0`
- **`flower`**：两线夹中心花瓣，inline SVG；两侧各一条 `<line>`（`stroke: --color-border`，长度各 90px，间隔 20px 空白）+ 中心一个花瓣形 `<path>`（`fill: --color-brand`，小尺寸 `8x8` 菱形或简化花瓣路径）；居中显示，上下 `margin: 24px 0`

三者均以 inline SVG 实现（§9.1 通则已验证微信平台兼容），`<svg>` 外层 `display: block`，`margin: {值} auto`。

### 10.3 pull-quote（摘引）— 装饰引号 + 署名行

**现状变体清单收敛**：现有 5 个变体（`default` / `large` / `decorated` / `minimal` / `bordered`）中 `decorated` 为空壳，本节即其规格填充：

- **`decorated`**：装饰大引号 + 居中署名行两个视觉元素组合：
  - 装饰引号：真实文本字符「「」（中文书名号形态引号，非 SVG），`font-size: 28px`，`opacity: 0.35`，`color: {主题 --color-brand}`，`display: inline-block`，`vertical-align: top`，`line-height: 1`；引号节点为摘引首个段落的**第一个子节点**（与正文同行、位于文字行首），不作为段落的兄弟节点独立成行
  - 居中署名行：`author` 字段渲染为独立行，文本为「—— {author}」（破折号「——」前缀 + 空格），`font-size: 13px`，`color: {主题 --color-text-muted}`，`margin-top: 10px`，`text-align: center`
- 沿用现有 `pull-quote` block-level `baseStyle`（`text-align: center`，`padding: 24px 16px`，`margin: 24px 0`，`font-size: 1.25em`）作为 root 容器基线，`decorated` 在此基础上叠加引号与署名装饰；root 的 `text-align`/`font-size` 属可继承 typography，须对摘引正文段落**渲染后真实生效**（正文 `<p>` 计算 `text-align` = `center`、字号反映 `1.25em`，经容器 typography 下推保障，见 arch `M-002` 通用渲染机制）

### 10.4 steps（步骤）— step-card 卡片变体

**现状变体清单收敛**：现有 10 个变体中 `card` 是空壳，本节填充其规格：

- **`card`**：每个 step 项渲染为独立卡片：背景 `--color-surface-alt`，`border: 1px solid --color-border`，`border-radius: {主题 --decoration-border-radius-md}`，`padding: 12px 16px`，卡片间 `margin-bottom: 12px`（最后一项 `margin-bottom: 0`）；每卡片内 `title` 字重 `600`，`description` 用 `--color-text-secondary`，`font-size: --font-size-sm`

### 10.5 quote（引用）— 大引号 / 首字下沉装饰变体

**现状变体清单收敛**：现有 10 个变体（`default` / `bordered` / `centered` / `filled` / `minimal` / `large` / `italic` / `card` / `magazine` / `literary`）中 `magazine` 与 `literary` 命名指向"主题绑定"而非独立视觉形态，与 Block variant 应描述"形态"而非"主题"的定位不符——收敛调整：`magazine` 重命名为 `large-quote-mark`（大引号装饰，见下），`literary` 重命名为 `dropcap`（首字下沉装饰，见下），两者作为独立视觉手法供任意主题选用，不再以主题名暗示专属绑定：

- **`large-quote-mark`**（原 `magazine`）：大引号装饰，真实文本字符「"」置于引用文字前（引号节点为首个段落的**第一个子节点**，与正文同行、位于文字行首，不独立成行），`font-size: 2em`，`color: {主题 --color-brand}`，`opacity: 0.4`，`line-height: 0.6`，`display: inline-block`，`vertical-align: top`，`margin-right: 4px`
- **`dropcap`**（原 `literary`）：复用 §9.8 首字下沉方案（table 双格悬挂）——首字符独立占据左 cell，`font-size: 2.2em`，`font-weight: 700`，`line-height: 1`，`color: {主题 --color-brand}`；引用正文占据右 cell，多行整体悬挂于首字右侧

**font-family 缺席（全局约束见 §1.2.5）**：首字 cell 不声明 `font-family`（构造守卫拒绝）——产物与预览在所有 render target 下均不含 inline font-family，由目标环境系统字体栈接管，是诚实的「所见即所粘」。`dropcap` 的首字识别度不依赖字体族本身，由 `font-size: 2.2em` + `font-weight: 700` + `color: {主题 --color-brand}` + `line-height: 1` 的尺寸/字重/配色/紧排行高组合独立承载——各主题（含 literary 的宋体身份倾向）的字体识别度让位于此组合。

两变体的 root 容器为**无边框引用基线**：不含 `border-left`（区别于 `default` 变体的左边框样式，对齐 `block-variants-quote.png` 样张），`padding: 8px 16px`，`margin: 16px 0`，`color: #555`（default 主题基准，跨主题渲染替换实值）；root 的 `color` 属可继承 typography，须对引用正文渲染后真实生效。两变体均不使用 `float`（§9.1 通则），`large-quote-mark` 与 `dropcap` 二选一装饰同一引用文本首部，不叠加使用。

### 10.6 compare（对比）— ledger 双色账本

**现状变体清单收敛**：现有 5 个变体（`default` / `highlight-right` / `table-style` / `color-coded` / `compact`）中 `color-coded` 为空壳，本节填充其规格并重命名为 `ledger`（更准确描述双色账本布局本质）：

- **`ledger`**（原 `color-coded`）：双色账本布局，`display: table` + 两个 `display: table-cell` 子项（§9.1 通则要求 flex/grid 须 table fallback，此变体直接以 table 布局实现，无需 fallback）：
  - 左列（指令属性 `left-label` + `left-value`，渲染为「{label}：{value}」）：背景取该主题 status.tip 对应浅底色（default 主题暂无现成 tip-soft token，取 `--color-surface-alt` `#f3f0eb` 近似），`padding: 16px`，`width: 50%`
  - 右列（指令属性 `right-label` + `right-value`，渲染同左列）：背景取该主题 status.danger 对应浅底色（取 `--color-accent-light` 对应浅底近似值，或复用 `--color-code-bg` 作中性浅底占位），`padding: 16px`，`width: 50%`
  - 两列间 `border-left: 1px solid --color-border` 分隔（`table-cell` 天然贴合，无需额外 gap 声明）
  - 顶部标题（指令属性 `title`，若有）跨两列：单独一行 `<div style="display: table; width: 100%">` 之外的独立块，`text-align: center`，`font-weight: 600`，`margin-bottom: 8px`

### 10.7 dialog（对话）— chat-bubbles 聊天气泡

**现状变体清单收敛**：现有 3 个变体（`default` / `bubble` / `interview`）中 `bubble` 命名保留，本节即其规格填充，明确重命名为 `chat-bubbles`（描述更精确）：

- **`chat-bubbles`**（原 `bubble`）：左右两侧气泡布局，按 `speaker` 字段奇偶交替侧位（第一位 speaker 固定左侧，后续按出现顺序交替）：
  - 气泡容器：`border-radius: 12px`，`max-width: 80%`，`padding: 10px 14px`，`display: inline-block`
  - 左侧气泡（如「对方」）：背景 `--color-surface-alt`，文字 `--color-text-primary`，容器 `margin-right: auto`（贴左）
  - 右侧气泡（如「己方」）：背景 `--color-brand`，文字 `--color-text-inverse`，容器 `margin-left: auto`（贴右）
  - 每条消息独立一行块级容器（`display: table` 包裹以保证 `margin: 0 auto` 类的左右贴靠在无 flex 环境下生效），消息间 `margin-bottom: 8px`
  - `avatar` 字段若存在：气泡外侧显示 `24px` 圆形头像（`border-radius: 50%`），左侧气泡头像在左，右侧气泡头像在右

### 10.8 announcement（公告）— danger-bar 等变体

**现状变体清单收敛**：现有 3 个变体（`default` / `banner` / `compact`）均为空壳，补充规格并新增 `danger-bar` 变体（原 `banner` 收敛至此，`compact` 保留为独立紧凑变体）：

- **`danger-bar`**（原 `banner`）：顶部 accent 实条 + 左边框，`border-top: 4px solid {主题 --color-accent}`，`border-left: 3px solid {主题 --color-accent}`，`padding: 12px 16px`，背景 `--color-surface-alt`；`title` 字段（若有）字重 `700`，正文 `--color-text-primary`
- **`compact`**：紧凑单行公告，`padding: 8px 12px`，`border-left: 3px solid {主题 --color-brand}`，无顶部条，`font-size: --font-size-sm`
- **`default`**：标准公告，沿用 `danger-bar` 去掉顶部实条的简化版（仅左边框 + 浅底），作为默认基线

**明确排除**：贴纸感 `transform: rotate(...)` 旋转贴纸变体不纳入——CSS `transform` 在微信编辑器粘贴过滤中兼容性存疑（旋转变换在部分客户端渲染环境下与内联样式合成存在已知冲突风险），不作为可交付变体。

### 10.9 gallery（图集）— duo / triptych 变体

**现状变体清单收敛**：现有 3 个变体（`grid` / `masonry` / `carousel`）均面向 CSS Grid / Flex 实现假设，与 §9.1 通则「Grid 不可依赖」冲突——新增 2 个 table-based 变体 `duo`（双列）/ `triptych`（三宫格）作为微信兼容的主力实现，原 3 个变体登记为**降级 fallback 语义**（`grid`/`masonry`/`carousel` 的运行时渲染需回退至 table 布局，不依赖真实 CSS grid/flex 特性）：

- **`duo`**：双列布局，`display: table`，`width: 100%`；每两张图片一组 `display: table-row`，各图 `display: table-cell`，`width: 50%`，`padding: 4px`；图片 `width: 100%`，`border-radius: {主题 --decoration-border-radius-sm}`；每张图片下方若有 `caption` 字段，独立 `<div>` 居中小字（`font-size: --font-size-sm`，`color: --color-text-muted`）
- **`triptych`**：三宫格布局，`display: table`，`width: 100%`，单个 `display: table-row` 内 3 个 `display: table-cell`（`width: 33.33%`），`padding: 3px`；超过 3 张图片时按每 3 张一组换行（新增 `table-row`）；图片与 caption 规格同 `duo`

`grid` / `masonry` / `carousel` 三个既有变体 ID 保留（向后兼容 directive 语法不破坏），但其视觉实现按 `duo`（≤2 列语义）或 `triptych`（≥3 列语义）的 table 布局渲染，不实现真实瀑布流/轮播交互——瀑布流（`masonry`）与轮播（`carousel`）依赖 JS 交互与非文档流布局，均与「产物是静态 inline-styled HTML」的产品定位冲突（PRD 产物契约为经粘贴过滤后视觉一致的静态 HTML，非交互式组件）。
