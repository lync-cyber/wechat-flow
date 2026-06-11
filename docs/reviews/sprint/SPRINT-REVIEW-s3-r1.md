---
id: "sprint-review-s3-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s3"]
---
# Sprint 3 完成度审查报告

**Sprint**: Sprint 3 — 主题系统 + 组件注册中心 + Palette 派生
**任务总数**: 14（T-020..T-027, T-029, T-100, T-101, T-110, T-114, T-115）
**Commit 审查范围**: `d9f5600~1..7fa8d85`
**门禁快照**: typecheck 47/47 ✓ | biome 0 违规 ✓ | vitest 574/575（1 个 T-094 环境超时，独立运行通过，属 Sprint 2 既有 flakiness）

---

## 一、Layer 1 自动检查结果摘要

| 检查项 | 结果 | 说明 |
|--------|------|------|
| task_status_done | ⚠ 脚本识别为空（解析格式差异） | CLAUDE.md + EVENT-LOG 确认 14/14 已 done |
| deliverables_exist | ✓ 60 个文件全部存在 | |
| ac_coverage | ✓ 36 个 AC 全部有测试引用 | |
| unplanned_files | ✓ 无计划外文件 | |
| code_review_present | 全 14 任务缺 CODE-REVIEW 文件 | merged-review 模式，由本报告 §四 承担 Layer 2 |

> 说明：`task_status_done` 脚本返回 HIGH（不识别文档格式中的状态写法），但该问题属于 Layer 1 脚本与 dev-plan 格式的解析兼容性问题，非任务未完成。项目指令文件 §项目状态 与 EVENT-LOG 双重佐证全部任务完成。

---

## 二、Sprint 级完成度审查

### 2.1 Sprint 目标达成情况

| Sprint 目标 | 状态 | 验证依据 |
|-------------|------|---------|
| 五套内置主题热切换可见 | ✓ | T-110 validation 6 项清单全过 |
| 内置 Block ≥ 25 个可从左侧面板插入 | ✓ | `listBlocks().length = 25`，InsertDrawer 集成 |
| CommandPalette 接线 command registry | ✓ | T-027 通过，切换主题命令可执行 |
| InsertDrawer + ContextMenu + DirectiveAutocompletePopover 完成接线 | ✓ | T-114/T-115 + 03ebd8e 修复后 validation 通过 |

### 2.2 偏移率统计

- 规划 AC 数：36（T-020~T-029/T-114/T-115 含 AC 的代码任务）
- 延期 AC（计划内未交付）：0
- 计划外 AC：0
- **偏移率：0%**（T-100/T-101/T-110 为 skip 类任务不计入 AC 分母）

### 2.3 范围偏移检测

**Gold-plating（计划外功能）**：无。Layer 1 未发现计划外文件；代码审查未发现超出任务卡边界的功能扩展。

**Scope drift（偏离架构契约）**：T-022 交付 magazine/literary/business/tech 四套主题（dev-plan 写"magazine/literary/business/tech"），与 PRD §1.3 中的主题命名一致；无偏离。

---

## 三、问题列表

### [SR-001] MEDIUM: T-094 测试（双向高亮 wiring）在全量并发跑时出现间歇超时

- **category**: test-quality
- **root_cause**: self-caused
- **关联任务**: T-094（Sprint 2，非 Sprint 3 交付物）
- **描述**: `tests/editor/bidirectional-highlight-wiring.test.ts` 第一个用例 `renderMarkdown with injectNodeIds=true` 在 48 个测试文件并发执行时偶发 5000ms 超时（首次模块动态 import 在高并发环境中耗时超限）。独立运行该文件时 1919ms 通过。vitest 并发报告显示 574/575，比项目状态记录的 575/575 少 1。
- **建议**: 在该测试用例上方添加 `{ timeout: 15000 }` 选项（vitest `it(description, fn, timeout)` 第三参数），或在 vitest.config 中将 `testTimeout` 全局提升至 10000。此问题属 Sprint 2 遗留，可在 Sprint 4 中一并清理。

### [SR-002] MEDIUM: T-026 AC-004 BlockLibItem.onInsert 回调在 LeftPanelTabs 内的 wiring 为空 stub

