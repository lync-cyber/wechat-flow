@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.11.2
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
- 上次完成: **framework 0.11.1→0.11.2 同步(version bump only, 4 文件) + KG 既有隐患排查**: 0.11.2 把 `definition_authority` 接入 reconcile/repair(修好 ⑨ 记录的 0.11.1 "override 仅 import 生效" bug); `kg validate` 暴露 main UC- 迁移遗留 **37 条悬空 `depends_on→C-NNN`边**(C-001/005/013/015/017... 旧名, 实体已 UC- 化但旧 store 关系残留, reconcile 因目标实体缺失而漏判/validate 抓到; 活动源已全 UC-, 残渣仅在 KG store)——待清理, 已登记 deferred(8). 我本轮的 C-NNN override 方案(PR #2 原始提交)被 main 的 UC- 重命名取代, 已 reset 重做为纯 0.11.2 同步. 承前 **framework-update 0.11.0→0.11.1 + C-→UC- 实体迁移收口**: 升级 cataforge 包至 0.11.1(uv tool; pip 因 pytest-logging 旧依赖构建失败)/刷新 scaffold(doc-gen/doc-nav/doc-review/doc-consistency/self-update 五 skill 并入统一 context)/重部署 IDE 产物/恢复 deploy 版本盖戳归一化误删的 §执行环境技术栈块. **KG 实体读取链(#253)落地**: 根因=Component(C-) 默认 authoritative doc_type 为 arch 而本项目在 ui-spec 定义→不抽取; 实测 context.kg_definition_authority 项目覆盖在 0.11.1 损坏(import 认/reconcile/repair 用默认不认→制造 ghost); 改用语义正确的 UIComponent(UC-) 全量重命名(460 处跨 prd/arch/ui-spec/dev-plan + apps/editor 源码测试), KG 重建 reconcile=0/doctor 全绿/23 C- WARN 消除. doc_id ui-spec-*-c001-c014→uc001-uc014 重命名 + review 文档历史引用同步(EVENT-LOG/快照/feedback 作审计保留). KG store 改为 git 跟踪(kg-first 源真, 运行态 LOG/LOCK/IDENTITY 仍忽略). 上游新增反馈包 docs/feedback/fb-framework-update-0_11_1(实体读取链/部署归一化/pip 依赖三问题). **运行学习(保留+新增)**: ①子代理事故处置 ②contracts 串行 ③IDE诊断以CLI为准 ④接线类AC须行为级测试 ⑤user_facing_critical_path validation 不可省 ⑥preview MCP resize/preview_eval ⑦grep 对账搜变体写法 ⑧amendment 收口三件套=docs index+context ingest+kg reconcile(repair 不修 ghost_section 须 kg delete) ⑨**KG 实体 authority=class→默认 doc_type(Component→arch / UIComponent→ui-spec / Page→ui-spec); kg_definition_authority 项目覆盖 0.11.1 仅 import 生效→reconcile/repair 用默认制造 ghost, 跨 doc_type 定义须改实体前缀而非配置覆盖** ⑩**重命名实体/doc_id 后 import 写新留旧 ghost section 须 repair 清; doc_id 改名=frontmatter id+全引用替换+context index 重建+KG re-import**
- 下一步行动: **Sprint 4(输出能力+MCP server) 待用户指令启动** — 启动前置已全部就绪: L3 cascade 三文档 approved, T-118..T-122 已入 S4 任务表(tdd-engine 调度注意: T-118 contracts 咽喉先行串行, 余卡按依赖序), 旧卡 T-030(composeCopy postPaste 真值=deferred(3))照常. 框架已升级 0.11.2(current). 上游反馈: #253(已以 UC- 重命名工作绕过; 0.11.2 已修 reconcile/repair 的 authority 解析, 验证 ⑨ 上游已闭环)/#254/#255 + fb-framework-update-0_11_1 待提交 CataForge; 历史 #234/#235/#236(#236 警示: 勿用0.8.0发布版重跑 kg init --force)
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: **Sprint 3 已关闭(sprint-review approved_with_notes, 4 notes全闭环 d1e282b)**. GitHub remote 已建(lync-cyber/wechat-flow), 转 PR 流程; **PR #1(framework 0.11.0→0.11.1 + C-→UC- 迁移)已合 main**, 本轮 0.11.2 同步在 **PR #2**(rescue 后纯版本升). (Sprint 1/2/3 已关闭已合main)
- 待办(deferred, 跨 Sprint): (2) LOW 历史卷描述过时(知会不改: s1 T-002 AC-003 juice 旧配置描述 + s0 T-004 AC-006 计数 23; tool-count 测试更新已锚 T-118 AC-005); (3) MEDIUM [T-011 R-005] postPaste true端真值路径(composeCopy stage5后调simulatePaste置true)待 Sprint 4 T-030(schema已严格化z.boolean()必填+true穿透测试已锚定, 仅剩composeCopy实现本体); (4) MEDIUM [T-010 R-001] iframe sandbox XSS阻断 happy-dom 假绿→Playwright E2E(T-058); (6) ✓已清=T-121 补卡(REVIEW-dev-plan-r6 approved); (7) ✓已清=本轮 dev-plan amendment(24 字面全卷一致, s0 历史卷除外); (8) MEDIUM [main UC- 迁移遗留] 37 条 `depends_on→C-NNN` 悬空边(validate violation, reconcile 漏判)——活动源已全 UC-, 仅 KG store 残渣; 待清理(kg store 重建 或 delete 悬空边), 不阻塞 Sprint 4
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

