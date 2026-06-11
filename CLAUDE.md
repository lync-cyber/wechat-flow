@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.8.0
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

## 执行环境 (Bootstrap 时由 `cataforge setup --emit-env-block` 填入)
<!-- 本节在 Bootstrap 步骤中生成。每次会话都会作为项目指令加载，
     权重高于 hook 注入的 additionalContext。项目生命周期内保持稳定。 -->
{执行环境检测结果 — 未填入时 orchestrator 应在 Bootstrap 时调用:
 cataforge setup --emit-env-block}
 

## 项目状态 (orchestrator专属写入区，其他Agent禁止修改)
- 当前阶段: development
- 上次完成: **sprint-review s3 完成并闭环**: verdict approved_with_notes(SPRINT-REVIEW-s3-r1: 14/14任务, 60 deliverables, 36 AC全覆盖, Batch Code-Review 12代码任务×4维度过), 用户决策4项问题(2 MEDIUM+2 LOW)全部立即修复=d1e282b(SR-001 T-094首用例timeout 15s / SR-002 LeftPanelTabs onInsertBlock接线EditorShell.onInsertDirective / SR-003 22占位命令placeholder标记 / SR-004 Esc后view.focus()还焦), 修复带测试锚定(SR-004验证过红)+浏览器代理复验(插入链路+焦点保持全通). 门禁: vitest 580/580, typecheck 47/47, tests-tsc 0, biome 0. 注: 首次sprint-review派发后会话中断且无artifact, 按Crash Recovery重派成功. **运行学习存档**: ①4次子代理事故均闭环(截断→主线程接管, 崩溃→残值评估+重派, 会话中断无artifact→重派) ②contracts/theme-definition.ts契约咽喉→涉及任务串行 ③test-writer格式违规主线程biome --write修复 ④IDE诊断假阳性以CLI为准(但root缺依赖类报错是真阳性) ⑤**readFileSync源码字符串锚定不足以锚定行为接线**: T-115 GREEN借此产出no-op extension通过32测试, validation浏览器实测才暴露; 接线类AC须用行为级测试(真实EditorView dispatch断言回调) ⑥单元测试只断言store值≠预览跟随(F2 themeId被忽略但CommandPaletteWiring全绿); user_facing_critical_path任务的validation不可省 ⑦preview MCP环境: headless初始视口宽0须先preview_resize; preview_click对Vue @click不可靠(报成功未触发), 用preview_eval内.click()
- 下一步行动: **Sprint 4(输出能力+MCP server) 待用户指令启动**(post_sprint 已确认: 暂不启动). 框架反馈已上报上游 CataForge issues #234(bug: sprint-review Layer1 与 dev-plan 格式失配+3附带发现: framework-review自身FAIL/id slug/feedback --gh仓库推断) #235(suggest: 四项运行学习回流), bundle 落盘 docs/feedback/
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2]
- 当前Sprint: **Sprint 3 已关闭(sprint-review approved_with_notes, 4 notes全闭环 d1e282b)**. 本地merge模式(无GitHub remote). (Sprint 1/2/3 已关闭已合main)
- 待办(deferred, 跨 Sprint): (1) LOW tool-contracts zod4-deprecated→S4 z.looseObject; (2) LOW T-002 AC-003 描述过时(知会); (3) MEDIUM [T-011 R-005] postPaste true端真值路径(composeCopy stage5后调simulatePaste置true)待 Sprint 4 T-030(schema已严格化z.boolean()必填+true穿透测试已锚定, 仅剩composeCopy实现本体); (4) MEDIUM [T-010 R-001] iframe sandbox XSS阻断 happy-dom 假绿→Playwright E2E(T-058); (5) **[arch] M-002 指定 juice 内联化 与 §5.2 跨运行时(browser-main)矛盾** → 已去 juice 直接构建 styleMap 解决当前; 未来复杂 CSS 主题若需浏览器 CSS inliner 由 architect 评估(amend arch M-002 或浏览器兼容 inliner)
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

- 导航索引: `docs/.doc-index.json`（机器索引，所有 Agent 通过 `cataforge docs load` 查询；缺失时运行 `cataforge docs index` 重建）
- 通用规则: .claude/rules/COMMON-RULES.md
- 子代理协议: .claude/rules/SUB-AGENT-PROTOCOLS.md
- 编排协议: .cataforge/agents/orchestrator/ORCHESTRATOR-PROTOCOLS.md (orchestrator专属)
- 状态码Schema: .cataforge/schemas/agent-result.schema.json
- 加载原则: 按任务需要通过 `cataforge docs load` 加载相关章节，不全量加载

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

## 执行环境
<!-- 本节在 Bootstrap 步骤中生成。每次会话都会作为项目指令加载，
     权重高于 hook 注入的 additionalContext。项目生命周期内保持稳定。
     cataforge 0.4.1 已移除 setup --emit-env-block，本节由 orchestrator 手动填入，
     具体命令在 architect / tech-lead 阶段确定后由 amendment 更新。 -->
- 包管理器: pnpm@9.15.9（monorepo workspace，见 pnpm-workspace.yaml）
- 运行时: Node.js ≥ 22（package.json engines）
- 类型检查: TypeScript 5.7（`pnpm typecheck` = turbo per-package `tsc --noEmit` + `tsc -p tests/tsconfig.json`）
- 测试框架: vitest 2.1（`pnpm vitest run`）
- Lint/Format: biome 1.9（`pnpm biome check .`）
- 构建/任务编排: Turborepo 2.3（`turbo build`）；apps/editor 用 Vite 6

