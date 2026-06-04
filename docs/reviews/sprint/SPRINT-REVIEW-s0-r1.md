---
id: "sprint-review-s0-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s0", "T-001", "T-002", "T-003", "T-004", "T-095", "T-107"]
---
# Sprint 0 审查报告

**Sprint**: Sprint 0 — 基础设施 + 设计系统
**Sprint 目标**: Monorepo 骨架可跑 CI；Penpot Design System Token 导入并验证可读性；所有后续 Sprint 的工程基础就绪。
**审查档位**: standard + merged-review（Sprint 0 无预先 per-task CODE-REVIEW；本报告承担全部 per-task Layer 2 职责）
**任务数**: 6（T-001/T-002/T-003/T-004/T-095/T-107）

---

## 1. 计划 vs 实际对比

| 任务 | 计划描述 | 状态 | AC 完成度 | 备注 |
|------|---------|------|----------|------|
| T-001 | Monorepo 骨架初始化 | done | AC-001..005 全绿（CI 实测） | pnpm + Turborepo 骨架就绪 |
| T-002 | TypeScript + Biome + Vitest 配置 | done | AC-001..003 全绿 | typecheck 29/29 exit0；biome 60 files exit0 |
| T-003 | Turborepo 任务图配置 | done | AC-001..002 全绿 | 完整 pipeline 就绪 |
| T-004 | contracts schema 契约层骨架 | done | AC-001..006 全绿 | vitest 15/15 PASS；2 条 deferred LOW 在案 |
| T-095 | [DESIGN] Penpot Token 导入 | done（user sign-off） | AC-001..005 全绿（带 4 处已记录偏差） | EVENT-LOG 记录完整 |
| T-107 | [VALIDATION] Sprint 0 验证 | done（用户手动确认） | 全绿 | CI 绿；用户确认 |

**偏移率**: 延期 AC = 0；计划外 AC = 0；规划 AC 总数约 16（T-001×5 + T-002×3 + T-003×2 + T-004×6）。偏移率 = 0/16 = **0%**，无需标记。

---

## 2. AC 覆盖验证

### T-001 (chore/skip-tdd)
无测试覆盖要求（tdd_mode=skip）。AC-001..005 为手动/CI 验证（目录结构、pnpm workspace、Turborepo 任务图、包名、循环依赖）。已通过 `turbo typecheck` 29/29 实测确认。

### T-002 (config/skip-tdd)
无测试覆盖要求。AC-001..003 均为 CLI 运行验证。实测全绿。

### T-003 (config/skip-tdd)
无测试覆盖要求。AC-001..002 均为 CLI 运行验证。实测全绿。

### T-004 (feature/tdd-light) — AC 测试映射

| AC | 测试文件 | 测试用例 | 是否有效断言 |
|----|---------|---------|------------|
| AC-001 | tool-contracts.test.ts | "inferred type…" + "requires markdown field" | 有效 — 真实 safeParse 返回值断言 |
| AC-002 | tool-contracts.test.ts | "returns object with type:object" + "contains properties.markdown…" | 有效 — 真实 toJSON 返回结构断言 |
| AC-003 | tool-contracts.test.ts | "parses valid response" | 有效 — safeParse 返回 success===true |
| AC-004 | tool-contracts.test.ts | "fails when html is not a string" | 有效 — success===false + path 含 'html' |
| AC-005 | tool-contracts.test.ts | "ClipboardPayload…" + "DiagnosticReport…" + "TemplateDefinition…" | 有效 — 字段值断言（非纯类型检查） |
| AC-006 | tool-count.test.ts | 5 个用例 | 有效 — Object.keys 数量 + 常量值断言 |

无全 mock 替换被测包顶层导出问题；所有断言均绑定真实可观测属性。

### T-095 (design/skip)
无代码测试。AC-001..005 由用户视觉 sign-off + EVENT-LOG 记录。

### T-107 (validation/skip)
用户手动验证确认。无代码测试。

---

## 3. 范围偏移检测

### Gold-plating（计划外额外产物）
- `packages/contracts/src/clipboard/clipboard-payload.ts` — AC-005 要求 `ClipboardPayload` 类型从 `@wechat-flow/contracts` 单一导出，但 T-004 deliverables 列表未显式列出 `clipboard/clipboard-payload.ts` 文件。该文件实现了 `ClipboardPayload` 类型，符合 ARCH§4.E-011 精神，与 AC-005 测试对应，属于 AC 覆盖所需的正当产物。**结论：不属于 gold-plating，为 AC-005 隐含交付物。**
- 其余 src 文件均与 deliverables 一一对应。
- `tests/contracts/` 目录及两个测试文件与 T-004 tdd_acceptance 一致，不属于 gold-plating。

