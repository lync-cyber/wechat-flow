---
id: "dev-plan-wechat-flow-s6"
doc_type: dev-plan
author: tech-lead
status: approved
consumers: [developer, qa-engineer]
version: "0.6.3"
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
  - ui-spec-wechat-flow-uc001-uc014
  - ui-spec-wechat-flow-p001-p005
---

# Dev-Plan wechat-flow — Sprint 6 任务卡

[NAV]
- Sprint 6 任务卡 → T-056..T-064, T-066..T-072, T-085..T-090, T-104, T-113, T-130, T-131
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
  - [x] AC-001: DiagnosticsPanel 在 ≥ 20 条目下无截断溢出，滚动区高度由 `--panel-max-h: 40vh` 限定
  - [x] AC-002: 深色背景 `--color-surface-dark` 与前景色对比度 ≥ 4.5:1（WCAG AA）
  - [x] AC-003: 所有 token 命名遵循 `arch#§6` token 命名约定（`--{category}-{role}-{variant?}`）
  - [x] AC-004: Penpot frame 导出图附路径 `docs/design/dark-theme-preview.png`
- **deliverables**:
  - [x] DiagnosticsPanel 高密度稿（≥ 20 条诊断项）截图导出
  - [x] `tokens/dark-theme-draft.json`（深色 token 映射草稿，满足 WCAG AA 对比度）
  - [x] Penpot frame 标注：`PS-007-dark-surface` / `PS-008-dark-accent` token 值
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
  - [x] AC-001: 内置规则集 `builtinRules.length` ≥ 42 [ARCH#§2.M-003]
  - [x] AC-002: 每条新规则含 `id` / `scope: RuleScope` / `priority` / `matcher` / `transform` 字段 [ARCH#§2.M-003]
  - [x] AC-003: 新 strip 规则命中时移除目标属性/声明并保留其余声明 [ARCH#§2.M-003]
  - [x] AC-004: `getRulesetVersion()` 返回合法 semver 且与 `package.json#version` 一致（全项目版本基线统一 bump 归发布期）
  - [x] AC-005: 17 条新规则各覆盖正常命中 + 无命中 + 边界（空 style / 嵌套 / NaN）单元测试
  - [x] AC-006: ruleset 测试全绿（`pnpm vitest run tests/ruleset/` 137 passed）
- **deliverables**:
  - [x] `packages/ruleset/src/rules/builtin/strip-*.ts` — 5 条新 strip 规则（ARCH M-003 扁平 builtin/ 约定）
  - [x] `packages/ruleset/src/rules/builtin/clamp-*.ts` — 6 条新 clamp 规则（+ `clampPxProp` 共享 helper 去重）
  - [x] `packages/ruleset/src/rules/builtin/transform-*.ts` — 6 条新 transform 规则
  - [x] `packages/ruleset/src/rules/builtin/index.ts` — 注册全部 42 条规则
  - [x] `tests/ruleset/{strip,clamp,transform}-rules-extended.test.ts` + `ruleset-count-version.test.ts` — 每类规则独立测试文件（根 tests/ 相对 import 约定）
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
  - [x] AC-001: `renderMarkdown(fixtureInput, { themeId: 'default' })` 输出 HTML 与 `.html` 快照字节一致（SHA-256 匹配）[ARCH#§3.API-001]
  - [x] AC-002: 快照数量 ≥ 10 个独立场景（13 个 fixture）
  - [x] AC-003: 所有快照输出不含 `<style>` / `<script>` 标签（sanitize 阶段生效）[ARCH#§2.M-002]
  - [x] AC-004: `simulatePaste` 阶段后 `droppedAttrs` 不含允许白名单内的属性（验证 M-004 正确性）[ARCH#§2.M-004]
  - [x] AC-005: 快照更新命令：`pnpm test:update-snapshots`（跨平台 node wrapper，更新时需手动 review diff）
  - [x] AC-006: 测试经根 vitest（`pnpm vitest run`，include `tests/**/*.test.ts`）全绿，新 fixture 测试含在内
- **deliverables**:
  - [x] `tests/core/e2e/fixtures/` — fixture 目录，含 13 个 `.md` 输入 + 13 个 `.html` 快照（根 `tests/` 约定，与 T-059 一致）
  - [x] `tests/core/e2e/e2e-render.test.ts` — fixture 驱动的 E2E 测试（SHA-256 字节比对 + `UPDATE_SNAPSHOTS` 写盘接缝）
  - [x] `scripts/update-e2e-snapshots.mjs` + 根 `package.json#scripts.test:update-snapshots` — 跨平台快照更新入口
  - [x] fixture 覆盖场景：基础 heading/paragraph/list、Block directive（callout）、Mark directive、frontmatter paint 覆写、空文档、超长段落（> 5000 字符）、中文混排 + h1–h6/有序无序列表/blockquote+code/gfm 表格/frontmatter theme
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
  - [x] AC-001: 覆盖 5 个主题：`default`、`magazine`、`literary`、`business`、`tech` [ARCH#§2.M-005]
  - [x] AC-002: 动态枚举 story：foreach block in listBlocks() × foreach variant in describeBlock(b).variants × foreach theme；sampleRatio 由 ruleset 配置（默认 0.2）
  - [x] AC-003: pixelmatch ratio ≤ 0.05（与 PRD §1.3 5% 同口径，threshold 0.2, includeAA: false）
  - [x] AC-004: 基线截图提交到 `e2e/visual/snapshots/` 目录，文件命名 `{theme}-{scene}.png`
  - [x] AC-005: `pnpm test:visual` 首次运行（无基线）自动生成基线；后续运行与基线对比
  - [x] AC-006: CI matrix 分两 job：visual-core（每 PR 必跑核心矩阵）+ visual-sampled（PR 抽样）
  - [x] AC-007: nightly scheduled job 跑全量 variant 矩阵
  - [x] AC-008: 视觉回归矩阵覆盖前断言 `registry.listAllVariants().length >= 120`；不足时 fail-fast，避免在残缺 registry 上跑回归
- **deliverables**:
  - [x] `e2e/visual/` — Playwright 视觉回归测试目录
  - [x] `e2e/visual/theme-matrix.spec.ts` — 5 主题 × 场景矩阵测试
  - [x] `e2e/visual/variant-matrix.spec.ts` — 全量 variant 动态枚举测试
  - [x] `e2e/visual/snapshots/` — 基线截图目录（`.png`，提交到 git）
  - [x] `playwright.config.ts` — 视觉回归专用配置（threshold: 0.2，includeAA: false，`--update-snapshots` flag）
  - [x] `packages/theme-*/src/__stories__/` — 每个主题的 Storybook/fixture HTML story 文件（供 Playwright 抓取）
- **context_load**:
  - arch#§2.M-005
  - arch#§2.M-006
  - arch#§6

---

### T-059: 主题守卫 9 维度完整实现（PRD F-011 AC-003）

- **目标**: 将 `validateThemeGuard` 从 2 维真实 + 6 维 stub（`eight-dimensions.ts`）扩展为 PRD F-011 AC-003 权威 9 维完整实现，重命名主文件为 `nine-dimensions.ts`，并新增第 9 维 `template-completeness`（委托 `validateThemeTemplates`）。同步修复 magazine 主题的真实 WCAG 对比度缺陷（详见"预期失败清单"小节）。
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
  - [x] AC-001: `validateThemeGuard(theme) → GuardResult` 保持现有契约形状 `{ passed: boolean, failures: GuardFailure[] }`（`packages/contracts/src/theme/theme-definition.ts` 中 `guardResultSchema` 不改形状）；`passed = failures.filter(f => f.severity === 'error').length === 0`；每个失败维度产出一条 `GuardFailure{ dimension: string, severity: 'error'|'warning'|'info', message?: string }`，`dimension` 字段值严格取 9 维枚举之一（见下方"9 维守卫"小节）[ARCH#§2.M-005]
  - [x] AC-002: `wcag-contrast` 维度（对应 PRD 第 7 维，权威来源：WCAG 2.1 §1.4.3）：WCAG 2.1 相对亮度公式 L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin（sRGB 线性化：c ≤ 0.04045 → c/12.92，c > 0.04045 → ((c+0.055)/1.055)^2.4），对比度 = (L_lighter + 0.05)/(L_darker + 0.05)；须校验以下**全部**关键色对，任一对比度 < 4.5 产 `severity: 'error'`，`message` 列出违规色对及实际比值：(a) `--color-text-primary` vs `--color-background`，(b) `--color-text-secondary` vs `--color-background`，(c) `--color-link` vs `--color-background`，(d) `--color-code-text` vs `--color-code-bg`，(e) `--color-text-secondary` vs `--color-quote-bg`；上述任一 token 对缺失时等同违规产 error；[ASSUMPTION] 大字号（≥ 18px 或 ≥ 14px bold）降阈 ≥ 3.0 由 T-061 可读性检查规则覆盖，本维度仅校验正文级对比度 4.5 基准
  - [x] AC-003: `token-coverage` 维度（对应 PRD 第 3 维，权威来源：PRD F-003 AC-004）：`theme.tokens` 中 key 总数 ≥ 60，且覆盖 color / spacing / font / decoration / alignment 五类（key 前缀分别为 `--color-` / `--spacing-` / `--font-` / `--decoration-` / `--align-`，每类 ≥ 1 key 即算覆盖）；不满足时产 `severity: 'error'`，`message` 列出未覆盖类别及实际 token 总数
  - [x] AC-004: `metadata-completeness` 维度（对应 PRD 第 5 维）：`theme.meta.author` 存在且非空字符串；`theme.meta.wcagContrast.checked === true`；任一缺失产 `severity: 'error'`
  - [x] AC-005: `baseline-selector-density` 维度（对应 PRD 第 1 维，权威来源：arch §2.M-005 + 渲染管线 `inline-style.ts` 标签路径）：`theme.blocks` 须覆盖文档基线排版块级元素（渲染管线对其施加 tag-path 主题样式的排版骨架）：`h1` / `h2` / `h3` / `h4` / `h5` / `h6`、`p`、`blockquote`、`code`、`hr`；缺失任一 key 即产 `severity: 'error'`，`message` 列出缺失 key。注：list（ul/ol/li）/ `a` / `img` / `table` 等内容元素的主题 inline 样式属独立 theme-enhancement 范畴（已登记 Sprint 6 backlog，见 EVENT-LOG），不在本维度；PRD F-003 AC-012 的「9 基础元素内容覆盖」由维度 9 `template-completeness` 保证（template 正文须演示全部 9 元素），与本维度（主题选择器样式覆盖）正交
  - [x] AC-006: `core-block-coverage` 维度（对应 PRD 第 2 维，权威来源：PRD F-003 AC-012 核心 Block 容器白名单 ≥ 6 种）：调用 `listBlocks()`（`packages/core/src/registry/block.ts`）取全局注册列表；注册列表为空时 vacuously pass（不产 failure 条目）；注册列表非空时，计算 `theme.blocks` 中命中注册 blockId 的比例，< 0.5（50%）产 `severity: 'warning'`，`message` 含实际覆盖率；[ASSUMPTION] PRD F-003 AC-012 要求每 template 覆盖 ≥ 6 种核心 Block，但 theme.blocks 对 Block 的样式覆盖独立于此要求（Block 可无样式覆盖，复用继承默认），本维度阈值 < 50% 产 warning 而非 error，避免 Block 注册全量但主题未逐个声明样式时误阻 CI；当 `@wechat-flow/blocks` 未在进程中 import 时注册列表为空触发 vacuously pass
  - [x] AC-007: `cross-theme-identity-token-collision` 维度（对应 PRD 第 4 维，权威来源：CIEDE2000 / CIE76 感知色差标准）：检测跨已注册主题的 `--color-brand` token 色差；色差计算使用 CIE 1976 ΔE（Lab 色彩空间）公式：将 sRGB hex 转换为 XYZ（D65 参考白点）再转 Lab，ΔE_76 = sqrt((ΔL*)²+(Δa*)²+(Δb*)²)，阈值 ΔE_76 > 10（远超 ~2.3 JND，确保跨主题有感知差异）；调用 `listThemes()` 遍历已注册主题，当前主题 `--color-brand` 与任一已注册主题品牌色 ΔE_76 ≤ 10 时产 `severity: 'warning'`，`message` 含碰撞主题 id 及实际 ΔE 值；当前主题无 `--color-brand` token 或 `listThemes()` 返回空列表时 vacuously pass
  - [x] AC-008: `theme-css-property-compliance` 维度（对应 PRD 第 6 维，权威来源：arch §2.M-005 token taxonomy `--{category}-{role}(-{modifier})*`）：所有 token key 须满足该格式（正则 `/^--[a-z][a-z0-9]*(-[a-z0-9]+)+$/`：category 首段必字母起首——taxonomy 仅 color/spacing/font/decoration/align 五类，均字母起首；role/modifier 段按 CSS 自定义属性惯例允许数字起首的刻度名如 `2xl`/`3xl`/`h1`，这是 Tailwind/Open Props 等设计系统的普适尺寸刻度命名，且 CSS `<custom-property-name>` 规范允许 ident 数字段。注：arch §7.1 命名规范不涵盖 token，本维度权威唯一来源为 §2.M-005 taxonomy）；违规 key 产 `severity: 'error'`（违规 token 命名意味着与 arch 契约不符，绑不到渲染管线的样式注入点），`message` 列出所有违规 key
  - [x] AC-009: `decorative-asset-completeness` 维度（对应 PRD 第 8 维，权威来源：PRD F-003 AC-008）：PRD AC-008 将 `assets` 声明为主题**可选功能**（"主题可声明 assets 字典"），因此当 `theme.assets` 为空对象或 undefined 时为合规状态，不产 failure；当 `theme.assets` 含已声明项时，每项 value 须为非空字符串（代表内联 SVG 或有效占位符），否则产 `severity: 'error'`（声明了但为空等同于损坏的资产引用），`message` 列出 value 为空的 key
  - [x] AC-010: `template-completeness` 维度（对应 PRD 第 9 维，权威来源：PRD F-003 AC-012 + F-011 AC-009）：委托 `validateThemeTemplates(theme.id)` 执行（位于 `packages/core/src/theme-guard/template-coverage.ts`）；`listThemeTemplates(theme.id)` 返回空列表时 `validateThemeTemplates` 本身返回 `pass: false`（见源码实现），产 `severity: 'error'`（PRD F-003 AC-012 明确要求每内置主题 ≥ 1 template，空 template 是真实缺陷）；`validateThemeTemplates.pass === false` 且 template 列表非空时产 `severity: 'error'`，`message` 列出 `failingTemplates`
  - [x] AC-011: 5 套内置主题经 magazine 对比度修复后，调用 `validateThemeGuard(theme)` 后 `result.passed === true`，`result.failures` 中无任何 `severity: 'error'` 条目；Given 修复后的主题结构（baseline 排版元素齐全 / 60 tokens / 5 关键色对达标 / meta 齐全 / template 非空），When 调用 `validateThemeGuard(theme)`，Then `result.passed === true`（core-block-coverage 可能产 warning，不影响 passed）
  - [x] AC-012: 单元测试覆盖：每维度各一个正向用例（产出 0 error）+ 一个负向用例（产出 ≥ 1 failure）；测试位于 `packages/core/src/__tests__/guard/` 各自独立测试文件；`pnpm vitest run` 全绿
  - [x] AC-013: `packages/core/src/guard/eight-dimensions.ts` 不再存在（已被 `nine-dimensions.ts` 替代）；`packages/core/src/guard/index.ts` 重新导出 `validateThemeGuard`；既有 `tests/themes/theme-guard.test.ts` import 路径迁移到 `../../packages/core/src/guard/index.ts`；`theme-guard.test.ts` 中 `result.passed === true` 断言在 5 套主题修复后仍成立（不是放水阈值，是真实无缺陷）
- **deliverables**:
  - [x] `packages/core/src/guard/nine-dimensions.ts` — 9 维聚合实现，替换 `eight-dimensions.ts`（删除旧文件）
  - [x] `packages/core/src/guard/dimensions/baseline-selector-density.ts`
  - [x] `packages/core/src/guard/dimensions/core-block-coverage.ts`
  - [x] `packages/core/src/guard/dimensions/token-coverage.ts`
  - [x] `packages/core/src/guard/dimensions/cross-theme-identity-token-collision.ts`
  - [x] `packages/core/src/guard/dimensions/metadata-completeness.ts`
  - [x] `packages/core/src/guard/dimensions/theme-css-property-compliance.ts`
  - [x] `packages/core/src/guard/dimensions/wcag-contrast.ts`
  - [x] `packages/core/src/guard/dimensions/decorative-asset-completeness.ts`
  - [x] `packages/core/src/guard/dimensions/template-completeness.ts`
  - [x] `packages/core/src/guard/contrast.ts` — WCAG 2.1 相对亮度 + 对比度工具函数（被 `wcag-contrast.ts` 与 T-061 共享）
  - [x] `packages/core/src/guard/lab.ts` — sRGB → XYZ → Lab 转换 + CIE76 ΔE 工具函数（被 `cross-theme-identity-token-collision.ts` 使用）
  - [x] `packages/core/src/guard/index.ts` — 聚合导出 `validateThemeGuard`，import 路径由 `eight-dimensions` 改为 `nine-dimensions`
  - [x] `packages/core/src/__tests__/guard/` — 9 个维度各一个测试文件（正向 + 负向用例）
  - [x] 主题真实缺陷修复：`packages/themes/magazine/src/tokens.ts` 中 `--color-link` 调整为对 `--color-background` (#FFFBF7) 对比度 ≥ 4.5 的值（当前 #D4521A = 4.06，WCAG AA 不达标）
  - [x] `tests/themes/theme-guard.test.ts` — import 路径迁移到 `../../packages/core/src/guard/index.ts`；移除针对 stub 维度的隐式假设，保持 `result.passed === true` 断言（修复后真实无 error）
  - [x] `packages/core/src/guard/` 目录下不存在 `eight-dimensions.ts`
- **context_load**:
  - prd#§2.F-003
  - prd#§2.F-011
  - arch#§2.M-005
- **notes**: LOC_SIGNAL: 280（9 维实现 + contrast.ts/lab.ts 工具 + magazine token 单点修复；list/a/img/table 主题样式已拆出至独立 backlog）

**9 维守卫**（PRD F-011 AC-003 / arch M-005 `guard/nine-dimensions.ts` 权威维度名及客观阈值）:

- 1. `baseline-selector-density` — 权威来源：arch §2.M-005 + 渲染管线 `inline-style.ts` 标签路径。`theme.blocks` 须覆盖基线排版块级元素 h1/h2/h3/h4/h5/h6/p/blockquote/code/hr；缺失任一产 error。内容元素 list/a/img/table 的主题样式属独立 theme-enhancement（见 backlog），9 基础元素内容覆盖由维度 9 保证。
- 2. `core-block-coverage` — 权威来源：PRD F-003 AC-006 Block 注册表（`listBlocks()` 返回）。`theme.blocks` 中命中注册 blockId 的比例 < 50% 产 warning；注册表为空时 vacuously pass；[ASSUMPTION] 主题对 Block 样式的覆盖是可选的（Block 有继承默认样式），故阈值为 warning 而非 error，与 template 完整性（error）区分。
- 3. `token-coverage` — 权威来源：PRD F-003 AC-004（≥ 60 token + 五类齐全）。`theme.tokens` key 总数 < 60 或五类（--color-/--spacing-/--font-/--decoration-/--align- 前缀）任一缺失产 error。
- 4. `cross-theme-identity-token-collision` — 权威来源：CIE 1976 ΔE_76（感知均匀色差标准，阈值 ΔE_76 > 10 确保感知区分远超 JND = ~2.3）。sRGB hex → XYZ(D65) → Lab 转换后计算 ΔE_76；碰撞（≤ 10）产 warning；无 `--color-brand` token 或注册主题为空时 vacuously pass。
- 5. `metadata-completeness` — `meta.author` 非空 + `meta.wcagContrast.checked === true`；缺失产 error。
- 6. `theme-css-property-compliance` — 权威来源：arch §2.M-005 token taxonomy `--{category}-{role}(-{modifier})*`（§7.1 命名规范不涵盖 token，不作来源）。所有 token key 须匹配 `/^--[a-z][a-z0-9]*(-[a-z0-9]+)+$/`：category 首段字母起首，role/modifier 段允许数字起首刻度名 `2xl`/`3xl`/`h1`（CSS 自定义属性惯例）；违规产 error（违规 key 在渲染管线中无法绑定样式注入点）。
- 7. `wcag-contrast` — 权威来源：WCAG 2.1 §1.4.3 AA（正文对比度 ≥ 4.5）。须校验 5 个关键色对（见 AC-002）；任一 < 4.5 产 error。
- 8. `decorative-asset-completeness` — 权威来源：PRD F-003 AC-008（`assets` 为可选功能）。空 `assets` 合规；已声明项 value 为空字符串产 error（损坏的资产引用）。
- 9. `template-completeness` — 权威来源：PRD F-003 AC-012 + F-011 AC-009（每内置主题 ≥ 1 template，每 template 覆盖全部基础元素 + ≥ 6 核心 Block）。委托 `validateThemeTemplates(theme.id)`（`packages/core/src/theme-guard/template-coverage.ts`）；`pass === false` 产 error（含 template 列表为空时，因 `validateThemeTemplates` 在空列表时返回 `pass: false`）。

**预期失败清单**（客观阈值下 5 套主题的诚实审计）:

| 主题 | 维度 | 失败原因 | 分类 |
|------|------|---------|------|
| all (5套) | `baseline-selector-density` | `theme.blocks` 已覆盖基线排版元素 h1-h6/p/blockquote/code/hr（含 `a`）；本维度收窄为排版骨架后**通过** | **通过**。list/img/table 内容元素的主题 inline 样式缺口拆为独立 theme-enhancement backlog（见 EVENT-LOG），不在 T-059 范畴 |
| magazine | `wcag-contrast` | `--color-link` (#D4521A) vs `--color-background` (#FFFBF7) 对比度 4.06 < 4.5（WCAG AA 失败）；其余 4 个关键色对均通过 | **(a) 真实主题缺陷**，deliverables 中 `magazine/src/tokens.ts` 需调整 `--color-link` 到 ≥ 4.5 |
| all (5套) | `core-block-coverage` | 依赖 `listBlocks()` 是否在调用时已含 `@wechat-flow/blocks` 注册；`packages/blocks` 包已实现并在 import 时自动注册 40+ blocks；若测试环境不 import blocks 包则触发 vacuously pass，若 import 则按注册列表校验覆盖率 | **(b) 时序依赖缺口**：blocks 注册表已实现（Sprint 5 完成），但 `validateThemeGuard` 是否接收到注册好的 `listBlocks()` 取决于调用方是否 import `@wechat-flow/blocks`；口径：`listBlocks()` 非空时主题 `theme.blocks` 命中率 < 50% 产 warning（不 error），修复后 5 套主题加入 list/a/img/table 后覆盖率仍远低于 40 个注册 Block，预计产 warning 不阻 CI |
| all (5套) | `template-completeness` | 5 套主题各有 ≥ 1 template（default/magazine/literary/business/tech 均已注册）；starter.generated.ts 内容覆盖全部 9 基础元素 + 6 核心 Block，经 `validateThemeTemplates` 校验应 `pass: true` | **通过**（无失败） |
| all (5套) | `metadata-completeness` / `token-coverage` / `theme-css-property-compliance` / `decorative-asset-completeness` | 均满足客观阈值 | **通过** |

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
  - [x] AC-001: `loadPatchBundle(url)` 从 URL 加载 JSON 格式补丁包，schema: `{ version: string, patches: RuleDefinition[] }`（`version` 语义 = 微信客户端版本号，ARCH M-003）
  - [x] AC-002: `applyPatchBundle(bundle)` 将补丁规则注入运行时规则列表，`getRules()` 立即反映新规则
  - [x] AC-003: 补丁加载失败（网络错误 / schema 校验失败）时：`loadPatchBundle` / `applyPatchBundle` 抛出 `PatchLoadError`，校验全过后才注入（原子性），已有规则不受影响
  - [x] AC-004: 同一 `rule.id` 的补丁规则覆盖已有同 id 规则（热修复 upsert 语义，非追加）
  - [x] AC-005: `pnpm vitest run tests/ruleset/` 全绿（184 tests / 11 files）
- **deliverables**:
  - [x] `packages/ruleset/src/patch-loader.ts` — `loadPatchBundle(url: string): Promise<PatchBundle>` + `applyPatchBundle` + `PatchLoadError`
  - [x] `packages/ruleset/src/rules/registry.ts` — `upsertRule`（id 去重替换，支撑 AC-004）
  - [x] `packages/ruleset/src/index.ts` — re-export `loadPatchBundle` / `applyPatchBundle` / `PatchBundle` / `PatchLoadError`
  - [x] `tests/ruleset/patch-loader.test.ts`（根 `tests/` 约定，17 tests）
- **context_load**:
  - arch#§2.M-003
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
  - [x] AC-001: 3 条规则 `severity` 分别为 `warning` / `warning` / `info`，`scope: 'lint'`（`RuleScope` 无 `'node'`；可读性规则经 `executeLint` 逐节点 `diagnose`，scope 为 `'lint'`）
  - [x] AC-002: 命中时 `Diagnostic.message` 包含具体数值（实际值 vs 阈值），如 `"font-size: 10px < min 12px"`
  - [x] AC-003: 不命中时 matcher 返回 false（不产诊断）
  - [x] AC-004: 单元测试：每条规则正向 + 负向 + 边界用例（30 测试）
  - [x] AC-005: `pnpm vitest run tests/ruleset/` 全绿（root vitest 约定）
- **deliverables**:
  - [x] `packages/ruleset/src/rules/readability/` — 3 条可读性规则（font-size/line-height/paragraph-length）+ `index.ts` 导出 `readabilityRules`
  - [x] `packages/ruleset/src/rules/builtin/index.ts` — spread `readabilityRules` 进 `ALL_RULES`，集成诊断管道（`builtinRules.length` 42→45）
  - [x] `tests/ruleset/readability-rules.test.ts`（根 `tests/` 约定，与 T-056 同目录）
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
  - [x] AC-001: arch#§7.4 任务图 `lint → typecheck → unit-test → ruleset-fixture → cross-runtime → theme-guard → visual-regression` 完整覆盖（任务图编码于 `turbo.json`；`ci.yml` 合并执行前三阶段 + `cross-runtime`/`guards` 并行 job + visual PR-only workflow）
  - [x] AC-002: lint 经 `pnpm lint`（turbo → biome check）
  - [x] AC-003: typecheck 经 `pnpm typecheck`（turbo per-package `tsc --noEmit` + `tsc -p tests/tsconfig.json`，比卡片 `pnpm -r tsc` 多覆盖根 tests 类型）
  - [x] AC-004: unit-test 经 `pnpm test:coverage`（根 vitest 全套件 + 覆盖率阈值，比卡片 `pnpm -r vitest` 多覆盖根 `tests/**`）
  - [x] AC-005: ruleset-fixture 100% 门禁由根 vitest `tests/ruleset/` 承载（随 unit-test 执行；arch#§7.4 门禁「规则集 fixture 100% 通过」）
  - [x] AC-006: `cross-runtime` job 运行 T-063 跨运行时一致性测试（本 job 由 T-063 预置）
  - [x] AC-007: theme-guard（主题 9 维）由根 vitest `tests/core/guard/` 承载（随 unit-test 执行；arch#§7.4 门禁「主题 9 维守护通过」）
  - [x] AC-008: 视觉回归 `visual-core.yml` + `visual-sampled.yml` 仅 PR 触发、跑 playwright 视觉矩阵、`if: always()` 上传 `playwright-report/`（含 diff）为 artifact
  - [x] AC-009: 全部 job `ubuntu-latest`、Node 22（arch#§7.4 权威 LTS）、pnpm 9.15.9
  - [x] AC-010: `ci.yml` workflow 级 `env` 读取 `TURBO_TOKEN` + `TURBO_TEAM`（arch#§7.4 远程缓存；secrets 缺失时 turbo 优雅回落本地 `.turbo`）
- **deliverables**:
  - [x] `.github/workflows/ci.yml` — quality-gate（lint+typecheck+coverage）+ cross-runtime + guards + workflow 级 Turbo 远程缓存 env
  - [x] 视觉回归 workflow —— 实际为 `visual-core.yml` + `visual-sampled.yml`（PR trigger）+ `visual-nightly.yml`（cron）+ `visual-update.yml`（dispatch）（T-058 已建；卡片单文件 `visual-regression.yml` 路径漂移）
  - [x] `turbo.json` — 任务图已含完整 7 阶段（含 `visual-regression` pipeline），本任务无需再改
- **context_load**:
  - arch#§7
- **notes**: **漂移裁决（orchestrator，权威=arch#§7.4）**：卡片 AC-002/003/004/005/007 把 arch#§7.4 概念任务图翻成 `pnpm -r <cmd>` 具体命令，与项目实际 scripts 不兼容且**会 regress**——`pnpm -r tsc` 漏 `tests/tsconfig.json`、`pnpm -r vitest` 漏根 `tests/**` 与 coverage 阈值、`--filter ruleset`/`theme-core` 包名不存在（这些测试集中在根 `tests/`）。按「不为对齐字面 AC 而降级」原则，以 arch#§7.4 为准：任务图（turbo.json）+ 门禁（ruleset 100% / 主题 9 维 / 视觉 ≤5%）+ 远程缓存 + Linux Node 22 均已满足，job 保持合并结构（用户裁决，避免 6× install + 质量回归）。AC-008 视觉回归实为 `visual-core`/`visual-sampled` 拆分（T-058），非单 `visual-regression.yml`；视觉测试实路径 `e2e/visual/`。均登记 §deliverable 路径漂移聚合。

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
  - [x] AC-001: 4 个运行时对同一 Markdown 输入 + 同一 `themeId` 产出 HTML 的 SHA-256 一致 [ARCH#§3.API-001]
  - [x] AC-002: 测试覆盖 ≥ 3 个不同 Markdown fixture（含 CJK 字符、Block directive、frontmatter）
  - [x] AC-003: 使用 `crypto.subtle.digest('SHA-256', ...)` 计算（跨运行时兼容）
  - [x] AC-004: Edge 测试通过 `@cloudflare/vitest-pool-workers` 在 Miniflare 中运行
  - [x] AC-005: `pnpm test:cross-runtime` 全绿
  - [x] AC-006: Vitest browser mode import @wechat-flow/core，跑同 fixture，SHA-256 与 node/worker/edge 三 target 一致
  - [x] AC-007: CI matrix 加 browser job
- **deliverables**:
  - [x] `tests/cross-runtime/` — 跨运行时一致性测试（路径漂移见 notes）
  - [x] `tests/cross-runtime/node.test.ts` — Node 运行时
  - [x] `tests/cross-runtime/worker.test.ts` — Web Worker（Vitest browser mode + `new Worker`）+ `worker-entry.ts`
  - [x] `tests/cross-runtime/edge.test.ts` — Edge Runtime（`@cloudflare/vitest-pool-workers`）
  - [x] `tests/cross-runtime/browser.test.ts` — 浏览器主线程
  - [x] `tests/cross-runtime/fixtures.ts` — 共享 fixtures + `computeFixtureHashes` + golden `EXPECTED_HASHES`
  - [x] `vitest.cross-runtime.{node,browser,edge}.config.ts` — 三运行时专用配置
  - [x] `scripts/gen-cross-runtime-hashes.ts` + `package.json` scripts（`test:cross-runtime` / `gen:cross-runtime-hashes`）
  - [x] `.github/workflows/ci.yml` — `cross-runtime` job（含 Playwright chromium 安装）
- **context_load**:
  - arch#§2.M-001
  - arch#§3.API-001
  - arch#§7
- **notes**: **deliverable 路径漂移裁决**：卡片原 `packages/core/src/__tests__/cross-runtime/` 与项目约定冲突——根 `tests/` 目录由 `tests/tsconfig.json` 独立管辖，测试置于 `packages/core/src` 下会被 coverage/typecheck/biome 当作源码并被默认 node runner 误跑；故落 `tests/cross-runtime/`，根 `vitest.config.ts` 排除该目录，四 target 各自专用配置驱动。**单实例不变量**：fixtures 相对引 core + blocks 内部包名引 core 经 Vite real-path 去重为同一实例，避免主题注册表分裂。**worker 兼容修复**：`decode-named-character-reference`（micromark 依赖）的 `browser` 入口在模块顶层 `document.createElement`，Web Worker 无 document 即抛；其 `worker`/`workerd`/`default` 入口用静态映射解码、输出字节一致，browser 配置以 `resolve.alias` 强制指向 node 入口。**golden 契约**：四 target 均比对 `EXPECTED_HASHES`（node 实测生成），全等 ⟹ 四运行时字节一致。**依赖**：`@cloudflare/vitest-pool-workers@0.5.41`（peer vitest 2.0-2.1）+ `@vitest/browser@2.1.9`（peer playwright，复用 T-058 已装 1.61）。

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
  - [x] AC-001: `listDocuments()` 返回 `DocumentMeta[]`，含 `{ id, title, updatedAt, size }`（size = `TextEncoder` 编码字节数）[ARCH#§2.M-013]
  - [x] AC-002: `deleteDocument(id)` 删除 IndexedDB `documents` store 中对应记录及其所有备份快照（级联 `deleteBackupsForDoc`）
  - [x] AC-003: 自动备份：文档 dirty（自上次备份后有变更）且距上次备份 ≥ 5 分钟时触发 `createBackup(docId)`
  - [x] AC-004: 备份保留策略：同一文档最多保留 5 份，超出时删除最旧备份（`MAX_BACKUPS_PER_DOC`）
  - [x] AC-005: `use-auto-backup.ts` 在 `onUnmounted` 时 clearInterval 防止内存泄漏
  - [x] AC-006: 单元测试覆盖备份保留策略（插入第 6 份时验证最旧备份被删除）
- **deliverables**:
  - [x] `packages/core/src/storage/indexeddb-adapter.ts` — DB_VERSION 1→2、新增 `backups` store（index `by_docId`）、`BackupRecord` 接口、`DocumentMeta.size`
  - [x] `packages/core/src/backup/auto-backup.ts` — `createBackup` / `listBackups` / `deleteBackupsForDoc` / `MAX_BACKUPS_PER_DOC`
  - [x] `packages/core/src/documents/manager.ts` — `listDocuments` 映射 `size`、`deleteDocument` 级联删备份、`duplicateDocument`
  - [x] `packages/core/src/index.ts` — re-export 新增持久化/备份符号
  - [x] `apps/editor/src/composables/use-auto-backup.ts` — 定时备份 composable（5 分钟间隔，dirty 时触发，`onUnmounted` 清理）
  - [x] `tests/core/backup.test.ts`（12 tests）+ `apps/editor/src/composables/__tests__/use-auto-backup.test.ts`（6 tests）
- **context_load**:
  - arch#§2.M-013
- **notes**: LOC_SIGNAL: 130。**deliverable 漂移裁决**：原卡片 `apps/editor/src/stores/document-store.ts` / `backup-store.ts` 与 context_load `M-007`/`API-022` 均漂移——文档持久化属 M-013，实现在 `@wechat-flow/core` 持久化层（非 editor store），仅定时 composable 落 editor。

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
  - [x] AC-001: `Ctrl+Z` / `Cmd+Z` 触发 CodeMirror 原生 undo（`history()` + `historyKeymap` 既有装配）
  - [x] AC-002: `Ctrl+Y` / `Cmd+Shift+Z` 触发 redo（`historyKeymap` 键位 + `redo` 命令行为测试）
  - [x] AC-003: `Ctrl+F` / `Cmd+F` 打开查找替换面板（`@codemirror/search` `searchKeymap` / `openSearchPanel`），`Escape` 关闭
  - [x] AC-004: StatusBar 字数统计格式：`{中文字符数} 字 / {总字符数} 字符`，反应式实时更新
  - [x] AC-005: 空文档时显示 `0 字 / 0 字符`
  - [x] AC-006: 单元测试：`word-count.ts` `wordCountField` StateField + `countWords` 对中英混排返回正确计数
- **deliverables**:
  - [x] `apps/editor/src/editor/extensions/find-replace.ts` — 查找替换扩展（`@codemirror/search` `search({top:true})` + `searchKeymap`）
  - [x] `apps/editor/src/editor/extensions/word-count.ts` — `countWords`（CJK `\p{Script=Han}` + code-point 总数）+ `wordCountField` StateField
  - [x] `apps/editor/src/composables/use-codemirror.ts` — spread `findReplaceExtension` 进 extensions
  - [x] `apps/editor/src/components/layout/StatusBar.vue` + `EditorShell.vue` — metrics 契约 `{chineseChars,totalChars,readMinutes}`，经 `countWords(editorStore.content)` 反应式
  - [x] `apps/editor/package.json` — 新增 dep `@codemirror/search`
  - [x] `apps/editor/src/editor/extensions/__tests__/{word-count,find-replace}.test.ts` + `composables/__tests__/use-codemirror-history.test.ts` + `layout/__tests__/StatusBar.test.ts`（41 tests）
- **context_load**:
  - arch#§2.M-001
- **notes**: LOC_SIGNAL: 130。**context_load 漂移裁决**：原卡 `M-007`（插件沙箱）/ `API-006`（describe_block MCP Tool）均漂移——编辑器属 M-001（无 HTTP/API 契约）；StatusBar 实际路径 `components/layout/`；新增 `@codemirror/search` 依赖。

---

### T-067: 输入辅助：自动空格 + 智能引号 + 破折号

- **目标**: 实现 F-001 AC-007 实时输入辅助，基于 CodeMirror 6 transactionFilter 在输入时自动插入中英空格、转换智能引号、转换破折号。
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
  - [x] AC-001: 中文字符（`\p{Script=Han}`）与 ASCII 字母/数字相邻时自动插入一个半角空格，双向生效（`中文abc` → `中文 abc`；`abc中` → `abc 中`），与核心 `zh-en-space` 双向语义一致
  - [x] AC-002: `"` 输入后：行首 / 空格后输入时替换为 `“`（U+201C），其他位置替换为 `”`（U+201D）
  - [x] AC-003: `'` 输入后：行首 / 空格后输入时替换为 `‘`（U+2018），其他位置替换为 `’`（U+2019）
  - [x] AC-004: 上述规则可通过 `enabled` 谓词全局关闭（谓词返回 false 时输入不被改写）
  - [x] AC-005: 单元测试：验证中英混排场景下自动空格插入正确位置
  - [x] AC-006: 连续输入 `--`（第二个 `-` 键入时前一字符为 `-`）替换为中文破折号 `——`（两个 U+2014），与 F-014 修订流 ellipsis-dash 的 `--`→`——` 语义一致
- **deliverables**:
  - [x] `apps/editor/src/editor/extensions/input-rules.ts` — 输入规则扩展
  - [x] `apps/editor/src/editor/extensions/__tests__/input-rules.test.ts`
- **context_load**:
  - arch#§2.M-008
- **notes**: LOC_SIGNAL: 80。**范围裁决**：PRD F-001 AC-007 三项转换（空格/引号/破折号）齐全，破折号并入本卡 AC-006。**默认值漂移登记**：PRD AC-007「默认关」与 T-069 AC-002「inputAssist 默认 true」冲突——按 PRD 权威输入辅助产品默认关；T-067 仅建可配置 seam（`enabled` 谓词），产品默认值由 T-069 store 接线时落 false。**机制裁决**：CM6 无内置 InputRule，实现用 `transactionFilter` 拦截 `input.type` 单字符插入。**测试路径**：随 `extensions/__tests__/` 既有约定（find-replace/word-count 同址）。

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
  - [x] AC-001: PreviewPane toolbar 提供 night-mode 切换控件，点击在 `nightMode` `"off"` ↔ `"risk-preview"` 间翻转（内部 ref 初始化自 prop，可选 `onNightModeChange` 回调）[F-002 AC-004]
  - [x] AC-002: `nightMode === "risk-preview"` 时预览顶部渲染 `NightModeWarningBanner`，文案传达"公众号夜间为客户端反转滤镜、不读取作者 CSS，本预览仅以深底暴露纯黑/纯白对比盲区，不做像素级模拟也不修复"[F-002 AC-003]
  - [x] AC-003: `nightMode === "risk-preview"` 时预览承载面施加深色底（`preview-surface--risk` class），仅承载面变深、不改作者 HTML 内容样式 [F-002 AC-004]
  - [x] AC-004: `nightMode === "off"` 时 banner 与深底均不渲染（`v-if` 条件）
  - [x] AC-005: Banner 含关闭按钮，关闭状态存 `sessionStorage`（会话内不再显示），不写 IndexedDB / preferences
- **deliverables**:
  - [x] `apps/editor/src/components/NightModeWarningBanner.vue` — 风险提示横幅组件
  - [x] `apps/editor/src/components/PreviewPane.vue` — 更新：检测深色主题时显示 Banner
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
  - [x] AC-001: 「编辑器偏好」分组含 3 个设置项：输入辅助（单 toggle，门控 T-067 加空格/智能引号/破折号）、字体大小（14/16/18px 三档选择器）、行高（紧凑1.5/标准1.75/宽松2.0 三档选择器）[ui-spec#§3.P-004]
  - [x] AC-002: `preferences-store` 中 `inputAssist` 默认 **`false`**（PRD F-001 AC-007 + ui-spec P-004 双证「默认关」，覆盖本卡原「默认 true」笔误）、`fontSize` 默认 `16`、`lineHeight` 默认 `1.75`
  - [x] AC-003: 偏好变更通过 `preferences-store.updatePreferences(patch)` 持久化到 IndexedDB `preferences` store（key `"editor"`，经 core `saveEditorPreferences`）
  - [x] AC-004: 字体大小变更实时作用于 CodeMirror editor（SourcePane 绑 `--editor-font-size` CSS 变量，cmBaseTheme 读之）
  - [x] AC-005: 行高变更实时作用于 PreviewPane 的 `--preview-line-height` CSS 变量
- **deliverables**:
  - [x] `apps/editor/src/pages/SettingsPage.vue` — 更新：editor 分组占位符替换为 `EditorPreferencesSection`
  - [x] `apps/editor/src/components/settings/EditorPreferencesSection.vue` — 编辑器偏好分组组件
  - [x] `apps/editor/src/stores/preferences-store.ts` — pinia store：`inputAssist`/`fontSize`/`lineHeight` + `init` + `updatePreferences`
  - [x] `packages/core/src/storage/preferences.ts` — 追加 `EditorPreferences` 类型 + `save/loadEditorPreferences`（持久化层属 M-013）
  - [x] 接线：EditorShell 读 store 下传 props；SourcePane 装 `inputRulesExtension(() => inputAssist)`（接线 T-067 seam）+ 绑字体变量；PreviewPane 绑行高变量；cm-theme fontSize 改读 `--editor-font-size`
- **context_load**:
  - ui-spec#§3.P-004
- **notes**: LOC_SIGNAL: 120。**context_load 漂移裁决**：原卡 `M-007`（插件沙箱）/`API-022` 均漂移——持久化属 M-013 在 `@wechat-flow/core` storage 层（与 T-064 同裁），编辑器属 M-001，本任务无 HTTP/API 契约，仅留 ui-spec P-004。**三处跨文档漂移裁决**：①`inputAssist` 默认值——PRD/ui-spec 双证「默认关」→ 落 `false`（覆盖本卡 AC-002「默认 true」孤立笔误）；②输入辅助控件数——ui-spec 列双开关（加空格+智能引号），但 PRD「显式启用」单开关语义 + T-067 单一 `inputAssist` 门控 → 实现单 toggle；③字体/行高——从本卡三档选择器（非 ui-spec 滑块/下拉），行高标签借 ui-spec 紧凑/标准/宽松 桥接值 1.5/1.75/2.0。**接线范式**：SourcePane/PreviewPane 保持 store-free（既有测试无 pinia），偏好经 props 由 EditorShell（已装 pinia）下传，零回归。

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
  - [x] AC-001: `getVersionTriple()` 返回三个字段均为 semver 字符串 [ARCH#§3]（versionTriple 字段契约 `{coreVersion, themeVersion, rulesetVersion}`，core 透传 core+ruleset + transport 层注入 theme）
  - [x] AC-002: `coreVersion` 来自 `packages/core/package.json#version`，`rulesetVersion` 来自 `packages/ruleset/package.json#version`，`themeVersion` 来自 `@wechat-flow/theme-default`(`packages/themes/default`)`/package.json#version`（transport 注入）
  - [x] AC-003: `verifyDeterminism(input, options, 3)` 运行渲染管道 3 次，比较 SHA-256，返回 `true` 表示一致
  - [x] AC-004: MCP Tool `render_markdown` response 包含 `versionTriple` 字段 [ARCH#§3.API-001]
  - [x] AC-005: 单元测试：`verifyDeterminism` 对确定性输入返回 `true`；对注入随机数的 mock 返回 `false`
- **deliverables**:
  - [x] `packages/core/src/version/triple.ts`（卡片 `version.ts` 漂移）— 追加 `getVersionTriple(themeVersion?) → VersionTriple`
  - [x] `packages/core/src/verify-determinism.ts`（卡片 `deterministic.ts` 漂移）— 新建 `verifyDeterminism(input, options?, iterations=3, render=renderMarkdown) → Promise<boolean>`（Web Crypto SHA-256，`Math.max(2,iterations)` 次，首次分叉即 false）
  - [x] `tests/core/version/get-version-triple.test.ts`（卡片 `__tests__/version.test.ts` 漂移）
  - [x] `tests/core/verify-determinism.test.ts`（卡片 `__tests__/deterministic.test.ts` 漂移）
  - [x] 附带：`packages/core/src/index.ts`（barrel 导出）·`packages/contracts/src/mcp/tool-contracts.ts`（response schema 补 optional `versionTriple`）·`apps/mcp-server/src/tools/render-markdown.ts`（response 注入 versionTriple）+ 两处扩展测试
- **context_load**:
  - arch#§2.M-001
  - arch#§3.API-001
- **notes**: LOC_SIGNAL: 80。**漂移裁决（orchestrator）**：① deliverable 路径全漂移——实际结构为 `version/triple.ts`（已存在，追加）+ 新建 `verify-determinism.ts`（因 `utils/deterministic.ts` 被 `pipeline/inline-style.ts` 依赖，注入 `renderMarkdown` 会成环，故 verifyDeterminism 独立成文件，`utils/deterministic.ts` 保持无 import 纯工具）；测试落根 `tests/core/`（与既有 `tests/core/utils/deterministic.test.ts` 一致）。② **架构约束驱动的设计**：dep-cruiser `core-no-upward` 禁 `packages/core` 引用 `packages/themes/*`、`no-circular` 禁环（`@wechat-flow/theme-default → core` 已存在）→ core 物理上无法读 theme-default 版本；故 `getVersionTriple` 在 core 烘焙 core+ruleset 版本（均为 core 合法依赖）、themeVersion 形参注入（正合 AC-001 note "core 透传 + transport 层注入"），由 mcp-server（已依赖 theme-default）读其 `package.json#version` 注入，满足 AC-002 theme 来源 + AC-004。③ 跨运行时用 Web Crypto `globalThis.crypto.subtle`（core 是 cross-runtime，deps[T-063]），非 `node:crypto`。④ response schema `versionTriple` 用 `.optional()` 保持既有契约向后兼容（不级联强制 core `RenderResult` 返回）。**兜底（主线程实证）**：60 test files / 588 tests 全绿零回归（新增 10 测试：version 6 + determinism 4，另 mcp/contracts 各扩 1 块）；core+contracts+mcp-server + tests/tsconfig typecheck 0；biome 171/0；模块边界 0 违规；guard:arch 0 error（2 条既有无关 no-orphans WARN 未触碰）。曾现「versionTripleSchema 未使用」IDE 滞后诊断 → 读源码(tool-contracts.ts:21 实际已用) + tsc 0 证实假警。

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
  - [x] AC-001: `tests/perf/cold-start.ts` 经 `runBenchmark` 测量 `createServer()` → `server.connect()`（ready）的冷启动耗时，每轮 `resetThemeRegistry()` 强制 `registerBuiltins` 做满工
  - [x] AC-002: cold-start P95 阈值 800ms 经 `perf-runner-cli.ts` 强制（env `PERF_COLDSTART_P95_MS` 可覆盖，CI 可放宽）；套件内 `cold-start.test.ts` 验机制（samples / 单调百分位 / env 字段），与既有 typing-latency / theme-switch 约定一致
  - [x] AC-003: ~~`startup.ts` 中 Playwright / BullMQ 惰性 `import()`~~ **N/A（前提失效）** → 重述为架构守卫不变量：`tests/mcp-server/cold-start-guard.test.ts` 断言 mcp-server 包 deps + src import 闭包**无** `playwright` / `bullmq` 静态依赖
  - [x] AC-004: ~~`SKIP_PLAYWRIGHT=1` 单测~~ **N/A（前提失效）** → 由 AC-003 架构守卫替代
  - [x] AC-005（新增，扩展范围）: `packages/core/src/pipeline/{parse,transform,serialize}.ts` 的 `unified()` processor 预编译为模块级 `freeze()` 单例；确定性回归测试断言重复调用 byte-identical
- **deliverables**:
  - [x] `packages/core/src/pipeline/parse.ts` / `transform.ts` / `serialize.ts` — `unified()...freeze()` 模块级单例
  - [x] `tests/perf/cold-start.ts` — `measureColdStart`（复用 `tests/perf/perf-runner.ts`）
  - [x] `tests/perf/perf-runner-cli.ts` — 注册 cold-start 测量 + 800ms 阈值
  - [x] `tests/perf/cold-start.test.ts` — bench 机制验证（node 环境）
  - [x] `tests/mcp-server/cold-start-guard.test.ts` — 架构守卫（冷路径无 playwright/bullmq 静态 import）
  - [x] `tests/core/pipeline-determinism.test.ts` — 单例预编译确定性回归
- **context_load**:
  - arch#§2.M-009
- **notes**: LOC_SIGNAL: 100。**漂移裁决（orchestrator）**: ① 卡片 `packages/mcp-server/` 全漂移 → 实际 `apps/mcp-server/`（包名 `@wechat-flow/mcp-server`）；② context_load `M-010`/`API-031` 为 relay/admin → MCP server 锚点是 `M-009`；③ **AC-003/004 前提失效**：MCP server 架构上**不依赖** Playwright/BullMQ（已经 `JobsClient` HTTP 边界解耦至 `apps/relay` + `apps/job-worker`，`apps/mcp-server` deps 实测无此二者），"惰性加载"无落点 → 标 N/A 并以架构守卫固化其精神（冷路径必须保持无重依赖）；④ 用户裁决扩展范围（AC-005）：纳入 remark pipeline 预编译单例（确定性敏感 core 改动，靠全量回归 + 视觉 golden 兜底）。登记 upstream-gap（dev-plan 任务卡前提与实际架构矛盾）。

**优化策略**:
- remark pipeline 三处理器（parse/transform/serialize）预编译为模块级 frozen 单例 —— `unified` processor 首用即冻结、各方法调用产生独立 VFile/tree、无跨调用可变态，重用安全且为 unified 惯用法；避免 `renderMarkdown` 每次重复 `.use()` 构造
- cold-start bench 复用既有 `tests/perf` 框架（`runBenchmark` / `computePercentiles` / `checkThresholds`），CLI 强阈值 + 套件内只验机制以防 CI flake

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
  - [x] AC-001: `markDeprecated(toolName, field, since, until)` 注册弃用记录到内存映射（`Map<`${toolName}:${field}`, DeprecationRecord>`）
  - [x] AC-002: `checkDeprecations(now?)` 返回 `DeprecationWarning[]`，每条含 `{ toolName, field, since, until, expired: boolean }`
  - [x] AC-003: `expired: true` 条件：当前日期 **严格大于** `until`（等于不算过期）；`now` 参数可注入，默认 `new Date()`
  - [x] AC-004: MCP server 启动时（`createServer`）调用 `checkDeprecations()`，对 `expired: true` 条目 `console.warn`（默认空注册表 → 无输出，零启动噪音）
  - [x] AC-005: 单元测试：注册弃用条目后 `checkDeprecations()` 返回正确 `expired` 状态
- **deliverables**:
  - [x] `apps/mcp-server/src/deprecation.ts` — `markDeprecated` + `checkDeprecations() → DeprecationWarning[]` + `clearDeprecations()`（注册表重置，供测试隔离）
  - [x] `apps/mcp-server/src/transport/stdio.ts` — `createServer` 接线启动 warn loop
  - [x] `tests/mcp-server/deprecation.test.ts`
- **context_load**:
  - arch#§2.M-009
- **notes**: LOC_SIGNAL: 70。**deliverable 路径漂移裁决**：任务卡 `packages/mcp-server/...` 漂移——MCP server 实际在 `apps/mcp-server`（属 M-009），测试统一在根 `tests/mcp-server/`（相对路径 import 源码，同既有约定），无 co-located `__tests__/`。**context_load 漂移**：原 `M-010`（中继客户端）/`API-031` 与本任务弱相关，弃用工具属 MCP server 基础设施（M-009）。**设计**：`checkDeprecations(now?)` 留可注入时钟以确定性测试；当前无实际弃用项，本任务为未来字段/Tool 弃用的平滑迁移基础设施。

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
  - [x] AC-001: `skill/SKILL.md` 存在，描述工具调用顺序与典型语义任务（写作初稿 → 排版 → variant 注册 → 粘贴模拟 → 素材库上传）
  - [x] AC-002: `skill/prompts/` 含至少 3 个 prompt 片段（推荐主题 / 选 variant / 生成 callout）
  - [x] AC-003: `skill/resources/` 含至少 2 个样例 Markdown 与主题示例
  - [x] AC-004: Skill bundle 与 MCP server 共版本号发布（package.json version 与 @wechat-flow/mcp-server 对齐）
  - [x] AC-005: 集成测试：mock 24 个 Tool 端点，按 SKILL.md 描述的顺序串调一次，全链路无异常（含 `describe_template`、`register_variant`）
- **deliverables**:
  - [x] `skill/SKILL.md`
  - [x] `skill/prompts/recommend-theme.md`
  - [x] `skill/prompts/choose-variant.md`
  - [x] `skill/prompts/build-callout.md`
  - [x] `skill/resources/sample-tech-review.md`
  - [x] `skill/resources/sample-poetry-essay.md`
  - [x] `skill/package.json`
  - [x] `tests/skill/orchestration.test.ts`
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
  - [x] AC-001: `tests/perf/typing-latency.ts` 在 10000 字文档上连续插入 1000 字符，测 keydown→编辑器 CodeMirror EditorView DOM 更新完成延迟 P95 < 50ms（PRD §3.1 权威范围：**不含 iframe 预览刷新**；阈值 env `PERF_TYPING_P95_MS` 可覆盖防硬件假败，默认 50）
  - [x] AC-002: `tests/perf/theme-switch.ts` 切换 default↔magazine 主题，测 renderMarkdown 后段管线重渲（预览更新）耗时 P95 < 200ms（阈值 env `PERF_THEME_P95_MS` 可覆盖，默认 200）
  - [x] AC-003: `pnpm bench`（`tsx tests/perf/perf-runner-cli.ts`，CLI 注册 happy-dom 全局）输出 perf-report.json，超阈值 `process.exit(1)`；`.github/workflows/perf.yml` 为 CI job
  - [x] AC-004: 报告含 P50 / P95 / P99 + samples count + env (cpu / node version)
- **deliverables**:
  - [x] `tests/perf/typing-latency.ts` — CodeMirror EditorView keydown→DOM 延迟测量（happy-dom）
  - [x] `tests/perf/theme-switch.ts` — default↔magazine 后段管线重渲耗时（相对 import 主题注册）
  - [x] `tests/perf/perf-runner.ts` — 纯函数 benchmark 帮手（computePercentiles / runBenchmark / checkThresholds / toExitCode）
  - [x] `tests/perf/perf-runner-cli.ts` — `pnpm bench` 入口（happy-dom 注册 + 跑两 benchmark + 写 perf-report.json + exit code）
  - [x] `.github/workflows/perf.yml` — CI workflow（上传 perf-report.json artifact，env 校准阈值）
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
  - [x] AC-001: 主题 manifest 含 `assets: Record<string, string>`（svg 字符串），渲染时 `{{tokenId}}` 占位符替换为对应 token 值（如 `{{color.brand}}` → `#2D5A4E`，token registry `describeToken` 解析）[F-003 AC-008]
  - [x] AC-002: H2 在 callout block 内 vs 外渲染不同 className：`h2.in-callout` vs `h2.standalone`；通过 `withinBlock(ancestors, blockId)` 祖先链判定（置于 inlineStyle 后以存活 class strip）[F-003 AC-009]
  - [x] AC-003: 主题可声明 heading 装饰策略（经 `assets` 按 `heading.{level}` 键声明 SVG/前缀，injector 注入）覆盖默认六级标题视觉
  - [x] AC-004: 主题切换后装饰资产跟随更新（injector 读 `effectiveTheme.assets` + `.id` 决定 token override）
- **deliverables**:
  - [x] `packages/core/src/pipeline/decoration-injector.ts`
  - [x] `packages/core/src/pipeline/context-aware-renderer.ts`
  - [x] `packages/themes/default/src/assets/index.ts` — SVG 装饰资产库（5 内置主题 `assets` 字段暂留 `{}` 守视觉基线，激活 wiring 延迟）
  - [x] `tests/core/decoration.test.ts`
  - [x] `tests/core/context-aware.test.ts`
- **relates_to**: [F-003, M-002, M-005]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-005
- **实现裁决（orchestrator，调查后）**:
  - 契约 `ThemeDefinition.assets` 已存在（`packages/contracts/src/theme/theme-definition.ts:44`，当前 `Record<string,unknown>`）→ 收窄为 `Record<string,string>`（svg 字符串，AC-001）；`paintable` 已就位（留 T-088）。**无需新增契约字段**，核心路径不漂移。
  - `{{tokenId}}` 解析走 **token registry**（`core/src/registry/token.ts` `describeToken(id)`，点分命名 `color.brand`；`seedTokenRegistry()` 已自动注册），优先 `themeOverrides[themeId]` 再 `.value`；**非** 主题 `tokens` 字典（后者 `--color-` CSS-var 前缀，语义不同）。
  - 管线插入：`decoration-injector` + `context-aware-renderer` 置于 `render.ts` 的 `inlineStyle` **之后**、`serializeHast` 之前。`inline-style.ts` 会 strip class，故 in-callout/standalone className 须在 inlineStyle 后施加方能存活。
  - **确定性门控（关键）**：两新 pass **仅当 `effectiveTheme.assets` 非空时激活**；空/缺 assets（全部现存渲染与视觉 golden）= byte-identical no-op。AC-002/003 测试注册带 assets 的主题触发，AC-001 token 注入同理。
  - AC-002 `withinBlock(blockId)`：hast 递归维护祖先链，判 heading 祖先是否带 `data-block===blockId`（容器指令在 `transform.ts:62-68` 打 `data-block`/`data-variant`）。
  - AC-003 heading 装饰策略：经主题 `assets` 按 heading 级别键声明 SVG/前缀，injector 注入；"序号编码/章节标记/前缀装饰" 由 asset 内容表达，不新增 strategy 字段。
  - `decorative-asset-completeness` 守卫仅在 asset 值为空串时 error → default 填非空 SVG 安全。
  - deps T-021/022 已合 main（基础设施就位）。

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
  - [x] AC-001: 触发 ContextMenu「自定义配色」打开 PaintDrawer（EditorShell `isPaintDrawerOpen` 端到端接线），列出 `theme.paintable[]` 每项一个 color picker
  - [x] AC-002: color picker 拾色 → `upsertFrontmatterPaint` 写入 frontmatter `paint`；`setContent` 触发渲染管线重跑后段
  - [x] AC-003: 修改 frontmatter `paint` 字段（源码侧），PaintDrawer 内 picker `:value` 同步更新（`currentPaint` computed 双向绑定，无环）
  - [x] AC-004: 超出 paintable 范围的覆盖项经 `applyPaintToBlocks` 产 `paint-token-not-paintable` yellow diagnostic 并在 DiagnosticsPanel 显示
- **deliverables**:
  - [x] `apps/editor/src/components/paint/PaintDrawer.vue`
  - [x] `apps/editor/src/composables/use-paint-binding.ts`
  - [x] `apps/editor/src/components/paint/__tests__/PaintDrawer.test.ts` + `tests/core/frontmatter-stringify.test.ts`（实际落点）
- **relates_to**: [F-003, M-001]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-001
- **实现裁决（orchestrator，调查后）**:
  - **paintable 数据形态**：`theme-override.ts` `getPaintableSet` **仅 array 形式生效**（object → 空 set）；5 内置主题当前 `paintable: {}`。`applyPaintToBlocks` 仅当 frontmatter 有 `paint` 时才查 paintable → **不填充内置主题 = 零渲染/视觉基线影响**。**保守**：5 内置主题 `paintable` 保持 `{}`，AC 由测试内注册的带 `paintable: string[]` 主题验证；内置主题 paintable 填充延迟（wiring-completeness，同 T-087 assets，需配套基线评估）。
  - **frontmatter 写回 helper 缺失（关键新建）**：`packages/core/src/pipeline/frontmatter.ts` 仅有 `parseFrontmatter`，无反向序列化。新增 `upsertFrontmatterPaint(markdown, paint): string`（用 `yaml` 包 `stringify`，与 parse 同包）—— 解析现有 frontmatter、set/del `paint` 字段、重组源码；round-trip 稳定（additive，不碰既有 parse/render golden）。
  - **双向绑定**：`use-paint-binding` 读 `editorStore.content` frontmatter paint（computed）→ picker 反映源码；picker 改 → `upsertFrontmatterPaint` + `editorStore.setContent` → `updatePreview` 重跑后段（AC-002）。源码改 paint → content 变 → computed 同步 picker（AC-003）。防循环。
  - **AC-004 半自动**：`applyPaintToBlocks` 已产 `severity:"warning"` `ruleId:"paint-token-not-paintable"`（theme-override.ts），`DiagnosticsPanel.vue` 已渲染黄色 → 验证该路径贯通即可。
  - **color picker**：原生 `<input type="color">`（零依赖）。**ContextMenu**：数据驱动 `menuItems` 加 `{id:"settings-paint", label:"自定义配色"}` → onCommand 开 PaintDrawer。Drawer 仿 `InsertDrawer.vue` 侧滑模式。
  - deps T-029（frontmatter parse + paint 管线）/ T-042（编辑器 UI/store 模式）已合 main。

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
  - [x] AC-001: lintMarkdown(content) 检测预设关键词（敏感词词库 keyword-list.json）返回 `Diagnostic[]`，每项含 ruleId / severity / matchedKeyword / location
  - [x] AC-002: 词库 keyword-list.json 由 packages/ruleset 维护，bump 时 rulesetVersion 升 minor
  - [x] AC-003: DiagnosticsPanel 显示关键词命中项，severity = 'warning'
  - [x] AC-004: ContextMenu「检测违规词」入口可手动触发
- **deliverables**:
  - [x] `packages/ruleset/src/lints/keyword-lint.ts`
  - [x] `packages/ruleset/src/keyword-list.json` — 词库
  - [x] `tests/ruleset/keyword-lint.test.ts`
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
  - [x] AC-001: `runRealworldVerify(opts)` 渲染 5 主题 × 5 样本 = 25 个对照页 HTML 到 `{outDir}/{theme}/{sample}.html`（CLI 默认 `tests/realworld/output/`）；每页经 `expected-template.html` 外壳嵌入"渲染前 / 粘贴过滤后"两版供作者粘贴核对
  - [x] AC-002: 渲染后将验证结果（`simulatePaste` 粘贴前/后 diff = dropped 属性集合）以 event type **`state_change`** 回写 `docs/EVENT-LOG.jsonl`，`ref` 指向输出页、`detail` 含 `realworld_verify {theme}/{sample}` 摘要；记录仅用 schema 允许字段。（原卡 `realworld_verify` 与框架 EVENT_LOG_SCHEMA 封闭 enum 冲突，复用 `state_change`，upstream-caused；rule-hit 计数受 `simulatePaste` 接口所限暂以 dropped 属性表征）
  - [x] AC-003: CLI 支持 `--theme <id>` 与 `--sample <name>` 过滤参数（函数级 `themeFilter`/`sampleFilter` 收缩渲染与回写集合）
- **deliverables**:
  - [x] `scripts/realworld-verify.ts` — 导出可测 `runRealworldVerify(opts)`（outDir/eventLogPath/samplesDir 可注入）+ 薄 CLI guard
  - [x] `tests/realworld/samples/` — 5 篇样本输入（标题 / 列表引用 / 代码表格 / 中英混排 / callout 复杂）
  - [x] `tests/realworld/expected-template.html` — 对照页 HTML 外壳模板（`{{tokenId}}` 占位由脚本填充）
  - [x] `tests/realworld/realworld-verify.test.ts` — 8 tests（mkdtemp 临时目录隔离，绝不碰真实 EVENT-LOG/output）
- **relates_to**: [F-011]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-011

---

### T-130: 设计一致性工具链 — Penpot 设计产物固化 + token-diff 硬校验 + 前端并排差异报告

- **目标**: 构建"前端页面 vs Penpot 视觉设计稿一致性"门禁所需的工具链与固化产物：① 将 Penpot 侧 token 变量组与全部 UC/P frame 导出图固化进 `docs/design/`；② 实现 `token-diff` 自动比对（Penpot 导出 token JSON vs `packages/themes/*/src/tokens.ts` 运行时值），不一致即断言失败；③ 复用 `e2e/visual/` Playwright 设施新增 design-overlay 抓取 spec，对 UC-001..UC-023 全部组件与 P-001..P-005 全部页面截取前端实际渲染，与对应 Penpot frame 导出图并排合成差异报告（非 pixelmatch 硬卡，跨渲染引擎不可比）。
- **模块**: M-005（主题/Token 注册）
- **task_kind**: feature
- **tdd_acceptance**: all
- **priority**: P0
- **complexity**: large
- **sprint**: 6
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-058, T-059, T-095, T-096, T-097, T-102, T-103, T-104, T-105, T-106]
- **user_facing_critical_path**: false
- **acceptance_criteria**:
  - [x] AC-001（token 导出固化）: Given Penpot 项目内 T-095 已建立的 `Token-{group}` 变量组（`Token-Surface`/`Token-Border`/`Token-Text`/`Token-Brand`/`Token-Accent`/`Token-Functional`/`Token-Diagnostics`/`Token-Typography`/`Token-Spacing`/`Token-Shadow`/`Token-Animation`）与 T-104 补齐的 PS-008 深色 token; When 运行导出脚本 `scripts/design-sync/export-penpot-tokens.ts`（经 Penpot MCP 只读查询变量组）; Then 产出 `docs/design/tokens/penpot-tokens.json`，顶层 key 为 token 名（如 `--color-surface`），value 为 Penpot 侧记录值字符串；文件非空且含 ≥ 60 条 token 条目（对齐 `apps/editor/src/styles/tokens.css` 当前 83 个 editor-UI token 的规模基线；Penpot `Token-*` 变量组镜像的是 editor-UI 设计系统，非内容主题）。
  - [x] AC-002（frame 导出固化 — 组件）: Given Penpot 项目内 T-097/T-106 已绘制的 UC-001..UC-023 全部组件视觉稿; When 运行 `scripts/design-sync/export-penpot-frames.ts --scope=components`; Then 每个 UC-NNN 至少 1 张 PNG 导出到 `docs/design/frames/components/UC-NNN.png`（多状态变体的组件导出其 `default` 状态 frame），23 个组件全部产出对应文件，缺失任一即断言失败并列出缺失的 UC-NNN 清单。
  - [x] AC-003（frame 导出固化 — 页面）: Given Penpot 项目内 T-096/T-102/T-103/T-105 已绘制的 P-001..P-005 全部页面视觉稿; When 运行 `scripts/design-sync/export-penpot-frames.ts --scope=pages`; Then 每个 P-NNN 导出桌面档 frame 到 `docs/design/frames/pages/P-NNN-desktop.png`，5 个页面全部产出对应文件，缺失任一即断言失败并列出缺失的 P-NNN 清单。
  - [x] AC-004（token-diff 硬校验脚本）: Given `docs/design/tokens/penpot-tokens.json`（AC-001 产物）与 editor-UI token 权威源 `apps/editor/src/styles/tokens.css` 的 `--token` CSS 自定义属性; When 运行 `pnpm design:token-diff`（`scripts/design-sync/token-diff.ts`）; Then 对每个在 Penpot token JSON 中存在且在 `tokens.css` 有同名 `--token` 的 key，比对其归一化值（十六进制颜色大小写不敏感；`0px`≡`0`；数值单位后空白折叠；`rgba()` 内空白折叠且 `0.10`≡`0.1`；font-family 栈按逗号分段去引号比较；`--color-brand-highlight-outline` 取 CSS 侧 outline shorthand 中的颜色分量比较），全部一致时进程 exit code 0 且输出 `{ mismatches: [] }`；任一不一致时 exit code 1 并输出 `mismatches: [{ tokenKey, penpotValue, codeValue }]` 明细列表，不静默通过。
  - [x] AC-005（token-diff 单元测试覆盖不一致路径）: Given 构造的 fixture（`tests/design-sync/fixtures/mismatched-tokens.json`，其中 `--color-brand` 字面值与 `apps/editor/src/styles/tokens.css` 故意不同）; When 单元测试调用 `runTokenDiff(fixturePath, editorUiTokens)`（`editorUiTokens` = 解析自 `tokens.css` 的 `--token`→值 映射）; Then 返回值 `mismatches` 数组长度 ≥ 1 且包含 `tokenKey === '--color-brand'` 的条目；同时构造完全一致的 fixture 验证 `mismatches` 长度为 0（正反两路径均被测试覆盖）。
  - [x] AC-006（Playwright design-overlay 页面/组件截图 spec）: Given 新增 `e2e/visual/design-overlay.spec.ts`（新 Playwright project `design-overlay`，独立 `webServer` 配置以 `pnpm --filter editor dev` 启动真实 Vite 编辑器 SPA）; When 对 P-001..P-005 各页面路由（`/`、`/themes`、`/settings`、`/preview/:docId` 等，P-002 文档列表以 P-001 内嵌 Tab 状态截取）与 UC-001..UC-023 各组件（通过组件独立 story 页面或编辑器内可达状态触发后截取）执行 `page.screenshot()`; Then 产出 `e2e/visual/design-overlay-output/{components,pages}/*.png`，覆盖全部 23 个组件与 5 个页面，每个截图文件非空（size > 0 bytes）。
  - [x] AC-007（并排差异报告生成）: Given AC-002/AC-003 的 Penpot frame 导出图与 AC-006 的前端实际截图均已就绪; When 运行 `scripts/design-sync/build-overlay-report.ts`; Then 产出 `docs/design/reports/overlay-report.html`，报告内每个 UC-NNN / P-NNN 各占一节，左栏嵌入 Penpot frame 图、右栏嵌入前端截图，标题含 `{id}: {name}`；报告顶部统计行显示 `{componentsTotal}/23 组件、{pagesTotal}/5 页面` 已生成并排对照；生成的 HTML 文件非空且可被浏览器直接打开渲染（无外部资源依赖，图片以文件相对路径内嵌）。
- **deliverables**:
  - [x] `scripts/design-sync/export-penpot-tokens.ts` — Penpot MCP 变量组只读查询 + JSON 序列化
  - [x] `scripts/design-sync/export-penpot-frames.ts` — 组件/页面 frame 导出（`--scope=components|pages` 参数）
  - [x] `scripts/design-sync/token-diff.ts` — 导出 `runTokenDiff(penpotTokensPath, editorUiTokens)` + `parseCssTokens(cssPath)`（解析 `apps/editor/src/styles/tokens.css` 的 `--token`→值），CLI 与可测函数分离
  - [x] `scripts/design-sync/build-overlay-report.ts` — 并排差异报告生成器
  - [x] `docs/design/tokens/penpot-tokens.json` — Penpot token 导出固化产物
  - [x] `docs/design/frames/components/UC-001.png` .. `UC-023.png` — 23 个组件 frame 导出
  - [x] `docs/design/frames/pages/P-001-desktop.png` .. `P-005-desktop.png` — 5 个页面 frame 导出
  - [x] `e2e/visual/design-overlay.spec.ts` — 新 Playwright project，实际编辑器 SPA 页面/组件截图
  - [x] `docs/design/reports/overlay-report.html` — 并排差异报告产物
  - [x] `tests/design-sync/token-diff.test.ts` — AC-005 一致/不一致两路径单元测试
  - [x] `tests/design-sync/fixtures/mismatched-tokens.json` / `tests/design-sync/fixtures/matched-tokens.json`
  - [x] `package.json` 根级新增 `design:token-diff` / `design:export-tokens` / `design:export-frames` / `design:build-overlay-report` scripts
- **relates_to**: [M-005]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2
  - ui-spec-wechat-flow-p001-p005#§3
  - ui-spec-wechat-flow#§7
  - arch-wechat-flow-modules#§2.M-005
  - `apps/editor/src/styles/tokens.css`
  - `e2e/visual/story-matrix.ts`
  - `e2e/visual/theme-matrix.spec.ts`
  - `playwright.config.ts`
- **notes**: LOC_SIGNAL: ~420（4 个 script 文件各约 60-90 行 + Playwright spec 约 80 行 + 报告生成器约 60 行 + 单元测试约 60 行）；跨 `docs/design/` 固化产物 + `e2e/visual/` 测试设施 + `scripts/` 工具链，故 standard tdd_mode。`design-overlay` Playwright project 独立于既有 `chromium`（story-render）project——既有 `theme-matrix.spec.ts`/`variant-matrix.spec.ts` 渲染的是 Block/主题内容自一致性基线（T-058），本任务的截图目标是编辑器 SPA 真实路由与组件，两者渲染对象不同不可复用同一 spec。UC-001..UC-023 计数取 `ui-spec-wechat-flow-uc001-uc014#§2` 实际条目数（分卷文件名历史沿用 `uc001-uc014` 命名，实际条目已扩展至 UC-023，见分卷内容而非文件名）。[ASSUMPTION] AC-006 组件截图对无独立路由的组件（多数 UC 为编辑器内嵌子组件而非独立页面）通过编辑器可达状态触发后截取（如 UC-009 CommandPalette 经 Ctrl+K 触发、UC-015 InsertDrawer 经「+」按钮触发），具体触发步骤在 spec 实现时按 ui-spec 各 UC 状态清单编码，此处不逐一列出触发脚本；若某 UC 组件无法在编辑器可达状态下独立截取（如仅作为其他组件内部渲染细节），允许退化为该组件所属页面截图的局部裁剪，报告中标注裁剪来源。[ASSUMPTION] token-diff 比对目标 = editor-UI token 权威源 `apps/editor/src/styles/tokens.css`。依据：Penpot `Token-*` 变量组是编辑器 UI 设计系统（`--color-surface-elevated` / `--color-diag-*` / `--space-N` / `--z-*` / `--radius-*` / `--shadow-*`），与 `tokens.css` 同名同值 1:1 对齐（83 token）；而 `packages/themes/*/src/tokens.ts` 是文章内容渲染体系（`--color-background` / `--color-quote-*` / `--font-size-h1..h6` / `--font-family-body`），与 Penpot 仅巧合同名少量 key（border / text-secondary 等）且语义为不同层，硬比会产伪失败，不属本比对范畴。5 套内容主题的 token 一致性由 T-059 主题守卫（PRD F-003 9 维）负责。

---

### T-131: [VALIDATION] 前端 vs Penpot 设计稿一致性门禁

- **目标**: 对全量 UC-001..UC-023 组件与 P-001..P-005 页面执行 T-130 产出的 token 硬校验与并排视觉差异报告生成，token 不一致即阻断 Sprint 6 DONE；视觉保真度由用户人工 sign-off，残差差异登记为 `conditional_release` 的 `blocking_conditions` 逐条闭环。
- **task_kind**: validation
- **tdd_acceptance**: skip
- **priority**: P0
- **complexity**: medium
- **sprint**: 6
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **user_facing_critical_path**: true
- **dependencies**: [T-130, T-104]
- **acceptance_criteria**:
  - [x] AC-001（token 硬校验全绿）: 运行 `pnpm design:token-diff`，进程 exit code 为 0，输出 `mismatches: []`；任一 mismatch 存在即视为本卡失败，不得以 `[ASSUMPTION]` 或 `[ENV-LIMITATION]` 豁免（token 一致性是客观可脚本验证项，不允许人工酌情放行）。
  - [x] AC-002（frame 导出完整性）: 检查 `docs/design/frames/components/` 目录含 23 个 `UC-NNN.png` 文件、`docs/design/frames/pages/` 目录含 5 个 `P-NNN-desktop.png` 文件，与 `docs/design/tokens/penpot-tokens.json` 均存在于 git 索引（`git ls-files docs/design/` 非空）。
  - [x] AC-003（并排差异报告生成）: 打开 `docs/design/reports/overlay-report.html`，报告顶部统计行显示 `23/23 组件、5/5 页面` 已生成并排对照，逐节浏览全部 28 节内容均左右两栏图片均可加载（非损坏图片）。
  - [x] AC-004（人工视觉 sign-off）: 用户逐节目视比对 overlay-report.html 中前端截图与 Penpot frame 导出图，对每一节标记「一致」或「存在差异」；全部标记「一致」时签字记录以 `event=user_decision` 写入 `docs/EVENT-LOG.jsonl`，`detail` 含 `design_signoff T-131: 前端 vs Penpot 全量一致性核验通过` 字样，`ref=T-131`。
  - [x] AC-005（残差差异转 blocking_conditions）: Given AC-004 核验中存在被标记「存在差异」的 UC-NNN / P-NNN 条目; When 该情况发生; Then 本卡不产出 `approved` verdict，而是产出 `conditional_release`，`blocking_conditions` 逐条列出 `{ condition: "{id} 视觉差异待收敛", owner: "developer", detail: "{差异描述}" }`，每条差异有明确 owner；`blocking_conditions` 非空前不视为本卡通过，不推进 Sprint 6 DONE。
- **deliverables**:
  - [x] `docs/EVENT-LOG.jsonl` — design_signoff 事件（T-131，`event=user_decision`）
  - [x] 若存在残差差异：`docs/reviews/sprint/` 下 Sprint 6 sprint-review 报告中登记 `blocking_conditions` 清单（本卡不新建审查报告文件，残差差异随 sprint-review 收口）
- **relates_to**: [M-005]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2
  - ui-spec-wechat-flow-p001-p005#§3
- **notes**: 本卡是 T-113 Sprint 6 收尾验证的前置依赖；token 硬失败（AC-001）与 frame/报告缺失（AC-002/AC-003）是客观可脚本验证的阻断项，视觉保真度（AC-004/AC-005）走 `conditional_release` 语义而非 needs_revision——参见 COMMON-RULES §verdict_blocking_semantics，`blocking_conditions` 为空前 Phase Transition / Sprint DONE 判定均须暂停。

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
- **dependencies**: [T-056, T-057, T-058, T-059, T-062, T-063, T-085, T-086, T-087, T-088, T-131]
- **acceptance_criteria**:
  - [x] **设计一致性门禁通过**：T-131 token 硬校验（`pnpm design:token-diff`）exit code 0 且 `mismatches: []`；`docs/EVENT-LOG.jsonl` 含 `ref=T-131` 的 `design_signoff` 核验记录；若存在残差视觉差异，对应 `conditional_release.blocking_conditions` 已全部闭环为空列表
  - [x] **CI 全绿**：在 GitHub Actions 页面确认最新提交的 `ci.yml` workflow 状态为绿色（所有 jobs passed）
  - [x] **规则集数量**：运行 `pnpm --filter ruleset exec node -e "const r = require('./dist'); console.log(r.listRules().length)"`，输出数字 ≥ 42
  - [x] **E2E fixture 全绿**：运行 `pnpm -r test --filter core`，所有 fixture snapshot 通过，无 diff
  - [x] **视觉回归基线 — 核心矩阵**：5 主题 × (8 P0 场景 + 8 综合场景) = 80 张基线截图存在于 `e2e/visual/snapshots/core/`；pixelmatch ratio ≤ 0.05 全绿（每 PR 必跑）
  - [x] **视觉回归基线 — 全量 variant 抽样**：依据 T-058 AC-002 动态枚举生成的 `e2e/visual/snapshots/variant/` 目录非空；PR 抽样比例（默认 0.2）全绿；夜间 scheduled job 跑全量 `5 × listBlocks() × describeBlock(b).variants` 全绿（参考 R-004）
  - [x] **主题守卫 9 维度**：运行 `pnpm -r test --filter theme-core`，全绿；在应用中加载 `theme-default` 的 `validateThemeGuard` 结果，`dimensions.every(d => d.passed) === true`
  - [x] **跨运行时一致性**：运行 `pnpm test:cross-runtime`，cross-runtime 四 target SHA-256 一致测试全绿
  - [x] **版本三元组**：在浏览器控制台运行 `import('/packages/core/dist/index.js').then(m => console.log(m.getVersionTriple()))`，输出含 3 个 semver 字符串的对象
  - [x] **Block 数量**：listBlocks().length ≥ 40 断言通过
  - [x] **Variant 数量**: `listAllVariants().length >= 120` 断言通过；8 类核心 Block 配额满足
  - [x] **性能 benchmark**：`pnpm bench` 输出 P95 键入 < 50ms 与主题切换 < 200ms
  - [x] **Skill bundle**：`skill/SKILL.md` 文件存在，`tests/skill/orchestration.test.ts` 集成测试通过
  - [x] **撤销/重做**：在 SourcePane 输入 3 个字符后 `Ctrl+Z` 3 次，文本恢复到输入前状态
  - [x] **P-004 编辑器偏好**：访问 `/settings`，切换字体大小为 18px，SourcePane 字号立即变为 18px；刷新页面后偏好保持

**通过条件**:
- 以上 14 项全部观测到预期结果，Sprint 6 判定为 DONE。

⚠️ 验证纠偏（upstream-caused，AC 文本与实际实现的命名/路径漂移，语义断言不变，验证按等价形式执行）:
- 规则集：ruleset 包为 TS 源码 workspace 包（`main: src/index.ts`，无 `dist/`），API 为 `builtinRules`/`getRules` 而非 `listRules`；验证 `builtinRules.length = 45 ≥ 42`。
- 视觉基线路径：实际结构为 `e2e/visual/snapshots/{platform}/{testFile}/`；核心矩阵 = `theme-matrix.spec.ts/`（linux 与 win32 各 80 张），variant = `variant-matrix.spec.ts/`（linux 全量 765 = 153×5，win32 抽样 153 = 765×0.2）。
- 主题守卫返回结构为 `{ passed, failures[] }`；等价断言 `passed === true && failures.length === 0`。
- 版本三元组：无浏览器可访问 dist，经 tsx 对源码 `getVersionTriple()` 验证，输出 `{coreVersion, themeVersion, rulesetVersion}` 三个 semver。
- Variant 配额：registry 实际 id 为 `table`/`highlight-block`（AC 中 `table-grid`/`highlight` 为 spec 命名）；配额 callout/quote/steps=10、pull-quote/table/divider/card/highlight-block/compare=5、其余最小 3，全部满足。

---

## 4. Deferred Backlog

以下任务卡已登记但不在 Sprint 6 活跃执行批；可在后续 Sprint 中按优先级拉入。

### T-128: 五主题内容元素选择器样式增强（list / img / table / a）

- **目标**: 为 5 套内置主题（default / magazine / literary / business / tech）的 `theme.blocks` 补全基础内容元素 `ul` / `ol` / `li` / `img` / `table` / `a` 的选择器样式，确保这些元素在渲染管线 tag-path 中绑定到主题 token 而非落回微信默认样式，实现跨主题视觉一致性。
- **task_kind**: feature
- **priority**: P2
- **complexity**: medium
- **sprint**: deferred
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-059]
- **user_facing_critical_path**: false
- **acceptance_criteria**:
  - [x] AC-001（管线验证）: Given `inline-style.ts` 的 `buildStyleMap` 以包含 `ul`/`ol`/`li`/`img`/`table`/`a` key 的 `themeTokens: BlockStyleTable` 为参数; When `inlineStyle(hast, themeTokens)` 遍历 hast 树; Then tag-path 分支（`data-block` 不存在时）对 `el.tagName === 'ul'`（`'ol'` / `'li'` / `'img'` / `'table'` / `'a'`）正确命中 `styleMap.get(el.tagName)`，产物节点 `properties.style` 含对应声明，不为空字符串。[ARCH#§2.M-005]
  - [x] AC-002（default 主题）: Given default 主题的 `theme.blocks` 新增 `list.ts` 与 `media.ts` block 文件并 spread 进 `index.ts`; When `validateThemeGuard(defaultTheme)` 执行; Then `ul`/`ol`/`li`/`img`/`table`/`a` 各自的 `theme.blocks[key].default` 存在且绑定对应 token（`ul`/`ol` 用 `--spacing-list-item` 作 `margin-bottom`，`a` 用 `--color-link` 作 `color` + `--decoration-link-underline` 作 `text-decoration`，`img` 含 `max-width: 100%`，`table` 含 `border-collapse: collapse`，`li` 含 `line-height`）；守护 `baseline-selector-density` 维度结果 `passed === true` 且不因本任务新增 key 产生新 error。[ARCH#§2.M-005]
  - [x] AC-003（magazine / literary / business / tech 主题）: Given 另 4 套主题各自的 `theme.blocks` 补全同类 `list.ts` / `media.ts`; When 对每套主题调用 `validateThemeGuard(theme)`; Then 每套主题的 `ul`/`ol`/`li`/`img`/`table`/`a` 均有 `theme.blocks[key].default` 声明，且 color / spacing token 引用各主题自身已有 token（如 `--color-link`、`--spacing-list-item`、`--align-list-marker`），不跨主题硬编码颜色值。[ARCH#§2.M-005]
  - [x] AC-004（link 一致性审计）: Given 5 套主题的 `tokens` 中均已有 `--color-link` token; When 比对 5 套主题 `theme.blocks.a.default` 的 `color` 与 `text-decoration` 声明; Then 每套主题的 `a.default.color` 字面值等于该主题 `tokens['--color-link']`，`a.default.text-decoration` 字面值等于 `tokens['--decoration-link-underline']`（default 主题为 `underline`），不存在主题内 a 样式与 token 声明不一致的情况（可由单元测试断言跨主题一致性模式而非统一颜色值）。[ARCH#§2.M-005]
  - [x] AC-005（产物 inline 样式验证）: Given 含列表 / `![图](url)` / GFM 表格 / `[链接](url)` 的 Markdown 源码经 `renderMarkdown(source, { themeId })` 产物; When 对 default、magazine、literary、business、tech 5 套主题各自渲染; Then 产物 HTML 中**管线存活元素** `<ol>`/`<li>`/`<img>`/`<table>`/`<a>` 均含非空 `style` attribute；跨主题同元素 `style` 字符串不全等（差异化生效）。⚠️ 实现纠偏（upstream-caused）：卡内 `renderToHtml` 是命名漂移，实为 `renderMarkdown`；且 `<ul>` 被既有 T-015 `transform-list-to-table` 无条件转 `<table>`（微信兼容既定行为），故产物断言改测存活元素并新增 ul→table 显式验证，`<ul>` 声明层由 AC-002/003 覆盖、管线层由 AC-001 覆盖。`tests/theme-content-elements.test.ts` 相对路径 import 约定（见 `memory/wechat-flow-tests-import-convention.md`）。[ARCH#§2.M-005]
  - [x] AC-006（T-059 守卫边界不变）: Given 本任务修改完成后; When 对 5 套主题执行 `validateThemeGuard(theme)`; Then `baseline-selector-density` 维度校验的覆盖列表仍严格为 `h1/h2/h3/h4/h5/h6/p/blockquote/code/hr`，本任务新增的 `ul/ol/li/img/table/a` key 不被该维度视为必检元素，守卫结果与 T-059 实现时一致（该维度边界由 T-059 固化，本卡不改守卫逻辑）。[ARCH#§2.M-005]
- **deliverables**:
  - [x] `packages/themes/default/src/blocks/list.ts` — `ul`/`ol`/`li` 样式声明
  - [x] `packages/themes/default/src/blocks/media.ts` — `img`/`table`/`a` 样式声明
  - [x] `packages/themes/default/src/index.ts` — spread `listBlocks` / `mediaBlocks`
  - [x] `packages/themes/magazine/src/blocks/list.ts`
  - [x] `packages/themes/magazine/src/blocks/media.ts`
  - [x] `packages/themes/magazine/src/index.ts`
  - [x] `packages/themes/literary/src/blocks/list.ts`
  - [x] `packages/themes/literary/src/blocks/media.ts`
  - [x] `packages/themes/literary/src/index.ts`
  - [x] `packages/themes/business/src/blocks/list.ts`
  - [x] `packages/themes/business/src/blocks/media.ts`
  - [x] `packages/themes/business/src/index.ts`
  - [x] `packages/themes/tech/src/blocks/list.ts`
  - [x] `packages/themes/tech/src/blocks/media.ts`
  - [x] `packages/themes/tech/src/index.ts`
  - [x] `tests/theme-content-elements.test.ts` — AC-005 跨主题产物断言 + AC-004 link 一致性断言
  - [x] `tests/core/e2e/fixtures/{03,04,08,10,11}-*.html` — T-057 golden 快照重生（新增元素 inline 样式，word-diff 审计仅 style 增量）
- **relates_to**: [F-003]
- **context_load**:
  - prd-wechat-flow#§2.F-003
  - arch-wechat-flow-modules#§2.M-005
  - `packages/core/src/pipeline/inline-style.ts`
  - `packages/themes/default/src/blocks/heading.ts`（结构参考）
  - `packages/themes/default/src/tokens.ts`（token key 参考）
- **notes**: 从 T-059 拆出的 theme-enhancement；守卫维度（`baseline-selector-density`）与本增强正交。管线 tag-path 机制已支持任意 `el.tagName` 键——`buildStyleMap` 直接将 `themeTokens` key 写入 `styleMap`，无需修改 `inline-style.ts`；本任务仅在各主题 blocks 层添加声明即可被管线拾取。LOC_SIGNAL: ~180（5 主题 × 2 新 block 文件 × 约 15 行 + 5 × index.ts 单行 spread + 测试文件约 60 行）；跨 5 个主题包故升 standard tdd_mode。priority 定 P2 依据：PRD F-003 AC-012 的「9 基础元素覆盖」约束由维度 9 `template-completeness`（模板内容演示）保证，与本任务（主题选择器样式）正交；微信默认能渲染这些元素（体验一致性缺口而非功能缺失），故非 P0/P1；若后续 sprint-review 认定跨主题外观差异已影响用户体验质量门禁，可升 P1。

---

### T-129: 桌面浏览器 Clipboard 降级路径（execCommand 兜底）

- **目标**: 实现 F-004 AC-007a — 桌面浏览器（vw ≥ 768px）`navigator.clipboard.write` 不可用 / 抛错时，`composeCopy` 降级到隐藏 `<textarea>` + `document.execCommand('copy')` 自动调用拷贝 plainText，并 Toast 提示用户用 Ctrl/Cmd+C 完成复制。PRD→任务 AC 级追溯审计发现的唯一真实 gap：`apps/editor/src/use-cases/copy.ts` 的 catch 块仅弹 "复制失败" error Toast、无降级；移动端 AC-007b 已由 T-055 / `mobile-copy.ts` 实现。
- **task_kind**: feature
- **priority**: P2
- **complexity**: small
- **sprint**: deferred
- **tdd_mode**: light
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-030]
- **user_facing_critical_path**: false
- **acceptance_criteria**:
  - [x] AC-001（降级触发）: Given 桌面视口（vw ≥ 768px）且 `navigator.clipboard.write` 抛错或 `navigator.clipboard` 不可用; When `composeCopy` 执行; Then 自动创建隐藏 `<textarea>` 写入 plainText、调用 `document.execCommand('copy')` 完成拷贝、再移除该 textarea，不抛出未捕获异常。[PRD#§2.F-004 AC-007a]
  - [x] AC-002（Toast 提示）: Given 桌面降级路径触发; When execCommand 调用后; Then 经 `notify` 触发提示用户可用 Ctrl/Cmd+C 完成复制的消息（非 silent，文案区别于"复制失败"硬错）。[PRD#§2.F-004 AC-007a]
  - [x] AC-003（现代浏览器不回归）: Given `navigator.clipboard.write` 可用且成功; When `composeCopy` 执行; Then 走原 Clipboard API dual-MIME 路径 + success Toast，不触发 execCommand 降级。[PRD#§2.F-004 AC-001]
  - [x] AC-004（桌面/移动降级不重叠）: Given 视口 vw < 768px 且 clipboard 失败; When `composeCopy` 执行; Then 不走桌面 execCommand 降级（移动端 AC-007b 由 T-055 / `mobile-copy.ts` 负责），避免两条降级路径在边界重叠。[PRD#§2.F-004 AC-007b]
- **deliverables**:
  - [x] `apps/editor/src/use-cases/copy.ts` — `composeCopy` catch 分支加桌面（vw ≥ 768px）textarea + execCommand 降级 + 区分文案的 Toast
  - [x] 对应单测（mock `navigator.clipboard.write` reject + `document.execCommand`，断言降级触发 / Toast / 现代浏览器不走桌面分支）
- **relates_to**: [F-004]
- **context_load**:
  - prd-wechat-flow#§2.F-004
  - `apps/editor/src/use-cases/copy.ts`
  - `apps/editor/src/use-cases/mobile-copy.ts`（AC-007b 移动降级参照）
- **notes**: 单点降级修复，触发面窄（现代桌面 Chrome / Safari / Edge 在安全上下文均支持 Clipboard API，仅老浏览器 / 非 HTTPS 触发）。`execCommand` 虽弃用但仍是无 Clipboard API 时的标准兜底；降级仅拷 plainText（HTML dual-MIME 无法经 execCommand 传递），与 AC-007a「Toast 提示手动 Ctrl/Cmd+C」的降级语义一致。LOC_SIGNAL: ~30（copy.ts 降级分支 ~15 + 测试 ~40）；故 light tdd_mode。priority P2 依据：F-004 是 P0 feature，但 AC-007a 是仅在缺 Clipboard API 的老浏览器触发的优雅降级路径，触发面窄、非核心功能缺失；主复制路径（Clipboard API）已实现。
