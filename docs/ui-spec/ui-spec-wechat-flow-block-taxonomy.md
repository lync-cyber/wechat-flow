---
id: "ui-spec-wechat-flow-block-taxonomy"
version: "0.1.1"
doc_type: ui-spec
author: ui-designer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules"]
consumers: [tech-lead, developer]
volume: block-taxonomy
volume_type: theme
split_from: "ui-spec-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 8. Block 分类冻结映射"
---
# UI Specification 分卷 — Block 分类冻结映射: wechat-flow

[NAV]
- §8 Block 分类冻结映射 → A-014 权威数据源
[/NAV]

## 8. Block 分类冻结映射

本卷是 A-014（见主卷 §6 假设清单）的权威数据源：38 个内置 Block 到 `BlockCategory`（ARCH M-005「Block / Variant 注册契约」定义的 6 值枚举）的冻结映射表，驱动 UC-015 InsertDrawer 与 UC-021 DirectiveAutocompletePopover 的分类 Tab 数据化。前端不硬编码分类清单——分类枚举与每个 Block 归属均来自 `BlockDefinition.category`；本表仅供人工核对与 `packages/blocks` 各 Block 定义文件的 `category` 字段赋值参照，不是运行时读取的数据源。

### 8.1 分类 Tab 标签映射

`BlockCategory` → 中文 Tab 标签的映射为前端唯一允许硬编码的部分（标签文案，非分类清单本身），Tab 顺序即枚举声明顺序：

| `category` | Tab 标签 | 语义 |
|-----------|---------|------|
| `text` | 基础排版 | 段落、标题、列表、引用、分隔线、代码块等基础排版元素 |
| `media` | 图文媒体 | 图片、图注、图集、视频、音频、二维码等媒体类内容 |
| `emphasis` | 强调提示 | 提示框、高亮块、警示、拉引等注意力容器 |
| `structured` | 结构化 | 卡片、步骤、时间线、对比、问答等信息骨架 |
| `marketing` | 运营引流 | CTA、订阅、推荐、小程序卡等公众号运营组件 |
| `meta` | 元信息 | 作者卡、页脚、免责声明、脚注、引用出处等文末/边栏元数据 |

UC-015 / UC-021 均不保留「全部」Tab——6 个分类 Tab 已完整覆盖全部 38 个 Block，用户心智模型是"按用途分类查找"而非"看全量列表再筛选"；搜索框（UC-021 已有顶部搜索框、UC-015 组件列表上方新增搜索输入）承担跨分类检索需求，两者互补不冗余。默认选中 `text`（第一个 Tab，即枚举声明顺序首位），因为基础排版元素是写作场景中最高频插入需求。

### 8.2 38 Block 冻结分类表

| Block ID | 名称 | `category` | 归类依据 |
|----------|------|-----------|---------|
| `heading` | 标题 | `text` | 基础排版元素 |
| `paragraph` | 段落 | `text` | 基础排版元素 |
| `list` | 列表 | `text` | 基础排版元素 |
| `table` | 表格 | `text` | 用户插入表格时首先联想「记录/罗列数据的基础排版元素」而非「信息骨架容器」；与 heading/list/quote 同属编辑器最高频基础排版操作，不应与 card/steps 等强布局意图容器混列 |
| `code-block` | 代码块 | `text` | 基础排版元素 |
| `quote` | 引用 | `text` | 基础排版元素 |
| `divider` | 分隔线 | `text` | 基础排版元素 |
| `definition-list` | 定义列表 | `text` | 基础排版元素（列表变体） |
| `image` | 图片 | `media` | 媒体类内容 |
| `image-caption` | 图注 | `media` | 媒体类内容（与 image 配套） |
| `gallery` | 图集 | `media` | 媒体类内容 |
| `video` | 视频 | `media` | 媒体类内容 |
| `audio` | 音频 | `media` | 媒体类内容 |
| `qrcode` | 二维码 | `media` | 媒体类内容 |
| `callout` | 提示框 | `emphasis` | 注意力容器 |
| `warning` | 警示 | `emphasis` | 注意力容器 |
| `highlight-block` | 高亮块 | `emphasis` | 注意力容器 |
| `pull-quote` | 摘引 | `emphasis` | 注意力容器（拉引强调） |
| `tip-grid` | 小技巧网格 | `emphasis` | 注意力容器 |
| `announcement` | 公告 | `emphasis` | 注意力容器 |
| `disclaimer` | 免责声明 | `emphasis` | 用户插入免责声明时的心智是「需要读者特别注意的提示性文字」而非「文末元数据归档」；与 callout/warning 同属「需要突出显示以引起读者注意」的容器语义，优先级高于其「常出现在文末」的位置惯例 |
| `card` | 卡片 | `structured` | 信息骨架 |
| `steps` | 步骤 | `structured` | 信息骨架 |
| `compare` | 对比 | `structured` | 信息骨架 |
| `timeline` | 时间线 | `structured` | 信息骨架 |
| `dialog` | 对话 | `structured` | 信息骨架 |
| `qa` | 问答 | `structured` | 信息骨架 |
| `kpi-card` | KPI 数据卡 | `structured` | 信息骨架 |
| `social-cta` | 社交引导 CTA | `marketing` | 公众号运营组件 |
| `subscribe-cta` | 文末引导 | `marketing` | 文末静态引导卡（关注/互动引导文字） |
| `advert-card` | 广告卡 | `marketing` | 公众号运营组件 |
| `recommendation` | 推荐 | `marketing` | 公众号运营组件 |
| `related-cards` | 相关卡片 | `marketing` | 公众号运营组件 |
| `author-card` | 作者卡 | `meta` | 文末/边栏元数据 |
| `publication-skeleton` | 刊物骨架 | `meta` | 文末/边栏元数据 |
| `reading-time` | 阅读时长 | `meta` | 文末/边栏元数据 |
| `footnote` | 脚注 | `meta` | 文末/边栏元数据 |
| `citation` | 引用出处 | `meta` | 文末/边栏元数据 |

统计核对：`text` 8 / `media` 6 / `emphasis` 7 / `structured` 7 / `marketing` 5 / `meta` 5，合计 38，与 `packages/blocks/src/blocks/*.ts` 现存 38 个 Block 文件一一对应，无遗漏无多余。

### 8.3 与 ARCH M-005 的对齐说明

ARCH `arch-wechat-flow-modules.md` §M-005「Block / Variant 注册契约」中 `BlockCategory` 枚举的注释示例词，与本表 §8.2 的冻结结论逐词一致：`text` 枚举注释含「表格、定义列表」对应本表 `table`/`definition-list` 归 `text`；`emphasis` 枚举注释含「免责声明」对应本表 `disclaimer` 归 `emphasis`；`structured` 枚举注释（卡片、步骤、时间线、对比、问答）与本表 `structured` 全部条目（含 `dialog`/`kpi-card`，注释为非穷举示例）一致。本表 §8.2 是 A-014 逐 Block 归类的权威数据源，ARCH M-005 是 `BlockCategory` 枚举契约结构的权威源；`packages/blocks` 各 Block 定义文件的 `category` 字段实现以本表为准。
