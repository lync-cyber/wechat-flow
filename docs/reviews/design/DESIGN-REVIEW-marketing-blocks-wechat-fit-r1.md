---
id: "design-review-marketing-blocks-wechat-fit-r1"
doc_type: design-review
author: orchestrator
status: approved
deps: ["prd-wechat-flow-f001-f014", "ui-spec-wechat-flow-block-taxonomy"]
consumers: ["orchestrator", "product-manager"]
---

# 设计一致性审查：marketing 类块的微信公众号适配性

## 缘由与范围

用户对 `subscribe-cta`（「订阅更新」按钮）提出质疑：这类容器对微信公众号平台无实际意义。经核查其非从 wechat-typeset 迁移，而是 PRD `prd#§2` 列为「P1 必含运营组件」、ui-spec block-taxonomy 归入 `marketing` 类的原始块。用户裁定先对整个 `marketing` 类做适配性审计，再对不适配块出改造方案，逐块评估「采纳改造 / 直接删除 / 占位保留」。

审计对象为 taxonomy 定义的 7 个 marketing 块：`footer-cta` / `social-cta` / `subscribe-cta` / `advert-card` / `miniprogram-card` / `recommendation` / `related-cards`。

## 判据：微信公众号的产物约束

产物契约是「经微信编辑器粘贴过滤后视觉一致的 inline-styled HTML」。由此约束推出适配性判据：

1. **无功能交互**：粘贴后无 JS、无 `<form>`、无真实 `<button>`；本项目 `slotElement("button", …)` 生成的是被样式伪装成按钮的 `<span>/<section>`，视觉存活但**零交互**——「看着能点、实则是死元素」。
2. **外链受限**：正文 `<a href>` 外链被微信剥离/失效（仅 `阅读原文` 与白名单公众号文章超链例外）。任何「点击跳转」意图在正文内不成立。
3. **原生功能不可仿造**：`赞 / 在看 / 转发 / 收藏` 是微信文章底部**原生自带**的交互，作者不能也不应在正文内伪造；`关注/订阅` 经微信原生账号名片或扫码完成，正文无订阅机制；真「小程序卡」须经微信编辑器「小程序」工具插入生成 `mp-miniprogram`，粘贴静态 HTML 仿制的卡片**不会拉起小程序**。
4. **静态视觉内容合法**：卡片、边框、底纹、图标、二维码图片、纯文字提示等静态样式内容粘贴后如实呈现，是合法产物。
5. **引导文字合法**：用**文字**指引读者去操作微信**原生**入口（如「点击上方蓝字关注」「点亮下方『在看』」「长按识别二维码」）是诚实且有效的——它不伪造控件，只描述读者真能做的动作。

判据核心：**块渲染的东西，是「粘贴后如实呈现的静态内容 / 诚实引导文字」还是「伪装成微信原生/可交互元素、实则失效」？** 后者会误导读者，属不适配。

## 逐块判定

| 块 | 渲染物 | 代码证据 | 微信适配 | 判定 |
|----|--------|---------|---------|------|
| `subscribe-cta` | 「订阅更新」药丸按钮 + 标题 | `BANNER_CTA_LABEL = "订阅更新"`；`button` slot 圆角按钮样式 | ❌ 伪按钮，点击无效；无正文订阅机制 | **REDESIGN / REMOVE** |
| `footer-cta` | 「关注我」按钮 + `♡赞同 ★收藏 ↗转发` 操作栏 | `CTA_BUTTON_LABEL = "关注我"`；`ACTION_LABELS = ["♡ 赞同","★ 收藏","↗ 转发"]` | ❌ 伪按钮 + 伪造微信原生操作（与底部真操作重复且失效） | **REDESIGN / REMOVE** |
| `miniprogram-card` | 图标占位 + 标题/描述，仿微信小程序卡外观 | 名为「小程序卡片」，`decorateIconCard` 造 icon/info 单元 | ❌ 仿造原生小程序卡但不可拉起，冒充可交互原生组件 | **REDESIGN / REMOVE / 占位** |
| `social-cta` | `◆` 图标 + 文字标签 | `ICON_LEFT_GLYPH = "◆"`，`label` slot 纯文字 | ⚠️ 静态文字提示（非按钮），如实呈现；但引导外部社交平台在微信内无法跳转，价值有限 | **KEEP（边际）** |
| `advert-card` | 纯样式卡片容器，作者自填内容 | 无伪交互元素，仅 root border/bg | ✅ 静态推广视觉框，粘贴如实 | **KEEP** |
| `recommendation` | `•` 项目符号推荐列表 | `slotElement("item", ["• ", …])` | ✅ 静态文字列表 | **KEEP** |
| `related-cards` | 相关文章标题卡片/网格 | 静态 grid-cell，正文为文章标题 | ✅ 静态文字卡（标题形态合法） | **KEEP** |

## 汇总

- **不适配（伪装失效交互，出改造方案）**：`subscribe-cta`、`footer-cta`、`miniprogram-card`（3 个）
- **边际（静态但价值存疑）**：`social-cta`（1 个）
- **适配（静态内容，保留）**：`advert-card`、`recommendation`、`related-cards`（3 个）

