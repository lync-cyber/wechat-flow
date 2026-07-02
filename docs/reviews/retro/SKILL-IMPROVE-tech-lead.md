---
id: "skill-improve-tech-lead"
doc_type: skill-improvement
status: draft
date: 2026-07-02
author: reflector
target_id: tech-lead
target_kind: skill
source_exp: "EXP-002, EXP-003, EXP-004, EXP-005"
---

# SKILL-IMPROVE: tech-lead — AC 层可行性前置审查与 dev-plan 回写机制

## EXP-002: AC 层可行性缺陷导致 schema 设计根本问题

### 当前问题

T-060 HIGH 问题：AC-001 定义 `PatchBundle.patches: RuleDefinition[]`，schema 要求 JSON 携带函数字段（`matcher`/`transform`），但 JSON 协议根本无法表达函数对象。该缺陷在绿色阶段虚假过关，直到 sprint-review 才被 code-review 发现并标 HIGH 需修订。

前序类似缺陷（T-091/T-119）在 AC 中遗漏安全路径和错误码定义，同样在 GREEN 后 code-review 才发现。

### 建议改进

#### 目标文件
`.cataforge/skills/tech-lead/SKILL.md` 的"AC 编写指南"或"需求验收准则"章节

#### 当前文本范例
假设当前 SKILL.md 包含：

```
## AC 编写要求

- 遵循 AC 模板，包含 GIVEN/WHEN/THEN 三段
- AC 与 arch 的引用关系需可追溯
```

#### 建议修改后的文本

```
## AC 编写要求

- 遵循 AC 模板，包含 GIVEN/WHEN/THEN 三段
- AC 与 arch 的引用关系需可追溯

### Feasibility 前置检查（涉及 external-format 或新 schema 时必执行）

**此项检查在 AC 初稿完成、向 implementer 分发前由 tech-lead 执行一次。**

当 AC 中包含"JSON/YAML/Protocol Buffer 等 external-format 的数据定义"或"新的数据结构 schema"时，tech-lead 需完成以下可行性核验：

1. **格式表达能力核验**
   - 问题示例：AC 定义 `matcher: (rule) => boolean` 函数字段，但使用场景（HTTP JSON 补丁包）无法序列化函数对象
   - 自检问题：该 schema 中的每个字段，在目标 external-format 中是否都能被真实表达？包括函数、Date 对象、循环引用等特殊类型
   - 修复选项：
     - a) 修订 schema，移除不可序列化字段（如 matcher 改为 selector string + 预注册 transform-id 白名单）
     - b) 修订使用场景描述，明确"该 schema 仅用于进程内 TypeScript 对象，不涉及序列化"
     - c) 在 AC 中显式标注 `[ENV-LIMITATION] 本 AC 假设补丁包仅在内存中构造，不支持 HTTP JSON 传输`（此时需由 implementer 在 AC 时就提出，而非 GREEN 后发现）

2. **API 契约完整性核验**（针对新增 API 或 RPC 接口）
   - 问题示例：T-091 API-032 定义了返回字段但遗漏了安全错误码（401/403），T-119 registerVariant 遗漏了三个错误码与 slots 模型
   - 自检清单：
     - 成功路径的所有响应字段是否都在 AC 中列举？
     - 失败路径（API 错误码、validation 异常）是否完整覆盖 arch 中的约束？
     - 安全相关路径（auth、authorization、rate-limit）是否在 AC 中显式列举？
     - 若 arch 定义了 E-010（错误码注册表）与该 API 的交叉引用，该 API 的 AC 是否覆盖了注册表中的全部相关错误码？

3. **可选字段填充策略核验**（当 schema 包含可选字段时）
   - 问题示例：arch#§2.M-003 规定了 `RuleDefinition.fixture?` 结构（含 metadata.json），但 AC 中未提到、implementer 选择性遗漏
   - 自检问题：对于 AC 中未显式提及的可选字段，开发者应如何选择"填充"vs"不填"？不填充时系统行为是什么？
   - 修复选项：
     - a) 在 AC 中显式要求"必须填充 fixture 元数据"（改为必填字段）
     - b) 在 AC 中显式允许"可选；不填充时等价于 no-op"（注释清楚系统默认行为）
     - c) 在 architect 层明确标注"该字段为选项方案中的 B 分支，当前 sprint 不要求实现"，与任务卡的范围约定保持同步

### AC 可行性审查 checklist

- [ ] 该 AC 涉及 JSON/YAML/other external-format 吗？若是，schema 中的每个字段都能被该格式序列化吗？
- [ ] 该 AC 定义了新 API 或 RPC 吗？若是，失败路径（错误码）是否完整覆盖 arch 约束与 E-010 注册表？
- [ ] 该 AC 包含可选字段吗？若是，不填充时系统行为是否在 AC 中显式说明？
- [ ] 存在多个合理实现选项吗？若是，AC 中是否明确了首选方案或给出了选择标准？

若任何项无法确认，标注 `[ASSUMPTION]` 并在 AC 中显式说明前置条件，后续由 implementer 和 code-review 共同确认。

**tech-lead 反馈方式**：在 dev-plan 中逐 AC 补充 feasibility 评审结论（"通过"/"需澄清"/"需重设计"），附上具体缺陷编号供 implementer 参考。
```

#### 修改理由

