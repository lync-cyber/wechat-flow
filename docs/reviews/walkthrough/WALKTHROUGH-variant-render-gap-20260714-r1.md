---
id: "walkthrough-variant-render-gap-20260714-r1"
doc_type: walkthrough
author: orchestrator
status: draft
deps: ["T-172"]
consumers: ["orchestrator", "ui-designer", "architect"]
---

# 变体渲染缺口全量清点 — T-172 r3 走查期间用户发现

## 触发

T-172 r3 编辑器走查阶段，用户以 `t157-directive-regression.md` 全量 fixture（32 指令块）载入编辑器，肉眼发现 12 个变体渲染为无样式纯文本。主线程以真实渲染管线（`renderMarkdown` + default 主题）全量清点全部注册块×变体后，实际缺口远大于用户所见。

## 判据（渲染 oracle，非源码字面）

对每个注册块的每个具名变体，与同块 `default` 变体渲染同一内容：

- **A 类（丢失块级基线）**：`default` 根节点带 style、具名变体根节点**无任何 style 属性**——变体比 default 更裸。
- **B 类（视觉 no-op）**：变体产物与 default 产物**字节级相同**（仅 `data-variant` 值不同）——变体存在与否无任何视觉差异。
- **C 类（default 根裸奔）**：块自身 `default` 根节点无 style（其中 heading/paragraph/list/code-block/divider 等由主题元素样式承载视觉，不必然缺陷；dialog/highlight-block 等则整块裸）。

全部诊断输出为 0 条——缺口对编辑器诊断面板**完全静默**。

## 机制根因（A 类）

`packages/core/src/registry/variant.ts` `getBlockBaseStyle()`：`variantId === "default"` 解析到块级 `baseStyle.root`；具名变体仅解析**自身** `baseStyle`，无则回退自定义变体注册表，再无则返回 `{}`——**具名变体不回退块级基线**。凡 `defineBlock` 变体表中只写 `{ id, label }` 不带 `baseStyle` 的条目（大量存在），选中即丢失全部根样式。`packages/core/src/registry/variant.test.ts` 以测试锁定了该无回退行为，属有意实现——但与「变体=在块基线上叠加视觉差分」的直觉语义相悖，须 architect 裁定：改机制（回退块基线）还是改资产（逐变体补 `baseStyle`）。

## A 类清单（59 项）

table.striped / table.bordered / table.compact / table.highlight-header ·
quote.bordered / quote.centered / quote.filled / quote.minimal / quote.large / quote.italic / quote.card ·
card.elevated / card.outlined / card.horizontal / card.minimal ·
steps.horizontal / steps.numbered / steps.circle-numbered / steps.timeline / steps.arrow / steps.minimal / steps.filled / steps.compact ·
compare.highlight-right / compare.table-style / compare.compact ·
pull-quote.large / pull-quote.minimal / pull-quote.bordered ·
author-card.centered / author-card.minimal ·
publication-skeleton.magazine / publication-skeleton.minimal ·
kpi-card.highlight / kpi-card.compact ·
qa.bubble / qa.bold-q ·
footnote.numbered / footnote.inline ·
tip-grid.two-column / tip-grid.card-style ·
warning.banner / warning.inline ·
disclaimer.compact / disclaimer.bordered ·
reading-time.badge / reading-time.inline ·
citation.footnote-style / citation.inline-link ·
definition-list.two-column / definition-list.card-style ·
advert-card.horizontal / advert-card.minimal ·
related-cards.compact / related-cards.grid ·
social-cta.icon-left / social-cta.full-width ·
subscribe-cta.centered / subscribe-cta.banner

注：部分条目（如 quote.minimal）语义上可能「本意即无装饰」，是否保留由 ui-designer 逐项裁定；但 table.striped、steps.numbered 等显然名不符实。

## B 类清单（37 项，含属性门控假阳性）

heading.underline / heading.centered ·
paragraph.indented / paragraph.spaced ·
list.bullet / list.numbered / list.checklist ·
code-block.light / code-block.minimal ·
divider.thick / divider.dotted / divider.dashed ·
image.rounded / image.full-width ·
image-caption.overlay / image-caption.side ·
gallery.grid ·
pull-quote.decorated（**假阳性**——`author` 属性门控，传属性即生效，实现完好）·
highlight-block.gradient / highlight-block.bold / highlight-block.underline / highlight-block.background ·
dialog.interview ·
timeline.horizontal / timeline.compact ·
qrcode.with-logo / qrcode.card ·
video.autoplay / video.with-caption ·
audio.mini / audio.full ·
miniprogram-card.large / miniprogram-card.compact ·
footer-cta.centered / footer-cta.full-width ·
recommendation.card / recommendation.compact

注：qrcode/video/audio/miniprogram-card 族可能同属属性门控假阳性（测试未传媒体属性），须 ui-designer 复核剔除；paragraph.indented、heading.underline、list.checklist、divider.thick 等为无属性依赖的确定 no-op。

## C 类（default 根无 style 的块，16 项）

heading / paragraph / list / code-block / divider / image / image-caption / highlight-block / dialog / timeline / qrcode / video / audio / miniprogram-card / footer-cta / recommendation

其中 heading/paragraph/list/code-block/divider/image 由主题元素样式或 decorate 钩子承载视觉（divider.wave/dots/flower 实测正常），非缺陷；dialog.default、highlight-block.default 等整块裸渲染为纯文本，属真缺口。

## 门禁盲区（为何 850 基线全绿仍漏）

`e2e/visual/snapshots/linux/` 对上述变体的基线快照**全部存在且门禁绿**——基线当初直接从当时（已缺样式）的渲染 seed，此后每次对比都是「坏渲染 vs 坏基线」自证通过。视觉回归门禁只能抓**漂移**，不能抓**从未正确**；与「校验阈值不得拟合现状」同一失效模式。外部 oracle（本次为 ui-spec 期望 + 用户肉眼）是唯一能抓「从未实现」的手段。

## 与 ui-spec 的关系

ui-spec §10 仅为 9 个块的**特定装饰变体**定稿视觉规格（callout 四态、divider 装饰族、pull-quote.decorated、steps.card、quote.large-quote-mark/dropcap、compare.ledger、dialog.chat-bubbles、announcement.danger-bar、gallery.duo/triptych）——这些实测全部正常。缺口变体均无 spec 定义：属「注册面先行、规范与实现未跟上」的 completeness 缺口，root_cause=upstream-caused（变体清单在 taxonomy 期登记，视觉规格阶段未逐项收敛）。

## 对 T-172 r3 / T-188 sign-off 的影响

**不阻塞。** 两卡标的（pull-quote.decorated、quote.large-quote-mark、quote.dropcap、paragraph.dropcap、dialog.chat-bubbles）全部渲染正常（用户截图坐实）。本缺口为独立缺陷簇，另行立项。

## 处置建议

1. **ui-designer**：对 A+B 清单逐项裁定「保留补 spec / 收敛删注册」——变体清单是产品承诺面，名不符实比功能少更伤信任；先裁清单再谈实现。
2. **architect**：裁定 A 类机制——具名变体是否回退块级基线（改 `getBlockBaseStyle` 一处 vs 逐变体复制基线声明；注意回退会即时改变 59 个变体的渲染产物与全部相关基线/golden SHA）。
3. **守卫**：新增「注册变体渲染 no-op 检测」——对每块每变体渲染对比 default，no-op（且无属性门控豁免标注）即 CI 红；防清单再次腐化。
4. **基线重 seed**：随修复批触发 visual-update workflow 全矩阵重生成，杜绝坏基线循环。
