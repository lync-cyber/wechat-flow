@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.15.0
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
- 上次完成: **设计一致性收敛 backlog BC-14 收敛（UC-014 JobProgressBar Penpot 帧，ui-designer 侧首条）**：检查发现该帧在 s6-r3 报告后已被完整重绘（非本会话所为），24 子元素覆盖 5 状态——queued 全灰轨 `#a3c4bc`(brand-muted)｜running `#2d5a4e`(brand) 62%｜completed `#3a6b49`(success) 满铺+「下载长图」｜failed `#b94a3e`(error)+重试钮(同色白字)｜canceled `#7a746c`(text-muted)，track 半高圆角=`--radius-full` 等效。逐色核对前端 token 权威 `apps/editor/src/styles/tokens.css`（success `#3a6b49`/error `#b94a3e`）**零失配**，`export_shape` 导出经用户视觉 sign-off 通过。BC-14「重绘或重导出后补比对」达标：前端运行时单实例 346×91 vs 设计规格拼版 560×486 的 aspect-ratio 差异属 s6-r3 全程标注的良性导出粒度差、非视觉缺陷，故收口为视觉 sign-off 而非 precheck 归零。**未动手重绘——目标内容与 BC-14『帧空白』描述矛盾时先核实、避免覆盖已正确成果（用户特别叮嘱先检查再动手）。** 设计侧 open 4→3（余 BC-12/13/15，随 arch amendment 批同步 Penpot）。前置提醒：BC-15/arch 措辞修订仍挂在 CataForge 0.15 framework-update 后的 amendment 批。
- 下一步行动: **项目 completed，剩余均为用户侧决策**（upstream 三件套已提报 #421/#422/#423，见 §待办）：① release go/no-go——包版本核对（现全 0.0.0）、mcp-server 是否纳入发布面（现 private:true，翻转后 `npx @wechat-flow/mcp-server` 才真正可用，发布集 13→14 需同步 deploy-spec §9-D1）、GitHub Environment npm-publish required-reviewers 配置、PRD §3.5 真实公众号粘贴回归、Docker 环境容器 bring-up 实测、CVE 门禁阈值（deploy-spec §9-D4 needs_input）② **CataForge 0.15.0 升级可用**（本地 editable 包已 0.15.0、scaffold 仍 0.14.0，doctor 报 context.mode hybrid 枚举失效 + 5 处引用逃逸 FAIL 均属升级漂移）——运行 framework-update skill 对齐四层后再做后续会话 ③ **设计一致性收敛 backlog**（T-131 AC-004 二轮 sign-off 产出 15 条 BC，见 §待办 + SPRINT-REVIEW-s6-r3.md）——**developer 侧 BC-1..BC-11 全部收敛**（两 HIGH BC-1/BC-11=PR #94/#95、MEDIUM 批 7 项 BC-2/3/5/7/8/9/10=PR #96、待决 2 项 BC-4/BC-6=PR #97）；余 3 条 open 均 ui-designer/设计侧：BC-12/13 裁转设计侧并入 BC-15、BC-15 设计侧对齐随 amendment 批走（BC-14 UC-014 Penpot 帧已收敛，见 上次完成）；BC-4 派生 2 项 feature 缺口登记 §待办（可读性评级算法待 product spec、夜间风险 nightRiskIssues 的 render pipeline 填充）；其余 dev 残留（T-033 env-gated、R-007、T-124/T-126 需真实凭据、strip 双规则独立会话）见 §待办 ④ arch 措辞修订三项已登记 §待办，随 framework-update 后的 amendment 批走。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment]
- 当前Sprint: 无（development 阶段已收口，Sprint 0-6 全部 DONE 合 main：Sprint 0-5 = PR #1~#31，Sprint 6 = PR #32~#70 + 残差 #71/#72；逐 sprint/逐卡历史见各 dev-plan、EVENT-LOG、docs/reviews/sprint/ 与 PR 记录，不在本状态区复述）。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **设计一致性收敛 backlog（T-131 AC-004 二轮 sign-off 产出，verdict=conditional_release，逐条见 `docs/reviews/sprint/SPRINT-REVIEW-s6-r3.md`）**: 15 条 blocking_conditions 已 disposition 至此 backlog（同上轮 r1 模式，清空解阻，不回退 Sprint 6 DONE / 项目 completed）；BC-1（HIGH，UC-019 PaintDrawer，PR #94）、BC-11（HIGH，UC-021 二段式，PR #95）、developer MEDIUM 批 7 项（BC-2/3/5/7/8/9/10，PR #96）与待决 2 项（BC-4/BC-6，PR #97）已收敛——**developer 侧 BC-1..BC-11 全部收敛**，余 3 条 open 均 ui-designer/设计侧（BC-14 已收敛）。**developer MEDIUM 已收敛（PR #96）**：BC-2 图标体系单色收敛(Toast/菜单/BlockLibItem glyph+pill/上传浮层拖拽箭头)、BC-3 UC-013 issue 行「查看」链接(nodeRef 裸 tagName 故预览节点最佳努力高亮)、BC-5 UC-003 顶栏图标钮 ghost 化(裸 button UA 边框→透明无边框)、BC-7 UC-007 ThemeCard brand 缩略图+12px 描述副行(themeMetaSchema 增 description)、BC-8 P-003 TemplateThemeCard 缩略图吃主题 background token(tech 暗底实证)、BC-9 P-004 SettingsPage 简化顶栏(← 返回编辑器)、BC-10 P-005 去视口 tabs(PreviewPane showToolbar)+缺失文档回退 demo。**developer 待决 2 项已收敛（PR #97）**：BC-4 UC-023 状态栏——按裁决接线违规词段（keyword-lint 计数，兼容性摘要剔除该类去重复计数）+ 夜间风险段（读 nightRiskIssues）+ 竖分隔线 + 三态色 + 平板违规词降 i 图标 tooltip；**派生 2 项 feature 缺口登记**：① 可读性段 defer（UC-023 spec 仅显示、无评级算法、Props 不带值，实现＝自行发明指标，需 product 定义可读性口径）② 夜间风险段忠实读契约字段但 `applyRuleset` 恒填 `nightRiskIssues:[]` 故常态显示 0（contrast guard 未接 render 报告，pipeline 填充属上游 feature，非视觉收敛范围）。BC-6 UC-017 修订预览——按裁决改前端对齐设计：双栏（原文/修订后+变更行左边框条）+ 中文分类侧栏（zh-en-space/fullwidth-punctuation/smart-quotes/ellipsis-dash→中文名各 N 处）+ 空态 ✓「文档排版规范，无需修订」+ 按钮「应用修订」；**BC-11 已收敛（HIGH，PR #95）**：UC-021 二段式流程为契约必选——二级 variant 面板+参数表单（超 3 字段跳 InsertDrawer）+插入后段 + 分类 tab/variant 计数角标/行首图标（block-glyphs）+ snippet class 语法 `:::block{.variant}` / inline 参数外置 `:mark[]{k=v}`，浏览器实链验证全通。**BC-12/BC-13 已裁决反向登记设计侧**：BC-12 UC-020 派生分组（token 名标注+数据驱动分组为可维护性更优实现）、BC-13 UC-022 selected 满铺 brand-subtle（有意增强保留），并入 BC-15 批同步 Penpot，owner=ui-designer。**ui-designer**：~~BC-14 UC-014 Penpot 空帧重导出(MEDIUM)~~ **已收敛**（帧经检查已完整重绘、5 状态 token 精确一致、用户视觉 sign-off，见 上次完成）、BC-15 设计侧对齐批(LOW，kbd 徽章 UC-009/010/012/016 / UC-005 切换器 / UC-015 分类 tab / UC-009 Ctrl+\ stale / UC-006 主题卡 / P-003 条色 / UC-001 文案，随 arch amendment 批同步 Penpot)。判一致 4 节(UC-004/UC-010/UC-012/P-001)+LOW 散点接受偏差见 r3。
  - **arch 措辞修订登记（owner=architect，随 CataForge 0.15 framework-update 后的 amendment 批执行）**: ① arch#§2.M-003 fixture 目录规范措辞对齐实落地路径 `packages/ruleset/src/rules/builtin/{rule-id}/`（builtin 分层与 arch 字面路径的差异）② F-011 PatchBundle 传输契约措辞对齐声明式 DSL（决策记录 `docs/research/tech-eval-patch-dsl.md` rn-007）③ arch#API-032 refreshUntil 语义措辞对齐实现（refreshUntil=expiresAt，续期窗口起点=exp−60s，客户端自行推导）④ ui-spec UC-022 措辞对齐实现的双按钮功能超集（「使用此主题」仅换主题 /「使用此模板」载入模板文档，用户已裁决保留），Penpot 设计板同步补双按钮布局 ⑤ 设计稿模板示意（极简日记/观点专栏）与实现模板集（listicle 清单文章 / case-study 案例研究）语义对齐。
  - **strip-aria-hidden/strip-data-attr 假绿缺陷（S6② fixture 迁移中发现）**: hast-util-from-html 将 kebab-case 属性归一化为 camelCase（ariaHidden/data*），两规则 matcher 在真实解析路径永不命中，fixture 已诚实冻结为 no-op —— 用户独立会话修复中。
  - **T-033 图床**: COS Content-Type 签名（需真实 COS 端点验 canonical/小写方法/百分号编码）·oss/cos/smms/custom env-gated 集成测试（需真实云凭据）。
  - **T-091 relay**: R-007 API key 哈希（属 E-010，无 admin 存储无落点）。
  - **Phase 7 发现的 dev 残留**: 四项（bin 字段/engines/JobsClient 注入//metrics 三 SLI）全部收口。遗留边界：npx 真正可用还需 release 决策翻 mcp-server private（见 下一步行动①）；JobsClient 全链路生产可用还差 relay Bearer token provisioning（属 E-010/T-091 既有 backlog）；dev/staging 可选的本地 Prometheus+Grafana compose profile 未加（deploy-spec §2.3 标可选，非登记缺口）。
  - **真实环境 E2E（余项均需真实凭据/部署环境）**: T-124 Worker delete 全局·T-126 微信真实 API（需 AppID/Secret，含 wechat-asset-upload 队列消费）。已收口项（iframe sandbox XSS=`pnpm test:sandbox-security`、T-125 真进程=`tests/mcp-server/http-process-e2e.test.ts`、Worker bring-up render 链路=`tests/job-worker/worker-process-e2e.test.ts` infra-gated、T-127 HMR 本机实证）见上次完成。
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

