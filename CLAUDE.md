@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息
- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: cataforge 0.4.1
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
 
## 工具使用规范
- 优先使用 LSP 工具（go_to_definition, find_references, hover）查找符号定义和引用
- 避免用 grep/ripgrep 搜索代码符号，除非是搜索字符串字面量

## 项目状态 (orchestrator专属写入区，其他Agent禁止修改)
- 当前阶段: dev_planning
- 上次完成: 跨文档联合评审（PRD+ARCH+UI-SPEC+DEV-PLAN）4 路并行 subagent + 1 路跨文档一致性 subagent 产出 36 项问题（5 严重 / 9 较高 / 16 中等 / 6 低）；用户确认 9 项关键决策 D1~D9（template one-time 拷贝 / M-002↔M-005 解耦移至 M-012 contracts / Tool=23 (19 同步+4 异步) / T-075 前移 Sprint 5 / F-005 升 P0 / TemplateDefinition 导出在 T-004 contracts / 审计日志最小方案 / WCAG AA 4.5 统一 / lockstep 共版本号）；4 路修订 subagent 并行/串行执行：PRD → 0.5.1（F-008 template 语义统一 + F-005 升 P0 + F-013 relay 注明 + F-003 AC-006 P0 25 全注册 + §1.2.2 lockstep + §3.1 端到端口径）/ ARCH → 0.6.1（Tool 数量 §3+M-009+API 三处统一 19+4 + M-002↔M-005 经 M-012 解耦 + E-011 contracts 包归属 + §5.5 审计日志最小方案 + WCAG 4.5 统一 + §6.1 skill/ 路径 + Q3.14 两阶段语义）/ ui-spec → 0.2.1（C-023 状态机/hover/平板降级补完 + C-019/C-020 颜色选择器 + C-009 命令面板键盘表 + §0.3 a11y 基线 + C-021 4 方向边界 + P-001 history.replace + C-017 双栏滚动联动 + C-001 断点 + A-014 假设）/ dev-plan → 0.4.1（T-001 加 M-012 AC + T-004 加 TemplateDefinition 导出 + T-018 加 AC-005/006 + T-019b→T-094 + T-052 复用 C-023 StatusBar + T-028 拆 28a/28b + T-050 拆 50a/50b + T-039/040/041 升 P0 + T-075 前移 S5 + T-092 归属 M-005 + LOC_SIGNAL 规范化 + 任务总数 94→96 (77+12+7)）；docs index 35 docs / 189 xref；validate 全绿
- 下一步行动: 进入 pre_dev 人工审查检查点 (项目配置 `[pre_dev]`)，用户确认后激活 tdd-engine 编排 Sprint 0 第一批任务（T-001 Monorepo 骨架 + T-002 工具链 + T-003 Turborepo + T-004 contracts 骨架 + T-DS-001 Penpot Token 导入）
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2]
- 当前Sprint: Sprint 0 (待用户确认 pre_dev checkpoint 后启动)
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
- 通用规则: .cataforge/rules/COMMON-RULES.md
- 子代理协议: .cataforge/rules/SUB-AGENT-PROTOCOLS.md
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
- 状态持久化: PROJECT-STATE.md + docs/ 目录
- 子代理通信: 通过文件系统(docs/和src/)传递产出物路径
- 运行时: 由 framework.json runtime.platform 决定（deploy 自动适配）
- **写权限**: PROJECT-STATE.md 由 orchestrator 独占写入；其他Agent只写 docs/ 或 src/ 下的产出文件
- 统一配置 `.cataforge/framework.json`:
  - `upgrade.source` — 远程升级源配置。升级时保留用户已配置值，仅补充新字段
  - `upgrade.state` — 本地升级状态。升级时始终保留
  - `features` — 功能注册表。升级时全量覆盖
  - `migration_checks` — 迁移检查声明。升级时全量覆盖
## 执行环境
<!-- 本节在 Bootstrap 步骤中生成。每次会话都会作为项目指令加载，
     权重高于 hook 注入的 additionalContext。项目生命周期内保持稳定。
     cataforge 0.4.1 已移除 setup --emit-env-block，本节由 orchestrator 手动填入，
     具体命令在 architect / tech-lead 阶段确定后由 amendment 更新。 -->
- 包管理器: 待 architect 决定（候选: pnpm / npm / yarn）
- 运行时: Node.js LTS（≥ 20.x）
- 类型检查: TypeScript（`tsc --noEmit`）
- 测试框架: 待定（候选: vitest / jest / node:test）
- Lint: 待定（候选: biome / eslint + prettier）
- 构建: 待定（候选: vite / tsup / esbuild — 视 architect 选型）

