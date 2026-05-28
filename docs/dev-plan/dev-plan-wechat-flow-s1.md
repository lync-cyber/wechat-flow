---
id: "dev-plan-wechat-flow-s1"
version: "0.4.1"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "ui-spec-wechat-flow", "ui-spec-wechat-flow-c001-c014", "ui-spec-wechat-flow-p001-p005"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 1: 三栏 UI 骨架 + 渲染管线核心

[NAV]
- Sprint 1 任务卡 → T-005..T-012, T-DS-002..T-DS-004, T-VAL-01
[/NAV]

**Sprint 目标**: 编辑器三栏布局可见；输入 Markdown 后右栏实时出现 inline-styled HTML 预览；本地草稿自动持久化到 IndexedDB。

---

## 3. 任务卡详细

### T-DS-002: [DESIGN] Penpot — P-001 三档响应式线框稿（PS-006）

- **目标**: 在 Penpot 中产出 P-001 编辑器主页的桌面/平板/移动三档响应式线框对比图，作为 T-008 三栏布局实现的视觉参照
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-DS-001]
- **acceptance_criteria**:
  - [ ] AC-001: Penpot 项目内建立 `P-001-Desktop`、`P-001-Tablet`、`P-001-Mobile` 三个线框稿页面（或同页面三个 Frame），命名遵循 `P-001` 模式
  - [ ] AC-002: 桌面档线框稿标注三栏宽度（左 200px / 编辑器 auto / 右 320px）、TopBar 高 48px、底部状态栏高 32px，与 `ui-spec-wechat-flow#§5.1` 一致
  - [ ] AC-003: 平板档线框稿标注抽屉宽 280px，编辑/预览 60%/40% 比例
  - [ ] AC-004: 移动档线框稿标注底部固定栏高 56px，内容区单栏只读
  - [ ] AC-005: 通过 Penpot MCP `find_shape` 可检索到 `P-001-Desktop` Frame
- **deliverables**:
  - [ ] Penpot 项目：P-001 三档响应式线框稿
- **relates_to**: [ui-spec-wechat-flow#§5, P-001, PS-006]
- **context_load**:
  - ui-spec-wechat-flow#§5
  - ui-spec-wechat-flow-p001-p005#§3.P-001

---

### T-DS-003: [DESIGN] Penpot — C-001/C-002/C-004/C-005 核心组件视觉稿

- **目标**: 在 Penpot 中产出 TopBar、Splitter、SourcePane、PreviewPane 四个核心组件的视觉稿（含所有状态变体），作为 T-008/T-009/T-010 实现的像素级参照
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-DS-001]
- **acceptance_criteria**:
  - [ ] AC-001: C-001 TopBar 视觉稿覆盖 `default`、`document-unsaved`、`syncing`、`offline`、`conflict`、`focus-mode` 6 个状态，与 `ui-spec-wechat-flow-c001-c014#§2.C-001` 一致
  - [ ] AC-002: C-002 Splitter 视觉稿覆盖 `idle`、`hover`、`dragging`、`disabled` 4 个状态
  - [ ] AC-003: C-004 SourcePane 视觉稿覆盖语法高亮 Token 样板（标题/粗体/行内代码/Directive/Frontmatter 各一例），使用 §1 Token 变量（非硬编码色值）
  - [ ] AC-004: C-005 PreviewPane 视觉稿覆盖 `loading`、`populated`、`error` 状态，含视口切换工具栏（375/768/auto 三个按钮）
  - [ ] AC-005: 通过 Penpot MCP `find_shape` 可检索到 `C-001`、`C-004`、`C-005` 组件
- **deliverables**:
  - [ ] Penpot 项目：C-001, C-002, C-004, C-005 组件视觉稿页面
