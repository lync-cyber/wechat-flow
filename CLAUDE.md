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
- 当前阶段: development（Sprint 7：修复批一 T-160..T-174 全 DONE；架构专项批 + 修复批二执行中——T-175/T-181/T-182 DONE（PR #109/#111 合并）；**T-183 DONE = PR #112 合并 `206426d`**（output 相 37 规则归域开闸 + 基线审计，四门禁绿；审计揪修 transform-list-to-table 归域回退 authoring + clampPxProp em 腐蚀加严；用户裁定 hex 小写 / 序列化带空格 / ②-ii callout box-shadow 0.15）；**平台保真架构 amendment DONE = PR #113 合并 `a73f6f0`**（wechat-typeset 模型：复用 output 域 ruleset 为幂等 hast patch 层，删独立模拟器 / 收敛不变量 / postPaste / TargetProfile；`PlatformAdapter{patch, inspect}`；复制用 `render().html` 直取 → preview≡paste）；**amendment 下游传导 DONE（本 PR：8 文档 + 2 审查报告）**——arch-modules 0.10.1 / arch-api 0.8.1 / dev-plan 0.3.2 / deploy-spec 0.2.0 / ui-spec 三卷 0.4.0·0.3.0·0.3.0；忠实审查（r1 needs_revision 3HIGH/1MED/2LOW 全收口）+ 对抗性计划审查（r1 needs_revision 2HIGH/5MED/1LOW 全收口）双门定稿；T-184..T-189 据 wechat-typeset 重拆卡（旧「注册校验 + 独立模拟器统一 + 收敛不变量入 CI」路线废弃——它在 hast 之外重建平台模型属过度设计）；图片导出 font-family = 用户裁定接受全缺席·不引入 fontStack；后续 T-184 起实现波、批二 T-176..T-180、T-172 r3）
- 上次完成: **平台保真架构 amendment 下游传导（8 文档）+ 双轨 doc-review 收口**：PR #113 amendment（`AMENDMENT-platform-fidelity-r1.md`）合并后，按其 §11 下游清单传导——arch-modules（M-002/003/004 `PlatformAdapter` / 005 守卫含 Mark / 008 / 009 MCP re-map + 附录 A.4 平台事实 + 附录 B 决策① font-family）、arch-api（API-001 删 postPaste / 014 `simulate_paste→inspect` / 015 export→`render().html`）、dev-plan（T-184..T-189 拆卡 + T-178 收窄为 `strip-width-height-inline` 移除 + T-179 并入 T-189）、deploy-spec（指标 `paste_simulation_diff_ratio→fallback_platform_patch_hits` + MCP breaking checklist）、ui-spec 三卷（§1.2.5 font-family 全缺席 + §9.5/9.8/10.5）。**忠实审查**（reviewer 红队，r1 needs_revision）3 HIGH（fontStack 自相矛盾 / registerVariant 契约错写 / 5 裸 §ref）+1 MED+2 LOW → architect 修订全收口。**对抗性计划审查**（reviewer 红队，r1 needs_revision）2 HIGH（author-card `display:flex` 破守卫·清理时序漏排 / T-184 S1 双向等式不可满足）+5 MED+1 LOW → tech-lead 修订 6 项 + orchestrator inline 落 T-185 R-003/R-004（`inspect ⊆ patch` 平台过滤子集 + div-free 构造保证）。**关键设计裁定**：构造守卫为主、按输入来源三层分工（构造守卫 / output 补救 / 全组合扫描，非属性两级分类法）、内置违规源头迁移（author-card `flex→table`）；图片导出 font-family 接受全缺席·不引入 fontStack。两个跨文档 HIGH 经 orchestrator 复核 arch↔dev-plan 一致（S1 三条单向断言 ↔ amendment §2.1；DAG `T-189-->T-187` + deps 方向 ↔ §6）。两份审查报告补 disposition + status→approved 定稿。**前序 T-160..T-183 见 git/PR #108-#112 历史**。
- 下一步行动: ① **本 PR 用户审阅合并**（`fix/docs-platform-fidelity`：8 文档 + 2 审查报告 + §项目状态，gh 分类器拦自合并故留用户手合）② 合并后 **T-184 起实现波**：T-184 平台常量单一源（S1 三条单向断言）→ {T-185 `PlatformAdapter` 薄层 / T-188 dropcap·dialog px 化 / T-189 全 FORBIDDEN 内置声明退出 + author-card 迁移 + 六块 token 化} 并行 → `T-189→T-187`（构造守卫含 Mark + 全主题全组合扫描，清理先于守卫）→ `T-185→T-186`（删独立模拟器 + 全消费方/MCP/文档同步 + 版本化）→ 批二 T-176/177/178/180（按 font-family 全缺席 / 字号14 / hex 小写校准）→ T-172 r3 走查交用户 ③ **T-188 / T-172 r3 手工真机确认前置**（owner=user，无自动 oracle：≤6 份微信粘贴肉眼确认 `display:table` 存活，两卡合并采集减少切微信次数；失败分支 = 改真 `<table><tr><td>` 结构，T-188 已预置范围）→ 通过 → design_signoff 事件 → T-157 blocking_conditions 清空 → T-159 AC-004 满足 ④ **T-184 CI 不变量真伪（命题4）**：`inspect(render(x))===[]` 是自证性质、render/inspect 共享盲点（均不建模 font-family/div/float 的真机剥离全貌）会假绿，正向保真须外部微信真机 fixture 作 oracle——对齐上游 #473/#474；T-185 AC-004 已限定为「诚实稳定态证明（div-free 构造保证支撑）」非「预测真机」⑤ T-159 Sprint 7 验证（用户确认）→ sprint-review（注记见 当前Sprint 行）⑥ 裁定待办两项：arch M-002 slot token 解析措辞对齐（owner=architect）、ui-spec §10.5 quote root #555 token 映射（owner=ui-designer，spec 要求跨主题替换但未指名 token 且 default 主题无对应值 token，映射牵动样张基准需 sign-off）⑦ release go/no-go（包版本 0.0.0 核对 / mcp-server private 翻转→发布集 13→14【前置：CODE-SCAN P0 tokenResolver 替换】/ npm-publish reviewers / Docker bring-up / CVE 阈值——见 §待办 + deploy-spec §9）⑧ 顺延附带项：Ink Source 文件内 UC-019 · ConfirmDialog stray 板核查（需用户再切 Penpot 文件，不阻塞主线）。【环境限制】cataforge CLI 不可用：context read/finalize/index 与 doc/code-review Layer 1 脚本无法运行，agent 降级直编 markdown、doc-review 走 reasoning-based Layer 2；docs/.doc-index.json 永久 stale 待 CLI 可用重建；四代码门禁（vitest/typecheck/biome/tests-tsc）不受影响。architect 报告的 split-volume finalize 缺口（#472 同族）+ 上游 suggest #473/#474/#475 待用户裁定是否反馈。
- 已完成阶段: [requirements, architecture, ui_design, dev_planning, cross_doc_amendment_r2, arch_special_review_css_inlining, dev_plan_amendment_custom_styles, development, testing, deployment, s7_visual_upgrade_planning]
- 当前Sprint: 7（视觉升级批 27 卡 + 修复批 15 卡：T-132..T-136 DONE = PR #107，T-138/139/140 DONE = PR #108，T-137/T-141..T-156/T-158 DONE = PR #109；修复批 T-160..T-171/T-173/T-174 全 DONE 待起 PR，T-172 = T-157 r2 复验待用户走查，T-159 validation 待 T-172 闭环后执行；**sprint-review 待记注记**：R2-001 MEDIUM（UC-021 AND 语义 fixture 单命中盲点）· R-003 LOW 已随 T-165 收敛 · T-140 样张 flower 标注误差 · UC-015 帧变体计数 staleness · UC-015 参数区变体选择器 spec gap（T-165 引入，owner=ui-designer 回补）· DESIGN-REVIEW-quote-decorations-r2 余留 LOW×3（R-002 quote-mark 字体未锁定 / R-004 root #555 待裁定 / R-005 literary p 标签字体族少「宋体」pre-existing）· T-170 分组渲染 template 同构 duplication（implementer self-report，tdd_refactor skip 未处理）· doc-review Layer 1 分卷假阳性绕行（与上游 #423 同族）· copy mock 假绿 + DESIGN-REVIEW 须真实管线渲染对照 learnings（既有）；Sprint 0-6 全 DONE 合 main：Sprint 0-5 = PR #1~#31，Sprint 6 = PR #32~#70 + 残差 #71/#72；历史见各 dev-plan、EVENT-LOG、docs/reviews/sprint/ 与 PR 记录，不在本状态区复述）。
- 待办(deferred)（仅列 open 项；已解决项见 git/PR 历史）:
  - **对抗性架构审查发现（2026-07-08，红队 architect；已 inline 处置 arch 实现状态诚实化 0.9.5）**: ⓐ **[D4 MEDIUM，UNPLANNED→纳入 T-184]** `packages/core/src/diff/per-node-diff.ts:38-54` 以数组下标 `beforeEls[i]` vs `afterEls[i]` 位置比对——节点删除（strip style/未来剥 div）后索引移位致级联错位（伪 diff/漏真 diff）；T-184 模拟器统一时按稳定 key（注入序号/路径）对齐 ⓑ **[D6 MEDIUM，root cause UNRECORDED]** `strip-data-attr.ts:8` matcher `/^data[A-Z0-9]/` 仅命中 camelCase，管线 hProperties 键为 kebab（`data-block` 等）永不命中→PRESERVE 集（仅 `dataBlock/dataVariant/dataSlot`）render 路径惰性、当前 correct-by-accident；PRESERVE 缺 `dataNodeId` 与 `data-{block}-{attr}`（arch A.1 明列须排除，未实现）。根因=camel/kebab 表征分裂。**与用户独立会话「strip-data-attr 假绿修复」重叠，勿双改，待其收口后核** ⓒ **[D8 LOW，T-183 开闸校准]** `readability-font-size-min.ts:6` `MIN_FONT_SIZE_PX=12` 与附录 B 决策②-i 裁定 14 不一致，随 T-183 开闸提至 14 ⓓ **[S1 已裁定，T-184 落地]** 平台被剥属性双重编码（`strip-position` 等规则 + `WECHAT_PASTE_STRIPPED_STYLE_PROPS` 常量）——**用户裁定（2026-07-08）= 保留双编码 + 加同步断言测试**：T-184 保留可读常量与 strip 规则，新增 CI 测试断言「常量集 == output 域 strip 规则覆盖的属性集」，漂移即门禁红（不引 synthetic-node predict 复杂度） ⓔ **[S2 简化项，非最简但可辩护]** authoring 相近 vestigial（6 条 strip 不产源位置诊断、与 sanitize 重叠，keyword-lint 本在 applyRuleset 外）——T-182 正落地两相机制，收益薄、干净心智模型有价值，**建议保留两相**，仅更正 arch 把源位置价值误归 6 条 strip 的叙事 ⓕ **[命题4 收敛不变量真伪，T-184 关键约束]** `simulatePaste(render(x))===[]` 是自证性质非微信保真——render/simulator 共享盲点（均不剥 font-family/div/float），会假绿；正向保真须外部微信真机粘贴 fixture 作 oracle（对齐上游 #473/#474），T-184 CI 不变量须配外部 oracle 否则误导。**D1/D2/D3（output 相/常量/不变量当前未落地）= T-182..T-184 计划工作本体，非 bug；arch 措辞已诚实化**
  - **占位收编 backlog（盘点报告 `docs/reviews/code/CODE-SCAN-20260708-r1.md`，24 处生产可达占位）**: ① **安全 P0**：MCP tokenResolver 真实化——生产入口 `http-entry.ts` 未注入，`passthroughResolver` 对任意 Bearer 放行 user scope（`http-sse.ts`）；随 E-010/T-051 落地，**mcp-server private 翻转/公网暴露前必须替换，纳入 release go/no-go 清单** ② relay 管理密钥 DB 持久化（内存 Map 重启即丢，E-010）③ **接线型收编**（既有真实实现存在、仅命令面板未接线，单点改动）：`content-insert-component`→InsertDrawer、`content-zh-typo`→zhTypo（消除面板/右键双路径不一致）、`export-copy-html`→composeCopy、`view-toggle-viewport`→视口切换、`doc-new`→store.createDoc ④ **功能卡**：undo/redo（含 TopBar 空 handler 同缺口）、find/find-replace、doc-jump/doc-delete、封面导出组（landscape/square）、theme-custom-color、help-whats-new、设置页三 section（主题与品牌/同步与协作/关于）⑤ 低优先：core `rewriteStructure` 恒等函数（待出现 ul/ol→table 真实 AC 再实现）。已处置：`downloadHtml` 命令面板 dep 遗漏随 T-171 收口；`view-collapse-left` = T-171 本体。
  - **设计一致性收敛 backlog（T-131 AC-004 二轮 sign-off；逐条见 `SPRINT-REVIEW-s6-r3.md`）**: 15 条 blocking_conditions 全 disposition。**BC-1..15 全收敛**：BC-1..11+BC-14 = PR #94–98；BC-12/13/15 = PR #101 Penpot 追平前端+用户 sign-off（见 上次完成）。**余 open**：无——UC-015 分类 tab defer 前置已全部解除（本 PR：A-014 冻结 6 分类 + category 契约入 arch/ui-spec，实现排入 Sprint 7 T-137）。**BC-4 全收敛**（真实定义=UC-023 状态栏视觉收敛：可读性/违规词/夜间风险指标段三态着色 + 分隔线均实现，夜间风险 pipeline 本 PR 补齐；「可读性评级算法」经核实为伪需求删除——PRD F-011 AC-006 仅要求可读性检查（T-061）+ 状态栏三态指示，无「评级」需求）。r3 判一致 4 节 + LOW 散点见 r3。
    - **设计一致性前端实现批（pending PR）**：对 `pnpm dev` 前端逐屏 render-verify（design-overlay + preview）审计出的真实缺陷已修：F-002 DropdownMenu/ContextMenu 定位（引入 `@floating-ui/vue` 统一锚定，F-007 根因）· F-010 ThemeCard 富预览缩略图（抽共享 `ThemeThumbnail`，消除与 TemplateThemeCard 分叉）· F-014 诊断 Zod 原始错误中文化（`transform.ts` 遍历 issues）· F-006 PaintDrawer 语义精选（18→6，`PAINTABLE_SEMANTIC_TOKENS` 展示层收窄不破坏主题契约）+ 对比⚠(palette wcagContrast) · F-003 StatusBar 可读性段（消费 T-061 readability diagnostics）· F-023 文档列表相对时间。全量回归绿（editor 682 + core 43 tests / typecheck 50 / biome）。**新登记遗留（本 PR 核实收敛）**：① ~~F-006 主题数据~~ **证伪撤销**：link `#1A6FB0` 是幽灵值（全仓仅本文件自述，penpot 权威 `--color-text-link=#2D5A4E` 与主题一致）；`--color-success` 属 UI chrome token（token-seed）非内容主题语义，PaintDrawer 按 paintable∩语义正确 filter，「5 非 6 行」即正解——已清 PAINTABLE_SEMANTIC_TOKENS 的 success 死项 ② ~~F-003 夜间风险数据源~~ **已实现**（apply.ts:52 硬编码空系职责错配，本 PR 归位 + 新增 readability 渲染后诊断）③ 标注/封面分类 = 既有 A-014/T-024（owner=ui-designer）④ LOW：BlockLibItem 图标体系(BC-2)、Toast 文案层级、TopBar 第2按钮(viewport vs 剪贴板，疑反向登记)。**F-016/F-001 经查证符合 A-014 裁决非缺陷**（分类为临时占位不硬编码；InsertDrawer 二段式参数区已实现）。
  - **arch 措辞修订登记（owner=architect）**: ✅ 已完成（本批合入，见 上次完成）—— ①M-003 fixture 目录 `rules/builtin/{rule-id}/` ②F-011 声明式 patch DSL 结构 ③API-032 `refreshUntil=expiresAt` ④UC-022 双按钮（在 ui-spec/Penpot 侧完成）⑤模板集语义对齐实现全集。
  - **arch amendment 待登记（owner=architect）**: M-003 `lint/readability.ts` 归 ruleset 的措辞与实现不符——对比度须渲染后（inlineStyle 后）才可算，实现落在 M-001 core render 后置诊断阶段（`core/pipeline/readability.ts`），nightRiskIssues 由 render.ts 组装、versionTriple 真值亦上移 render.ts；arch §2.M-003 / §85 / §159 待 amend 措辞对齐（不改行为契约）。
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
  - `kg` — per-project 用户态（project_id / title / process_model / custom_entity_prefixes）。升级时保留已配置值，仅补充新字段
  - `features` — 功能注册表。升级时全量覆盖
  - `migration_checks` — 迁移检查声明。升级时全量覆盖

## 工具使用规范
- 优先使用 LSP 工具（go_to_definition, find_references, hover）查找符号定义和引用
- 避免用 grep/ripgrep 搜索代码符号，除非是搜索字符串字面量