- T-060/T-091/T-119 一系列问题的共同根因是 AC 层设计缺陷（schema 可行性、API 错误码遗漏）在 RED/GREEN 绿色通过，到 code-review 才被发现
- 若 tech-lead 在 dev-plan 阶段就前置这道检查，可将问题左移至"需求阶段"而非"代码阶段"，减少 revision 往返
- 本项目的 T-091/T-119 修复都是在 code-review 补发现的 AC 问题，属于下游代价最高的发现时机

---

## EXP-003: Deliverables 路径声明漂移导致 drift-rate 虚高

### 当前问题

dev-plan 撰写时与实现期间的约定存在时间差，实现完成后路径调整（如 src/ 目录结构重组、文件合并/分离）未回写 dev-plan，导致 drift-rate 报告显示"虽然代码交付了，但路径与计划不符"的虚假信号。

### 建议改进

#### 目标文件
`.cataforge/skills/tech-lead/SKILL.md` 的"dev-plan 回写与同步机制"新增章节

#### 建议新增内容

```
## Dev-Plan 回写与同步机制

dev-plan 是"写入后即冻结"的设计制品（通过 doc-review 后锁定），但实现期间可能因合理的架构调整而改变 deliverables 路径。为避免"交付事实对、文档滞后"被误判为延期或计划外，建立以下回写机制：

### 实现期路径变更通知

当 implementer 在 GREEN 或代码审查阶段发现 deliverables 路径与计划不符时，需执行以下流程：

1. **本地确认**：在 git commit 中关联原计划路径与实际落点（如 PR 描述中注明"原计 `packages/core/src/render.ts`，实际 `apps/editor/src/render.ts` 以避免循环依赖"）
2. **路径变更通知**：PR 评审时向 tech-lead 显式指出哪些 deliverables 路径已调整，附上调整原因
3. **回写触发**：PR 合并前，reviewer 或 tech-lead 需在 dev-plan 中**主动回写**相关 AC 与 deliverables 路径（不能等待 finalize 自动回灌）

### 勾选态同步 checkpoint

实现完成后，在 PR merge 前执行以下检查：

- [ ] dev-plan 中该卡的 AC 勾选框 `[x]` 全部勾选（8/8 或 N/N）
- [ ] dev-plan 中该卡的 deliverables 勾选框与交付事实一致
- [ ] 若有路径变更，相关 AC 与 deliverables 行已被回写为实际路径
- [ ] 若无路径变更，路径声明与交付物一致

该检查可由 reviewer 手工执行，或由 orchestrator 主线程自动化校验（读取 git diff 中的新路径与 dev-plan 的声明做快速匹配）。

### dev-plan 回写的权限设定

- dev-plan 冻结后（status: approved）正常禁止修改
- 仅在以下场景允许回写：① 实现期路径调整（技术决策）② AC 勾选态与交付事实不符（维护同步）③ 错别字修正
- 回写需在 git commit message 中标注 `[plan-update]` 标签（便于事后审计"哪些计划被调整过"）
- 回写内容不应包含"功能范围"的改动（如新增 AC），仅限于"路径"与"勾选状态"同步

这样可以平衡"dev-plan 冻结的严谨性"与"实现期合理调整的灵活性"。
```

#### 修改理由

- SPRINT-REVIEW-s6-r1 的 drift-rate 聚合表明，T-058/T-059/T-068 等卡的计划路径漂移是"交付完成但路径调整"，不是延期
- 当前 dev-plan 文档无法区分"哪些路径是有意调整（记录在 git 历史）"vs"哪些是遗漏回写"，外部读者无法判定 drift 的性质
- 显式的"回写 checkpoint"与"权限设定"可以将这类问题左移到 PR merge 时而非 sprint-review，减少后续跨 sprint 的追溯成本

---

## EXP-004: AC 标记策略缺陷导致 fixture 元数据系统性未填充

### 当前问题

arch#§2.M-003 规定了 fixture 目录结构（含 metadata.json），`RuleDefinition.fixture?` 字段为此设计，但 42 条规则全部零填充。问题根源是"可选字段如何填"的策略在 AC 层未清楚定义。

### 建议改进

#### 目标文件
`.cataforge/skills/tech-lead/SKILL.md` 中已建议的"Feasibility 前置检查"章节中新增"可选字段填充策略"部分（参见 EXP-002 改进）

建议现有内容中的"可选字段填充策略核验"段落已经涵盖本问题，无需新增，仅需在 T-056/T-060/T-061 等实际任务中应用该检查清单，确认每张卡的 fixture 字段填充方案被明确记录。

---

## EXP-005: 文档勾选态同步缺失导致可追溯性链条断裂

### 当前问题

dev-plan 的 AC 与 deliverables 勾选框 `[ ]` 与交付事实不符，虽然代码交付完整，但文档记录为"未完成"，混淆了后续读者的判断。

### 建议改进

#### 目标文件
`.cataforge/skills/tech-lead/SKILL.md` 中已建议的"勾选态同步 checkpoint"新章节（参见 EXP-003 改进）

该改进已在 EXP-003 的"dev-plan 回写与同步机制"中详细描述，可复用。

---

## 预期效果

1. **AC 层问题左移**：从 code-review（HIGH 定标）→ dev-plan 阶段（feasibility 评审）
2. **Drift-rate 失真消除**：从"计划路径漂移被算作延期"→ "路径调整明确记录与回写"
3. **可选字段系统性遗漏减少**：从"42 条规则零填充"→ "AC 中明确定义填充策略"
4. **勾选态准确性提升**：从"文档滞后一个 sprint"→ "PR merge 时即同步"
