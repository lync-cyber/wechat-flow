---
id: "ui-spec-wechat-flow-c001-c014"
version: "0.1.2"
doc_type: ui-spec
author: ui-designer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "arch-wechat-flow", "arch-wechat-flow-modules"]
consumers: [tech-lead, developer]
volume: components
volume_type: components
split_from: "ui-spec-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 2. 组件清单"
---
# UI Specification 分卷 — 组件清单: wechat-flow

[NAV]
- §2 组件清单 → C-001..C-016
[/NAV]

## 2. 组件清单

所有组件继承 §1 设计系统 Token（见主卷），不在组件层重复声明色值。

---

### C-001: 顶栏（TopBar）

**映射功能**: F-001 (AC-005 多文档), F-002 (AC-002 视口切换), F-003 (AC-002 主题名指示)

**布局**：固定于页面顶部，高度 `48px`，背景 `--color-surface-elevated`，底边 `1px solid --color-border-subtle`。

从左至右区域：
1. **Logo 区**（宽 `200px`，与左侧面板等宽）：Logo 图形（赤陶 `--color-accent` 点缀）+ 产品名文字（`--font-sans`, 14px, semibold）
2. **文档名区**（auto）：当前文档名，可点击进入文档重命名（inline edit），overflow 时 `...` 省略
3. **当前主题指示器**（只读，不可点击）：16×16px 色块 + 主题名文字，反映 Q3 决策（顶栏显示当前主题名但不触发切换）
4. **工具栏按钮组**（右对齐，从左到右顺序）：
   - 「+」插入按钮（C-003 ghost variant，触发 C-015 InsertDrawer）
   - 视口切换器（C-003 ghost variant，切换预览宽度）
   - 「...」次级菜单按钮（C-003 ghost variant，触发 C-016 ContextMenu）
5. **用户菜单**（最右侧）：头像或默认图标，下拉展开 C-010

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `default` | 背景 `--color-surface-elevated`，文字 `--color-text-primary` |
| `document-unsaved` | 文档名后追加 `·`（中点符），颜色 `--color-text-muted` |
| `syncing` | 文档名区左侧显示旋转中的同步图标（`--color-brand-muted`，16px） |
| `offline` | 顶栏底部边框变为 `--color-warning`（2px），并在文档名旁显示「离线」小 Tag |
| `conflict` | 顶栏底部边框变为 `--color-error`（2px），文档名右侧显示「冲突」Tag（`--color-error-subtle` 背景，`--color-error` 文字，`--font-size-xs`，`--radius-full`），点击 Tag 跳至 P-002 进入冲突合并流程 |
| `focus-mode` | 工具栏按钮组全部隐藏，仅保留 Logo + 文档名；底边分隔线消失 |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `docTitle: string`, `themeName: string`, `themeAccentColor: string`, `syncState: 'idle' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict'`, `isFocusMode: boolean`, `hasUnsavedChanges: boolean`

---

### C-002: 栏宽 Splitter（ResizableSplitter）

**映射功能**: F-001 (AC-008 三栏布局), 对应 ARCH M-001 EditorShell

**外观**：竖向细线，宽度 `4px`，颜色 `--color-border-subtle`，高度撑满内容区。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `idle` | `4px` 线宽，颜色 `--color-border-subtle`；透明命中区扩展为 `8px` |
| `hover` | 线宽扩展为 `3px`，颜色加深为 `--color-border`；鼠标指针变 `col-resize` |
| `dragging` | 线宽保持 `3px`，颜色变 `--color-brand`；全局 cursor 固定为 `col-resize`（防止移出元素时 cursor 恢复） |
| `disabled` | 颜色 `--color-surface-overlay`，hover 和拖拽事件不响应（用于平板档编辑/预览分栏不可被禁用的分隔） |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `direction: 'vertical'`, `minLeft: number`, `maxLeft: number`, `defaultLeft: number`, `disabled?: boolean`, `onResize: (leftPx: number) => void`

**约束**：拖拽期间全局禁止文本选择（`user-select: none`）；拖拽结束后宽度值持久化到 IndexedDB。

---

### C-003: 工具栏按钮（ToolbarButton）

**映射功能**: F-001 (AC-006 撤销/重做), F-002 (AC-002 视口切换), F-004 (AC-001 复制), F-005 (长图/封面导出)

**外观**：图标按钮（24×24px 图标 + 4px 内边距），圆角 `--radius-base`。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `default` | 背景透明，图标颜色 `--color-text-secondary` |
| `hover` | 背景 `--color-surface-overlay`，图标颜色 `--color-text-primary` |
| `active`（按下瞬间）| 背景 `--color-surface-sunken`，图标轻微下移 `1px`（视觉按压感） |
| `toggled`（持续激活）| 背景 `--color-brand-subtle`，图标颜色 `--color-brand` |
| `disabled` | 背景透明，图标颜色 `--color-text-muted`，opacity `0.5`，不响应 hover |
| `focus`（键盘焦点）| 外围 `2px solid --color-brand` outline，offset `2px` |
| `loading` | 图标替换为旋转 spinner（同色），不响应点击 |

