---
id: "sprint-review-s6-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s6"]
---

# SPRINT-REVIEW s6 r1 — Sprint 6 完成度审查

## 范围

Sprint 6 全部已合 main 的任务（PR #32~#68）：

- 质量门批 **T-056/T-057/T-060/T-061/T-064**（ruleset 42 规则 / E2E golden / 补丁热加载 / readability / 自动备份）
- 视觉回归与主题批 **T-058/T-059/T-062/T-063/T-128**（Playwright 双矩阵 + nightly / 主题守卫 9 维 / CI 编排 / 跨运行时 / 内容元素样式）
- 编辑器 UI 批 **T-066~T-072**（查找替换·字数 / 输入辅助 / 夜间风险 Banner / 编辑器偏好 / 版本三元组 / 冷启动 / MCP deprecation）
- skill/bench/主题批 **T-085~T-090**（skill bundle / perf 基准 / decoration / paint / 关键词 lint / realworld verify）
- 设计轨道 **T-104/T-130/T-131**（深色 token / 设计一致性工具链 / 前端 vs Penpot 门禁，视觉 sign-off 已由用户在 EVENT-LOG 完成，本报告仅审代码交付物）
- 验证门 **T-113**（14/14 AC 全 PASS，证据见 PR #68 与 EVENT-LOG `state_change` ref=T-113）
- **T-129**（桌面 Clipboard execCommand 降级，PR #61 已交付；卡片物理位于 dev-plan §4 Deferred Backlog 但 AC 全勾、测试在 `apps/editor/src/use-cases/__tests__/copy.test.ts`——按事实计入 Sprint 6 交付范围）

## Layer 1 结构检查

`cataforge skill run sprint-review -- 6` → **blocking 7 + advisory 28**，全部核实处置如下：

- **7 × HIGH deliverables_exist** — 全部为 deliverables 路径代表性声明漂移，非缺失（全局约定：路径与卡片不符不视为缺陷）：
  - T-056 `strip-*.ts`/`clamp-*.ts`/`transform-*.ts` 通配被按字面校验；实测文件族 strip 15 + clamp 11 + transform 11 = 37，加 patch 2 + lint 3 = 42 条 builtin，再加 readability 3 = `builtinRules.length` 45，与 T-113 验证一致
  - T-058 `packages/theme-*/src/__stories__/` → 实现为 `e2e/visual/story-matrix.ts` 动态枚举（8/8 AC 逐条核实 delivered，见 §per-task 表）
  - T-059 `packages/core/src/__tests__/guard/` → 测试实际在 `tests/themes/theme-guard.test.ts` + `packages/core/src/theme-guard/template-coverage.test.ts`
  - T-068 两 vue 组件实际在 `apps/editor/src/components/editor/` 子目录
- **28 × MEDIUM code_review_present** — Sprint 6 无 per-task CODE-REVIEW 报告，由本报告批量承担 per-task Layer 2（s5-r1 同款先例），见下表
- **unplanned_files = 0** — 无 gold-plating 信号

## 批量 code-review — per-task L2 维度表

审查方式：5 个并行 reviewer 切片（ruleset / 视觉主题 / 编辑器 UI / skill-bench-主题 / 设计轨道），每切片核实 completeness、ac-coverage（含空心断言与全 stub mock 假绿检查）、wiring-completeness（user-facing 卡验证真实挂载）、scope-drift、gold-plating，并对关键断言做单文件测试重跑核证。

