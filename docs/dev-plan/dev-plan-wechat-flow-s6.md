---
id: "dev-plan-wechat-flow-s6"
doc_type: dev-plan
author: tech-lead
status: approved
consumers: [developer, qa-engineer]
version: "0.5.0"
sprint: 6
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
deps:
  - arch-wechat-flow
  - arch-wechat-flow-modules
  - arch-wechat-flow-api
  - ui-spec-wechat-flow
  - ui-spec-wechat-flow-c001-c014
  - ui-spec-wechat-flow-p001-p005
---

# Dev-Plan wechat-flow — Sprint 6 任务卡

[NAV]
- Sprint 6 任务卡 → T-056..T-064, T-066..T-072, T-085..T-090, T-104, T-113
[/NAV]

Sprint 6 目标：质量门禁 + 视觉回归核心矩阵与全量 variant 抽样动态枚举 + 性能 benchmark + Skill bundle + 装饰渲染。交付里程碑：规则集 ≥ 42 条 fixture 全绿；Playwright 视觉基线建立（核心矩阵 + 抽样 variant 矩阵）；CI 全绿；pixelmatch ratio ≤ 0.05；编辑器性能 benchmark 落地。

---

---

## 3. 任务卡详细

### T-104: Penpot UC-013 诊断密度测试 + PS-007/PS-008 深色主题 token 草稿

- **目标**: 在 Penpot 中验证 DiagnosticsPanel 在高密度诊断条目下的视觉稳定性；草拟深色主题 token 映射（PS-007/PS-008），供 T-059/T-062 主题守卫验证使用。
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095, T-101]
- **acceptance_criteria**:
  - [ ] AC-001: DiagnosticsPanel 在 ≥ 20 条目下无截断溢出，滚动区高度由 `--panel-max-h: 40vh` 限定
  - [ ] AC-002: 深色背景 `--color-surface-dark` 与前景色对比度 ≥ 4.5:1（WCAG AA）
  - [ ] AC-003: 所有 token 命名遵循 `arch#§6` token 命名约定（`--{category}-{role}-{variant?}`）
  - [ ] AC-004: Penpot frame 导出图附路径 `docs/design/dark-theme-preview.png`
- **deliverables**:
  - [ ] DiagnosticsPanel 高密度稿（≥ 20 条诊断项）截图导出
  - [ ] `tokens/dark-theme-draft.json`（深色 token 映射草稿，满足 WCAG AA 对比度）
  - [ ] Penpot frame 标注：`PS-007-dark-surface` / `PS-008-dark-accent` token 值
- **notes**: Penpot 同步参考: ui-spec#§2.UC-013, ui-spec#§7.PS-007, ui-spec#§7.PS-008

---

### T-056: 规则集补全至 ≥ 42 条

