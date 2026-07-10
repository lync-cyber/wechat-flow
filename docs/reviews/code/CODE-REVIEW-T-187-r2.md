---
id: "code-review-T-187-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-187"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-187-r2

任务: T-187 构造守卫（含 Mark）+ 全主题全组合扫描门禁
security_sensitive: true / complexity: large / tdd_mode: standard / tdd_acceptance: all

第 2 轮增量审查（`task_type=revision`），范围收窄为 r1 blocking 项（R-001）的修复验证 + 复扫整体变更有无新引入问题。Layer 1 门禁已由主线程坐实（`pnpm vitest run` 4451 passed/10 skipped、`pnpm typecheck` 50 tasks + tests/tsconfig 全绿、`pnpm biome check .` 868 files clean），渲染产物无变更、cross-runtime 免跑成立，本报告聚焦 Layer 2。

## r1 遗留问题闭合状态核查

### R-001（HIGH，blocking）—— **已闭合**

核查内容：
- `packages/core/src/registry/style-guard.ts` 新增 `validateThemeTokensForbidden(tokens: Record<string, string>)`（L82-107），对每个 token 值先查 `FORBIDDEN_DISPLAY_VALUES`（`flex`/`inline-flex`/`grid`/`inline-grid` 精确匹配），再查 `isForbiddenCssValue`（`-webkit-`/`@media`/`@keyframes`/`:hover`/`:active` 子串扫描，含 `FORBIDDEN_VALUE_PATTERN_EXCEPTIONS` 白名单）。命中即 push `{slot:"tokens", property:tokenName, value, reason}`。
- `packages/core/src/registry/theme.ts` L15-19：`registerTheme` 在 `definition.blocks` 校验**之前**先对 `definition.tokens` 调用该校验，rejected 数组合并后统一 `buildRejectionError` 抛出，结构与 R-001 建议一致。
- `tests/core/guard/construct-time-forbidden-guard.test.ts` L150-179 新增 3 条 AC-002 tokens 探针：
  - 正向：`{"--x-display": "flex"}` → 断言 `rejected` 含 `{slot:"tokens", property:"--x-display", value:"flex"}`（真实结构断言，非仅 `toThrow`）
  - 正向：`{"--shadow": "0 0 4px; -webkit-box-shadow: red"}` → 断言 `rejected.some(r => r.property === "--shadow")`
  - 负向：合法 token（含真实字体栈 `'LXGW WenKai', ...`）→ 断言 `not.toThrow()` 且主题可被 `listThemes()` 列出（非仅"不抛出"的弱断言，进一步验证注册副作用生效）

**property-name 类检查（`FORBIDDEN_CSS_PROPS`/`FORBIDDEN_POSITION_PROPS`）对 tokens 路径的取舍核实为合理**：token key（如 `--x-position`）是自定义属性标识符，不是真实 CSS 属性名，对其做 `FORBIDDEN_CSS_PROPS.has(tokenName)` 类检查语义上不成立。真正的风险面是 token *值* 经 `var(--token)` 占位符在 `inline-style.ts::resolveTokenPlaceholder`（L100-105）被替换进某个声明的值槽——但消费该 token 的声明本身（如 `color: var(--color-brand)`）已在 `registerBlock`/`registerTheme` 的 `validateForbiddenDeclarations` 里按**声明属性名**（`color`）过检，与 token 解析结果无关；若声明属性本身是 `position`/`float`/`font-family`/`top`/`right`/`bottom`/`left`/`z-index`，无论值是字面量还是 `var(--x)` 占位符，都已在属性名层面被拒绝（`evaluateDeclaration` 先检查 `FORBIDDEN_CSS_PROPS.has(property)` 与 `FORBIDDEN_POSITION_PROPS.has(property)`，判定与 value 无关）。故 token 值本身唯一需要防的是"可被任意安全属性消费后仍产生危险副作用"的值模式（`-webkit-`/`@media`/`:hover`/`:active` 注入片段、以及可能被 `display: var(--x)` 消费的 `flex`/`grid` 类值），这正是当前实现覆盖的范围。走查 `packages/blocks/src/blocks/{gallery,announcement,steps,paragraph,pull-quote,quote,compare,dialog,callout}.ts` 中 `var(--` 用法，均是安全属性（color/background/border 等）消费 token，无一处以 `position`/`float`/`font-family` 等禁用属性名接 `var()`——即便存在，也已被声明层拦截，与本次 tokens 值检查形成互补而非依赖关系。