**变体**（`variant`）:
- `ghost`（默认）：如上所述
- `primary`：背景 `--color-brand`，图标颜色 `--color-text-inverse`；hover 时背景 `--color-brand-hover`
- `destructive`：hover 时图标颜色变 `--color-error`，背景变 `--color-error-subtle`

**Props**: `icon: string`, `label: string`, `variant?: 'ghost' | 'primary' | 'destructive'`, `disabled?: boolean`, `loading?: boolean`, `toggled?: boolean`, `onClick: () => void`

---

### C-004: 源码编辑器（SourcePane）

**映射功能**: F-001 全部 AC, F-014 (AC-006 中文排版)；对应 ARCH M-001 SourcePane（CodeMirror 6）

**布局**：占据中栏全部区域，背景 `--color-surface`（最亮暖白，编辑区视觉重心）。

**内部区域**：
- 左侧行号（宽 `48px`，背景 `--color-surface-elevated`，颜色 `--color-text-muted`）
- 正文输入区（padding `var(--space-6) var(--space-8)`）
- 右侧可选折叠指示器

**字体**：正文内容区使用 `--font-serif`（衬线体），保证写作沉浸感；行高 `--line-height-relaxed`。行号和 UI 控件使用 `--font-mono`。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `loading-large-doc` | 正文区域展示骨架屏：3 组宽度各异的深色横条（宽 80%/60%/70%），高度 `16px`，背景 `--color-surface-overlay`，pulse 动画 |
| `ready` | 正常可编辑状态，光标可见，语法高亮激活 |
| `focus`（光标聚焦正文区）| 光标可见并以 `--duration-instant` 周期闪烁；当前行背景轻微高亮 `--color-surface-overlay`（仅本行，不影响其他行） |
| `blur`（焦点离开编辑器）| 光标隐藏；当前行高亮取消；行号区颜色加深一档（从 `--color-text-muted` 到 `--color-text-secondary`），暗示焦点已离开但保持位置感 |
| `readonly` | 正文区背景变 `--color-surface-elevated`，光标变为 `default`，顶部出现只读提示 Banner（橙黄色，12px 文字，高 `28px`） |
| `error` | 编辑器底部出现 `--color-error` 色条（`4px` 高），Toast 提示具体错误 |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `docId: string`, `initialValue: string`, `readonly?: boolean`, `onValueChange: (value: string) => void`, `onCursorChange: (pos: Position) => void`, `onFocus?: () => void`, `onBlur?: () => void`

#### C-004.1 CodeMirror 语法高亮 Token

编辑器内 Markdown 语法元素的高亮配色，从 §1.1 主题 Token 派生，确保与"专注写作"调性一致（避免 CodeMirror 默认 One Dark/One Light 主题与暖白基底冲突）。所有色值均引用 Token，方便深色主题后续覆写。

| 语法元素 | 颜色 Token | 字重 / 样式 | 说明 |
|---------|-----------|-----------|------|
| 标题（`#`, `##`, `###`）| `--color-brand`（墨绿） | `--font-weight-semibold` | H1/H2/H3 同色，仅字号通过 CodeMirror Theme 区分（`--font-size-lg`/`base`/`sm`）|
| 粗体（`**text**`）| `--color-text-primary` | `--font-weight-bold` | 字重区分，色值不变 |
| 斜体（`*text*`）| `--color-text-secondary` | italic | 微弱色差 + 字形区分 |
| 行内代码（`` `code` ``）| `--color-accent`（赤陶） | normal weight + `--font-mono` | 等宽字体 + 强调色，背景 `--color-accent-subtle` |
| 代码块（```` ``` ````）| `--color-text-primary` | `--font-mono`，块背景 `--color-surface-elevated` | 内部按语言不再二次高亮（v1 范围）|
| 链接（`[text](url)`）| `--color-text-link` | underline + normal weight | 链接 url 部分（圆括号内）显示为 `--color-text-muted`，11px |
| 列表标记（`-`, `*`, `1.`）| `--color-brand-muted` | normal weight | 弱化但可辨识 |
| 引用块（`> text`）| `--color-text-secondary` | italic + 左边框 `3px solid --color-brand-muted` | 引文气质 |
| 分隔线（`---`）| `--color-border-strong` | — | 视觉分组提示 |
| Directive 关键字（`:::block`, `::mark`）| `--color-accent` | `--font-weight-medium` + `--font-mono` | 高亮 directive 类型名，参数部分 `--color-text-secondary` |
| Frontmatter 区域（`--- ... ---`）| 全块背景 `--color-surface-sunken`，文字 `--color-text-secondary` | normal | 视觉上明显区别于正文 |
| HTML 标签（裸 HTML 块）| `--color-warning` | `--font-mono` | 引起作者注意（公众号过滤会处理），鼠标 hover 出现 tooltip 提示 |
| Markdown 转义（`\*`, `\_`）| `--color-text-muted` | italic | 弱化显示 |

`[ASSUMPTION]` 代码块内的语言级语法高亮（如 ```` ```python ```` 内的 Python 关键字）v1 不实现，仅保持等宽字体的纯文本展示。后续接入 highlight.js 或 Shiki 时再补充语言级 Token 映射，验证途径：用户访谈与开发阶段决策。

