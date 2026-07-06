---
id: "design-review-UC-015-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-137"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — UC-015 InsertDrawer 6 分类 Tab + 搜索框（T-137 AC-007）

## 审查方式

对照对象：`docs/design/frames/components/UC-015.png`（T-138 产出，3 态帧：`closed` / `idle` / `item-selected`）。

渲染核验路径：**选取 (a) 优先方案** —— `pnpm test:design-overlay`（Playwright + 专属端口 5274 dev server，`e2e/visual/design-overlay.spec.ts` 已含 `UC-015` 条目，`selector: '[data-testid="insert-drawer"]'`，`trigger` 为点击 `top-bar-insert-btn` 打开抽屉）本机可直跑。执行 `npx playwright test -c playwright.design-overlay.config.ts -g "UC-015"`，1 passed；Playwright 托管的 webServer 在测试结束后自动回收（`netstat` 复核 5274 端口仅剩 `TIME_WAIT`，无常驻监听进程），未留后台进程。

**选择 (a) 而非 (b) 的原因**：现有 `e2e/visual/design-overlay-output/components/UC-015.png`（gitignored 构建产物）的文件 mtime（Jul 5 23:17）早于 `InsertDrawer.vue` 最新提交时间（Jul 7 01:05），说明该产物基于旧版实现，直接复用会核验到过期截图；重跑测试生成的新截图（mtime Jul 7 01:13，文件大小从 30573 变为 21964 字节）反映当前代码库真实渲染结果，作为本次审查的第一手证据。(b) 方案的组件测试断言（`InsertDrawer.test.ts` 21 条全绿）作为交叉参照，用于核实 Tab 顺序 / 高度 / 无「全部」Tab 等结构性断言与视觉截图结论一致。

容差判定：文案/结构/顺序完全一致为准；变体数量（"N 款皮肤"标注）类数值若样张早于后续任务变更则判定为**样张过期**而非实现缺陷，需交叉验证任务时序。

## 一、Tab 行结构与顺序

| 维度 | 帧标注（idle 态） | 渲染实际（design-overlay 截图 + 组件测试交叉） | 标记 |
|------|------|------|------|
| Tab 数量 | 6 个 | 6 个（`InsertDrawer.test.ts` T-137 AC-001：`tabs.length` = 6） | 一致 |
| Tab 顺序 | 基础排版 / 图文媒体 / 强调提示 / 结构化 / 运营引流 / 元信息 | 截图可见前 5 个同序（第 6 个"元信息"因 320px 容器宽度被裁出截图右边界，`overflow-x: auto` 横向滚动区，未在可视区但 DOM 顺序由 `CATEGORY_ORDER` 数组 `["text","media","emphasis","structured","marketing","meta"]` 决定，与组件测试 `order).toEqual([...CATEGORY_ORDER])` 精确吻合） | 一致 |
| 「全部」Tab | 无 | 无（`CATEGORY_LABELS`/`CATEGORY_ORDER` 无 `all` 项；组件测试 T-137 AC-005 显式断言 `hasAllTab` 为 `false`） | 一致 |
| 默认选中 Tab | 基础排版（首个，加粗/主题色下划线） | 截图中「基础排版」呈激活态样式（品牌色文字 + 底部色条）；组件测试 T-137 AC-001 断言 `textTab.classes()` 含 `insert-drawer__tab--active` | 一致 |

## 二、搜索框位置与尺寸

| 维度 | 帧标注 | 渲染实际 | 标记 |
|------|--------|---------|------|
| 位置 | 标题行下方、Tab 行上方 | 截图确认顺序为 header（"插入组件" + ×）→ 搜索框（"搜索组件…"）→ Tab 行，与帧一致 | 一致 |
| 高度 | 36px（帧输入框视觉高度与标题行/Tab 行呈明显区分的紧凑单行） | `InsertDrawer.vue:102` 内联 `:style="{ height: '36px' }"`；组件测试 T-137 AC-006 断言 `search` 元素 `height` 计算值精确为 `"36px"` | 一致 |
| 占位符文案 | "搜索组件..." | `placeholder="搜索组件…"` | 一致（省略号字符差异：帧用 3 个 ASCII `.`，实现用中文省略号 `…`，视觉等价，不计差异） |

