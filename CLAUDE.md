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
- 当前阶段: completed（Phase 1-7 全部收口；release 执行为用户 go/no-go）
- 上次完成: **post 阶段 RETRO（本 PR）**：reflector 产出 [`RETRO-wechat-flow-20260702.md`](docs/reviews/retro/RETRO-wechat-flow-20260702.md)（80 份审查报告/15 次修订循环统计，EXP-001~010 十条跨项目经验：虚假绿色集中于 helper 理想输入 vs 真实外部输入路径差、AC 可行性前置审查、声明-实物漂移防线等）+ 2 份 SKILL-IMPROVE（test-writer/tech-lead）+ [`upstream-feedback-20260702.md`](docs/reviews/retro/upstream-feedback-20260702.md)（三件套 issue 草稿可直接提报 CataForge：finalize 越权重导出×5、reconcile 校准、doc-consistency 假阳性）。前批 Phase 7 收口（[PR #78](https://github.com/lync-cyber/wechat-flow/pull/78)）。**Phase 1-7 + post 全部完成。**
- 下一步行动: **项目 completed，剩余均为用户侧决策**（upstream 三件套已提报 #421/#422/#423，见 §待办）：① release go/no-go——包版本核对（现全 0.0.0）、GitHub Environment npm-publish required-reviewers 配置、PRD §3.5 真实公众号粘贴回归、Docker 环境容器 bring-up 实测、CVE 门禁阈值（deploy-spec §9-D4 needs_input）② **CataForge 0.15.0 升级可用**（本地 editable 包已 0.15.0、scaffold 仍 0.14.0，doctor 报 context.mode hybrid 枚举失效 + 5 处引用逃逸 FAIL 均属升级漂移）——运行 framework-update skill 对齐四层后再做后续会话 ③ dev 残留见 §待办（MCP JobsClient/bin 字段//metrics/engines + T-131[C] + S6 arch 收口项 + Sprint 5 backlog）。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment]
- 当前Sprint: 无（development 阶段已收口，Sprint 0-6 全部 DONE 合 main：Sprint 0-5 = PR #1~#31，Sprint 6 = PR #32~#70 + 残差 #71/#72；逐 sprint/逐卡历史见各 dev-plan、EVENT-LOG、docs/reviews/sprint/ 与 PR 记录，不在本状态区复述）。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **T-131 残差（conditional_release → backlog；B1 已收口 [PR #71](https://github.com/lync-cyber/wechat-flow/pull/71)，B2 已收口 [PR #72](https://github.com/lync-cyber/wechat-flow/pull/72)）**: [C] 14 交互触发组件（palette/menu/toast/modal/drawer/popover/dialog）design-overlay static 未捕获 → spec 增 data-testid 元素定位 + 交互驱动截图（设计板已 sign-off、实现各卡已验证，属 overlay 方法增强）。owner=developer。
  - **S6 sprint-review 遗留（arch 层收口 + LOW 清理）**: ① 补丁包声明式 DSL schema 重设计（F-011 AC-005 传输格式回炉——JSON 不可携带函数，现 API 已显式拒绝，需 selector/预注册 transform-id 白名单类方案，owner=architect）② arch#§2.M-003 规则 fixture 目录规范全包未落实（二选一：修订 arch 移除该规范，或专项迁移 42 规则，SR-003）③ LOW 批：SR-005 preferences init 双调用·SR-006 readMinutes 恒 1 死值展示·SR-007 verifyPenpotTokens 缺对称测试·SR-008 损坏 JSON 优雅处理·SR-009 realworld-verify script 别名·R2-001 id fallback 不可达分支（细节见 [`SPRINT-REVIEW-s6-r1.md`](docs/reviews/sprint/SPRINT-REVIEW-s6-r1.md)/[r2](docs/reviews/sprint/SPRINT-REVIEW-s6-r2.md)）。
  - **T-033 图床**: COS Content-Type 签名（需真实 COS 端点验 canonical/小写方法/百分号编码）·oss/cos/smms/custom env-gated 集成测试（需真实云凭据）。
  - **T-091 relay**: R-007 API key 哈希（属 E-010，无 admin 存储无落点）·R-006/009/010 LOW。
  - **Phase 7 发现的 dev 残留**: MCP HTTP transport 生产 JobsClient 注入（`startHttpTransport()` 现占位实现，export_long_image/export_cover/upload_to_wechat_asset 返回 E_NOT_IMPLEMENTED，compose 内注释已标）·mcp-server `package.json` 缺 bin 字段（npx 分发不可用，需 thin bin 脚本调 startStdioTransport）·`/metrics` Prometheus 端点未实现（arch#§5.5 三项 SLI，deploy-spec §2.3 登记）·npm 包 engines 声明缺失（TS 源码发布的消费方护栏，deploy-spec §9-D1）。
  - **真实环境 E2E（conditional_release，不阻塞收尾）**: iframe sandbox XSS（happy-dom 假绿→Playwright，可复用 T-058 Playwright 设施）·T-124 Worker delete 全局·T-125 mcp HTTP 进程·T-126 微信真实 API（需 AppID/Secret）·T-127 vite HMR 浏览器 —— 均 deferred 至部署/真实凭据环境。
  - **Sprint 5 backlog（sprint-review s4-r2 延迟项）**: SR-R2-002 use-sse-job 生产消费者（export-long-image 全链路）·SR-R2-003 上传 progress 恒 0（relay 同步上传→端点升级 SSE/chunked + AC-002 语义校正）·SR-R2-005 onDownloadHtml error 反馈·SR-R2-006 use-editor-session JWT 主动续期·SR-R2-007 SettingsPage 占位 section 补 [ASSUMPTION]。
  - **upstream/CataForge**: 已提报（2026-07-02 三件套，草稿经订正后提交）: [#421](https://github.com/lync-cyber/CataForge/issues/421)（finalize 全量重导出越权，5 次复现含回退修订中文档）·[#422](https://github.com/lync-cyber/CataForge/issues/422)（reconcile 图侧富集计 drift 永不归零 + remediation=export 方向误导）·[#423](https://github.com/lync-cyber/CataForge/issues/423)（doc-consistency 三类假阳性：裸 AC 令牌/跨分卷盲区/交付面误判）。早前已提报: [#357](https://github.com/lync-cyber/CataForge/issues/357)（AC 欠拟合 arch#API）·[#358](https://github.com/lync-cyber/CataForge/issues/358)（feedback aggregator 解析脆弱）·[#340](https://github.com/lync-cyber/CataForge/issues/340)·[#350](https://github.com/lync-cyber/CataForge/issues/350)·[#374](https://github.com/lync-cyber/CataForge/issues/374)·[#375](https://github.com/lync-cyber/CataForge/issues/375)·[#376](https://github.com/lync-cyber/CataForge/issues/376)。
- 文档状态:
  - prd: approved
  - arch: approved
  - ui-spec: approved
  - dev-plan: approved
  - test-report: approved（v1.1.0，verdict=approved，r1→r2 全程见 docs/reviews/doc/ 与 EVENT-LOG）
  - deploy-spec: approved（v0.1.0，r1 needs_revision → r2 approved）
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
- 测试布局: 单元测试 colocate 于同目录 `src/**/*.test.ts`（apps/editor 组件惯用 `src/**/__tests__/*.test.ts`）；跨切面 / 特殊运行时（browser/edge/worker）/ 需独立 tsconfig 管辖的测试集中在根 `tests/<area>/`（由 `tests/tsconfig.json` 管辖，排除出 coverage/typecheck/biome 源码扫描；vitest.config include 三者并行）。任务卡 deliverables 的路径为代表性声明，实现按上述约定就近落点即可，路径与卡片不符不视为缺陷。
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

