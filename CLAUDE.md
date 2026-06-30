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
- 上次完成: **Sprint 6 T-058 Playwright 视觉回归矩阵（已合 main [PR #41](https://github.com/lync-cyber/wechat-flow/pull/41)，linux 基线已播种）** —— `e2e/visual/`：`story-matrix.ts`（`assertVariantFloor` AC-008 fail-fast<120 / `buildFullMatrix` 765=153 variant×5 主题 / `buildCoreMatrix` 每主题 8 P0+8 真实多 block composite / `buildSampledMatrix` 确定性 hash-shuffle 默认 0.2）+ `story-render.ts`（`renderStory` 经 renderMarkdown 渲 inline-styled HTML，`VisualStory.markdown` 承载 composite）+ `pixelmatch-config.ts`（threshold 0.2/includeAA false/ratio≤0.05）+ `theme-matrix.spec.ts`(core) + `variant-matrix.spec.ts`(`VISUAL_FULL` env 切全量765/抽样153) + `playwright.config.ts`(`snapshotPathTemplate` {platform} 隔离) + 4 workflows（visual-core/sampled/nightly + visual-update 自播种 seeder）；devDep `@playwright/test`。**任务卡 deliverable 漂移裁决**：① `packages/theme-*` 不存在→实际 `packages/themes/*`；② 项目无 Storybook→story 由 renderMarkdown 动态枚举（非静态 `__stories__/`）。**跨平台基线**：win32 本地基线 233（core 80+sampled 153）已提交证管线；linux 基线已由 visual-update workflow_dispatch 成功播种（commit `429a3f1`，845=core 80+全量 765；含 CI 容器 git `safe.directory` 修复，解 prepare/lefthook + 基线回写）。**主线程兜底抓修**：composite 场景空心（8 退化同 heading + `buildCompositeMarkdown` 死代码）→ 真实化 8 份不同多 block markdown + 加两两区分度测试；AC-007 nightly 恒抽样→加 `VISUAL_FULL` 全量切换；RED 假通过（`/variant/i` 误匹配 TypeError）→ `/120/` 硬化；biome import 排序残留清理。vitest 48 绿、`tsc -p tests` 0、全仓 biome 0、`pnpm test:visual` 233/233 win32。前批 T-086 已合 main（[PR #40](https://github.com/lync-cyber/wechat-flow/pull/40)）。
- 下一步行动: **Sprint 6 续建中。T-058 视觉回归 keystone 已合 main（[PR #41](https://github.com/lync-cyber/wechat-flow/pull/41)，解锁 T-062/063/070/113）；linux 基线已播种、visual CI 门禁生效；T-086 已合 main（[PR #40](https://github.com/lync-cyber/wechat-flow/pull/40)）**。执行顺序：**下一批 = P1（T-064/066/071/087/088/089/085）→ P2（T-067/069/072）→ T-113 验证门**。节奏：单任务一 PR、串行合并（§项目状态 单写区）。人工检查点 = [pre_dev]（已过），post_sprint 非门禁。**T-113 验证门 forward-drift**：其 AC 引用 `e2e/visual/snapshots/variant/` 与实际 `snapshots/{platform}/{testFilePath}/` 路径结构不符，T-113 需调和。Sprint 6 任务卡见 [`dev-plan-wechat-flow-s6.md`](docs/dev-plan/dev-plan-wechat-flow-s6.md)。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: **Sprint 6（质量门 + 视觉回归 + 性能基准 + skill bundle）；已合 main: T-056 / T-059（[PR #32](https://github.com/lync-cyber/wechat-flow/pull/32)）+ T-057 / T-061（[PR #34](https://github.com/lync-cyber/wechat-flow/pull/34)）+ T-060（[PR #36](https://github.com/lync-cyber/wechat-flow/pull/36)）+ T-090（[PR #37](https://github.com/lync-cyber/wechat-flow/pull/37)）+ T-068（[PR #39](https://github.com/lync-cyber/wechat-flow/pull/39)）+ T-086（[PR #40](https://github.com/lync-cyber/wechat-flow/pull/40)）+ T-058（[PR #41](https://github.com/lync-cyber/wechat-flow/pull/41)，linux 基线已播种）**。未实现的就绪/解禁任务: T-062 / T-063 / T-070 / T-064 / T-066 / T-067 / T-069 / T-071 / T-072 / T-085 / T-087 / T-088 / T-089 + T-104（Penpot 设计）+ T-113（验证门）。Sprint 0-5 全部合 main（PR #1~#31）；逐 sprint 历史见各 dev-plan、EVENT-LOG 与 PR 记录，不在本状态区复述。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **T-128**（新）: 五主题内容元素选择器样式增强（list/ul/ol/li / img / table / a），从 T-059 守卫范畴正交拆出（守卫只校验排版骨架）。dev-plan §4，P2，deps[T-059]，待实现。
  - **T-129**（新）: 桌面浏览器 Clipboard 降级路径（F-004 AC-007a，execCommand 兜底 + Toast 提示 Ctrl/Cmd+C）。PRD→任务 AC 级追溯审计发现的**唯一真实 gap**：`apps/editor/src/use-cases/copy.ts` catch 仅弹 error Toast 无降级；移动端 AC-007b 已由 T-055 实现。dev-plan §4，P2，deps[T-030]，待实现。
  - **T-033 图床**: COS Content-Type 签名（需真实 COS 端点验 canonical/小写方法/百分号编码）·oss/cos/smms/custom env-gated 集成测试（需真实云凭据）·AC-002b 2.5MB 压缩（现仅 10MB 硬限）。
  - **T-091 relay**: R-007 API key 哈希（属 E-010，无 admin 存储无落点）·R-006/009/010 LOW。
  - **真实环境 E2E（conditional_release，不阻塞收尾）**: iframe sandbox XSS（happy-dom 假绿→Playwright，可复用 T-058 Playwright 设施）·T-124 Worker delete 全局·T-125 mcp HTTP 进程·T-126 微信真实 API（需 AppID/Secret）·T-127 vite HMR 浏览器 —— 均 deferred 至部署/真实凭据环境。
  - **Sprint 5 backlog（sprint-review s4-r2 延迟项）**: SR-R2-002 use-sse-job 生产消费者（export-long-image 全链路）·SR-R2-003 上传 progress 恒 0（relay 同步上传→端点升级 SSE/chunked + AC-002 语义校正）·SR-R2-005 onDownloadHtml error 反馈·SR-R2-006 use-editor-session JWT 主动续期·SR-R2-007 SettingsPage 占位 section 补 [ASSUMPTION]。
  - **upstream/CataForge**: [#357](https://github.com/lync-cyber/CataForge/issues/357)（AC 欠拟合 arch#API）·[#358](https://github.com/lync-cyber/CataForge/issues/358)（feedback aggregator 解析脆弱）·[#340](https://github.com/lync-cyber/CataForge/issues/340)·[#350](https://github.com/lync-cyber/CataForge/issues/350)·[#374](https://github.com/lync-cyber/CataForge/issues/374)·[#375](https://github.com/lync-cyber/CataForge/issues/375)·[#376](https://github.com/lync-cyber/CataForge/issues/376)。
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