---

### C-005: 预览面板（PreviewPane）

**映射功能**: F-002 (AC-001 iframe 沙箱), F-002 (AC-002 视口切换)；对应 ARCH M-001 PreviewPane

**布局**：占据右栏全部区域，背景 `--color-surface-preview`（略冷白，模拟微信阅读环境）。

**内部结构**：
- 顶部视口切换工具栏（高 `36px`）：3 个切换按钮（`375` / `768` / `auto`），当前激活状态用 `--color-brand-subtle` 背景高亮
- iframe 容器（居中显示，width 按选中视口，周围留白 `--space-4`）
- 右下角同步状态指示器（直径 `8px` 圆点，见 A-012）
- 右上角复制按钮悬浮层（hover 时显示，`z-index: var(--z-toolbar)`）

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `loading` | iframe 区域展示居中旋转 spinner（直径 `32px`，颜色 `--color-brand-muted`），背景 `--color-surface-preview` |
| `populated` | iframe 正常显示渲染内容，无额外遮罩 |
| `error` | iframe 区域替换为错误状态视图：居中 `!` 图标（`--color-error`，`48px`）+ 简短错误说明（`--font-sans`, 14px）+ 「重试」按钮（C-003 primary variant） |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `htmlContent: string`, `viewport: '375' | '768' | 'auto'`, `isLoading: boolean`, `error?: string`, `syncState: 'idle' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict'`, `onViewportChange: (v: string) => void`

**约束**：iframe 属性 `sandbox=""`（空值，最严格）+ CSP `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`，零 JS 注入。目录跳转、高亮联动、复制按钮均通过主线程 `iframe.contentDocument` + overlay 实现，符合 ARCH M-001 描述。

#### C-005.1 同步状态指示器（SyncStateIndicator）

内嵌于 C-005 右下角，形态为直径 `8px` 色点，不可点击，仅为视觉反馈。状态来源：ARCH M-013 `getSyncState` 接口返回的 `status` 字段，完整枚举 `idle | connecting | syncing | synced | offline | error | conflict`。

**状态映射表**：

| syncState | 色点颜色 Token | pulse 动画 | 是否显示 Tag | 语义说明 |
|-----------|--------------|-----------|------------|---------|
| `idle` | `--color-text-muted`（灰） | 无 | 否 | 编辑器就绪，同步服务未启动或无待同步内容 |
| `connecting` | `--color-brand-muted`（浅绿）| 慢速 pulse（1.5s 周期） | 否 | 正在建立 WebSocket 连接，与 `idle` 通过 pulse 区分 |
| `syncing` | `--color-brand`（墨绿） | 快速 pulse（0.8s 周期） | 否 | 数据同步进行中 |
| `synced` | `--color-success`（深绿） | 无 | 否 | 同步完成，数据已最新 |
| `offline` | `--color-warning`（暖黄棕） | 无 | 否 | 网络离线，显示离线色点 |
| `error` | `--color-error`（赤陶红） | 无 | 否 | 同步出错，色点变红 |
| `conflict` | `--color-error`（赤陶红） | 无 | 是：「冲突」Tag（`--color-error-subtle` 背景，`--color-error` 文字，`--font-size-xs`，`--radius-full`） | 多端冲突，需用户手动处理 |

`connecting` 与 `idle` 的关键视觉差异：`idle` 为静态灰色点；`connecting` 为浅绿色点 + 慢速 pulse，让用户感知到连接正在建立中。

**状态来源**：

- `idle` / `connecting` / `syncing` / `synced` / `error`：直接来自 ARCH M-013 `YDocBinding.sync.status` 五态枚举，应用层（M-008）订阅 `YDocBinding.on('sync-status')` 事件并透传到 PreviewPane 的 `syncState` Prop
- `offline`：M-013 不暴露此态，由应用层（M-008）监听 `navigator.onLine` 事件 + WebSocket 关闭信号合成推导（在 `syncState` Prop 注入前覆盖底层 status）
- `conflict`：M-013 不暴露此态，由应用层（M-008）监听 `YDocBinding.on('merge-conflict')` 事件（或 Yjs `update` 事件中的多源合并冲突信号）合成推导
- 应用层负责优先级合成：`conflict` > `error` > `offline` > 底层 5 态，确保 UI 单一 Prop 即可表达完整语义

