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
- 上次完成: **Sprint 4 sprint-review r2 done（approved_with_notes）+ 2 MEDIUM UX 修复闭环 → Sprint 4 收尾结清并合 main（2026-06-26，[PR #22](https://github.com/lync-cyber/wechat-flow/pull/22) squash `ca13e42`，含 `App.vue`/`SourcePane.vue` + `ToastHost.vue` + 2 测试 + `SPRINT-REVIEW-s4-r2.md`）** —— reviewer 产 [`SPRINT-REVIEW-s4-r2.md`](docs/reviews/sprint/SPRINT-REVIEW-s4-r2.md)：批量审延迟任务 T-040/T-041/T-093 + 下载 wiring + use-editor-session；r1 三 HIGH(SR-A-001/002/SR-C-001)回归确认仍修复；偏移率 2.5%；DESIGN(T-102/105/106) signoff 齐、T-111 5/7 AC 通过(export_long_image 需 T-035 管线 + pixelmatch 需 T-058 harness 环境受限,有承接任务不阻塞)。结论 approved_with_notes(4 MEDIUM+3 LOW,无 HIGH/CRITICAL)。用户选修 **SR-R2-001**(toast-host 未挂载致提示永不可见→新建 `apps/editor/src/components/common/ToastHost.vue` 挂 `App.vue` 根全局覆盖所有路由;原工作区误放 EditorShell 仅编辑器路由可见,已撤回)+ **SR-R2-004**(SourcePane dragenter 未置 showOverlay→补切换 + dragleave/drop relatedTarget 判离复位)经 tdd-engine light-dispatch 闭环;**SR-R2-002/003 + 3 LOW** 登记 Sprint 5 backlog(见待办)。独立验证(规避 turbo):根 `pnpm vitest run`=102 files/1199 passed/1 skip、editor `vue-tsc --noEmit` 0、biome 0、浏览器实测 /themes toast-host 全局存在并渲染 toast、零 console error。**⚠运维:editor 测试须从仓库根 `pnpm vitest run`(根 `vitest.config.ts` `environmentMatchGlobs:[["apps/editor/**","happy-dom"]]` 注入 DOM);`pnpm --filter @wechat-flow/editor test` 落 node 环境致 DOM 测试假报 `window is not defined`**。前序 **T-093+T-111+下载 HTML wiring 经 [PR #21](https://github.com/lync-cyber/wechat-flow/pull/21) merged 入 main(e65c45c)**；**Sprint 4 UI 轨 T-040/041/042(含 T-042 P-004 设置页 Web Crypto 凭据加密 security_sensitive code-review,详 `CODE-REVIEW-T-042-r1.md`)+ 跨运行时主题加载修复 [PR #20](https://github.com/lync-cyber/wechat-flow/pull/20) merged**。
  - 同分支前序（2026-06-25）：**跨运行时 markdown 加载 blocker 修复已 commit d52daba** —— 5 主题包 `templates/index.ts` 模块加载期 `node:fs.readFileSync` 致 editor 浏览器崩（T-092/PR #16 引入，jsdom/mock 假绿掩盖）；codegen 单源（`.md`→`pnpm gen:templates` 生成提交的 `src/templates/<base>.generated.ts`，去 fs）+ pre-push `gen-templates-fresh` 守护 + biome ignore 生成物；core AC-005 仍 fs 读 `.md` fixture 同源不漂移。**T-040**(JobProgressBar+Toast+use-sse-job e100b64)、**T-041**(/themes 主题市场页+UC-022 卡 2ef1d97) 已 commit 并浏览器实测。此前 DESIGN 轨三批 T-102/T-105/T-106 Penpot 视觉稿全部 design_signoff 通过（详见下）。
  - **T-102**(approved 选项1): UC-014 JobProgressBar(5态 queued/running/completed/failed/canceled·8px轨道+填充+描述行) / P-003 主题市场桌面初版(4列网格+筛选Tab+搜索·8张UC-022卡) / P-004 设置页(双栏master-detail·左导航图床配置active·七牛云折叠卡展开态:密码框+眼睛/Bucket/Domain/区域下拉+测试/保存/清除)。
  - **T-106**(approved): UC-017~022 六组件各 ≥2 状态变体, 全绑 Design System Token。UC-017 ZhTypoReviseDialog(populated双栏diff+规则计数/empty-no-changes) / UC-018 ImageUploadOverlay(idle/dragging/uploading/error/success) / UC-019 PaintDrawer(open/editing行hover+越界⚠) / UC-020 BaseColorDeriveModal(open-empty/editing色块矩阵派生) / UC-021 DirectiveAutocompletePopover(open-empty/typing/block-selected二级variant+参数) / UC-022 TemplateThemeCard(default/hover/selected/loading)。
  - **T-105**(approved): P-003 三档(桌面4列+平板2列筛选分两行+移动1列列表64×64缩略图) + 5张(主题,template)组合缩略图280×160(default/magazine/literary/business/tech 各默认template, 作T-111 pixelmatch视觉回归基准)。
  - find_shape UC-014/017~022/P-003/P-004 全命中。signoff 记入 EVENT-LOG(user_decision 承载, 沿 T-095..101 先例)。Penpot 绘制坑(本轮订正): createBoard 落在**当前活动页**(penpot.root), 跨页须先 `penpot.openPage(page)` 异步切换(同调用内 currentPage 不变, 下一调用生效) 再创建; 字体权重须 `font.applyToText(text, variant)` 指定 FontVariant, 不能直设 fontWeight。
- 上上次完成: **deferred 技术债 backlog 4 簇 → [PR #18](https://github.com/lync-cyber/wechat-flow/pull/18) 已 merge 入 main（squash commit 0caf4fa，2026-06-25）** —— typecheck 48/48 + 全量 vitest 1058 passed/1 skip + biome 0 error。
  - 簇 A relay auth spine: 新增 `middleware/auth.ts`(resolveBearer+scope 守卫+统一信封) + `http/error.ts`(ErrorResponse{code,message,requestId}=R-003)；images 真路由接 upload-scope 鉴权、jobs 从 token 取身份(SR-B-003 不再信 body apiKeyId)、editor-session 占位 /images/upload+/admin handler 删除并 issue/refresh 挂进 createApp、main.ts 接线(Redis session-store + 内存 rate-limiter + fail-closed oauth)；R-005 refresh 1min 窗口 + R-008 deviceFingerprint min16/max128。新增 4 测试文件(auth-middleware/app-auth-integration/auth-rate-limiter/auth-session-store)。
  - 簇 C 图床(T-033): qiniu/oss/cos/smms/custom 缺凭据 fail-fast(对齐 AC-005)、WebP/PNG EXIF 剥离测试、OSS 确定性 auth 断言(oss.ts 注入 now)。
  - 簇 D(T-092 AC-006): describe_template 富响应 = core `describeTemplateDetailed`(coveredElements/coveredBlocks/mdastSummary/dependencies) + contracts schema 扩展 + tool 接线。
  - CI follow-up(并入 PR #18): fail-fast 凭据校验使必填字段 `?? ""` 兜底成死分支致 branch 89.86%<90% → 删冗余兜底(14 死分支) + 补 3 边界测试，branch 90.89%；新增 **pre-push 全量 coverage 守卫**(lefthook `pnpm test:coverage`，低于 vitest.config thresholds 阻 push；pre-commit 保持"数秒"快检不动)。
  - 前序合 main: **sprint-review 修复 [PR #17](https://github.com/lync-cyber/wechat-flow/pull/17) merge(d1c457e, 2026-06-24)** —— Sprint 4 feature 侧全部合 main；更早 T-039+T-092(PR #16)·relay-jobs(#15)·relay-backend+6图床(#12)·MCP 24Tool(#10)·L3 cascade(#6)·T-030/031(#8)·framework 0.14.0(#14)。运行学习见 [.cataforge/learnings/registry-archive.md](.cataforge/learnings/registry-archive.md)。
- 下一步行动: **Sprint 5 进行中 — 中文排版垂直切片 T-043~T-046 已 done + code-review 全修 + 本地 commit（分支 `feature/zh-typo-vertical`，commit `3a9c385`，28 files，pre-commit 钩子过）**。待用户授权 push + 开 PR（合 main）。其后继续 Sprint 5 其余任务（候选并行入口：T-047 插件沙箱 / T-051 transport / T-073 themes 增强 / T-080..T-084 MCP wrapper / T-103 DESIGN）。Sprint 5 全任务卡 = T-103(DESIGN) + T-043..T-049、T-116、T-117、T-051、T-055、T-073、T-074、T-075、T-077..T-084、T-112（见 [`dev-plan-wechat-flow-s5.md`](docs/dev-plan/dev-plan-wechat-flow-s5.md)）。人工检查点=[pre_dev]（已过），post_sprint 非门禁。Sprint 5 backlog 并入承接（SR-R2-002/003/005/006/007）。framework-feedback 已上报 [#374](https://github.com/lync-cyber/CataForge/issues/374)·[#375](https://github.com/lync-cyber/CataForge/issues/375)·[#376](https://github.com/lync-cyber/CataForge/issues/376)。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles]
- 当前Sprint: **Sprint 5 进行中（中文排版垂直切片 T-043~T-046 已 done，未 commit）**。切片端到端：`@wechat-flow/zh-typo` 4 规则包(T-043) → core `composeApplyZhTypo` use case + DiffEntry(T-044) → `apply_zh_typo` MCP Tool(T-045) → editor 修订 UI(ZhTypoPreviewModal + use-zh-typo + ContextMenu/EditorShell 接线，AC-003 undo 经真实 EditorView+history 验证)(T-046)。独立验证：全量 `pnpm vitest run`=107 files/1237 passed/1 skip/0 fail、editor vue-tsc 0、`tsc -p tests/tsconfig.json` 0、zh-typo/core/mcp-server typecheck 0、biome 0。orchestrator 补修 2 处子代理遗留：T-043 `tests/tsconfig.json` 注册 zh-typo path、T-044 撤回越权 global `vitest.config.ts` alias(致 command-registry 5 测试回归)并改回相对 import 约定（见 memory [[wechat-flow-tests-import-convention]]）。**批量 code-review [`CODE-REVIEW-zh-typo-vertical-r1.md`](docs/reviews/code/CODE-REVIEW-zh-typo-vertical-r1.md)=approved_with_notes(0 HIGH,4 MEDIUM+4 LOW)，用户选全修，8 notes 全部闭环**：R-001 破折号归位 ellipsis-dash / R-002 rules 过滤参数贯穿 zh-typo→core→mcp / R-003 arch M-008 补 diff 字段 / R-004 _pendingFixed 改 per-instance ref / R-005 null-view undo error toast / R-006 单引号智能转换 / R-007 MCP 多规则 e2e / R-008 Modal aria-labelledby（+5 新测试，全量 1237 passed）。**Sprint 4 完成并全量合 main(PR #6/#8/#10/#12/#14/#15/#16 + #17 + #18 + #19 + #20 + #21 + #22)**；sprint-review r1→r2(approved_with_notes 经 PR #22 闭环)；DESIGN T-102/105/106 sign-off 齐。Sprint 0-3(PR #1/#2/#6/#7)。
- 待办(deferred)（✅=deferred backlog 已解决并合 main, PR #18）:
  - **T-091**: ✅R-003 错误信封·✅R-005 refresh 1min 窗口·✅R-008 deviceFingerprint min16/max128·✅editor-session/images/jobs 路由整合(并入簇 A)。剩: R-007 API key 哈希(属 E-010, 无 admin 存储无落点)·R-006/009/010 LOW。
  - **T-033**: ✅qiniu(+oss/cos/smms/custom) 缺凭据 fail-fast·✅PNG/WebP EXIF 测试·✅OSS auth 断言。剩: COS Content-Type 签名(需真实 COS 端点验证 canonical 化/小写方法/百分号编码, 沙盒无法验证, 不盲改)·oss/cos/smms/custom env-gated 集成测试(需真实云凭据)·AC-002b 2.5MB 压缩未追求(仅 10MB 硬限)。
  - **T-092**: ✅AC-006 富响应(coveredElements/coveredBlocks/mdastSummary/dependencies)。剩: card AC-004 字段名 vs ARCH ThemeTemplateValidationResult(以 ARCH 为准, accepted)。
  - **sprint-review s4 余项**: ✅SR-B-003 jobs 鉴权(并入簇 A)。剩: iframe sandbox XSS happy-dom 假绿→Playwright E2E(T-058)·juice/client 跨运行时 bundle。
  - **Sprint 5 backlog(sprint-review s4-r2 延迟项)**: SR-R2-002 use-sse-job 生产消费者(export-long-image 全链路,需 relay SSE 接线 + 消费者组件挂 EditorShell)·SR-R2-003 上传 progress 恒0(relay 同步上传无流式→端点升级 SSE/chunked 或改不确定进度动画 + AC-002 语义校正)·SR-R2-005 onDownloadHtml error 反馈(try/catch+pushToast)·SR-R2-006 use-editor-session JWT 主动续期(现 15min 过期后静默失败)·SR-R2-007 SettingsPage 占位 section 补 [ASSUMPTION] 标注。
  - **upstream/CataForge**: T-119/T-091 AC 欠拟合 arch#API→[#357](https://github.com/lync-cyber/CataForge/issues/357)·feedback aggregator 解析脆弱→[#358](https://github.com/lync-cyber/CataForge/issues/358)·deploy --rebuild wipe([#340](https://github.com/lync-cyber/CataForge/issues/340))·design_tool 重置([#350](https://github.com/lync-cyber/CataForge/issues/350))·#254/#255+fb-0.11.1 待提交·本轮新发现(超长行/scoped-test gap/动态 import 绕守卫/sprint-review L1 噪声)已上报 [#374](https://github.com/lync-cyber/CataForge/issues/374)。
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

