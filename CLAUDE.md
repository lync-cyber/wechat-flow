@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.14.0
  <!-- 由 cataforge deploy 自动盖入已安装包版本。SemVer: MAJOR=不兼容变更, MINOR=新功能, PATCH=修复 -->
- 语言定位: 中文框架（提示词/文档/交互用中文；代码/变量/CLI参数用英文）
- 执行模式: standard
  <!-- 用户原选 agile-lite 不约束行数；因既有 PRD 已达完整体量，Bootstrap 中切换为 standard。"不为简化而牺牲语义完整性"保留为项目偏好，amend / lite 类文档需注意 -->
- 阶段配置: 全部启用，无 N/A
  - ui_design: 启用（Web App 需要 UI 设计）
  - testing: 启用
  - deployment: 启用
- model 继承: AGENT.md 中 `model: inherit` 继承父会话模型；可用 `model: <model-id>` 覆盖

- 项目名: wechat-flow
- 项目定位: 面向微信公众号写作者的 Markdown 写作与排版工具 — 写作契约 + LLM 友好统一 API + 主题组件库；产物契约为经过微信编辑器粘贴过滤后视觉一致的 inline-styled HTML
- 交付形态: Web App（含预览/编辑界面）+ npm 包 + MCP server / CLI 多形态

## 执行环境 (Bootstrap 时由 `cataforge setup env-block` 填入)

<!-- 本节在 Bootstrap 步骤中生成。每次会话都会作为项目指令加载，
     权重高于 hook 注入的 additionalContext。项目生命周期内保持稳定。 -->
- 包管理器: pnpm@9.15.9（monorepo workspace，见 pnpm-workspace.yaml）
- 运行时: Node.js ≥ 22（package.json engines）
- 类型检查: TypeScript 5.7（`pnpm typecheck` = turbo per-package `tsc --noEmit` + `tsc -p tests/tsconfig.json`）
- 测试框架: vitest 2.1（`pnpm vitest run`）
- Lint/Format: biome 1.9（`pnpm biome check .`）
- 构建/任务编排: Turborepo 2.3（`turbo build`）；apps/editor 用 Vite 6