---

### C-006: 左侧面板 Tab 组（LeftPanelTabs）

**映射功能**: F-003 (AC-001 主题选择), F-001 (AC-002 组件插入), F-001 (AC-005 多文档)

**布局**：Tab 标题行（高 `40px`），下方内容区（剩余高度）。背景整体 `--color-surface-elevated`。

**Tab 序列**（Q3 决策，固定顺序）：主题 / 组件 / 文档

**Tab 标题状态**：

| 状态 | 视觉表现 |
|------|---------|
| `default`（未选中）| 背景透明，文字 `--color-text-secondary`，底边无指示 |
| `hover` | 背景 `--color-surface-overlay`，文字 `--color-text-primary` |
| `active`（选中）| 背景 `--color-surface-overlay`，文字 `--color-brand`，底边 `2px solid --color-brand` |
| `disabled` | 文字 `--color-text-muted`，opacity `0.5`，不响应交互（预留给未来锁定的 Tab） |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `defaultTab: 'theme' | 'components' | 'docs'`, `onTabChange: (tab: string) => void`

---

### C-007: 主题卡片（ThemeCard）

**映射功能**: F-003 (AC-001 主题选择, AC-003 社区扩展占位)；位于左侧面板「主题」Tab 内

**布局**：卡片尺寸 `宽 (面板宽-2×space-4) × 高 auto`，内部包含主题缩略图（高 `60px`，border-radius `--radius-sm`）+ 主题名（14px, medium）+ 简短描述（12px, muted）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `default` | 白色背景卡片（`--color-surface`），边框 `1px solid --color-border-subtle`，无阴影 |
| `hover` | 背景 `--color-surface-overlay`，边框 `--color-border`，阴影 `--shadow-sm`，鼠标 `pointer` |
| `selected`（当前应用主题）| 边框 `2px solid --color-brand`，左上角出现对勾图标（`--color-brand`） |
| `disabled`（占位卡片，如「社区主题」） | 全卡片 opacity `0.6`，缩略图替换为「更多主题即将上线」文字占位，点击跳转 `/themes` 路由 |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `theme: ThemeDefinition`, `isSelected: boolean`, `isPlaceholder?: boolean`, `onSelect: (id: string) => void`

---

### C-008: Block 库列表项（BlockLibItem）

**映射功能**: F-001 (AC-002 directive 插入), F-003 (AC-006 Block 层)；位于左侧面板「组件」Tab 内

**布局**：行高 `40px`，左侧 Block 类型图标（16px）+ Block 名称（14px, medium）+ 右侧 variant 数量角标（如「5 款皮肤」）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `default` | 背景透明，文字 `--color-text-primary`，图标 `--color-text-secondary` |
| `hover` | 背景 `--color-surface-overlay`，文字 `--color-text-primary`，图标颜色变 `--color-brand` |
| `dragging`（拖拽中）| 被拖拽项背景 `--color-brand-subtle`，半透明（opacity `0.8`），跟随鼠标的 ghost 元素复制一份；鼠标下方编辑器光标变 `copy` |
| `disabled` | 背景透明，全文字 `--color-text-muted`，opacity `0.5`，不可点击（如当前主题未实现该 Block） |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `block: BlockDefinition`, `disabled?: boolean`, `onInsert: (block: BlockDefinition) => void`, `onDragStart?: () => void`

---

### C-009: 命令面板（CommandPalette）

**映射功能**: F-001 (AC-008 命令超集)；Q6 决策：仅 UI 动作（~15-20 个），不含内容编辑和 LLM 动作

**布局**：居中 Modal 层叠，宽 `560px`，最大高 `400px`（内部列表超出时滚动）。背景 `--color-surface`，边框 `1px solid --color-border`，阴影 `--shadow-md`，圆角 `--radius-lg`，z-index `--z-command`。

**内部结构**：
- 顶部搜索输入框（高 `48px`，图标 + 占位文字「搜索动作…」）
- 可滚动动作列表（分组，组标题 `--color-text-muted`，10px uppercase）
- 底部快捷键提示行（`↑↓ 导航 | ↵ 执行 | Esc 关闭`）

**动作分组**（Q6 细化）：
1. **视图** — 专注模式切换、折叠左栏、折叠右栏、切换视口
2. **主题** — 切换至各内置主题（动态生成）
3. **文档** — 跳转到指定文档（输入关键词搜索文档列表，按 IndexedDB 中的标题模糊匹配）、新建文档、删除当前文档
4. **导出** — 复制 inline HTML、下载 HTML 文件、导出长图、导出封面（横版）、导出封面（方版）
5. **帮助** — 快捷键手册、新功能说明

