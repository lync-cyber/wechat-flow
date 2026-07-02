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
- 上次完成: **T-060 revision + sprint-review s6 r2 approved → Sprint 6 判定 DONE（[PR #70](https://github.com/lync-cyber/wechat-flow/pull/70)）**。修复（SR-001 HIGH + SR-002 MEDIUM）：`patch-loader.ts` 引入 `validatePatchEntry` 共享校验——`matcher`/`transform` callable 检查（错误消息明确 JSON 不可携带函数）+ `scope` 值域校验，`as unknown as RuleDefinition[]` 强转移除（窄化有运行时依据），`applyPatchBundle` 原子性保持；`patch-loader.test.ts` 新增 8 测试（25 全过），含真实 `JSON.stringify→JSON.parse` 往返拒绝路径（r1 指出的假绿消除）。r2 对抗性复核（[`SPRINT-REVIEW-s6-r2.md`](docs/reviews/sprint/SPRINT-REVIEW-s6-r2.md)）：14+ 绕过构造全守住，无回归（全量 2375 测试/typecheck/biome 全绿）、无越界、1×LOW（R2-001 不可达分支）→ **approved**。前批 **sprint-review s6 r1（[`SPRINT-REVIEW-s6-r1.md`](docs/reviews/sprint/SPRINT-REVIEW-s6-r1.md)，[PR #69](https://github.com/lync-cyber/wechat-flow/pull/69)）** verdict=needs_revision 仅标记 T-060，其余 27 卡维持 done。审查方式：Layer 1（blocking 7=全部路径代表性漂移核实非缺失、advisory 28=无 per-task CODE-REVIEW 由报告批量承担、unplanned=0）+ 5 并行 reviewer 切片批量 L2（completeness/ac-coverage/wiring/scope-drift/gold-plating 全维度，关键断言单测重跑核证）。**SR-001 HIGH（T-060）**：`patch-loader.ts` JSON 补丁包 `matcher`/`transform` 函数字段经 JSON.parse 必为 undefined，`validateBundle` 零校验、`as unknown as RuleDefinition[]` 强转注入，scope 执行器触达即 `TypeError`（tsx 已复现）；17 个测试全经 `makePatchRule()` 带真函数构造=虚假绿色。定标 CRITICAL→HIGH（reviewer-calibration）：`render.ts:62` 默认管线消费 `builtinRules` 非 registry，且全仓无生产调用点，无即时崩溃面，但属 npm 包公共 API 契约缺陷（root_cause=upstream-caused，AC schema 要求 JSON 携带函数本身不可行）。SR-002 MEDIUM（scope 枚举未校验，随修复同 PR）、SR-003 MEDIUM（arch#§2.M-003 fixture 目录规范全包未落实，二选一收口：修订 arch 或专项迁移）、9×LOW。**drift-rate=0%**（168 规划 AC 零延期零计划外；T-058 8 项未勾经逐条核实全部 delivered 属文档 stale，已随本 PR 补勾）。**簿记订正：T-129 实为 S6 已交付卡（[PR #61](https://github.com/lync-cyber/wechat-flow/pull/61)，execCommand 降级，AC 全勾测试齐）**，此前状态区漏记。遗留核实：T-087/088 内置主题 assets/paintable 未激活属实（机制验证正确、空值=no-op）、T-085 optimizer 未跑属实——均维持 backlog。T-131 残差 disposition 已在报告 §收口登记。前批 **T-113 验证门（[PR #68](https://github.com/lync-cyber/wechat-flow/pull/68)）14/14 AC 全 PASS**（14 项证据与 5 处 AC 文本漂移纠偏详见 PR #68 描述、EVENT-LOG `state_change` ref=T-113 与卡内 ⚠️验证纠偏）、T-131（[PR #66](https://github.com/lync-cyber/wechat-flow/pull/66)）/T-130（[PR #65](https://github.com/lync-cyber/wechat-flow/pull/65)）/T-104（[PR #64](https://github.com/lync-cyber/wechat-flow/pull/64)）；各卡细节见 EVENT-LOG 与 PR 记录。
- 下一步行动: **Sprint 6 已 DONE（Sprint 0-6 全部完成，development 阶段任务卡清空）→ 下一步 = Phase 5 development → Phase 6 testing 转换**：执行 Phase Transition Protocol（drift 一致性守门 + phase_end/phase_start 事件），派发 qa-engineer（subagent）产出 test-report；post_sprint 非门禁（人工检查点=[pre_dev] 已过）。备选：按用户意愿先拉 backlog 残差批次（T-131 B1 桌面 doc-list / B2 fixture seed / C overlay 增强，见 §待办）再进 Phase 6——qa 阶段测试会暴露 B1/B2，先修可减少 test-report 缺陷噪声，推荐但不强制。arch 层收口项（S6 sprint-review 遗留）：① 补丁包声明式 DSL schema 重设计（F-011 AC-005 传输格式回炉，SR-001 根因）② arch#§2.M-003 fixture 目录规范落差二选一（修订 arch 或专项迁移，SR-003）——均已登记 §待办。节奏：单卡一 PR、串行合并（§项目状态 单写区）。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: **Sprint 6（质量门 + 视觉回归 + 性能基准 + skill bundle）；已合 main: T-056 / T-059（[PR #32](https://github.com/lync-cyber/wechat-flow/pull/32)）+ T-057 / T-061（[PR #34](https://github.com/lync-cyber/wechat-flow/pull/34)）+ T-060（[PR #36](https://github.com/lync-cyber/wechat-flow/pull/36)）+ T-090（[PR #37](https://github.com/lync-cyber/wechat-flow/pull/37)）+ T-068（[PR #39](https://github.com/lync-cyber/wechat-flow/pull/39)）+ T-086（[PR #40](https://github.com/lync-cyber/wechat-flow/pull/40)）+ T-058（[PR #41](https://github.com/lync-cyber/wechat-flow/pull/41)，linux 基线已播种）+ T-064（[PR #43](https://github.com/lync-cyber/wechat-flow/pull/43)）+ T-066（[PR #44](https://github.com/lync-cyber/wechat-flow/pull/44)）+ T-071（[PR #45](https://github.com/lync-cyber/wechat-flow/pull/45)）+ T-087（[PR #47](https://github.com/lync-cyber/wechat-flow/pull/47)）+ T-088（[PR #49](https://github.com/lync-cyber/wechat-flow/pull/49)）+ T-089（[PR #51](https://github.com/lync-cyber/wechat-flow/pull/51)）+ T-085（[PR #52](https://github.com/lync-cyber/wechat-flow/pull/52)）+ T-067（[PR #53](https://github.com/lync-cyber/wechat-flow/pull/53)）+ T-069（[PR #54](https://github.com/lync-cyber/wechat-flow/pull/54)）+ T-072（[PR #55](https://github.com/lync-cyber/wechat-flow/pull/55)）+ T-070（[PR #56](https://github.com/lync-cyber/wechat-flow/pull/56)）+ T-063（[PR #57](https://github.com/lync-cyber/wechat-flow/pull/57)）+ T-062（[PR #59](https://github.com/lync-cyber/wechat-flow/pull/59)）+ T-128（[PR #63](https://github.com/lync-cyber/wechat-flow/pull/63)）+ T-104（[PR #64](https://github.com/lync-cyber/wechat-flow/pull/64)，设计链恢复首卡）+ T-130（[PR #65](https://github.com/lync-cyber/wechat-flow/pull/65)，设计一致性工具链 + 8 UC 补画 + C-→UC 命名统一） + T-131（[PR #66](https://github.com/lync-cyber/wechat-flow/pull/66)，前端 vs Penpot 一致性门禁 conditional_release + Issue A 4 stale 帧重导）+ T-129（[PR #61](https://github.com/lync-cyber/wechat-flow/pull/61)，桌面 Clipboard execCommand 降级；sprint-review r1 簿记订正补记）+ T-113（[PR #68](https://github.com/lync-cyber/wechat-flow/pull/68)，Sprint 6 验证门 14/14 PASS）**。未实现任务: 无 —— **Sprint 6 DONE**（sprint-review r1 needs_revision → T-060 revision 修复 → r2 approved，报告见 docs/reviews/sprint/）。Sprint 0-6 全部收口。Sprint 0-5 全部合 main（PR #1~#31）；逐 sprint 历史见各 dev-plan、EVENT-LOG 与 PR 记录，不在本状态区复述。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **T-131 残差（conditional_release → backlog，后续会话修复）**: [B1] P-002 桌面侧栏文档列表未实现（`LeftPanelTabs.vue` docs Tab 占位 stub `docs-content`；移动 `DocumentListSheet.vue` 已实现）→ 补桌面内嵌 doc-list（新建 / 列表项 44px / 当前文档 2px brand 指示条 / loading·empty·populated 三态）·[B2] P-005 移动预览正文空（demo fixture 未 seed，chrome 一致，LOW）→ seed demo 文档内容·[C] 14 交互触发组件（palette/menu/toast/modal/drawer/popover/dialog）design-overlay static 未捕获 → spec 增 data-testid 元素定位 + 交互驱动截图（设计板已 sign-off、实现各卡已验证，属 overlay 方法增强）。owner=developer。
  - **S6 sprint-review 遗留（arch 层收口 + LOW 清理）**: ① 补丁包声明式 DSL schema 重设计（F-011 AC-005 传输格式回炉——JSON 不可携带函数，现 API 已显式拒绝，需 selector/预注册 transform-id 白名单类方案，owner=architect）② arch#§2.M-003 规则 fixture 目录规范全包未落实（二选一：修订 arch 移除该规范，或专项迁移 42 规则，SR-003）③ LOW 批：SR-005 preferences init 双调用·SR-006 readMinutes 恒 1 死值展示·SR-007 verifyPenpotTokens 缺对称测试·SR-008 损坏 JSON 优雅处理·SR-009 realworld-verify script 别名·R2-001 id fallback 不可达分支（细节见 [`SPRINT-REVIEW-s6-r1.md`](docs/reviews/sprint/SPRINT-REVIEW-s6-r1.md)/[r2](docs/reviews/sprint/SPRINT-REVIEW-s6-r2.md)）。
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
- 测试布局: 单元测试 colocate 于同目录 `src/**/*.test.ts`（apps/editor 组件惯用 `src/**/__tests__/*.test.ts`）；跨切面 / 特殊运行时（browser/edge/worker）/ 需独立 tsconfig 管辖的测试集中在根 `tests/<area>/`（由 `tests/tsconfig.json` 管辖，排除出 coverage/typecheck/biome 源码扫描；vitest.config include 三者并行）。任务卡 deliverables 的路径为代表性声明，实现按上述约定就近落点即可，路径与卡片不符不视为缺陷。
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

