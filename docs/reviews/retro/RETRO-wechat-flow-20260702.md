---
id: "retro-wechat-flow-20260702"
doc_type: retrospective
status: draft
date: 2026-07-02
author: reflector
version: "1.0.0"
---

# RETRO-wechat-flow — 项目完成级回顾（Phase 1-7 全周期）

## 统计摘要

- **Review 文件总数**：80 份（REVIEW-*-r{N} 24 份、CODE-REVIEW-* 28 份、SPRINT-REVIEW-* 10 份、FRAMEWORK-REVIEW 0 份、DESIGN-REVIEW 1 份）
- **Revision 循环分布**：
  - Phase 1（requirements）：2 cycles（PRD r1→r2→r3）
  - Phase 2（architecture）：3 cycles（ARCH r1→r2→r3，其中 r2 人工介入门槛 N≥2）
  - Phase 3（ui_design）：2 cycles（UI-SPEC r1→r2）
  - Phase 4（dev_planning）：6 cycles（DEV-PLAN r1~r6）
  - Phase 5（development）：Sprint 0-6，其中 S4/S6 出现修订
  - Phase 6（testing）：test-report r1（testing 成果交付）
  - Phase 7（deployment）：deploy-spec r1→r2（2 cycles）
  - **总修订循环数**：15 次 needs_revision
- **Self-caused 问题 top-3 category**（按出现频次）：
  1. **test-quality**（15+ 条）：虚假绿色测试（helper 构造理想条件 vs 真实输入路径）、空心断言、路径覆盖缺陷
  2. **completeness**（12+ 条）：AC 定义不全、deliverables 路径声明漂移、字段未填充（fixture 元数据）
  3. **consistency**（10+ 条）：声明与实现不符、文档勾选态 stale、跨分卷引用失效

## 经验条目

### EXP-001: 测试假绿风险集中在"helper 构造理想输入"路径
- **target_agent**: implementer
- **target_skill**: test-writer / RED / GREEN
- **category**: test-quality
- **evidence**: 
  1. `SPRINT-REVIEW-s6-r1.md#SR-001`（T-060 patch-loader 测试）：17 个测试全经 `makePatchRule()` helper 构造**含真实 JS 函数**，未覆盖"JSON 反序列化后无函数字段"的真实路径，`JSON.parse` 往返消除函数字段导致虚假绿色
  2. `SPRINT-REVIEW-s6-r2.md` 复核（修复后）：新增真实序列化往返拒绝测试覆盖 r1 指出缺失的路径；两个既有 AC-001 测试补上函数字段后语义诚实
  3. `MEMORY.md#implementer-skips-tests-typecheck`：跨项目记忆，GREEN 子代理反复漏 `tsc -p tests/tsconfig.json` 与空心断言
- **instruction**: 所有 external-input 反序列化边界（HTTP JSON 解析、环境变量读取、配置文件加载）的 RED 测试必须包含真实格式路径而非 helper 构造的理想格式；编写 test helper 时显式标注其与真实路径的差异，防止测试被误解为覆盖外部输入场景
- **status**: pending

### EXP-002: AC 层可行性缺陷导致 schema 设计根本问题
- **target_agent**: tech-lead
- **target_skill**: dev-planning / requirement-analysis
- **category**: completeness
- **evidence**:
  1. `SPRINT-REVIEW-s6-r1.md#SR-001`（T-060 HIGH）：AC-001 定义的 `PatchBundle.patches: RuleDefinition[]` schema 要求 JSON 携带函数字段（`matcher`/`transform` 可执行函数），但 JSON 序列化协议根本无法表达函数对象，AC 中的使用场景（HTTP JSON 补丁包）与 schema 定义存在根本矛盾
  2. `CORRECTIONS-LOG.md` s4-r2（2026-06-23 tech-lead 评论）：前序类似缺陷（T-091/T-119 AC 层 API 契约定义不全，遗漏安全路径/错误码）均在 GREEN 后 code-review 才补发现
- **instruction**: tech-lead 在编写涉及 external-format（JSON/YAML/binary 等）的 AC 时，需显式验证"定义的数据结构是否可被该格式序列化/反序列化"；对"函数字段"等格式无法表达的概念需在 AC 中显式选型（如预注册 transform-id 白名单而非直接携带函数）并标注 feasibility 前置检查
- **status**: pending

