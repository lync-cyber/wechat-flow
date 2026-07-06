---
id: "design-review-quote-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-152"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — quote large-quote-mark / dropcap 装饰变体（T-152 AC-005）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-quote.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.5`，两面板底部各自标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；分别渲染 `:::quote{.large-quote-mark}\n引用文字\n:::` 与 `:::quote{.dropcap}\n引用文字\n:::`（`themeId: "default"`），提取大引号 `<span>"</span>` 与首字 `<span>引</span>` 的 `style` 实际计算值。未依赖测试文件断言，独立验证；`tests/core/blocks/quote-variants.test.ts` AC-001~AC-004 断言值仅作交叉参照，结果与本次独立渲染完全一致。

容差判定：hex 完全一致为准，布局 px/em 值 ±1 单位内视为一致。悬挂对齐细节（`display: inline-block` + `vertical-align: top`，非 float）逐项核对。

## 结论

**approved** —— 两变体渲染结果与 T-140 样张逐项精确吻合，装饰字符/字号换算值/透明度或字重/色值/字体族、悬挂对齐手法（非 float）均无差异。

## 一、large-quote-mark（原 magazine）— 大引号装饰

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 引号字符 | 真实字符「"」 | HTML 含 `<span ...>"</span>` | 一致 |
| font-size | `2em` | `font-size: 2em` | 一致 |
| color | `--color-brand #2D5A4E` | `color: #2D5A4E` | 一致 |
| opacity | `0.4` | `opacity: 0.4` | 一致 |
| line-height | `0.6` | `line-height: 0.6` | 一致 |
| display | `inline-block`（非 float） | `display: inline-block` | 一致 |
| vertical-align | `top` | `vertical-align: top` | 一致 |
| margin-right | `4px` | `margin-right: 4px` | 一致 |

## 二、dropcap（原 literary）— 首字下沉装饰

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 首字独立 span | `首字：独立 span` | HTML 含 `<span style="...">引</span>`，紧随其后剩余文字「用文字」保留原位置（`<p>` 内 span 后拼接） | 一致 |
| font-size | `2.2em` | `font-size: 2.2em` | 一致 |
| font-weight | `700` | `font-weight: 700` | 一致 |
| color | `--color-brand` | `color: #2D5A4E` | 一致 |
| font-family | `--font-family-heading` | `font-family: 'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif`（渲染输出为 HTML 实体转义形式，等价于 default 主题 `--font-family-heading` token 实值） | 一致 |
| display/vertical-align | `inline-block · vertical-align top（非 float）` | `display: inline-block; vertical-align: top` | 一致 |
| margin-right | `4px`（与 large-quote-mark 手法一致） | `margin-right: 4px` | 一致 |

## 三、悬挂对齐细节核查（样张特别标注项）

样张标注「不与 dropcap 叠加使用（二选一装饰）」「变体描述形态而非主题，供任意主题选用」——本次渲染验证两变体各自独立生效、互不干扰：`large-quote-mark` 渲染 HTML 中不含首字抽离逻辑，`dropcap` 渲染 HTML 中不含大引号装饰逻辑，二者互斥实现路径与样张标注的"二选一"设计意图一致。两变体渲染产物均未见 `float` 声明（AC-004 通则合规，与 `tests/core/blocks/quote-variants.test.ts` 断言一致）。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-152 AC-005 视觉一致性审查通过。
