---
id: "code-review-T-092-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-092"]
---

# Code Review: T-092 主题预填 template + 9 维守护 + describe_template Tool

Layer 1 delegated to hook (lint hook active; biome --fix 已在编码阶段执行)

## Cluster E 审查结果（T-092）

### L2 维度表

| task | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | ac-coverage | consistency |
|------|-----------|----------------|--------------|-------------|-----------|------------|----------|----------|-------------|-------------|
| T-092 | PASS | MEDIUM | PASS | PASS | PASS | PASS | MEDIUM | PASS | MEDIUM | MEDIUM |

### 发现清单

---

### [SR-E-001] MEDIUM consistency: NINE_REQUIRED 数组含 14 个元素但命名为"9 基础元素"

- **category**: consistency
- **root_cause**: self-caused
- **file**: `packages/core/src/theme-guard/template-coverage.ts:13-28`
- **描述**: `NINE_REQUIRED` 常量实际包含 14 个字符串（h1-h6、paragraph、list、blockquote、link、code、hr、image、table），名称"9"与实际数量不符。AC-003 规格说"9 基础元素"，但实现以 14 个作为检测集。若未来增减元素，该常量名将产生误导，维护者难以判断"哪 9 个"是目标规范。
- **建议**: 将常量重命名为 `REQUIRED_ELEMENTS`，或在注释中显式说明"9 大类"与"14 项"的对应关系（h1-h6 算 1 大类 heading）。

---

### [SR-E-002] MEDIUM ac-coverage: AC-005 测试中动态 import 使用相对路径字符串，运行时可能与构建路径不匹配

- **category**: ac-coverage
- **root_cause**: self-caused
- **file**: `packages/core/src/theme-guard/template-coverage.test.ts:433` / `tests/core/theme/template-registry.test.ts:121`
- **描述**: 两个 AC-005 测试都使用 `import(\`../../../../packages/themes/${themeId}/src/index.ts\`)` 形式的动态导入（tests/ 的相对路径）/ `import(\`../../../../packages/themes/${themeId}/src/index.ts\`)` 。在 monorepo workspace 中，若 vitest 的 `resolve.alias` 或 `root` 配置导致路径解析与直接文件路径不同，动态字符串 import 会绕过 package alias。当前通过 vitest root + cwd 兜底，但该模式使测试对工程配置强耦合，任何目录结构变更或 vitest.config 调整都会静默失效（不报错，而是 "module not found" 运行时报错）。
- **建议**: 将 5 个主题的动态 import 改为静态 import，或在 vitest.config 为主题包配置 alias，使测试意图清晰且不依赖路径字符串。

---

### [SR-E-003] MEDIUM error-handling: describe-template.ts 错误路径对 E_THEME_NOT_FOUND 的判断存在逻辑缺陷

- **category**: error-handling
- **root_cause**: self-caused
- **file**: `apps/mcp-server/src/tools/describe-template.ts:15-19`
- **描述**: 当 `describeTemplate(themeId, templateId)` 抛出 `"E_TEMPLATE_NOT_FOUND"` 时，代码通过调用 `describeTheme(themeId)` 来区分"主题不存在"还是"模板不存在"。但 `describeTheme` 返回 `ThemeDefinition | undefined`，代码中判断的是 `if (!describeTheme(themeId)) return { code: "E_THEME_NOT_FOUND" }`——这要求 themeId 已在 core registry 注册才能正确区分。问题是：`describeTemplate` 和 `describeTheme` 使用不同的 store（`template.ts` 中的 `store` vs `theme.ts` 中的 `store`），两者通过 `registerTheme` 同步注册，但若手动调用 `defineTemplate` 而未调用 `registerTheme`（测试场景常见），则 `describeTheme(themeId)` 返回 `undefined`，导致错误路径返回 `E_THEME_NOT_FOUND` 而非 `E_TEMPLATE_NOT_FOUND`，产生误导性错误码。测试 `describe-template.test.ts` 中 "unknown templateId" case 使用 `registerBuiltins()` 所以此路径在该测试下正常，但逻辑本身是脆弱的。
- **建议**: 区分两种"未找到"应从 `template.ts` 的 `store` 直接判断主题是否存在（`store.has(themeId)`），而非依赖另一个 registry 的状态。`describeTemplate` 可以拆分为两步检查：先检查主题键是否存在于 template store，再检查 templateId 是否存在，分别返回两个不同的错误码。

