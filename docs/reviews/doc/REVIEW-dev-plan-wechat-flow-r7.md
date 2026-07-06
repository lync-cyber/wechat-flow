---
id: "review-dev-plan-wechat-flow-r7"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s7"]
consumers: [tech-lead, orchestrator]
---

# REVIEW: dev-plan-wechat-flow-s7 — r7（Sprint 7 视觉升级批，27 张任务卡 T-132..T-159）

> 被审文件：`docs/dev-plan/dev-plan-wechat-flow-s7.md`（status: draft）
> 上游依据：`arch-wechat-flow-modules#§2.M-005`、`ui-spec-wechat-flow-block-taxonomy#§8`、`ui-spec-wechat-flow-content-elements#§9`、`ui-spec-wechat-flow-block-variants#§10`、`ui-spec-wechat-flow#§2.UC-015/UC-021`

---

## Layer 1 结果

`cataforge skill run doc-review -- dev-plan docs/dev-plan/dev-plan-wechat-flow-s7.md` 返回 `exit 1`，`TOTAL FAILURES: 2`：

- FAIL: 缺少必填章节: 迭代规划
- FAIL: 缺少必填章节: 集成与E2E测试规划

**判定：checker 对分卷文档的已知模板不匹配假阳性，非内容缺陷**（reviewer-calibration）。核实依据：

1. 对已 `approved` 的同批同结构分卷 `dev-plan-wechat-flow-s6.md` 重跑同一 Layer 1 命令，同样返回「缺少必填章节: 迭代规划 / 集成与E2E测试规划」，另外还多报「缺少必填章节: 依赖图」——即便 s6 本身确实不含依赖图章节都会被判 FAIL，可见 checker 对 `doc_type=dev-plan` 是按**整卷模板**的必填章节清单核对，未回退到 frontmatter 自声明的 `required_sections: ["## 3. 任务卡详细"]`（与 `REVIEW-arch-wechat-flow-r8.md` 记录的同类 checker 行为一致：`check_required_sections` 仅在模板缺失时才回退 frontmatter 自声明）。
2. s7 分卷 frontmatter 已正确自声明 `required_sections: ["## 3. 任务卡详细"]` 且文档确实包含该章节，实质合规。
3. 该 FAIL 签名不因 s7 特有内容触发，是 sprint 分卷文档的既有已知 checker 局限（本项目 dev-plan 分卷自 s0 起从未包含"迭代规划"/"集成与E2E测试规划"独立章节，历史分卷 s1..s6 均已 approved）。

按 COMMON-RULES §Layer 1 调用协议，此 2 项 FAIL 判定为 reviewer-calibration 假阳性，不计入 verdict，全量转入 Layer 2 语义审查。

WARN 项处置：
- 行数 915 超 300 阈值：sprint 分卷惯例（历史 s4/s6 均超阈值仍 approved），不重复登记。
- ID 编号不连续缺 T-131/T-145：T-131 属 Sprint 6（NAV 已正确声明范围 T-132..T-159，不含 T-131）；T-145 核实为**文档内未显式说明的空缺**——已在 Layer 2 登记为 completeness 问题（见 [R-004]）。
- 4 个任务缺 context_load（T-138/139/140/159）：均为 `[DESIGN]`/`[VALIDATION]` 任务，核对 s6 同类任务（T-104 design、T-113 validation）同样省略 context_load 属既有跨 sprint 惯例，非本卷新增缺陷，不单独登记。
- AC 描述缺可观测动词 / 非 Given-When-Then（61/62 条）：抽样核实后判定误报占相当比例——多数命中项为类型契约类 AC（如 T-132 编译期类型断言、T-133 静态归类核对），此类 AC 的可判定终点是"编译期报错/编译通过"而非运行时副作用，Given-When-Then 强套用无意义；抽样的运行时视觉类 AC（T-134/T-137/T-141..T-156）实际已普遍规范使用 Given-When-Then + 渲染后计算值断言，不重复登记为独立问题。

---

## Layer 2 Findings

