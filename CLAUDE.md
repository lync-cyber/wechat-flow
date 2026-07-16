@.cataforge/rules/COMMON-RULES.md

# CataForge

## 项目信息

- 技术栈: Node.js + TypeScript（具体框架待 architect 决定）
- 运行时: claude-code
- 框架版本: 0.17.0
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
- 当前阶段: development（Sprint 7 收尾：**变体缺口治理批 T-190..T-212 全闭合**；剩用户门卡 T-188/T-172 r3 真机粘贴 → sprint-review → release go/no-go）
- 上次完成: **T-212 变体缺口治理批终验走查 + 用户 sign-off（2026-07-16，批 C 全闭合）**——报告 `WALKTHROUGH-variant-gap-remediation-20260716-r1.md`（status=approved），走查 PR #134 待合。批 C 收口 PR #133 已合 main（86e9de6）。用户对走查报告 sign-off（`event=user_decision` ref=T-212 已记 EVENT-LOG）。走查基线 main@86e9de6，实测 38 块/131 变体。方法：编辑器 `InsertDrawer.vue` 是 `listBlocks()`+`selectedBlock.variants` 纯投影（无过滤/白名单/别名兜底）→「变体不在注册表」⇔「不出现于任何用户可选界面」，使删除类走查机械可判定；两条互证=注册表投影全量断言（一次性探针 45 断言全绿，用后即删）+ 编辑器实机 DOM + 静态渲染取证。AC-001..005 全 PASS：新增具名变体可选（gallery 3 pill/highlight-block 4 pill 实机）· 9 结构性变体 DOM 异于 default（gallery default 无 table 单列 / duo 首行 2 cell / triptych 首行 3 cell 符 DESIGN-REVIEW-gallery-r2）· 11 删除项注册表全缺席（T-208 十项+gradient+gallery grid/masonry/carousel）· audio/video default 幸存不受 T-207 影响。视觉美学层由批 B/C 逐项 DESIGN-REVIEW 既有 sign-off 承担。
  - 历史批次见 git/PR 历史与 EVENT-LOG，不在此累积。
- 下一步行动:
  - ① **走查 PR #134 合并**（docs-only：走查报告 + T-212 AC 全勾 + §项目状态；用户手合，gh classifier 拦自合并）。
  - ② 用户门卡（回捡）: T-188 / T-172 r3 真机粘贴采集（阶段一编辑器走查已完成，剩真机粘贴——操作手册见 WALKTHROUGH-t172-paste-regression-20260709-r3.md；通过→T-157 blocking_conditions 清空→T-159 AC-004；写 event=user_decision 载 design_signoff 语义）· T-180（ui-spec finalize 受 #472 限制，attended）
  - ③ sprint-review（含既有 open 注记，见 当前Sprint；新增待记：readability-line-height-min 不尊重 data-lh-exempt 豁免致装饰槽位假警告 ×4）· ④ release go/no-go（见 待办）
  - **禁区（长期有效）**: 禁 git stash；`context finalize` 勿强推（#472）。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment, s7_visual_upgrade_planning]
- 当前Sprint: 7（视觉升级批 + 修复批 + 批二 + 架构专项批）。Sprint 0-6 全 DONE 合 main（PR #1-#72）。
  - sprint-review 待记 open 注记: UC-021 AND 语义 fixture 单命中盲点 · UC-015 帧变体计数 staleness + 参数区变体选择器 spec gap（owner=ui-designer）· DESIGN-REVIEW-quote-decorations-r2 余 LOW×3 · T-170 分组渲染 template duplication
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **对抗性架构审查残余 open 项**: ⓒ **命题4**：`inspect(render(x))===[]` 是自证性质，正向保真须外部真机 fixture 作 oracle（上游 #473/#474）
  - （审查残余已闭合项：ⓐ strip-data-attr 假绿修复于 claude/cataforge-cli-uv-install-lhlag6；ⓑ MIN_FONT_SIZE_PX=14 核实闭合；S1/S2/归域随 T-182..T-184 闭环；per-node-diff 归 T-186 删除范围）
  - **手工真机确认前置**（owner=user，T-188/T-172 r3 硬前置）: 无自动 oracle；确认通过写 `event=user_decision` 载 design_signoff 语义（非法枚举 design_signoff 勿用）→ T-157 blocking_conditions 清空 → T-159 AC-004。
  - **release go/no-go**（mcp-server private 翻转前置，见 deploy-spec §9）: CODE-SCAN P0 tokenResolver 替换（passthroughResolver 对任意 Bearer 放行）/ 包版本 0.0.0 / npm reviewers / Docker / CVE。
  - **占位收编 backlog**（`docs/reviews/code/CODE-SCAN-20260708-r1.md`）: ② relay 管理密钥 DB 持久化（E-010，含 T-091 R-007 API key 哈希）③ 接线型收编 ④ 功能卡 ⑤ 低优先项——明细见该报告。
  - **裁定待办**: arch M-002 slot token 措辞 + M-003 readability 归域措辞 amend（owner=architect）· amendment-variant-mechanism §4.2 补记 callout 例外（default delta 承载于 `BlockDefinition.defaultStyle` 而非 default 变体条目，orchestrator 审定 2026-07-15，与 M-002/M-003 措辞 amend 合并处理，owner=architect）· ui-spec §10.5 quote root #555 token 映射（owner=ui-designer，需 sign-off）。
  - **T-033 图床**: COS Content-Type 签名 · oss/cos/smms/custom env-gated 集成测试（需真实云凭据）。
  - **真实环境 E2E**: T-124 Worker delete 全局 · T-126 微信真实 API（需 AppID/Secret + wechat-asset-upload 队列消费）。
  - **upstream/CataForge**: #421/#422/#423 已修（v0.16.0 验证）；#472（ingest 不刷新导出基线）/#473/#474 open；早前 #340/#350/#357/#358/#374/#375/#376。
- 文档状态:
  - prd: approved
  - arch: approved
  - ui-spec: approved
  - dev-plan: approved（s7 卷 frontmatter status 随 REVIEW-dev-plan-wechat-flow-s7-r1 收口判定对齐 approved）
  - test-report: approved（v1.1.0）
  - deploy-spec: approved（v0.1.0）
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
  - `kg` — per-project 用户态（project_id / title / process_model / custom_entity_prefixes）。升级时保留已配置值，仅补充新字段
  - `features` — 功能注册表。升级时全量覆盖
  - `migration_checks` — 迁移检查声明。升级时全量覆盖

## 工具使用规范
- 优先使用 LSP 工具（go_to_definition, find_references, hover）查找符号定义和引用
- 避免用 grep/ripgrep 搜索代码符号，除非是搜索字符串字面量