| Task | completeness | ac-coverage | scope-drift / wiring | 8 维命中 |
|------|:---:|:---:|:---|:---|
| T-056 | ok | ok | none；fixture 字段包级未填见 SR-003 | clean |
| T-057 | ok | ok | none（SHA-256 byte-exact 真实断言） | clean |
| T-060 | ok | **issue** | **JSON 补丁包 matcher/transform 契约不可行**（SR-001）；scope 枚举未校验（SR-002） | error-handling (HIGH), test-quality |
| T-061 | ok | ok | none（CJK code point 处理正确） | clean |
| T-064 | ok | ok | wiring ok（EditorShell 真实接入 + 专项 wiring 测试） | clean |
| T-058 | ok | ok（8/8 AC delivered，勾选态 stale 见 SR-004） | 路径漂移已裁决（story-matrix 动态枚举 + snapshotPathTemplate） | clean |
| T-059 | ok | ok（13/13 AC，85 测试） | none | clean |
| T-062 | ok | ok（10/10，chore 卡 notes 已裁决命令漂移） | none | clean |
| T-063 | ok | ok（7/7，四 target SHA-256 真实断言） | 路径漂移已裁决（tests/cross-runtime/） | clean |
| T-128 | ok | ok（6/6，含 AC-004 跨主题一致性） | none | clean |
| T-066 | ok | ok | wiring ok（use-codemirror spread + StatusBar 渲染） | dead-code (LOW, SR-006) |
| T-067 | ok | ok | wiring ok（SourcePane extraExtensions） | clean |
| T-068 | ok | ok | wiring ok（PreviewPane v-if + EditorShell 挂载）；勾选态 stale 见 SR-004 | clean |
| T-069 | ok | ok | wiring ok（init/props 下传/CSS 变量/SettingsPage） | duplication (LOW, SR-005) |
| T-070 | ok | ok | wiring ok（render-markdown 唯一生产调用点） | clean |
| T-071 | ok | ok | wiring ok（三处理器模块级 freeze + 架构守卫测试） | clean |
| T-072 | ok | ok | wiring ok（stdio createServer 内 checkDeprecations） | clean |
| T-085 | ok | ok | wiring ok（真实 MCP InMemoryTransport dispatch，仅 mock 外部 JobsClient） | clean |
| T-086 | ok | ok | wiring ok（pnpm bench + perf.yml CI job） | clean |
| T-087 | ok | ok | wiring ok（render.ts:72-73 生产管线挂载）；内置主题 assets 未激活见 §遗留 | clean |
| T-088 | ok | ok | wiring ok（EditorShell + ContextMenu 端到端）；内置主题 paintable 未激活见 §遗留 | clean |
| T-089 | ok | ok | wiring ok（use-keyword-lint 消费真实 lintMarkdown + 专项 wiring 测试） | clean |
| T-090 | ok | ok | CLI guard 可执行；未注册 package.json script 别名（SR-009） | clean |
| T-104 | ok | ok（设计 AC 由用户 sign-off） | none（design 卡无代码） | clean |
| T-130 | ok | ok（11 design-sync 单测重跑绿） | export 脚本实为 gate 校验而非 MCP 导出（文件头已如实说明，已知架构约束） | error-handling/test-quality (LOW, SR-007/SR-008) |
| T-131 | ok | ok（token-diff exit0 复核 + EVENT-LOG 可追溯） | none | clean |
| T-113 | ok | ok（14/14，PR #68 全证据） | n/a（validation 卡） | clean |
| T-129 | ok | ok（4/4，execCommand 降级 + 边界测试） | wiring ok（copy.ts 生产路径） | clean |

## 问题列表