### 缺失交付物
T-004 deliverable `packages/contracts/src/diagnostic/diagnostic-report.ts` 与 arch§2.M-003 对应，实际文件存在并导出 `DiagnosticReport`，但其子 schema (`diagnosticSchema`、`nodeChangeRecordSchema`、`nightRiskIssueSchema`) 均为 `z.object({}).passthrough()` 占位，**已知偏差，在案 deferred LOW(1)**。

T-095 deliverable "Penpot 项目：Design System 页面" 为外部系统产物，无法从代码库校验；EVENT-LOG `user_decision` 事件已记录 AC-001..005 sign-off，视为有效交付证据。

---

## 4. per-task Layer 2 代码维度审查

本节承担 merged-review 模式下的 per-task Layer 2 职责。
**Layer 1 状态**: `turbo typecheck` 29/29 exit0；`biome check .` 60 files exit0 → Layer 1 通过。

### T-001 / T-002 / T-003（chore/config — 命中 CODE_REVIEW_L2_SKIP_TASK_KINDS）

满足短路条件 `task_kind ∈ [chore, config]` 且 Layer 1 exit 0。执行结构合规性确认：

**T-001 — Monorepo 结构**
- `pnpm-workspace.yaml`: 正确声明 `apps/*` + `packages/*`，符合 arch§7.2 目录结构
- `package.json`: root level 包含 `turbo`、`@biomejs/biome`、`typescript`、`vitest` devDependencies；`packageManager: pnpm@9.15.9` 与 pnpm 9.x 约定一致
- 所有 apps/ + packages/ 子目录均存在，结构符合 arch§7.2

**T-002 — 配置文件**
- `tsconfig.base.json`: `strict: true`、`target: ESNext`、`moduleResolution: bundler`，完全符合 T-002 AC-001 和 arch§7.3 约定；`allowImportingTsExtensions: true` + `noEmit: true` 组合与 bundler 模式一致
- `biome.json`: `recommended: true`，`indentStyle: space`，`quoteStyle: double`，符合项目代码风格；`noNonNullAssertion: "warn"` 合理降级
- `vitest.config.ts`: `include` 覆盖 `packages/*/src/**/*.test.ts` + `apps/*/src/**/*.test.ts` + `tests/**/*.test.ts`，正确纳入 `tests/contracts/` 目录

**T-003 — Turborepo**
- 完整 pipeline 8 个任务（build/lint/typecheck/test/unit-test/ruleset-fixture/cross-runtime/theme-guard/visual-regression），顺序与 arch§7.4 约定一致
- `build` 无 `outputs` files 输出（`"outputs": ["dist/**"]`）但 contracts 的 `build` 脚本为 `echo skip`，故 turbo WARNING 属预期，不影响正确性

**结论：T-001/T-002/T-003 Layer 2 短路通过。**

---

### T-004（feature — 全维度审查）

#### 4.1 命名规范 (convention)

- 文件名均为 kebab-case（`tool-contracts.ts`、`to-json.ts`、`extend-schema.ts`、`diagnostic-report.ts`、`triple-structure.ts`、`template-definition.ts`、`clipboard-payload.ts`），符合 arch§7.1
- 导出常量 `SYNC_TOOL_COUNT`/`ASYNC_TOOL_COUNT`/`TOTAL_TOOL_COUNT` 为 UPPER_SNAKE_CASE，符合约定
- 导出类型 `DiagnosticReport`/`TemplateDefinition`/`ClipboardPayload`/`VersionTriple`/`SanitizeSchema` 为 PascalCase，符合约定
- `ALL_TOOL_SCHEMAS` 为 UPPER_SNAKE_CASE 常量，符合约定

**无 convention 问题。**

#### 4.2 代码结构 (structure)

- 目录按语义正确分层：`mcp/`、`utils/`、`sanitize/`、`diagnostic/`、`version/`、`theme/`、`clipboard/`
- `src/index.ts` 作为单一导出入口（`export * from ...`），符合 M-012 单一事实来源设计
- `ALL_TOOL_SCHEMAS` 注册表集中在 `tool-contracts.ts`，与 AC-006 count test 配套，结构清晰

**轻微结构观察**（不构成问题）：`to-json.ts` 导出 `type JSONSchema7`（别名自 zod 内部类型 `ZodStandardJSONSchemaPayload`），注释提示目标格式为 Draft-7，而实际 zod4 `toJSONSchema()` 产出符合 JSON Schema 2019-09 超集，与 AC-002 测试期望（仅验证 `type: "object"` + `properties.markdown.type: "string"`）在功能上兼容，不影响正确性，将作为 LOW 记录。

#### 4.3 安全漏洞 (security)

contracts 包为纯 schema 定义层，无 I/O、无鉴权、无外部依赖（仅 zod）。无安全风险。

