---
id: "design-review-pull-quote-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-150"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — pull-quote decorated 装饰引号 + 署名行（T-150 AC-004）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-pull-quote.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.3`，面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；渲染 `:::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::`（`themeId: "default"`），提取根容器 `style`、装饰引号 `<span>「</span>` 的 `style`、署名行 `<div>鲁迅</div>` 的 `style` 三处实际计算值，并对照 `getBlockBaseStyle("pull-quote", "decorated")` 的解析层输出。未依赖测试文件断言，独立验证；`tests/core/blocks/pull-quote-decorated.test.ts` AC-001~AC-003 断言值仅作交叉参照，结果与本次独立渲染完全一致。

容差判定：hex 完全一致为准，布局 px 值 ±1px 内视为一致。

## 结论

**approved** —— decorated 变体渲染结果与 T-140 样张逐项精确吻合，装饰引号字符/字号/透明度/色值、署名行独立性/字号/居中/色值、root 容器基线叠加合成均无差异。

## 一、装饰引号（AC-001）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 引号字符 | 真实字符「「」 | HTML 含 `<span ...>「</span>` | 一致 |
| font-size | `28px` | `font-size: 28px` | 一致 |
| opacity | `0.35` | `opacity: 0.35` | 一致 |
| color | `--color-brand #2D5A4E` | `color: #2D5A4E` | 一致 |
| display | `inline-block` | `display: inline-block` | 一致 |
| vertical-align | `top` | `vertical-align: top` | 一致 |
| line-height | 未在样张单独标注但 ui-spec §10.3 声明 `line-height: 1` | `line-height: 1` | 一致（ui-spec 交叉核对） |

## 二、居中署名行（AC-002）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 独立行 | `author 字段独立行` | HTML 含 `<div style="...">鲁迅</div>`（与正文 `<p>` 分离的独立元素） | 一致 |
| font-size | `13px` | `font-size: 13px` | 一致 |
| color | `--color-text-muted #78716C` | `color: #78716C` | 一致 |
| margin-top | `10px` | `margin-top: 10px` | 一致 |
| text-align | `center` | `text-align: center` | 一致 |

## 三、root 容器基线叠加合成（AC-003，spec §10.3 末段）

| 维度 | 样张/spec 标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| root text-align | `center` | `text-align: center`（容器 style 含此声明，未被内部装饰覆盖） | 一致 |
| root padding | `24px 16px` | `padding: 24px 16px` | 一致 |
| root margin | `24px 0` | `margin: 24px 0` | 一致 |
| root font-size | `1.25em` | `font-size: 1.25em` | 一致 |
| 叠加无冲突 | 装饰声明（引号 font-size 28px）与 root 基线（font-size 1.25em）应各自作用于独立元素 | 容器 `style` 含 `font-size: 1.25em`；引号 `<span>` 独立含 `font-size: 28px`；二者未互相覆盖 | 一致 |

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-150 AC-004 视觉一致性审查通过。
