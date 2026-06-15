---
id: "dev-plan-wechat-flow-s3"
version: "0.4.1"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "ui-spec-wechat-flow", "ui-spec-wechat-flow-uc001-uc014"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 3: 主题系统 + 组件注册中心 + Palette 派生

[NAV]
- Sprint 3 任务卡 → T-020..T-027, T-114, T-115, T-029, T-100..T-101, T-110
[/NAV]

**Sprint 目标**: 五套内置主题热切换可见；内置 Block ≥ 25 个可从左侧面板插入；CommandPalette + InsertDrawer + ContextMenu + DirectiveAutocompletePopover 完成接线。

---

## 3. 任务卡详细

### T-100: [DESIGN] Penpot — UC-009 CommandPalette + UC-015 InsertDrawer + UC-016 ContextMenu 视觉稿

- **目标**: 产出高交互组件 CommandPalette（含 6 状态原型）、InsertDrawer、ContextMenu 的视觉稿
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: UC-009 CommandPalette 视觉稿覆盖 `closed`、`open-empty`、`open-typing`、`open-results`、`no-results`、`executing` 6 个状态，符合 `ui-spec-wechat-flow-uc001-uc014#§2.UC-009`（PS-005）
  - [ ] AC-002: UC-015 InsertDrawer 视觉稿覆盖 `closed`、`idle`、`item-selected` 状态，含底部参数表单区展开示例
  - [ ] AC-003: UC-016 ContextMenu 视觉稿含完整菜单结构（5 个菜单项 + 2 条分隔线），符合 `ui-spec-wechat-flow-uc001-uc014#§2.UC-016`
  - [ ] AC-004: 通过 Penpot MCP `find_shape` 可检索到 `UC-009`、`UC-015`、`UC-016`
- **deliverables**:
  - [ ] Penpot 项目：UC-009, UC-015, UC-016 视觉稿页面
