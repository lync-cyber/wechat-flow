---
id: "sprint-review-s6-r3"
doc_type: sprint-review
author: orchestrator
status: approved
deps: ["dev-plan-wechat-flow-s6"]
---

# SPRINT-REVIEW s6 r3 — T-131 AC-004 二轮视觉 sign-off 残差登记

## 范围

仅登记 **T-131 AC-004 二轮深核验**（PR #89~#92 修复后前端 vs Penpot 全量重比）的 `blocking_conditions` disposition。**不重审任何任务卡**；Sprint 6 DONE 判定维持 [`SPRINT-REVIEW-s6-r2.md`](SPRINT-REVIEW-s6-r2.md) `approved` 不变，项目 `completed` 状态不回退。本报告是 T-131 deliverable「残差差异随 sprint-review 报告登记」的落点（该卡不新建 DESIGN-REVIEW 文件）。

上一轮（[`SPRINT-REVIEW-s6-r1.md`](SPRINT-REVIEW-s6-r1.md) §T-131 conditional_release 残差收口登记）的 3 条 blocking（P-002 桌面文档列表未实现 / P-005 移动预览 fixture 未 seed / 14 交互组件 static overlay 未捕获）在 PR #89~#92 处理：交互组件改为交互驱动截图后捕获，暴露了此前静态截图退化未采到的组件级视觉差异，故本轮重比覆盖面显著扩大。

## 核验方法与总体结论

- **方法**：按 `docs/design/reports/overlay-precheck.json` score 从高到低，6 个并行比对代理逐对读 `overlay-report.html` 的 23 组件 + 5 页面（56 张图），配合像素级色值采样与前端源码佐证（`ThemeCard.vue` / `BaseModal.vue` / `PaintDrawer.vue` / `SettingsPage.vue` / `packages/themes/*/src/index.ts` / `tokens.ts`）。用户逐节采纳预审建议。
- **token 层零失配**：所有可采样色值（`#2d5a4e` / `#e8e4dc` / `#8c6a1a`+`#f5edda` / `#e6efed` / `#a3c4bc` / `#4a4541` 等）设计与前端逐像素一致，与 AC-001 token-diff 83 项 `exit 0` 互相印证。
- **高 score 归因**：precheck 高 score 主由「设计拼版（一板多变体）vs 前端运行时精确裁剪」的 aspect-ratio 导出粒度差异驱动，非真实视觉缺陷。
- **verdict = `conditional_release`**：28 节中 4 节判一致、24 节存在差异，按 COMMON-RULES §verdict_blocking_semantics 及 T-131 AC-005 产出 `conditional_release` 而非 `approved`。

## 上轮 blocking 复核

| 上轮条件 | 本轮实证 | 结论 |
|---------|---------|------|
| P-002 桌面文档列表未渲染 | 「+ 新建」绿钮 `#2d5a4e` + populated 列表项真实渲染；激活项 `#e6efed` 底、标题 `#2d5a4e`、左侧指示条精确 2px、副标题 `#7a746c`，与 spec populated 定义逐项吻合 | **已解除** |
| 14 交互组件 static overlay 未捕获 | 交互驱动截图全部截到组件态，本轮已逐项比对 | **已解除** |
| P-005 移动预览正文空（fixture 未 seed） | 本轮截图正文区仍完全空白，修复未生效于该截图链路 | **未闭环** → 转 BC-10 |

## 28 节裁决分布

| 判定 | 数量 | 节 |
|------|------|----|
| 一致（导出粒度差异，sign-off 通过） | 4 | UC-004 / UC-010 / UC-012 / P-001 |
| 存在差异（转 blocking_conditions / backlog） | 24 | 其余全部（含 7 个 LOW 单点：UC-001/002/005/006/009/018/P-002，并入相关 BC 或接受偏差） |

## blocking_conditions（本轮 sign-off 产出）

> 格式对齐 AC-005 `{ condition, owner, detail }`。design-side 项 owner = ui-designer。

