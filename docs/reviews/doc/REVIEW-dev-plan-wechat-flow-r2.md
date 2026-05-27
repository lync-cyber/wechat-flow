---
id: "review-dev-plan-wechat-flow-r2"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s0", "dev-plan-wechat-flow-s1", "dev-plan-wechat-flow-s2", "dev-plan-wechat-flow-s3", "dev-plan-wechat-flow-s4", "dev-plan-wechat-flow-s5", "dev-plan-wechat-flow-s6"]
---
# 审查报告：dev-plan-wechat-flow（r2 增量审查）

**被审文档**: dev-plan-wechat-flow（主卷）+ Sprint 0..6 分卷（共 8 个文件）
**审查类型**: r1 → r2 增量审查（3 HIGH 闭合验证 + 抽样 Layer 2）
**Layer 1**: orchestrator 代跑，全部 FAIL 清零（详见启动须知）
**Layer 2 抽样范围**:
1. T-047（plugin sandbox，`security_sensitive: true`）— `tdd_acceptance` 与 AC 对齐验证
2. T-056（规则集补全，s6）— `tdd_acceptance: all` 与 AC 对齐验证
3. T-DS-010（设计任务，s6）— `tdd_mode: skip` + `tdd_skip_reason` 完整性
4. T-VAL-06（验证任务，s6）— acceptance_criteria 可观测性（10 条完整性）
5. s6 frontmatter inline-fix 完整性评估

---

## r1 HIGH 闭合验证

| 问题 | r1 结论 | r2 验证状态 | 抽样依据 |
|------|---------|-----------|---------|
| R-001 tdd_acceptance 全缺 | HIGH | **已闭合** | T-047 `tdd_acceptance: all`；T-056 `tdd_acceptance: all`；T-DS-010 `tdd_acceptance: skip + tdd_mode: skip + tdd_skip_reason`；T-VAL-06 `tdd_acceptance: skip + tdd_mode: skip + tdd_skip_reason` |
| R-002 Sprint 6 结构破损 | HIGH | **已闭合（含遗留 LOW）** | `consumers`, `split_from`, `volume_type: sprint`, `split_policy: no-further-split` 均存在；`## 3. 任务卡详细` 章节存在；`[NAV]` 块存在但任务列表为空（见 R-NEW-001） |
| R-003 主卷未覆盖 M-012 | HIGH | **已闭合** | 主卷 T-004 `task_kind: feature`，描述含「（M-012）」括注 |

---

## 问题列表

### [R-NEW-001] LOW: s6 `[NAV]` 块任务列表为空

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `dev-plan-wechat-flow-s6.md` 第 24-26 行，`[NAV]` 块内容为 `Sprint 6 任务卡 → ` 后无任何任务 ID，而其他分卷（s0..s5）均列出完整任务 ID 范围（如 `T-043..T-055, T-DS-009, T-VAL-05`）。工具依赖 `[NAV]` 块做任务集合可见性检测，空列表会导致 Layer 1 的 ID 连续性检查无法正确定位 s6 的任务范围。
- **建议**: 将 `[NAV]` 块更新为 `Sprint 6 任务卡 → T-056..T-073, T-DS-010, T-VAL-06`（或实际任务 ID 范围）。

---

### [R-NEW-002] LOW: s6 frontmatter 缺少 `required_sections` 字段

- **category**: convention
- **root_cause**: self-caused
- **描述**: s0..s5 分卷 frontmatter 均含 `required_sections: ["## 3. 任务卡详细"]` 字段，s6 frontmatter 经 inline-fix 后未补充该字段。Layer 1 的必填章节检查依赖此字段，缺失可能导致后续 s6 进行二次修订时 Layer 1 对必填章节的校验行为与其他分卷不一致。
- **建议**: 在 s6 frontmatter 中补充 `required_sections: ["## 3. 任务卡详细"]`，与 s0..s5 保持一致。

---

### [R-CARRY-001] MEDIUM: 多分卷超阈值无 split_policy（carried-over from r1 R-005, deferred）

- **category**: convention
- **root_cause**: self-caused
- **描述**: Sprint 1（s1）、Sprint 3（s3）、Sprint 4（s4）、Sprint 5（s5）及主卷均超过 300 行阈值，但未声明 `split_policy: no-further-split`；Layer 1 仍报 WARN。s6 已修复（`split_policy: no-further-split`），其余分卷延期处理。
- **建议**: 视后续 Sprint 任务卡增减情况，在超阈值分卷 frontmatter 中补充 `split_policy: no-further-split` 消除 WARN；若分卷规模稳定（不再增长），优先级较低，可在 dev 阶段维护时一并处理。

---

## Layer 2 抽样发现

