---
id: "code-review-t-178-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-178"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-178-r1: strip-width-height-inline 规则移除

## 审查范围

- `packages/ruleset/src/rules/builtin/strip-width-height-inline.ts`（删除）+ 同名 fixture 目录（`input.html` / `expected.html` / `metadata.json`，删除）
- `packages/ruleset/src/rules/builtin/index.ts`（删 import + 注册项）
- `packages/ruleset/src/rules/registry.test.ts`（45→44、authoring 8→7 计数更新）
- `packages/ruleset/src/rules/stage-domain.test.ts`（删已失效的规则存在探针）
- `tests/ruleset/builtin-fixtures.test.ts`（42→41 计数）
- `tests/ruleset/readability-rules.test.ts`（≥45→≥44 计数）
- `tests/ruleset/strip-rules-extended.test.ts`（删规则 id + 专属 describe 块）
- `tests/ruleset/t178-strip-width-height-removed.test.ts`（新 AC-001 回归测试）

Layer 1（biome）对上述改动文件复跑：clean，无 finding。四门禁（typecheck / vitest / biome / cross-runtime）已由主线程独立复跑全绿，本报告聚焦静态审查，未重复跑全仓门禁；已复核该任务改动范围内的 267 个相关测试单独重跑通过（registry / stage-domain / readability-rules / t178 回归 / strip-rules-extended / builtin-fixtures）。

## 审查发现

未发现问题。

### 逐项核实记录

1. **移除完整性（consistency）**：全仓 grep `strip-width-height-inline` / `stripWidthHeightInline` 仅命中 `tests/ruleset/t178-strip-width-height-removed.test.ts`（新回归测试，含一条断言注册表不再含该 id）与 `docs/.doc-index.json`（对 frozen dev-plan 卡片标题的机器索引镜像，非活跃引用）。`builtin/index.ts` 的 import 与数组项同步删除，无残留死 import。

2. **计数基线正确性（consistency）**：`loadBuiltinRuleIds()`（`tests/ruleset/builtin-fixtures.test.ts`）通过 `readdir` 扫描 `packages/ruleset/src/rules/builtin/` 目录发现规则文件，非硬编码清单——文件删除后计数天然对齐，不存在人工数错风险。`registry.test.ts` 的 45→44、authoring 8→7 与 output 保持 37 的算术自洽：被删规则 `stage: "authoring"`，故仅 authoring 桶减 1，output 桶（含 3 条 readability output 规则）不受影响。`priority: 85` 在其余规则（`strip-aria-hidden`/`strip-calc-expression`/`strip-data-attr`/`strip-negative-margin`）中非唯一值，移除不影响排序假设。

3. **AC-001 回归测试有效性（test-quality）**：`t178-strip-width-height-removed.test.ts` 全部走 `applyRuleset(hast, builtinRules, "authoring")`（与 `packages/core/src/render.ts` 实际调用一致）并断言序列化后 `toHtml` 输出中的具体样式声明（`width:50%`、`width:33.33%`、`width:200px;height:150px` 等），断言渲染后的可观测值而非源码字面存在，符合 COMMON-RULES §保真类 AC 断言渲染效果而非源码字面。覆盖 table-cell（gallery duo/triptych、compare ledger、dropcap 四种真实场景）与 img 固定尺寸两类 load-bearing 场景，并含 `clamp-image-max-width` 在 `output` 阶段仍正常生效的负向对照（`max-width:150%` → `100%`），以及"规则不再注册"的直接断言。四条独立测试文件本地重跑全部通过。

4. **无副作用（structure）**：SCOPE_ORDER / 优先级排序逻辑未被触碰，其余规则的 stage/scope/priority 声明保持不变；`stage-domain.test.ts` 仅删除了一条已失效的存在性探针（原断言"该规则 stage===authoring"，规则已不存在，探针本身会因 `findRule` 抛错而失败，删除是必要维护，非功能收窄）。

## Verdict

**approved**

无 CRITICAL / HIGH / MEDIUM / LOW 问题。移除范围完整、计数基线可由文件系统发现机制自证、AC-001 回归测试断言渲染后效果并覆盖四类真实 table-cell 场景 + img 固定尺寸 + clamp 负向对照，无遗留死引用或排序副作用。
