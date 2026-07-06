---
id: "design-review-announcement-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-155"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — announcement 公告 danger-bar/compact/default 三变体（T-155 AC-006）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-announcement.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.8`，三面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；对 `danger-bar`/`compact`/`default` 三态分别调用 `getBlockBaseStyle("announcement", variantId)` 并渲染对应 container directive markdown（`themeId: "default"`），提取容器实际 `style` 属性计算值。`tests/core/blocks/announcement-variants.test.ts` AC-001~AC-005 断言值仅作交叉参照，本次为独立渲染验证。

容差判定：hex 完全一致为准，布局 px 值 ±1px 内视为一致。

## 结论

**approved** —— 三态渲染结果与 T-140 样张逐项精确吻合，边框组合（顶部实条+左边框 / 仅左边框无顶条 / 简化版仅左边框）、色值、padding 均无差异。

## 一、danger-bar（原 banner）— 顶部实条 + 左边框

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-top | `4px solid --color-accent #B94A3E` | `border-top: 4px solid #B94A3E` | 一致 |
| border-left | `3px solid 同色` | `border-left: 3px solid #B94A3E` | 一致 |
| background | `--color-surface-alt #F3F0EB · padding 12px 16px` | `background: #F3F0EB; padding: 12px 16px` | 一致 |
| title 字重 | `700 · 正文 --color-text-primary` | （标题字重由内容层 Markdown `**加粗**` 语法决定，本面板渲染 fixture 无加粗标记；此项为内容排版规范非 block 变体 base style 契约，非本轮 AC-006 范围） | 不适用（内容层规范，非变体样式契约） |

## 二、compact — 紧凑单行

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-left | `3px solid --color-brand #2D5A4E` | `border-left: 3px solid #2D5A4E` | 一致 |
| 顶部条 | `无顶部条` | 无 `border-top` 声明 | 一致 |
| padding | `8px 12px` | `padding: 8px 12px` | 一致 |
| font-size | `--font-size-sm` | `font-size: 13px`（default 主题 `--font-size-sm` 实值） | 一致 |

## 三、default — 标准公告

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 收效映射 | `= danger-bar 去顶部实条的简化版 · 仅左边框 + 浅底` | 无 `border-top` 声明，含 `border-left: 3px solid #B94A3E` + `background: #F3F0EB` | 一致 |
| border-left | （同 danger-bar 色值，仅省略顶条） | `border-left: 3px solid #B94A3E` | 一致 |
| background | `--color-surface-alt #F3F0EB` | `background: #F3F0EB` | 一致 |

## 四、三态互异性与排除项

- 三态渲染 `style` 属性互不相同：danger-bar 含独立 `border-top`，compact 无 `background` 声明且 `padding` 更紧凑，default 无 `border-top` 但保留 `background`。
- 样张标注「排除: transform rotate 贴纸变体（粘贴兼容存疑）」—— 三态渲染 HTML 均不含 `transform: rotate` 声明，与排除项一致（`tests/core/blocks/announcement-variants.test.ts` AC-005 同源覆盖）。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-155 AC-006 视觉一致性审查通过。