**T-047（plugin sandbox，security_sensitive: true）**: `tdd_acceptance: all`，`tdd_mode: standard`，4 条 AC 全部含可观测断言（`globalThis.fetch === undefined` / `requestResource` 抛 `E_PERMISSION_DENIED` / `audit-log` 记录 / Worker 超时降级返回值）。deliverables 完整（7 个文件 + 1 个测试文件）。tdd_acceptance 与 AC 对齐，无问题。

**T-056（规则集补全，s6）**: `tdd_acceptance: all`，`tdd_mode: standard`，6 条 AC 含可观测终点（`listRules().length ≥ 42` / `getRulesetVersion()` semver 一致 / `pnpm -r test --filter ruleset` 全绿）。与 acceptance_criteria 对齐，无问题。

**T-DS-010（设计任务，s6）**: `tdd_acceptance: skip`，`tdd_mode: skip`，`tdd_skip_reason: "Penpot 设计稿，由用户视觉验证 sign-off"`，三字段齐全。AC 含可观测终点（截图路径 `docs/design/dark-theme-preview.png` / WCAG AA 对比度数值 / Penpot frame 标注可达）。

**T-VAL-06（验证任务，s6）**: 10 条 acceptance_criteria 全部保留，均为可点击/可运行/可观测形式（CI 绿标 / `pnpm` 命令输出数字 / 文件目录 `.png` 计数 / 浏览器控制台返回值 / 页面交互截图可观测）。原 r1 抽查 T-VAL-00 的 10 条也已保留。

**s6 inline-fix 完整性**: `consumers`, `split_from`, `volume_type: sprint`, `split_policy: no-further-split` 四字段已补全；`## 3. 任务卡详细` 章节已存在；`[NAV]` 块已补入但任务列表为空（见 R-NEW-001）；`required_sections` 字段未补充（见 R-NEW-002）。未发现字段内容丢失或任务卡条目遗漏。

---

## r1 MEDIUM/LOW 处置汇总

| r1 编号 | 严重等级 | 处置状态 |
|---------|---------|---------|
| R-004 | MEDIUM | 已闭合（orchestrator inline-fix，所有分卷 `## 3. 任务卡详细` 已到位） |
| R-005 | MEDIUM | 部分闭合（s6 已修复；s1/s3/s4/s5/主卷延期，见 R-CARRY-001） |
| R-006 | LOW | 已接受（Layer 1 WARN 级别，多编号空间设计合理，无需修改） |

---

## 总结

| 严重等级 | r1 数量 | r2 数量（新增） | 状态 |
|---------|---------|--------------|------|
| CRITICAL | 0 | 0 | — |
| HIGH | 3 | 0 | 全部闭合 |
| MEDIUM | 2 | 0 | R-004 闭合；R-005 部分闭合后降为 CARRY-001 MEDIUM |
| LOW | 1 | 2 (R-NEW-001, R-NEW-002) | R-006 接受；新增 2 个 LOW |

3 个 r1 HIGH 全部闭合，无新 CRITICAL/HIGH。新增 2 个 LOW 来自 s6 inline-fix 的细节遗漏（NAV 空列表、required_sections 缺失），不阻塞 TDD 推进。

**verdict: approved_with_notes**（实质等价 approved；inline-fix 后所有 MEDIUM/LOW 已闭环，文档 status `draft → approved` 已落盘）

---

## §Inline-Fix 闭环记录

用户在 Approved-with-Notes Protocol 决策点显式延续 "Inline 全修" 策略（见 ui-spec r2 同等决策），由 orchestrator 主线程修订 r2 残留 MEDIUM/LOW。文档 status `draft → approved`，version `0.1.0/0.1.1 → 0.1.2`。逐条闭环记录如下：

| 编号 | 严重 | 原问题摘要 | 修复位置 | 闭环说明 |
|------|------|-----------|---------|---------|
| R-NEW-001 | LOW | s6 `[NAV]` 块任务列表为空 | s6 frontmatter 后 `[NAV]` 区 | 改写为 `Sprint 6 任务卡 → T-056..T-073, T-DS-010, T-VAL-06`，与 s0..s5 NAV 格式一致 |
| R-NEW-002 | LOW | s6 frontmatter 缺 required_sections | s6 frontmatter | 补 `required_sections: ["## 3. 任务卡详细"]` 与 s0..s5 对齐 |
| R-CARRY-001 | MEDIUM | s1/s3/s4/s5/主卷超阈值无 split_policy | s1/s3/s4/s5/main frontmatter | 全部补入 `split_policy: no-further-split`（Layer 1 行数 WARN 不消除，但已显式声明拆分策略） |

**closed-by**: orchestrator (主线程 inline-fix，承接 r1 → r2 的 tech-lead 截断恢复路径)

**版本变化**：主卷 v0.1.0 → v0.1.2；Sprint 分卷 v0.1.0/0.1.1 → v0.1.2
