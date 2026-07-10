---
id: "code-review-t-186-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-186"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-186-r1

审查对象：T-186（删模拟器 + 全消费方/MCP/文档同步 + 版本化），工作树未提交改动（feature/unattended-s7）。

## Layer 1
四门禁已由主线程坐实全绿（vitest 4436/0、typecheck 全绿、biome 862 文件干净、cross-runtime golden SHA 未变）。本报告聚焦 Layer 2 语义审查。

## AC 逐条核实

- **AC-001**（删模拟器 + 破坏性导出删除）: PASS。`packages/core/src/{simulate-paste.ts,simulator/{strip-attrs,strip-tags,rewrite-structure}.ts,diff/per-node-diff.ts}` 已删除；`index.ts` 不再导出 `simulatePaste`/`SimulatePasteResult`/`NodeDiff`/`DroppedAttr`；`render.ts` 的 `postPaste: false` 字段已移除；全仓 grep 确认无 `.ts` 源码残留对上述符号的悬挂引用（仅历史文档/dev-plan/KG 快照保留字面提及，属正常历史记录，非死代码）。
- **AC-002**（复制三路改指向 render 产物）: PASS。`apps/editor/src/use-cases/copy.ts`、`apps/cli/src/commands/copy.ts`、`apps/mcp-server/src/tools/export-clipboard-payload.ts` 三处均已改为直接消费 `render()`/`renderMarkdown()` 产物的 `html`，不再经 `simulatePaste` 过滤；三路调用均未传 `injectNodeIds`，缺省行为不变。
- **AC-003**（simulate_paste 改用 wechatAdapter.inspect + schema 结构化）: PASS，且 schema↔运行时形状核实一致。`apps/mcp-server/src/tools/simulate-paste.ts` 改为 `wechatAdapter.inspect(html)`，返回 `{patchedHtml, changes, filteredHtml: patchedHtml}`；`simulatePasteResponseSchema`（`patchedHtml: string, changes: PatchChange[], filteredHtml: string`）与 `packages/contracts/src/platform/patch-log.ts` 的 `PatchChange`/`PatchLog` interface（`patch/label?/count/samples:{selector?/before}`）逐字段比对完全一致，非臆造 schema。`exportClipboardPayloadResponseSchema`（`{html, text}`）与 `exportClipboardPayloadTool` 实际返回值一致。MCP 工具 key 仍为 `simulate_paste`（`ALL_TOOL_SCHEMAS` 未改名）。
- **AC-004**（render_markdown report 字段 + 24 工具 description）: PASS，但见 R-002（测试覆盖缺口）。`render-markdown.ts` 已移除 `postPaste`，改带 `report:{nodeChangeRecords, nightRiskIssues}`，字段值取自 `r.report`（`render.ts` 中恒为已填充的数组，非可选）；`router.ts` `registerTool` 已传入 `description: TOOL_DESCRIPTIONS[name]`；手动核对 `TOOL_DESCRIPTIONS` 覆盖 `ALL_TOOL_SCHEMAS` 全 24 键，均为非空中文描述字符串，`Record<keyof typeof ALL_TOOL_SCHEMAS, string>` 类型标注保证编译期键完整性。
- **AC-005**（metrics 重定 + realworld-verify 迁移）: PASS。`paste_simulation_diff_ratio`/`observePasteSimulationDiffRatio` → `fallback_platform_patch_hits`/`observeFallbackPlatformPatchHits`，直方图 buckets 从比值区间（0.01-1）改为计数区间（0-50），与新语义（命中次数而非比值）匹配；`scripts/realworld-verify.ts` 已去 `simulatePaste` 依赖，改用 `render()` + `wechatAdapter.inspect`，比对页面模板变量同步更新（`droppedAttrs`→`changes`）。
- **AC-006**（SKILL.md/tool-catalog.md/版本/CHANGELOG/破裂测试面）: PASS。`skill/SKILL.md` 与 `skill/references/tool-catalog.md` 的 `simulate_paste` 语义描述已从「模拟粘贴过滤，发布前最后关卡」改写为「诊断平台输出规则命中的可选步骤」，措辞与 AC-003 的新响应形状一致；`packages/core`/`apps/mcp-server`/`skill` 三个 package.json 均已 `0.0.0`→`0.1.0`；CHANGELOG `[Unreleased]` 段逐项列出 Changed/Removed，含 breaking API 标注；dev-plan AC-006 枚举的破裂测试面文件（`tests/core/simulate-paste.test.ts` 删除、`sanitize.test.ts` postPaste 块删除、`{simulate-paste,render-markdown,export-clipboard-payload}.test.ts`、`transport-http.test.ts`、`metrics.test.ts`、`compose-copy{,-integration}.test.ts`、`copy.test.ts`、`EditorShell{CopyWiring,AutoBackupWiring}.test.ts`、`PreviewPage.test.ts`、`{tool-contracts,tool-count}.test.ts`、`tests/skill/orchestration.test.ts`）经比对全部已更新，未见遗漏。

## 问题列表