### [SR-001] HIGH: T-060 JSON 补丁包 `matcher`/`transform` 契约不可行，校验缺失 + 测试虚假绿色
- **category**: error-handling
- **root_cause**: upstream-caused（AC-001 定义的 `PatchBundle.patches: RuleDefinition[]` schema 要求 JSON 携带函数字段，JSON 序列化协议无法表达——任务卡 AC 层可行性缺陷）
- **描述**: `validateBundle()`（`packages/ruleset/src/patch-loader.ts:16-51`）仅校验 `id`/`scope`/`priority`，`loadPatchBundle` 以 `raw.patches as unknown as RuleDefinition[]` 强转（:89），`applyPatchBundle`（:93-108）仅查 `id` 后直接 `upsertRule` 注入。任何真实 HTTP JSON 补丁包（AC-001 声明的使用场景）经 `JSON.parse` 后 `matcher`/`transform` 必为 `undefined`，注入后一旦被 scope 执行器触达即抛 `TypeError: rule.matcher is not a function`（已用 tsx 最小脚本复现）。既有 17 个测试全部经 `makePatchRule()` helper 构造**含真实 JS 函数**的补丁，从未覆盖"JSON 反序列化后无函数字段"的真实路径，构成虚假绿色。
- **严重度定标（reviewer-calibration）**: 切片 reviewer 报 CRITICAL；主报告定标为 HIGH——核证 `packages/core/src/render.ts:62` 默认管线消费 `builtinRules` 快照而非 registry `getRules()`，且全仓无 `loadPatchBundle`/`applyPatchBundle` 生产调用点（仅测试引用），故不存在当前生产即时崩溃面；但该 API 是 npm 包交付形态的公共 API，按文档化主场景使用即确定性崩溃，叠加测试假绿，维持 HIGH。
- **建议**: 本 Sprint 内最小修复=`validateBundle`/`applyPatchBundle` 显式拒绝缺失可执行 `matcher`/`transform` 的补丁条目（抛 `PatchLoadError`，消息说明 JSON 不可携带函数），并补"JSON-only 补丁被拒绝"的真实路径测试消除假绿；补丁包声明式 DSL / 预注册 transform-id 白名单的 schema 重设计属 arch 层（F-011 AC-005 传输格式回炉），登记 backlog + 上游反馈，不在本卡修复范围。
- **证据**: `packages/ruleset/src/patch-loader.ts:16-51,86-90,93-108`；`packages/ruleset/src/rules/scope/strip.ts:15`、`clamp.ts:9`、`patch.ts:9`（无条件调用 `rule.matcher`）；`tests/ruleset/patch-loader.test.ts:22-30`。

### [SR-002] MEDIUM: T-060 补丁 `scope` 值未做 `RuleScope` 枚举校验
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `validateBundle` 仅查 `scope` 为字符串（`patch-loader.ts:40-44`），非法 scope（如 `"unknown-scope"`）通过校验后注入，无执行器认领而静默失效，与 AC-003 原子性校验精神不符。
- **建议**: 增加值域校验（`strip|clamp|transform|patch|lint`），非法值抛 `PatchLoadError`。可随 SR-001 修复同 PR 处理。

### [SR-003] MEDIUM: ruleset 全部 42 条 builtin 规则未落实 arch#§2.M-003 fixture 目录规范
- **category**: consistency
- **root_cause**: upstream-caused（模式自 Sprint 2 T-015 建立，T-056/T-060/T-061 沿用包级既有约定；本 Sprint 规则扩容放大覆盖面）
- **描述**: arch 规定规则 fixture 目录含 `input.html`/`expected.html`/`metadata.json`（微信客户端版本兼容元数据），`RuleDefinition.fixture?` 字段（`registry.ts:16`）为此设计但全包零填充、目录不存在。行为正确性由内联 TS fixture 保证，但"按微信版本追踪已知问题规则"的结构化元数据能力缺失。
- **建议**: 二选一收口：确认场景优先级低则修订 arch#§2.M-003 移除该规范（消除架构-实现落差）；仍需保留则登记专项迁移任务。不阻塞本 Sprint。

### [SR-004] LOW: T-058 / T-068 dev-plan 勾选态 stale（实现已交付、复选框未勾）
- **category**: convention
- **root_cause**: self-caused（文档维护疏漏）
- **描述**: T-058 的 8 条 AC + 6 条 deliverables（`dev-plan-wechat-flow-s6.md:147-161`）与 T-068 的 2 条 deliverables（:487-488）勾选框为 `[ ]`，但交付事实均已核实（T-058 8/8 AC delivered 逐条见切片核对；T-068 组件+测试+挂载齐全）。
- **建议**: 随本报告收口 PR 批量补勾。