### EXP-003: Deliverables 路径声明漂移导致 drift-rate 虚高
- **target_agent**: tech-lead / implementer
- **target_skill**: dev-planning / requirement-signoff
- **category**: completeness
- **evidence**:
  1. `SPRINT-REVIEW-s6-r1.md` Layer 1 blocking 7×HIGH：T-056/T-058/T-059/T-068 deliverables 路径代表性声明与实现落点不符（通配模式、目录结构调整、文件重组），但逐条核实均已 delivered 且无延期
  2. `SPRINT-REVIEW-s6-r1.md#drift-rate 聚合`："dev-plan 撰写时点早于实现约定收敛、完成后未回写"——T-113 5 处文本漂移、T-058/T-059 等卡均存在此类问题
  3. `docs/feedback/fb-dev-plan-path-drift-writeback-20260701.md`：上游反馈已打包 dev-plan 回写机制缺失为问题
- **instruction**: 实现完成后（开发或测试交付）必须回写 dev-plan 的 deliverables 路径与 AC 勾选态，而不是仅更新 git commit；建立 implementer→tech-lead 的路径确认 checkpoint（可作为 PR review 前置检查），防止 drift-rate 因"交付事实对，文档滞后"被误判为延期或计划外
- **status**: pending

### EXP-004: AC 标记策略缺陷导致 fixture 元数据系统性未填充
- **target_agent**: tech-lead / architect
- **target_skill**: architecture-design / dev-planning
- **category**: consistency
- **evidence**:
  1. `SPRINT-REVIEW-s6-r1.md#SR-003`（T-056/T-060/T-061 MEDIUM）：arch#§2.M-003 规定规则 fixture 目录结构含 `metadata.json`（微信版本兼容元数据），`RuleDefinition.fixture?` 字段为此设计但全包 42 条规则零填充
  2. **root_cause 分类异常**：本应归 upstream-caused（arch 定义了规范），但 SR-003 判定为 upstream-caused 理由是"模式自 Sprint 2 建立，T-056/T-060/T-061 沿用包级既有约定"——实际是 AC 标记策略缺陷（可选字段？必填字段？如何验证？）未在上游清楚定义导致执行侧选择性遗漏
- **instruction**: architect 设计文档化的可选元数据字段时，需在 ARCH 中明确标注"该字段是否出现在任务 AC"、"是否需要提交时验证"、"未填充时系统行为是什么"；避免出现"结构定义了、AC 没提到、实现没填充"的三层脱节；技术方案合理性二选一处理（修订 ARCH 移除规范 vs 专项迁移任务）需在 sprint-review 时显式闭环
- **status**: pending

### EXP-005: 文档勾选态同步缺失导致可追溯性链条断裂
- **target_agent**: tech-lead / implementer
- **target_skill**: dev-planning / requirement-signoff
- **category**: consistency
- **evidence**:
  1. `SPRINT-REVIEW-s6-r1.md#SR-004`（LOW）：T-058/T-068 dev-plan 勾选框 `[ ]`（未勾），但交付事实均已核实全部 delivered（8/8 AC 逐条、组件+测试+挂载齐全）
  2. 同一问题在多个 sprint 重复出现，属文档维护疏漏而非交付缺陷，但影响可追溯性（外部读者无法通过勾选态判定任务完成状态）
- **instruction**: 将 dev-plan 的 AC 勾选态与 deliverables 勾选态纳入 PR merge checklist（reviewer 在最终批准前需核验勾选态与交付事实一致），或由 orchestrator 主线程在 merge 前自动核对；建立"勾选态 stale 即 dev-plan 文档脏"的单一认知
- **status**: pending

### EXP-006: Context finalize 全量重导出越权导致文档污染
- **target_agent**: orchestrator / context-skill
- **target_skill**: context / finalize
- **category**: structure
- **evidence**:
  1. `docs/feedback/fb-context-finalize-gap.md`：context finalize 全量重导出导致 dev-plan 被污染（追加图谱陈旧 backlog 段）、test-report 被重置状态、最坏情况回退修订中的 deploy-spec
  2. `EVENT-LOG` state_change 多处留痕：5 次复现，各次涉及不同文档类型
  3. **root_cause 分类**：upstream-caused（CataForge framework context 能力层，反序列化或 ingest 策略缺陷）
- **instruction**（上游反馈方向）：CataForge context.finalize 应遵循"最小写原则"——仅导出调用方实际修改过的章节/实体，而非全量重生；非调用方修改的内容（如图谱侧自动补充的 backlog、历史status字段）应通过校验防止污染；本项目 workaround：当发现 finalize 导出不符预期时，直接 `git checkout` 文档后手工编辑落盘而非依赖 finalize 回灌
- **status**: pending