#### 4.4 接口一致性 (consistency)

**关键发现**：

1. `renderMarkdownResponseSchema` 中 `diagnostics` 字段类型为 `z.array(z.object({}).passthrough())`（占位），而 arch§3（API-001 response）定义为 `Diagnostic[]`，`Diagnostic` 类型为 `{severity: 'red'|'yellow'|'green', ruleId?: string, nodeRef?: {line, column}, message: string}`。占位 passthrough 与契约有差距，属于已知 deferred 范畴，已在 EVENT-LOG 在案。

2. `extendSanitizeSchema` 签名与 T-004 deliverable 规格有偏差：
   - 规格声明（dev-plan T-004 deliverables）：`extendSanitizeSchema(tagSet: string[], attrMap: Record<string, string[]>): void`
   - 实际实现：`extendSanitizeSchema(tagSet: ReadonlySet<string>, attrMap: ReadonlyMap<string, readonly string[]>): SanitizeSchema`
   - 参数类型从 `string[]`/`Record` 变为 `ReadonlySet`/`ReadonlyMap`，返回值从 `void` 变为 `SanitizeSchema`
   - 从防御性设计角度，实现签名更严格（不可变参数 + 显式返回值）且无副作用，优于 spec；但与 deliverable 声明不一致，需记录

3. `renderMarkdownResponseSchema` 包含 `rulesetVersion` 和 `themeVersion` 两个独立字段，而 arch§3（API-001 response）定义为 `versionTriple: {coreVersion, themeVersion, rulesetVersion}` 整体字段。骨架阶段偏差，属于 deferred，已在案。

#### 4.5 错误处理 (error-handling)

contracts 包为纯 schema 定义层，无 runtime 错误处理逻辑。`z.object({}).passthrough()` 占位 schema 在 safeParse 失败时行为合理（passthrough 接受任意对象）。无 error-handling 问题。

#### 4.6 测试质量 (test-quality)

**tool-contracts.test.ts:**
- AC-001：3 个用例，覆盖有效输入、全可选字段、缺失必填字段，边界覆盖完整
- AC-002：2 个用例，验证 JSON Schema 顶层结构 + 嵌套属性类型，断言有效
- AC-003：1 个用例，完整的 valid 输入验证，有效
- AC-004：1 个用例，`html:123` 非法输入，验证 `success===false` 且 error path 含 `'html'`；断言强度：path 断言使用 `paths.includes('html')` 而非精确下标，合理
- AC-005：3 个用例，直接构造类型对象并断言字段值，有效的编译期+运行期双重验证

**tool-count.test.ts:**
- 5 个用例分别验证注册表 key 数量、SYNC_TOOL_COUNT、ASYNC_TOOL_COUNT、TOTAL_TOOL_COUNT 及与注册表一致性，AC-006 边界覆盖完整

**发现**：AC-006 测试仅验证 `ALL_TOOL_SCHEMAS` 中 request schema 数量（23），而 arch§3.1 中每个 Tool 同时定义了 request + response schema。测试通过对数量的硬编码（`expect(count).toBe(23)`）验证 request schema 数量，但未验证每个 Tool 的 response schema 也存在于包导出中。这是测试设计上的覆盖空白，属 LOW 级。

---

### T-095（design — 无 code 维度）

AC 完成度审查：
- AC-001（11 个变量组）：EVENT-LOG 记录 "14组/83token"，超出规格数量（11 组），属于正向超额，无问题
- AC-002（`--color-surface` MCP 可检索）：sign-off 记录 "AC-002 --color-surface 可检索: OK"
- AC-003（LXGW WenKai 可读性）：用户目视确认，sign-off 记录 "各档可读 OK"
- AC-004（brand/surface 对比度 ≥4.5:1）：实测 7.38:1，超过 WCAG AA 要求
- AC-005（EVENT-LOG 记录）：条目存在，`event=user_decision, ref=dev-plan-wechat-flow-s0#§3.T-095`（注：sign-off 以 `user_decision` 承载，EVENT-LOG 枚举无 `design_signoff` 值，合理降级）

4 处已记录偏差均在 EVENT-LOG 在案，属于有意识的设计意图决策，非 AC 失败。

---

### T-107（validation — 无 code 维度）

用户手动验证 CI 全绿。`turbo typecheck`（29/29 exit0）、`biome check .`（60 files exit0）、`vitest run`（15/15 PASS）均实测通过。`pnpm vitest run` 输出 "no test files found" 的 AC 描述与实际（15 tests PASS）有出入，但这属于 AC 草稿时状态描述过时（Sprint 0 初始无测试，T-004 交付后有 15 个测试），不是 AC 失败。

---

## 5. 已知 deferred 项确认