- **目标**: 在 Sprint 2 产出的 25 条规则基础上，补全 strip / clamp / transform 三分类的空缺，使总规则数 ≥ 42 条。
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-015]
- **acceptance_criteria**:
  - [ ] AC-001: `listRules()` 返回数组长度 ≥ 42 [ARCH#§3.API-009]
  - [ ] AC-002: 每条新规则包含 `id: string`、`scope: RuleScope`、`severity: 'error'|'warning'|'info'`、`execute(node, ctx) → RuleHit[]` 四个字段 [ARCH#§2.M-003]
  - [ ] AC-003: 所有新 strip 规则：命中时移除目标属性/节点并在 `diagnostics` 数组追加 `{ ruleId, severity, message, node }` [ARCH#§3.API-010]
  - [ ] AC-004: `getRulesetVersion()` 返回符合 semver 格式的字符串，且与 `package.json#version` 一致 [ARCH#§3.API-010]
  - [ ] AC-005: 新增规则对应 Vitest 单元测试，覆盖：正常命中路径 + 无命中路径 + 边界（空节点、嵌套节点）
  - [ ] AC-006: `pnpm -r test --filter ruleset` 全绿
- **deliverables**:
  - [ ] `packages/ruleset/src/rules/strip/` — 补充 strip 规则（目标 ≥ 5 条新增）
  - [ ] `packages/ruleset/src/rules/clamp/` — 补充 clamp 规则（目标 ≥ 6 条新增）
  - [ ] `packages/ruleset/src/rules/transform/` — 补充 transform 规则（目标 ≥ 6 条新增）
  - [ ] `packages/ruleset/src/index.ts` — 导出新规则，`getRulesetVersion()` bump
  - [ ] `packages/ruleset/src/__tests__/rules/` — 每条新规则对应独立测试文件
- **context_load**:
  - arch#§2.M-003
  - arch#§3.API-009
  - arch#§3.API-010
- **notes**: LOC_SIGNAL: 400

**新增规则清单（示例，implementer 可调整子条目但总数须满足 ≥ 42）**:
- strip: `strip-data-attr`、`strip-aria-hidden`、`strip-width-height-inline`、`strip-negative-margin`、`strip-calc-expression`
- clamp: `clamp-font-size`（8–36px）、`clamp-line-height`（1.2–2.5）、`clamp-letter-spacing`（-0.05em–0.2em）、`clamp-border-radius`（0–24px）、`clamp-padding`（0–48px）、`clamp-margin-top-bottom`
- transform: `transform-rem-to-px`、`transform-em-to-px`、`transform-vw-to-percent`、`transform-vh-fallback`、`transform-hsl-to-rgb`、`transform-oklch-to-rgb`

---

### T-057: E2E 渲染 fixture 测试（Markdown → 最终 HTML）

- **目标**: 建立 Markdown → 最终 inline-styled HTML 的端到端 fixture 测试套件，验证完整 5 阶段渲染管道的确定性输出。
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-006, T-007, T-013, T-014, T-015, T-016, T-017, T-056]
- **acceptance_criteria**:
  - [ ] AC-001: `renderMarkdown(fixtureInput, { themeId: 'default' })` 输出 HTML 与 `.html` 快照字节一致（SHA-256 匹配）[ARCH#§3.API-001]
  - [ ] AC-002: 快照数量 ≥ 10 个独立场景
  - [ ] AC-003: 所有快照输出不含 `<style>` / `<script>` 标签（sanitize 阶段生效）[ARCH#§2.M-002]
  - [ ] AC-004: `simulatePaste` 阶段后 `droppedAttrs` 不含允许白名单内的属性（验证 M-004 正确性）[ARCH#§2.M-004]
  - [ ] AC-005: 快照更新命令：`pnpm test:update-snapshots`（更新时需手动 review diff）
  - [ ] AC-006: `pnpm -r test --filter core` 全绿，新 fixture 测试含在内
- **deliverables**:
  - [ ] `packages/core/src/__tests__/fixtures/` — fixture 目录，含 `.md` 输入文件 + `.html` 快照文件
  - [ ] `packages/core/src/__tests__/e2e-render.test.ts` — fixture 驱动的 E2E 测试
  - [ ] `packages/core/src/__tests__/fixtures/` 覆盖场景：基础 heading/paragraph/list、Block directive、Mark directive、frontmatter paint 覆写、空文档、超长段落（> 5000 字符）、中文混排
- **context_load**:
  - arch#§2.M-001
  - arch#§2.M-002
  - arch#§2.M-003
  - arch#§3.API-001
  - arch#§3.API-009
- **notes**: LOC_SIGNAL: 350

---

### T-058: Playwright 视觉回归矩阵（核心 + 全量 variant 抽样动态枚举）

- **目标**: 建立两层视觉回归基线：核心矩阵（每 PR 必跑，5 主题 × 8 类 P0 场景 + ≥ 8 综合场景）+ 全量 variant 矩阵（PR 抽样，夜间全量），由 listBlocks() × describeBlock(b).variants × 5 主题动态枚举生成 story。跨 Sprint 前置：T-121（S4，容器 directive 展开 + variant 样式分层合成落地）是 variant 矩阵截图可视区分的渲染前提，未完成则全量 variant story 渲染同图、矩阵失效
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-022, T-024, T-025, T-005, T-008, T-074, T-075, T-121]
- **acceptance_criteria**:
  - [ ] AC-001: 覆盖 5 个主题：`default`、`magazine`、`literary`、`business`、`tech` [ARCH#§2.M-005]
  - [ ] AC-002: 动态枚举 story：foreach block in listBlocks() × foreach variant in describeBlock(b).variants × foreach theme；sampleRatio 由 ruleset 配置（默认 0.2）
  - [ ] AC-003: pixelmatch ratio ≤ 0.05（与 PRD §1.3 5% 同口径，threshold 0.2, includeAA: false）
  - [ ] AC-004: 基线截图提交到 `e2e/visual/snapshots/` 目录，文件命名 `{theme}-{scene}.png`
  - [ ] AC-005: `pnpm test:visual` 首次运行（无基线）自动生成基线；后续运行与基线对比
  - [ ] AC-006: CI matrix 分两 job：visual-core（每 PR 必跑核心矩阵）+ visual-sampled（PR 抽样）
  - [ ] AC-007: nightly scheduled job 跑全量 variant 矩阵
  - [ ] AC-008: 视觉回归矩阵覆盖前断言 `registry.listAllVariants().length >= 120`；不足时 fail-fast，避免在残缺 registry 上跑回归
- **deliverables**:
  - [ ] `e2e/visual/` — Playwright 视觉回归测试目录
  - [ ] `e2e/visual/theme-matrix.spec.ts` — 5 主题 × 场景矩阵测试
  - [ ] `e2e/visual/variant-matrix.spec.ts` — 全量 variant 动态枚举测试
  - [ ] `e2e/visual/snapshots/` — 基线截图目录（`.png`，提交到 git）
  - [ ] `playwright.config.ts` — 视觉回归专用配置（threshold: 0.2，includeAA: false，`--update-snapshots` flag）
  - [ ] `packages/theme-*/src/__stories__/` — 每个主题的 Storybook/fixture HTML story 文件（供 Playwright 抓取）
- **context_load**:
  - arch#§2.M-005
  - arch#§2.M-006
  - arch#§6

---

### T-059: WCAG 对比度自动检测 + 主题守卫 9 维度完整实现

- **目标**: 实现 `validateThemeGuard` 的 9 维度完整校验，包含 WCAG AA 自动对比度检测，并集成内置 template 完整性守护。
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-020, T-021, T-022, T-092]
- **acceptance_criteria**:
  - [ ] AC-001: `validateThemeGuard(theme) → GuardResult` 中 `GuardResult.dimensions` 数组含 9 个条目，每条含 `{ name: string, passed: boolean, message?: string }` [ARCH#§3.API-016]
  - [ ] AC-002: WCAG AA 对比度公式实现：相对亮度 L = 0.2126 R + 0.7152 G + 0.0722 B（sRGB 线性化），对比度 = (L1 + 0.05) / (L2 + 0.05)
  - [ ] AC-003: `paintable-coverage` 维度：`theme.paintable` 内 key 不在 `theme.tokens` 中时 `passed: false`，`message` 列出缺失 key
  - [ ] AC-004: 单元测试覆盖：每维度各一个正向用例 + 一个负向用例
  - [ ] AC-005: `pnpm -r test --filter theme-core` 全绿
- **deliverables**:
  - [ ] `packages/core/src/guard/dimensions/` — 9 维度独立实现文件（每维度一个 .ts 文件）
  - [ ] `packages/core/src/guard/contrast.ts` — WCAG AA 对比度计算（基于 WCAG 2.1 相对亮度公式）
  - [ ] `packages/core/src/guard/index.ts` — 聚合入口，导出 `validateThemeGuard`
  - [ ] `packages/core/src/__tests__/guard/` — 每个维度独立测试
  - [ ] `packages/core/src/guard/` 目录下不存在 `eight-dimensions.ts` 单文件实现（9 维度按文件拆分约束）
- **context_load**:
  - arch#§2.M-005
  - arch#§3.API-015
  - arch#§3.API-016
- **notes**: LOC_SIGNAL: 280

**9 维度守卫**:
- 1. `contrast` — WCAG AA: 前景/背景对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大字体 ≥ 18px）
- 2. `token-completeness` — 必填 token（`--color-brand`、`--color-surface`、`--font-serif`、`--font-sans`）均已定义
- 3. `token-naming` — 所有 token 满足 `--{category}-{role}(-{variant})?` 命名规范
- 4. `paintable-coverage` — `paintable` 字段中所有 token key 在 `tokens` 中存在
- 5. `font-size-range` — 正文字号 12–20px（CSS px 换算后）
- 6. `line-height-range` — 行高 1.2–2.5
- 7. `color-count` — color token 数量 ≥ 8（防止极简主题欠定义）
- 8. `brand-color-distance` — 与已注册主题的 brand color 色差 ΔE > 5（防止重复主题）
- 9. `template-coverage` — 内置 template 覆盖 F-003 AC-012 白名单（9 基础元素 + ≥6 核心 Block）

---

### T-060: 已知 Bug 补丁库热加载

- **目标**: 实现补丁库热加载机制，支持在不升级版本的情况下动态追加规则集补丁（F-011 AC-005）。
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-013, T-056]
- **acceptance_criteria**:
  - [ ] AC-001: `loadPatchBundle(url)` 从 URL 加载 JSON 格式补丁包，schema: `{ version: string, patches: Rule[] }` [ARCH#§3.API-011]
  - [ ] AC-002: `applyPatchBundle(bundle)` 将补丁规则注入运行时规则列表，`listRules()` 立即反映新规则
  - [ ] AC-003: 补丁加载失败（网络错误 / schema 校验失败）时：`applyPatchBundle` 抛出 `PatchLoadError`，不影响已有规则
  - [ ] AC-004: 同一 `rule.id` 的补丁规则覆盖已有规则（热修复语义）
  - [ ] AC-005: `pnpm -r test --filter ruleset` 全绿
- **deliverables**:
  - [ ] `packages/ruleset/src/patch-loader.ts` — `loadPatchBundle(url: string): Promise<PatchBundle>`
  - [ ] `packages/ruleset/src/index.ts` — 导出 `applyPatchBundle(bundle: PatchBundle): void`
  - [ ] `packages/ruleset/src/__tests__/patch-loader.test.ts`
- **context_load**:
  - arch#§2.M-003
  - arch#§3.API-011
- **notes**: LOC_SIGNAL: 120

---

### T-061: 可读性检查（WCAG AA + 字号下限 + 段落长度）

- **目标**: 实现 F-011 AC-006 可读性检查规则，作为独立规则集分组集成到诊断管道。
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-013, T-059]
- **acceptance_criteria**:
  - [ ] AC-001: 3 条规则 `severity` 分别为 `warning` / `warning` / `info`，`scope: 'node'`
  - [ ] AC-002: 命中时 `RuleHit.message` 包含具体数值（实际值 vs 阈值），如 `"font-size: 10px < min 12px"`
  - [ ] AC-003: 不命中时返回空数组 `[]`
  - [ ] AC-004: 单元测试：每条规则正向 + 负向用例
  - [ ] AC-005: `pnpm -r test --filter ruleset` 全绿
- **deliverables**:
  - [ ] `packages/ruleset/src/rules/readability/index.ts` — 3 条可读性规则导出
  - [ ] `packages/ruleset/src/__tests__/rules/readability/`
- **context_load**:
  - arch#§2.M-003
  - arch#§3.API-010
- **notes**: LOC_SIGNAL: 140

**3 条规则**:
- `readability-font-size-min` — 正文 `font-size` < 12px 时 warning
- `readability-line-height-min` — `line-height` < 1.4 时 warning
- `readability-paragraph-length` — 单段落字符数 > 500 时 info（中文场景）

---

### T-062: CI 任务图完整配置

- **目标**: 配置完整的 CI pipeline，覆盖 lint → typecheck → unit-test → ruleset-fixture → cross-runtime → theme-guard → visual-regression 完整任务图。
- **task_kind**: chore
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: skip
- **tdd_skip_reason**: "脚手架/配置任务，无单元测试价值"
- **dependencies**: [T-057, T-058, T-059, T-003]
- **acceptance_criteria**:
  - [ ] AC-001: `ci.yml` jobs 顺序：`lint` → `typecheck` → `unit-test` → `ruleset-fixture` → `cross-runtime` → `theme-guard`，全部并行可能时并行
  - [ ] AC-002: `lint` job: `pnpm biome check .`
  - [ ] AC-003: `typecheck` job: `pnpm -r tsc --noEmit`
  - [ ] AC-004: `unit-test` job: `pnpm -r vitest run`
  - [ ] AC-005: `ruleset-fixture` job: `pnpm -r test --filter ruleset -- --reporter=verbose`
  - [ ] AC-006: `cross-runtime` job: 运行 T-063 产出的跨运行时一致性测试
  - [ ] AC-007: `theme-guard` job: `pnpm -r test --filter theme-core`
  - [ ] AC-008: `visual-regression.yml`: 仅在 PR 时触发，运行 `pnpm test:visual`，失败时上传 diff 截图为 artifact
  - [ ] AC-009: 所有 job 使用 `ubuntu-latest`，Node.js `lts/*`，pnpm `9.x`
  - [ ] AC-010: Turborepo remote cache 配置读取 `TURBO_TOKEN` + `TURBO_TEAM` env（CI secrets）
- **deliverables**:
  - [ ] `.github/workflows/ci.yml` — GitHub Actions CI 配置
  - [ ] `.github/workflows/visual-regression.yml` — 视觉回归专用 workflow（仅 PR trigger）
  - [ ] `turbo.json` — Turborepo 任务图更新（新增 `visual-regression` pipeline）
- **context_load**:
  - arch#§7

---

### T-063: cross-runtime 一致性测试（Node/Worker/Edge/Browser-main 四 target）

- **目标**: 验证 `renderMarkdown` 在 Node.js / Web Worker / Edge Runtime / 浏览器主线程四个运行时下，对同一输入产出字节一致的 HTML（SHA-256 相同）。
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-006, T-037, T-058]
- **acceptance_criteria**:
  - [ ] AC-001: 4 个运行时对同一 Markdown 输入 + 同一 `themeId` 产出 HTML 的 SHA-256 一致 [ARCH#§3.API-001]
  - [ ] AC-002: 测试覆盖 ≥ 3 个不同 Markdown fixture（含 CJK 字符、Block directive、frontmatter）
  - [ ] AC-003: 使用 `crypto.subtle.digest('SHA-256', ...)` 计算（跨运行时兼容）
  - [ ] AC-004: Edge 测试通过 `@cloudflare/vitest-pool-workers` 在 Miniflare 中运行
  - [ ] AC-005: `pnpm test:cross-runtime` 全绿
  - [ ] AC-006: Vitest browser mode 或 Playwright page.evaluate import @wechat-flow/core，跑同 fixture，SHA-256 与 node/worker/edge 三 target 一致
  - [ ] AC-007: CI matrix 加 browser job
- **deliverables**:
  - [ ] `packages/core/src/__tests__/cross-runtime/` — 跨运行时一致性测试
  - [ ] `packages/core/src/__tests__/cross-runtime/node.test.ts` — Node 运行时
  - [ ] `packages/core/src/__tests__/cross-runtime/worker.test.ts` — Web Worker（Vitest browser mode）
  - [ ] `packages/core/src/__tests__/cross-runtime/edge.test.ts` — Edge Runtime（`@cloudflare/vitest-pool-workers`）
  - [ ] `packages/core/src/__tests__/cross-runtime/browser.test.ts` — 浏览器主线程
- **context_load**:
  - arch#§2.M-001
  - arch#§3.API-001
  - arch#§7

---

### T-064: 多文档管理 + 自动备份精化

- **目标**: 完善多文档管理功能，增加自动备份精化逻辑（保留策略 + 导出备份）。
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-012, T-005]
- **acceptance_criteria**:
  - [ ] AC-001: `listDocuments()` 返回 `DocumentMeta[]`，含 `{ id, title, updatedAt, size }` [ARCH#§3.API-022]
  - [ ] AC-002: `deleteDocument(id)` 删除 IndexedDB `documents` store 中对应记录及其所有备份快照
  - [ ] AC-003: 自动备份：文档 dirty（未保存变更）且距上次备份 ≥ 5 分钟时触发 `createBackup(docId)`
  - [ ] AC-004: 备份保留策略：同一文档最多保留 5 份，超出时删除最旧备份
  - [ ] AC-005: `use-auto-backup.ts` 在 `onUnmounted` 时 clearInterval 防止内存泄漏
  - [ ] AC-006: 单元测试覆盖备份保留策略（插入第 6 份时验证最旧备份被删除）
- **deliverables**:
  - [ ] `apps/editor/src/stores/document-store.ts` — 补充 `listDocuments()`、`deleteDocument(id)`、`duplicateDocument(id)` [ARCH#§3.API-022]
  - [ ] `apps/editor/src/stores/backup-store.ts` — 自动备份 store（保留策略：每日最多 5 份，超出删最老的）
  - [ ] `apps/editor/src/composables/use-auto-backup.ts` — 定时备份 composable（5 分钟间隔，dirty 时触发）
  - [ ] `apps/editor/src/__tests__/stores/document-store.test.ts`
  - [ ] `apps/editor/src/__tests__/composables/use-auto-backup.test.ts`
- **context_load**:
  - arch#§2.M-007
  - arch#§3.API-022
- **notes**: LOC_SIGNAL: 130

---

### T-066: 撤销/重做 + 查找替换 + 字数统计

- **目标**: 集成 CodeMirror 6 原生撤销/重做；添加查找替换面板；在 StatusBar 显示字数统计（F-001 AC-006）。
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-009, T-012]
- **acceptance_criteria**:
  - [ ] AC-001: `Ctrl+Z` / `Cmd+Z` 触发 CodeMirror 原生 undo（`@codemirror/commands` `undo` command）
  - [ ] AC-002: `Ctrl+Y` / `Cmd+Shift+Z` 触发 redo
  - [ ] AC-003: `Ctrl+F` / `Cmd+F` 打开查找替换面板（`openSearchPanel`），`Escape` 关闭
  - [ ] AC-004: StatusBar 字数统计格式：`{中文字符数} 字 / {总字符数} 字符`，实时更新（≤ 100ms 延迟）
  - [ ] AC-005: 空文档时显示 `0 字 / 0 字符`
  - [ ] AC-006: 单元测试：`word-count.ts` StateField 对中英混排文本返回正确计数
- **deliverables**:
  - [ ] `apps/editor/src/editor/extensions/find-replace.ts` — 查找替换扩展（基于 `@codemirror/search`）
  - [ ] `apps/editor/src/editor/extensions/word-count.ts` — 字数统计 StateField（中文字符 + 英文单词分别统计）
  - [ ] `apps/editor/src/components/StatusBar.vue` — 更新：显示字数 / 字符数
  - [ ] `apps/editor/src/__tests__/editor/word-count.test.ts`
- **context_load**:
  - arch#§2.M-007
  - arch#§3.API-006
- **notes**: LOC_SIGNAL: 130

---

### T-067: 输入辅助：自动空格 + 智能引号

- **目标**: 实现 F-001 AC-007 输入辅助，基于 CodeMirror 6 InputRule 在输入时自动插入空格和智能引号。
- **task_kind**: feature
- **priority**: P2
- **complexity**: small
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-009, T-043]
- **acceptance_criteria**:
  - [ ] AC-001: 中文字符后跟 ASCII 字母/数字时，`inputRules` 自动插入一个半角空格（如输入 `中文abc` → `中文 abc`）
  - [ ] AC-002: `"` 输入后：行首 / 空格后输入时替换为 `"`，其他位置替换为 `"`
  - [ ] AC-003: `'` 输入后：行首 / 空格后输入时替换为 `'`，其他位置替换为 `'`
  - [ ] AC-004: 上述规则可通过设置 `preferences.inputAssist = false` 全局关闭
  - [ ] AC-005: 单元测试：验证中英混排场景下自动空格插入正确位置
- **deliverables**:
  - [ ] `apps/editor/src/editor/extensions/input-rules.ts` — 输入规则扩展
  - [ ] `apps/editor/src/__tests__/editor/input-rules.test.ts`
- **context_load**:
  - arch#§2.M-008
- **notes**: LOC_SIGNAL: 80

---

### T-068: 夜间模式风险提示

- **目标**: 实现 F-002 AC-003/AC-004 夜间模式风险提示：当用户启用深色主题或在夜间模式下预览时，展示"微信编辑器不保证深色模式渲染一致性"提示横幅。
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-010, T-018, T-020]
- **acceptance_criteria**:
  - [ ] AC-001: 当 `currentTheme.meta.dark === true` 时，PreviewPane 顶部显示 `NightModeWarningBanner`
  - [ ] AC-002: Banner 文案：`"深色主题在微信编辑器中可能显示不一致，建议在浅色模式下验证最终效果"`（F-002 AC-003）
  - [ ] AC-003: Banner 含关闭按钮，关闭后本次会话内不再显示（F-002 AC-004，`sessionStorage` 存储关闭状态）
  - [ ] AC-004: 浅色主题下 Banner 不渲染（`v-if` 条件）
  - [ ] AC-005: 关闭状态不持久化到 IndexedDB（仅 `sessionStorage`）
- **deliverables**:
  - [ ] `apps/editor/src/components/NightModeWarningBanner.vue` — 风险提示横幅组件
  - [ ] `apps/editor/src/components/PreviewPane.vue` — 更新：检测深色主题时显示 Banner
- **context_load**:
  - arch#§2.M-005
  - arch#§3.API-007
- **notes**: LOC_SIGNAL: 60

---

### T-069: P-004 设置页 — 编辑器偏好分组

- **目标**: 在 P-004 设置页增加「编辑器偏好」分组，包含输入辅助、字体选择、行高偏好等设置项。
- **task_kind**: feature
- **priority**: P2
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-042, T-066, T-067]
- **acceptance_criteria**:
  - [ ] AC-001: 「编辑器偏好」分组含 3 个设置项：输入辅助（toggle）、字体大小（14/16/18px 三档选择器）、行高（1.5/1.75/2.0 三档选择器）[ui-spec#§3.P-004]
  - [ ] AC-002: `preferences-store` 中 `inputAssist` 默认 `true`，`fontSize` 默认 `16`，`lineHeight` 默认 `1.75`
  - [ ] AC-003: 偏好变更通过 `preferences-store.updatePreferences(patch)` 持久化到 IndexedDB `preferences` store
  - [ ] AC-004: 字体大小变更实时作用于 CodeMirror editor（更新 `--editor-font-size` CSS 变量）
  - [ ] AC-005: 行高变更实时作用于 PreviewPane 的 `--preview-line-height` CSS 变量
- **deliverables**:
  - [ ] `apps/editor/src/pages/SettingsPage.vue` — 更新：新增 `EditorPreferencesSection` 组件引用
  - [ ] `apps/editor/src/components/settings/EditorPreferencesSection.vue` — 编辑器偏好分组组件
  - [ ] `apps/editor/src/stores/preferences-store.ts` — 补充 `inputAssist: boolean`、`fontSize: number`、`lineHeight: number` 字段
- **context_load**:
  - arch#§2.M-007
  - arch#§3.API-022
  - ui-spec#§3.P-004
- **notes**: LOC_SIGNAL: 120

---

### T-070: 版本三元组 + 确定性渲染验证

- **目标**: 实现版本三元组标记（`{ coreVersion, rulesetVersion, themeVersion }`）和确定性渲染验证工具（同输入 → 同 SHA-256 输出）。
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-037, T-057, T-063]
- **acceptance_criteria**:
  - [ ] AC-001: `getVersionTriple()` 返回三个字段均为 semver 字符串 [ARCH#§3]（versionTriple 字段契约 `{coreVersion, themeVersion, rulesetVersion}`，core 透传 + transport 层注入）
  - [ ] AC-002: `coreVersion` 来自 `packages/core/package.json#version`，`rulesetVersion` 来自 `packages/ruleset/package.json#version`，`themeVersion` 来自 `packages/theme-default/package.json#version`
  - [ ] AC-003: `verifyDeterminism(input, options, 3)` 运行渲染管道 3 次，比较 SHA-256，返回 `true` 表示一致
  - [ ] AC-004: MCP Tool `render_markdown` response 包含 `versionTriple` 字段 [ARCH#§3.API-001]
  - [ ] AC-005: 单元测试：`verifyDeterminism` 对确定性输入返回 `true`；对注入随机数的 mock 返回 `false`
- **deliverables**:
  - [ ] `packages/core/src/version.ts` — 导出 `getVersionTriple() → { coreVersion: string, rulesetVersion: string, themeVersion: string }`
  - [ ] `packages/core/src/deterministic.ts` — 更新：`verifyDeterminism(input, options, iterations?: number) → boolean`（运行 N 次，校验 SHA-256 一致）
  - [ ] `packages/core/src/__tests__/version.test.ts`
  - [ ] `packages/core/src/__tests__/deterministic.test.ts`
- **context_load**:
  - arch#§2.M-001
  - arch#§3.API-001
- **notes**: LOC_SIGNAL: 80

---

### T-071: MCP server 冷启动性能优化（P95 < 800ms）

- **目标**: 优化 MCP server stdio 模式冷启动延迟，使 P95 < 800ms（F-013 AC-006）。
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-036, T-037, T-038]
- **acceptance_criteria**:
  - [ ] AC-001: `cold-start.bench.ts` 测量 `import('mcp-server')` 到 `server.ready()` 的时间
  - [ ] AC-002: bench 结果 P95 ≤ 800ms（本地 M-series Mac 参考值；CI 环境可放宽 20%）
  - [ ] AC-003: `startup.ts` 中 Playwright / BullMQ 的加载使用动态 `import()` 而非顶层 `import`
  - [ ] AC-004: 单元测试：`startup.ts` 在 `SKIP_PLAYWRIGHT=1` 环境变量下不触发 Playwright 加载
- **deliverables**:
  - [ ] `packages/mcp-server/src/startup.ts` — 启动序列优化（惰性加载非必须模块）
  - [ ] `packages/mcp-server/src/bench/cold-start.bench.ts` — Vitest bench 冷启动基准测试
  - [ ] `packages/mcp-server/src/__tests__/startup.test.ts`
- **context_load**:
  - arch#§2.M-010
  - arch#§3.API-031
- **notes**: LOC_SIGNAL: 100

**优化策略**:
- 惰性加载 Playwright（仅 export Tools 调用时加载）
- 惰性加载 BullMQ（仅 job queue Tools 调用时加载）
- theme registry 延迟初始化（首次 `listThemes` 调用时加载）
- 预编译 remark pipeline 为单一 `unified` processor 实例（热路径避免重复 `.use()` 调用）

---

### T-072: MCP Tool Schema 弃用窗口工具

- **目标**: 实现 MCP Tool Schema 弃用标注和弃用窗口管理工具，支持未来字段/Tool 弃用的平滑迁移。
- **task_kind**: feature
- **priority**: P2
- **complexity**: small
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-037, T-038, T-039]
- **acceptance_criteria**:
  - [ ] AC-001: `markDeprecated(toolName, field, since, until)` 注册弃用记录到内存映射
  - [ ] AC-002: `checkDeprecations()` 返回 `DeprecationWarning[]`，每条含 `{ toolName, field, since, until, expired: boolean }`
  - [ ] AC-003: `expired: true` 条件：当前日期 > `until`
  - [ ] AC-004: MCP server 启动时调用 `checkDeprecations()`，若有 `expired: true` 条目 `console.warn` 输出提示
  - [ ] AC-005: 单元测试：注册弃用条目后 `checkDeprecations()` 返回正确 `expired` 状态
- **deliverables**:
  - [ ] `packages/mcp-server/src/deprecation.ts` — `markDeprecated(toolName, field, since, until)` + `checkDeprecations() → DeprecationWarning[]`
  - [ ] `packages/mcp-server/src/__tests__/deprecation.test.ts`
- **context_load**:
  - arch#§2.M-010
  - arch#§3.API-031
- **notes**: LOC_SIGNAL: 70

---

### T-085: skill/ Skill bundle（SKILL.md + prompts + resources）

- **目标**: 落地 F-013 AC-003 第三分发形态 Skill bundle，提供编排示例（list_themes → describe_block → render_markdown → register_variant → simulate_paste → upload_to_wechat_asset）；可作为 Claude Code 等 Agent 框架的 Skill 单元加载
- **模块**: skill/ 顶级目录
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-079, T-080, T-081, T-082, T-083, T-084, T-092, T-122]
- **acceptance_criteria**:
  - [ ] AC-001: `skill/SKILL.md` 存在，描述工具调用顺序与典型语义任务（写作初稿 → 排版 → variant 注册 → 粘贴模拟 → 素材库上传）
  - [ ] AC-002: `skill/prompts/` 含至少 3 个 prompt 片段（推荐主题 / 选 variant / 生成 callout）
  - [ ] AC-003: `skill/resources/` 含至少 2 个样例 Markdown 与主题示例
  - [ ] AC-004: Skill bundle 与 MCP server 共版本号发布（package.json version 与 @wechat-flow/mcp-server 对齐）
  - [ ] AC-005: 集成测试：mock 24 个 Tool 端点，按 SKILL.md 描述的顺序串调一次，全链路无异常（含 `describe_template`、`register_variant`）
- **deliverables**:
  - [ ] `skill/SKILL.md`
  - [ ] `skill/prompts/recommend-theme.md`
  - [ ] `skill/prompts/choose-variant.md`
  - [ ] `skill/prompts/build-callout.md`
  - [ ] `skill/resources/sample-tech-review.md`
  - [ ] `skill/resources/sample-poetry-essay.md`
  - [ ] `skill/package.json`
  - [ ] `tests/skill/orchestration.test.ts`
- **relates_to**: [F-013, M-009]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-013
  - arch-wechat-flow#§6.1
  - arch-wechat-flow-modules#§2.M-009

---

### T-086: 编辑器性能 benchmark（万字键入 P95 < 50ms / 主题切换 P95 < 200ms）

- **目标**: 落地 F-001 AC-009 与 PRD §3.1 性能基线 benchmark；CI 跑 benchmark 超阈值 fail
- **模块**: M-001 + M-002
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-009, T-026, T-029]
- **acceptance_criteria**:
  - [ ] AC-001: `tests/perf/typing-latency.ts` 输入 10000 字 Markdown，连续插入 1000 字符，P95 键入到 PreviewPane DOM 更新完成的延迟 < 50ms（本地 M-series Mac 参考）
  - [ ] AC-002: `tests/perf/theme-switch.ts` 切换 default↔magazine 主题，PreviewPane DOM 更新完成时间 P95 < 200ms
  - [ ] AC-003: CI 跑 benchmark 输出 perf-report.json，超阈值则 process.exit(1)
  - [ ] AC-004: 报告含 P50 / P95 / P99 + samples count + env (cpu / node version)