### [SR-005] LOW: preferences-store `init()` 双重调用
- **category**: duplication
- **root_cause**: self-caused
- **描述**: `EditorShell.vue:253` 与 `EditorPreferencesSection.vue:7-9` 各自 `onMounted` 调用 `preferencesStore.init()`，幂等但重复 IndexedDB 读取。
- **建议**: 保留应用级入口一次初始化，或加 initialized guard。随后续维护顺手清理。

### [SR-006] LOW: StatusBar `readMinutes` 恒为字面量 1 的死值展示
- **category**: dead-code
- **root_cause**: self-caused（不在 T-066 AC 范围内的遗留死值字段）
- **描述**: `EditorShell.vue:131-134` metrics 的 `readMinutes` 硬编码 `1`，`StatusBar.vue:78` 持续渲染"1 分钟"恒定假值。
- **建议**: 登记 backlog 按字数实现阅读时长计算，或先从 UI 隐藏该字段。

### [SR-007] LOW: `export-penpot-tokens.ts` 的 `verifyPenpotTokens` 缺对称边界测试
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: 同构 gate 函数 `checkFrames` 在 `tests/design-sync/frames.test.ts` 有完整边界测试，`verifyPenpotTokens` 无对应测试文件，覆盖不对称。
- **建议**: 补 `tests/design-sync/tokens.test.ts` 覆盖文件缺失 / token 数不足 60 / 达标三路径。

### [SR-008] LOW: `export-penpot-tokens.ts` 对损坏 JSON 无优雅错误处理
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `JSON.parse` 未包 try/catch（`export-penpot-tokens.ts:25`），非法 JSON 抛未捕获 SyntaxError 退栈（exit 非 0 仍会 gate 失败，但失败契约与文件缺失分支不一致）。
- **建议**: catch 后返回结构化 `{ ok: false, error }`，统一失败契约。

### [SR-009] LOW: `scripts/realworld-verify.ts` 未注册 package.json script 别名
- **category**: convention
- **root_cause**: self-caused
- **描述**: 与 `pnpm bench` 等工具脚本调用惯例不一致，可发现性差。
- **建议**: 可选补 `pnpm realworld-verify` 别名。

### [SR-010] LOW: T-089 AC-002"热更新"落地语义弱于字面
- **category**: ambiguity
- **root_cause**: reviewer-calibration
- **描述**: 实现为"运行时可注入替代词库"（`options.keywords`），非文件热 reload / `rulesetVersion` 自动 bump 联动（两版本号独立）。合理近似，无需返工。
- **建议**: 文档层澄清 AC 措辞（"热更新"→"可配置注入"）。

### [SR-011] LOW: T-128 golden fixture 重生未逐字节 diff 审计
- **category**: completeness
- **root_cause**: reviewer-calibration（审查深度限制，非缺陷信号）
- **描述**: 5 个 fixture HTML 的 word-diff 是否严格限于 style 增量未在本轮逐文件比对；由 T-057 既有回归测试 + 全量套件全绿间接保障。
- **建议**: 可选巡检项，不阻塞。

### [SR-012] LOW: design-sync 工具链未接 CI（观察项，符合任务设计）
- **category**: structure
- **root_cause**: input-caused
- **描述**: `design:token-diff` 纯本地文件比对、CI 可行但未接入 workflow；`design:export-*` 依赖交互式 Penpot MCP 不适合 CI。当前为 orchestrator 手动触发验证工具，符合 validation 卡语义。
- **建议**: 若 token 一致性需常态化门禁，评估将 `design:token-diff` 加入 ci.yml。

## drift-rate 聚合