### [R-001] HIGH: 视觉一致性审查 AC 判定路径不统一，10/11 处缺可执行的报告引用与裁决依据

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: 全卷共 11 处「视觉一致性审查通过」类 AC（T-137 AC-007、T-141 AC-006、T-142 AC-006、T-148 AC-007、T-149 AC-007、T-150 AC-004、T-151 AC-004、T-152 AC-005、T-153 AC-006、T-154 AC-007、T-155 AC-006、T-156 AC-007，实为 12 处，含 T-137 共 12）。其中仅 T-137 AC-007 明确指向可执行的判定路径：「经 `docs/reviews/design/DESIGN-REVIEW-UC-015-r{N}.md` reviewer 核验为 `approved`/`approved_with_notes`」。其余 11 处（T-141/142/148..156）均只写"与 T-139/T-140 样张视觉一致（容差内）"，未指明：① 该 AC 由哪份 DESIGN-REVIEW 报告承载判定（T-139/T-140 各自产出 1 张样张页覆盖多个 Block/元素，是否每个实现卡各自触发一次 `penpot-bridge verify` 产出独立 `DESIGN-REVIEW-{component}-r{N}.md`，还是由 sprint-review 统一核验）；② 判定者与 verdict 取值集合；③ "容差"的操作性定义（s6 先例 T-131 明确容差判定采用人工「一致/存在差异」二元标记 + `overlay-report.html` 引用，本卷未复用同等具体度）。
- **建议**: 参照 T-137 AC-007 或 s6 T-131 的写法，为 T-141/142/148..156 各自补齐：判定报告路径命名规则（如 `DESIGN-REVIEW-{blockId}-r{N}.md`）+ 判定 verdict 取值（`approved`/`approved_with_notes`）+ 若容差为定性判定需明确记录形式（对照 s6 T-131 的 `overlay-report.html` 逐节标记模式）。否则 sprint-review 阶段的 AC-coverage 核验将无法客观判定这 11 条 AC 是否真被履行。

---

### [R-002] MEDIUM: T-133 的 LOC_SIGNAL(200) 超 TDD_LIGHT_LOC_THRESHOLD(150) 但 tdd_mode 仍为 light

- **category**: consistency
- **root_cause**: self-caused
- **描述**: COMMON-RULES 定义 `TDD_LIGHT_LOC_THRESHOLD=150`：「LOC ≤ 阈值 → light；> 阈值 → standard」。T-133 `LOC_SIGNAL: 200`（"40 文件各 1 行改动 + factory 签名 + 测试"）但 `tdd_mode: light`，未如 T-135/T-137/T-149 那样在 notes 中给出升级为 standard 或维持 light 的显式豁免理由。对比同卷 T-135（LOC 180，因跨 3 模块显式升 standard）、T-137（LOC 220，因跨模块+视觉门禁显式升 standard），T-133 的 200 LOC 未获得对等处理，规则应用不一致。
- **建议**: 二选一——① 将 T-133 `tdd_mode` 改为 `standard`（40 文件机械式同构改动虽重复度高，但仍属 LOC 超阈值场景，按规则字面应升级）；② 若判定"40 处同构 1 行改动"的实际认知复杂度远低于常规 200 LOC（重复劳动而非分支/状态数增长），应在 notes 中显式记录该豁免理由，供 tdd-engine/reviewer 有据可依，而非留白。当前留白使读者无法区分"遗漏"还是"经过评估后的刻意选择"。

---

### [R-003] MEDIUM: Mermaid 依赖图（§2）与任务卡 `dependencies` 字段存在一处不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: §2 依赖图声明边 `T-133 --> T-137`，但 T-137 任务卡 `dependencies` 字段仅为 `[T-135, T-138]`，未显式包含 T-133。虽然 T-135 本身依赖 `[T-133, T-134]`，故 T-133→T-137 在传递闭包上不构成排期矛盾（T-133 必然先于 T-135 完成，T-135 又是 T-137 前置），但 §2 图与 §3 任务卡字段是同一文档内的两处并行事实源，二者不一致会误导只读其一的下游读者（如自动化工具若仅解析 `dependencies` 字段生成排期，会与人工看图得出的印象不一致）。
- **建议**: 从 §2 图中移除 `T-133 --> T-137` 冗余边（经 T-135 传递即可表达），或在任务卡 `dependencies` 字段显式补 T-133（但会与"仅列直接依赖"的通常约定冲突，故推荐前者：精简图，仅保留能从任务卡字段准确派生的边）。

---

### [R-004] MEDIUM: T-145 空缺未在文档内显式说明，完整性依赖外部上下文

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 任务编号从 T-144 跳至 T-146，无 T-145。核实 `ui-spec-wechat-flow-content-elements#§9.6`（列表 marker 主题色设计）确认「marker 色彩差异化是低价值投入……维持默认继承行为即可满足可用性」——即 §9.6 本身不产生开发工作量，T-145 空缺在语义上成立；T-139 [DESIGN] 卡的 AC-001 也附带一句"list-marker 因 §9.6 平台限制无跨主题差异化设计，不产出样张"侧面印证。但**该结论仅体现在 T-139 一处附带说明**，s7 文档正文（NAV / 开篇目标段 / 依赖图）均未直接提及 T-145 的空缺理由，纯读任务卡详细清单的读者会误以为编号遗漏或缺少交付物。
- **建议**: 在 NAV 或开篇目标段补一句显式声明（如："T-145（list-marker 主题色）经 ui-spec §9.6 核实为无跨主题差异化开发工作量，故本批不产出对应任务卡"），使空缺理由不依赖读者恰好翻到 T-139 的附带注记。