- **deliverables**:
  - [ ] `tests/perf/typing-latency.ts`
  - [ ] `tests/perf/theme-switch.ts`
  - [ ] `tests/perf/perf-runner.ts` — 通用 benchmark 帮手
  - [ ] `.github/workflows/perf.yml` — CI workflow
- **relates_to**: [F-001, M-001, M-002]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-001
  - prd-wechat-flow#§3.1
  - arch-wechat-flow#§5.1

---

### T-087: 主题装饰资产 + `{{tokenId}}` SVG 注入 + 上下文敏感渲染

- **目标**: 实现 F-003 AC-008（主题 `assets` 字典 + SVG 占位符注入）和 AC-009（上下文敏感渲染 — H2 在 callout 内/外样式不同 + heading 装饰策略）
- **模块**: M-002 + M-005
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-021, T-022]
- **acceptance_criteria**:
  - [ ] AC-001: 主题 manifest 含 `assets: Record<string, string>`（svg 字符串），渲染时 `{{tokenId}}` 占位符替换为对应 token 值（如 `{{color.brand}}` → `#a8322a`）[F-003 AC-008]
  - [ ] AC-002: H2 在 callout block 内 vs 外渲染不同 className：`h2.in-callout` vs `h2.standalone`；通过 `withinBlock(blockId)` 上下文标志判定 [F-003 AC-009]
  - [ ] AC-003: 主题可声明 heading 装饰策略（序号编码 / 章节标记 / 前缀装饰）覆盖默认六级标题视觉
  - [ ] AC-004: 主题切换后装饰资产跟随更新