- **category**: wiring-completeness
- **root_cause**: self-caused
- **关联任务**: T-026
- **描述**: AC-004 要求"点击 BlockLibItem 时 `onInsert` 回调被调用，含对应 BlockDefinition 参数（directives 片段可插入编辑器）"。`LeftPanelTabs.vue` 中 `insertBlock()` 函数体仅含一行注释 `// wiring to editor insert deferred — no AC requires it here`，回调不产生任何副作用，不将 directive 片段插入编辑器。BlockLibItem 的单元测试（AC-004 覆盖）仅验证 `onInsert` 被调用和参数类型，未验证 directive 片段确实写入编辑器。从左侧面板插入 Block 的功能链路实际上通过 InsertDrawer（T-114）实现，LeftPanelTabs 内的 BlockLibItem 路径处于未接线状态。
- **建议**: 若 LeftPanelTabs 内的 BlockLibItem 插入功能有意推迟（与 InsertDrawer 重叠），应在 dev-plan T-026 AC-004 中明确标注此路径通过 InsertDrawer 交付，或用 `wiring_placeholder: true` 豁免标记；目前注释说明不构成正式的豁免凭据。若插入功能预期在 Sprint 3 完成，则需补充 EditorShell 层到 LeftPanelTabs 的 `onInsertBlock` prop 接线。

### [SR-003] LOW: T-027 command-registry 部分命令 run 为空函数，缺乏 user-facing 路径测试

- **category**: test-quality
- **root_cause**: self-caused
- **关联任务**: T-027
- **描述**: `buildEditorCommands()` 中 `视图` 分组大多数命令（fold-left/fold-right/toggle-viewport/undo/redo/find/find-replace）以及 `文档` 分组（jump/new/delete）和 `内容` 分组（insert-component/zh-typo）的 `run` 函数体为 `() => {}`。CommandPalette 测试覆盖了过滤/导航/执行/关闭逻辑，但未断言执行这些空函数后是否有可观测的 UI 副作用。仅 `switch-theme-*` 系列命令有真实的 `run` 实现。
- **建议**: 当前这些命令为占位（Sprint 4/5 实现），可通过在 command 定义上添加 `placeholder: true` 字段明确声明；或在测试中对 `执行占位命令不抛出异常` 做最低限度断言，避免潜在的 `cmd.run is not a function` 运行时错误未被测试覆盖。

### [SR-004] LOW: T-115 AC-002 Escape 键测试未覆盖"编辑器焦点不丢失"这一子条件

- **category**: test-quality
- **root_cause**: self-caused
- **关联任务**: T-115
- **描述**: AC-002 要求"Escape 键关闭浮层后编辑器焦点不丢失"。测试集覆盖了 `onClose` 回调被调用，但未断言 `EditorView.hasFocus` 或 DOM 焦点元素在 Escape 后仍指向编辑器容器。`directive-completion.ts` 中 Escape keydown handler 未调用 `view.focus()`，当浮层关闭后焦点归还逻辑由浏览器默认行为处理（浮层不是原生 dialog，不保证自动还焦）。
- **建议**: 在集成测试中补充 `expect(view.hasFocus).toBe(true)` 断言；或在 `onClose()` 回调被调用后在 `registerDirectiveCompletion` 内显式调用 `view.focus()`。

---

## 四、Per-task Layer 2 代码维度表（merged-review 等价交付）