---

### [SR-E-004] MEDIUM coupling: describe-template.ts 工具层直接调用 `describeTheme` 用于错误分类

- **category**: coupling
- **root_cause**: self-caused
- **file**: `apps/mcp-server/src/tools/describe-template.ts:2,18`
- **描述**: `describeTemplateTool` 同时 import `describeTemplate` 和 `describeTheme`，前者是主要业务操作，后者仅作为副查询来区分错误类型。这使工具层对两个不同 registry（template store 和 theme store）均有直接依赖，导致该工具的正确运行需要两个 store 同步一致。如 SR-E-003 所示，这种耦合产生了微妙的 bug 风险。此外，`describeTheme` 本来是 describe_theme Tool 专属的核心操作，跨 tool 调用增加横向耦合。
- **建议**: 在 `packages/core/src/registry/template.ts` 的 `describeTemplate` 函数内部通过 `store.has(themeId)` 抛出带区分的错误（如 `E_THEME_NOT_FOUND` vs `E_TEMPLATE_NOT_FOUND`），工具层只需捕获字符串，不再需要调用 `describeTheme`。

---

### [SR-E-005] LOW consistency: `describeTemplateResponseSchema` 全字段 optional，无法校验成功响应结构

- **category**: consistency
- **root_cause**: self-caused
- **file**: `packages/contracts/src/mcp/tool-contracts.ts:111-117`
- **描述**: `describeTemplateResponseSchema` 中 `themeId`、`templateId`、`markdown`、`metadata`、`code` 全部标 `.optional()`。成功响应（`{themeId, templateId, markdown, metadata}`）与错误响应（`{code}`）共用一个宽松 schema。若某调用方用此 schema 校验响应，空对象 `{}` 也会通过验证，schema 实际无校验价值。CLAUDE.md 中此项列为 deferred，但已标注为已知问题。
- **建议**: 使用 `z.discriminatedUnion("code", [...])` 或 `z.union([successSchema, errorSchema])` 将成功路径和错误路径分开定义，保证各自的必填字段得到强制校验。这是 deferred 项，优先级 LOW。

---

### [SR-E-006] LOW consistency: `describe-theme.ts` 返回 `templates: []` 硬编码空数组

- **category**: consistency
- **root_cause**: self-caused
- **file**: `apps/mcp-server/src/tools/describe-theme.ts:8`
- **描述**: `describeThemeTool` 返回 `{ ...theme, templates: [] }`，将 `templates` 字段硬编码为空数组，使调用 `describe_theme` 的 LLM 永远无法通过该 tool 发现主题有哪些 templates。CLAUDE.md 已记录"③ describe_theme.templates 仍硬编码 `[]`，待接 listThemeTemplates"为 deferred。此处仅确认现状与 deferred 记录一致。
- **建议**: 将 `templates: []` 替换为 `templates: listThemeTemplates(id).map(...)` 或调用 `listThemeTemplates`。

---

## deferred 逐条核对结论

1. **字段名分歧（AC-004 card `{valid,templateCount,missingElements}` vs ARCH `{pass,themeId,templates[],failingTemplates}`）**: 实现以 ARCH 为准，`validateThemeTemplates` 返回 `{pass, themeId, templates[], failingTemplates[]}`，无 `valid` / `templateCount` / `missingElements` 顶层字段。测试文件顶部已加注释说明与 AC-004 card 文案的偏差，并明确以 ARCH 为准。**现状符合 deferred 预期，无需额外跟进。**

2. **AC-006 富响应（coveredElements/mdastSummary/dependencies）未实现**: `describe-template.ts` 当前返回 `{themeId, templateId, markdown, metadata}`，不含 ARCH#API-033 富字段。注释 `// API-033 rich fields (coveredElements / mdastSummary / dependencies) are deferred to a future sprint.` 已显式标注。**现状符合 deferred 预期，但 SR-E-005 中 schema 宽松问题是附带代价，待实现富响应时一并收紧。**

