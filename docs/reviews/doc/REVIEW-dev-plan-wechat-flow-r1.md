---
id: "review-dev-plan-wechat-flow-r1"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6"]
---
# 审查报告：dev-plan-wechat-flow（开发计划全套，r1）

**被审文档**: dev-plan-wechat-flow（主卷）+ Sprint 0..6 分卷（共 8 个文件）
**审查层次**: Layer 1（机器预载，orchestrator 代跑）+ Layer 2 增量抽样（本次）
**Layer 2 抽样范围**:
1. Penpot 前置约束兑现：抽查 T-008/T-009 是否列出对应 T-DS-NNN 依赖
2. Validation 任务质量：抽查 T-VAL-00 的 acceptance_criteria 可观测性
3. 时间估算违规：全 8 文件 grep 扫描

---

## 问题列表

### [R-001] HIGH: 所有 Sprint 分卷（s0..s6）的任务卡均缺少 `tdd_acceptance` 字段

- **category**: completeness
- **root_cause**: self-caused
- **描述**: Layer 1 扫描结果：Sprint 0 有 4 个任务、Sprint 1 有 8 个任务、Sprint 2 有 7 个任务、Sprint 3 有 10 个任务、Sprint 4 有 13 个任务、Sprint 5 有 13 个任务、Sprint 6 有 13 个任务，100% 缺少 `tdd_acceptance` 字段（共 68 个任务）。tdd-engine 在 RED 阶段启动时需读取该字段以生成失败测试骨架，字段全部缺失将导致 Phase 5 TDD 流程无法自动执行。
- **建议**: 为每个 feature/fix 类任务添加 `tdd_acceptance` 字段，引用对应的 `acceptance_criteria` 中的 AC-NNN 编号（如 `tdd_acceptance: [AC-001, AC-002]`）；chore/config/design/validation 类任务若确实不需 TDD，应在任务卡中明确标注 `tdd_mode: skip` 并说明原因，而非留空。

---

### [R-002] HIGH: Sprint 6 分卷结构基础性破损（缺 consumers / [NAV] / split_from）

- **category**: completeness
- **root_cause**: self-caused
- **描述**: dev-plan-wechat-flow-s6 frontmatter 缺少 `consumers` 字段和 `split_from` 字段（其余 Sprint 分卷均有这两个字段）；文档正文缺少 `[NAV]...[/NAV]` 导航块。对比 s0..s5 分卷，s6 frontmatter 字段集合与其他分卷不一致，结构验证将 FAIL。`volume: s6` 的写法也与其他分卷的 `volume: sprint` 不一致，存在格式分歧。
- **建议**: 补全 `consumers: [developer, qa-engineer]`、`split_from: "dev-plan-wechat-flow"`、将 `volume: s6` 改为 `volume: sprint`；在正文首段后添加 `[NAV]...[/NAV]` 块，内容对应 Sprint 6 任务清单。

---

### [R-003] HIGH: 主卷未覆盖 M-012（schema 契约层）

- **category**: consistency
- **root_cause**: self-caused
- **描述**: Layer 1 扫描确认主卷各任务的 `relates_to` 中无任何任务引用 M-012。经 Layer 2 核查：T-004（packages/contracts schema 契约层骨架）的 `模块` 字段写的是 `M-012 (schema 契约层)`，且 `relates_to: [F-013, M-012]`，但主卷 Sprint 0 任务表中 T-004 的 `task_kind` 被标注为 `chore`（非 `feature`），Layer 1 双向覆盖检查将 M-012 判定为未覆盖。实际 T-004 确实是 M-012 的实现任务，但 task_kind 与双向覆盖逻辑之间存在不一致。
- **建议**: 将 T-004 的 `task_kind` 从 `chore` 改为 `feature`，并确保主卷 `relates_to` 或等价覆盖机制能让 Layer 1 识别 M-012 已被覆盖；或在主卷 §5 风险与假设中用 `[ASSUMPTION]` 显式声明覆盖策略。

---

### [R-004] MEDIUM: 全部 7 个 Sprint 分卷缺少必填章节「任务卡详细」