---

### [R-005] MEDIUM: T-158 `context_load` 引用的 doc_id 未在 frontmatter `deps` 声明

- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-158 `context_load` 列出 `ui-spec-wechat-flow-p001-p005#§3`，但该 doc_id（`ui-spec-wechat-flow-p001-p005`）未出现在文档 frontmatter 的 `deps` 数组中（现有 `deps` 仅含 arch 三卷 + ui-spec 四卷，均不含 p001-p005 分卷）。这会导致依赖展开工具（`cataforge context read --with-deps`）无法通过 frontmatter 正确预取该分卷，也让 `cataforge context validate` 类一致性校验对本卷与 `ui-spec-wechat-flow-p001-p005` 的引用关系"看不见"。反向地，frontmatter 声明的 `ui-spec-wechat-flow-uc001-uc014` 在全卷 27 张任务卡的 `context_load` 中未被任何一张实际引用（UC-015/UC-021 均来自主卷 `ui-spec-wechat-flow` 而非 uc001-uc014 分卷），是较轻的"声明但未消费"信号。
- **建议**: frontmatter `deps` 补 `ui-spec-wechat-flow-p001-p005`；核实 `ui-spec-wechat-flow-uc001-uc014` 是否仍被需要（若 UC-015/UC-021 内容已迁移出该分卷，可从 `deps` 移除，或确认该分卷承载其他隐性依赖后保留）。

---

### [R-006] LOW: 5 张任务卡 AC 数=7，超 `TASK_SPLIT_LOC` 附带的 AC>6 拆分信号线

- **category**: convention
- **root_cause**: self-caused
- **描述**: `TASK_SPLIT_LOC=250` 附带规则"或 AC > 6 则先拆"。T-137（AC=7，LOC=220）、T-148（AC=7，LOC=140）、T-149（AC=7，LOC=170）、T-154（AC=7，LOC=110）、T-156（AC=7，LOC=150）均为 AC=7、LOC 均 ≤ 250。核实内容后判定这 5 张卡的 AC 内聚性尚可（如 T-149 的 7 条 AC 覆盖 3 个 SVG 变体 + 2 条安全边界 + 1 条布局 + 1 条视觉审查，语义上是同一变更的不同验证角度，非强行合并的多个不相关变更点），拆分未必提升可维护性，故未升级为 HIGH/MEDIUM，仅作提示性登记。
- **建议**: 若未来该批任务在 GREEN 阶段实际耗时/复杂度显著偏离预期，tech-lead 可优先复核这 5 张卡是否应进一步拆分（如 T-149 的安全边界断言可考虑独立成子任务），当前不要求现在拆分。

---

### [R-007] LOW: `## 2. 依赖图` 章节编号与既有 sprint 分卷惯例不一致

- **category**: convention
- **root_cause**: self-caused
- **描述**: 对比 s0..s6 全部既有 sprint 分卷（均只含单一 `## 3. 任务卡详细`，或 s6 额外含 `## 4. Deferred Backlog`），s7 是首个引入 `## 2. 依赖图` 独立章节的 sprint 分卷，且文档中不存在对应的 `## 1.` 章节（直接从未编号的开篇段落跳到 `## 2.`）。内容本身有价值（27 张任务卡的依赖关系确实复杂，图示化合理），但编号起点缺 `## 1.` 造成断层，且与既有分卷"无独立依赖图章节"的约定不一致，可能是本卷引入的新惯例，也可能是遗漏 `## 1.` 章节标题。
- **建议**: 确认是否遗漏 `## 1.` 章节标题（如"迭代目标"或类似内容当前作为无编号段落存在），若是有意为之的新约定（sprint 分卷复杂度上升后引入依赖图章节），建议在 tech-lead 侧记录为分卷惯例的最新演进，供后续 sprint 分卷参照统一编号起点。

---

## 三态判定

| 等级 | 数量 | 问题编号 |
|------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 1 | R-001 |
| MEDIUM | 4 | R-002, R-003, R-004, R-005 |
| LOW | 2 | R-006, R-007 |

存在 1 项 HIGH（R-001：视觉一致性审查 AC 判定路径不可执行），按 COMMON-RULES §三态判定逻辑：

**verdict: needs_revision**

修订范围建议聚焦 R-001（HIGH，必须）+ R-002/R-003/R-004/R-005（MEDIUM，建议一并处理以减少重复修订轮次）；R-006/R-007（LOW）可选处理。
