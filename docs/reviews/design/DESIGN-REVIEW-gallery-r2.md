---
id: "design-review-gallery-r2"
doc_type: design-review
author: orchestrator
status: approved
deps: ["ui-spec-wechat-flow-block-variants", "variant-gap-triage-20260715-r1"]
consumers: ["orchestrator", "ui-designer"]
---

# 设计裁定 — gallery 图集变体目录整体重裁

## 触发

批 C（T-210）将渲染期变体差分守卫由 WARN 翻转为 RED（全量注册表 finding 须为空集）。全量扫描实证暴露 `gallery.duo`、`gallery.grid` 渲染与 `gallery.default` 字节完全相同。溯源确认：`gallery.default` 无独立形态，其 decorate 对**任意**变体（含 default）经 `GALLERY_COLUMNS_BY_VARIANT` 折算列数并覆盖 `data-variant`，使 default 自身即渲染为 `duo`（2 列）态，导致 default / duo / grid 三者塌缩同构。

`variant-gap-triage-20260715-r1` 曾将 `gallery.grid` 裁为 EXEMPT（视其为 ui-spec §10.9 的既定 fallback），但该口径未覆盖 `gallery.duo`，且未消解「default 与主力变体冗余」的根问题。用户裁定对 gallery 变体目录做整体重裁。

## 现状目录问题梳理（6 变体）

| 变体 | 现渲染 | 问题 |
|---|---|---|
| default 标准图集 | 空条目 → decorate 折算 2 列（duo 态） | 无独立形态，与 duo 冗余 |
| duo 双列 | 2 列 table（DESIGN-REVIEW-gallery-r1 已 approved） | 主力实现，但与 default 同构 |
| triptych 三宫格 | 3 列 table（DESIGN-REVIEW-gallery-r1 已 approved） | 主力实现 |
| grid 网格 | 空条目 → 折算 duo（2 列） | 与 duo 命名冗余、与 default 同构 |
| masonry 瀑布流 | 空条目 → 折算 triptych（3 列） | 名不符实：无真瀑布流，静态回退 |
| carousel 轮播 | 空条目 → 折算 triptych（3 列） | 名不符实：无真轮播，静态回退 |

## 裁定

收敛为 3 个各具独立形态的变体：

| 变体 | 渲染 | 说明 |
|---|---|---|
| `default` 标准图集 | 单列全宽堆叠：每图独占一行 `display: block`，`width: 100%`，行间 `margin-bottom: 12px`，根容器 `margin: 16px 0` | 新独立形态，作为裸指令基线 |
| `duo` 双列 | 2 列 table（不变） | 主力实现 |
| `triptych` 三宫格 | 3 列 table（不变） | 主力实现 |

**删除** `grid` / `masonry` / `carousel`。

## 理由

- **差分守卫归零无需 allowlist**：差分守卫以各变体比对 default。default 获得独立单列形态后，duo（2 列）、triptych（3 列）自然与之相异，finding 归零，无需将任何变体登记进 `intentional-plain-variants` 掩盖。
- **消除冗余与名不符实**：`grid` 与 `duo` 同为 2 列静态渲染，命名冗余；`masonry`/`carousel` 承诺瀑布流/轮播交互，但产物契约为「经微信粘贴过滤后视觉一致的静态 inline-styled HTML」，无 JS 交互——保留名不符实的空别名违背产品定位（与 triage 对 `video.autoplay` 的 DELETE 先例同构）。
- **避免向后兼容包袱**：ui-spec §10.9 原以「向后兼容 directive 语法不破坏」保留三别名；本项目无外部既有内容依赖，`amendment-variant-mechanism-20260715-r1#§4.3`「避免向后兼容」顶层原则适用，删除优于保留 vestigial 别名。

## 影响

- `packages/blocks/src/blocks/gallery.ts`：删 3 变体、default 补单列 baseStyle、decorate 移除 `data-variant` 覆盖（别名删除后 effectiveVariant 折算退化为恒等）。
- `ui-spec §10.9`：随本裁定 amend（default 独立形态定义；移除 grid/masonry/carousel fallback 段）。
- `tests/core/blocks/gallery-variants.test.ts`：删 grid/masonry/carousel fallback 用例（AC-005/AC-006），新增 default 单列保真断言。
- 视觉基线：删 grid/masonry/carousel 孤儿快照；`gallery.default` × 5 主题重 seed。
- `assertVariantFloor`：随变体总量收敛（131）更新。

## 判定

verdict: **approved**（用户 sign-off 整体重裁 3 变体清目录）