> 注：F-014 中文排版修订不进入命令面板（已在 C-016 ContextMenu 的「中文排版修订」菜单项中作为一级入口暴露），避免双入口。Q6 决策范围明确"仅 UI 动作"，"文档"分组属 UI 导航动作，不违反 Q6 边界。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM，不占位 |
| `open-empty`（刚打开，无输入）| 显示所有分组和默认动作列表，搜索框聚焦，光标闪烁 |
| `open-typing`（输入中）| 搜索框有文字，列表实时过滤，匹配字符高亮（`--color-brand` 加粗） |
| `open-results`（有结果）| 列表显示过滤后结果，第一项默认高亮选中（背景 `--color-surface-overlay`）|
| `no-results` | 列表区域显示居中文字「没有匹配的动作」（`--color-text-muted`，14px） |
| `executing`（动作执行中）| 被执行项显示 spinner，面板保持可见，完成后自动关闭并触发 Toast |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `isOpen: boolean`, `commands: CommandDefinition[]`, `onClose: () => void`, `onExecute: (cmd: CommandDefinition) => void`

---

### C-010: 下拉菜单 / Popover（DropdownMenu）

**映射功能**: F-001 (工具栏下拉), F-004 (导出选项)

**布局**：触发元素下方（或上方，边界检测）展开，最小宽 `160px`，最大宽 `280px`。背景 `--color-surface`，边框 `1px solid --color-border`，阴影 `--shadow-base`，圆角 `--radius-md`，z-index `--z-dropdown`。

**内部结构**：菜单项（高 `36px`，图标可选 + 文字 + 右侧快捷键提示），分隔线（`1px solid --color-border-subtle`），分组标题（`--color-text-muted`，11px）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM |
| `open` | 以 `--duration-base` `--ease-decelerate` 从触发元素向下展开（translateY -4px → 0，opacity 0 → 1） |
| `item-default` | 文字 `--color-text-primary`，背景透明 |
| `item-hover` | 背景 `--color-surface-overlay`，文字 `--color-text-primary` |
| `item-active`（键盘选中）| 与 hover 相同外观 |
| `item-disabled` | 文字 `--color-text-muted`，opacity `0.5`，不响应 hover |
| `item-destructive`（危险操作，如清空正文）| 文字 `--color-error`，hover 背景 `--color-error-subtle` |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `trigger: ReactNode | VNode`, `items: MenuItem[]`, `placement?: 'bottom-start' | 'bottom-end' | 'top-start'`, `onSelect: (item: MenuItem) => void`

---

### C-011: Toast 通知（Toast）

**映射功能**: F-004 (复制成功/失败反馈), F-005 (Job 状态变更)

**布局**：固定于页面右下角，每条 Toast 宽 `320px`，高 `auto`（最小 `48px`），圆角 `--radius-md`，阴影 `--shadow-base`，多条时纵向叠加（最多同时显示 3 条）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `info` | 背景 `--color-info-subtle`，左边框 `3px solid --color-info`，图标（信息圆圈）`--color-info` |
| `success` | 背景 `--color-success-subtle`，左边框 `3px solid --color-success`，图标（对勾圆圈）`--color-success` |
| `warning` | 背景 `--color-warning-subtle`，左边框 `3px solid --color-warning`，图标（感叹三角）`--color-warning` |
| `error` | 背景 `--color-error-subtle`，左边框 `3px solid --color-error`，图标（叉圆圈）`--color-error` |
| `entering` | 从右侧滑入（translateX +20px → 0，opacity 0 → 1，`--duration-fast` `--ease-decelerate`） |
| `leaving` | 向右滑出（translateX 0 → +20px，opacity 1 → 0，`--duration-fast` `--ease-accelerate`），占位高度随后坍缩 |

**自动消失时间**：info/success `3000ms`，warning `5000ms`，error 不自动消失（需用户手动关闭）。

**变体 (variant)**：`info` / `success` / `warning` / `error`，对应上表各状态的色系，详见状态表视觉差异描述。

**Props**: `type: 'info' | 'success' | 'warning' | 'error'`, `message: string`, `duration?: number`, `onClose: () => void`

---

### C-012: Modal / Dialog

**映射功能**: F-001 (离开确认对话框), F-005 (导出配置对话框)

**布局**：居中，背景遮罩（`rgba(28,25,23,0.5)`，z-index `--z-modal - 1`），对话框宽 `480px`（默认），圆角 `--radius-lg`，阴影 `--shadow-lg`，背景 `--color-surface`。

