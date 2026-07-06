---
id: "design-review-blockquote-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-142"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — blockquote 引用块 5 主题（T-142 AC-006）

## 审查方式

对照对象：`docs/design/frames/specimens/content-elements-blockquote.png`（T-139 产出，6 板样张之一，规格源 `ui-spec-wechat-flow-content-elements#§9.3`，各面板底部标注 token 名与实值）。

渲染实证路径：同 table 审查（见 `DESIGN-REVIEW-table-r1.md`），复用同一渲染脚本渲染统一 `> 这是一段引用内容，用于测试 blockquote 样式` Markdown，5 主题各执行一次 `renderMarkdown`，正则提取 `<blockquote>` 的 `style` 属性实际计算值。独立验证，未依赖测试文件；`tests/core/theme/blockquote-blocks.test.ts` 断言值仅作交叉参照，结果一致。

容差判定：hex 完全一致为准，布局 px 值 ±1px 内视为一致。

## 结论

**approved** —— 5 主题渲染结果与 T-139 样张逐项精确吻合，无色值/边框/间距/字体处理差异。

## 一、default（简约通用，现状微调）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-left | `4px --color-quote-border #2D5A4E` | `border-left: 4px solid #2D5A4E` | 一致 |
| 背景 | `--color-quote-bg #F3F0EB` | `background-color: #F3F0EB` | 一致 |
| padding | `10px 16px` | `padding: 10px 16px` | 一致 |
| 斜体 | `保留正常使用`（不去斜体） | `font-style: italic` | 一致 |

## 二、business（商务）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 双侧竖线 | `1px --color-brand #1A4F8A`（左右） | `border-left: 1px solid #1A4F8A; border-right: 1px solid #1A4F8A` | 一致 |
| 背景 | `透明` | `background-color: transparent` | 一致 |
| 文字色 | `--color-text-secondary #2D4057` | `color: #2D4057` | 一致 |
| padding | `8px 20px` | `padding: 8px 20px` | 一致 |

## 三、literary（文学）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-left | `1px --color-brand #7B4F2E · 无右边框` | `border-left: 1px solid #7B4F2E`（无 `border-right` 声明） | 一致 |
| 背景 | 无底（隐含 transparent） | `background-color: transparent` | 一致 |
| 文字色 | `--color-text-secondary #5A4228 · 衬线` | `color: #5A4228` | 一致 |
| 字距 | `1.2px` | `letter-spacing: 1.2px` | 一致 |
| 斜体 | 去斜体（衬线替代强调） | `font-style: normal`（非 italic） | 一致 |
| padding | `12px 20px`（ui-spec §9.3 补充值） | `padding: 12px 20px` | 一致 |

## 四、magazine（杂志）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| font-size | `1.15em（基准 16px → 18.4px）` | `font-size: 18.4px` | 一致 |
| border-left | `3px --color-brand #D4521A` | `border-left: 3px solid #D4521A` | 一致 |
| 字重 | `500 · 杂志摘引冲击力` | `font-weight: 500` | 一致 |
| padding | `12px 20px`（ui-spec §9.3 补充值） | `padding: 12px 20px` | 一致 |

## 五、tech（科技）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-left | `3px --color-brand #58A6FF · 无底` | `border-left: 3px solid #58A6FF` | 一致 |
| 背景 | 无底（避免与 bgSoft 混淆） | `background-color: transparent` | 一致 |
| 文字色 | `--color-text-secondary #8B949E` | `color: #8B949E` | 一致 |
| padding | `8px 16px`（ui-spec §9.3 补充值） | `padding: 8px 16px` | 一致 |

## 六、附注：magazine font-style 非 spec 差异化项（LOW，非缺陷）

magazine 主题渲染样式含 `font-style: italic`，样张标注与 `ui-spec-wechat-flow-content-elements#§9.3` magazine 小节均未提及 `font-style`（该小节仅声明 font-size/border-left/字重三项差异化），说明此为该主题既有基线样式（非本任务差异化范围内的属性），未与规格产生矛盾。样张为静态 PNG，CJK 字体斜体在视觉上不易分辨故未特别标注。不构成设计不一致，仅作记录供后续如需微调 magazine 字体处理时参考。

- **category**: consistency
- **root_cause**: reviewer-calibration
- **severity**: LOW

## 附：AC-001~AC-005 交叉核对

`tests/core/theme/blockquote-blocks.test.ts` 已覆盖 AC-001~AC-005 全部断言点，断言值与本次独立渲染输出逐项相符，无空心断言迹象（每条断言绑定具体计算样式属性值）。

## 判定

verdict: **approved_with_notes**

0 CRITICAL/HIGH，1 LOW（附注项，非缺陷记录）。T-142 AC-006 视觉一致性审查通过。
