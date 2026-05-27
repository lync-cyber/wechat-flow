---
id: "review-ui-spec-wechat-flow-r1"
doc_type: review
author: reviewer
status: approved
deps: ["ui-spec-wechat-flow", "ui-spec-wechat-flow-c001-c014", "ui-spec-wechat-flow-p001-p005"]
---
# REVIEW: ui-spec-wechat-flow r1

**被审文档**: 主卷 `ui-spec-wechat-flow` + 分卷 `ui-spec-wechat-flow-c001-c014` + 分卷 `ui-spec-wechat-flow-p001-p005`
**审查轮次**: r1（首次审查）
**Layer 1 结果**: 主卷 PASS（WARN×1）；components 分卷 FAIL（FAIL×1，WARN×2）；pages 分卷 PASS（WARN×1）
**Layer 2**: 已执行完整 AI 语义审查

---

## Layer 1 问题（自动检查）

### [R-001] HIGH: 组件分卷 14 个组件中 9 个缺少变体定义

- **category**: completeness
- **root_cause**: self-caused
- **描述**: Layer 1 脚本报告 components 分卷 14 个组件中 9 个缺少 `variant` 定义。逐一核查后，C-003（ToolbarButton）已有 `variant` 字段（ghost/primary/destructive），C-009（CommandPalette）有功能分组，但 C-004 SourcePane、C-005 PreviewPane、C-006 LeftPanelTabs、C-008 BlockLibItem、C-010 DropdownMenu、C-011 Toast、C-012 Modal、C-013 DiagnosticsPanel、C-014 JobProgressBar 均无 `variant` 字段声明。从文档内容来看，部分组件（如 C-011 Toast、C-012 Modal）使用了 state 表代替 variant 表达语义变体（info/success/warning/error；confirm/form），但 Layer 1 期望 `variant` 字段显式存在。
- **建议**: 在无 `variant` 字段的组件定义中，对于确实有多种形态的组件（C-011、C-012）补充 `**变体（variant）**` 字段列出各变体名；对于无 variant 区分的纯单形态组件（如 C-004、C-013），说明"单一形态组件，无 variant 区分"，使 Layer 1 检查器可识别并跳过。

---

### [R-002] MEDIUM: 三个分卷/主卷行数超出 DOC_SPLIT_THRESHOLD_LINES（300 行）阈值

- **category**: convention
- **root_cause**: self-caused
- **描述**: 主卷 502 行、components 分卷 366 行均超出 300 行阈值，Layer 1 给出 WARN。虽文档内容整体清晰，但框架约定超限需说明原因或进一步拆分。
- **建议**: 如决定不进一步拆分（两文档语义完整性优先于行数），在各卷 frontmatter 增加 `split_policy: no-further-split` 并注明原因，或将 components 分卷按照复杂度（高交互组件 vs 基础组件）再拆为两个子卷。本条属于过程规范问题，不阻塞开发阶段使用。

---

### [R-003] MEDIUM: components 分卷 14 个组件全部缺少状态视觉差异描述（Layer 1 WARN）

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: Layer 1 报告"14 个组件中 14 个缺少状态视觉差异描述"。人工核查后发现多数组件（C-001、C-002、C-003 等）确实已有状态表，且各状态给出了视觉表现列。但 Layer 1 对"视觉差异描述"的判定可能要求比表格更明确的差异量化（如颜色值变化幅度、过渡时间等）。C-004 SourcePane 的状态表只列 4 态（loading-large-doc/ready/readonly/error），未包含 `focus`（光标聚焦态）和 `blur`（失焦态），在 CodeMirror 6 编辑器中两者视觉差异重要（focus ring / 光标可见性）。
- **建议**: 对 C-004 SourcePane 补充 `focus`/`blur` 状态视觉描述；对其他组件的状态表，在 Layer 1 检查器要求量化视觉差异描述的情况下补充关键 Token 值（颜色值/transition 时长），当前内容对开发者已可执行，可按 approved_with_notes 推进。

---

### [R-004] MEDIUM: pages 分卷 5 个页面中 4 个缺少空间构成说明（Layer 1 WARN）

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: Layer 1 报告 5 个页面中 4 个缺少"空间构成说明"。P-001 在布局描述中包含了关键间距说明和 ASCII 布局图，P-002、P-003、P-004、P-005 的布局描述较为简洁，缺少空间节奏（密集/留白）和视觉重心的明确描述。
- **建议**: P-002（文档列表）、P-003（主题市场）、P-004（设置页）补充一句关键的空间构成说明（如"内容区最大宽 640px 水平居中，两侧留白用 padding `--space-8`，视觉重心在内容区"），供开发者理解空间语义而非仅复刻尺寸。

