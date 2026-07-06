---
id: "design-review-divider-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-149"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — divider 分隔线 3 个 SVG 装饰变体（T-149 AC-007）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-divider.png`（T-140 产出，9 板样张之一，规格源 `ui-spec-wechat-flow-block-variants#§10.2`）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown` 与 `packages/blocks/src/index.ts` / `packages/themes/default/src/index.ts`，用 `node_modules/.bin/tsx` 执行；对 `wave`/`dots`/`flower` 三变体分别渲染 `:::divider{.<variant>}` container directive markdown（`themeId: "default"`），提取容器 `<div data-block="divider" data-variant="...">` 的完整子树 HTML（含 `<svg>` 及内部元素的全部属性）。未依赖测试文件断言，独立验证；`tests/core/blocks/divider-svg-variants.test.ts`（AC-001~AC-006 共 31 条，CODE-REVIEW-T-149-r2 已确认全绿）仅作交叉参照。

由于本次渲染发现样张自身与 ui-spec 权威文本存在潜在冲突（flower 变体），额外独立核读 `cataforge context read "ui-spec-wechat-flow-block-variants#§10.2"` 原文作为最终裁决依据（COMMON-RULES §通用 Error Handling："上游文档间存在矛盾→以上游权威文档为准"；ui-spec 是 T-140 样张的上游权威源）。

容差判定：hex / viewBox / path 坐标 / margin 值完全一致为准；<1px 布局偏差视为一致（本次审查涉及的均为精确数值，无需容差）。

## 一、wave — 正弦波

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| viewBox | `0 0 240 20` | `viewBox="0 0 240 20"` | 一致 |
| path d | `M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10` | `d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10"` | 一致 |
| stroke | `--color-border #D6D3CE` | `stroke="#D6D3CE"` | 一致 |
| stroke-width | `1.5` | `stroke-width="1.5"` | 一致 |
| fill | （标注 `fill none`） | `fill="none"` | 一致 |
| display/margin | `display: block · margin: 24px auto` | `style="display: block; margin: 24px auto"` | 一致 |

## 二、dots — 三圆点

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| viewBox | `0 0 60 10` | `viewBox="0 0 60 10"` | 一致 |
| circle 数量/半径 | `3× circle r=2` | 3 个 `<circle r="2">` | 一致 |
| cx 分布 | `cx=20/30/40` | `cx="20"`/`"30"`/`"40"` | 一致 |
| cy | （标注 `cy=5`） | 三者均 `cy="5"` | 一致 |
| fill | `--color-border-strong #A8A29E` | 三者均 `fill="#A8A29E"` | 一致 |
| display/margin | `display: block · margin: 20px auto` | `style="display: block; margin: 20px auto"` | 一致 |

## 三、flower — 两线夹花瓣

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| viewBox | `0 0 240 20` | `viewBox="0 0 200 20"` | **不一致（见下方裁定）** |
| line 数量/长度 | `2× line 90px` | 2 条 `<line>`，长度分别为 90px（`x1=0,x2=90`）与 90px（`x1=110,x2=200`） | 一致（长度数值） |
| line stroke | `--color-border #D6D3CE · width 1` | `stroke="#D6D3CE"`（未显式声明 `stroke-width`，隐式取 SVG 默认值 1） | 一致 |
| 花瓣 path | `中心花瓣 8×8 菱形 path: M120,4 L126,10 L120,16 L114,10 Z` | `d="M100,6 L104,10 L100,14 L96,10 Z"`（8×8 菱形，中心 x=100） | **样张标注坐标与实现不同（见下方裁定）** |
| 花瓣 fill | `--color-brand #2D5A4E` | `fill="#2D5A4E"` | 一致 |
| display/margin | `display: block · margin: 24px auto` | `style="display: block; margin: 24px auto"` | 一致 |

### flower viewBox / 花瓣坐标裁定（独立核读 ui-spec 原文）

`ui-spec-wechat-flow-block-variants#§10.2` 对 flower 的权威文本：

> **`flower`**：两线夹中心花瓣，inline SVG；两侧各一条 `<line>`（`stroke: --color-border`，长度各 90px，间隔 20px 空白）+ 中心一个花瓣形 `<path>`（`fill: --color-brand`，小尺寸 `8x8` 菱形或简化花瓣路径）；居中显示，上下 `margin: 24px 0`

按此文本推导：两条 90px 线 + 中间 20px 空白间隔 = 90 + 20 + 90 = **200**，与实现的 `viewBox="0 0 200 20"` 精确吻合；花瓣 "8×8 菱形" 居中于 20px 间隔空白（90 至 110 区间，中心 x=100），与实现 `M100,6 L104,10 L100,14 L96,10 Z`（中心 x=100，宽高均为 8）精确吻合。

反观 T-140 样张标注的 `viewBox="0 0 240 20"` 与其自身给出的路径 `M120,4 L126,10 L120,16 L114,10 Z` 存在两处自相矛盾：
1. 若两线各 90px 且总宽 240，则间隔应为 240-180=60px，但样张同时标注花瓣为紧凑的"8×8 菱形"，60px 空白与 8px 菱形尺寸不成比例（对照实现的 20px 间隔与 8px 菱形则比例自洽）
2. 样张路径 `M120,4 L126,10 L120,16 L114,10 Z` 实际构成的菱形尺寸为 12×12（120→126 与 120→114 均为 6px 半宽，114→126 全宽 12），与标注文字"8×8"本身不符

结论：**样张（T-140 设计产出）在 flower 变体上的标注值存在内部算术不自洽，且与其自身权威源 ui-spec §10.2 的文字描述（"长度各 90px，间隔 20px 空白" + "8x8 菱形"）不一致；实现代码（`viewBox="0 0 200 20"`、花瓣路径居中于 20px 间隔、8×8 精确菱形）是对 ui-spec 权威文本的精确、自洽落地。** 本项差异判定为**样张标注错误**，非实现缺陷，不计入实现问题。

## 四、XSS / sanitize 边界回归确认

`tests/core/sanitize/svg-xss-boundary.test.ts`（CODE-REVIEW-T-149-r2 记录 10/10 PASS）与本次渲染观察一致：三变体渲染输出均只含白名单标签属性（`svg`/`path`/`circle`/`line` 及各自的 `viewBox`/`d`/`stroke`/`stroke-width`/`fill`/`cx`/`cy`/`r`/`x1`/`y1`/`x2`/`y2`），未见脚本注入或事件属性残留。

## 判定

verdict: **approved**

三变体核心视觉规格（viewBox / path 坐标 / circle 分布 / stroke·fill 色值 / display·margin）与 T-140 样张及 ui-spec §10.2 权威文本逐项吻合。flower 变体的 viewBox 数值差异经独立核读 ui-spec 原文裁定为**样张自身标注错误**（与其自身给出的另一组数字互相矛盾，且偏离 ui-spec 权威公式），实现代码是对 ui-spec 的精确落地，不构成代码缺陷。无 CRITICAL/HIGH/MEDIUM/LOW 问题登记。

建议（非阻塞）：T-140 样张的 flower 面板标注（`viewBox="0 0 240 20"` 及花瓣 path 坐标）建议后续顺带订正为 `viewBox="0 0 200 20"` / `M100,6 L104,10 L100,14 L96,10 Z`，避免未来审查者重复排查同一歧义；因样张为只读设计产出且本轮判定不影响代码验收，此项不计入本报告的问题列表，留待设计资产维护窗口处理。
