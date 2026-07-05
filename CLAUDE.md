@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.16.0
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
- 上次完成: **设计一致性收敛批（PR #101，amendment 合批）**：① arch 措辞修订 4 项（M-003 fixture 目录=`rules/builtin/{rule-id}/`、F-011 补声明式 patch DSL 结构、API-032 `refreshUntil=expiresAt`/续期窗口 exp−60s、内置模板集对齐实现 default→listicle/magazine→feature-story/literary→essay/business→case-study/tech→tutorial+共享 starter；graph 模式 scoped `context ingest` 非 finalize，diff 仅 arch 三卷）② ui-spec 文本同步前端权威 5 处（UC-020 品牌色置顶+数据驱动 token 名、UC-022 双按钮+selected 满铺、UC-001「复制到公众号」、UC-009 F11、UC-005 3→4 按钮）③ BC-12/13/15 Penpot 追平前端并用户 sign-off（临时 HTML 逐帧对比）：UC-020 重排品牌色首+token 名标签、UC-022 4 卡双按钮+selected #e6efed、UC-001 文案+topbar 背景条延伸、UC-009 Ctrl+\→F11+kbd 徽章(连 UC-016/010)、UC-005 补夜间风险 toggle、P-003 5 主题 hex 追平(literary 紫→棕/tech 青→蓝)、UC-015 保留分类 tab 前瞻加 A-014 占位 caption、UC-006 确认挂错标签无 delta。业务代码未动。
- 下一步行动: **项目 completed，剩余均为用户侧决策**：① **release go/no-go**（包版本 0.0.0 核对 / mcp-server 发布面 private 翻转→发布集 13→14 / npm-publish reviewers / 真实公众号粘贴回归 / Docker bring-up / CVE 阈值——细节见 §待办 + deploy-spec §9）② **设计一致性 backlog 已收敛**：BC-1..15 全收敛（BC-12/13/15 本批 Penpot 追平+sign-off，见 上次完成）；余 BC-4 派生 2 feature 缺口（可读性评级算法待 product spec、夜间风险 render pipeline）+ UC-015 分类分组前端待补（developer 项）见 §待办 ③ **amendment 批已完成**（arch 措辞 + ui-spec 同步 + Penpot 对齐，见 上次完成）。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment]
- 当前Sprint: 无（development 阶段已收口，Sprint 0-6 全部 DONE 合 main：Sprint 0-5 = PR #1~#31，Sprint 6 = PR #32~#70 + 残差 #71/#72；逐 sprint/逐卡历史见各 dev-plan、EVENT-LOG、docs/reviews/sprint/ 与 PR 记录，不在本状态区复述）。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **设计一致性收敛 backlog（T-131 AC-004 二轮 sign-off；逐条见 `SPRINT-REVIEW-s6-r3.md`）**: 15 条 blocking_conditions 全 disposition。**BC-1..15 全收敛**：BC-1..11+BC-14 = PR #94–98；BC-12/13/15 = PR #101 Penpot 追平前端+用户 sign-off（见 上次完成）。**余 open**：① BC-4 派生 2 feature 缺口——可读性评级算法待 product spec、夜间风险 nightRiskIssues render pipeline 填充（owner=product/developer）② UC-015 分类 tab/皮肤计数前端待补（裁决保留设计前瞻，标 A-014 占位；前端补齐 owner=developer）。r3 判一致 4 节 + LOW 散点见 r3。
  - **arch 措辞修订登记（owner=architect）**: ✅ 已完成（本批合入，见 上次完成）—— ①M-003 fixture 目录 `rules/builtin/{rule-id}/` ②F-011 声明式 patch DSL 结构 ③API-032 `refreshUntil=expiresAt` ④UC-022 双按钮（在 ui-spec/Penpot 侧完成）⑤模板集语义对齐实现全集。
  - **strip-aria-hidden/strip-data-attr 假绿缺陷（S6② fixture 迁移中发现）**: hast-util-from-html 将 kebab-case 属性归一化为 camelCase（ariaHidden/data*），两规则 matcher 在真实解析路径永不命中，fixture 已诚实冻结为 no-op —— 用户独立会话修复中。
  - **T-033 图床**: COS Content-Type 签名（需真实 COS 端点验 canonical/小写方法/百分号编码）·oss/cos/smms/custom env-gated 集成测试（需真实云凭据）。
  - **T-091 relay**: R-007 API key 哈希（属 E-010，无 admin 存储无落点）。
  - **Phase 7 发现的 dev 残留**: 四项（bin 字段/engines/JobsClient 注入//metrics 三 SLI）全部收口。遗留边界：npx 真正可用还需 release 决策翻 mcp-server private（见 下一步行动①）；JobsClient 全链路生产可用还差 relay Bearer token provisioning（属 E-010/T-091 既有 backlog）；dev/staging 可选的本地 Prometheus+Grafana compose profile 未加（deploy-spec §2.3 标可选，非登记缺口）。
  - **真实环境 E2E（余项均需真实凭据/部署环境）**: T-124 Worker delete 全局·T-126 微信真实 API（需 AppID/Secret，含 wechat-asset-upload 队列消费）。已收口项（iframe sandbox XSS=`pnpm test:sandbox-security`、T-125 真进程=`tests/mcp-server/http-process-e2e.test.ts`、Worker bring-up render 链路=`tests/job-worker/worker-process-e2e.test.ts` infra-gated、T-127 HMR 本机实证）见上次完成。
  - **upstream/CataForge**: 近期提报 [#421](https://github.com/lync-cyber/CataForge/issues/421)（finalize 全量重导出越权）·[#422](https://github.com/lync-cyber/CataForge/issues/422)（reconcile drift 永不归零 + remediation 方向误导）·[#423](https://github.com/lync-cyber/CataForge/issues/423)（doc-consistency 三类假阳性）；早前 7 项 #340/#350/#357/#358/#374/#375/#376 见 git 历史。
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
- 测试布局: 单元测试 colocate 于同目录 `src/**/*.test.ts`（apps/editor 组件惯用 `src/**/__tests__/*.test.ts`）；跨切面 / 特殊运行时（browser/edge/worker）/ 需独立 tsconfig 管辖的测试集中在根 `tests/<area>/`（由 `tests/tsconfig.json` 管辖，排除出 coverage/typecheck/biome 源码扫描；vitest.config include 三者并行）。任务卡 deliverables 的路径为代表性声明，实现按上述约定就近落点即可，路径与卡片不符不视为缺陷。
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

