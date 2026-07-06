---
id: "design-review-steps-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-151"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — steps card 步骤卡片（T-151 AC-004）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-steps.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.4`，面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；渲染 3 步 `:::steps{.card}` container directive markdown（`themeId: "default"`），提取 3 个 `<div data-block="steps" data-variant="card">` 卡片各自的 `style`，以及每卡片内 `title`/`description` 两个 slot 的 `style`，并对照 `getBlockBaseStyle("steps", "card")` 的解析层输出。未依赖测试文件断言，独立验证；`tests/core/blocks/steps-card.test.ts` AC-001~AC-003 断言值仅作交叉参照，结果与本次独立渲染完全一致。

容差判定：hex 完全一致为准，布局 px 值 ±1px 内视为一致。

## 结论

**approved** —— card 变体渲染结果与 T-140 样张逐项精确吻合，卡片背景/边框/圆角、卡片间距（含末项归零）、title 字重、description 色值+字号均无差异。

## 一、每卡片背景/边框/圆角

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| background | `--color-surface-alt #F3F0EB` | `background: #F3F0EB`（3 张卡片均一致） | 一致 |
| border | `1px solid --color-border #D6D3CE` | `border: 1px solid #D6D3CE`（3 张卡片均一致） | 一致 |
| border-radius | `--decoration-border-radius-md 6px` | `border-radius: 6px`（3 张卡片均一致） | 一致 |
| padding | `12px 16px` | `padding: 12px 16px`（3 张卡片均一致） | 一致 |

## 二、卡片间距（含末项归零）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 卡片间距 | `卡片间距 12px（末项 0）` | 第 1、2 张卡片 `margin-bottom: 12px`；第 3（末）张 `margin-bottom: 0` | 一致 |

## 三、卡片内 title/description slot

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| title 字重 | `600` | `font-weight: 600`（3 张卡片 title slot 均一致） | 一致 |
| description 色值 | `--color-text-secondary` | `color: #44403C`（3 张卡片 description slot 均一致，对照 default 主题 `--color-text-secondary` token 值） | 一致 |
| description 字号 | `--font-size-sm` | `font-size: 13px`（3 张卡片 description slot 均一致，对照 default 主题 `--font-size-sm` token 值） | 一致 |

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-151 AC-004 视觉一致性审查通过。