### [R-001] MEDIUM: `renderMarkdownResponseSchema.report` 标记为 optional，弱于运行时实际契约与既有严格性先例
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `packages/contracts/src/mcp/tool-contracts.ts` 中新 `report` 字段用 `.optional()`，但 `render.ts`/`render-markdown.ts` 的实际运行路径恒返回已填充的 `report:{nodeChangeRecords, nightRiskIssues}` 对象，从未省略。本次删除的 `tests/core/sanitize.test.ts` 中恰有一组专门测试「`postPaste` 缺失时 schema 解析必须失败（字段为必填，禁止静默缺省）」——这是 `report` 的前身字段、且明确以「禁止静默缺省」为设计原则；`report` 作为直接替代字段并未延续同等严格性，也未见任何调用方需要省略 `report` 的理由。当前 schema 允许一个运行时永远不会出现的「无 report」响应静默通过校验，弱化了契约测试对未来回归（如某条 MCP 路径漏填 report）的捕获能力。
- **建议**: 将 `report` 改为必填（去掉 `.optional()`），并补一条等价于旧 postPaste 严格性测试的用例（`report` 缺失时 `safeParse` 应失败）；`tests/contracts/tool-contracts.test.ts` 的 AC-003b 系列（关于 `versionTriple` 可选性）与 `report` 必填性彼此独立，不冲突。

### [R-002] MEDIUM: AC-004「全 24 工具非空 description」缺自动化测试覆盖，仅靠人工核对与 TS 键完整性把关
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `TOOL_DESCRIPTIONS: Record<keyof typeof ALL_TOOL_SCHEMAS, string>` 的类型标注只能在编译期保证「24 个键都存在」，不能保证「值非空字符串」（TS 允许 `""` 满足 `string` 类型）；`router.ts` 中 `registerTool` 是否真的收到非空 `description` 参数也未见任何断言。全仓搜索 `tests/mcp-server` 与 `tests/contracts` 未发现针对 `TOOL_DESCRIPTIONS` 完整性/非空性或 `registerTool` 调用参数的测试。当前实现人工核对确实全部非空且语义贴切，但 AC-004 的可验证性完全依赖人工审查，未来若有人误删或留空某个键的 description 值，全部四门禁与既有测试都不会发现。
- **描述补充**: 该缺口与 tdd_mode: standard / tdd_acceptance: all 的任务卡定级不完全匹配——AC 覆盖应有对应可执行断言。
- **建议**: 补充一条轻量单测：遍历 `Object.keys(ALL_TOOL_SCHEMAS)`，断言 `TOOL_DESCRIPTIONS[key]` 存在且 `.trim().length > 0`；可选再加一条 router 级测试（mock `McpServer.registerTool`，断言收到的 `description` 非空）。

### [R-003] LOW: `simulate_paste` 的 description 措辞把工具能力窄化为「渲染产物」场景，与 SKILL.md/tool-catalog.md 的「任意 HTML」通用定位不完全一致
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `TOOL_DESCRIPTIONS.simulate_paste` 写作「检查渲染产物中会被微信平台输出规则命中的部分」，但 `skill/SKILL.md` §5 明确该工具「检查任意一段 HTML 中会被微信平台输出规则命中改写的部分，用于排查自定义 CSS 或外部 HTML 的兼容性」——工具实际输入不限于 render 产物。MCP description 是客户端（含非本 skill 的通用 MCP client）理解工具用途的第一入口，窄化措辞可能误导调用方以为该工具仅适用于 render_markdown 输出。
- **建议**: 措辞对齐 SKILL.md，如「检查一段 HTML 中会被微信平台输出规则命中改写的部分」，去掉「渲染产物」限定。

## Verdict

**approved_with_notes** — 0 CRITICAL / 0 HIGH / 2 MEDIUM / 1 LOW。AC-001~AC-006 逐条核实通过，schema↔运行时形状（本轮审查重点）经比对 `PatchChange`/`PatchLog` interface 逐字段一致，无 correctness 缺陷；死引用全仓 grep 排查干净；设计残留自检（回溯叙事/溯源引用/版本里程碑正则）未命中。MEDIUM 问题均为可延后的契约严谨性/测试覆盖补强，不阻塞本任务收口。

## 后续处理（本卡收口同批闭合）

三条 notes 在同一提交内闭合，四门禁复跑全绿：

- **R-001（已闭合）**: `renderMarkdownResponseSchema.report` 去 `.optional()` 改必填；新增 `tests/contracts/tool-contracts.test.ts` 用例断言 `report` 缺失时 `safeParse` 失败（恢复旧 postPaste「禁止静默缺省」严格性先例）；连带补齐 `tool-contracts.test.ts`/`tool-count.test.ts` 中缺 `report` 的合法夹具。
- **R-002（已闭合）**: 新增 `tests/contracts/tool-contracts.test.ts` 用例遍历 `ALL_TOOL_SCHEMAS` 断言 `TOOL_DESCRIPTIONS[key]` 存在且 `.trim().length > 0`，并断言两者键集合完全一致（无缺漏、无冗余）。
- **R-003（已闭合）**: `TOOL_DESCRIPTIONS.simulate_paste` 措辞由「检查渲染产物中……」改为「检查一段 HTML 中会被微信平台输出规则命中改写的部分」，与 SKILL.md 通用定位对齐。