- **deliverables**:
  - [ ] `packages/core/src/pipeline/decoration-injector.ts`
  - [ ] `packages/core/src/pipeline/context-aware-renderer.ts`
  - [ ] `packages/themes/default/src/assets/` — SVG 装饰资产
  - [ ] `tests/core/decoration.test.ts`
  - [ ] `tests/core/context-aware.test.ts`
- **relates_to**: [F-003, M-002, M-005]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-005

---

### T-088: 编辑器 paint drawer + color picker 双向绑定 frontmatter

- **目标**: 实现 F-003 AC-010 — paint drawer 暴露主题 paintable token，color picker 双向绑定 frontmatter `paint` 字段
- **模块**: M-001
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-029, T-042]
- **acceptance_criteria**:
  - [ ] AC-001: 触发 ContextMenu「自定义配色」打开 PaintDrawer，列出 `theme.paintable[]` 每项一个 color picker
  - [ ] AC-002: color picker 拾色 → 写入 frontmatter `paint: { 'color.accent': '#xxx' }`；触发渲染管线重跑后段
  - [ ] AC-003: 修改 frontmatter `paint` 字段（源码侧），PaintDrawer 内 picker 同步更新（双向绑定）
  - [ ] AC-004: 超出 paintable 范围的覆盖项产 yellow diagnostic 并在 DiagnosticsPanel 显示