---

## Layer 2 问题（AI 语义审查）

### [R-005] HIGH: F-001 UI 骨架中"「+」插入按钮"和"「...」次级菜单"缺少对应 UI 规范

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-001 `[DRAFT_UI_INPUT]` 中明确提到顶栏有「+」插入按钮（触发 directive 插入器抽屉）和「...」次级菜单（载入示例/中文排版/快捷键/导出等），这两个入口是写作者核心工作流的重要组成部分。但 UI 规范的 C-001 TopBar 的"工具栏按钮组"描述为"视口切换器 / 导出按钮 / 帮助 / 用户菜单"，没有「+」插入按钮和「...」次级菜单（或"InsertDrawer"/"ContextMenu"）的 UI 规范。ARCH M-001 也明确列出 `InsertDrawer`、`ContextMenu` 为内部关键组件，但 UI-spec 组件清单（C-001~C-014）中均未包含这两个组件。
- **建议**: 在组件清单中补充 C-015（InsertDrawer，「+」插入按钮触发的抽屉，含 directive 分类 tabs + 参数表单 + 实时预览）和 C-016（「...」次级菜单/ContextMenu）；或在 C-003 ToolbarButton 和 C-010 DropdownMenu 中通过详细使用场景说明覆盖两者，并在 C-001 TopBar 的布局描述中明确标注「+」和「...」按钮位置。

---

### [R-006] HIGH: 同步状态指示器（M-013）组件定义置于文档末注释而非正式规范

- **category**: completeness
- **root_cause**: self-caused
- **描述**: components 分卷末尾以 `>` 注释块描述了"同步状态指示器（M-013 对应视觉元素）被设计为 C-005 PreviewPane 的内嵌元素（右下角 8px 色点），状态映射：synced→success/syncing→brand（pulse 动画）/offline→warning/conflict→error"，并注明"如后续需要独立为 C-015，在 doc-review 阶段提出"。这是一个功能性设计决策，但置于注释中而非正式 Props 或状态表中。M-013 的 `getSyncState` 接口返回 `{ connected, awareness: AwarenessState[] }`，其中 `status` 为 `'idle' | 'connecting' | 'syncing' | 'synced' | 'error'`，但 UI 规范中 C-005 的 `Props` 字段没有 `syncState` 参数，开发者无法从 Props 定义推导如何接收并展示同步状态。此外 M-013 的状态枚举包含 `connecting`，但同步状态指示器的状态映射（synced/syncing/offline/conflict）与 M-013 的 `status` 枚举（idle/connecting/syncing/synced/error）不完全对应：`connecting` 和 `conflict` 在两者间存在语义差异。
- **建议**: 将同步状态指示器正式化为 C-005 PreviewPane 的一个内嵌子规范或独立 C-015；在 C-005 的 Props 中增加 `syncState: 'idle' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict'`；并明确状态映射表（含 `connecting` 和 `idle` 的视觉处理方式）。`conflict` 状态在 C-001 TopBar 的 `syncState` Props 已声明但未在同步指示器中处理。

---

### [R-007] MEDIUM: C-004 SourcePane 缺少 CodeMirror 6 语法高亮色彩 Token 规范

- **category**: completeness
- **root_cause**: self-caused
- **描述**: C-004 SourcePane 使用 CodeMirror 6，其内部语法高亮配色（Markdown 标题色、粗体色、链接色、代码色、directive 指令色等）是编辑器核心视觉体验，但 UI 规范中 §1.1 色彩 Token 和 C-004 组件定义均未提供 CodeMirror 主题配色方案。开发者实现时需要自行决策这套配色，有高风险偏离"暖意文人美学"调性（默认的 CodeMirror One Dark/One Light 主题均与本项目设计方向不符）。
- **建议**: 在 C-004 SourcePane 规范中补充 CodeMirror 6 语法高亮色彩映射表（至少覆盖：标题、粗体/斜体强调、链接、行内代码、代码块、directive 关键字、frontmatter 背景色），所有色值引用 §1.1 已定义的 Token 或派生新 Token 纳入 §1.1.8 编辑器语法高亮子组。