| 任务 | structure | error-handling | test-quality | security | 综合结论 |
|------|-----------|----------------|--------------|----------|---------|
| **T-020** 主题注册中心 | ✓ 注册/查询/守护职责清晰分离；Map 存储合理 | ✓ `validateThemeGuard` 无异常分支；`describeTheme` 返回 undefined 而非抛出 | ✓ AC-001..004 全覆盖；`resetThemeRegistry` 确保测试隔离 | ✓ 无外部输入直接存储 | approved |
| **T-021** default 主题 | ✓ token/blocks 分文件；theme 对象结构与契约对齐 | ✓ `parseFrontmatter` 防御性处理无 yaml 节点 | ✓ AC-001..003 覆盖；`var(--` 不出现断言有效 | ✓ | approved |
| **T-022** 四套主题 | ✓ 每套主题结构一致，tokens/blocks/meta 齐备 | ✓ | ✓ `theme-guard.test.ts` 覆盖五套主题 validateThemeGuard + AC-004 品牌色防碰撞 | ✓ | approved |
| **T-023** 调色板派生 | ✓ lch/tokens/wcag 三层职责分离；culori 依赖隔离 | ✓ `toOklch` 对非法 color 抛出带描述的 Error；WCAG 阈值 clamp 处理极浅色 | ✓ AC-001..003 全覆盖；含极浅主色（#fff）边界测试 | ✓ 无 XSS 向量 | approved |
| **T-024** 内置 Block 25 种 | ✓ 每 Block 独立文件；`index.ts` 统一注册；`attrsSchema` 用 Zod 声明 | ✓ `describeBlock` 找不到返回 undefined；`toJSONSchema` 在 AC-003 中验证无异常 | ✓ AC-001 枚举全部 25 个 ID；AC-002 attrsSchema + variants ≥ 3；AC-003 全量 Zod parse | ✓ | approved |
| **T-025** 内置 Mark 12 种 | ✓ marks 与 blocks 包结构对称 | ✓ | ✓ AC-001 len ≥ 11；AC-002 badge 渲染含 inline style + 无 class 属性 | ✓ | approved |
| **T-026** LeftPanelTabs/ThemeCard/BlockLibItem | ✓ 三组件职责分离；LeftPanelTabs 做协调者 | ✓ `insertBlock` 未接线但无运行时错误 | ⚠ AC-004 BlockLibItem.onInsert 测试仅验证组件层回调，未验证编辑器插入（见 SR-002） | ✓ | approved_with_notes |
| **T-027** CommandPalette | ✓ UI 与 command-registry 解耦；`buildEditorCommands` 依赖注入 `switchTheme` | ⚠ 多数命令 `run: () => {}` 无错误处理（见 SR-003）；占位非抛出，低风险 | ✓ AC-001..004 覆盖；Ctrl+K 快捷键 + 过滤 + Esc + Enter 执行 | ✓ | approved_with_notes |
| **T-029** Frontmatter 渲染管线 | ✓ `parseFrontmatter` 与 `render.ts` 解耦；paint 覆盖优先级清晰 | ✓ paint 覆盖无效 token 产生 warn diagnostic；YAML parse 异常由 yaml 库传播（可接受） | ✓ AC-001..004 全覆盖；含 paint 优先级、base-color 派生、warn diagnostic 断言 | ✓ 无外部 YAML injection 向量（产物是 HTML，已经过 sanitize） | approved |
| **T-110** Validation（5 缺陷修复 03ebd8e） | ✓ F1 ThemeCard.onSelect 已接; F2 renderMarkdown themeId 已穿透; F3 main.ts blocks+marks 已注册; F4 TopBar 主题名动态化; F5 directive-completion updateListener 有逻辑 + extension 已传 CM + Popover 已渲染 | ✓ 修复均带测试锚定 | ✓ 每处修复有对应行为级测试；非仅 readFileSync 字符串锚定 | ✓ | approved |
| **T-114** InsertDrawer/ContextMenu | ✓ InsertDrawer 从 listBlocks() 动态读取；ContextMenu 包装 DropdownMenu | ✓ `getParamFields` 用 try-catch 包装 attrsSchema.shape 访问 | ✓ AC-001..003 覆盖（InsertDrawer 滑入 + 参数区展开 + 插入 + ContextMenu 菜单结构） | ✓ 无 XSS：directive 作为文本插入编辑器，不直接写 innerHTML | approved |
| **T-115** DirectiveAutocompletePopover | ✓ directive-completion.ts（纯逻辑）与 Popover.vue（渲染）分离；SourcePane 作为接线点 | ✓ `detectDirectiveTrigger` 中文字符/空格 edge case 均处理为 null；`coordsAtPos` 在 requestMeasure 阶段延迟读取布局 | ⚠ AC-002 Escape 后"焦点不丢失"子条件未验证（见 SR-004）；AC-001/AC-003 行为级测试（EditorView dispatch 断言）覆盖质量良好 | ✓ | approved_with_notes |
| **T-100** Penpot 设计稿 | N/A（设计任务） | N/A | N/A | N/A | 用户 sign-off ✓ |
| **T-101** 设计签字 | N/A（设计验收任务） | N/A | N/A | N/A | EVENT-LOG user_decision ✓ |