### EXP-007: 项目级 doc-consistency 校验策略缺陷导致假阳性噪声
- **target_agent**: reviewer / orchestrator
- **target_skill**: consistency-skill
- **category**: structure
- **evidence**:
  1. `docs/test-report/test-report-wechat-flow.md#§8`：4 项 doc-consistency 裁决（ac-traceability / ui-coverage / orphaned-component / entity-propagation），其中 3 项被判为假阳性，根本原因是 consistency checker 未理解"跨分卷本地编号命名空间"（F-001 vs UC-001）与"token 碰撞计数"的复杂性
  2. **假阳性根因分解**：
     - ac-traceability：checker 计数"F-010 token 出现 N 次"而忽略"F-010 仅在 PR#1 根治后有效（C- 已改 UC-）"的时间线
     - ui-coverage：checker 做全文关键字搜索而忽略"F-013 是 deferred backlog 项、不计入本轮 test-report 覆盖范围"的业务逻辑
     - entity-propagation：checker 无法跨分卷图谱查询（孤立组件的 test-wiring 证据可能在另一分卷）
- **instruction**（上游反馈方向）：doc-consistency checker 的三类常见假阳性需特殊处理或移除，或在框架层显式声明"本项目因分卷架构 + 命名空间重组历史不适用"；本项目内部对策：test-report 在 §8 裁决中逐项附上证据链（文件路径/行号/wiring 文件名）并标注假阳性/正确排除，供后续审查参考
- **status**: pending

### EXP-008: Reviewer 停顿续跑机制缺失导致审查超时
- **target_agent**: reviewer
- **target_skill**: doc-review / code-review / sprint-review
- **category**: structure
- **evidence**:
  1. `EVENT-LOG` 2026-05-27T06:14:00：reviewer truncation（hit maxTurns=50）无 REVIEW 报告输出，被 orchestrator 捕获并强制生成 needs_revision 状态（事实上报告内容已在后台生成但未落图）
  2. 关键问题：reviewer 在 50+ tool uses 停顿时没有中间结果续跑机制，导致已完成的审查工作丢失或重复
  3. **框架层 Mid-Progress Drop Contract**（见 MEMORY）：后台 ~50 工具调用停顿，需 SendMessage 催收最终结构化交付
- **instruction**（上游反馈方向）：reviewer 等后台 subagent 需实现"中间产出存档 + 续跑恢复"机制（类似 task_type=continuation 的 Interrupt-Resume Protocol），而非仅依赖 orchestrator 捕获错误后重新调度；本项目对策：dev-plan r1 过程中 reviewer 因 maxTurns 中断，后续 r2 接力审查时保留对 r1 未完成部分的交叉引用，明确标注"r1 中断范围"而非重复审查
- **status**: pending

### EXP-009: 单卡一 PR 串行合并策略的可追溯性收益
- **target_agent**: orchestrator / devops
- **target_skill**: git-workflow / orchestration
- **category**: structure
- **evidence**:
  1. `CLAUDE.md §项目状态`：Sprint 0-6 逐卡单 PR、串行合并（PR #1~#70），每次 commit 关联特定任务编号与 verdict 状态
  2. **关键观察**：后续 orchestrator 主线程兜底核验（tests/typecheck/biome/亲读实现）有明确的单 PR 边界与 EVENT-LOG 时间戳对应，便于问题回溯与 bisect（vs 批量合并或 squash 后难以定位具体改动来源）
  3. `EVENT-LOG` git commit 记录全部可追踪到对应 sprint-review 报告与修复范围
- **instruction**: 保持"单卡一 PR"的细粒度跟踪习惯（即使工作量不大的 chore/LOW 修复），配合 orchestrator 自动化 commit+PR 创建，建立"卡片→PR→commit→event-log"完整链条；后续复盘时该链条便于定位"何时何人在何工作流阶段引入了何问题"
- **status**: pending

### EXP-010: Orchestrator 主线程兜底核验的三层深度
- **target_agent**: orchestrator
- **target_skill**: orchestration / final-verification
- **category**: structure
- **evidence**:
  1. `CLAUDE.md §项目状态` s6-r2 段：orchestrator 主线程在 developer-stage 后端返回时固定跑 tests/typecheck/biome 三轮独立验证，不依赖开发者 PR 内嵌的 CI
  2. **三层深度**：
     - Layer 1（快检）：pnpm typecheck（turbo 全包 + tests tsconfig）+ pnpm biome check（726 文件）
     - Layer 2（单测绿）：pnpm vitest run（2375 测试），确保 mock/stub 路径与真实执行路径对称
     - Layer 3（亲读实现）：对关键路径（如 security-sensitive 卡、跨模块接线、schema 变更）亲手阅读源码确认"代码与审查报告论述"一致，防止空心承诺
  3. `SPRINT-REVIEW-s6-r1.md` wiring-completeness 表：所有 user-facing 卡的"组件挂载"与"生产调用点"都经亲读源码二次核验