**内部结构**：标题行（20px, semibold）+ 内容区（padding `--space-6`）+ 底部按钮行（操作按钮右对齐）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM |
| `entering` | 遮罩 opacity 0→1（`--duration-fast`），对话框 scale 0.96→1 + opacity 0→1（`--duration-base`，`--ease-decelerate`） |
| `open` | 正常显示，焦点 trap 在 Modal 内部 |
| `leaving` | 与 entering 反向，`--ease-accelerate` |
| `confirm-variant` | 底部两个按钮：「取消」（ghost）+「确认」（primary 或 destructive） |
| `form-variant` | 内容区包含表单，底部「取消」+「保存」 |

**约束**：Esc 键关闭（非 `form-variant` 中有未保存更改时需确认）；点击遮罩关闭（`confirm-variant` 不可点遮罩关闭）；焦点 trap，tab 键循环。

**变体 (variant)**：`confirm`（底部两个按钮：「取消」+「确认/危险操作」）/ `form`（底部「取消」+「保存」，内容区包含表单）。两种变体在遮罩点击行为和按钮布局上有差异，详见状态表。

**Props**: `isOpen: boolean`, `title: string`, `variant?: 'confirm' | 'form'`, `size?: 'sm' | 'md' | 'lg'`, `onClose: () => void`, `children: ReactNode | VNode`

---

### C-013: Lint 诊断面板（DiagnosticsPanel）

**映射功能**: F-011 (质量保障), F-002 (AC-005 兼容性报告)；对应 ARCH M-001 DiagnosticsPanel

**布局**：位于编辑器底部，高度在折叠/展开间切换，宽度与中栏一致。背景 `--color-surface-elevated`，顶边 `1px solid --color-border`。

**内部结构**（展开时）：
- 标题行：「兼容性报告」+ 汇总计数（绿/黄/红色计数）+ 折叠/展开按钮
- 诊断列表（每条高 `36px`）：
  - 左侧级别色块（`4×36px` 竖条：红/黄/绿）
  - 节点描述（14px）
  - 右侧操作链接（「查看」跳转到编辑器对应行）

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `empty-no-issues` | 折叠状态，标题行显示绿色「无风险」，全绿对勾图标 |
| `has-issues` | 标题行显示「提醒 N 项 / 严重 N 项」，颜色分别为 `--color-warning` / `--color-error` |
| `running`（分析中）| 标题行显示「正在分析…」+ 旋转 spinner（`--color-brand-muted`），列表区域 skeleton 占位 |
| `collapsed` | 高度 `32px`，仅显示标题行，展开按钮向上箭头 |
| `expanded` | 高度 `auto`（最大 `200px` 可滚动），展开按钮向下箭头 |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `diagnostics: DiagnosticReport`, `isRunning: boolean`, `isExpanded: boolean`, `onToggle: () => void`, `onItemClick: (nodeId: string) => void`, `onShowDiff: (nodeId: string) => void`

#### C-013.1 兼容性 Diff 视图（CompatibilityDiffView）

**映射功能**: F-002 AC-006「兼容性报告支持展开查看粘贴前后逐节点的变更对照，以及每条规则的命中记录」

**触发方式**: C-013 诊断列表中每一项的右侧出现「查看变更」链接（紧邻原「查看」跳转链接），点击触发 Diff 视图。

**布局**: 复用 C-012 Modal 的 `lg` 尺寸（宽 `720px`），左右双栏对比：

```
┌────────────────────────────────────────────────────────┐
│  Modal 标题: 节点变更对照 — {selector path}             │
├──────────────────────────┬─────────────────────────────┤
│  粘贴前（before）         │  粘贴后（after）             │
│  背景 --color-surface     │  背景 --color-success-subtle│
│  ─────────────────       │  ────────────────────       │
│  <tag attr1="v1"          │  <tag attr1="v1"             │
│       attr2="v2"          │       (attr2 已移除)         │
│       style="...">        │       style="..." 已重写>    │
│       内容文本             │       内容文本                │
│  </tag>                  │  </tag>                       │
│                          │                              │
│  属性 diff:               │  属性 diff:                  │
│  - attr2 已删除（红色）   │  - style 重写（黄色）        │
│  - class 保留（绿色）     │  - class 保留（绿色）        │
├──────────────────────────┴─────────────────────────────┤
│  规则命中: 「remove-script-attrs」(F-007 §X)            │
│  [关闭]                                                 │
└────────────────────────────────────────────────────────┘
```

**内部结构**:
- 顶部标题：「节点变更对照 — {selector path}」（如 `body > div.section > p:nth-child(3)`），文字 `--font-size-base` semibold
- 主体双栏：左 before 栏（背景 `--color-surface`，模拟原始 HTML），右 after 栏（背景 `--color-success-subtle`，表示过滤后通过）
- 每栏内：HTML 代码块（`--font-mono`，`--font-size-sm`），关键差异行高亮（红/黄/绿背景对应删除/重写/保留）
- 属性 diff 子列表：逐属性变化（每行一个 `--font-size-xs`，前缀 `+` / `-` / `=` + 颜色）
- 底部命中规则行：显示触发本次变更的过滤规则 ID（如 `remove-script-attrs`）及其在 F-007 中的位置，可点击跳转到规则详情