- **deliverables**:
  - [ ] `apps/editor/src/components/paint/PaintDrawer.vue`
  - [ ] `apps/editor/src/composables/use-paint-binding.ts`
  - [ ] `tests/editor/paint-drawer.test.ts`
- **relates_to**: [F-003, M-001]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-001

---

### T-089: packages/ruleset 关键词 lint + 可热更新词库

- **目标**: 实现 F-011 AC-007 违规关键词检测；词库可热更新（rulesetVersion bump）
- **模块**: M-003
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-013]
- **acceptance_criteria**:
  - [ ] AC-001: lintMarkdown(content) 检测预设关键词（敏感词词库 keyword-list.json）返回 `Diagnostic[]`，每项含 ruleId / severity / matchedKeyword / location
  - [ ] AC-002: 词库 keyword-list.json 由 packages/ruleset 维护，bump 时 rulesetVersion 升 minor
  - [ ] AC-003: DiagnosticsPanel 显示关键词命中项，severity = 'warning'
  - [ ] AC-004: ContextMenu「检测违规词」入口可手动触发
- **deliverables**:
  - [ ] `packages/ruleset/src/lints/keyword-lint.ts`
  - [ ] `packages/ruleset/src/keyword-list.json` — 词库
  - [ ] `tests/ruleset/keyword-lint.test.ts`
