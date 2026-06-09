---
id: "code-review-T-008-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-008"]
---

# CODE-REVIEW-T-008-r1: M-001 EditorShell 三栏布局

Layer 1 delegated to hook（settings.json 已配置 PostToolUse Edit → lint_format，编码阶段实时修复格式/lint）

## 审查对象

| 文件 | 行数 |
|------|------|
| `apps/editor/src/components/layout/EditorShell.vue` | 242 |
| `apps/editor/src/components/layout/TopBar.vue` | 166 |
| `apps/editor/src/components/layout/ResizableSplitter.vue` | 112 |
| `apps/editor/src/composables/use-splitter-width.ts` | 29 |
| `apps/editor/src/styles/tokens.css` | 62 |
| `apps/editor/src/main.ts` | 配置接线 |
| `apps/editor/tsconfig.json` | paths alias |
| `packages/core/src/index.ts` | 导出 |
| 测试：`EditorShell.test.ts` / `TopBar.test.ts` / `use-splitter-width.test.ts` | 28 tests |

---

## 问题清单（CRITICAL → LOW）

<!-- MEDIUM/LOW 占位 —— 详见各小节 -->

---

### [R-001] MEDIUM: tokens.css 缺失大量 ui-spec §1 Token（完整性缺口）

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `tokens.css` 仅落地了 ui-spec §1 Token 的子集（表面色 4 个、边框色 3 个、文字色 4 个、品牌色 3 个、强调色 1 个）。以下 ui-spec §1 定义的 Token 完全缺失：
  - 表面色：`--color-surface-sunken`（输入框背景）
  - 文字色：`--color-text-link`、`--color-text-link-hover`
  - 品牌色：`--color-brand-active`、`--color-brand-muted`、`--color-brand-highlight-outline`
  - 强调色：`--color-accent-hover`、`--color-accent-subtle`
  - 功能色：`--color-success`、`--color-success-subtle`、`--color-warning`、`--color-warning-subtle`、`--color-error`、`--color-error-subtle`、`--color-info`、`--color-info-subtle`
  - 诊断色：`--color-diag-safe`、`--color-diag-warn`、`--color-diag-error`
  - 阴影 Token：`--shadow-sm`、`--shadow-base`、`--shadow-md`、`--shadow-lg`
  - 层叠 Token：`--z-dropdown`、`--z-mobile-bar`、`--z-command`、`--z-toast`
  - 间距 Token：`--space-5`、`--space-12`
  - 圆角 Token：`--radius-none`、`--radius-sm`、`--radius-md`、`--radius-lg`
  - 字体大小：`--font-size-xl`（已有）；缺失 `--font-size-xs`（ui-spec 含 xs 标注，如 conflict Tag `--font-size-xs`）
  - 字重 Token：`--font-weight-normal`、`--font-weight-bold`
  - 行高 Token：`--line-height-tight`、`--line-height-base`、`--line-height-relaxed`、`--line-height-loose`
  - 断点 Token：`--bp-desktop`（已有 `--bp-tablet` 但缺少 `--bp-desktop: 1280px`）
  
  缺失 Token 导致 T-009/T-010/T-011 等下游组件无法引用全套设计系统变量（需手动 hardcode 或重复声明），违背单一事实来源约定。
- **建议**: 补全 tokens.css 以覆盖 ui-spec §1 的所有 Token 定义（约 40 个缺失项）。参照 ui-spec §1.1~§1.6 完整表格，逐节补录。可分组：
  1. 功能色 / 诊断色（下游 T-009 SourcePane 高亮色依赖）
  2. 阴影 / z-index 补余（下游 Modal/Dropdown 依赖）
  3. 间距 / 圆角 / 字重 / 行高补余
  4. `--bp-desktop: 1280px` 补录

---

### [R-002] MEDIUM: tokens.css 缺失 `--font-size-xs`，但 ui-spec 已在 C-001 conflict Tag 引用