**状态**:

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM |
| `loading` | Modal 开启但内容区显示 spinner（`--color-brand-muted`，居中），加载 before/after HTML 片段 |
| `populated` | 双栏正常显示对比内容 + 属性 diff + 命中规则 |
| `error` | 内容区替换为错误状态：「无法加载节点变更对照」+ 「关闭」按钮 |

**变体 (variant)**: 单一形态组件，无 variant 区分（仅 Modal 形态，未来若移动端需独立路由展示可扩展 `fullscreen` variant）

**Props**: `isOpen: boolean`, `nodeId: string`, `before: string` (HTML 片段), `after: string` (HTML 片段), `attrDiff: AttrDiffEntry[]`, `triggerRule: { id: string; label: string; ref: string }`, `onClose: () => void`

`[ASSUMPTION]` before/after HTML 片段的获取由 M-003 过滤规则集引擎在执行过滤时记录（before = 原始 DOM 节点 outerHTML，after = 过滤后 outerHTML），通过 DiagnosticReport 中的 `nodeChangeRecords` 字段携带；当前 ARCH §3 未明确该字段，待 dev-plan 阶段对齐。

---

### C-014: Job 进度条（JobProgressBar）

**映射功能**: F-005 (长图/封面异步导出)；对应 ARCH §3.E-005 Job 状态机、API-020 SSE

**布局**：位于 Modal 内（C-012 form-variant）或 Toast 下方展开（取决于触发场景）。宽度撑满容器，高度 `8px`（进度轨道）。

**内部结构**：进度轨道（背景 `--color-brand-muted`，圆角 `--radius-full`）+ 进度填充（背景 `--color-brand`，圆角 `--radius-full`，带 `width` 过渡动画）+ 下方文字描述行（14px，`--color-text-secondary`）。

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `queued` | 进度 0%，文字「等待中…」，进度轨道全灰（`--color-brand-muted`） |
| `running` | 进度填充宽度 = `{percent}%`，带 `transition: width 300ms ease`；文字「正在导出 {percent}%」；当 percent 未知时切换为 indeterminate：轨道上的填充块来回移动（keyframe animation） |
| `completed` | 进度 100%，填充色变 `--color-success`，文字「导出成功」+ 下载链接；2s 后自动切换为可复用状态 |
| `failed` | 填充色变 `--color-error`，文字「导出失败：{errorMsg}」+ 「重试」按钮 |
| `canceled` | 进度停止，文字「已取消」，填充色变 `--color-text-muted` |

**变体 (variant)**: 单一形态组件，无 variant 区分

**Props**: `status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'`, `percent?: number`, `errorMsg?: string`, `downloadUrl?: string`, `onRetry: () => void`, `onCancel: () => void`

---

### C-015: InsertDrawer（「+」插入抽屉）

**映射功能**: F-001 (AC-002 directive 插入), F-001 (AC-001 UI 骨架「+」入口)；对应 ARCH M-001 InsertDrawer

**触发方式**：点击顶栏工具栏右侧「+」按钮（C-001 工具栏第一个图标按钮）展开；再次点击或 Esc 关闭。

**布局**：从右侧滑入的抽屉，宽 `320px`，高度撑满视口（顶栏以下），背景 `--color-surface`，左边框 `1px solid --color-border`，阴影 `--shadow-md`，z-index `--z-dropdown`。

**内部结构**：
- 标题行（高 `48px`）：「插入组件」标题（16px, semibold）+ 右侧关闭按钮（C-003 ghost）
- 分类 Tab 行（高 `40px`）：`[ASSUMPTION]` 按 directive 类型分四组「行内」/「块级」/「标注」/「封面」 — 分组依据为 directive 在编辑器内的渲染位置（inline / block / mark / cover），与 ARCH M-001 BlockRegistry 实际类型枚举可能存在偏差，dev-plan 阶段需对齐 BlockRegistry 的真实分类轴并修订本字段；不对齐 BlockRegistry 时开发者不应硬编码这 4 个分类名
- 组件列表（剩余高度，可滚动）：每项为 C-008 BlockLibItem 规格，含图标 + 名称 + 简述
- 底部参数表单区（高度 auto，当选中某组件后展开）：显示该 directive 的可配置参数（key-value 表单行，C-003 风格的输入控件）+ 实时预览（小型 iframe 沙箱，宽度适配抽屉，高 `120px`，展示该组件当前参数下的渲染效果）

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM，不占位 |
| `opening` | 从右侧滑入（translateX +320px → 0，`--duration-base`，`--ease-decelerate`），背景 Overlay `rgba(28,25,23,0.2)` 同步淡入 |
| `idle`（已打开，无选中项）| 显示分类 Tab + 组件列表，底部参数区隐藏 |
| `item-selected`（选中某组件）| 底部参数区展开（`--duration-base` 高度过渡），实时预览刷新 |
| `closing` | 向右滑出（translateX 0 → +320px，`--duration-base`，`--ease-accelerate`） |

