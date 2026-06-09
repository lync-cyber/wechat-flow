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
- 上次完成: Sprint 1 UI 代码线 T-008/009/010/011 全 DONE + sprint-review 收尾(needs_revision→revision 兑现三件套目标). UI 线: T-008 三栏布局(EditorShell/TopBar/Splitter+F11+平板抽屉; 首建 Vue 测试脚手架 vue-plugin+happy-dom + tokens.css 全量 ui-spec §1) → (T-009 SourcePane CodeMirror6+directive高亮+debounce300ms ∥ T-010 PreviewPane iframe sandbox=''+CSP) → T-011 composeRender 接线; 各 approved_with_notes→MEDIUM 全修, T-011 needs_revision(pinia隔离)→修. **sprint-review 抓到 per-task 漏掉的顶层 wiring 缺口**: SR-003(EditorPage未挂EditorShell)/SR-006(render未集成inlineStyle)/SR-001(草稿未接线)=三件套目标兑现缺口 → revision 全修: EditorPage→EditorShell渲染 + render集成inlineStyle(预览inline-styled) + 草稿接线(SourcePane↔saveDraft/loadDraft, currentDocId=draft-default) + inline-style边界测试 + IndexedDB并发guard + use-splitter-width.init try/catch(消除38 unhandled rejection). commit 97f5e73(UI线), revision待commit. 门禁全绿: vitest 125 passed 0 errors/typecheck/biome. 教训: 子代理多次truncation/误判'0error'(IDE中间快照)→主线程强制无缓存复验兜底; per-task review盲区(顶层挂载链)靠sprint-review系统视角补
- 下一步行动: sprint-review revision 改动**待 commit**(EditorPage/EditorShell/stores/use-splitter-width/core render/indexeddb-adapter + tests/core + EditorShellDraftPersistence.test + SPRINT-REVIEW-s1-r1 + CODE-REVIEW-T-011-r2 + EVENT-LOG + CLAUDE.md). 下一步: (1) commit revision (2) **T-098 Penpot 设计稿对照签字**(需用户视觉 sign-off, 对照 'S1—P-001 线框稿'+'S1—组件视觉稿'; app 现可 vite dev→localhost:5173 看真实三栏) (3) T-108 Sprint1 用户验证(三栏/实时预览/拖拽持久化/草稿恢复/平板抽屉, 三件套缺口已修应可通过). Sprint 间无人工 checkpoint(仅 pre_dev,已过)
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2]
- 当前Sprint: Sprint 1 收尾 — 代码基础 T-005/006/007/012 done(sprint-review 批量审过); 设计线 T-096/097 done(签字); UI 代码 T-008/009/010/011 **DONE**(per-task review); sprint-review **done**(needs_revision→revision 兑现三件套目标); 待: T-098 设计签字 + T-108 用户验证
- 待办(deferred, 跨 Sprint): (1) LOW tool-contracts.ts placeholder z.object({}).passthrough() zod4-deprecated → S4 迁移 z.looseObject; (2) LOW T-002 AC-003 "no test files found" 描述过时(知会); (3) **MEDIUM [T-011 R-005]** core RenderResult 缺 postPaste 字段(arch M-002 要求) → core 骨架完善时补(packages/core/types.ts + render.ts); (4) **MEDIUM [T-010 R-001]** iframe sandbox XSS阻断在 happy-dom 假绿 → 真实 sandbox 阻断语义待 Playwright E2E(T-058)覆盖
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

