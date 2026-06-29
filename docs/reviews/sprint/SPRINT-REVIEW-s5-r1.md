---
id: "sprint-review-s5-r1"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s5"]
---

# SPRINT-REVIEW s5 r1 — Sprint 5 完成度审查

## 范围

Sprint 5 全部已合 main 的代码任务（PR #23/#24/#25/#26/#27/#28）：

- zh-typo 垂直切片 **T-043~T-046**（批量报告 `CODE-REVIEW-zh-typo-vertical-r1`）
- 并行实现批 **T-047/T-051/T-073/T-074/T-077** + MCP 批 **T-081~T-084**（PR #24）
- P1 批 **T-048/T-075/T-123/T-078/T-079**（PR #25）
- 就绪批 **T-080/T-116/T-117/T-049**（PR #26）
- **T-055**（移动端只读预览）+ **T-103**（DESIGN sign-off，PR #27）
- wiring backlog **T-124~T-127**（PR #28）

设计/验证类：**T-103**（DESIGN，EVENT-LOG user_decision approved，无 code-review）、**T-112**（VALIDATION，待用户手动验证，未进入本次代码审查）。

## Layer 1 结构检查

`cataforge skill run sprint-review -- 5` → **0 blocking**（T-127 交付物路径笔误 `tests/cli/commands/dev.test.ts` → 据实修正为 `tests/cli/dev.test.ts`，扁平 `tests/cli/` 约定，测试存在且覆盖 AC-001/002）。362 advisory：339 LOW unplanned（多为既往 sprint 的 editor 组件/packages，非 Sprint 5 gold-plating）+ 23 MEDIUM 缺 per-task CODE-REVIEW（本报告 §批量 code-review 覆盖，sprint-review 承担其 Layer 2 职责）。

## 批量 code-review — per-task L2 维度表

延迟到本次聚合审查的任务（开发期均 security_sensitive=false）。已独立持有 per-task / 批量报告的任务（T-043~046、T-047/051/077、T-124/125/126、T-118~122）见 §质量聚合，不重复。

| Task | completeness | ac-coverage | scope-drift / wiring | 8 维命中 |
|------|:---:|:---:|:---|:---|
| T-048 | ok | ok | none | clean |
| T-049 | ok | ok | none | clean |
| T-073 | ok | issue | AC-003 setContent≠createDoc | scope-drift, ac-coverage (MEDIUM) |
| T-074 | ok | ok | none | clean |
| T-075 | ok | ok | none | clean |
| T-078 | ok | ok | none | clean |
| T-079 | ok | issue | 绕过 M-008 composeUploadWechatAsset | structure, test-quality (MEDIUM) |
| T-080 | ok | ok | none | error-handling (MEDIUM) |
| T-081 | partial | issue | AC-001 render? / AC-002 dep list 未实现 | ac-coverage (MEDIUM) |
| T-082 | ok | ok | none | clean |
| T-083 | ok | ok | none | clean |
| T-084 | ok | ok | 直调 M-002 renderMarkdown 越 M-008 | structure (LOW) |
| T-116 | ok | ok | wiring ok（index.ts 已注册） | test-quality (MEDIUM) |
| T-117 | ok | issue | AC-002 stdout 前缀被 T-127 取代 | ac-coverage (MEDIUM) |
| T-123 | ok | issue | none | test-quality (LOW) |
| T-127 | ok | ok | index.ts 仅传 packDir 靠默认 factory | wiring, test-quality (MEDIUM) |
| T-055 | ok | issue | wiring ok（路由/底栏/抽屉已挂） | ac-coverage, test-quality (MEDIUM+LOW) |

## 问题列表

### [SR-001] MEDIUM: T-073 模板应用走"覆盖当前文档"而非"创建新文档"
- **category**: scope-drift
- **root_cause**: self-caused
- **描述**: `ThemesPage.vue` handleUseTemplate 仅 `editorStore.setContent(markdown)` 覆盖当前文档；T-073 AC-003 表述为"创建新文档并应用该模板内容"。两种 UX 路径语义不同。
- **建议**: 明确 AC-003 语义——若需"创建新文档"则先 `createDoc()` 再 setContent；若设计意图就是覆盖，更新 AC-003 措辞消歧并记 EVENT-LOG。证据 `apps/editor/src/pages/ThemesPage.vue:57-65`。

### [SR-002] MEDIUM: T-073 ThemesPage 零自动化测试
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: T-073 deliverables 无测试文件，AC-001~005 均无单元测试守护（过滤逻辑、模板点击应用、路由约束均属可自动化范畴）。
- **建议**: 补 ThemesPage Vitest：filterQuery 过滤行为、点击卡片触发 setContent/createDoc、无 /templates 路由。