## 项目状态 (orchestrator专属写入区，其他Agent禁止修改)
- 当前阶段: development
- 上次完成: **本会话两切片均在 feature/mcp-export-tools：T-092 done（待提交）+ T-039 done（已提交 5f079b3）**。**T-039** MCP 异步导出 Tool(export_long_image/export_cover/get_job/upload_image) — 注入式 JobsClient 接缝(apps/mcp-server/src/jobs/client.ts)+4 thin-wrapper+router 工厂注入+stdio 默认 makeNotImplementedJobsClient（真实 BullMQ adapter 延 T-111）。**T-092** 主题预填 template+第9维守护+describe_template Tool — T-092a(packages/core/src/registry/template.ts defineTemplate/listThemeTemplates/describeTemplate/validateTemplateCoverage + theme-guard/template-coverage.ts validateThemeTemplates mdast 覆盖检测 9元素+6块 + 5 themes templates/starter.md fixture + 主题侧 src/templates/index.ts 注册 themes→core)、T-092b(describe_template MCP Tool, contracts schema 补真+router 注册)。typecheck 48/48、全量 vitest 1007 passed；主线程坐实 GREEN 自报告(学习③:修 2 处 TS2352 错 cast、biome --fix、tsc 假绿)+REFACTOR 内联抽 SIMPLE_NODE_ELEMENT 查表降 complexity；T-092a 跨 core+themes 注入 Mid-Progress 契约守学习②。**前序 relay-jobs 切片 + composition capstone 已合 main（PR #15，merge 99f8ebc）**：T-034(BullMQ 队列 bullmq-{kind}/state-machine/idempotency idem:{apiKeyId}:{sha256} TTL24h/sse-bridge/routes/jobs；字段取 ARCH 权威 state/progress) + T-035(playwright-pool channel:'chromium'/render-long-image 默认 750/render-cover 900×383·900×900/persist-export public/exports；worker apps/job-worker 消费队列) + **composition root**(main.ts createJobsRuntime→jobsDeps BullMQ-backed store + QueueEvents→sse-bridge，job-composition/job-e2e 测试覆盖 POST→worker 渲染→GET)。真实 Docker Redis 7 + 全量 chromium 本地验证，949 tests green，CI-sim 96.5/90.3/90.0/96.5 达阈值。**另确认 T-030 composeCopy(9cd22e8) + T-031 composeExportHtml(fca007a) done**（早前 session，原状态漏记）。前序均合 main：relay-backend T-032/091/033 + 6 图床(PR #12)、MCP server T-036/037/038/118/119/122(PR #10，24 Tool；core registerVariant/getBlockBaseStyle@packages/core/src/registry/variant.ts)、L3 cascade T-120/121(PR #6)、framework 0.14.0(PR #14)。运行学习：①接线类 AC 须行为级测试 ②standard 跨包子代理易 truncation→**GREEN 限定单包可规避**/主线程接管 ③不轻信自报告、主线程取地面真值复核（stale IDE 诊断/stale §项目状态 屡现，git/tsc/biome 为准）④白名单 SSOT=packages/core/src/registry/css-property-whitelist.ts ⑤`cataforge deploy --rebuild` 删 CLAUDE.md ⑥app 私有第三方依赖被集中式 `tests/` 引用须同提 root devDeps ⑦改 core 注册契约回溯波及 reset 型测试 ⑧0.13.1 deploy 从 framework.json#project.design_tool 盖设计工具行 ⑨security_sensitive 任务 per-task code-review 会查出 AC 未覆盖但 ARCH 契约要求的安全路径→记 upstream-gap ⑩wiring 类缺陷（route 未挂载 app 树）测试直接构造子应用会假绿，code-review 须查 createApp/main 接线终点 ⑪CI 门禁强于本地：gitleaks 须 `.gitleaks.toml` allowlist；新代码三元/错误路径多会拖低 branch 覆盖<90%→PR 前 local `pnpm test:coverage` 预跑补分支测试 ⑫Playwright headless-shell TLS 不可下载→全量 chromium+channel:'chromium' 跑新 headless ⑬浏览器/Redis-only 文件 coverage-exclude+真实 infra 可达性 gate 双层测试(纯逻辑 DI 永跑/集成 gate)，CI 无 infra 不跌覆盖 ⑭feature 切片 squash-merge 后 §项目状态/EVENT-LOG 须做合并后对账（merge commit 自身带入的状态文字仍是合并前快照，会内部矛盾）。
- 下一步行动: **Sprint 4 收尾 — 实现就绪 feature 项已全完成**（T-039 提交 5f079b3 + T-092 待提交，均 feature/mcp-export-tools）。**待用户决策**：(a) feature/mcp-export-tools 开 PR 时机（含 T-039+T-092+合并后对账，CI 跑全量门禁）；(b) Sprint 4 **余下全部 DESIGN 门禁** —— T-102/T-105/T-106 [DESIGN] Penpot 视觉稿需用户 sign-off 方解锁 UI 页 T-040(JobProgressBar+Toast SSE)/T-041(主题市场)/T-042(设置页)/T-093(上传 UI)；T-111 [VALIDATION] 待 UI 完成后用户手动验证。无 DESIGN 推进则 Sprint 4 feature 侧到此为止，可转 sprint-review 批量审查。housekeeping：已合并陈旧分支（feature/relay-jobs、feature/relay-backend、chore/framework-update-0.14.0、chore/relay-post-merge-reconcile）可清理。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: Sprint 4 进行中（收尾）— 已合 main：输出能力 T-030/031(PR #8)、L3 cascade T-120/121(PR #6)、MCP server T-036/037/038/118/119/122(PR #10)、relay-backend T-032/091/033+6 图床(PR #12)、framework 0.14.0(PR #14)、relay-jobs T-034/035+composition(PR #15)。**T-039 + T-092 done（feature/mcp-export-tools；T-039 提交 5f079b3 / T-092 待提交，待 PR）**。余全部 DESIGN 门禁：T-040/041/042/093（待 T-102/105/106 Penpot sign-off）+ T-111（[VALIDATION]）。Sprint 0-3(PR #1/#2/#6/#7)。
- 待办(deferred): **dev-plan AC-004 校正**：T-037 lint_markdown 的 position 诊断 severity 实为 `warning`（custom-css 路径）非 AC-004 写的 `error`（strip-position 静默 strip 无诊断；rejected-but-stripped 渲染仍成功，warning 语义更合理）→ sprint-review 改 AC-004 'error'→'warning'，勿改 core；iframe sandbox XSS 阻断在 happy-dom 假绿 → Playwright E2E(T-058)；juice/client 跨运行时 bundle(bundler-alias)；AC-T121-003 偏弱 + transformToHast.options 占位；LOW 历史卷描述过时(s1 T-002 / s0 T-004 计数，知会不改)；上游反馈 #254/#255 + fb-framework-update-0_11_1 待提交 CataForge；0.13.0 deploy --rebuild wipe CLAUDE.md 已开 CataForge#340；0.13.1 deploy design_tool 静默重置已开 CataForge#350。**T-091 deferred**（sprint-review 处置）：R-003 错误信封统一 ErrorResponse `{error:{code,message,requestId}}`（跨切 relay 全局含 T-032 validator → 独立 error-envelope 任务）、R-005 refresh 窗口 exp-1min 强制（与 revoked 测试时钟耦合）、R-007 长期 API key 哈希校验路径（属 E-010 另任务）、R-008 deviceFingerprint min16/max128、R-006/R-009/R-010 LOW。**T-033 deferred**：R-007 editor-session 与 images 同名路由整合（待 auth 中间件 + images 统一接线）、R-008 qiniu 缺凭据静默回退、R-009 PNG/WebP EXIF 测试覆盖、AC-002b 2.5MB 压缩目标未追求（仅 10MB 硬限）；**云适配器 notes**：COS Content-Type 未纳入 q-header-list 签名(R-001)、OSS auth 格式断言润色(R-003)、oss/cos/smms/custom 缺 env-gated 集成测试（真实上传正确性 dev 验证）。**T-092 deferred**（sprint-review 处置）：①card AC-004 字段名 `{valid,templateCount,missingElements}` ↔ ARCH `ThemeTemplateValidationResult{pass,templates[],failingTemplates}` 不一致（实现以 ARCH 为准）；②card AC-006 简单响应 ↔ API-033 富响应（coveredElements/mdastSummary/dependencies）未实现，延后；③describe_theme.templates 仍硬编码 `[]`，待接 listThemeTemplates（T-038 follow-up）；④describeTemplateResponseSchema 暂宽松（全 optional 保 tool-count 绿）可收紧；⑤T-092 per-task code-review 延 sprint-review 批量（跨 contracts+core+5themes+mcp，含 contracts template-definition.ts 加 metadata 字段的越界但架构正确改动）。**upstream-gap**：T-119 core registerVariant 缺 ARCH#API-034 的 E_SCHEMA/E_BLOCK_NOT_FOUND/E_SLOT_UNKNOWN 三码（T-122 补齐+显式 slots）；**T-091 dev-plan AC 未覆盖 API-032 的 401 E_AUTH(oauth 验签)/403 E_PERMISSION_DENIED(origin 白名单) 安全路径**（实现已补、AC 漏）→ upstream-gap 达阈值，**已 framework-feedback 上报 CataForge**：[#357](https://github.com/lync-cyber/CataForge/issues/357)（task-decomp AC 欠拟合 arch#API 契约，补录 T-091/T-119 至 CORRECTIONS-LOG 经 `cataforge correction record` 双写，correction-export 聚合）；另发现 feedback aggregator 解析脆弱点（deviation 带括号注释漏计）→ [#358](https://github.com/lync-cyber/CataForge/issues/358) bug；bundle 落 docs/feedback/。
- 文档状态:
  - prd: approved
  - arch: approved
  - ui-spec: approved
  - dev-plan: approved
  - test-report: 未开始
  - deploy-spec: 未开始
  <!-- changelog 由 devops 产出但不纳入门禁追踪 -->
- Learnings Registry: (compacted; archive in .cataforge/learnings/registry-archive.md)
  <!-- 上限：framework.json#claude_md_limits.learnings_registry_max_entries；超限运行 `cataforge claude-md compact` -->


## 文档导航

- 导航索引: `docs/.doc-index.json`（机器索引，所有 Agent 通过 `cataforge context read` 查询；缺失时运行 `cataforge context index` 重建）
- 通用规则: .claude/rules/COMMON-RULES.md
- 子代理协议: .claude/rules/SUB-AGENT-PROTOCOLS.md
- 编排协议: .cataforge/agents/orchestrator/ORCHESTRATOR-PROTOCOLS.md (orchestrator专属)
- 状态码Schema: .cataforge/schemas/agent-result.schema.json
- 加载原则: 按章节/条目粒度按需通过 `cataforge context read` 加载，不全量加载

## 全局约定

- 命名: TypeScript 社区默认 — camelCase 变量与函数 / PascalCase 类与类型 / SCREAMING_SNAKE 常量 / kebab-case 文件名（`my-module.ts`）
- Commit: Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:` / `build:` 前缀，可选 scope，例：`feat(theme): add literary theme`）
- 分支: GitHub Flow — `main` 永远可发布；功能分支命名 `feature/<short-name>`，bugfix 分支 `fix/<short-name>`；通过 PR 合入 main
- 设计工具: penpot
  <!-- 由 cataforge deploy 从 framework.json#project.design_tool 盖入。切换用 `cataforge setup --with-penpot`，勿手改本行 -->
  <!-- 可选值: none | penpot。penpot 时启用 Penpot MCP 集成 -->

- 人工审查检查点: [pre_dev]
  <!-- 详见 COMMON-RULES §MANUAL_REVIEW_CHECKPOINTS。standard 模式默认 [pre_dev, post_sprint, pre_deploy]；本项目精简至 pre_dev 以保持轻量推进 -->
- 文档类型命名: 小写 kebab-case（prd、arch、dev-plan、test-report、ui-spec、deploy-spec…），含工具参数和产出文件名
- 效率原则:
  - 最小传递: Agent间传递doc_id#section引用，非全文
  - 不确定时调研: 调用research skill，不猜测
  - 选择题优先: 需要用户输入时优先提供选项
  - 长文拆分: 文档超 `DOC_SPLIT_THRESHOLD_LINES` 行时按doc-gen拆分策略分卷
- 代码与文档纪律（完整定义见 COMMON-RULES §禁止设计阶段与变更说明残留；本节为项目级显式提示）:
  - 代码即事实: 命名 / 结构 / 测试是 WHAT 的单一来源，不写解释 WHAT 的注释；docstring 描述当前职责，不回溯历史
  - 最小注释: 默认零注释；仅在保留非显然 WHY（隐式约束 / 易踩边界 / 非直观不变量）时写注释，单行优先 ≤2 行
  - 不留设计过程残留: 源码 / docstring / 测试 / SKILL.md / AGENT.md / 协议 / 配置不留版本里程碑（"v0.x 起"、"MVP"）、过程标签（"本次新增"、"现已支持"）、对比叙事（"原方案 X、改为 Y"）、溯源引用（"issue #N"、"PR #N"、"修复了 X"）—— 变更说明只入 commit / PR / CHANGELOG，不溢出到长期文档
  - 自检：写完段落后用 COMMON-RULES §禁止设计阶段与变更说明残留 末尾的 regex 搜命中即删

## 框架机制

- Agent编排: orchestrator 通过 agent-dispatch skill 激活子代理
- DEV阶段: orchestrator 通过 tdd-engine skill 编排 RED/GREEN/REFACTOR 三个子代理（独立上下文）
- Skill调用: Agent按SKILL.md步骤式指令执行工作流
- 状态持久化: 项目指令文件（CLAUDE.md/AGENTS.md）§项目状态 + docs/ 目录
- 子代理通信: 通过文件系统(docs/和src/)传递产出物路径
- 运行时: 由 framework.json runtime.platform 决定（deploy 自动适配）
- **写权限**: 项目指令文件 §项目状态 由 orchestrator 独占写入；其他Agent只写 docs/ 或 src/ 下的产出文件
- 统一配置 `.cataforge/framework.json`:
  - `upgrade.source` — 远程升级源配置。升级时保留用户已配置值，仅补充新字段
  - `upgrade.state` — 本地升级状态。升级时始终保留
  - `features` — 功能注册表。升级时全量覆盖
  - `migration_checks` — 迁移检查声明。升级时全量覆盖

## 工具使用规范
- 优先使用 LSP 工具（go_to_definition, find_references, hover）查找符号定义和引用
- 避免用 grep/ripgrep 搜索代码符号，除非是搜索字符串字面量