- **relates_to**: [F-011, M-003]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-011
  - arch-wechat-flow-modules#§2.M-003

---

### T-090: 实地验证辅助脚本 + EVENT-LOG 回写

- **目标**: 实现 F-011 AC-008 实地验证辅助脚本 — 生成 HTML 测试用例供作者粘贴到微信草稿核对，验证结果回写 EVENT-LOG
- **模块**: 测试基础设施
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 6
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-057]
- **acceptance_criteria**:
  - [ ] AC-001: `scripts/realworld-verify.ts` 输出 5 主题 × 5 样本 HTML 到 `tests/realworld/output/{theme}/{sample}.html`
  - [ ] AC-002: 脚本运行后将验证结果（粘贴前/后 HTML 对比、命中规则、新发现差异）回写到 `docs/EVENT-LOG.jsonl`，event type `realworld_verify`
  - [ ] AC-003: 脚本支持 `--theme` 与 `--sample` 过滤参数
- **deliverables**:
  - [ ] `scripts/realworld-verify.ts`
  - [ ] `tests/realworld/samples/` — 5 篇样本输入
  - [ ] `tests/realworld/expected-template.html` — 期望 HTML 模板
- **relates_to**: [F-011]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-011

---

### T-113: [VALIDATION] Sprint 6 验证

