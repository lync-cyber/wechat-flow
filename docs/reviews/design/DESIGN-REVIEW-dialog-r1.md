---
id: "design-review-dialog-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-154"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — dialog 对话 chat-bubbles 左右气泡（T-154 AC-007）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-dialog.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.7`，面板底部标注 token 名与实值）。T-140 轮曾就 dialog 头像居中细节定点修改后通过，本轮复核该细节的渲染态是否维持一致。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；渲染两条交替 speaker 的 `:::dialog{.chat-bubbles speaker="..." avatar="..."}` container directive markdown（`themeId: "default"`），提取消息行容器、气泡 div、头像 `<img>` 标签的实际 `style`/属性值。`tests/core/blocks/dialog-chat-bubbles.test.ts` AC-001~AC-006 断言值仅作交叉参照，本次为独立渲染验证。

容差判定：hex 完全一致为准，布局 px/百分比值 ±1px 内视为一致。

## 结论

**approved** —— chat-bubbles 渲染结果与 T-140 样张逐项精确吻合，左右交替气泡侧位、色值、圆角、头像尺寸与外侧放置均无差异。

## 一、消息行容器

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| display | `table 包裹保证无 flex 环境贴浮` | 每条消息行 `display: table` | 一致 |
| 消息间距 | `消息间 8px` | `margin-bottom: 8px` | 一致 |

## 二、气泡基础参数

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-radius | `12px` | `border-radius: 12px` | 一致 |
| max-width | `80%` | `max-width: 80%` | 一致 |
| padding | `10px 14px` | `padding: 10px 14px` | 一致 |
| display | （隐含 inline-block，供左右浮动） | `display: inline-block` | 一致 |

## 三、左右交替色值与侧位

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 左气泡 bg | `--color-surface-alt #F3F0EB` | `background: #F3F0EB` | 一致 |
| 左气泡文字 | `--color-text-primary` | `color: #1C1917`（default 主题 `--color-text-primary` 实值） | 一致 |
| 左气泡侧位 | 首位固定左侧 | `margin-right: auto` | 一致 |
| 右气泡 bg | `--color-brand #2D5A4E` | `background: #2D5A4E` | 一致 |
| 右气泡文字 | `--color-text-inverse #FAFAF9` | `color: #FAFAF9` | 一致 |
| 右气泡侧位 | 奇偶交替侧位 | `margin-left: auto` | 一致 |

## 四、头像

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 尺寸 | `24px 圆形` | `width="24" height="24"` + `border-radius:50%` | 一致 |
| 放置 | `外侧放置` | 左侧消息头像出现在气泡 `<div>` 之前（`data-dialog-avatar="left"`），右侧消息头像出现在气泡之后（`data-dialog-avatar="right"`），均在气泡外侧 | 一致 |

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-154 AC-007 视觉一致性审查通过，T-140 轮定点修改的头像居中/外侧放置效果在渲染态维持一致。
