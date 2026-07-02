---
id: "upstream-feedback-20260702"
doc_type: feedback
status: draft
date: 2026-07-02
author: reflector
project: wechat-flow
target: CataForge
---

# 上游反馈草稿 — CataForge 框架级问题与建议

本文档汇总 wechat-flow 项目完成级回顾中发现的三个框架层问题，供 CataForge 维护团队评估与修复。

---

## Issue 1: context.finalize 全量重导出越权污染文档

### 现象

`cataforge context finalize` 在编辑已有文档（status=draft）时执行全量重导出，无法区分"调用方修改的章节"与"后端自动补充或重生的内容"，导致被污染的内容重新落盘。

### 复现路径

**场景 A：修订 dev-plan 的某章节，被追加图谱侧陈旧内容**
```
$ # 修订 T-060，仅改动 §6 patch-loader 相关内容
$ # 调用 context.finalize
$ # 结果：dev-plan 被追加图谱侧推理的 backlog 段，非调用方修改内容

$ git diff docs/dev-plan/dev-plan-wechat-flow.md | grep "^+.*backlog"
```

**场景 B：修订 deploy-spec 全卷，覆盖已修订内容**
```
$ # deploy-spec r1→r2 修订多个章节（§2.2/§2.3/§5 等）
$ # 调用 context.finalize 回灌前的图谱状态不一致
$ # 结果：某些已修订章节被旧内容覆盖
```

**场景 C：test-report 中间修改被 finalize 重置**
```
$ # test-report 修改缺陷清单，调用 finalize
$ # 结果：frontmatter status 被重置为初值 draft
```

### 根本原因

context 的 finalize 实现采用"全量导出"策略，无法识别哪些内容是调用方通过 `context.write()` 修改的（应该保留），哪些是后端推理补充的（应该清除）。结果是所有导出内容（包括污染部分）被原封不动地落盘。

### 影响范围

- **文档完整性**：非预期追加/删除内容，破坏原意
- **一致性门禁失效**：后续 phase-transition 的 drift 校准无法基于可靠的 finalize 产出
- **维护成本**：需要人工 `git checkout` + 重新手工编辑作为 workaround

### 建议修复方向

#### 方案 1：最小写原则（推荐）

修改 finalize 实现为仅导出调用方通过 `context.write()` / `context.write-narrative()` 修改过的节点及其直属关联实体，不进行全量重导出。

实现思路：
- 在 authoring 过程中记录"被修改的章节 ID 集合"
- finalize 时仅对这些节点及其直属关系进行导出
- 对图后端推理补充的关系（如 "E-010 属 M-007"）进行标记与隔离，finalize 时跳过

#### 方案 2：导出范围声明

引入显式参数让调用方指定导出范围，如：

```bash
cataforge context finalize dev-plan --sections "§6,§7.2" --export-relations false
```

参数含义：
- `--sections`：仅导出这些章节（逗号分隔）
- `--export-relations`：是否导出图谱推理关系（默认 false）

#### 方案 3：Dry-run 模式

提供 `--dry-run` 参数让调用方查看预期导出范围：

```bash
cataforge context finalize dev-plan --dry-run
# 输出：将导出以下内容：§6 patch-loader / §7.2 wiring / Relations: 3 edges
# 不包含：后端推理的 backlog 段
```

#### 方案 4：Reconciliation 标记

在 ingest 流程后为消费过的内容添加标记，finalize 时据此区分"已消费"vs"未消费"的关系，防止重复回灌。

### 本项目临时方案

使用 `git checkout -- docs/path/to/file.md` + 手工编辑落盘，而非依赖 finalize 回灌。

### 预期修复时间框架

- 分析：1-2 day
- 实现与测试：3-5 days
- 集成与发布：1 day
- 预计优先级：HIGH（影响文档可靠性，涉及多 phase）

---

## Issue 2: reconcile 漂移永不归零导致 Phase Transition 门禁形成死循环

### 现象

orchestrator 运行 `cataforge context reconcile` 校准时，以图侧 ghost_relations 计算 drift。但当图后端落后于 markdown 文档时，reconcile 会给出"应导出"建议。用户选择 remediation=export 重新落盘后，重跑 reconcile 仍检出新漂移，形成死循环。

### 复现路径

```
$ # 场景：dev-plan 文档已修订至 r6 版本（markdown 侧已收敛）
$ # 图后端仍保有旧版本的推理关系

$ cataforge context reconcile dev-plan
# 输出：graph_drift = 0.12 (586 misaligned edges)

$ # 用户选择 remediation=export 同步图→md
$ cataforge context reconcile --remediation export dev-plan
# 执行导出、覆盖 dev-plan

$ # 再次检查 drift
$ cataforge context reconcile dev-plan
# 输出：graph_drift = 0.06 (233 misaligned edges)  ← 仍有漂移！

$ # 用户困惑：是否需要再导出一次？导出后会不会还是有 drift？
```

### 根本原因

**问题 1：ghost_relations 包含两类不同性质的边**