### [SR-003] MEDIUM: T-079 MCP Tool 绕过 M-008 use case 直接 enqueue
- **category**: structure
- **root_cause**: self-caused
- **描述**: `upload-to-wechat-asset.ts` 直接 `client.enqueue("wechat-asset-upload", ...)`，绕过 T-078 的 `composeUploadWechatAsset`。AC-002 明确"Tool 仅调用 composeUploadWechatAsset"。破坏 M-009→M-008 分层——**T-078 的 imageUrl https 校验在 MCP 调用链被跳过（安全含义：MCP 路径缺 use-case 层校验；relay HTTP 路由侧 SSRF 校验由 T-126 独立提供）**。
- **建议**: uploadToWechatAssetTool 注入并委托 composeUploadWechatAsset；若架构决定 MCP 层直 enqueue，显式记录决策并更新 AC-002。证据 `apps/mcp-server/src/tools/upload-to-wechat-asset.ts:3-12`。

### [SR-004] MEDIUM: T-079 AC-002 测试验证错误委托目标（虚假绿色）
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `upload-to-wechat-asset.test.ts` 验证 `client.enqueue` 调用参数，而 AC-002 要求验证"仅调用 composeUploadWechatAsset"。测试通过但 composeUploadWechatAsset 契约虚假绿色（实际未被调用）。
- **建议**: 随 SR-003 修复同步——改 spy composeUploadWechatAsset；或保留实现则更新 AC-002 与断言。证据 `tests/mcp-server/tools/upload-to-wechat-asset.test.ts:59-92`。

### [SR-005] MEDIUM: T-080 E_NOT_FOUND 未纳入 MCP isError
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `router.ts` `isErrorResult` 仅检查 E_AUTH_REQUIRED/E_PERMISSION_DENIED/E_NOT_IMPLEMENTED；describeTokenTool 未命中返回 `{code:"E_NOT_FOUND"}` 时 MCP 响应 `isError=false`，客户端无法区分成功与未找到。
- **建议**: 将 E_NOT_FOUND 纳入 isErrorResult，或改通用判断（含 code 字段且非业务数据即 isError=true）。证据 `apps/mcp-server/src/tools/router.ts:63-68`。

### [SR-006] MEDIUM: T-081 AC-001 render? / AC-002 token-asset 依赖列表未实现且无测试
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: describe_variant 返回 `{id,blockId,label,attrsSchema,style}`，无 AC-002 要求的 token/asset 依赖列表；list_block_variants 无 AC-001 的 `render?` 元数据；测试均无对应断言。
- **建议**: 若 M-005 结构有意不含该字段，任务卡/代码标 `[ASSUMPTION]` 并登记 backlog；否则补字段或对预期空 dep list 明确断言。证据 `apps/mcp-server/src/tools/describe-variant.ts:13-21`、`list-block-variants.ts:8-23`。

### [SR-007] MEDIUM: T-116 AC-004 commander 注册无测试守护
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: index.ts 已字面注册 `.command('init')`/`.command('validate')`（实现正确），但 validate.test.ts 全为函数级单测，不验证 commander 入口注册；意外删除注册行不会被测试捕获。
- **建议**: 补 `program.commands` 断言或 index.ts 字面量 grep-assert。证据 `apps/cli/src/index.ts:19,33`。

### [SR-008] MEDIUM: T-117 AC-002 stdout `[wechat-flow:hmr]` 前缀被 T-127 契约升级取代
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: T-117 AC-002 要求文件变更时 stdout 输出 `[wechat-flow:hmr]` 前缀行；T-127 将 HMR 升级为 `server.ws.send({type:'full-reload'})`，onChange 不再 log，原 stdout 维度无实现也无 feedback。属占位契约被真实 Vite 契约取代的 AC stale。
- **建议**: 二选一——① 视为 T-127 取代 T-117 占位 AC，更新 dev-plan T-117 AC-002 标注 superseded；② 保留运行时 console feedback（onChange 额外 log 一行 `[wechat-flow:hmr] full-reload`）并补断言。证据 `apps/cli/src/commands/dev.ts:59-62`。

### [SR-009] MEDIUM: T-127 index.ts 仅传 packDir，serverFactory wiring 无测试
- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: deliverable 述"index.ts dev 命令传递 packDir + serverFactory 参数"，实现 `runDev({packDir})` 靠 `defaultServerFactory` 默认值（功能正确，defaultServerFactory 内真实 vite createServer）；但 index.ts→runDev 的 serverFactory wiring 链无测试守护。
- **建议**: 更新 deliverable 措辞澄清"serverFactory 由 dev.ts 默认值承担"；或补 index.ts dev action 集成测试。证据 `apps/cli/src/index.ts:44-47`。

### [SR-010] MEDIUM: T-055 mobile-copy.ts 分支被 module-mock 旁路
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: `PreviewPage.test.ts` 全量 `vi.mock("@wechat-flow/core")` + `vi.mock("../../use-cases/copy.ts")`，mobileCopy 内部 clipboard 可用/降级两分支真实逻辑从未在测试执行；AC-004 降级路径未断言 execCommand 实际调用。
- **建议**: 为 mobile-copy.ts 增独立单测（spy 替代 module-mock），覆盖 clipboard 可用/不可用两分支 notify 参数与次数。证据 `apps/editor/src/use-cases/mobile-copy.ts`（无专属测试）。