结论：R-001 修复真实落地，非表面绕过；测试断言的是结构化 `rejectedDeclarations` 内容与注册副作用（可被列出），不是仅 `toThrow()` 弱断言。判定 **CLOSED**。

### R-002（LOW，非阻塞）—— 维持 r1 判定，本轮不重新纠结
r1 已判定 AC-001"复用 validateStyle"字面要求与实际"新建黑名单校验器"分歧为合理设计分工（reviewer-calibration），任务指示本轮不应重新纠结字面偏离。核实无回归。

### R-003（LOW）—— **已闭合**
`docs/EVENT-LOG.jsonl` 第 793 行新增：
```
{"ts": "2026-07-10T02:52:44+00:00", "event": "tdd_phase", "phase": "development", "detail": "TDD REFACTOR: T-187 消 style-guard duplication（validateThemeBlocksForbidden 按 tag.variant 复用 validateForbiddenDeclarations，去内联重复遍历）", "agent": "orchestrator", "ref": "dev-plan#T-187"}
```
`tdd_refactor: required` 的审计留痕已补齐，与代码中 `validateThemeBlocksForbidden` 复用 `validateForbiddenDeclarations`（而非平行实现）的去重迹象一致。判定 **CLOSED**。

### R-004（LOW）—— **已闭合**
`tests/core/guard/construct-time-forbidden-guard.test.ts` L305-320 新增 `parseMarkStyleDeclarations 边界解析` describe 块，3 条测试覆盖空字符串、含空片段声明表、无冒号片段三种边界，断言解析结果的完整对象结构（非仅调用不抛异常）。判定 **CLOSED**。

## 本轮复扫：整体变更有无新引入问题

- **新引入 security 问题**：无。`validateThemeTokensForbidden` 是纯函数，无副作用；对 `Object.entries(tokens)` 遍历不涉及原型污染风险（`tokens` 类型收窄为 `Record<string,string>`，非用户可控 key 枚举路径）。
- **test-quality**：新增 6 条测试（3 条 tokens 正负向 + 3 条 `parseMarkStyleDeclarations` 边界）均含真实断言（`toContainEqual(expect.objectContaining(...))` / 结构化对象相等），无弱断言（未见仅断言 mock 调用次数或常量真值的模式）。
- **回归面**：`theme.ts` 改动仅新增前置校验分支，未改变既有 `blocks` 校验顺序结构（tokens 校验在前、blocks 校验在后，两者独立累积到同一 `rejectedDeclarations` 数组再统一抛出，行为对已有仅含 blocks 违规的调用方无影响）。AC-006（全部内置资产零拒绝）与 AC-007（负向探针有效性）两组既有测试未改动且覆盖 tokens 路径新增校验后仍需保持通过（5 个内置主题 tokens 均为合法值，已由 Layer 1 门禁坐实全绿）。
- **collateral 变更**（`tests/core/frontmatter.test.ts` / `tests/core/guard/cross-theme-identity-token-collision.test.ts` 移除 fixture 中的 `font-family` 声明）与 r1 复核结果一致，属守卫上线后必要调整，非本轮新增改动，未见新回归。
- 未发现新增 CRITICAL/HIGH/MEDIUM 级问题。

## Verdict

**approved**

r1 唯一 blocking 项 R-001（HIGH）已真实闭合：`registerTheme` 新增 `definition.tokens` 的构造期 FORBIDDEN 值校验，覆盖 AC-002 完整语义；property-name 类检查对 token key 的跳过经代码路径核实为合理设计（风险已由声明层拦截覆盖，token 值层专注注入模式与 display 值），非缺陷遗漏。r1 其余 3 条 LOW（R-002 reviewer-calibration 判定维持不变、R-003 EVENT-LOG 补记、R-004 边界测试补齐）均已闭合或维持既有合理判定。本轮复扫未发现新引入问题。全仓门禁（vitest/typecheck/biome）已由主线程坐实全绿，渲染产物无变更 cross-runtime 免跑成立。

无 CRITICAL/HIGH/MEDIUM/LOW 待办，判定 approved（非 approved_with_notes）。