- 真实漂移（应同步）：graph 与 markdown 的"已导出过"内容不一致 → remediation=export
- 图侧超额（应清除）：graph 含有"markdown 从未有过"的推理边（如"E-010 属 M-007"推理边）→ remediation=discard（清除 never_exported 标记）

当前 reconcile 将两类边混同计数，导出后"超额边"仍存在，被误认为"新漂移"。

**问题 2：ingest 回灌时未清除 never_exported 标记**

即使导出后再 ingest，never_exported 关系仍被保留在图中，下次 reconcile 时仍被计算为"应同步的漂移"。

### 影响范围

- **Phase Transition 门禁失效**：无法判定"何时 drift 已真正清零"，需要人工介入判断
- **用户困惑**：导出→reconcile 的循环无法自洽，用户无法确定何时停止导出
- **维护成本**：每次漂移检测都需要人工解读"哪些边应该清除"

### 建议修复方向

#### 方案 1：区分漂移类型（推荐）

修改 reconcile 校准逻辑，区分两类不一致：

```
reconcile 输出示例：
- True drift (应 export)：12 edges (graph 与 markdown 内容不一致)
- Graph surplus (应 discard)：221 edges (markdown 从未有过，纯图侧推理)

建议 remediation：
  - 若 true_drift > 0：选择 export（同步图→md）
  - 若 graph_surplus > 0：选择 discard（清除图侧超额边）
```

实现思路：
- 在 reconcile 时，逐条检查 ghost_relations 是否与 markdown "已导出过的版本"一致
- 对"markdown 从未有过"的边标记为 "graph_surplus"
- 分别输出两类边的数量与建议 remediation

#### 方案 2：Ingest 时清除 never_exported 标记

修改 ingest 流程，在消费导出内容后，自动清除对应关系的 "never_exported" 标记：

```
ingest 流程补充：
1. 读取导入的内容（markdown）
2. 对于导入的每条关系，在图中检查对应边的状态
3. 若该边带有 never_exported=true，清除该标记
4. 此后 reconcile 时该边不再被视为"应同步的漂移"
```

#### 方案 3：Drift 清零检查点

引入显式的"drift 验证"命令，让 orchestrator 能可靠地判定"何时 drift 已清零"：

```bash
# 当前用法（不可靠）
cataforge context reconcile dev-plan --with-remediation export
cataforge context reconcile dev-plan  # 仍有漂移？

# 建议新用法（可靠）
cataforge context reconcile dev-plan --explain-drift
# 输出：
# - True drift (graph ≠ markdown)：0 edges ✓
# - Graph surplus (never_exported)：233 edges
# - 建议：若 true_drift=0 且 graph_surplus 非关键，可安全推进 Phase Transition

cataforge context drift-clear dev-plan
# 验证 true_drift==0，返回 exit 0 或 exit 1 作为 phase-transition 前置检查
```

### 本项目临时方案

检查 reconcile 输出，若 drift 仅来自 "graph_surplus"（never_exported），可安全忽略，直接推进 Phase Transition。但此判断需人工识别，无法自动化。

### 预期修复时间框架

- 分析与原型：2-3 days
- 方案 1 实现（区分漂移类型）：3-5 days
- 方案 2 补充（ingest 清除标记）：2-3 days
- 集成与测试：3-5 days
- 预计优先级：HIGH（影响 phase-transition 可靠性）

---

## Issue 3: doc-consistency 检查的三类常见假阳性与分卷架构盲点

### 现象

test-report 文档在 Phase 6 testing 时的 doc-consistency 校验（可通过 `cataforge context consistency review` 触发）检出 4 项一致性问题。其中 3 项被人工核实为假阳性，根本原因是框架未考虑本项目的分卷架构与命名空间演化。

### 三类假阳性详解

#### 假阳性 1：ac-traceability 碰撞计数错误

**现象**：Checker 报 "token F-010 出现 N 次，但 PRD 仅定义 1 次"

**真实情况**：
- F-010 在 PR#1 (commit 6599982 之前) 曾是 C-010（code-component 旧前缀）
- PR#1 中 kg authority 根治（见 MEMORY `kg-component-authority-strands-ui-spec`），C-010 被重命名为 UC-010
- 新建的 F-010（feature-xxx）与旧 C-010 无关，是不同命名空间中的两个实体

**检查者发现的问题**：
```
$ cataforge context consistency check test-report
# 输出：[ac-traceability] F-010 appears 3 times in codebase but PRD defines only 1
```

**根本原因**：Checker 未考虑"命名空间重组历史"。本项目从 C-/T-/P- 前缀（code/test/product component）迁移到 UC-/F-/... 前缀（unified component/feature），legacy 命名空间在 PR#1 后已废弃，但 checker 仍混算两代标记系统的 token 计数。

**建议修复**（框架层）：
- 引入"命名空间白名单"参数：`legacy_namespaces: ["C", "T", "P"]`
- Checker 在做碰撞计数时，跳过 legacy 前缀的 token
- 允许项目在 `.cataforge/framework.json` 或 doc frontmatter 中声明：
  ```json
  {
    "consistency_check": {
      "ignore_legacy_namespaces": ["C", "T", "P"]
    }
  }
  ```