- **instruction**: 若下游子代理（implementer/refactor/reviewer）的输出覆盖率或质量有怀疑信号，orchestrator 应在 Phase 转换前加一道主线程全量校验（tests/typecheck/biome 三轮缺一不可），而非依赖外部 CI；特别是当项目规模进入"单人难以心智跟踪全量影响"的阶段（本项目 2375 测试/726 linted 文件/7 分卷文档）时，这道门禁的 ROI 极高
- **status**: pending

## 针对上游反馈的草稿

### 问题 1: CataForge context.finalize 全量重导出越权污染文档

**现象**: context.finalize 在编辑已有文档（status=draft）时执行全量重导出，无法区分"调用方修改的章节"与"后端自动补充或重生的内容"，导致被污染的内容重新落盘。

**复现路径**:
- 场景 A：修订 dev-plan 的某章节（如 T-060 revision），调用 context.finalize → dev-plan 被追加图谱侧陈旧 backlog 段，扩充了非调用方修改的内容
- 场景 B：修订 deploy-spec 全卷（r1→r2），调用 context.finalize → 回灌前的图谱不一致导出，覆盖了已修订的内容
- 场景 C：test-report 中间修改后调用 context.finalize → test-report status 被重置为初值

**影响**: 
- 文档内容污染（非预期追加/删除内容）
- 文档一致性破坏（status、frontmatter 字段被意外修改）
- 需要人工 git checkout + 重新手工编辑作为 workaround

**建议修复方向**:
1. context.finalize 实现"最小写原则"：仅导出调用方通过 context.write/write-narrative 修改过的节点及其直属关联实体，不进行全量重导出
2. 引入"导出范围声明"参数（如 `sections: ["§2.2", "§6"]`），使调用方可显式指定哪些章节参与 finalize
3. 对图谱侧自动补充的内容（如 relations、backlog 推理）增加"来源信息标记"，finalize 时校验并拒绝非调用方修改的部分
4. 提供 dry-run 模式（`context.finalize --dry-run`），让调用方在实际落盘前查看预期导出范围

---

### 问题 2: CataForge reconcile 校准缺陷导致 drift 永不归零

**现象**: orchestrator 在 Phase Transition 时运行 reconcile 校准，以图侧 ghost_relations 计算 drift，但当图后端落后于 markdown 文档时，reconcile 会给出"应导出"建议，用户选择 remediation=export 后重新落盘，但图侧残差仍不清零（导出后重跑 reconcile 仍检出新漂移）。

**复现路径**:
- dev-plan 文档已修订至 r6 版本（markdown 侧已收敛）
- 调用 `cataforge context reconcile dev-plan` → 检出"图侧缺少 N 条 edges"
- 用户选 remediation=export（图→md 导出同步）
- 重跑 reconcile → 仍检出"从前新增的 N' 条边"（N' ≠ 0）

**根本原因分析**:
1. 图谱的 ghost_relations 计数包含"从未被导出过"的推理边（"E-010 属 M-007"之类的隐含关系），这些边在图后端看似"可导出"但实际不该计入 drift（因为原始 md 从未有过，不是"漂移"而是"图侧过度推理"）
2. remediation=export 后的回灌（ingest）并未清除图侧的 never_exported 标记，下次 reconcile 时仍将其视为"应同步的新边"

**影响**:
- drift 校准流程形成死循环（导出→ingest→仍有 drift → 用户困惑是否继续导出）
- 无法判定"何时 drift 已真正清零"，Phase Transition 门禁失效

**建议修复方向**:
1. reconcile 校准时区分两类不一致：
   - 真实漂移：graph 与 markdown 的"已导出过"内容不一致 → remediation=export
   - 图侧超额：graph 含有"markdown 从未有过"的推理边 → remediation=discard（清除 never_exported 标记）
2. 在 ingest 流程中新增 reconciliation-flag，标记本次 ingest 后哪些边被"已消费"，下次 reconcile 时排除这些边的计数
3. 提供 `cataforge context reconcile --explain-drift` 展示具体哪些关系被视为"漂移"，帮助用户判断是否需要真正导出

---

### 问题 3: doc-consistency 检查的三类常见假阳性与框架层盲点

**现象**: test-report 文档在 Phase 6 testing 时的 doc-consistency 校验（§8 裁决清单）检出 4 项一致性问题，其中 3 项经人工核实为假阳性，根本原因是框架未考虑本项目的分卷架构与命名空间演化。

**具体假阳性分类**:

