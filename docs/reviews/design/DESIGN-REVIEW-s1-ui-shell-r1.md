---
id: "design-review-s1-ui-shell-r1"
doc_type: design-review
author: orchestrator
status: approved
deps: ["T-098", "T-008", "T-009", "T-010", "T-011", "ui-spec-wechat-flow-c001-c014"]
---

# 设计一致性审查 — Sprint 1 UI Shell（T-098 设计签字对照）

## 审查方式

通过 Penpot MCP（本地自托管 docker，frontend 9001 / MCP 4401 / plugin 4400）直接读取设计稿画板，`execute_code` 取精确几何与填充色、`export_shape` 导出板图视觉对照，逐项比对运行中的 Sprint 1 实现（feature/sprint1-ui-shell）。对照对象：

- 页面 `S1 — P-001 线框稿`（P-001-Desktop / Tablet / Tablet-Drawer / Mobile 四档）
- 页面 `S1 — 组件视觉稿`（C-001 TopBar / C-002 Splitter / C-004 SourcePane / C-005 PreviewPane）

## 结论

**approved_with_notes** —— 实现对设计稿保真度高，主框架尺寸/色值/状态机逐项精确吻合。Penpot 直接对照额外暴露 1 处 AC 未覆盖的组件契约缺口（C-005 loading/error 两态），已在本轮就地补全。

## 一、P-001-Desktop 线框稿 vs EditorShell（1280×800）

| 区块 | 设计稿（px / fill） | 实现 token / 常量 | 结论 |
|------|---------------------|-------------------|------|
| TopBar 高 | 48 / #ffffff | TopBar 48px | ✅ |
| LeftPanel | 宽 200 / #f4f1ec | `LEFT_PANEL_DEFAULT=200` · `surface-elevated` | ✅ |
| Splitter | 宽 4 / 命中区 8 | `.splitter{width:4px}` + `padding:0 2px` | ✅ |
| Editor(SourcePane) | min 360 / #faf8f5 | `center{min-width:360px}` · `surface` | ✅ |
| DiagnosticsPanel | 高 32（折叠）/ #f0ede6 | Sprint 2（impl 占位 C-013） | 计划内 deferred |
| PreviewPane | 宽 320 / #f7f7f7 | `RIGHT_PANEL_DEFAULT=320` · `surface-preview` | ✅ |
| StatusBar | 高 32 / #ffffff | `.statusbar{height:32px}` | ✅ |

四档布局板（Desktop/Tablet/Drawer/Mobile）齐全；Tablet 含 burger 抽屉触发、Drawer 含 scrim 遮罩，与 EditorShell 平板抽屉 + `rgba(28,25,23,0.3)` 遮罩一致。

## 二、C-001 TopBar — 6 状态变体

default / document-unsaved（圆点）/ syncing[v1 stub] / offline[v1 stub] / conflict[v1 stub] / **focus-mode（工具栏隐藏）**。实现结构一致：focus-mode `v-if` 隐藏工具栏 ✅；syncing/offline/conflict 标 v1 stub，与 impl `sync-state="idle"` 占位一致 ✅。

## 三、C-002 Splitter — 4 态状态机（逐项精确吻合）

| 态 | 设计稿 | 实现 | |
|----|--------|------|---|
| idle | 4px · border-subtle · 命中区 8px | `width:4px;background:border-subtle` + 8px 命中区 | ✅ |
| hover | 3px · border | `--hover{width:3px;background:border}` | ✅ |
| dragging | 3px · brand · 全局 col-resize | `--dragging{width:3px;background:brand}` + body cursor | ✅ |
| disabled | surface-overlay · 不响应 | `--disabled{background:surface-overlay;pointer-events:none}` | ✅ |

右侧分隔栏 `invert` 拖拽方向修复（T-098 反馈项）已落地。

## 四、C-004 SourcePane — 语法高亮 9 样本色值（精确匹配 §1 token）

逐元素读取设计稿 fill，与 `cm-theme.ts` highlight 绑定逐一比对：

| 样本 | 设计稿 fill | impl 绑定 | |
|------|------------|----------|---|
| `# 一级标题` | #2d5a4e | heading→brand | ✅ |
| `**粗体**` | #1c1917 | strong→text-primary | ✅ |
| `*斜体*` | #4a4541 | emphasis→text-secondary | ✅ |
| `[链接]` | #2d5a4e | link→text-link | ✅ |
| `- 列表` | #a3c4bc | list→brand-muted | ✅ |
| `> 引用` | #4a4541 | quote→text-secondary | ✅ |
| `` `代码` `` | #b94a3e | monospace→accent | ✅ |
| `:::card` | #b94a3e | keyword→accent | ✅ |
| Frontmatter | #4a4541 | comment→text-secondary | ✅ |

## 五、C-005 PreviewPane — 3 态

视口切换（手机375/平板768/自适应，手机默认 brand 高亮）+ 右下 sync 圆点：实现 ✅。loading / error 两态见下方 DR-001。

## 问题清单

### [DR-001] MEDIUM: C-005 loading/error 两态未渲染（已修复）
- **category**: completeness
- **root_cause**: upstream-caused（T-010 AC-001~005 未把 C-005 状态表的 loading/error 纳入验收，致 per-task review 漏检；组件契约 ui-spec C-005 状态表与 Props `isLoading`/`error` 已定义）
- **描述**: PreviewPane.vue 声明了 `isLoading` / `error` props，但 template 仅渲染 populated 态；ui-spec C-005 状态表的 `loading`（居中 spinner 32px·brand-muted）与 `error`（! 图标 48px·error + 错误说明 + 「重试」C-003 primary）两态未实现，props 成死 props。AC 列表未覆盖此二态，仅 Penpot 直接对照暴露。
- **建议（已采纳）**: PreviewPane.vue 补 loading 覆盖层 + error 替换视图 + `onRetry` prop；新增 5 条 happy-dom 测试覆盖两态渲染与重试回调。组件契约就此完整；`isLoading`/`error` 的实时数据源（render 异步化）随预览管线异步化落地，与 C-005.1 SyncStateIndicator 的 v1 stub 接通节奏一致。

### [DR-002] LOW: isLoading/error 死 props（随 DR-001 一并消除）
- **category**: dead-code
- **root_cause**: self-caused
- **描述**: DR-001 修复前 `isLoading`/`error` 声明但 template 未引用。
- **建议（已采纳）**: DR-001 渲染两态后两 props 均被消费，死 props 消除。

## 验证

DR-001 修复后门禁全绿：vitest 135 passed（PreviewPane 15，+5）、typecheck 30 任务通过（vue-tsc）、biome 干净。运行中 app 经 preview eval 确认 populated 默认路径无回归（shell/iframe 挂载、srcdoc 有内容、error/loading 未误触发）。
