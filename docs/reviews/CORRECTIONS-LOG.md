---
id: "corrections-log"
doc_type: correction-log
author: cataforge
status: approved
deps: []
---
# Corrections Log

> 由 CataForge 自动追加。On-Correction Learning Protocol 触发条件见
> `.cataforge/agents/orchestrator/ORCHESTRATOR-PROTOCOLS.md`。

### 2026-05-26 | orchestrator | unknown
- 触发信号: option-override
- 问题/假设: 选择执行模式（决定后续阶段数量与文档粒度）
- 基线/推荐: standard (推荐)
- 实际/选择: agile-lite, 但不约束文档行数，避免文档过于简略丢失语义
- 偏差类型: preference

### 2026-05-27 | orchestrator | unknown
- 触发信号: option-override
- 问题/假设: Penpot MCP Server 当前未连接到此会话。是否要先配置好 Penpot MCP 再启动 ui-designer，还是直接以手动模式产出 ui-spec（设计 Token 写入 CSS 变量文件，跳过 Penpot 双向同步步骤）？
- 基线/推荐: 手动模式产出 ui-spec (Recommended)
- 实际/选择: 我先配好 Penpot MCP 再继续
- 偏差类型: preference

### 2026-05-27 | orchestrator | unknown
- 触发信号: option-override
- 问题/假设: Q6: 命令面板 Ctrl+K 覆盖范围（影响 C-002 组件复杂度与 LLM 集成位置）
- 基线/推荐: UI + 内容编辑动作 (Recommended)
- 实际/选择: 仅 UI 动作
- 偏差类型: preference

### 2026-05-27 | orchestrator | unknown
- 触发信号: option-override
- 问题/假设: ui-spec r2 = approved_with_notes。怎么处理 8 MEDIUM + 4 LOW 残留项？
- 基线/推荐: 修 5 条 dev-critical 后进 Phase 4 (Recommended)
- 实际/选择: Inline全修8M+4L
- 偏差类型: preference

### 2026-05-27 | orchestrator | unknown
- 触发信号: option-override
- 问题/假设: 项目配置 人工审查点=[pre_dev]。是否确认进入 Phase 5 development开始 TDD 开发？
- 基线/推荐: 确认继续 - 开始 Sprint 0 (Recommended)
- 实际/选择: name branch to main and commit
- 偏差类型: preference