### [SR-011] LOW: T-123 token.test 无 resetTokenRegistry 隔离
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: token.test.ts 无 beforeEach 调 resetTokenRegistry()，各测试向全局 Map 累积 registerToken（~12 个探针 token），AC-002/004 count 断言含测试注入 token，顺序依赖；seed 重构时可能掩盖真实回归。
- **建议**: beforeEach 调 resetTokenRegistry() + 重载 seed。证据 `tests/core/registry/token.test.ts:1-15`；`packages/core/src/registry/token.ts` resetTokenRegistry 已导出。

### [SR-012] LOW: T-084 export_clipboard_payload 直调 M-002 越 M-008
- **category**: structure
- **root_cause**: self-caused
- **描述**: export-clipboard-payload.ts 直接 import renderMarkdown（M-002），arch M-009 述 Tool 层只与 M-008 use-case 通信。功能等价但越层。
- **建议**: 若有意绕过 editor-specific composeRender，代码标 `[ASSUMPTION]`；或下沉通用 composeRender 至 core。证据 `apps/mcp-server/src/tools/export-clipboard-payload.ts:1`。

### [SR-013] LOW: dispatchTool 每次重建 buildHandlers
- **category**: performance
- **root_cause**: self-caused
- **描述**: `dispatchTool` 每次调用执行 `buildHandlers(jobsClient)` 重建 24 handler 对象，高频 MCP call 产生不必要分配。
- **建议**: buildHandlers 上提或以 jobsClient 为 key 缓存。证据 `apps/mcp-server/src/tools/router.ts:84`。

### [SR-014] LOW: T-055 移动端成功复制路径双 toast
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: clipboard 可用时 mobileCopy 先调 composeCopy（内部 notify「已复制到剪贴板」）再 notify「已复制」，pushToast 双弹；AC-002 测试用 toHaveBeenCalledWith 无次数约束掩盖。CLAUDE.md 已登记此 LOW。
- **建议**: 加 toHaveBeenCalledTimes(1) 回归守卫（当前会 FAIL 触发修复）；根治需 composeCopy 返成功布尔或 notify 统一由 mobileCopy 控制。证据 `apps/editor/src/use-cases/mobile-copy.ts:16-21`。

### [SR-015] LOW: T-055 DocumentListSheet 数据源 module-mock 全 stub
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: DocumentListSheet.test.ts 用 `vi.mock("@wechat-flow/core")` stub listDocuments，组件加载→渲染→点击全在 mock 之上，listDocuments 返回契约未经真实路径验证（core 层有独立测试，故 LOW）。
- **建议**: 可接受；可选补不 mock listDocuments 的集成测试。证据 `apps/editor/src/components/mobile/__tests__/DocumentListSheet.test.ts:5-14`。

## 跨切面维度

### 偏移率（drift-rate）
无计划外 AC（gold-plating）。部分未达成 AC：T-081 AC-001+AC-002（dep list/render?）、T-117 AC-002（被 T-127 取代）、T-079 AC-002（错误委托）、T-073 AC-003（语义歧义）≈ 4-5 条，占 Sprint 5 规划 AC（~17 任务 × 平均 AC）显著低于 **20% 阈值**，无 drift-rate HIGH。无延期 AC（全部任务 status=done、deliverables 全部落盘）。

### Wiring 完成度（wiring-completeness）
user-facing/critical-path 任务 wiring 真实挂载已核验：T-055 `/preview/:docId` 路由 + MobileBottomBar/DocumentListSheet 挂入 PreviewPage；T-116/T-117 命令挂 index.ts commander；T-124~T-126 路由/worker 已挂 createApp/registerWorker。T-127 serverFactory 经默认值接 vite（SR-009 记录测试缺口）。

### 质量聚合（quality-summary）
已独立闭环的 per-task 报告：T-124（needs_revision→approved，6 项）、T-125（→approved，5 项）、T-126（→approved，8 项）、zh-typo 垂直 T-043~046（approved_with_notes，8 notes 全闭环）、T-047/T-051/T-077（并行批，findings 由 T-124/125/126 wiring 收尾）。**复现模式**：①security_sensitive wiring 三卡均首轮 needs_revision（ACL/认证/SSRF 边界）→ 强化了 per-task code-review 对该类任务的必要性；②延迟批高频出现 **ac-coverage / test-quality**（测试用 module-mock 全 stub 被测包顶层导出、或验证错误委托目标导致契约虚假绿色）——T-079/T-055/T-081/T-073 共性，建议后续 RED 阶段强约束"至少一个关联测试不 mock 被测包顶层导出"。

## Verdict

**approved_with_notes**

10 MEDIUM（SR-001~010）+ 5 LOW（SR-011~015），**无 CRITICAL/HIGH**。Sprint 5 全部任务 status=done、deliverables 落盘、全量门禁绿（1710 passed / Branches 90.3% / typecheck 0 / arch-guard 0 / boundaries 0）。notes 不阻塞 Sprint 5 收尾；建议优先处理 SR-003/004（T-079 架构分层+虚假绿色，含安全含义）、SR-005（T-080 错误码）、SR-008（T-117 AC stale 对账），其余测试覆盖类可登记 backlog。
