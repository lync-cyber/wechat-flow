---
id: "dev-plan-wechat-flow-s0"
version: "0.4.1"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "ui-spec-wechat-flow"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 0: 基础设施 + 设计系统

[NAV]
- Sprint 0 任务卡 → T-001..T-004, T-DS-001, T-VAL-00
[/NAV]

**Sprint 目标**: Monorepo 骨架可跑 CI；Penpot Design System Token 导入并验证可读性；所有后续 Sprint 的工程基础就绪。

---

## 3. 任务卡详细

### T-001: Monorepo 骨架初始化

- **目标**: 建立 pnpm workspace + Turborepo 骨架，创建 apps/ 和 packages/ 目录结构，使所有子包可互相引用
- **模块**: 无特定模块（工程基础）
- **task_kind**: chore
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 0
- **tdd_mode**: skip
- **tdd_skip_reason**: "Monorepo 骨架初始化，为配置文件和目录结构创建，无单元测试价值"
- **security_sensitive**: false
- **dependencies**: []
- **acceptance_criteria**:
  - [ ] AC-001: Given 空仓库，When 运行 `pnpm install`，Then 所有 workspace 包依赖解析成功，`node_modules/.pnpm` 目录生成，退出码 0
  - [ ] AC-002: Given T-001 完成，When 运行 `pnpm turbo build`，Then Turborepo 任务图解析成功并输出 pipeline 结构（即使所有包为空骨架），不报 `missing script` 错误
  - [ ] AC-003: Given workspace 初始化完成，When 检查目录结构，Then `apps/editor/` `apps/mcp-server/` `apps/relay/` `apps/cli/` `apps/job-worker/` `packages/core/` `packages/contracts/` `packages/plugin-api/` `packages/ruleset/` `packages/themes/` `packages/blocks/` `packages/marks/` `packages/palette/` `packages/zh-typo/` 全部存在，每个包含 `package.json` 和 `src/index.ts` 骨架
  - [ ] AC-004: Given 目录结构就绪，When 检查 `packages/contracts/` 包，Then `packages/contracts/` 目录存在，`packages/contracts/package.json` 声明包名 `@wechat-flow/contracts`（M-012 contracts 包独立存在，供 M-002 core 与 M-005 theme-registry 共同消费）[ARCH#§2.M-012]
  - [ ] AC-005: Given `pnpm -r --filter @wechat-flow/core --filter @wechat-flow/themes build` 执行，When 依赖图解析，Then 不报循环依赖错误（M-002 / M-005 包对 M-012 单向依赖验证）
- **deliverables**:
  - [ ] `pnpm-workspace.yaml` — workspace 配置，声明 apps/* + packages/*
  - [ ] `package.json` — root package，含 turbo + biome devDependencies
  - [ ] `turbo.json` — 任务图骨架（build/test/lint/typecheck pipeline）
  - [ ] `apps/editor/package.json`
  - [ ] `apps/mcp-server/package.json`
  - [ ] `apps/relay/package.json`
  - [ ] `apps/cli/package.json`
  - [ ] `apps/job-worker/package.json`
  - [ ] `packages/core/package.json`
  - [ ] `packages/contracts/package.json`
  - [ ] `packages/plugin-api/package.json`
  - [ ] `packages/ruleset/package.json`
  - [ ] `packages/themes/package.json`
  - [ ] `packages/blocks/package.json`
  - [ ] `packages/marks/package.json`
  - [ ] `packages/palette/package.json`
  - [ ] `packages/zh-typo/package.json`
- **relates_to**: [arch-wechat-flow#§7.2]
- **context_load**:
  - arch-wechat-flow#§7.2

---

### T-002: TypeScript + Biome + Vitest 配置

- **目标**: 为 workspace 配置统一的 TypeScript 5.x 编译设置、Biome lint/format、Vitest 2.x 测试框架，使所有包共享同一质量门禁
- **模块**: 无特定模块（工程基础）
- **task_kind**: config
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: small
- **sprint**: 0
- **tdd_mode**: skip
- **tdd_skip_reason**: "TypeScript + Biome + Vitest 工具链配置文件，无单元测试价值"
- **security_sensitive**: false
- **dependencies**: [T-001]
- **acceptance_criteria**:
  - [ ] AC-001: Given T-001 完成，When 运行 `pnpm turbo typecheck`，Then TypeScript 在所有包内以 `strict: true` 编译，无报错（空骨架文件 `export {}` 通过即可）
  - [ ] AC-002: Given T-002 完成，When 运行 `pnpm biome check .`，Then Biome lint + format 检查通过，退出码 0（空文件允许）
  - [ ] AC-003: Given T-002 完成，When 在任意 package 下运行 `pnpm vitest run`，Then Vitest 启动并输出"no test files found"（非错误），退出码 0
- **deliverables**:
  - [ ] `tsconfig.base.json` — root 级 TypeScript 基础配置（strict: true，target: ESNext，moduleResolution: bundler）
  - [ ] `tsconfig.json` — root references 配置
  - [ ] `biome.json` — lint + format 统一规则
  - [ ] `vitest.config.ts` — root vitest workspace 配置，指向各 package 的 `vitest.config.ts`
  - [ ] `packages/core/tsconfig.json` — 继承 base，path aliases
  - [ ] `packages/contracts/tsconfig.json`
- **relates_to**: [arch-wechat-flow#§1.4, arch-wechat-flow#§7.3]
- **context_load**:
  - arch-wechat-flow#§1.4
  - arch-wechat-flow#§7.3

---

### T-003: Turborepo 任务图配置

- **目标**: 配置 Turborepo 完整任务图（lint → typecheck → unit-test → ruleset-fixture → cross-runtime → theme-guard → visual-regression），支持远程缓存
- **模块**: 无特定模块（工程基础）
- **task_kind**: config
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: small
- **sprint**: 0
- **tdd_mode**: skip
- **tdd_skip_reason**: "Turborepo 任务图配置文件，无单元测试价值"
- **security_sensitive**: false
- **dependencies**: [T-001]
- **acceptance_criteria**:
  - [ ] AC-001: Given T-003 完成，When 运行 `pnpm turbo lint typecheck`，Then Turborepo 显示任务依赖顺序（lint 先于 typecheck），无 cycle 错误
  - [ ] AC-002: Given 运行两次 `pnpm turbo build`，When 源码未变更，Then 第二次命中 local cache，输出"FULL TURBO"或 cache hit 提示，构建时间显著短于首次
- **deliverables**:
  - [ ] `turbo.json` — 完整 pipeline 配置（`lint`, `typecheck`, `build`, `test`, `ruleset-fixture`, `cross-runtime`, `theme-guard`, `visual-regression` 任务链及 inputs/outputs 声明）
- **relates_to**: [arch-wechat-flow#§7.4]
- **context_load**:
  - arch-wechat-flow#§7.4

---

### T-004: packages/contracts schema 契约层骨架

- **目标**: 建立 `@wechat-flow/contracts` 包，实现 Zod 4.x schema 定义骨架和 JSON Schema 导出工具，作为全项目类型单一事实来源
- **模块**: M-012 (schema 契约层)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 0
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
- **security_sensitive**: false
- **dependencies**: [T-002]
- **acceptance_criteria**:
  - [ ] AC-001: Given `@wechat-flow/contracts` 包，When 调用 `import { renderMarkdownRequestSchema } from '@wechat-flow/contracts'`，Then TypeScript 推导出 `renderMarkdownRequestSchema` 类型为 `ZodObject`，`z.infer<typeof renderMarkdownRequestSchema>` 包含字段 `markdown: string`、`themeId?: string`、`rulesetVersion?: string`、`paint?: Record<string, string>`、`baseColor?: string` [ARCH#§2.M-012]
  - [ ] AC-002: Given `renderMarkdownRequestSchema`，When 调用 `toJSON(renderMarkdownRequestSchema)`，Then 返回符合 JSON Schema Draft-7 格式的对象，含 `type: 'object'`、`properties.markdown.type: 'string'`
  - [ ] AC-003: Given `renderMarkdownResponseSchema`，When `schema.safeParse({ html: '<p>test</p>', diagnostics: [], rulesetVersion: '1.0.0', themeVersion: '1.0.0' })`，Then `result.success === true` [ARCH#§2.M-012]
  - [ ] AC-004: Given 传入不合法输入 `schema.safeParse({ html: 123 })`，When 解析，Then `result.success === false`，`result.error.issues[0].path` 包含 `'html'`
  - [ ] AC-005: Given `import { TemplateDefinition, DiagnosticReport, ClipboardPayload } from '@wechat-flow/contracts'`，When TypeScript 编译，Then 三个核心实体类型均从 `@wechat-flow/contracts` 单一导出，无类型缺失错误 [ARCH#§4.E-011]
  - [ ] AC-006: Given `packages/contracts/src/mcp/tool-contracts.ts`，When 统计导出的 Tool schema 数量（含 19 同步 + 4 异步 = 23），Then 与 ARCH api 卷 §3.1 + §3.2 注册的 Tool 总数一致；不一致时 CI 阻断（schema 数量对账测试在 `tests/contracts/tool-count.test.ts`）[ARCH#§3]
- **deliverables**:
  - [ ] `packages/contracts/src/mcp/tool-contracts.ts` — 23 个 Tool 的 request/response Zod schema 骨架（19 同步 + 4 异步：upload_image / upload_to_wechat_asset / export_long_image / export_cover；包含 `renderMarkdownRequestSchema`、`renderMarkdownResponseSchema`，其余 Tool schema 以 `z.object({}).passthrough()` 占位）
  - [ ] `packages/contracts/src/utils/to-json.ts` — `toJSON(schema) → JSONSchema7` 工具函数（包装 `z.toJSONSchema()`）
  - [ ] `packages/contracts/src/index.ts` — 统一导出
  - [ ] `packages/contracts/src/version/triple-structure.ts` — `versionTripleSchema = z.object({ coreVersion: z.string(), themeVersion: z.string(), rulesetVersion: z.string() })`
  - [ ] `packages/contracts/src/theme/template-definition.ts` — 导出 `TemplateDefinition` 类型（对应 ARCH E-011）[ARCH#§4.E-011]
  - [ ] `packages/contracts/src/sanitize/extend-schema.ts` — 导出 `extendSanitizeSchema(tagSet: string[], attrMap: Record<string, string[]>): void` 共享契约（对应 ARCH M-012 D2 决策，供 M-002 core 与 M-005 theme-registry 消费）[ARCH#§2.M-012]
  - [ ] `packages/contracts/src/diagnostic/diagnostic-report.ts` — `DiagnosticReport` 含 `diagnostics[]` / `nodeChangeRecords[]` / `nightRiskIssues[]` 三字段 [ARCH#§2.M-003]
  - [ ] `tests/contracts/tool-contracts.test.ts` — AC-001..AC-005 单元测试
- **relates_to**: [F-013, M-012]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-012
  - arch-wechat-flow-api#§3.API-001

---

### T-DS-001: [DESIGN] Penpot — Token 导入 + 可读性验证（PS-001..PS-004）

- **目标**: 将 ui-spec §1 全部 CSS Token 导入 Penpot Design System 变量组；在真实屏幕上验证暖白色阶、衬线字体可读性、主题色 WCAG 对比度，作为后续组件绘制的单一设计来源
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 0
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: []
- **acceptance_criteria**:
  - [ ] AC-001: Penpot 项目内已建立 `Token-Surface`、`Token-Border`、`Token-Text`、`Token-Brand`、`Token-Accent`、`Token-Functional`、`Token-Diagnostics`、`Token-Typography`、`Token-Spacing`、`Token-Shadow`、`Token-Animation` 变量组，命名遵循 `Token-{group}` 模式，与 `ui-spec-wechat-flow#§1` 一一对应
  - [ ] AC-002: 通过 Penpot MCP `find_shape` 可检索到 `Token-Surface` 组中的 `--color-surface` 变量（验证 link 已就绪）
  - [ ] AC-003: 开发者目视检查：在 1080p 显示器上渲染暖白 `#FAF8F5` 底色 + LXGW WenKai 11px 文字，不存在模糊或对比度不足问题（对应 PS-002）
  - [ ] AC-004: 验证 `--color-brand #2D5A4E` 文字在 `--color-surface #FAF8F5` 背景上对比度 ≥ 4.5:1（WCAG AA），记录验证工具截图（对应 PS-003）
  - [ ] AC-005: 签字记录写入 `docs/EVENT-LOG.jsonl`（`event=design_signoff, phase=development, ref=T-DS-001`）
- **deliverables**:
  - [ ] Penpot 项目：Design System 页面，包含全部 Token 变量组
  - [ ] `docs/EVENT-LOG.jsonl` — design_signoff 事件记录
- **relates_to**: [ui-spec-wechat-flow#§1, PS-001, PS-002, PS-003, PS-004]
- **context_load**:
  - ui-spec-wechat-flow#§1

---

### T-VAL-00: [VALIDATION] Sprint 0 验证：CI 绿 + Penpot Token 可见

- **目标**: 用户/开发者手动验证 Sprint 0 所有基础设施产物可用，Penpot Token 导入完成且可从代码侧检索
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **sprint**: 0
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-001, T-002, T-003, T-004, T-DS-001]
- **acceptance_criteria**:
  - [ ] 运行 `pnpm install && pnpm turbo typecheck`，终端输出无红色错误，退出码 0
  - [ ] 运行 `pnpm biome check .`，输出无 lint 错误
  - [ ] 运行 `pnpm vitest run`，输出"no test files found"（正常，Sprint 0 尚无测试用例）
  - [ ] 打开 Penpot SaaS（design.penpot.app），找到项目下的 Design System 页面，可见 Token 变量组（Surface / Brand / Text 等）
  - [ ] 在开发终端运行 Penpot MCP `find_shape` 检索 `Token-Surface`，返回非空结果（验证 MCP link 就绪）
- **relates_to**: [T-001, T-002, T-003, T-004, T-DS-001]