- **category**: convention
- **root_cause**: self-caused
- **描述**: Layer 1 对 s0..s6 均报告缺少必填章节「任务卡详细」。检查实际文件后，各分卷使用的章节标题为「Sprint N 任务卡」或直接以任务 ID 为标题（如 `## T-DS-010`），与 Layer 1 检查器期望的 `## 任务卡详细` 标题不匹配。章节内容实际存在，仅标题名不符合规范。
- **建议**: 统一将任务卡主章节标题改为 `## 任务卡详细`（或在主卷 frontmatter 的 `required_sections` 中修改期望值以反映实际命名约定）；推荐前者，以符合框架统一规范。

---

### [R-005] MEDIUM: 多分卷超过 DOC_SPLIT_THRESHOLD_LINES 阈值且无 split_policy 注明

- **category**: convention
- **root_cause**: self-caused
- **描述**: Sprint 1（344 行）、Sprint 3（367 行）、Sprint 4（439 行）、Sprint 5（426 行）、Sprint 6（748 行，2.5 倍阈值）均超过 300 行阈值，但文档 frontmatter 未声明 `split_policy: no-further-split` 或拆分策略说明。Sprint 6 以 748 行远超阈值，若未来任务卡继续增加将严重影响可维护性。
- **建议**: 对 Sprint 6 进行拆分（如 s6a/s6b）或在 frontmatter 中添加 `split_policy: no-further-split`（并附说明理由）；其余超阈值分卷建议同样显式声明 split_policy，消除工具警告。

---

### [R-006] LOW: 多分卷存在 ID 编号不连续现象

- **category**: convention
- **root_cause**: reviewer-calibration
- **描述**: Sprint 1 缺 T-003，Sprint 2 缺 T-005/T-007..T-012，Sprint 3 缺大量 T-005..T-058，Sprint 4/5/6 均有 ID 跳号。设计任务（T-DS-NNN）和验证任务（T-VAL-NN）采用独立编号空间，导致普通 T-NNN 编号不连续在形式上是合理的（非连续编号属于跨编号空间的设计决策），Layer 1 无法区分"合理跳号"与"遗漏任务"。
- **建议**: 在主卷 §1 或 frontmatter 中添加注释说明 T-DS-NNN（设计）和 T-VAL-NN（验证）为独立编号空间，不占用 T-NNN 主序列，消除工具的误报；或改为在对应 Sprint 分卷的 [NAV] 块中列出全部任务 ID（含 T-DS 和 T-VAL），使完整任务集合对工具可见。

---

## Layer 2 抽样发现

**Penpot 前置约束兑现**: 抽查 T-008（三栏布局）和 T-009（SourcePane），T-008 的 `dependencies` 包含 `[T-005, T-DS-003]`，T-DS-003 正是对应的视觉稿任务（涵盖 C-001/C-002/C-004/C-005），前置约束已兑现。未发现前端 code 任务遗漏 T-DS-NNN 依赖的问题。

**Validation 任务质量**: 抽查 T-VAL-00，其 `acceptance_criteria` 均含可观测动词（`pnpm install && pnpm turbo typecheck` 输出无红色错误、`pnpm biome check .` 无 lint 错误、Penpot 可见 Token 变量组等），具体可操作，非空话。Validation 任务 AC 质量合格。

**时间估算违规**: 全 8 文件 grep 扫描，Sprint 6（s6）第 383 行和第 390 行出现"5 分钟"（描述自动备份间隔的功能行为参数），属于功能规格描述而非任务工作量估算，不属于违规。无其他时间估算违规。

---

## 总结

| 严重等级 | 数量 | 关键问题 |
|---------|------|---------|
| HIGH | 3 | tdd_acceptance 全缺（阻断 TDD）；Sprint 6 结构破损；M-012 未覆盖 |
| MEDIUM | 2 | 必填章节标题不符规范；超阈值分卷无 split_policy |
| LOW | 1 | ID 编号不连续（可能合理，待作者确认） |

**verdict: needs_revision**