- **category**: consistency
- **root_cause**: self-caused
- **描述**: ui-spec-wechat-flow-c001-c014 §2.C-001 conflict 状态描述中明确使用 `--font-size-xs`（conflict Tag 文字），但 tokens.css 中无此 Token。T-008 本身暂未渲染 conflict 态，但此缺口会在 T-009/T-010 阶段引发硬编码或 undefined 引用。
- **建议**: 在 tokens.css 补录 `--font-size-xs: 11px`（与 `--font-size-sm: 13px` 对应的更小档位，参考 ui-spec C-001 状态表上下文）。此条与 R-001 合并修复。

---

### [R-003] MEDIUM: AC-003 专注模式"工具栏隐藏"仅通过 `editor-shell--focus` class 间接断言，未验证 TopBar 内 toolbar 实际隐藏

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: AC-003 的 F11 测试（EditorShell.test.ts:95-107）通过 `editor-shell--focus` class 存在来断言专注模式激活。但 AC-003 明确要求"顶栏工具栏按钮组隐藏"——TopBar 的 `data-testid="top-bar-toolbar"` 在 `isFocusMode=true` 时应被 `v-if` 移除。测试仅检查 `editor-shell--focus` class，不检查 `top-bar-toolbar` DOM 节点是否真实不存在。

  该间接断言存在以下有效性缺口：若实现者误删 `v-if="!props.isFocusMode"` 条件（使工具栏始终可见），`editor-shell--focus` class 仍存在，测试仍然通过，但 AC-003 实质未满足。
- **建议**: 在 F11 专注模式测试组添加：
  ```ts
  // 在 F11 按下后 nextTick 验证
  expect(wrapper.find('[data-testid="top-bar-toolbar"]').exists()).toBe(false);
  ```
  happy-dom 环境下 `v-if` 移除 DOM 节点是可观测的，无需依赖 CSS 变量计算。

---

### [R-004] MEDIUM: ResizableSplitter 状态机缺少 `dragging→hover` 转换边界保护

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `ResizableSplitter.vue` 的 `onMouseLeave` 处理器（第 57-60 行）只在 `state === 'hover'` 时回退到 `idle`，不在 `dragging` 时处理。但 `onPointerUp`（第 39-45 行）直接将 state 置为 `idle`，此时若鼠标在 pointerup 触发瞬间已不在 splitter 元素上（正常拖拽结束场景），后续不会触发 `mouseleave` 事件（因为 pointerup 先触发），state 正确归 `idle`。

  真正的问题在于：`dragStartLeft` 被设置为 `props.defaultLeft`（第 28 行），而 `props.defaultLeft` 是一次性快照值（传入时的值），但实际拖拽过程中 `props.onResize` 已在持续更新父组件的 width（通过 `useSplitterWidth.onResize`），再次拖拽时 `dragStartLeft` 仍取当次 `props.defaultLeft`（即当前宽度），行为上等同于 "从当前宽度累加 delta"，这在多次拖拽下是正确的。但若用户在一次拖拽内快速连续 pointerdown → move → up → down（两次快速拖拽），第二次 pointerdown 的 `dragStartLeft = props.defaultLeft` 在 Vue reactive 更新异步时可能取到旧值，导致拖拽起始宽度抖动。
  
  此问题在当前测试套件中无覆盖（`ResizableSplitter` 无独立测试文件）。
- **建议**: 
  1. 在 `ResizableSplitter.vue` 增加独立测试，至少覆盖：pointerdown → move(200px) → 断言 `onResize` 调用值在 clamp 范围内，以及 pointerup 后 state 归 idle。
  2. 考虑在 `onPointerDown` 中直接用当前 `props.defaultLeft` 的副本（`const startLeft = props.defaultLeft`）——当前实现已是如此，但若异步更新导致 `props.defaultLeft` 在同一 tick 变化，可考虑使用 `toRef` 保证同步。

---

### [R-005] MEDIUM: EditorShell 硬编码 TopBar Props（业务值 hardcode 为 placeholder）