**变体 (variant)**：`panel`（默认，抽屉叠加在内容区右侧，编辑区宽度不变） / `inline`（移动端降级，底部抽屉形态，高度 `60vh`，从底部滑入）

**Props**: `isOpen: boolean`, `directives: DirectiveDefinition[]`, `onInsert: (directive: DirectiveDefinition, params: Record<string, unknown>) => void`, `onClose: () => void`

---

### C-016: ContextMenu（「...」次级菜单）

**映射功能**: F-001 (AC-001 UI 骨架「...」次级菜单), F-006 (导出), F-014 (中文排版修订入口), F-001 (载入示例)；对应 ARCH M-001 ContextMenu

**触发方式**：点击顶栏工具栏「...」图标按钮（C-001 工具栏最右侧，紧邻用户菜单）展开；点击菜单外部或 Esc 关闭。与 C-010 DropdownMenu 共享样式规范，本条目定义其内容结构与菜单项语义。

**布局**：继承 C-010 DropdownMenu 的外观规范（`min-width: 200px`，`max-width: 280px`，背景 `--color-surface`，边框、阴影、圆角与 C-010 一致），定位于「...」按钮下方右对齐。

**菜单结构**：

| 菜单项 | 图标 | 快捷键 | 语义 |
|--------|------|--------|------|
| 载入示例文档 | 文档图标 | — | 用预置示例内容填充编辑器（F-001 AC-003） |
| 中文排版修订 | 中文字图标 | — | 触发 F-014 中文排版规则扫描与建议（分隔线上方） |
| —（分隔线）| — | — | 分隔功能区 |
| 复制 HTML | 复制图标 | Ctrl+Shift+C | 复制 inline-styled HTML（F-004） |
| 下载 HTML | 下载图标 | — | 下载 .html 文件（F-004） |
| —（分隔线）| — | — | 分隔导出区 |
| 快捷键手册 | 键盘图标 | ? | 打开快捷键说明 Modal（C-012 confirm-variant） |
| 新功能说明 | 礼盒图标 | — | 打开更新说明 Modal |

**状态**：

| 状态 | 视觉表现 |
|------|---------|
| `closed` | 不存在于 DOM |
| `open` | 从「...」按钮下方展开，`--duration-base` `--ease-decelerate` 入场动画（translateY -4px → 0，opacity 0 → 1） |
| `item-default` | 文字 `--color-text-primary`，背景透明，图标 `--color-text-secondary` |
| `item-hover` | 背景 `--color-surface-overlay`，文字 `--color-text-primary`，图标颜色 `--color-brand` |
| `item-disabled` | 文字 `--color-text-muted`，opacity `0.5`，不响应交互（如当前文档为空时禁用「中文排版修订」） |

**变体 (variant)**: 单一形态组件，无 variant 区分（内容结构固定，不需要多变体）

**Props**: `isOpen: boolean`, `onClose: () => void`, `onLoadExample: () => void`, `onTypographyRevise: () => void`, `onCopyHtml: () => void`, `onDownloadHtml: () => void`, `onShowShortcuts: () => void`, `onShowChangelog: () => void`

**设计决策说明**: PRD F-001 `[DRAFT_UI_INPUT]`（参考输入，非规范性约束）中列出的「发文清单 / 导出 Markdown / 清空正文 / 末尾『更多...』跳命令面板」四项**未纳入** C-016 菜单，原因如下：
- **发文清单** — 未在任何 PRD/ARCH AC 中定义为 v1 范围（DRAFT_UI_INPUT 为前期草拟参考，后续 AC 未承接），v1 不实现
- **导出 Markdown** — F-004 AC 仅声明"复制 inline HTML / 下载 HTML"为输出能力，未声明 Markdown 导出；保留源码导出能力可通过浏览器原生「另存为」实现，不需独立 UI 入口
- **清空正文** — 高破坏性操作，移至命令面板（C-009 文档分组的「删除当前文档」更安全语义）；ContextMenu 内置「清空正文」按钮易误触
- **「更多...」跳命令面板** — Ctrl+K 已是命令面板标准入口（A-003 全局快捷键），ContextMenu 内重复跳转入口冗余

后续若 PRD/ARCH 升级 AC 包含上述功能，再在本菜单结构中追加。
