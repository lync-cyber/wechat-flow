---
id: "design-review-compare-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-153"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — compare 对比 ledger 双色账本（T-153 AC-006）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-compare.png`（T-140 产出，规格源 `ui-spec-wechat-flow-block-variants#§10.6`，面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；渲染 `:::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}` container directive markdown（`themeId: "default"`），提取容器与两列 slot div 的实际 `style` 属性计算值。`tests/core/blocks/compare-ledger.test.ts` AC-001~AC-005 断言值仅作交叉参照，本次为独立渲染验证。

容差判定：hex 完全一致为准，布局 px/百分比值 ±1px 内视为一致。

## 结论

**approved** —— ledger 渲染结果与 T-140 样张逐项精确吻合，双色账本 table 布局参数、分隔线、标题独立块结构均无差异。

## 一、两列布局与色值

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 外层容器 display | `display: table + 2× table-cell（非 flex/grid）` | 外层 `display: table; width: 100%` | 一致 |
| 左列 display/width | `table-cell · width 50%` | `display: table-cell; width: 50%` | 一致 |
| 右列 display/width | `table-cell · width 50%` | `display: table-cell; width: 50%` | 一致 |
| 左列 bg | `status.tip 浅底 ≈ --color-surface-alt #F3F0EB` | `background: #F3F0EB` | 一致 |
| 右列 bg | `status.danger 浅底 ≈ --color-code-bg #F0EDE8 中性占位` | `background: #F0EDE8` | 一致（`--color-code-bg` 主题 token 表核实为 `#F0EDE8`） |
| 两列间分隔线 | `border-left: 1px --color-border #D6D3CE` | 右列 `border-left: 1px solid #D6D3CE` | 一致 |
| padding | `padding: 16px` | 左右列均 `padding: 16px` | 一致 |

## 二、标题独立块

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| 布局 | `标题跨两列（非嵌套于 table-cell 内）` | 标题 div 位于两列容器之前，独立块级，`style` 不含 `table-cell` | 一致 |
| text-align | `center` | `text-align: center` | 一致 |
| font-weight | `600` | `font-weight: 600` | 一致 |
| margin-bottom | `8px` | `margin-bottom: 8px` | 一致 |

## 三、内容渲染

- 左列文本同时含 label + value（"优点：速度快"），右列同理（"缺点：成本高"），与样张列内容展示一致。
- 收效映射（`color-coded` 空壳 → 重命名 `ledger` 并填充规格）在 `describeBlock("compare").variants` 层面属纯注册表结构断言，非视觉渲染范畴，未纳入本次视觉审查（`tests/core/blocks/compare-ledger.test.ts` AC-001 已覆盖）。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-153 AC-006 视觉一致性审查通过。
