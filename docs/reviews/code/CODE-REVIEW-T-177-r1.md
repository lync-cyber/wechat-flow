---
id: "code-review-t-177-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-177"]
consumers: ["orchestrator", "unattended-building-loop"]
---

# CODE-REVIEW-T-177-r1

## 审查范围

- `packages/blocks/src/blocks/announcement.ts`（新增 `{id:"default",label:"标准公告"}` 首项）
- `packages/blocks/src/blocks/gallery.ts`（新增 `{id:"default",label:"标准图集"}` 首项）
- `packages/blocks/src/blocks/list.ts`（新增 `{id:"default",label:"标准列表"}` 首项）
- `tests/blocks/directive-default-variant.test.ts`（新增，18 测试）
- `packages/blocks/src/blocks/callout.ts`（核验：确认未改动，git status 与 `git diff` 均无差异）

`git diff` 复核：三处改动均为单行插入 `{ id: "default", label: "..." }`，无其他改动混入，diff 范围与任务卡声明完全一致。

## Layer 1

未配置 lint hook 匹配 `Edit|Write` + `lint_format.py`（`.claude/settings.json` 未见该条目），按 Step 1 前置判断执行独立 Layer 1：

- `pnpm biome check` 对四个改动/新增文件独立核验：`Checked 4 files in 8ms. No fixes applied.` — 绿
- `tsc -p tests/tsconfig.json --noEmit`：无输出，绿
- 全仓 `pnpm vitest run` 独立复跑：**273 files passed | 2 skipped (275)**、**3652 tests passed | 10 skipped (3662)**，与任务卡声明的门禁结果完全一致（已独立复现，非仅采信 implementer 自报）
- 目标/关联测试单独复跑（`tests/blocks/directive-default-variant.test.ts` + 两处 pinned callout 测试 + `variant.test.ts` + `transform-directive-validation.test.ts`）：5 files / 136 tests 全绿

Layer 1 判定：exit 0，进入 Layer 2。

## Layer 2 — 重点独立核验：callout 排除是否正确

**结论：callout 排除正确，不构成 AC-001 缺陷。**

核验依据：

1. `ui-spec#§10.1` 原文明确写出 callout 变体清单**收敛映射表**："`default` → `info`（默认提示语义等价于信息类提示）"，并将 callout 权威变体清单收敛为**恰好 4 个** `tip`/`warning`/`info`/`danger`。这不是"漏定义 default"，而是 ui-spec 显式裁定 `default` 不作为 callout 的独立注册变体、其语义被并入 `info`。
2. `tests/core/blocks/callout-variants.test.ts` 与 `tests/blocks/p1-incremental.test.ts` 均以 `variants.length === 4` + 精确 id 集合 `{tip,warning,info,danger}` pin 死该设计（已独立复跑确认绿，非仅采信 implementer 自报）。若给 callout 加 `default`，两处 pinned 断言必然失败。
3. `packages/core/src/registry/variant.ts` 的 `getBlockBaseStyle` 对 `variantId === "default"` 有特判逻辑（`return blockDef?.baseStyle?.root ?? {}`），该特判早于本任务已存在，与是否在 `variants` 数组注册 `default` 无关——因此 callout 裸指令渲染本身不受影响（仍走 `blockDef.baseStyle.root`），唯一受影响的是 `directive-variant-invalid` 诊断（因为该诊断只查 `variants.map(v=>v.id)` 是否含 `default`）。
4. 任务卡列出的"四块"与 ui-spec §10.1 的显式收敛裁定矛盾。按 COMMON-RULES §通用 Error Handling「上游文档间存在矛盾 → 以上游权威文档为准（PRD→ARCH→DEV-PLAN）」，ui-spec 对变体清单是权威源，dev-plan/任务卡的"四块"表述是过时表述，应以 ui-spec 为准。implementer 的处理（排除 callout + 在测试注释与 EXCLUDED_FROM_DEFAULT_SCAN 集合中显式记录排除理由 + 保留 `:::callout` 裸指令仍产生 `directive-variant-invalid` 警告的强制选择变体行为）是正确且可追溯的处理方式。

因此 AC-001「四块」的字面偏差记为 **upstream-caused** 差异标注（见下方 R-001），不计入 CRITICAL/HIGH，不阻塞。

## 其他核验项