#### 假阳性 2：ui-coverage 覆盖范围理解偏差

**现象**：Checker 报 "F-013 在 test-report 无对应测试覆盖"

**真实情况**：
- F-013 是 T-131 残差（见 CLAUDE.md §待办），显式延后到后续 sprint
- test-report §1 scope 明确写"仅覆盖 Phase 6 testing 执行范围"
- deferred 项不在 Phase 6 范围内，应被排除

**检查者发现的问题**：
```
$ cataforge context consistency check test-report
# 输出：[ui-coverage] Feature F-013 not covered by test-report
```

**根本原因**：Checker 做全文搜索而忽略了"test-report 的 scope 边界定义"。Checker 无法理解业务逻辑"deferred item ≠ uncovered item"。

**建议修复**（框架层）：
- 在 doc frontmatter 中支持 `scope` 字段声明：
  ```yaml
  ---
  id: "test-report-wechat-flow"
  scope: "phase-6-testing-only"  # 新增字段
  ---
  ```
- Checker 读取该字段后，对 scope 外的实体跳过覆盖率检查
- 定义标准 scope 值集合（如 `phase-6-testing-only` / `phase-testing-full` / `all-sprints`）

#### 假阳性 3：entity-propagation 跨分卷图谱查询盲点

**现象**：Checker 报 "Component UC-015 在代码中无引用（orphaned）"

**真实情况**：
- UC-015 (InsertDrawer) 的 wiring 文件在 `apps/editor/src/components/__tests__/drawers.test.ts`
- 该文件与主 ui-spec 分卷路径不同（ui-spec 主分卷 vs 分卷内嵌测试文件）
- Checker 仅在主分卷内查询，无法跨分卷识别 wiring 关系

**检查者发现的问题**：
```
$ cataforge context consistency check ui-spec
# 输出：[entity-propagation] UC-015 has no wiring evidence in same partition
```

**根本原因**：当前 consistency checker 基于"单分卷视图"实现，无法进行跨分卷的图查询。对多分卷项目，孤立组件的 test-wiring 证据可能在另一分卷，checker 无法追踪。

**建议修复**（框架层）：
- 引入 `--enable-cross-partition-query` 参数启用跨分卷查询：
  ```bash
  cataforge context consistency check ui-spec --enable-cross-partition-query
  ```
- Checker 在检测 entity-propagation 时，查询所有分卷的 wiring 关系，而非限于当前分卷
- 对多分卷项目，默认启用该参数

### 影响范围

- **假阳性噪声**：test-report 等复杂项目的 Phase Transition 门禁被假警告阻塞
- **维护负担**：需要人工逐项排除、标注假阳性，供后续审查参考
- **框架可用性**：doc-consistency 在分卷架构与命名空间演化场景下的信噪比差

### 建议修复方向（汇总）

**方案 1：本项目层面（快速）**
- 在 test-report 中强化 §8 裁决的"假阳性标注"机制，逐项说明 checker 报告的误判根因与正确理解
- 在 doc frontmatter 补充 `checker_overrides` 字段，显式声明"以下 checker 报告已人工验证为假阳性"

**方案 2：框架层面（系统性解决）**
- 支持 `legacy_namespaces` 参数，避免混算代命名空间的 token
- 支持 `scope` frontmatter 字段声明 doc 的覆盖范围
- 支持 `--enable-cross-partition-query` 参数启用跨分卷查询

### 本项目临时方案

test-report §8 逐项附证据链（文件路径/行号/wiring 文件名），并标注"假阳性"或"正确排除"，供后续审查参考。

### 预期修复时间框架

- 分析与设计：2-3 days
- 方案 1（legacy namespace）：2 days
- 方案 2（scope 声明）：2 days
- 方案 3（cross-partition query）：3-5 days
- 集成与测试：3-5 days
- 预计优先级：MEDIUM（影响多分卷项目的 consistency 检查质量）

---

## 反馈总结

| Issue | 根本原因 | 影响 | 优先级 | 预期修复周期 |
|-------|--------|------|--------|-----------|
| Issue 1: finalize 越权 | 导出策略未区分"调用方修改"vs"后端推理" | 文档污染、一致性破坏 | HIGH | 6-8 days |
| Issue 2: reconcile 死循环 | 漂移计数混同"真实漂移"vs"图侧超额" | Phase Transition 门禁失效、用户困惑 | HIGH | 10-15 days |
| Issue 3: 假阳性 | Checker 无法理解分卷/命名空间/scope | Phase Transition 被假警告阻塞 | MEDIUM | 10-15 days |

建议优先级：Issue 1 > Issue 2 ≥ Issue 3（按文档可靠性与门禁健壮性排序）

三个问题的修复相对独立，可并行实施。本项目作为 CataForge dogfood 项目，这些反馈基于真实使用痛点，预期能提升框架在中大型多分卷项目上的可用性。