- **目标**: Sprint 6 完成门禁，验证质量门禁 + 视觉回归基线全部通过。
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: small
- **sprint**: 6
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-056, T-057, T-058, T-059, T-062, T-063, T-085, T-086, T-087, T-088]
- **acceptance_criteria**:
  - [ ] **CI 全绿**：在 GitHub Actions 页面确认最新提交的 `ci.yml` workflow 状态为绿色（所有 jobs passed）
  - [ ] **规则集数量**：运行 `pnpm --filter ruleset exec node -e "const r = require('./dist'); console.log(r.listRules().length)"`，输出数字 ≥ 42
  - [ ] **E2E fixture 全绿**：运行 `pnpm -r test --filter core`，所有 fixture snapshot 通过，无 diff
  - [ ] **视觉回归基线 — 核心矩阵**：5 主题 × (8 P0 场景 + 8 综合场景) = 80 张基线截图存在于 `e2e/visual/snapshots/core/`；pixelmatch ratio ≤ 0.05 全绿（每 PR 必跑）
  - [ ] **视觉回归基线 — 全量 variant 抽样**：依据 T-058 AC-002 动态枚举生成的 `e2e/visual/snapshots/variant/` 目录非空；PR 抽样比例（默认 0.2）全绿；夜间 scheduled job 跑全量 `5 × listBlocks() × describeBlock(b).variants` 全绿（参考 R-004）
  - [ ] **主题守卫 9 维度**：运行 `pnpm -r test --filter theme-core`，全绿；在应用中加载 `theme-default` 的 `validateThemeGuard` 结果，`dimensions.every(d => d.passed) === true`
  - [ ] **跨运行时一致性**：运行 `pnpm test:cross-runtime`，cross-runtime 四 target SHA-256 一致测试全绿
  - [ ] **版本三元组**：在浏览器控制台运行 `import('/packages/core/dist/index.js').then(m => console.log(m.getVersionTriple()))`，输出含 3 个 semver 字符串的对象
  - [ ] **Block 数量**：listBlocks().length ≥ 40 断言通过
  - [ ] **Variant 数量**: `listAllVariants().length >= 120` 断言通过；8 类核心 Block 配额满足
  - [ ] **性能 benchmark**：`pnpm bench` 输出 P95 键入 < 50ms 与主题切换 < 200ms
  - [ ] **Skill bundle**：`skill/SKILL.md` 文件存在，`tests/skill/orchestration.test.ts` 集成测试通过
  - [ ] **撤销/重做**：在 SourcePane 输入 3 个字符后 `Ctrl+Z` 3 次，文本恢复到输入前状态
  - [ ] **P-004 编辑器偏好**：访问 `/settings`，切换字体大小为 18px，SourcePane 字号立即变为 18px；刷新页面后偏好保持

**通过条件**:
- 以上 13 项全部观测到预期结果，Sprint 6 判定为 DONE。