- **relates_to**: [ui-spec-wechat-flow-c001-c014#§2.C-001, §2.C-002, §2.C-004, §2.C-005]
- **context_load**:
  - ui-spec-wechat-flow-c001-c014#§2.C-001
  - ui-spec-wechat-flow-c001-c014#§2.C-004
  - ui-spec-wechat-flow-c001-c014#§2.C-005

---

### T-005: apps/editor Vue 3.5 项目骨架 + Vue Router + Pinia

- **目标**: 初始化 `apps/editor` 为 Vue 3.5 SPA（Vite 6.x），配置 Vue Router 4.x 路由表（/、/docs/:docId、/themes、/settings、/preview/:docId）和 Pinia store 骨架
- **模块**: M-001 (编辑器 UI)
- **task_kind**: chore
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: small
- **sprint**: 1
- **tdd_mode**: skip
- **tdd_skip_reason**: "Vue 3.5 项目骨架初始化，为脚手架配置，无单元测试价值"
- **security_sensitive**: false
- **dependencies**: [T-002]
- **acceptance_criteria**:
  - [ ] AC-001: Given T-005 完成，When 运行 `pnpm --filter editor dev`，Then Vite dev server 启动，浏览器打开 `http://localhost:5173` 可见 Vue 应用骨架页面（即使只有"Hello wechat-flow"），无控制台红色错误
  - [ ] AC-002: Given Vue Router 配置，When 访问 `/themes`，Then 路由切换到 ThemesPage 骨架组件，当前路由 `useRoute().path === '/themes'`
  - [ ] AC-003: Given Pinia store 骨架，When `const editorStore = useEditorStore()`，Then `editorStore` 不为 undefined，`editorStore.currentDocId` 初始值为 `null`
- **deliverables**:
  - [ ] `apps/editor/index.html`
  - [ ] `apps/editor/vite.config.ts`
  - [ ] `apps/editor/src/main.ts` — Vue app 入口，注册 router + pinia
  - [ ] `apps/editor/src/router/index.ts` — 5 条路由（/, /docs/:docId, /themes, /settings, /preview/:docId）
  - [ ] `apps/editor/src/stores/editor.ts` — Pinia editor store 骨架（`currentDocId`, `currentTheme` state）
  - [ ] `apps/editor/src/App.vue` — `<router-view>` 根组件
  - [ ] `apps/editor/src/pages/EditorPage.vue` — `/` 路由骨架
  - [ ] `apps/editor/src/pages/ThemesPage.vue` — `/themes` 路由骨架
  - [ ] `apps/editor/src/pages/SettingsPage.vue` — `/settings` 路由骨架
  - [ ] `apps/editor/src/pages/PreviewPage.vue` — `/preview/:docId` 路由骨架
- **relates_to**: [F-001, M-001, ui-spec-wechat-flow#§4]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow#§4

---

### T-006: packages/core 渲染管线骨架（parse + transform + serialize）

- **目标**: 实现 `@wechat-flow/core` 包的五段管线骨架：`parse（Markdown → mdast）`、`transform（mdast → hast）`、`serialize（hast → HTML string）`，以及顶层 `renderMarkdown` API
- **模块**: M-002 (渲染管线核心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `renderMarkdown('# Hello\n\nWorld')` 调用，When 执行，Then 返回 `RenderResult` 对象，`result.html` 包含 `<h1>` 标签和 `<p>` 标签，`result.diagnostics` 为空数组 [ARCH#§2.M-002]
  - [ ] AC-002: Given GFM 表格语法 `| A | B |\n|---|---|\n| 1 | 2 |`，When 传入 `renderMarkdown`，Then `result.html` 包含 `<table>` 元素
  - [ ] AC-003: Given remark-directive 语法 `:::card\ncontent\n:::`，When 传入 `renderMarkdown`，Then `result.html` 包含对应容器元素（不报 parse 错误）
  - [ ] AC-004: Given `renderMarkdown` 调用，When 执行，Then `result` 含 `coreVersion` 字段，值为 `@wechat-flow/core` 包的 `package.json` version 字段值 [ARCH#§2.M-002]
- **deliverables**:
  - [ ] `packages/core/src/pipeline/parse.ts` — `parseMarkdown(input: string): MdastRoot`（remark + remark-gfm + remark-directive）
  - [ ] `packages/core/src/pipeline/transform.ts` — `transformToHast(mdast: MdastRoot, options): HastRoot`（remark-rehype）
  - [ ] `packages/core/src/pipeline/serialize.ts` — `serializeHast(hast: HastRoot): string`（rehype-stringify + 稳定排序）
  - [ ] `packages/core/src/render.ts` — `renderMarkdown(input, options) → RenderResult` 顶层 API
  - [ ] `packages/core/src/types.ts` — `RenderResult`、`RenderOptions` 类型定义
  - [ ] `packages/core/src/version/triple.ts` — `coreVersion` 读取骨架
  - [ ] `tests/core/render.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-002, F-007, M-002]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002
  - prd-wechat-flow-f001-f014#§2.F-002

---

### T-007: packages/core inline-style 阶段实现

- **目标**: 实现渲染管线的 CSS 内联化 stage（`inline-style.ts`）：将主题 token 和样式展开为每个 hast 元素的 `style` 属性，产出零 class 依赖的 inline-styled HTML
- **模块**: M-002 (渲染管线核心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-006]
- **acceptance_criteria**:
  - [ ] AC-001: Given 含 `# 标题` 的 Markdown，When 经过 inline-style 阶段（使用默认 token），Then 产出 HTML 中 `h1` 元素含 `style="..."` 属性，且该属性包含字体、颜色等至少 2 个 CSS 声明，`h1` 不含 `class` 属性 [ARCH#§2.M-002]
  - [ ] AC-002: Given 产出的 inline-styled HTML，When 检查所有元素，Then 无 `<style>` 标签，无 CSS 变量（`var(--`），无 `class` 属性（确保过滤安全）
  - [ ] AC-003: Given 使用 `juice 11.x`（options 包含 `removeStyleTags: true` 等确定性配置），When 对测试 HTML + CSS 字符串执行内联化，Then 生成的 inline style 字符串可通过 CSS 解析器解析（无语法错误）
- **deliverables**:
  - [ ] `packages/core/src/pipeline/inline-style.ts` — `inlineStyle(hast: HastRoot, themeTokens: TokenDictionary): HastRoot`
  - [ ] `packages/core/src/pipeline/css-attr-filter.ts` — CSS 属性二级白名单过滤（拒绝 `expression(` / `javascript:` / `behavior:` / `@import`）
  - [ ] `packages/core/src/utils/deterministic.ts` — `sortedKeys` / `sortedEntries` / `sortedSet` / `canonicalStringify` 确定性容器迭代工具
  - [ ] `tests/core/inline-style.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-004, M-002]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002
  - prd-wechat-flow-f001-f014#§2.F-004

---

### T-008: M-001 EditorShell 三栏布局（C-001 TopBar + C-002 Splitter）

- **目标**: 实现编辑器三栏布局骨架（EditorShell.vue）：C-001 TopBar、C-002 ResizableSplitter（含拖拽调宽）、三栏背景色梯度，以及专注模式（F11）
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: false
- **dependencies**: [T-005, T-DS-003]
- **acceptance_criteria**:
  - [ ] AC-001: Given 打开 `http://localhost:5173`，When 页面加载完成，Then 可见三栏布局：左栏背景 `#F4F1EC`（暖灰）、中栏背景 `#FAF8F5`（暖白）、右栏背景 `#F7F7F7`（微冷白），符合 `ui-spec-wechat-flow#§0.2` 层次原则
  - [ ] AC-002: Given 桌面档（≥1280px），When 拖拽左栏/中栏之间的 Splitter，Then 左栏宽度在 `[160px, 320px]` 范围内实时更新，拖拽结束后宽度值可从 IndexedDB 读回（持久化验证）[ui-spec-wechat-flow-c001-c014#§2.C-002]
  - [ ] AC-003: Given 桌面档，When 按 F11 键，Then 左栏和右栏隐藏（`display: none`），顶栏工具栏按钮组隐藏，编辑区铺满页面宽度；再次按 F11 恢复
  - [ ] AC-004: Given vw < 1280px（平板档），When 页面加载，Then 左侧面板收为抽屉（默认隐藏），TopBar 左端出现☰ 触发按钮；点击 ☰，抽屉从左侧滑入（宽 280px）并有半透明 Overlay（`rgba(28,25,23,0.3)`）[ui-spec-wechat-flow#§5.2]
  - [ ] AC-005: C-001 TopBar 组件 Props `isFocusMode`、`hasUnsavedChanges`、`syncState` 可正确驱动文档名后的 `·` 标记和 `focus-mode` 状态，符合 `ui-spec-wechat-flow-c001-c014#§2.C-001` 状态表
- **deliverables**:
  - [ ] `apps/editor/src/components/layout/EditorShell.vue` — 三栏布局骨架
  - [ ] `apps/editor/src/components/layout/TopBar.vue` — C-001 TopBar 实现（Props 按 ui-spec C-001 定义）
  - [ ] `apps/editor/src/components/layout/ResizableSplitter.vue` — C-002 Splitter 实现（含拖拽 + 宽度持久化钩子）
  - [ ] `apps/editor/src/composables/use-splitter-width.ts` — Splitter 宽度 IndexedDB 持久化 composable
- **relates_to**: [F-001, M-001, C-001, C-002, P-001]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-c001-c014#§2.C-001
  - ui-spec-wechat-flow-c001-c014#§2.C-002
  - ui-spec-wechat-flow-p001-p005#§3.P-001
  - ui-spec-wechat-flow#§5

---

### T-009: M-001 SourcePane（CodeMirror 6 + Markdown 高亮）

- **目标**: 实现 SourcePane（C-004）：CodeMirror 6 编辑器接入 Vue，Markdown 语法高亮（含 directive 语法），输入时触发渲染管线 debounce 300ms
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-008]
- **acceptance_criteria**:
  - [ ] AC-001: Given SourcePane 渲染，When 用户输入 `# Hello`，Then 编辑器内 `#` 和 `Hello` 以 `--color-brand`（墨绿）颜色高亮，字重 `--font-weight-semibold`，符合 `ui-spec-wechat-flow-c001-c014#§2.C-004.1`
  - [ ] AC-002: Given 用户输入 `::: card\ncontent\n:::`，When 高亮生效，Then `:::` 和 `card` 以 `--color-accent`（赤陶）显示，`--font-weight-medium` + `--font-mono`
  - [ ] AC-003: Given 用户连续输入，When 停止输入后 300ms（PREVIEW_DEBOUNCE_MS 常量），Then `onValueChange` 回调被调用一次（debounce 验证，不多次触发）
  - [ ] AC-004: Given SourcePane Props `readonly: true`，When 渲染，Then 编辑区背景变 `--color-surface-elevated`，光标变 `default`，顶部出现只读 Banner（橙黄色，28px 高）
- **deliverables**:
  - [ ] `apps/editor/src/components/editor/SourcePane.vue` — C-004 实现（Props 按 ui-spec 定义）
  - [ ] `apps/editor/src/composables/use-codemirror.ts` — CodeMirror 6 实例管理 composable
  - [ ] `apps/editor/src/lib/cm-theme.ts` — 自定义 CodeMirror 主题（`--font-serif` + 暖白高亮配色，引用 ui-spec C-004.1 Token 映射）
  - [ ] `apps/editor/src/lib/cm-markdown-lang.ts` — Markdown + remark-directive 语法扩展
- **relates_to**: [F-001, M-001, C-004]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-c001-c014#§2.C-004
  - prd-wechat-flow-f001-f014#§2.F-001

---

### T-010: M-001 PreviewPane（iframe 沙箱 + 视口切换）

- **目标**: 实现 PreviewPane（C-005）：iframe 沙箱（`sandbox=""` + CSP `default-src 'none'`）、三档视口切换（375/768/auto）、同步状态指示器（C-005.1）、复制按钮悬浮层
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: true
- **dependencies**: [T-008, T-DS-003]
- **acceptance_criteria**:
  - [ ] AC-001: Given PreviewPane 渲染，When 检查 iframe 元素属性，Then `iframe.getAttribute('sandbox') === ''`（空值，最严格沙箱），CSP 响应头或 meta 标签含 `default-src 'none'; style-src 'unsafe-inline'` [ARCH#§2.M-001, ui-spec-wechat-flow-c001-c014#§2.C-005]
  - [ ] AC-002: Given `htmlContent` Prop 更新，When 通过 `iframe.contentDocument.open/write/close` 写入内容，Then iframe 内显示更新后的 HTML，无 JS 执行（验证：DevTools 控制台无脚本执行记录）
  - [ ] AC-003: Given 视口切换工具栏，When 点击 `375` 按钮，Then `iframe` 的 `width` CSS 设置为 `375px`，按钮背景变 `--color-brand-subtle`（激活态）
  - [ ] AC-004: Given `syncState: 'syncing'`，When PreviewPane 渲染，Then 右下角 SyncStateIndicator 显示墨绿色点（`--color-brand`）+ 快速 pulse（0.8s 周期），符合 `ui-spec-wechat-flow-c001-c014#§2.C-005.1`
  - [ ] AC-005（production path）: `apps/editor/src/components/editor/PreviewPane.vue` 在 `EditorShell.vue` 中通过 `<PreviewPane :html-content="previewHtml" ... />` 直接挂载，且 `EditorShell.vue` 的 `script setup` 内含 `import PreviewPane from '../editor/PreviewPane.vue'`
- **deliverables**:
  - [ ] `apps/editor/src/components/editor/PreviewPane.vue` — C-005 实现（Props 按 ui-spec 定义）
  - [ ] `apps/editor/src/components/editor/SyncStateIndicator.vue` — C-005.1 同步状态指示器
- **relates_to**: [F-002, M-001, C-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - ui-spec-wechat-flow-c001-c014#§2.C-005

---

### T-011: M-008 composeRender use case（连接 core → PreviewPane）

- **目标**: 实现 `@wechat-flow/app-layer` 包（或 apps/editor 内的 use case 层）的 `composeRender` use case，将编辑器 Markdown 输入串接渲染管线并驱动 PreviewPane 更新
- **模块**: M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **security_sensitive**: false
- **dependencies**: [T-007, T-010]
- **acceptance_criteria**:
  - [ ] AC-001: Given `composeRender({ markdown: '# Hello', themeId: 'default' })` 调用，When 执行，Then 返回 `RenderResult`，`result.html` 不为空，`result.diagnostics` 为数组（可为空）[ARCH#§2.M-008]
  - [ ] AC-002: Given EditorShell 中 SourcePane 输入变更，When debounce 300ms 后，Then `composeRender` 被调用，PreviewPane `htmlContent` Prop 更新（端到端接线验证）
  - [ ] AC-003: Given `composeRender` 调用，When 执行，Then `result` 含 `versionTriple: { coreVersion, themeVersion, rulesetVersion }` 字段（骨架值，Sprint 1 允许 `rulesetVersion: '0.0.0'`）[ARCH#§2.M-008]
- **deliverables**:
  - [ ] `packages/core/src/composers/render.ts` — `composeRender(input: ComposeRenderInput): Promise<RenderResult>`（或位于 apps/editor/src/use-cases/render.ts，implementer 按 ARCH §7.2 目录决策）
  - [ ] `apps/editor/src/stores/editor.ts` — 更新：添加 `previewHtml` state，订阅 SourcePane onValueChange → composeRender
  - [ ] `tests/app-layer/compose-render.test.ts` — AC-001, AC-003 单元测试
- **relates_to**: [F-001, F-002, F-013, M-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-008
  - arch-wechat-flow-modules#§2.M-002

---

### T-012: M-013 IndexedDB 本地草稿持久化（存 + 取）

- **目标**: 实现 `@wechat-flow/persistence` 或 M-013 的本地持久化核心：多文档存储（saveDraft/loadDocument/listDocuments/deleteDocument）+ Splitter 宽度持久化
- **模块**: M-013 (浏览器端持久化)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 1
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-005, T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `saveDraft({ id: 'doc-1', title: '测试', content: '# Hello', updatedAt: Date.now() })`，When 调用，Then 数据写入 IndexedDB `documents` store；随后调用 `loadDocument('doc-1')`，返回相同数据
  - [ ] AC-002: Given `listDocuments()`，When 调用，Then 返回 IndexedDB 中所有文档的元数据数组（`id`, `title`, `updatedAt`），按 `updatedAt` 降序排列
  - [ ] AC-003: Given 用户调整 Splitter 宽度为 240px，When 宽度持久化后刷新页面，Then `loadSplitterWidth('left-panel')` 返回 240
  - [ ] AC-004: Given `deleteDocument('doc-1')`，When 调用，Then 随后 `loadDocument('doc-1')` 返回 `undefined`（或 null）
- **deliverables**:
  - [ ] `packages/core/src/storage/indexeddb-adapter.ts` — idb 8.x 适配器（创建 DB `wechat-flow-db`，版本 1，stores: `documents`, `preferences`）
  - [ ] `packages/core/src/documents/manager.ts` — `saveDraft` / `loadDocument` / `listDocuments` / `deleteDocument` 实现
  - [ ] `packages/core/src/storage/preferences.ts` — `saveSplitterWidth` / `loadSplitterWidth` 实现
  - [ ] `tests/core/indexeddb.test.ts` — AC-001..AC-004（使用 Vitest + `@vitest/browser` 或 happy-dom 模拟 IndexedDB）
- **relates_to**: [F-001, M-013]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-013
  - prd-wechat-flow-f001-f014#§2.F-001

---

### T-DS-004: [DESIGN] Penpot — Sprint 1 设计稿签字验证

- **目标**: 开发者/PM 目视检查 T-DS-002 和 T-DS-003 产出的设计稿，与 T-008/T-009/T-010 实现对照确认视觉一致性，完成 Sprint 1 设计 sign-off
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: small
- **sprint**: 1
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-DS-002, T-DS-003]
- **acceptance_criteria**:
  - [ ] AC-001: 目视对照 Penpot P-001-Desktop 线框稿与 `localhost:5173` 实际渲染，三栏宽度、背景色梯度、TopBar 高度无明显偏差（允许 ±4px）
  - [ ] AC-002: 目视对照 Penpot C-004 SourcePane 视觉稿与实际 CodeMirror 高亮，标题色、行内代码色与 Token 定义一致
  - [ ] AC-003: 签字记录写入 `docs/EVENT-LOG.jsonl`（`event=design_signoff, phase=development, ref=T-DS-004`）
- **deliverables**:
  - [ ] `docs/EVENT-LOG.jsonl` — design_signoff 事件（T-DS-004）

---

### T-VAL-01: [VALIDATION] Sprint 1 验证：三栏布局 + 实时预览

- **目标**: 用户手动验证 Sprint 1 核心里程碑：三栏 UI 可见、输入 Markdown 后右栏实时显示预览、草稿持久化
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **sprint**: 1
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-008, T-009, T-010, T-011, T-012]
- **acceptance_criteria**:
  - [ ] 在桌面浏览器（≥1280px）打开 `http://localhost:5173`，可见三栏布局，左栏背景略深暖灰、中栏最亮暖白、右栏微冷白，符合 ui-spec §0.2 层次原则
  - [ ] 在中栏输入 `# 测试标题`，停止输入约 300ms 后，右栏 iframe 内出现对应 HTML（含 `<h1>`），无需手动刷新
  - [ ] 拖拽左栏/中栏 Splitter，左栏宽度实时跟随鼠标变化，范围约 160px～320px；刷新页面后宽度保持（IndexedDB 持久化）
  - [ ] 在中栏输入几段 Markdown 内容，关闭浏览器标签页后重新打开，中栏内容恢复（草稿持久化）
  - [ ] 将浏览器窗口缩至 <1280px，左侧面板消失（改为抽屉）；点击 TopBar 左端☰图标，抽屉从左侧滑入并覆盖半透明遮罩
- **relates_to**: [F-001, F-002, M-001, M-013]