**假阳性 1：ac-traceability 碰撞计数错误**
- 现象：checker 报"token F-010 出现 N 次，但 PRD 仅定义 1 次，重复定义"
- 真实情况：F-010 在 PR#1 (commit 6599982 前)曾是 C-010（code component），后经 kg authority 清理重命名为 UC-010；新建的 F-010 与旧 C-010 无关
- 问题：checker 未考虑"命名空间重组历史"（legacy 分卷中的 C-/T-/P- 前缀已废弃改为 UC-/F-等），计数时混算了两代标记系统

**假阳性 2：ui-coverage 覆盖范围理解偏差**
- 现象：checker 报"F-013 在 test-report 无对应测试覆盖"
- 真实情况：F-013 是 deferred backlog 项（T-131 残差），test-report §1 scope 明确写"仅覆盖 Phase 6 testing 执行范围"，deferred 项不在范围内
- 问题：checker 做全文搜索而忽略了"test-report 的 scope 边界定义"，将 backlog 项视为"应覆盖但缺失"的缺陷

**假阳性 3：entity-propagation 跨分卷图谱查询盲点**
- 现象：checker 报"组件 UC-015 在代码中无引用（orphaned）"
- 真实情况：UC-015 ( InsertDrawer) 的 wiring 文件在 `apps/editor/src/components/__tests__/drawers.test.ts`，与主 ui-spec 分卷路径不同，checker 未做跨分卷图查询
- 问题：checker 仅在主分卷内查询关系，无法识别"分卷间的实体关联"

**框架层盲点**:
1. 命名空间历史：框架假设"同名 token 必然指同一实体"，未考虑重组/迁移场景
2. 业务边界确认：框架对 backlog/deferred 项缺乏理解，无法区分"应覆盖但缺失"vs"显式延后"
3. 分卷架构：多分卷项目的实体关系分散，图查询需跨分卷，当前checker 局限于单分卷视图

**建议修复方向**（由项目或框架层二选一处理）:
- **本项目方案**：在 test-report 中强化 §8 裁决的"假阳性标注"机制，逐项说明 checker 报告的误判根因与正确理解，形成"checker 缺陷→框架反馈→被记入 MEMORY"的闭环
- **框架方案**：
  1. doc-consistency checker 引入"命名空间白名单"参数（`legacy_namespaces: [C, T, P]`），标记的前缀不参与碰撞计数
  2. checker 读取 doc front matter 的 `scope` 字段（如 test-report 的 `scope: phase-6-testing-only`），根据 scope 过滤待检实体
  3. 对多分卷项目，提供显式参数 `--enable-cross-partition-query` 启用跨分卷图查询

---

## 框架级结论与建议

### 本项目可复用经验
1. **subagent 停顿续跑**：后台 agent 在 50+ tool calls 时应主动存档中间产出，防止审查/生成工作丢失（已作为 Mid-Progress Drop Contract 记入 MEMORY）
2. **单卡一 PR 细粒度追踪**：配合自动化 commit 生成，建立"卡片→PR→commit→event-log"可追溯链条，便于问题根因定位
3. **orchestrator 主线程兜底**：在 Phase 转换前固定跑 tests/typecheck/biome 三轮全量校验，不依赖下游子代理或 CI 自洽性承诺

### 对 CataForge 框架的反馈队列
1. **context.finalize 全量重导出越权**（影响：文档污染、一致性破坏）→ 实现"最小写"导出与"导出范围声明"参数
2. **reconcile 漂移永不归零**（影响：Phase Transition 门禁失效）→ 区分"真实漂移"vs"图侧超额"，在 ingest 时清除 never_exported 标记
3. **doc-consistency 三类假阳性**（影响：test-report 等复杂项目的校验噪声）→ 支持命名空间白名单、scope 过滤、跨分卷查询

### 对团队的工作流建议
1. 建立"AC 层 feasibility 前置审查"检查点（tech-lead），对涉及 external-format 的 AC 需显式标注"序列化可行性"
2. 实现 implementer→tech-lead 的"路径确认 checkpoint"（PR merge 前置），防止 deliverables 漂移被误判为延期
3. 将 dev-plan 勾选态同步纳入 merge checklist，维持文档与交付事实的一致性

### 下一步行动
- 本报告标 status: draft，待 orchestrator 复核后改 approved
- 上游反馈三份草稿（fb-context-finalize / fb-reconcile-drift / fb-doc-consistency-false-positives）分别对应 CataForge issue #X、#Y、#Z，由用户选择提交时机与合并优先级
- EXP-001~EXP-010 十条经验条目待纳入各子代理的 SKILL.md 与 AGENT.md Anti-Patterns，作为后续项目的可复用检查清单
