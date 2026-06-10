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
- 上次完成: **Sprint 2 G1 完成(代码未commit)**: T-014(strip规则10条+RuleDefinition.transform→Node|null删除语义演化) + T-015(clamp5/transform5/patch2/lint3共15条+lint诊断流入report.diagnostics+4执行器从stub升递归walker) + T-016(sanitize stage: wechatFlowSanitizeSchema+extendSanitizeSchema增量合入, render主路径transform后/injectNodeIds前; css-attr-filter转义归一化修R-002 HIGH: CSS注释剥除+hex转义解码+-moz-binding拒绝; postPaste:false契约) + T-017(simulatePaste顶层API: filteredHtml/nodeDiffs/droppedAttrs, index.ts导出). fixture三件套25组(tests/ruleset-fixtures). 门禁全绿: vitest 238/238, turbo typecheck 30+tests-tsc 0错, biome 191文件0问题. T-016 code-review r1 needs_revision(R-002 HIGH)→revision→**r2 approved_with_notes**. **本轮运行学习**: ①子代理截断3次(RED批量×2/reviewer×1)全部"工件已落地、收尾未达"→主线程接管验证是标准动作, 给reviewer的mid-progress写报告骨架指令有效 ②IDE TS诊断假阳性累计10+次(properties not in Node/Cannot find module等), CLI双向复验(包tsc+tests-tsc)全排除, IDE诊断通道对本仓库不可信 ③RED工件内在矛盾(strip-pseudo-classes fixture metadata标lint vs strip-rules.test断言strip)按dev-plan AC锚定裁决scope=strip→debugger最小修复 ④跨任务共享文件(registry/apply/index)是G1并行的真实冲突域, T-014/T-015 GREEN串行+接口演化授权单一任务是正确调度
- 下一步行动: T-099(penpot设计稿 C-013+C-013.1: MCP server本会话已接入, 待浏览器端插件4400连接+用户视觉sign-off)→G2[T-018 deps T-017✓+T-099]→G3[T-019]→G4[T-052]→G5[T-109验证]. 用户已裁决: T-016 r2 notes全部inline修复(R-001 schema严格z.boolean()+3处测试载荷补postPaste, R-004 true穿透+缺失必填2用例, R-003 AttributeMap合并去元组强转), 终态 vitest 240/240. dev: localhost:5173
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2]
- 当前Sprint: **Sprint 2 进行中**(规则集过滤 + 诊断面板). sprint_groups: **G0[T-013✓,T-094✓]已合main(f45788c)**, **G1[T-014✓,T-015✓,T-016✓(awn),T-017✓]完成待commit**, T-099待penpot浏览器端→G2[T-018]→G3[T-019]→G4[T-052]→G5[T-109验证]. T-014/15/17延迟批量code-review入sprint-review; T-016已即时review闭环(r2). 本地merge模式(无GitHub remote). (Sprint 1 已关闭已合main)
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