---

### [R-008] MEDIUM: P-003 主题市场响应式策略缺失（平板档和移动端档）

- **category**: completeness
- **root_cause**: self-caused
- **描述**: P-003 主题市场页面布局只描述了桌面档（4 列网格），没有描述平板档和移动端档的布局。`§5 响应式策略` 中的三档策略适用于主页（P-001），但 P-003、P-004 这类独立路由页面没有对应的响应式说明。4 列卡片网格在 768px 平板上宽度可能过窄（每列约 180px），开发者需要自行决策响应式断点规则。
- **建议**: 在 P-003 和 P-004 中补充平板档和移动端档的布局描述，至少说明"平板档改为 2 列网格 / 移动端改为 1 列列表"这样的简洁功能矩阵，或明确引用 §5 响应式策略的通用规则并说明适用范围。

---

### [R-009] MEDIUM: C-005 PreviewPane 的 sandbox 属性与 ARCH §5.3 描述存在差异

- **category**: consistency
- **root_cause**: self-caused
- **描述**: C-005 PreviewPane 规范中写明 `sandbox=""`（空值，最严格）+ CSP `default-src 'none'`，符合 ARCH §5.3。但 ARCH §5.3 的 CSP 详细描述为 `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`，C-005 规范中简写为 `CSP default-src 'none'`，遗漏了 `style-src 'unsafe-inline'`、`img-src` 和 `font-src` 的说明。这会导致开发者如果只看 UI-spec 实现 CSP，预览中主题样式和图片将无法加载（style-src 为 none 时所有内联样式被 CSP 拦截）。
- **建议**: 在 C-005 约束部分，将 CSP 补全为完整字符串 `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`，与 ARCH §5.3 完全一致。

---

### [R-010] MEDIUM: F-002 AC-005 兼容性报告"展开查看粘贴前后逐节点变更对照"缺少对应 UI 规范

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-002 AC-006 要求"兼容性报告支持展开查看粘贴前后逐节点的变更对照，以及每条规则的命中记录"。C-013 DiagnosticsPanel 规范描述了折叠/展开状态和每条诊断项（级别色块 + 节点描述 + 「查看」跳转），但没有描述"粘贴前后逐节点变更对照"视图（即 diff 视图）的 UI 规范。这是 F-002 AC-006 的核心交互，仅从现有规范无法指导开发者实现 diff 对照展示。
- **建议**: 在 C-013 DiagnosticsPanel 中补充 diff 视图子组件的 UI 规范：展开某条诊断项时显示 before/after 对比（节点的原始属性 vs 过滤后属性，逐属性 diff 高亮），或说明 diff 对照由独立 Modal/Drawer 承载并引用到对应 C-012 实例。

---

### [R-011] MEDIUM: A-001（顶栏用户菜单无账号系统）与 P-004 设置页"API 密钥"分组存在隐性张力

- **category**: consistency
- **root_cause**: self-caused
- **描述**: A-001 假设"v1 无账号系统，用户菜单仅包含偏好设置和帮助"，但 P-004 设置页包含"API 密钥"分组（微信公众号 AppID/AppSecret、各图床 API 密钥）和"同步与协作"分组（同步服务地址、API key 配置）。这些配置项实际上是"账号/凭据"层面的内容，与 A-001 的"无账号系统"存在语义张力。该假设影响范围仅标注了"C-001 顶栏、P-004 设置页"，但 P-004 内包含凭据配置本身就是对"无账号系统"假设的隐性反驳，可能让开发者混淆"无账号"的边界（不需要登录/注册流程，但凭据管理是存在的）。
- **建议**: 将 A-001 的假设内容澄清为"v1 无用户登录/注册流程，凭据以本地加密存储形式管理，用户菜单入口为偏好设置（含凭据配置）和帮助"，消除歧义；或在 P-004 的"API 密钥"分组前加一句说明："凭据本地加密存储，不需要账号系统（A-001）"。

---

### [R-012] MEDIUM: 命令面板（C-009）的动作列表覆盖范围与 PRD F-001 AC-008 不完全对齐