## 改造方案（去伪交互 · 纯静态重设计）

三个不适配块的核心病灶都是「伪装可交互控件」。改造原则：**去掉一切按钮/伪原生操作栏，保留其运营意图，改为诚实的静态内容 + 引导文字**。

### 方案 A — `subscribe-cta` → 关注引导卡（静态）

- **去除**：`button` slot、`BANNER_CTA_LABEL="订阅更新"`、`decorateBanner` 追加按钮的逻辑。
- **保留/改为**：root 卡片样式 + `text` slot 承载作者自写的引导文案；`banner` 变体保留更醒目的横幅底纹/居中强调，但**无按钮**。
- **示例**：
  - 输入 `:::subscribe-cta{.banner}\n点击上方蓝字「公众号名」关注,第一时间获取更新\n:::`
  - 输出：居中横幅卡，内为该引导文字（诚实——「点击上方蓝字」是微信真存在的关注入口）。
- **slots**：`root` / `text`（删 `button`）。
- **与既有块关系**：引导关注若需二维码，配合既有 `qrcode` 块使用；本块专注文字引导。

### 方案 B — `footer-cta` → 文末互动引导（静态）

- **去除**：`button` slot（`CTA_BUTTON_LABEL="关注我"`）、`ACTION_LABELS` 伪造的 `♡赞同 ★收藏 ↗转发` 操作栏及其 `action-side/center` 单元。
- **保留/改为**：root 文末卡片 + `text` slot 承载文末引导文案，用**文字**指向微信原生操作。
- **示例**：
  - 输入 `:::footer-cta\n如果这篇文章对你有帮助,欢迎点亮下方「赞」与「在看」,并转发给需要的朋友\n:::`
  - 输出：文末样式卡，内为该引导文字（诚实——指引读者用微信底部真按钮，不伪造控件）。
- **slots**：`root` / `text`（删 `button` / `action-*`）。
- **与 `subscribe-cta` 关系**：改造后两者都成为「文末静态引导卡」，语义相近（关注引导 vs 互动引导）。可选：合并为单一「文末引导」块（变体区分关注/互动），或保持两块。需用户定。

### 方案 C — `miniprogram-card` → 二选一

- **C1 通用图文推广卡（改造）**：去掉「小程序」语义与命名，重定位为通用「图文卡」（图/图标 + 标题 + 描述的静态卡）。诚实呈现，不冒充原生。**风险**：与 `advert-card` 职能重叠，可能应直接并入 advert-card 而非独立存在。
- **C2 占位保留（不改代码）**：保留现结构，但**文档与 label 明确其为占位**——「粘贴后作者在微信编辑器内『小程序』工具插入真卡替换此占位」。不冒充成品，只作排版占位。
- 建议：若无「占位替换」的真实工作流诉求，取 C1 并入 advert-card（或直接 REMOVE）；若有，取 C2 并正名。

## 处置影响（供决策参考）

- 移除或改造任一块属 **PRD 层面变更**（P1 必含清单需 amend），非实现层擅自删除。
- 变体缺口方案批 B 已给部分 marketing 块补了变体（`subscribe-cta` banner、`social-cta` icon-left/full-width、`related-cards` compact/grid、`advert-card` minimal、`recommendation`、`miniprogram-card` large/compact）；被移除/改造块的批 B 变体随之回滚或重做，相关测试与视觉基线一并清理。
- PR #130 CI 的视觉基线失败项含 `subscribe-cta-banner`；若该块改造/移除，其基线随新形态重生或删除。其余失败项（`quote-filled` / `compare-compact` / `code-block-light` / `warning-banner` / composite）为正当内容块，无论如何都需修基线。

## 终裁（用户 2026-07-16）

| 块 | 裁定 | 落地 |
|----|------|------|
| `subscribe-cta` | **采纳方案 A** | 重设计为静态「文末引导」卡：无按钮，root 卡片样式 + 正文承载引导文案；`default`（标准引导）+ `banner`（横幅放大居中）两变体。块名由「订阅更新」改为「文末引导」，同时吸收文末互动引导语义（作者正文写「点击上方蓝字关注」或「点亮下方『在看』并转发」皆可）。 |
| `footer-cta` | **与 subscribe-cta 合并** | 删除 `footer-cta` 块；其「文末互动引导」语义并入 subscribe-cta（同为静态文末引导卡，靠正文文案区分关注/互动，不再单列一块）。 |
| `miniprogram-card` | **删除** | 删除 `miniprogram-card` 块（不取 C1/C2）；避免冒充不可拉起的原生小程序卡。真小程序卡由作者在微信编辑器「小程序」工具插入。 |

内置块 40 → **38**（`marketing` 7 → **5**：保留 `social-cta` / `subscribe-cta` / `advert-card` / `recommendation` / `related-cards`）。PRD `F-003` P1 必含清单、ARCH「内置块」计数、ui-spec block-taxonomy 冻结表已同步 amend。`social-cta`（边际）本轮保留，其价值存疑留后续版本评估。
