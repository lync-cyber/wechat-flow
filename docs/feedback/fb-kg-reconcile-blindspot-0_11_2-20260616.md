---
id: feedback-kg-reconcile-blindspot-0-11-2
doc_type: framework-feedback
status: approved
deps: []
---

# bug/suggest: 0.11.2 KG — reconcile 对悬空目标关系存在盲区 + override 不被 upgrade 保留

下游 wechat-flow 在 framework `0.11.1 → 0.11.2` 同步 + UC- 迁移善后中发现。前置背景：ui-spec 用 `C-NNN` 定义 UI 组件被 `Component → {arch}` definition-authority 判非权威（已由本项目 `C-→UC-` 重命名根治，对应上游 #253 / `fb-framework-update-0_11_1`）。本反馈是**那之后新发现的、与重命名修复无关的两个框架问题 + 一个已闭环确认**。

## [F-A] BUG — `kg reconcile` 不检测目标实体缺失的关系（悬空边盲区）

- **现象**：`C-→UC-` 实体重命名后，KG store 仍残留 **37 条 `X cf:depends_on C-NNN`** 边（C-001/005/013/015/017... 旧名），其目标实体已不存在（均已 UC- 化）。`cataforge kg reconcile` 报 **divergence=0**（完全漏判），而 `cataforge kg validate` 用 SHACL shape `cf:depends_on-target-exists` 全部抓到（37 violations）。
- **根因推断**：reconcile 的关系比对似乎只覆盖"两端实体都存在"的边，目标实体缺失的边不计入 ghost；而它正是重命名/删除实体后最该被标记为漂移的一类。
- **影响**：实体重命名/删除后，旧关系残渣可在 reconcile=0（绿）下长期潜伏，掩盖 KG 引用完整性破损；下游"reconcile=0 即健康"的判断失真。
- **建议**：reconcile 把"目标/主语实体缺失的关系"纳入 ghost 检测；或把 validate 的 `*-target-exists` SHACL 检查并入 `doctor` / Phase Transition 守门，使其与 reconcile 同级阻塞。

## [F-B] BUG — `context.kg_definition_authority` override 不被 upgrade 保留

- **现象**：`domain/kg/_dispatch.py::definition_authority` 文档化 `framework.json context.kg_definition_authority` 为项目扩展机制（additive、只增不减），但 `core/scaffold.py::_merge_framework_json` 的保留集只含 `version` / `runtime.platform` / `upgrade.state` / `context.kg_active_doc_types`，**遗漏 `context.kg_definition_authority`** → 下次 `upgrade apply` / `bootstrap` 整块覆盖 context 时丢失。
- **影响**：文档化的项目级 override 在框架升级后静默失效，自相矛盾。
- **建议**：`_merge_framework_json` 把 `context.kg_definition_authority`（理想为整个 context 块的用户键）纳入保留。

## [已闭环确认] 0.11.2 修好了 0.11.1 的 override-仅-import bug

0.11.1 下 `kg_definition_authority` 仅 import 生效，reconcile/repair 仍用默认 → 制造 ghost（下游 §项目状态 学习 ⑨ 记录）。**0.11.2 已将 `definition_authority(project_root)` 接入 reconcile 与 repair**（`domain/kg/reconcile.py` / `repair.py` 均调用），该问题已闭环。此处仅作上游确认，无需再修。
