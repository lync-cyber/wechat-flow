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
- 上次完成: **deferred 技术债 backlog 4 簇 → [PR #18](https://github.com/lync-cyber/wechat-flow/pull/18) 已 merge 入 main（squash commit 0caf4fa，2026-06-25）** —— typecheck 48/48 + 全量 vitest 1058 passed/1 skip + biome 0 error。
  - 簇 A relay auth spine: 新增 `middleware/auth.ts`(resolveBearer+scope 守卫+统一信封) + `http/error.ts`(ErrorResponse{code,message,requestId}=R-003)；images 真路由接 upload-scope 鉴权、jobs 从 token 取身份(SR-B-003 不再信 body apiKeyId)、editor-session 占位 /images/upload+/admin handler 删除并 issue/refresh 挂进 createApp、main.ts 接线(Redis session-store + 内存 rate-limiter + fail-closed oauth)；R-005 refresh 1min 窗口 + R-008 deviceFingerprint min16/max128。新增 4 测试文件(auth-middleware/app-auth-integration/auth-rate-limiter/auth-session-store)。
  - 簇 C 图床(T-033): qiniu/oss/cos/smms/custom 缺凭据 fail-fast(对齐 AC-005)、WebP/PNG EXIF 剥离测试、OSS 确定性 auth 断言(oss.ts 注入 now)。
  - 簇 D(T-092 AC-006): describe_template 富响应 = core `describeTemplateDetailed`(coveredElements/coveredBlocks/mdastSummary/dependencies) + contracts schema 扩展 + tool 接线。
  - CI follow-up(并入 PR #18): fail-fast 凭据校验使必填字段 `?? ""` 兜底成死分支致 branch 89.86%<90% → 删冗余兜底(14 死分支) + 补 3 边界测试，branch 90.89%；新增 **pre-push 全量 coverage 守卫**(lefthook `pnpm test:coverage`，低于 vitest.config thresholds 阻 push；pre-commit 保持"数秒"快检不动)。
  - 前序合 main: **sprint-review 修复 [PR #17](https://github.com/lync-cyber/wechat-flow/pull/17) merge(d1c457e, 2026-06-24)** —— Sprint 4 feature 侧全部合 main；更早 T-039+T-092(PR #16)·relay-jobs(#15)·relay-backend+6图床(#12)·MCP 24Tool(#10)·L3 cascade(#6)·T-030/031(#8)·framework 0.14.0(#14)。运行学习见 [.cataforge/learnings/registry-archive.md](.cataforge/learnings/registry-archive.md)。
- 下一步行动: **Sprint 4 余下全部卡 DESIGN 门禁，等待用户决策**：T-102/105/106 [DESIGN] Penpot 视觉稿 sign-off → 解锁 UI 页 T-040/041/042/093 → T-111 [VALIDATION]。无 DESIGN sign-off 则 feature 侧到此。framework-feedback 本轮 4 项已上报 [CataForge#374](https://github.com/lync-cyber/CataForge/issues/374)。housekeeping: PR #18 merge 后 head 分支自动删，孤儿重建分支已清；本地仅剩 main；origin 残留 chore/relay-post-merge-reconcile + feature/relay-backend（已合并，待清）。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: Sprint 4（收尾）— feature 侧全完成并合 main（PR #6/#8/#10/#12/#14/#15/#16 + sprint-review 修复 PR #17 + deferred backlog [PR #18](https://github.com/lync-cyber/wechat-flow/pull/18) merged）。余全部 DESIGN 门禁：T-040/041/042/093（待 T-102/105/106 Penpot sign-off）+ T-111（VALIDATION）。Sprint 0-3(PR #1/#2/#6/#7)。
- 待办(deferred)（✅=deferred backlog 已解决并合 main, PR #18）:
  - **T-091**: ✅R-003 错误信封·✅R-005 refresh 1min 窗口·✅R-008 deviceFingerprint min16/max128·✅editor-session/images/jobs 路由整合(并入簇 A)。剩: R-007 API key 哈希(属 E-010, 无 admin 存储无落点)·R-006/009/010 LOW。
  - **T-033**: ✅qiniu(+oss/cos/smms/custom) 缺凭据 fail-fast·✅PNG/WebP EXIF 测试·✅OSS auth 断言。剩: COS Content-Type 签名(需真实 COS 端点验证 canonical 化/小写方法/百分号编码, 沙盒无法验证, 不盲改)·oss/cos/smms/custom env-gated 集成测试(需真实云凭据)·AC-002b 2.5MB 压缩未追求(仅 10MB 硬限)。
  - **T-092**: ✅AC-006 富响应(coveredElements/coveredBlocks/mdastSummary/dependencies)。剩: card AC-004 字段名 vs ARCH ThemeTemplateValidationResult(以 ARCH 为准, accepted)。
  - **sprint-review s4 余项**: ✅SR-B-003 jobs 鉴权(并入簇 A)。剩: iframe sandbox XSS happy-dom 假绿→Playwright E2E(T-058)·juice/client 跨运行时 bundle。
  - **upstream/CataForge**: T-119/T-091 AC 欠拟合 arch#API→[#357](https://github.com/lync-cyber/CataForge/issues/357)·feedback aggregator 解析脆弱→[#358](https://github.com/lync-cyber/CataForge/issues/358)·deploy --rebuild wipe([#340](https://github.com/lync-cyber/CataForge/issues/340))·design_tool 重置([#350](https://github.com/lync-cyber/CataForge/issues/350))·#254/#255+fb-0.11.1 待提交·本轮新发现(超长行/scoped-test gap/动态 import 绕守卫/sprint-review L1 噪声)已上报 [#374](https://github.com/lync-cyber/CataForge/issues/374)。
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