---

## 五、质量聚合

本 Sprint 无独立 CODE-REVIEW 文件，上述 §四 为等价聚合。

**模式识别**：
1. **空占位 run 函数模式**：T-027 command-registry、T-026 insertBlock，均以 `() => {}` 作为 Sprint 4+ 功能的占位符。未统一使用 `wiring_placeholder: true` 豁免标记，导致 wiring-completeness 维度无法自动区分"有意延迟"与"遗漏接线"。建议 Sprint 4 开始前对此类占位统一加注豁免。
2. **测试强度**：T-115 的 AC-003 引入了 `EditorView dispatch → onTrigger 回调` 的真实行为断言，是本 Sprint 测试质量最高点，有效规避了 Sprint 3 早期 T-115 "GREEN 借 readFileSync 字符串锚定绕过接线" 的风险（学习条目 ⑤）。
3. **5 处 wiring 缺陷（03ebd8e）**：F1-F5 全部带测试修复，修复质量高；但 F5（directive-completion 空壳）体现 `user_facing_critical_path: true` 任务的 Layer 2 短路不适用约束的必要性——已在 CLAUDE.md 中记录为运行学习 ⑥。

---

## 六、Sprint 目标验收评分

| 验收维度 | 评级 | 说明 |
|---------|------|------|
| 交付完整度 | ✓ 满足 | 14/14 任务完成，60 个 deliverable 文件存在 |
| AC 覆盖 | ✓ 满足 | 36/36 AC 有测试引用；行为级覆盖质量良好 |
| 门禁通过 | ✓ 满足（注 1） | typecheck/biome/vitest(独立) 全绿 |
| 设计一致性 | ✓ 满足 | T-101 用户 sign-off 通过 |
| Wiring 完整度 | ⚠ 注意 | T-026 LeftPanelTabs → BlockLibItem 插入路径未接线（SR-002 MEDIUM） |

注 1：vitest 并发跑时 1/575 超时（T-094，Sprint 2 flakiness），独立运行全绿；不阻塞 Sprint 3 验收。

---

## 七、Verdict

**approved_with_notes**

无 CRITICAL / HIGH 问题。存在 2 个 MEDIUM + 2 个 LOW 问题，均不阻塞 Sprint 4 推进。

**notes_summary**: SR-001（T-094 并发测试超时，Sprint 2 flakiness，建议 Sprint 4 修复 timeout 配置）；SR-002（T-026 LeftPanelTabs 内 BlockLibItem 插入 wiring 为空 stub，与 InsertDrawer 功能重叠，需明确豁免或接线）；SR-003（T-027 command-registry 占位命令缺豁免标记）；SR-004（T-115 AC-002 焦点不丢失子条件未测试）。

---

## 八、问题闭环记录

用户决策（2026-06-11）：4 项全部立即修复。修复由 orchestrator 主线程执行，带测试锚定，浏览器代理复验（SR-002 插入链路 + SR-004 焦点保持）。

| 编号 | 原问题 | 修复方式 | 修复 commit | 状态 |
|------|--------|---------|------------|------|
| SR-001 | T-094 首用例并发冷启动偶发超 5s | 用例 timeout 提至 15s | d1e282b | closed-by-orchestrator |
| SR-002 | LeftPanelTabs 内 BlockLibItem 插入为空 stub | onInsertBlock prop 接线 EditorShell.onInsertDirective + 组件行为级测试 + 接线锚定 | d1e282b | closed-by-orchestrator |
| SR-003 | 占位命令缺豁免标记 | CommandDefinition.placeholder 字段 + 22 个空实现命令显式标记 + run() 不抛异常测试 | d1e282b | closed-by-orchestrator |
| SR-004 | Esc 关闭浮层后焦点归还无保障 | keydown handler 显式 view.focus() + 焦点抢占场景行为级测试（验证过红） | d1e282b | closed-by-orchestrator |

闭环后门禁: vitest 580/580（+5 新测试），typecheck 47/47，tests-tsc 0，biome 0。4 项问题全部闭环，verdict 实质等价 approved。
