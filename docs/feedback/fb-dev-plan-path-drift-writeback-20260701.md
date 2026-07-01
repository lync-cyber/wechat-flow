---
id: fb-dev-plan-path-drift-writeback
doc_type: framework-feedback
status: approved
deps: []
---

# Dogfood (wechat-flow Sprint 6): dev-plan deliverable 路径/落点漂移的作者侧与回写侧缺口

## Summary

wechat-flow dogfood 中 dev-plan 任务卡的 `deliverables` 路径与 `context_load` 模块引用**系统性漂移**——卡片声明的路径与实现落点不符（代码正确、功能完整，仅路径 stale）。这是**已知的低危 upstream 属性现象**（Sprint 4 sprint-review 已识别并归因 `upstream-caused`），但根因未被治理：① 框架**无实现后把实际落点回写卡片的机制**，卡片必然 stale 且漂移逐 sprint 累积；② tech-lead 在代码尚不存在时臆测 deliverable/test 路径与 context_load 模块归属，缺项目布局/模块图 grounding；③ 路径漂移**不进 CORRECTIONS-LOG**，散落卡片 notes 与各 sprint-review，无统一台账。

既有反馈 `framework-feedback-20260624-s4-dogfood.md §4` 已覆盖**检测侧**（sprint-review Layer 1 把 deliverables 当穷举 → unplanned_files 数百误报）。本篇聚焦**作者侧 + 回写侧**，不重复检测侧建议。

## Environment

- **CataForge package**: `0.14.0`
- **Scaffold version**: `0.14.0`
- **Platform**: `Windows-11-10.0.26200-SP0`
- **Runtime platform**: `claude-code`

## Proposal

## 1. 无实现→卡片的路径回写机制 (protocol gap)

dev-plan 卡片由 tech-lead 在代码不存在时依 ARCH 模块结构撰写，路径为计划时最佳猜测；实现时真实落点由代码组织、模块边界、基础设施约束决定（如特殊运行时测试须落根 `tests/` 由独立 tsconfig 管辖）。框架无任何步骤在任务完成后把实际落点 reconcile 回卡片 → 卡片 `deliverables`/`context_load` 单向 stale，漂移逐 sprint 沉积。

S6 实例（均代码正确、仅路径漂移）：
- `packages/core/src/__tests__/cross-runtime/` → `tests/cross-runtime/`（T-063）
- `packages/core/src/__tests__/{version,deterministic}.test.ts` → `tests/core/`（T-070）
- `guard/eight-dimensions.ts` → `guard/nine-dimensions.ts`（T-059，8→9 维）
- `apps/editor/src/stores/*` + context_load M-007/API-022 → core M-013 持久化层（T-064）
- `StatusBar` → `components/layout/` + context_load M-007/API-006 → M-001（T-066）
- 卡片惯引 `packages/mcp-server/` → 实际 `apps/mcp-server/`；`components/X.vue` → `components/editor/X.vue`

建议：任务完成收口时提供 `cataforge` reconcile 步骤/命令，把实际产出路径回写卡片 `deliverables`（或追加 drift-ledger），使卡片保持可信索引；至少让 sprint-review 自动聚合本 sprint 全部路径漂移成单条 drift-rate，而非散落卡片 notes。

## 2. deliverables「代表性 vs 穷举」语义缺机器声明 (enhancement)

项目实践中 `deliverables` 是**代表性非穷举**声明（实现期正常拆分 types/factory/http 等文件不算 gold-plating，路径就近调整不算缺陷），但该语义仅存于口头约定，无 frontmatter/字段可声明。导致 sprint-review Layer 1 既误报 unplanned_files，又把纯路径漂移误升为 HIGH blocking。

建议：卡片或任务 frontmatter 支持 `deliverables_representative: true` 显式声明，sprint-review/code-review 据此校准（路径漂移降级为 advisory、unplanned_files 静默）。

## 3. tech-lead 路径/模块归属缺 grounding (protocol gap)

tech-lead AGENT 要求 `deliverables`/`context_load` 必填，但无指令要求撰写前读取项目**已确立的测试布局约定**与**模块-文件映射**。结果：① 测试路径臆测为 `packages/*/src/__tests__/` 形式，而项目实为双约定（colocate `src/**/*.test.ts` + 集中根 `tests/<area>/`），臆测形式两者都不匹配；② context_load 模块归属误判（编辑器功能挂 M-007 插件沙箱 / API-006 MCP Tool，实为 M-001 无 HTTP 契约 / M-013 持久化）。

建议：tech-lead 撰写协议增加「据项目实际布局约定与模块图落 deliverable 路径与 context_load 引用；无把握时标代表性、不臆造目录形态」的指令；或在 dev-plan 模板注明 deliverables 路径为代表性、精确落点以实现为准。

## 4. 路径漂移不进 CORRECTIONS-LOG，无统一台账 (hygiene gap)

`upstream-gap` 类 AC 覆盖缺口（T-091/T-119/T-109）能进 CORRECTIONS-LOG 并触发 framework-feedback 打包，但同属 upstream 属性的**路径漂移**无归口——S6 记卡片 notes、S4 记 sprint-review、均不进 CORRECTIONS-LOG。跨 sprint 无法统计漂移率趋势，也无法判断是否达阈值需系统性治理。

建议：为路径/落点漂移定义一个轻量 correction 触发信号（如 `path-drift`，低于 `hard`/`review` 权重、不触发 retrospective 但计入 drift-rate 趋势），使其可被 `cataforge` 统计与阈值告警。