- **交付语义偏移率 = 0%**：活跃范围（含 T-129）规划 AC 168 条，延期 AC 0（T-058 的 8 条未勾项经逐条核实全部 delivered，属文档 stale 非延期）、计划外 AC 0（unplanned_files=0；T-128 AC-005 / T-062 命令 / T-063 路径等为卡内已裁决纠偏，非新增范围）。远低于 20% HIGH 阈值。
- **AC/deliverables 文本漂移聚合（root_cause=upstream-caused，勿逐卡回改）**：T-113 5 处（listRules→builtinRules、ruleset 无 dist、snapshots/{platform}/ 结构、dimensions.every→{passed,failures}、table-grid/highlight 命名）+ T-056 通配 + T-058 stories/命名模板 + T-059 测试布局 + T-068 子目录 + T-062 命令 + T-063 路径。共性根因=dev-plan 撰写时点早于实现约定收敛、且完成后未回写；已打包上游反馈 `docs/feedback/fb-dev-plan-path-drift-writeback-20260701.md`。
- **簿记订正**：T-129 实为 Sprint 6 已交付卡（PR #61），CLAUDE.md §当前Sprint 合并清单此前漏记；卡片物理位置仍在 dev-plan §4 Deferred Backlog（与 T-128 先例一致，不迁移，以本报告为准）。

## wiring-completeness 遗留核实

| 遗留 | 核实结论 | 处置 |
|------|---------|------|
| T-087/T-088 内置主题 `assets`/`paintable` 未激活 | **属实未变**：5 内置主题 `assets: {}`（`packages/themes/*/src/index.ts:26`）；`defaultAssets` 等资产仅测试引用未接生产主题。确定性门控保证空值=byte-identical no-op，机制经测试内注册主题验证正确 | 维持 backlog（激活填充 + Linux 视觉基线重播配套） |
| T-085 skill description 自动 optimizer 未跑 | **属实未变**：环境限制（无头 `claude -p` 401）；现行手写 description 含触发短语与排除边界，人工审查合格 | 维持 backlog，不影响可用性 |

## T-131 conditional_release 残差收口登记

按 T-131 卡要求在本报告登记：3 条 blocking_conditions（[B1] P-002 桌面侧栏文档列表未实现 / [B2] P-005 移动预览 demo fixture 未 seed / [C] 14 交互触发组件 static overlay 未捕获）已按用户决策（EVENT-LOG `user_decision` 2026-07-01T16:44:53Z ref=T-131）全部 disposition 至 CLAUDE.md §待办(deferred) backlog，`blocking_conditions` 清空为 `[]`，Sprint DONE 判定解阻。[C] 的代码层根因（`design-overlay.spec.ts` 元素未渲染时静默整页截图退化）与 backlog 中"data-testid 定位 + 交互驱动截图"增强方向一致，不重复立项。

## 质量聚合

- 跨切片模式：**测试假绿风险集中在"helper 构造理想输入"**（SR-001 makePatchRule 带真函数 vs 真实 JSON 路径）——与 [[implementer-skips-tests-typecheck]] 记忆中的空心断言风险同族，建议后续 RED 阶段对"外部输入反序列化边界"强制加真实格式测试。
- 文档勾选态同步（SR-004）与 deliverables 路径回写（drift 聚合）为同一根因的两个表现，均指向上游 dev-plan 写回机制缺失（已有上游反馈）。
- 其余 24 卡 clean 或仅 LOW，无系统性质量退化信号；wiring-completeness 全部真实挂载，无"组件存在但未消费"断链。

## 三态判定

存在 1 × HIGH（SR-001）→ **needs_revision**。

- **重入修复任务**: 仅 **T-060**（范围=SR-001 最小修复 + SR-002 顺带：校验硬化拒绝无函数补丁 + JSON 真实路径测试；schema DSL 重设计走 arch backlog/上游反馈，不在本卡）。其余 27 卡维持 done，不重跑。
- 修复合入后出 r2 增量复核（仅复核 T-060），r2 approved 后 Sprint 6 判定 DONE。