3. **describeTemplateResponseSchema 暂宽松（全 optional）**: 已确认，见 SR-E-005（LOW）。schema 确实无校验价值，但 deferred 期间不阻塞功能。**仍需跟进，已列为 LOW 问题。**

4. **contracts template-definition.ts 加 metadata 字段**: 已确认 `templateDefinitionSchema` 增加了 `metadata: z.object({ description: z.string().optional() }).optional()` 字段（line 9）。该字段未出现在原始 zod schema 中，但 `ThemeDefinition` 的 `templates` 数组引用此 schema，因此 metadata 字段正确传播到整个数据流。该改动是架构正确的越界（contracts 理论上只定义形状，不新增语义字段，但此处 metadata 是数据契约的一部分，在 contracts 包定义是合理的）。**无需跟进，当前方案架构可接受。**

5. **themes→core 注册方向（学习⑮）**: 逐一验证 5 个主题的 `src/templates/index.ts`，均只 `import type { TemplateDefinition } from "@wechat-flow/contracts"`，无任何 `@wechat-flow/core` import。主题侧通过 `ThemeDefinition.templates` 字段导出数据，由 `core/registry/theme.ts` 的 `registerTheme` 调用 `defineTemplate` 将数据注入 core store，满足学习⑮的约束。**无违规，themes-only-contracts 边界干净。**

---

## 9 维守护正确性专项核查

`validateTemplateCoverage` 的检测逻辑：
- `heading` 节点通过 `depth` 字段分解为 `h1`-`h6`（正确）
- `paragraph`、`list`、`blockquote`、`code`（fenced code）、`thematicBreak`（→ `hr`）、`table`（remark-gfm）通过 `SIMPLE_NODE_ELEMENT` 映射（正确）
- `link` 映射：`link` 类型出现在 `SIMPLE_NODE_ELEMENT` 中（正确），但 `link` 节点是 `paragraph` 的 inline 子节点，`collectNodes` 做深度遍历，能正确访问到（正确）
- `image` 映射：同 `link`，作为 inline 子节点被深度遍历覆盖（正确）
- `containerDirective` / `leafDirective` 通过 name 匹配 CORE_BLOCKS（正确，需要 remark-directive plugin，已在 parse.ts 加载）

**已识别限制**（不升为 HIGH，因属于规格范围内问题）：
- 标准 markdown 的 `link` 是 inline 元素，在 `paragraph` 内部作为子节点。`SIMPLE_NODE_ELEMENT` 中 `link: "link"` 映射正确，collectNodes 会遍历到它。但若 `image` 或 `link` 单独出现在段落中且该段落本身已被 paragraph 计入，实际上覆盖了两个元素（paragraph + link/image）——这是合理的，`NINE_REQUIRED` 将它们视为独立检测项。
- `pass = missingElements.length === 0 && missingBlocks.length === 0` 要求全部 14 个 required elements **且**全部 6 个 CORE_BLOCKS 都存在才算 pass。这比 AC-003 描述的"≥6 核心 Block"更严格（实现要求全 6 个，AC 只要求 ≥6，由于 CORE_BLOCKS 正好有 6 个，实际上等价——但若未来 CORE_BLOCKS 扩展超过 6，将不再等价）。当前 5 个 starter.md 均包含全部 6 个 CORE_BLOCKS，测试通过。

---

## Cluster E 结论

**verdict: approved_with_notes**

发现 4 个 MEDIUM 问题（SR-E-001/002/003/004）和 2 个 LOW 问题（SR-E-005/006），无 CRITICAL/HIGH。

**notes_summary**:
- SR-E-003 是最值得关注的问题：`describe-template.ts` 的错误分类逻辑依赖两个不同 registry 的一致性，存在在手动 `defineTemplate`（无 `registerTheme`）场景下返回错误错误码的隐患，但当前生产路径（通过 `registerBuiltins`）不受影响。
- SR-E-004 是 SR-E-003 的根因：跨 Tool 调用 `describeTheme` 作为错误分类辅助引入了不必要的耦合。
- SR-E-001（NINE_REQUIRED 命名）是维护性问题，不影响功能。
- SR-E-002（动态 import 路径）在当前 vitest 配置下通过，但对路径结构变更脆弱。
- deferred 5 条均对账完成，themes-only-contracts 边界完全干净。