- **category**: consistency
- **root_cause**: self-caused
- **描述**: Q6 决策明确"命令面板仅 UI 动作（~15-20 个），不含内容编辑和 LLM 动作"，C-009 动作分组列出了"视图/主题/导出/帮助"四类。但 PRD F-001 中提到命令面板是"所有可执行动作的搜索式入口超集——主题切换/directive 插入/视口切换/导出/跳转文档/视图操作"，F-014 AC-006 要求"中文排版修订入口在命令面板"。UI 规范 C-009 的动作分组中没有"跳转文档"和"中文排版修订"。这两类动作是 F-001/F-014 明确要求的。
- **建议**: 在 C-009 动作分组中补充"文档"分组（跳转/切换文档）和"编辑辅助"分组（中文排版修订），或在 Q6 决策说明处明确这些动作不进入命令面板的理由（若已在其他入口覆盖则说明入口路径）。

---

### [R-013] LOW: 设计方向 §0 没有明确记录 Q1/Q4/Q5/Q6 决策编号与来源

- **category**: completeness
- **root_cause**: self-caused
- **描述**: UI 规范在多处引用"Q1 决策"（专注写作调性）、"Q3 决策"（Tab 序列）、"Q4 决策"（预览刷新 debounce 300ms）、"Q5 决策"（三档响应式）、"Q6 决策"（命令面板范围），但文档中没有一个集中的"决策记录"节，各 Q 号对应的完整决策背景和可追溯路径（来自用户访谈/需求澄清/讨论记录）无从查阅。Q1、Q3、Q4、Q5、Q6 的原始问题是什么、谁决策了什么、何时决策，均无记录。
- **建议**: 在 §0 增加 §0.4 决策记录子节，将各 Q 号的问题描述、决策内容、决策依据（来自哪个 PRD/ARCH 章节或用户访谈）按表格形式汇总，供下游阅读者追溯。对于下游团队开发，当前缺失不阻塞，但影响可维护性。

---

### [R-014] LOW: 移动端底部固定栏 z-index Token（--z-mobile-bar: 500）层级高于 Modal（300）

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: §1.4 层叠 Token 定义 `--z-mobile-bar: 500`，高于 `--z-modal: 300` 和 `--z-command: 400`。P-005 移动端只读预览的 `copy-success` 状态中，Toast 从底部弹出覆盖在固定栏上方。如果移动端有 Modal 出现（如 P-002 底部抽屉的错误确认），Modal（300）将被底部固定栏（500）遮盖，导致 Modal 无法正常操作。P-005 的底部抽屉（文档列表）本质上是一种 bottom-sheet Modal 形态，其 z-index 应高于底部固定栏，但当前 Token 设计会让固定栏覆盖在抽屉之上。
- **建议**: 检查移动端所有可能出现浮层（bottom-sheet、Modal、Toast）与底部固定栏的层叠关系；可考虑将 `--z-mobile-bar` 下调至 150（在 toolbar 和 dropdown 之间），让底部抽屉/Modal 在 300+ 层级正常覆盖固定栏，或明确说明移动端底部固定栏在有 Modal 时的处理策略（如主动降低或 display:none）。

---

### [R-015] LOW: C-001 TopBar 状态表缺少 `conflict`（同步冲突）状态的视觉描述

- **category**: completeness
- **root_cause**: self-caused
- **描述**: C-001 TopBar 的 Props 中声明了 `syncState: 'synced' | 'syncing' | 'offline' | 'conflict'`，包含 `conflict` 状态，但 TopBar 的状态表只列出了 `default`/`document-unsaved`/`syncing`/`offline`/`focus-mode` 五态，没有 `conflict` 状态的视觉表现描述（如顶栏底边变为 `--color-error`，或文档名旁显示「冲突」Tag）。开发者遇到 `conflict` 状态时无视觉规范可遵循。
- **建议**: 在 C-001 状态表中增加 `conflict` 状态视觉描述（建议参考 `offline` 的处理方式，用 `--color-error` 代替 `--color-warning`，并显示「冲突」Tag 引导用户手动解决）。

---

### [R-016] LOW: P-004 设置页"图床配置"分组缺少响应式说明和组件规范

- **category**: completeness
- **root_cause**: self-caused
- **描述**: P-004 设置页中提到"图床配置"分组（各图床分列表格），但 F-006 AC-001 要求支持 6 种图床（本地/七牛/阿里云 OSS/腾讯云 COS/SM.MS/自定义），涉及密钥表单配置，这是一个相对复杂的子表单 UI，但规范中仅一句"图床 API 密钥配置（各图床分列表格）"，没有组件级规范（每个图床的配置字段、测试连接按钮、启用/禁用开关等）。
- **建议**: 在 P-004 的"图床配置"分组中补充关键 UI 元素说明：图床列表（每行一个图床，包含图床名/启用开关/展开配置表单/连接测试按钮）；或在此处标注 `[ASSUMPTION]` 声明当前 UI 细节待开发阶段确认，避免让开发者无规范可循而自行发挥。

