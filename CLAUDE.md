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
- 当前阶段: development（Sprint 7 架构专项批实现波，执行模型 = wechat-typeset：复用 output 域 ruleset 为幂等 hast patch 层，不建独立模拟器）。修复批一 T-160..T-174 + 架构专项批 T-181/T-182/T-183 + 平台保真 amendment 及其 8 文档下游传导均 DONE（PR #108-#114）。**T-184 DONE**（平台常量单一源 + S1 三条单向断言，四门禁绿，待起 PR）。实现波剩余：{T-185/T-188/T-189} 并行 → T-187（构造守卫）/ T-186（删模拟器）→ 批二 T-176..T-180 → T-172 r3。
- 上次完成: **T-184 平台常量单一源 + S1 同步断言（四门禁全绿）**：`contracts/platform/wechat-paste.ts` 完整平台事实集（`FORBIDDEN_CSS_PROPS`/`DISPLAY_VALUES`/`POSITION_PROPS`/`HARD_REMOVE_TAGS`/`VALUE_PATTERNS`+例外/`IFRAME_SRC_ALLOW`/`NEAR_WHITE`/`isForbiddenCssValue`）+ 旧名从单一源派生别名（`WECHAT_PASTE_STRIPPED_STYLE_PROPS` 不含 font-family）；core whitelist 移 font-family（registerVariant 运行期 fail-fast，内置资产不经 validateStyle 故先于 T-189 安全）。TDD RED→GREEN→REFACTOR skip；全仓四门禁（vitest 268 文件/3568 pass、tests-tsc、turbo typecheck 50/50、biome）证零回归。S1 三条单向断言（禁集单一源派生 / output 靶值 ⊆ 常量 / float·grid·定位族无规则显式排除·T-187 兜底）避开被否的双向等式。follow-up：`transform-svg-white-offset.ts:17` `#fefefe` 未接 `NEAR_WHITE`（scope 外，待 T-186 或独立卡）。前序见 git/PR #108-#114。
- 下一步行动: ① **T-184 PR 用户审阅合并**（`feature/T-184-platform-constants`：2 源 + 2 测试 + AC 勾选 + §项目状态；gh 分类器拦自合并故手合）② 合并后 **{T-185/T-188/T-189} 并行**（均 deps [T-184]）：T-185 `PlatformAdapter{patch,inspect}`（inspect ⊆ patch 平台子集）/ T-188 dropcap·dialog px 化（真机前置）/ T-189 全 FORBIDDEN 内置声明退出 + author-card flex→table + 六块 token 化 → `T-189→T-187`（构造守卫含 Mark + 全组合扫描）→ `T-185→T-186`（删模拟器 + 消费方/MCP/文档同步 + 版本化）→ 批二 T-176/177/178/180 → T-172 r3 交用户 ③ **手工真机确认前置**（T-188/T-172 r3，owner=user，无自动 oracle：≤6 份微信粘贴确认 `display:table` 存活，两卡合并采集；失败→真 `<table>` 改造 T-188 已预置）→ design_signoff → T-157 blocking_conditions 清空 → T-159 AC-004 ④ **命题4**：`inspect(render(x))===[]` 自证性质、render/inspect 共享盲点会假绿，正向保真须外部真机 fixture 作 oracle（上游 #473/#474）；T-185 AC-004 已限定为诚实稳定态证明非预测真机 ⑤ release go/no-go（mcp-server private 翻转前置 CODE-SCAN P0 tokenResolver 替换 / 包版本 0.0.0 / npm reviewers / Docker / CVE——见 deploy-spec §9）⑥ 裁定待办：arch M-002 slot token 措辞（owner=architect）、ui-spec §10.5 quote root #555 token 映射（owner=ui-designer，需 sign-off）。【环境限制】cataforge CLI 不可用：context/finalize/index + doc/code-review Layer 1 脚本不可运行，doc-review 走 reasoning-based Layer 2，docs/.doc-index.json 永久 stale；四代码门禁不受影响。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment, s7_visual_upgrade_planning]
- 当前Sprint: 7（视觉升级批 + 修复批 + 架构专项批）。修复批 T-160..T-174 DONE；T-172 = T-157 r2 复验待用户走查（升 r3），T-159 validation 待 T-172 闭环。**sprint-review 待记 open 注记**：UC-021 AND 语义 fixture 单命中盲点 · UC-015 帧变体计数 staleness + 参数区变体选择器 spec gap（owner=ui-designer）· DESIGN-REVIEW-quote-decorations-r2 余 LOW×3（quote-mark 字体 / root #555 待裁定 / literary p 宋体 pre-existing）· T-170 分组渲染 template duplication。Sprint 0-6 全 DONE 合 main（PR #1-#72），历史见 git/dev-plan/EVENT-LOG。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **对抗性架构审查残余（2026-07-08）open 项**: ⓐ `strip-data-attr.ts:8` matcher `/^data[A-Z0-9]/` 只命中 camelCase、管线 kebab 键（`data-block` 等）永不命中（PRESERVE 集缺 `dataNodeId`/`data-{block}-{attr}`，arch A.1 明列须排除未实现；strip-aria-hidden 同因 camel/kebab 表征分裂被打穿）——**用户独立会话「strip-data-attr 假绿修复」处理中，勿双改** ⓑ `readability-font-size-min.ts:6` `MIN_FONT_SIZE_PX=12` vs 附录 B 决策②-i 裁定 14——待核实是否已随 T-183 开闸提至 14 ⓒ **命题4 收敛不变量真伪**（见 下一步行动④，T-185 关键约束）。（S1 双编码 / S2 两相 / output 相归域已随 T-182/T-183/T-184 落地闭环；per-node-diff 稳定 key 对齐归 T-186 删模拟器范围。）
  - **占位收编 backlog（`docs/reviews/code/CODE-SCAN-20260708-r1.md`）**: ① **安全 P0**：MCP tokenResolver 真实化（`http-entry.ts` 未注入、`passthroughResolver` 对任意 Bearer 放行 user scope）——mcp-server private 翻转/公网暴露前必须替换，入 release go/no-go ② relay 管理密钥 DB 持久化（内存 Map 重启即丢，E-010）③ 接线型收编（`content-insert-component`→InsertDrawer、`content-zh-typo`→zhTypo、`export-copy-html`→composeCopy、`view-toggle-viewport`、`doc-new`→store.createDoc）④ 功能卡（undo/redo、find/replace、doc-jump/delete、封面导出组、theme-custom-color、help-whats-new、设置页三 section）⑤ 低优先 core `rewriteStructure` 恒等函数。
  - **arch amendment 待登记（owner=architect）**: M-003 `lint/readability.ts` 归 ruleset 措辞 vs 实现（对比度须渲染后算，落 `core/pipeline/readability.ts`；nightRiskIssues/versionTriple 上移 render.ts）；arch §2.M-003/§85/§159 待 amend 措辞对齐（不改行为契约，待核实是否已随平台保真 amendment 覆盖）。
  - **T-033 图床**: COS Content-Type 签名 · oss/cos/smms/custom env-gated 集成测试（需真实云凭据）。
  - **T-091 relay**: R-007 API key 哈希（属 E-010）。
  - **真实环境 E2E**: T-124 Worker delete 全局 · T-126 微信真实 API（需 AppID/Secret + wechat-asset-upload 队列消费）。
  - **upstream/CataForge**: 已提报 [#421](https://github.com/lync-cyber/CataForge/issues/421)/[#422](https://github.com/lync-cyber/CataForge/issues/422)/[#423](https://github.com/lync-cyber/CataForge/issues/423)（finalize 越权 / reconcile drift / doc-consistency 假阳性）+ 早前 #340/#350/#357/#358/#374/#375/#376。
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
  - `kg` — per-project 用户态（project_id / title / process_model / custom_entity_prefixes）。升级时保留已配置值，仅补充新字段
  - `features` — 功能注册表。升级时全量覆盖
  - `migration_checks` — 迁移检查声明。升级时全量覆盖

## 工具使用规范
- 优先使用 LSP 工具（go_to_definition, find_references, hover）查找符号定义和引用
- 避免用 grep/ripgrep 搜索代码符号，除非是搜索字符串字面量

