@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.13.0
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
- 上次完成: **T-037 done** — MCP render Tool 三件套（feature/mcp-server，未推送）。render_markdown/lint_markdown/get_ruleset_version 经 core `renderMarkdown` 实现（无需新依赖，三元组从 renderMarkdown 结果派生）；router `dispatchTool` 转 **async + HANDLERS 注册表**，auth gate 仍前置（guardUserScope 先于 handler）；21 tests（含 sha256 确定性、端到端 callTool）。跨任务测试改用 `derive_palette` 做占位探针。code-review 非强制（security_sensitive=false，延 sprint-review 批量）。**T-036 done**（前序）：stdio transport + 鉴权骨架，API key `sha256`+`timingSafeEqual`、scope-guard fail-closed、24 Tool 占位；code-review r1 needs_revision（HIGH R-001 鉴权 wiring 硬编码 null）→ revision keyRecord 经 createServer 贯通 → r2 approved。再前序：dev-plan s4 amendment（commit 309037f）；framework 0.13.0；输出能力 T-030/031（PR #8）；L3 cascade（PR #6）。运行学习：①接线类 AC 须行为级测试 ②standard 跨包卡子代理易 truncation→主线程接管 ③不轻信自报告、主线程取地面真值复核（本切片 implementer 多次自报 typecheck clean，实为漏跑 `tsc -p tests/tsconfig.json` + stale IDE 诊断，均主线程复核纠正）④白名单 SSOT=packages/core/src/registry/css-property-whitelist.ts ⑤`cataforge deploy --rebuild` 会删 CLAUDE.md，刷产物用普通 deploy ⑥app 私有第三方依赖被集中式 `tests/` 引用须同时提 root devDeps，否则 tests/tsconfig tsc 解析不到（TS2307），勿用 vitest.config alias 半截 hack。
- 下一步行动: 顺序推进剩余 MCP Tool（用户选 sequential）。**下一步 T-038**（list/describe themes/blocks/marks，需先在 mcp-server bootstrap 注册 5 内置主题+blocks+marks，list_themes ≥5 / list_blocks ≥25 / list_marks ≥11），然后 **T-122**（register_variant，接 core registerVariant；T-036 已完成解封）。三者都改 router.ts dispatch 故串行。后续切片：relay 后端(T-032..035/091)、编辑器 UI(T-040/041/042/093)、主题 template T-092、DESIGN(T-102/105/106)、VALIDATION T-111。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: Sprint 4 进行中 — MCP server 切片 **T-036 + T-037 done**（feature/mcp-server，本地未推送，含 dev-plan amendment 两 commit）；剩 T-038/T-122。输出能力切片 **PR #8 已合 main**；L3 cascade 切片已合 main（PR #6）。Sprint 0-3 已关闭合 main（PR #1/#2/#6/#7 均已合）。
- 待办(deferred): **dev-plan AC-004 校正**：T-037 lint_markdown 的 position 诊断 severity 实为 `warning`（custom-css 路径）非 AC-004 写的 `error`（strip-position 静默 strip 无诊断；rejected-but-stripped 渲染仍成功，warning 语义更合理）→ sprint-review 改 AC-004 'error'→'warning'，勿改 core；iframe sandbox XSS 阻断在 happy-dom 假绿 → Playwright E2E(T-058)；juice/client 跨运行时 bundle(bundler-alias)；AC-T121-003 偏弱 + transformToHast.options 占位；LOW 历史卷描述过时(s1 T-002 / s0 T-004 计数，知会不改)；上游反馈 #254/#255 + fb-framework-update-0_11_1 待提交 CataForge；0.13.0 deploy --rebuild wipe CLAUDE.md 已开 CataForge#340。
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
  <!-- 可选值: none | penpot。设为 penpot 时启用 Penpot MCP 集成 -->
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

