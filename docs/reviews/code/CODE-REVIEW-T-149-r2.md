---
id: "code-review-T-149-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-149"]
consumers: ["orchestrator"]
---

# CODE-REVIEW T-149 r2 — divider SVG 装饰变体 margin 修复 + schema 白名单收紧复审

## 复审范围（revision diff）

- `packages/core/src/pipeline/divider-decoration.ts`（R-001 修复：`svgStyle` 签名改单值垂直分量）
- `packages/core/src/sanitize/schema.ts`（R-003/R-004 修复：`circle.stroke`、冗余 `svg.style` 清理）
- `tests/core/blocks/divider-svg-variants.test.ts`（AC-006 断言收紧为全等匹配 + R-002 新增 5 条守护测试）

未涉及 `apps/editor`（并行复审范围，本轮不审）。

## R-001（HIGH）margin 终值裁定

### 独立核读 ui-spec 原文

`cataforge context read "ui-spec-wechat-flow-block-variants#§10.2"` 原文分两层表述：

1. **各变体分述行**：wave/flower "居中显示，上下 `margin: 24px 0`"；dots "居中显示，上下 `margin: 20px 0`"
2. **三者统领通则句**（紧随分述行之后）："三者均以 inline SVG 实现（§9.1 通则已验证微信平台兼容），`<svg>` 外层 `display: block`，`margin: {值} auto`"

裁定：分述行的 "24px 0" / "20px 0" 是对该变体**垂直间距量**的自然语言简写描述（"上下 24px"），不是逐字的 CSS shorthand 字面值；通则句才是三变体共享的、可直接落地为 CSS 的权威产出规格 —— `{值}` 回填分述行给出的垂直分量数值（24px / 20px），`auto` 是通则句显式追加的水平分量，语义上对应"居中显示"这一分述行已声明的效果（SVG 无 `width` 属性时，唯有 `margin-left/right: auto` 才能在块级布局下产生居中效果；`margin: 24px 0` 的 2-value 简写形式 left/right 固定为 `0` 而非 `auto`，不会居中，与分述行自身宣称的"居中显示"矛盾）。

**结论：revision 依 ui-spec 通则句取 `24px auto` / `20px auto` 是规格正解，resolved。**

dev-plan 任务卡 AC-006 原文"wave/flower `24px 0`，dots `20px 0`"核实为对 ui-spec 分述行的直接转写，遗漏了紧随其后统领全局的通则句（转写失真，非 ui-spec 本身歧义）。按 COMMON-RULES §通用 Error Handling"上游文档间存在矛盾→以上游权威文档为准"，ui-spec 是 dev-plan 的上游权威源，此处应以 ui-spec 通则为准；revision 未回改 dev-plan 卡面文字，但已用测试断言精确匹配 ui-spec 权威值（`toBe("display: block; margin: 24px auto")` 等），符合行为契约要求；卡面文字本身的更新超出本次代码 revision 范围，不阻塞本轮判定。

### 代码验证

`divider-decoration.ts:6-8`：
```
function svgStyle(verticalMargin: string): string {
  return `display: block; margin: ${verticalMargin} auto`;
}
```
三处调用点分别传入 `"24px"`（wave/flower）/ `"20px"`（dots）单值，与函数参数名 `verticalMargin`（已从 `margin` 改名，消除歧义）语义一致，不再产生 3-value shorthand。

**实测**（`pnpm vitest run tests/core/blocks/divider-svg-variants.test.ts tests/core/sanitize/svg-xss-boundary.test.ts`）：31/31 PASS（26 原有 + 5 新增）。AC-006 三条断言分别验证：
- wave: `display: block; margin: 24px auto`
- dots: `display: block; margin: 20px auto`
- flower: `display: block; margin: 24px auto`

均为全等匹配，无子串掩蔽风险（见下）。R-001 **resolved**。

## R-002（MEDIUM）测试覆盖补充有效性

新增两组测试（`divider-svg-variants.test.ts:170-212`）：

1. `default`/`thick` 变体渲染不含 `<svg>` 标签——真实调用 `renderMarkdown` 走 `walk()` 未命中 `DIVIDER_SVG_VARIANTS` 分支，断言 `container` 不含 `"<svg"` 子串。断言绑定真实渲染输出，非 mock/spy 调用计数。
2. 省略 `themeId` 渲染 wave/dots/flower，断言色值等于硬编码 fallback 常量（`#D6D3CE`/`#A8A29E`/`#2D5A4E`）——核读 `render.ts:29-37` 确认 `renderMarkdown(input)` 不传 `options` 且无 frontmatter `meta.theme` 时 `effectiveTheme` 保持 `undefined`，`injectDividerDecorations(hast, undefined)` 真实触发 `theme?.tokens ?? {}` 空对象分支，逐 token `?? fallback` 生效，非伪装的真实路径。

两组测试断言真实、路径真实，非弱断言。**resolved**。

## R-003（LOW）`circle.stroke` 冗余属性

`schema.ts:9` 由 `["cx", "cy", "r", "fill", "stroke"]` 改为 `["cx", "cy", "r", "fill"]`，与 `buildDotsSvg`（divider-decoration.ts:34-49）实际生成属性集完全对齐（仅 `cx`/`cy`/`r`/`fill`）。**resolved**。

## R-004（LOW）`svg.style` 与全局 `*.style` 重复声明

`schema.ts:7` 由 `["viewBox", "style"]` 改为 `["viewBox"]`；`*` 全局白名单（schema.ts:19-28）仍含 `"style"`，continue 兜底覆盖，svg 元素的 `style` 属性未被剥离（已随 R-001 的 AC-006 测试间接验证：三变体渲染输出均保留 `style` 属性且值精确匹配）。svg 专属白名单现只保留 `viewBox`——该标签独有、非全局属性覆盖的部分，符合建议的"更准确反映最小集"目标。**resolved**。

## XSS 边界回归确认（无新引入问题）

`tests/core/sanitize/svg-xss-boundary.test.ts` 10/10 PASS，与 r1 记录条数一致：`<script>` 子元素、`onload`/`onclick`/`onmouseover` 事件属性、`javascript:` URI（含伪造 divider 属性路径）、`foreignObject`/`use[href]`/`animate` 未白名单标签均仍被剥离。`circle.stroke` 移除收紧了白名单（减小攻击面，非扩大）；`svg.style` 移除对安全边界无影响（`*` 全局仍放行 `style`，该风险面 r1 已归类为 pre-existing、当前不可达、非本卡引入，本轮未见变化，无需重新评估）。

未发现新引入问题：diff 仅涉及 3 处属性值收紧 + 1 处函数签名语义澄清，未新增分支逻辑、未改变 sanitize 白名单以外的行为。schema.ts 中同 diff 出现的 `data-dialog-avatar` 新增属于并行任务（T-154 dialog chat-bubbles）混入的无关变更，与本卡 R-001..R-004 无关，不在本轮复审范围内评判。

## 问题列表

无 CRITICAL/HIGH/MEDIUM/LOW 遗留问题。R-001/R-002/R-003/R-004 全部 resolved。

## Verdict

**approved**

r1 登记的 1 个 HIGH（R-001）+ 1 个 MEDIUM（R-002）+ 2 个 LOW（R-003/R-004）全部已修复且核实有效。margin 终值裁定：`24px auto` / `20px auto` 为 ui-spec §10.2 通则句权威正解，dev-plan AC-006 卡面文字系对分述行的转写遗漏（未转录通则句），非阻塞项，可在后续文档维护中顺带订正卡面措辞。测试收紧为全等匹配，XSS 边界 10 条无回归。