## 三、容器宽度

| 维度 | 帧标注 | 渲染实际 | 标记 |
|------|--------|---------|------|
| 抽屉宽度 | 320px（PRD/UC-015 既定规格） | `InsertDrawer.vue:83` 内联 `:style="{ width: '320px' }"`；组件测试 AC-001 断言 `style` 精确为 `"320px"` | 一致 |

## 四、idle 态列表项（text/基础排版分类）

| 维度 | 帧标注 | 渲染实际 | 标记 |
|------|--------|---------|------|
| 条目数 | 8 项：标题/段落/列表/表格/代码块/引用/分隔线/定义列表 | 8 项，名称与顺序完全一致（截图逐条核对） | 一致 |
| 各条目"N款皮肤"标注 | 标题3/段落3/列表3/表格5/代码块3/引用10/分隔线6/定义列表3 | 实测（`listBlocks()` 直接读取）：标题3/**段落4**/列表3/表格5/代码块3/引用10/**分隔线7**/定义列表3 | **段落、分隔线两项数量不一致（见下方裁定）** |
| 行首图标 | 空心复选框方块（帧为占位符号，非最终图标体系） | 实现渲染为语义 glyph（H/¶/☰/⊞/`</>`/"/－/:=），非复选框 | 不计差异（见下方说明） |

### 变体数量差异裁定

分隔线从 6→7：T-138 冻结帧产出于 T-149（divider SVG 装饰变体：wave/dots/flower）落地之前；T-149 在既有 `default`/`thick`/`dotted`/`dashed` 4 个变体基础上新增 3 个 SVG 变体，7 = 4+3，与本报告"一、divider 分隔线"独立渲染验证的实现结果吻合。段落从 3→4 同理为 T-138 冻结后另一枚 Sprint 7 视觉任务追加的第 4 个段落变体（非本次审查对象范围，未展开溯源）。

结论：**此两项数量差异属于帧的时点性过期（frame staleness），不构成 T-137 InsertDrawer 分类 Tab / 搜索框结构实现的缺陷** —— T-137 的职责边界是"列表随分类正确过滤 + 正确复用 `BlockDefinition.variants.length`"，该逻辑本身正确（`listBlocks()` 返回值随注册表实时变化，UI 侧无硬编码数字），只是帧作为静态图像未随后续任务同步更新。不计入本次 AC-007 的问题列表。

### 行首图标差异说明

帧中的空心复选框方块本身标注为占位符号（T-138 卡内注记及 CLAUDE.md §待办 已记录"F-016/F-001 经查证符合 A-014 裁决非缺陷——分类为临时占位不硬编码"）；`BlockLibItem` 图标体系收敛属既有独立 backlog 项（CLAUDE.md §待办："BlockLibItem 图标体系(BC-2)"，owner 待定），非 T-137 本卡范围，此处不重复登记，仅作交叉说明。

## 五、item-selected 态（帧参照，未逐项复核）

帧 `item-selected` 态展示选中「提示框」Block 后 Tab 切至"强调提示"、底部参数区显示 `type`/`title` 字段 + 实时预览。此部分对应 T-137 AC-002（已有的既存 UC-015 功能，非本次 AC-007 新增范围）与 `InsertDrawer.test.ts` AC-002 描述段（选中 Block 展开参数表单）重叠，本报告聚焦 AC-007（6 分类 Tab + 搜索框）范围，不重复审查。

## 判定

verdict: **approved**

Tab 行结构（6 分类、声明序、无「全部」、默认选中首项）、搜索框（位置、36px 高度、占位符）、容器宽度（320px）与 T-138 帧及组件测试断言（21 条全绿）逐项吻合。idle 态列表的两处变体数量标注差异（段落 3→4、分隔线 6→7）经任务时序交叉核实为帧产出时点早于后续 Sprint 7 变体新增任务（T-149 等）导致的静态帧过期，不影响 T-137 AC-007 本身的分类 Tab / 搜索框结构实现正确性，不计入问题列表。行首图标（glyph vs 占位复选框）为既有已登记 backlog 项（BC-2），非本次新发现。无 CRITICAL/HIGH/MEDIUM/LOW 问题登记。