| 编号 | 描述 | 在案状态 | 本次确认 |
|------|------|---------|---------|
| deferred-1 | `tool-contracts.ts` 中大量 `z.object({}).passthrough()` 占位（含 22 个 Tool 的 request schema 和 1 个 response schema 中的 diagnostics 字段）— zod4 中已 deprecated，计划 S4 迁移 `z.looseObject` | EVENT-LOG 在案 | 有效，计划 S4 |
| deferred-2 | `tests/` 与根 `tsconfig.json` 未被任何 tsconfig `include` 覆盖 — IDE typecheck gap | EVENT-LOG 在案 | 有效，计划 T-062/T-063 |

---

## 6. 问题列表

### [SR-001] LOW: extendSanitizeSchema 实现签名与 deliverable 规格不一致
- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-004 deliverable 规格声明签名为 `extendSanitizeSchema(tagSet: string[], attrMap: Record<string, string[]>): void`，实际实现为 `(tagSet: ReadonlySet<string>, attrMap: ReadonlyMap<string, readonly string[]>): SanitizeSchema`。参数类型从 Array/Record 改为 ReadonlySet/ReadonlyMap，返回类型从 `void` 改为 `SanitizeSchema`。下游消费方（M-002/M-005）需按实际签名调用；若在后续 Sprint 有其他开发者参照 deliverable 规格而非实际代码调用，将产生类型错误。
- **建议**: 在 dev-plan T-004 deliverables 描述或对应 arch§2.M-012 D2 决策中更新实际签名。签名更严格的实现是正确选择，无需改代码，更新文档对齐即可。

### [SR-002] LOW: AC-006 测试仅对 request schema 数量计数，response schema 存在性未验证
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tool-count.test.ts` 验证 `ALL_TOOL_SCHEMAS` 注册表（仅含 request schema）条目数 = 23，但未验证对应的 23 个 response schema 也被导出。目前 `renderMarkdownResponseSchema` 等少量 response schema 有具体实现，其余为 passthrough 占位，但均已导出。风险：若后续某个 response schema 意外从 index.ts 移除，无测试能感知。
- **建议**: 在 `tool-count.test.ts` 或新增 `tool-count.test.ts` 中补充 response schema 导出验证，或在 `ALL_TOOL_SCHEMAS` 设计中考虑同时包含 req/res 对。优先级低，可在后续 Sprint 完善。

### [SR-003] LOW: toJSON 导出的类型别名 JSONSchema7 实际产出格式与命名暗示不完全吻合
- **category**: convention
- **root_cause**: self-caused
- **描述**: `to-json.ts` 导出 `type JSONSchema7`（别名 `ZodStandardJSONSchemaPayload`），但 zod4 实际产出的 JSON Schema 格式符合 2019-09 超集，而非严格 Draft-7。类型名称可能导致下游误认为产出格式为 Draft-7 并依此构建校验器。AC-002 测试仅验证了 `type:object` 等基础属性，未尝试 Draft-7 特定字段（如 `$schema` 声明）。
- **建议**: 将导出类型别名改为 `JSONSchema`（中性名）或 `ZodJSONSchemaOutput`，避免版本误导。改动为单行 rename，成本极低。

### [SR-004] LOW: T-107 AC 中"vitest 输出 no test files found"描述已过时
- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-107 acceptance_criteria 写明"运行 `pnpm vitest run`，输出'no test files found'"，实际 T-004 完成后 vitest 已有 15 个测试（2 files PASS），该描述成为误导性历史注脚。
- **建议**: dev-plan T-107 AC 描述更新为"运行 `pnpm vitest run`，所有测试 PASS，退出码 0"。

---

## 7. 质量聚合

无 per-task CODE-REVIEW 报告（merged-review 模式，本报告承担 Layer 2 职责）。

**CI 实测全绿**: typecheck 29/29 / biome 60 files / vitest 15/15。

**问题分布**:
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 4（SR-001..SR-004）

**deferred 项**: 2 条（均已在 EVENT-LOG 在案，不构成本次 Sprint 阻断）

---

## 8. Sprint 0 范围偏移结论

**Gold-plating**: 无（`clipboard-payload.ts` 属 AC-005 隐含交付物）
**Drift**: 无（所有交付物均在 deliverables 或 AC 范围内）
**缺失交付物**: 无（所有 deliverables 均已交付，占位 schema 为计划内骨架）
**偏移率**: 0%

---

## 9. 三态判定

无 CRITICAL / HIGH 问题；存在 4 条 LOW。

**verdict: approved_with_notes**

**notes_summary**: 4 条 LOW 问题均不阻塞后续 Sprint 推进：SR-001（签名文档对齐）、SR-002（response schema 导出验证补全）、SR-003（类型别名更名）、SR-004（T-107 AC 描述更新）。可在后续 Sprint 的相关任务中顺带修复，无需专项迭代。