| ID | severity | owner | condition / detail |
|----|----------|-------|--------------------|
| BC-1 | **HIGH** | developer | UC-019 视觉差异待收敛 — 5 内置主题 `paintable` 全为 `{}`（`packages/themes/*/src/index.ts:25`）致 usePaintBinding 恒空、设计 6-token 填充态不可达；PaintDrawer 缺「重置默认值 / 应用」footer 与显式应用语义；行结构失配（原生 color input vs 色板圆点+hex+⚠）。连带 UC-020「应用到当前主题」应用面为空 |
| BC-2 | MEDIUM | developer | 图标体系视觉差异待收敛 — UC-016 菜单前置图标缺失 / UC-011 Toast 类型图标缺失 / UC-015 InsertDrawer 紫色占位图标离板 / UC-008 emoji 图标 + 皮肤数 pill 容器缺失 / UC-018 拖拽箭头缺失（合并为图标体系统一收敛） |
| BC-3 | MEDIUM | developer | UC-013 视觉差异待收敛 — 诊断 issue 行缺「查看 / 查看变更」行级操作链接（收起 affordance / 计数 chips 位置 / 行分隔样式随同收敛） |
| BC-4 | MEDIUM | developer | UC-023 视觉差异待收敛 — 状态栏可读性/违规词/夜间风险指标段与竖分隔线、三态语义着色：先以带 issue 文档态重截甄别「空态隐藏 vs 未实现」再定收敛面 |
| BC-5 | MEDIUM | developer | UC-003 视觉差异待收敛 — ghost 变体按钮多余 1px 灰描边 + 填充容器，设计与 ui-spec 均定义无边框透明图标钮 |
| BC-6 | MEDIUM | developer | UC-017 视觉差异待收敛 — 修订预览信息架构（前端 规则ID计数列表+行内删除线 diff vs 设计 原文/修订后双栏+中文分类统计侧栏）+ 英文 mono 规则 ID 展示与产品中文定位相悖；或裁决反向登记设计侧对齐 |
| BC-7 | MEDIUM | developer | UC-007 视觉差异待收敛 — 编辑器侧 ThemeCard 缩略图为中性空白块（宿主 `LeftPanelTabs.vue:75` 传 `tokens:{}`），未实现主题配色缩略（复用 UC-022 配色骨架实现）；缺 12px 描述副文案行 |
| BC-8 | MEDIUM | developer | P-003 视觉差异待收敛 — TemplateThemeCard 缩略图画布未应用主题 `--color-background/surface` token，暗色主题（tech `#0F1117`）缩略图呈浅底亮蓝条、气质相反 |
| BC-9 | MEDIUM | developer | P-004 视觉差异待收敛 — SettingsPage 缺简化版顶栏（← 返回编辑器 + 「设置」标题，源码实证无返回入口）；design-overlay 截图链路需补 imagehost 展开态重截重比（当前截默认编辑器态，主内容区未经比对） |
| BC-10 | MEDIUM | developer | P-005 视觉差异待收敛 — 正文空白（上轮遗留，先排查 demo fixture seed vs `/preview/:docId` 加载缺陷）+ 视口切换 tabs 行违背 spec「P-005 无视口切换」定义（疑复用 P-001 PreviewPane 宿主未裁剪 chrome） |
| BC-11 | MEDIUM（口径待裁决） | developer | UC-021 视觉差异待收敛 — 缺分类 tab / 皮肤计数角标 / 行首图标；二段式「选块→选变体→填参数→插入」后段无实现证据（契约必选则升 HIGH；接受扁平补全则降 LOW 转设计侧） |
| BC-12 | LOW~MEDIUM（方向待裁决） | developer | UC-020 视觉差异待收敛 — 派生色块分组顺序（品牌前置 vs 设计表面前置）与组标题布局（独行纵排 vs 标签左置行内）偏离设计；或以「token 名标注+数据驱动分组」反向登记设计侧对齐 |
| BC-13 | MEDIUM（方向待裁决） | developer | UC-022 视觉差异待收敛 — selected 卡信息区满铺 `#e6efed` brand-subtle 背景，超出设计「边框+徽标」选中语义；或作为有意增强补登设计侧对齐 |
| BC-14 | MEDIUM | ui-designer | UC-014 设计资产缺陷 — Penpot 帧空白（导出 6.9KB / 98.8% 单色底 `#faf8f5`，仅帧标题），重绘或重导出后补执行该节比对；前端 error 态维持既有裁决 |
| BC-15 | LOW（批量） | ui-designer | 设计侧对齐批 — kbd 徽章样式（UC-009/010/012/016）/ UC-005 视口切换器形态（前端符合 spec）/ UC-015 分类 tab（A-014 占位约定）/ UC-009 `Ctrl+\` stale（实现为 F11）/ UC-006 主题卡形态 / P-003 主题条色（前端=token 权威）/ UC-001 按钮文案：随 arch 措辞修订 amendment 批同步 Penpot，不阻塞前端 |

**LOW 散点（接受偏差，未单列 BC）**：UC-002 分隔条 8px vs 4px、UC-001 logo 形状/头像描边、UC-018 边框粗细、P-002 相对时间格式、UC-011 降级文案 vs spec 字面、UC-016 菜单项超集 2 项补登记、P-003 栅格 3vs4 列/底色、P-004 导航高亮 token/滑块控件、P-005 顶栏配色/按钮文案、P-001 可读性指标落点 — 顺手随相关 BC 收敛或转 spec 反向修订。

## disposition

按 T-131 卡处置模式（同上轮 r1 §T-131）：`blocking_conditions` 全部 disposition 至 CLAUDE.md §待办(deferred) **设计一致性收敛 backlog**，作为 completed 项目的设计门禁残差 backlog 追踪；`blocking_conditions` 清空为 `[]`，不阻塞已冻结的 Sprint 6 DONE 与项目 completed 状态。收敛为用户侧后续会话决策（前端收敛项 owner=developer、设计资产/对齐项 owner=ui-designer；BC-11/12/13 收敛方向待用户裁决）。可追溯来源见 EVENT-LOG `user_decision` ref=T-131（本轮）。

## 判定

T-131 AC-004 二轮 sign-off = **`conditional_release`**（4 节一致 / 24 节存在差异，blocking_conditions 非空）；按上轮同构处置 disposition 至 backlog 后 Sprint 6 DONE 判定不变。收敛后如需 `approved` 复核，重跑 `pnpm design:overlay-precheck` + 逐节复比。
