---
id: "design-review-table-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-141"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — table 表格 5 主题（T-141 AC-006）

## 审查方式

对照对象：`docs/design/frames/specimens/content-elements-table.png`（T-139 产出，6 板样张之一，规格源 `ui-spec-wechat-flow-content-elements#§9.2`，各面板底部标注 token 名与实值）。

渲染实证路径：编写最小 node 脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown` 与 5 个主题包（default/business/literary/magazine/tech），渲染统一 3 行 2 列 Markdown 表格，用 `npx tsx` 执行，正则提取 `<table>`/`<th>`/`<td>` 的 `style` 属性实际计算值。未依赖测试文件断言，独立验证；`tests/core/theme/table-blocks.test.ts` 断言值仅作交叉参照，结果与本次独立渲染完全一致。

容差判定：hex 完全一致为准（样张标注即设计权威），布局 px 值 ±1px 内视为一致。

## 结论

**approved** —— 5 主题渲染结果与 T-139 样张逐项精确吻合，无色值/边框/斑马纹/padding 差异。

## 一、default（简约通用）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| th 背景 | `--color-surface-alt #F3F0EB` | `background-color: #F3F0EB` | 一致 |
| th 字重 | `600` | `font-weight: 600` | 一致 |
| td/th border | `--color-border #D6D3CE 四边完整边框` | `border: 1px solid #D6D3CE`（th 与 td 均含） | 一致 |
| padding | `8px 12px` | `padding: 8px 12px`（th/td 均含） | 一致 |
| 斑马纹 | 无（明确不使用） | td 各行均无 `background-color` 差异（row1/row2/row3 一致） | 一致 |
| table 基线 | `border-collapse: collapse` | `border-collapse: collapse; width: 100%` | 一致 |

## 二、business（商务）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| th 背景 | `--color-brand #1A4F8A 反白` | `background-color: #1A4F8A` | 一致 |
| th 字重 | `700` | `font-weight: 700` | 一致 |
| th 文字色 | 反白（隐含 `--color-text-inverse`） | `color: #FFFFFF` | 一致 |
| th 边框 | `无边框` | `border: none` | 一致 |
| td 边框 | `仅横向 hairline #D0D9E4 无竖线` | `border: none; border-bottom: 1px solid #D0D9E4` | 一致 |
| 斑马纹 | `--color-surface-alt #EEF2F7`（偶数行） | row2（偶数）`background-color: #EEF2F7`；row1/row3（奇数）无该背景色 | 一致 |

## 三、literary（文学）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| th 背景 | `透明` | `background-color: transparent` | 一致 |
| th 文字色 | `#5A4228` | `color: #5A4228` | 一致 |
| th 字重 | `500` | `font-weight: 500` | 一致 |
| th 字距 | `字距 0.5px` | `letter-spacing: 0.5px` | 一致 |
| th 底线 | `--color-border-strong #B8A882` | `border-bottom: 1px solid #B8A882` | 一致 |
| td 边框 | `仅 border-bottom #DDD4C0 无竖线` | `border-bottom: 1px solid #DDD4C0`（无 `border` 竖线声明） | 一致 |
| 斑马纹 | 无 | 各行 td 均无 `background-color` 声明，行间一致 | 一致 |

## 四、magazine（杂志）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| th 背景 | `透明` | `background-color: transparent` | 一致 |
| th 文字色 | `#1A1208` | `color: #1A1208` | 一致 |
| th 字重 | `700` | `font-weight: 700` | 一致 |
| th 底线 | `--color-brand #D4521A 2px（呼应 accent）` | `border-bottom: 2px solid #D4521A` | 一致 |
| td 边框 | `仅 border-bottom #E8D8C4` | `border-bottom: 1px solid #E8D8C4`（无竖线） | 一致 |
| 斑马纹 | 无 | 各行 td 均无 `background-color` 声明 | 一致 |

## 五、tech（科技）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| th 背景 | `--color-surface-alt #21262D` | `background-color: #21262D` | 一致 |
| th 字重 | `600` | `font-weight: 600` | 一致 |
| th/td 文字色 | 暗色主题次级表面（隐含 `--color-text-primary`） | `color: #E6EDF3` | 一致 |
| td/th border | `#30363D 四边` | `border: 1px solid #30363D`（th 与 td 均含） | 一致 |
| padding | `6px 10px`（紧凑型） | `padding: 6px 10px`（th/td 均含） | 一致 |
| 斑马纹 | `--color-background #0F1117`（偶数行） | row2（偶数）`background-color: #0F1117`；row1/row3（奇数）无该背景色 | 一致 |

## 附：AC-001~AC-005 交叉核对

`tests/core/theme/table-blocks.test.ts` 已覆盖 AC-001~AC-005 全部断言点，断言值与本次独立渲染输出逐项相符，无空心断言迹象（每条断言绑定具体计算样式属性值，非仅字符串存在性）。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-141 AC-006 视觉一致性审查通过。