- **category**: structure
- **root_cause**: self-caused
- **描述**: `EditorShell.vue` 第 60-72 行直接将 `doc-title="Untitled"`、`theme-name="默认主题"`、`theme-accent-color="#2D5A4E"`、`sync-state="idle"`、`:can-undo="false"`、`:can-redo="false"` 等所有 TopBar Props 硬编码为 placeholder 字面量，且 `:on-undo="() => {}"` / `:on-redo="() => {}"` / `:on-copy="() => {}"` 全部为 no-op。

  问题在于：这些 no-op handler 属于 wiring placeholder，但未加 `// cataforge: wiring-placeholder` 注解，也未在任务卡声明 `wiring_placeholder: true`。对于 code-review 的 integration-wiring 维度，这些空 handler 在生产路径（`EditorShell` 是根布局组件）中实际无效，不是"契约存在"而是"handler 空实现"。

  T-008 任务卡 deliverables 不包含 Pinia store 订阅接线（接线由 T-011 负责），因此 placeholder 在当前任务边界内属合理的 stub。但需明确标注，以避免被后续 sprint-review 的 integration-wiring 维度标记为遗漏。
- **建议**: 在 EditorShell.vue 的三个 no-op handler 处添加行内注释 `// cataforge: wiring-placeholder`（T-011 接线），或在任务卡补充 `wiring_placeholder: true` 声明。这是框架约定的豁免标注，不需要修改实现。

---

### [R-006] LOW: tokens.css 断点 Token `--bp-tablet` 值与 ui-spec §1.6 不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: tokens.css 第 61 行 `--bp-tablet: 768px` 正确，但 ui-spec §1.6 还定义了 `--bp-desktop: 1280px`。tokens.css 缺失 `--bp-desktop`，而 EditorShell.vue 中 `TABLET_BREAKPOINT = 1280` 是 JS 侧直接硬编码，未引用任何 CSS Token。

  此不一致（CSS Token 与 JS 常量各自维护断点值）在当前无实际错误，但违背单一事实来源约定：若设计变更断点，需同时修改 JS 常量和 CSS Token，存在漂移风险。
- **建议**: 补录 `--bp-desktop: 1280px` 到 tokens.css（合并到 R-001 修复）；JS 侧 `TABLET_BREAKPOINT` 可保留（CSS 变量无法直接在 JS 逻辑中读取），但建议添加注释说明两处同步点，防止后续漂移。

---

### [R-007] LOW: ResizableSplitter hover 态视觉规格与 ui-spec C-002 状态描述有轻微差异

- **category**: consistency
- **root_cause**: self-caused
- **描述**: ui-spec-wechat-flow-c001-c014 §2.C-002 描述 `hover` 态"线宽扩展为 `3px`"，`idle` 态为 `4px`。但 ResizableSplitter.vue CSS（第 97-100 行）中 `.splitter--hover { width: 3px; }` 确实是 3px，而 `.splitter { width: 4px; }` 为 4px。宽度数值符合 ui-spec。

  然而，ui-spec 描述 `idle` 态命中区为 `8px`（"透明命中区扩展为 `8px`"），实现使用 `padding: 0 2px; box-sizing: content-box`（4px 宽 + 2px×2 padding = 8px 总命中区），这是正确的。

  但 `hover` 态变 `3px` 宽而 `idle` 是 `4px` 宽这一规格在视觉上有些奇特（通常 hover 应更宽而非更窄）——这与 ui-spec 写的"线宽扩展"字眼矛盾（"扩展"暗示变大）。实际检查后，ui-spec 写的是"线宽扩展为 `3px`"是指视觉明显线（idle 时 4px 含 padding 展现为线条），hover 时去掉 padding 后纯宽 3px 实际视觉上更窄，与"扩展"字眼有歧义。实现与 ui-spec 数字完全一致，无实现问题。标记为 upstream-caused 歧义。
- **root_cause**: upstream-caused
- **建议**: 此问题为 ui-spec 措辞歧义（"扩展"vs 数字 3<4），代码实现忠实照搬了数字值。建议在 sprint-review 或下一轮 ui-spec 修订时澄清 hover 视觉意图（加宽命中区还是缩窄线宽），此处不需修改实现。

