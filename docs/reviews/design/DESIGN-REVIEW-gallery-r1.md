---
id: "design-review-gallery-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-156"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — gallery 图集 duo/triptych 两变体（T-156 AC-007）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-gallery.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.9`，两面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；渲染 `duo`（4 图，含 2 条 caption）与 `triptych`（6 图，验证换行分组）两组 `:::gallery{.<variant>}` container directive markdown（`themeId: "default"`），提取 table-row/table-cell/caption div 的实际 `style` 属性计算值。`tests/core/blocks/gallery-variants.test.ts` AC-001~AC-004 断言值仅作交叉参照，本次为独立渲染验证。

容差判定：hex 完全一致为准，布局 px/百分比值 ±1px 内视为一致。

## 结论

**approved** —— duo/triptych 渲染结果与 T-140 样张逐项精确吻合，table 布局分组、cell 尺寸参数、caption 样式均无差异。

## 一、duo — 双列（table 布局）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 分组规则 | `每 2 图一组 table-row` | 4 图渲染出 2 个 `display: table-row` 分组，每组 2 个 cell | 一致 |
| cell display/width | `table-cell · width 50%` | `display: table-cell; width: 50%` | 一致 |
| cell padding | `4px` | `padding: 4px` | 一致 |
| 图片 width | `100%` | `width: 100%` | 一致 |
| 图片圆角 | `--decoration-border-radius-sm 3px` | `border-radius: 3px` | 一致 |
| caption | `独立 div 居中 · --font-size-sm · --color-text-muted #78716C` | `color: #78716C; font-size: 13px; text-align: center`，独立 div，仅含 caption 的图片渲染 | 一致 |

## 二、triptych — 三宫格（table 布局）

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 单行分组 | `单 row 内 3× table-cell` | 6 图渲染出 2 个 `display: table-row`，每组各 3 个 cell | 一致 |
| cell width | `33.33%` | `width: 33.33%` | 一致 |
| cell padding | `3px` | `padding: 3px` | 一致 |
| 换行规则 | `超过 3 张按每 3 张一组换行（新增 table-row）` | 6 图正确分为 2 组 × 3 cell，每组独立 `table-row` | 一致 |

## 三、外层容器与排除项

- 两变体外层容器均为 `display: table; width: 100%`，与样张标注 "display: table" 一致，非 flex/grid/masonry 布局。
- 样张标注「grid/masonry/carousel 保留 ID 但按 duo/triptych table 布局降级渲染，瀑布流/轮播依赖 JS 与静文流·与静态 inline HTML 产物定位冲突」——本轮仅验证 duo/triptych 两个已声明变体的渲染契合度，grid/masonry/carousel 降级路径已由 `tests/core/blocks/gallery-variants.test.ts` AC-005/AC-006 独立覆盖，非本次审查范围。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-156 AC-007 视觉一致性审查通过。