- **relates_to**: [ui-spec-wechat-flow-uc001-uc014#§2.UC-009, §2.UC-015, §2.UC-016, PS-005]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-009
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-015
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-016

---

### T-020: M-005 主题注册中心 + 主题守护 8+1 维校验骨架（第 9 维由 T-092 落地）

- **目标**: 实现 `@wechat-flow/theme-registry` 包（或集成在 packages/core 内），提供 `registerTheme`、`listThemes`、`describeTheme` API，以及主题守护 8+1 维静态校验骨架（第 9 维由 T-092 落地）
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `registerTheme({ id: 'test', name: '测试', tokens: { '--color-brand': '#123' } })`，When 调用后 `listThemes()`，Then 返回数组含 `{ id: 'test', name: '测试' }` [ARCH#§2.M-005]
  - [ ] AC-002: Given `describeTheme('test')`，When 调用，Then 返回完整主题定义对象（含 `tokens`、`paintable`、`assets` 字段骨架）[ARCH#§2.M-005]
  - [ ] AC-003: Given `validateThemeGuard(theme)` 对一个合规的完整主题调用，When 执行，Then 返回 `{ passed: true, failures: [] }` [F-011 AC-003]
  - [ ] AC-004: Given 一个缺少 WCAG 对比度声明的主题，When `validateThemeGuard`，Then `failures` 数组含 `{ dimension: 'wcag-contrast', severity: 'error' }`
- **deliverables**:
  - [ ] `packages/core/src/registry/theme.ts` — `registerTheme` / `listThemes` / `describeTheme`
  - [ ] `packages/core/src/registry/block.ts` — `listBlocks` / `describeBlock` 骨架
  - [ ] `packages/core/src/registry/mark.ts` — 骨架
  - [ ] `packages/core/src/registry/variant.ts` — `listBlockVariants` / `describeVariant` 骨架
  - [ ] `packages/core/src/registry/token.ts` — 骨架
  - [ ] `packages/core/src/guard/eight-dimensions.ts` — `validateThemeGuard(theme) → GuardResult` 8 维校验（骨架，Sprint 6 T-059 完整实现）
  - [ ] `tests/core/theme-registry.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-003, F-011, M-005]
- **related_tasks**: [T-092]
- **notes**: TemplateDefinition 类型由 T-004 在 @wechat-flow/contracts 包导出，T-020 / T-092 仅 import 不重复定义
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-021: packages/themes default 主题

- **目标**: 实现 `@wechat-flow/theme-default` 包，包含完整 Token 字典（≥ 60 个 token，覆盖 color/spacing/font/decoration/alignment）和内置 Block CSS 样式
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given `import defaultTheme from '@wechat-flow/theme-default'`，When 调用 `validateThemeGuard(defaultTheme)`，Then `result.passed === true`，无 CRITICAL 级别 failures [F-003 AC-004 + F-011 AC-003]
  - [ ] AC-002: Given default 主题 token 字典，When 统计 token 数量，Then `Object.keys(defaultTheme.tokens).length >= 60`，且覆盖 `color`、`spacing`、`font`、`decoration`、`alignment` 五大类别 [F-003 AC-004]
  - [ ] AC-003: Given default 主题应用到 `renderMarkdown('# Hello\n\n**bold** text')`，When 执行，Then 产出 HTML 中 `h1` 元素含非空 `style` 属性，且该 style 中无 CSS 变量残留（`var(--` 不出现）
- **deliverables**:
  - [ ] `packages/themes/default/src/index.ts` — 导出 `defaultTheme: ThemeDefinition`
  - [ ] `packages/themes/default/src/tokens.ts` — ≥ 60 个 token 定义（从 ui-spec §1 Token 映射）
  - [ ] `packages/themes/default/src/blocks/` — 核心 Block 的默认 CSS 样式（heading/paragraph/quote/code-block/divider 等）
- **relates_to**: [F-003, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - ui-spec-wechat-flow#§1
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-022: packages/themes magazine/literary/business/tech 四套主题

- **目标**: 实现另外四套内置主题（magazine / literary / business / tech），每套主题通过 `validateThemeGuard` 校验，覆盖对应场景的视觉风格
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 3
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-021]
- **acceptance_criteria**:
  - [ ] AC-001: Given 四套主题各自调用 `validateThemeGuard`，When 执行，Then 全部 `passed === true`，无 CRITICAL failures [F-003 AC-001]
  - [ ] AC-002: Given `tech` 主题应用到含代码块的 Markdown，When 解析产出 HTML 中代码块 `style` 属性，Then `background-color` 与 default 主题代码块解析得到的 luminance 差值 ≥ 0.4（tech 主题暗底）；`font-family` 属性含等宽字体族（匹配 `/mono|consolas|menlo|sf mono|courier/i`）[F-003 AC-001 描述]
  - [ ] AC-003: Given 五套主题注册到注册中心，When `listThemes()`，Then 返回数组长度 ≥ 5，含 `default`、`magazine`、`literary`、`business`、`tech` [F-003 AC-001]
  - [ ] AC-004: Given 每套主题的 token 字典，When 检查跨主题身份 token，Then 五套主题的 `--color-brand` 值各不相同（防碰撞守护维度之一）[F-011 AC-003]
- **deliverables**:
  - [ ] `packages/themes/magazine/src/index.ts` + `tokens.ts`
  - [ ] `packages/themes/literary/src/index.ts` + `tokens.ts`
  - [ ] `packages/themes/business/src/index.ts` + `tokens.ts`
  - [ ] `packages/themes/tech/src/index.ts` + `tokens.ts`
  - [ ] `tests/themes/theme-guard.test.ts` — AC-001..AC-004 单元测试（5 套主题全部校验）
- **relates_to**: [F-003, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-023: M-006 调色板派生（LCH + WCAG 对比度校验）

- **目标**: 实现 `derivePalette(seed, options) → TokenDictionary`：从单色/三色 seed 在 LCH 感知均匀色彩空间派生完整 token 字典，并校验 WCAG 对比度
- **模块**: M-006 (调色板派生)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `derivePalette({ primary: '#a8322a' })`，When 调用，Then 返回 `TokenDictionary` 对象，含 `--color-brand`、`--color-surface`、`--color-text-primary`、`--color-accent` 等至少 20 个 token 字段 [F-003 AC-011 + ARCH#§2.M-006]
  - [ ] AC-002: Given `derivePalette({ primary: '#a8322a' })` 返回的字典，When 验证 `--color-text-primary` 在 `--color-surface` 背景上的对比度，Then ≥ 4.5:1（WCAG AA）[ARCH#§2.M-006]
  - [ ] AC-003: Given `derivePalette({ primary: '#fff' })`（极浅主色），When 调用，Then 返回对象中关键文字 token 的对比度仍 ≥ 4.5:1（派生算法自动调整）
- **deliverables**:
  - [ ] `packages/palette/src/lch/derive.ts` — LCH 梯度计算（依赖 `culori` 库）
  - [ ] `packages/palette/src/tokens/dictionary-builder.ts`
  - [ ] `packages/palette/src/wcag/contrast-validator.ts`
  - [ ] `packages/palette/src/index.ts` — `derivePalette` 导出
  - [ ] `tests/palette/derive.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-003, F-010, F-013, M-006]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-006
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-024: packages/blocks 内置 Block ≥ 25 个（P0 必含全集 + variant 注册）

- **目标**: 实现 `@wechat-flow/blocks` 包，包含 PRD F-003 AC-006 P0 必含 25 种 Block：heading/paragraph/list/table/code-block/quote/card/callout/divider/image/image-caption/gallery/steps/compare/pull-quote/highlight-block/announcement/dialog/timeline/qrcode/video/audio/miniprogram-card/footer-cta/recommendation；每 Block 注册 ≥ 3 variant，与 M-005 注册中心集成
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 3
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given `listBlocks()` 调用，When 执行，Then 返回数组长度 ≥ 25 且包含 25 个 P0 具名 Block 全部 ID [F-003 AC-006 P0 全集]
  - [ ] AC-002: Given `describeBlock('callout')`，When 调用，Then 返回对象含 `attrsSchema`（可通过 `toJSON(attrsSchema)` 转为 JSON Schema），`variants` 数组长度 ≥ 3 [F-003 AC-007]
  - [ ] AC-003: Given 每个 P0 必含 Block 的 `attrsSchema`，When 调用 Zod parse + toJSONSchema 转换，Then 无异常
- **deliverables**:
  - [ ] `packages/blocks/src/blocks/heading.ts`
  - [ ] `packages/blocks/src/blocks/paragraph.ts`
  - [ ] `packages/blocks/src/blocks/list.ts`
  - [ ] `packages/blocks/src/blocks/table.ts`
  - [ ] `packages/blocks/src/blocks/code-block.ts`
  - [ ] `packages/blocks/src/blocks/quote.ts`
  - [ ] `packages/blocks/src/blocks/card.ts`
  - [ ] `packages/blocks/src/blocks/callout.ts`
  - [ ] `packages/blocks/src/blocks/divider.ts`
  - [ ] `packages/blocks/src/blocks/image.ts`
  - [ ] `packages/blocks/src/blocks/image-caption.ts`
  - [ ] `packages/blocks/src/blocks/gallery.ts`
  - [ ] `packages/blocks/src/blocks/steps.ts`
  - [ ] `packages/blocks/src/blocks/compare.ts`
  - [ ] `packages/blocks/src/blocks/pull-quote.ts`
  - [ ] `packages/blocks/src/blocks/highlight-block.ts`
  - [ ] `packages/blocks/src/blocks/announcement.ts`
  - [ ] `packages/blocks/src/blocks/dialog.ts`
  - [ ] `packages/blocks/src/blocks/timeline.ts`
  - [ ] `packages/blocks/src/blocks/qrcode.ts`
  - [ ] `packages/blocks/src/blocks/video.ts`
  - [ ] `packages/blocks/src/blocks/audio.ts`
  - [ ] `packages/blocks/src/blocks/miniprogram-card.ts`
  - [ ] `packages/blocks/src/blocks/footer-cta.ts`
  - [ ] `packages/blocks/src/blocks/recommendation.ts`
  - [ ] `packages/blocks/src/index.ts` — 注册所有内置 Block 到 M-005
  - [ ] `tests/blocks/render.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-003, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-025: packages/marks 内置 Mark ≥ 11 个

- **目标**: 实现 `@wechat-flow/marks` 包，包含 ≥ 11 个内置 Mark（行内组件）定义：粗体/斜体/链接/行内代码/徽章/强调/高亮/下划线/波浪线/插入/上下标
- **moduli**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002]
- **security_sensitive**: false
- **dependencies**: [T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given `listMarks()` 调用，When 执行，Then 返回数组长度 ≥ 11，含 `badge`、`emphasis`、`highlight`、`underline`、`wavy`、`insert`、`sup`、`sub` 等 [F-003 AC-005]
  - [ ] AC-002: Given `:badge[新]{type=hot}` 行内指令，When 经过 renderMarkdown，Then 产出 HTML 含 `<span style="...">新</span>`（badge 样式，使用主题 token），不含 `class` 属性
- **deliverables**:
  - [ ] `packages/marks/src/marks/` — ≥ 11 个 Mark 定义文件
  - [ ] `packages/marks/src/index.ts` — 注册所有内置 Mark
  - [ ] `tests/marks/render.test.ts` — AC-001..AC-002 单元测试
- **relates_to**: [F-003, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-026: M-001 LeftPanelTabs（UC-006）+ ThemeCard（UC-007）+ BlockLibItem（UC-008）

- **目标**: 实现左侧面板三个 Tab（主题/组件/文档），含 ThemeCard 主题选择卡片和 BlockLibItem Block 库列表项
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-020, T-021]
- **acceptance_criteria**:
  - [ ] AC-001: Given LeftPanelTabs 渲染，When 点击「主题」Tab，Then Tab 标题底边出现 `2px solid --color-brand` 指示线，Tab 内容区显示 ThemeCard 列表（含所有已注册主题）[ui-spec-wechat-flow-uc001-uc014#§2.UC-006]
  - [ ] AC-002: Given ThemeCard `isSelected: true`，When 渲染，Then 卡片边框变 `2px solid --color-brand`，左上角出现对勾图标 [ui-spec-wechat-flow-uc001-uc014#§2.UC-007]
  - [ ] AC-003: Given ThemeCard `isPlaceholder: true`（社区扩展占位），When 渲染，Then 卡片 opacity 0.6，缩略图替换为「更多主题即将上线」文字，点击跳转 `/themes` 路由 [F-003 AC-003]
  - [ ] AC-004: Given BlockLibItem，When 用户点击，Then `onInsert` 回调被调用，含对应 BlockDefinition 参数（directives 片段可插入编辑器）
- **deliverables**:
  - [ ] `apps/editor/src/components/panel/LeftPanelTabs.vue` — UC-006 实现
  - [ ] `apps/editor/src/components/panel/ThemeCard.vue` — UC-007 实现
  - [ ] `apps/editor/src/components/panel/BlockLibItem.vue` — UC-008 实现
- **relates_to**: [F-003, M-001, UC-006, UC-007, UC-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-006
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-007
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-008

---

### T-027: M-001 CommandPalette（UC-009）接线 command registry（6 分组，~25-30 命令）

- **目标**: 实现 CommandPalette（UC-009），含 command registry、Ctrl+K 快捷键、6 个动作分组（视图/主题/文档/内容/导出/帮助）约 25-30 个命令
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-026, T-100]
- **acceptance_criteria**:
  - [ ] AC-001: Given 按 Ctrl+K（Windows/Linux）或 Cmd+K（macOS），When 触发，Then CommandPalette Modal 以 `--duration-slow` 动画展开，搜索框自动聚焦 [F-001 AC-008 + ui-spec Q6]
  - [ ] AC-002: Given CommandPalette 已打开，When 输入「主题」，Then 动作列表过滤为仅含主题相关命令，匹配字符以 `--color-brand` 加粗高亮 [ui-spec-wechat-flow-uc001-uc014#§2.UC-009]
  - [ ] AC-003: Given 「切换至 tech 主题」命令被选中并按 Enter 执行，When 执行，Then 编辑器当前主题切换为 `tech`，PreviewPane 样式更新
  - [ ] AC-004: Given CommandPalette 打开，When 按 Esc 键，Then CommandPalette 关闭（`isOpen` 变 `false`）
- **deliverables**:
  - [ ] `apps/editor/src/components/command/CommandPalette.vue` — UC-009 实现（Props 按 ui-spec 定义）
  - [ ] `apps/editor/src/lib/command-registry.ts` — command registry，含 6 分组 25-30 命令
- **relates_to**: [F-001, M-001, UC-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-009

---

### T-114: M-001 InsertDrawer（UC-015）+ ContextMenu（UC-016）

- **目标**: 实现 InsertDrawer（UC-015）与 ContextMenu（UC-016），接线到 command registry 和 Block/Mark 库
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-026, T-100]
- **acceptance_criteria**:
  - [ ] AC-001: Given 点击 TopBar「+」按钮，When 触发，Then InsertDrawer 从右侧以 `--duration-base` 动画滑入（宽 320px），显示分类 Tab + Block 列表 [ui-spec-wechat-flow-uc001-uc014#§2.UC-015]
  - [ ] AC-002: Given InsertDrawer 内选中一个 Block（如 callout），When 选中，Then 底部参数表单区展开，含可配属性输入；点击「插入」后 directive 语法片段插入到 SourcePane 光标处
  - [ ] AC-003: Given 点击 TopBar「...」按钮，When 触发，Then ContextMenu 展开，含「中文排版修订」和「复制 HTML」等菜单项，符合 `ui-spec-wechat-flow-uc001-uc014#§2.UC-016` 菜单结构
- **deliverables**:
  - [ ] `apps/editor/src/components/panel/InsertDrawer.vue` — UC-015 实现
  - [ ] `apps/editor/src/components/panel/ContextMenu.vue` — UC-016 实现（包装 UC-010 DropdownMenu）
  - [ ] `apps/editor/src/components/common/DropdownMenu.vue` — UC-010 实现（共用菜单样式基础）
- **relates_to**: [F-001, M-001, UC-015, UC-016]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-015
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-016

---

### T-115: M-001 DirectiveAutocompletePopover（UC-021，CodeMirror extension 集成）

- **目标**: 实现 DirectiveAutocompletePopover（UC-021），在编辑器内接线 CodeMirror 补全 extension，支持 Block/Mark variant 选择并插入 directive 片段
- **模块**: M-001 (编辑器 UI), M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002]
- **security_sensitive**: false
- **dependencies**: [T-026, T-009, T-100]
- **acceptance_criteria**:
  - [ ] AC-001: Given 在编辑器输入 `:::` 或 `:` 前缀，When 触发补全，Then 弹出 UC-021 浮层并可选择 Block/Mark 及 variant，选中后插入对应 directive 片段 [ui-spec-wechat-flow-uc001-uc014#§2.UC-021]
  - [ ] AC-002: Given DirectiveAutocompletePopover 已打开，When 用户按 Escape，Then 浮层关闭，编辑器焦点不丢失
  - [ ] AC-003（production path）: `apps/editor/src/components/editor/DirectiveAutocompletePopover.vue` 作为 CodeMirror extension 在 `SourcePane.vue` 中注册，可在代码中检索到 `registerDirectiveCompletion(view)` 调用点
- **deliverables**:
  - [ ] `apps/editor/src/components/editor/DirectiveAutocompletePopover.vue` — UC-021 实现
  - [ ] `apps/editor/src/editor/extensions/directive-completion.ts` — CodeMirror 补全 extension（接线 M-005 Block/Mark 注册中心）
  - [ ] `tests/editor/directive-autocomplete.test.ts` — AC-001..AC-002 单元测试
- **relates_to**: [F-001, M-001, M-005, UC-021]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - arch-wechat-flow-modules#§2.M-005
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-021

---

### T-029: Frontmatter 解析：theme/paint/base-color 接线渲染管线

- **目标**: 在渲染管线中接入 YAML Frontmatter 解析，支持 `theme`、`paint`、`base-color` 字段驱动主题热切换和单文档级配色覆盖
- **模ули**: M-002 (渲染管线核心), M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 3
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-022, T-023]
- **acceptance_criteria**:
  - [ ] AC-001: Given Markdown 含 `---\ntheme: tech\n---\n# Hello`，When `renderMarkdown` 执行，Then 使用 `tech` 主题的 token，产出 HTML 中代码风格 token 与 tech 主题一致 [F-001 AC-003 + F-003 AC-002]
  - [ ] AC-002: Given Markdown 含 `---\npaint:\n  '--color-brand': '#ff0000'\n---`，When 执行，Then 产出 HTML 中主题色相关 inline style 使用 `#ff0000`（paint 覆盖生效）[F-003 AC-010]
  - [ ] AC-003: Given Markdown 含 `---\nbase-color: '#a8322a'\n---`，When 执行，Then `derivePalette({ primary: '#a8322a' })` 被调用，派生 token 参与渲染，产出 HTML 中 `--color-brand` 相关 style 值来自派生结果 [F-003 AC-011]
  - [ ] AC-004: Given `paint` 中包含主题未在 `paintable` 声明的 token 路径，When 执行，Then `diagnostics` 含一条 `level: 'warn'` 的诊断（被忽略的 paint 覆盖）[F-003 AC-010]
- **deliverables**:
  - [ ] `packages/core/src/pipeline/frontmatter.ts` — `parseFrontmatter(markdown) → { content, meta: FrontmatterMeta }`
  - [ ] 更新 `packages/core/src/render.ts` — 接入 frontmatter 解析，按 `theme`/`paint`/`base-color` 字段调整渲染选项
  - [ ] `tests/core/frontmatter.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-001, F-003, M-002]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-003

---

### T-101: [DESIGN] Penpot — Sprint 3 设计稿签字验证

- **目标**: 开发者/PM 目视检查 Sprint 3 UI 实现（主题切换、LeftPanelTabs、CommandPalette）与 Penpot 设计稿的一致性，完成 sign-off
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: small
- **sprint**: 3
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-100]
- **acceptance_criteria**:
  - [ ] AC-001: 目视对照 Penpot UC-009 CommandPalette `open-results` 状态与实际 UI，分组标题字号/颜色/快捷键提示布局无明显偏差
  - [ ] AC-002: 目视对照 Penpot UC-007 ThemeCard `selected` 状态与实际 UI，边框色 `--color-brand` 和对勾图标可见
  - [ ] AC-003: 签字记录写入 `docs/EVENT-LOG.jsonl`（`event=design_signoff, phase=development, ref=T-101`）
- **deliverables**:
  - [ ] `docs/EVENT-LOG.jsonl` — design_signoff 事件（T-101）

---

### T-110: [VALIDATION] Sprint 3 验证：主题热切换 + Block 插入

- **目标**: 用户手动验证五套主题热切换可见、CommandPalette 可搜索命令、Block 可插入
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **sprint**: 3
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-021, T-022, T-026, T-027, T-114, T-115, T-029]
- **acceptance_criteria**:
  - [ ] 打开编辑器，左侧面板「主题」Tab 显示 5 张 ThemeCard（default/magazine/literary/business/tech），点击任意一张，PreviewPane 内样式立即变化（约 250ms 渐变），TopBar 主题指示器更新
  - [ ] 内置 Block 数 `listBlocks().length >= 25`（Sprint 3 阶段验收口径；PRD §1.3 终态 ≥40 由 Sprint 6 T-075 验收）
  - [ ] 在 Markdown 中写入 `---\ntheme: tech\n---\n# 技术文章`，PreviewPane 自动采用 tech 主题样式
  - [ ] 按 Ctrl+K 打开 CommandPalette，输入「magazine」，列表出现「切换至 magazine 主题」命令，按 Enter 执行，主题切换成功
  - [ ] 点击 TopBar「+」按钮，InsertDrawer 从右侧滑入，列表含 ≥ 10 个 Block；点击 callout，底部参数区展开，点击「插入」后编辑器内出现 `:::callout\n` 语法片段
  - [ ] 点击 TopBar「...」按钮，ContextMenu 弹出，含「中文排版修订」和「复制 HTML」菜单项
- **relates_to**: [F-003, F-001, M-001, M-005]