- **AC-002 announcement**：默认变体计算样式含 `border-left: 3px solid #b94a3e`、不含 `border-top`，与 ui-spec §10.8 "default = danger-bar 简化版（仅左边框+浅底）" 一致；测试断言直接对渲染后 HTML `style` 属性做字符串包含校验（渲染后可观测值，非源码字面），符合 COMMON-RULES §保真类 AC 断言渲染效果而非源码字面。
- **AC-002 gallery**：`decorate()` 函数未被本任务改动，`effectiveVariant` 计算逻辑（`GALLERY_COLUMNS_BY_VARIANT[authoredVariant] === 3 ? "triptych" : "duo"`）对 `authoredVariant === "default"` 天然落入 `"duo"` 分支；测试独立验证渲染后 HTML 中 `display: table-row` × 1、`display: table-cell` × 2 且含 `width: 50%`，为运行态结构证据而非源码断言。
- **AC-002 list**：`list.ts` 无块级 `baseStyle`（factory 未传该参数），测试相应地只校验"无假警告 + 正常渲染"，未强行断言一个并不存在的块级 baseStyle。任务卡描述"list 走块级 baseStyle §10.8 default"字面不准确（list 无块级 baseStyle，§10.8 专述 announcement），但实现与测试均未被这句不准确描述误导，按实际语义正确落地。记入 R-002（LOW，任务卡措辞问题，不影响实现正确性）。
- **AC-003**：`listAllVariants()` 含 `{blockId:"announcement"|"gallery"|"list", id:"default"}` 且不含 `{blockId:"callout", id:"default"}`；`describeBlock(...).variants` 三块均含 `id==="default"` 条目——均有独立测试覆盖并已复跑通过。
- **回归面扫描**：全仓搜索 `variants.length` 硬编码断言，除两处 pinned callout（`=== 4`，已确认按预期保持不变）外，其余全部为 `toBeGreaterThanOrEqual`，新增 `default` 条目不会使其失败；`tests/editor/directive-autocomplete.test.ts` 的 variant 计数角标测试固定用 `callout` 夹具，不受影响。未发现其他因新增 `default` 变体产生的隐性回归面。
- **`E_VARIANT_CONFLICT` 边界**：`registerVariant` 对 `id` 与内置 `variants` 数组做冲突检测；三块新增 `default` 后，若第三方插件尝试为 announcement/gallery/list 注册自定义 `id:"default"` 变体将被拒绝——这是合理且预期的收紧（避免语义歧义），未见现有测试或消费方依赖该注册路径。

未发现 CRITICAL / HIGH 级问题。

## 问题列表

### [R-001] LOW: AC-001「四块」表述与 ui-spec §10.1 权威裁定矛盾，callout 被正确排除
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: 任务卡 AC-001 要求 "announcement/callout/gallery/list" 四块裸指令零 `directive-variant-invalid`；但 ui-spec §10.1 已将 callout 变体清单显式收敛为恰好 4 个 `tip/warning/info/danger`（`default → info` 仅为迁移映射，非注册变体），并被两处 pinned 测试锁死。dev-plan/任务卡的"四块"表述未同步该收敛裁定。
- **建议**: implementer 的排除处理已正确且有据可查（测试注释 + `EXCLUDED_FROM_DEFAULT_SCAN` 显式声明），无需返工。建议后续 dev-plan 修订轮次同步更正该任务卡表述为"announcement/gallery/list 三块"，避免同类歧义在后续任务重复出现。

### [R-002] LOW: AC-002 任务卡表述"list 走块级 baseStyle"与实现不符（list 无块级 baseStyle）
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: 任务卡 AC-002 描述 "announcement/callout/list 走块级 baseStyle §10.8 default=仅左边框+浅底"，但 `list.ts` 未向 `defineBlock` 传入 `baseStyle` 参数，且 ui-spec §10.8 仅描述 announcement，未涉及 list/callout。测试文件未被此不准确表述误导，正确地只对 list 断言"无假警告 + 正常渲染"。
- **建议**: 无需代码改动；同 R-001 一并在下一轮 dev-plan 措辞修订中澄清。

## Verdict

**approved_with_notes**（仅 2 项 LOW，均为 root_cause=upstream-caused 的任务卡措辞问题，无 CRITICAL/HIGH，代码与测试均已独立复核通过）。

- 三处 diff 精确、最小、与任务卡范围完全吻合，`callout.ts` 确认未被触碰。
- 关键裁定（callout 排除）已独立核验：ui-spec §10.1 权威裁定 + 两处 pinned 测试 + `getBlockBaseStyle` 既有特判逻辑三方印证，implementer 的处理正确。
- 全仓测试 / typecheck / biome 均已独立复跑确认绿（非仅采信自报）。
