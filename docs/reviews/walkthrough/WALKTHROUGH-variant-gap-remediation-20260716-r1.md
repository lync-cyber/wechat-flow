---
id: "walkthrough-variant-gap-remediation-20260716-r1"
doc_type: walkthrough
author: orchestrator
status: draft
deps: ["T-212", "variant-gap-triage-20260715-r1", "design-review-gallery-r2"]
consumers: ["orchestrator", "ui-designer", "architect"]
---

# 变体缺口治理批（T-190..T-211）终验走查 — T-212

## 走查基线

- 合并点：`main@86e9de6`（批 C 收口 PR #133，2026-07-16 合并）。批 A/B/C 全部落 main。
- 目录规模：**38 块 / 131 变体**（`listBlocks().length` / `listAllVariants().length` 实测）。

## 方法与权威性

编辑器 `InsertDrawer.vue` 对块库与变体选择器是**注册表的纯投影**：`listBlocks()` 直出块列表，变体选择器 `v-for="variant in selectedBlock.variants"` 无任何过滤 / 白名单 / 别名兜底。因此：

> 「某变体不在注册表中」⇔「该变体不出现在任何用户可选界面」。

据此走查采用两条互证路径：

1. **注册表投影全量断言**（消费与 InsertDrawer 完全相同的 `listBlocks()` 数据源）——机械、穷尽、可复算。
2. **编辑器实机 + 静态渲染取证**——在真实运行的编辑器中读取 InsertDrawer 投影的变体清单，并对关键变体渲染成品做 DOM 结构与视觉核对。

自动化只能坐实「变体可选 / 已删除项缺席 / 渲染 ≠ default / DOM 结构符合列/栏预期」。变体「渲染是否符合 triage 的**具体视觉设计意图**」无自动 oracle（T-212 卡片 notes 明载）——该层各变体的设计已在批 B/C 的逐项 DESIGN-REVIEW 获用户 sign-off，本走查确认那些已签样式在成品中确实渲染。

## AC 逐项结论

### AC-001 — 新增具名变体可选中且预览非纯文本 · PASS（客观层）

- 编辑器 InsertDrawer 实机确认新增具名变体可选中：`gallery` 呈 3 个 pill（标准图集 / 双列图集 / 三宫格图集）、`highlight-block` 呈 4 个 pill（默认 / 粗体 / 下划线 / 背景高亮）。
- 渲染携带各自 `data-variant` 且异于 default（非塌缩、非纯文本）：`quote.bordered ≠ quote.default`；`gallery.duo`/`.triptych` 渲染 `display: table` 布局；`gallery.default` 渲染单列全宽。
- 视觉意图符合性依赖批 B/C DESIGN-REVIEW 既有 sign-off。

### AC-002 — 结构性变体 DOM 走查 · PASS（客观层）

9 项结构性变体渲染均携带 `data-variant` 且结构异于 default：`steps.{timeline,circle-numbered}`、`quote.card`、`pull-quote.decorated`、`qa.bubble`、`dialog.interview`、`tip-grid.two-column`、`definition-list.two-column`、`timeline.horizontal`。

gallery 三形态 DOM 结构实测（静态渲染页直读）：

| 变体 | table 布局 | 首行 cell 数 | 判定 |
|---|---|---|---|
| `default` 标准图集 | 无 | 0（无 table-row） | 单列全宽堆叠 ✓ |
| `duo` 双列图集 | 有 | 2 | 2 列网格 ✓ |
| `triptych` 三宫格 | 有 | 3 | 3 列网格 ✓ |

与 `design-review-gallery-r2` 裁定的三独立形态一致。

### AC-003 — 已删除项不再出现于任何用户可选界面 · PASS

11 项删除变体在注册表中全部缺席（∴ InsertDrawer 无从渲染）：

- **T-208 十项**：`quote.large`、`card.horizontal`、`publication-skeleton.magazine`、`publication-skeleton.minimal`、`reading-time.badge`、`advert-card.horizontal`、`subscribe-cta.centered`、`image-caption.overlay`、`qrcode.with-logo`、`video.autoplay`。
- **T-206 条件性一项**：`highlight-block.gradient`（用户 sign-off DELETE）。
- **批 C 重裁附带**：`gallery.grid` / `gallery.masonry` / `gallery.carousel`。

编辑器实机佐证（变体计数已收敛）：图集 3 款、高亮块 4 款（`hasGradient=false`）、图片说明 2 款、二维码 2 款。

### AC-004 — audio/video default 不受 T-207 移除影响 · PASS

- `audio` / `video` 块仍注册，各自 `default` 变体幸存。编辑器实机：视频 1 款、音频 1 款（均仅 default）。
- T-207 撤下的 `audio::full` / `audio::mini` / `video::with-caption` 在 variants 数组中缺席（`known-blocked-variants.ts` 登记，待 architect 厘清 DOM 输出契约后重评估，非删除）。
- `default` 正常渲染空容器占位，不抛错、不影响其余管线。

### AC-005 — 走查报告 + event=user_decision · 报告已产出

本报告即 AC-005 交付。`event=user_decision`（design-signoff 语义）待用户对本报告 sign-off 后记录。

## 门禁状态

- 批 C 四门禁（合并前）全绿：vitest 4666 / cross-runtime golden SHA 不变 / biome / typecheck。
- `assertVariantFloor` 阈值 131（= 实测 `listAllVariants().length`）。
- PR #133 CI 全绿合并（visual-core / visual-sampled / cross-runtime / guards / quality-gate / bench）。

## 残留人工判断层

无阻断项。唯一非自动化层为各变体渲染与 triage 设计意图的**视觉美学符合性**——该层设计已在批 B/C 逐项 DESIGN-REVIEW 获 sign-off，本走查已确认对应样式在成品注册表 / 编辑器 / 渲染管线中真实生效。请用户对本报告做最终 sign-off 以记录 `user_decision` 事件并闭合 T-212。

## verdict

**approved**（客观层全 PASS；待用户 sign-off 记 `user_decision` 闭合本卡）