---

### [R-008] LOW: TopBar 撤销/重做按钮组未实现

- **category**: completeness
- **root_cause**: self-caused
- **描述**: ui-spec-wechat-flow-c001-c014 §2.C-001 明确规定"文档名区右侧紧邻「撤销 / 重做」按钮组（C-003 ghost variant），含 `disabled` 状态"。TopBar.vue 仅在 Props 中接受 `canUndo`/`canRedo`/`onUndo`/`onRedo`，但模板中未渲染对应按钮（第 18-68 行模板中无任何撤销/重做 UI）。

  C-003 ToolbarButton 本身是 T-008 之外的任务（其 deliverables 中未列出 C-003），因此缺失按钮 UI 在 T-008 边界内可能属预期范围。但 TopBar 接受了这些 Props 却完全不使用（也无 `// cataforge: wiring-placeholder` 注释），形成了 dead-code（接受参数但无作用）。
- **建议**: 确认 C-003 ToolbarButton 在哪个任务落地（T-008 还是后续任务）。若后续任务实现，建议在撤销/重做预留位添加 `<!-- C-003 undo/redo placeholder (T-XXX) -->` 注释，并在 TopBar 的 canUndo/canRedo Props 注释中标注 `// wiring-placeholder`，避免被 dead-code 扫描误报。

---

### [R-009] LOW: AC-002 持久化链路测试仅覆盖 `use-splitter-width`，未从 EditorShell 级别端到端验证

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: AC-002 要求"拖拽结束后宽度值可从 IndexedDB 读回"。`use-splitter-width.test.ts` 完整测试了 composable 层的 init/onResize/IndexedDB 读写（7 个测试，覆盖边界）。但 `EditorShell.test.ts` 中 AC-002 组仅验证"桌面档显示两个 Splitter 组件"和"左栏初始宽度=200px"，未触发实际拖拽（pointerdown/pointermove/pointerup 序列）并检查 IndexedDB 写入。

  由于 composable 层有充分的单元测试，这种分层测试策略在 `tdd_mode: light` 下是合理的（EditorShell 测试注释本身也写了"持久化验证见 use-splitter-width.test.ts"）。但仅依赖 composable 测试意味着 EditorShell 对 composable 的 `onResize` 接线未被测试覆盖（ResizableSplitter 的 `:on-resize` prop 确实传入了 `leftPanel.onResize`，此接线未经集成测试验证）。
- **建议**: 评估是否在 EditorShell.test.ts 补充一个集成断言：模拟 ResizableSplitter 的 `onResize` 回调触发，验证 leftPanel.width.value 更新。此为 light 模式下的可选改进，不阻塞当前任务交付。

---

## 判定

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 5（R-001 至 R-005） |
| LOW | 4（R-006 至 R-009） |

**verdict: approved_with_notes**

### 关键说明

1. **REFACTOR 信号**: 本次审查未命中 `complexity`（EditorShell 243 行职责清晰，ResizableSplitter 112 行状态机明确）、`duplication`（三组件职责不重叠）、`coupling`（composable 边界合理，EditorShell 不直接持渲染管线），**不触发 tdd_refactor**。
2. **间接断言评估（R-003）**: AC-001 background-color 用 class 名间接断言在 happy-dom 不计算 CSS 变量的环境下是合理的最优解，不构成有效性缺口——class 与 CSS 之间存在单一事实来源约束（CSS 变量在 tokens.css 中有定义，class 名与颜色的对应关系在组件样式中唯一确定）。AC-003 的 `preventDefault` 用 focus class 间接验证同理合理，**但**"工具栏隐藏"未验证（R-003）是真实有效性缺口，建议补充。
3. **tokens.css 缺口（R-001）**: 当前任务可交付（5 条 AC 全部有测试覆盖），缺失 Token 不影响 T-008 运行，但会阻碍 T-009/T-010 下游的规范引用，建议在 T-009 启动前修复。
4. **wiring placeholder（R-005）**: 属框架约定豁免范畴，添加注释即可，无需修改实现。