---

## 汇总

| 编号 | 严重等级 | category | 来源层 | 标题摘要 |
|------|---------|---------|--------|---------|
| R-001 | HIGH | completeness | Layer 1 | 9 个组件缺少 variant 定义（脚本 FAIL） |
| R-002 | MEDIUM | convention | Layer 1 | 主卷/components 分卷行数超阈值 |
| R-003 | MEDIUM | ambiguity | Layer 1 | 组件状态视觉差异描述不足，C-004 缺 focus/blur 态 |
| R-004 | MEDIUM | ambiguity | Layer 1 | 4 个页面缺少空间构成说明 |
| R-005 | HIGH | completeness | Layer 2 | 「+」插入按钮和「...」次级菜单无对应 UI 规范 |
| R-006 | HIGH | completeness | Layer 2 | 同步状态指示器置于注释而非正式规范，Props 缺 syncState |
| R-007 | MEDIUM | completeness | Layer 2 | C-004 缺少 CodeMirror 语法高亮色彩 Token 规范 |
| R-008 | MEDIUM | completeness | Layer 2 | P-003 主题市场缺平板/移动端响应式布局描述 |
| R-009 | MEDIUM | consistency | Layer 2 | C-005 CSP 简写与 ARCH §5.3 完整字符串不一致 |
| R-010 | MEDIUM | completeness | Layer 2 | F-002 AC-006 兼容性报告 diff 视图缺 UI 规范 |
| R-011 | MEDIUM | consistency | Layer 2 | A-001 假设"无账号"与 P-004 凭据配置存在语义张力 |
| R-012 | MEDIUM | consistency | Layer 2 | C-009 动作列表缺"跳转文档"和"中文排版修订"入口 |
| R-013 | LOW | completeness | Layer 2 | Q1/Q3/Q4/Q5/Q6 决策编号无集中记录节 |
| R-014 | LOW | feasibility | Layer 2 | --z-mobile-bar:500 高于 Modal:300，层叠冲突风险 |
| R-015 | LOW | completeness | Layer 2 | C-001 TopBar 状态表缺 conflict 同步冲突态视觉描述 |
| R-016 | LOW | completeness | Layer 2 | P-004 图床配置分组 UI 细节缺失，建议补 ASSUMPTION |

---

## 亮点记录

以下设计决策质量较高，供参考：

1. **设计 Token 体系完备**: §1.1 色彩 Token 从暖白 `#FAF8F5` 推导暖灰阶，避免 Bootstrap 冷灰，7 个子组合计 28 个 Token，覆盖面板 → 边框 → 文字 → 品牌 → 强调 → 功能 → 诊断全链路，满足"专注写作"调性一致性。
2. **字体栈规范**: CSS `font-family` 给出三套完整字符串（衬线/无衬线/等宽），西文优先 + 中文补全 + 通用 fallback，满足审查重点要求。
3. **iframe 沙箱一致性**: C-005 对 ARCH M-001 和 ARCH §5.3 的沙箱策略（`sandbox=""` 空属性 + UI 钩子全部在主线程）有正确理解与传达，「UI 钩子全部由主线程承担」描述清晰。
4. **假设清单 §6**: 12 条 [ASSUMPTION] 均有（假设内容 + 默认值 + 影响范围 + 验证途径）四要素，符合 COMMON-RULES 要求，质量合格。
5. **响应式策略 §5**: 三档布局各有 ASCII 图 + 功能矩阵表，移动端单栏 + 底部固定栏描述具体（高度 56px + 文档切换器/一键复制）可直接还原，满足审查重点要求。

---

## 判定

存在 HIGH 级别问题（R-001、R-005、R-006），三个问题均影响开发阶段实现质量：
- R-001 是 Layer 1 脚本 FAIL，直接阻断 Layer 1 门禁
- R-005 缺失两个核心交互组件规范，开发者将无规范可依
- R-006 同步状态指示器缺少正式规范，且状态枚举与 ARCH M-013 不完全对应

**verdict**: needs_revision
