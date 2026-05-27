---
id: "dev-plan-wechat-flow-s4"
version: "0.2.0"
doc_type: dev-plan
author: tech-lead
status: draft
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "ui-spec-wechat-flow", "ui-spec-wechat-flow-c001-c014", "ui-spec-wechat-flow-p001-p005"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 4: 输出能力 + MCP server + 图片处理

[NAV]
- Sprint 4 任务卡 → T-030..T-042, T-DS-008, T-VAL-04
[/NAV]

**Sprint 目标**: 一键复制 inline HTML 可粘贴到公众号编辑器；MCP server `render_markdown` 可通过 stdio transport 调用；图床配置和上传可用。

---

## 3. 任务卡详细

### T-DS-008: [DESIGN] Penpot — C-014 JobProgressBar + P-003 主题市场 + P-004 设置页视觉稿

- **目标**: 产出 JobProgressBar、主题市场页、设置页的视觉稿
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-DS-001]
- **acceptance_criteria**:
  - [ ] AC-001: C-014 JobProgressBar 视觉稿覆盖 `queued`/`running`/`completed`/`failed` 4 个状态，含进度轨道 + 进度填充 + 文字描述行
  - [ ] AC-002: P-003 主题市场视觉稿含桌面档 4 列卡片网格布局 + 筛选栏
  - [ ] AC-003: P-004 设置页视觉稿含左侧导航栏 + 右侧内容区，图床配置折叠卡片展开态可见
  - [ ] AC-004: 通过 Penpot MCP `find_shape` 可检索到 `C-014`、`P-003`、`P-004`
- **deliverables**:
  - [ ] Penpot 项目：C-014, P-003, P-004 视觉稿页面
- **relates_to**: [ui-spec-wechat-flow-c001-c014#§2.C-014, ui-spec-wechat-flow-p001-p005#§3.P-003, §3.P-004]
- **context_load**:
  - ui-spec-wechat-flow-c001-c014#§2.C-014
  - ui-spec-wechat-flow-p001-p005#§3.P-003
  - ui-spec-wechat-flow-p001-p005#§3.P-004

---

### T-030: M-008 composeCopy（dual-MIME clipboard payload）

- **目标**: 实现 `composeCopy` use case：渲染 inline HTML + 组装 dual-MIME（`text/html` + `text/plain`）clipboard payload，通过 Clipboard API 写入剪贴板
- **模块**: M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: skip
- **tdd_acceptance**: all
- **security_sensitive**: false
- **dependencies**: [T-011, T-017]
- **acceptance_criteria**:
  - [ ] AC-001: Given `composeCopy({ markdown: '# Hello', themeId: 'default' })` 在 HTTPS + 用户手势上下文中调用，When 执行，Then `navigator.clipboard.write` 被调用，payload 含 `text/html` ClipboardItem（值为 inline-styled HTML）和 `text/plain` ClipboardItem [F-004 AC-001]
  - [ ] AC-002: Given 产出的 `text/html` 内容，When 检查，Then 无 `<style>` 标签，无 CSS 变量（`var(--`），所有样式在 `style` 属性内联 [F-004 AC-003]
  - [ ] AC-003: Given composeCopy 成功执行，When 完成，Then 触发 C-011 Toast（`type: 'success'`，消息「已复制到剪贴板」）[F-004 AC-001]
  - [ ] AC-004（production path）: `apps/editor/src/components/layout/TopBar.vue` 或 `ContextMenu.vue` 内含字面 `onCopyHtml()` 处理函数，调用 `composeCopy`，文件路径和函数名可在代码中直接检索到
  - [ ] AC-005: Given composeCopy 内部 pipeline，When 执行，Then 调用顺序为 composeRender → simulatePaste → buildDualMimePayload；剪贴板写入前必经 simulatePaste 节点 [F-004 AC-004]
- **deliverables**:
  - [ ] `packages/core/src/composers/copy.ts` — `composeCopy(input: ComposeCopyInput) → Promise<void>` (import simulatePaste from M-004)
  - [ ] `packages/core/src/clipboard/dual-mime-payload.ts` — `buildDualMimePayload(html: string, text: string) → ClipboardItem[]` [ARCH#§2.M-008]
  - [ ] `tests/app-layer/compose-copy.test.ts` — AC-001..AC-005（使用 happy-dom 或 vitest browser 模拟 Clipboard API）
- **relates_to**: [F-004, M-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-008
  - prd-wechat-flow-f001-f014#§2.F-004

---

### T-031: M-008 composeExportHtml（standalone HTML 导出）

- **目标**: 实现 `composeExportHtml` use case：产出可独立分享的 standalone HTML 文件（含字体 CDN 引用和基础 CSS reset）
- **模块**: M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: skip
- **tdd_acceptance**: [AC-001, AC-002]
- **security_sensitive**: false
- **dependencies**: [T-011]
- **acceptance_criteria**:
  - [ ] AC-001: Given `composeExportHtml({ markdown: '# Hello', themeId: 'default' })`，When 调用，Then 返回完整 HTML 字符串，含 `<!DOCTYPE html>`、`<html>`、`<body>` 结构，body 内为 inline-styled 内容
  - [ ] AC-002: Given 导出的 HTML 文件，When 在浏览器中直接打开，Then 内容正常显示（无依赖外部 CSS 文件），字体 fallback 到系统字体正常渲染
- **deliverables**:
  - [ ] `packages/core/src/composers/export-html.ts` — `composeExportHtml(input) → string` [ARCH#§2.M-008]
  - [ ] `tests/app-layer/compose-export-html.test.ts` — AC-001 单元测试
- **relates_to**: [F-004, M-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-008
  - prd-wechat-flow-f001-f014#§2.F-004

---

### T-032: apps/relay Hono 服务器骨架 + 健康检查端点

- **目标**: 初始化 `apps/relay` 为 Hono 4.x Node.js 服务，配置 Zod validator middleware，实现 `GET /health` 健康检查端点
- **模块**: M-010 (中继服务)
- **task_kind**: chore
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: small
- **sprint**: 4
- **tdd_mode**: skip
- **tdd_skip_reason**: "Hono 服务器骨架初始化，为脚手架配置，无单元测试价值"
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `pnpm --filter relay dev` 启动，When 请求 `GET http://localhost:3000/health`，Then 返回 `{ status: 'ok', version: '...' }` JSON，HTTP 状态码 200
  - [ ] AC-002: Given Zod validator middleware 配置，When 向需要 JSON body 的端点发送非法 JSON，Then 返回 400 状态码，body 含 `{ error: 'validation_error', issues: [...] }`
- **deliverables**:
  - [ ] `apps/relay/src/index.ts` — Hono app 入口
  - [ ] `apps/relay/src/routes/health.ts` — 健康检查路由
  - [ ] `apps/relay/src/middleware/validator.ts` — Zod validator 中间件（包装 `@hono/zod-validator`）
- **relates_to**: [M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010

---

### T-033: M-010 图片上传 proxy（6 类图床适配器）+ sharp 预处理

- **目标**: 实现 6 类图床适配器（本地/七牛/OSS/COS/SM.MS/自定义）+ sharp 图片预处理（EXIF 剥离、压缩、宽度规整 ≤1080px），暴露 `POST /api/v1/images/upload` 端点
- **模块**: M-010 (中继服务)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: true
- **dependencies**: [T-032]
- **acceptance_criteria**:
  - [ ] AC-001: Given 上传一张含 EXIF 信息的 JPEG（≥ 500KB），When 调用 `POST /api/v1/images/upload` 并配置 local 图床，Then 返回 `{ url: '...', size: N }` 其中 `N < 原始大小`，且返回图片可通过 `piexifjs` 验证无 GPS EXIF 数据 [F-006 AC-003]
  - [ ] AC-002: Given 上传一张宽度 2000px 的图片，When 处理，Then 落地文件宽度 ≤ 1080px（自动压缩） [F-006 AC-002]
  - [ ] AC-003: Given 七牛云图床配置（AccessKey/SecretKey/Bucket/Domain 均有效），When 上传，Then 图片 URL 可通过 HTTP GET 访问（集成测试，需实际图床凭据，CI 跳过，仅在 dev 环境验证）
  - [ ] AC-004: Given 图床凭据不在请求 body 中（安全要求），When 检查请求处理逻辑，Then 凭据仅从 relay 服务的环境变量或 KMS 读取，不经过浏览器客户端 [F-006 + ARCH#§2.M-010]
- **deliverables**:
  - [ ] `apps/relay/src/image-host/qiniu.ts`
  - [ ] `apps/relay/src/image-host/oss.ts`
  - [ ] `apps/relay/src/image-host/cos.ts`
  - [ ] `apps/relay/src/image-host/smms.ts`
  - [ ] `apps/relay/src/image-host/local.ts`
  - [ ] `apps/relay/src/image-host/custom.ts`
  - [ ] `apps/relay/src/image/preprocess.ts` — sharp EXIF 剥离 + 压缩 + 宽度规整
  - [ ] `apps/relay/src/routes/images.ts` — `POST /api/v1/images/upload` 端点
  - [ ] `tests/relay/image-preprocess.test.ts` — AC-001..AC-002 单元测试（使用测试图片 fixture）
- **relates_to**: [F-006, M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010
  - prd-wechat-flow-f001-f014#§2.F-006

---

### T-034: M-010 BullMQ job 队列 + Redis 接线 + SSE 进度推送（API-020）

- **目标**: 实现 BullMQ job 队列工厂、job 状态机、幂等性去重（Redis），以及 SSE 进度推送端点（`GET /api/v1/jobs/:id/events`）
- **模块**: M-010 (中继服务)
- **task_kind**: feature
- **priority**: P1
- **complexity**: large
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-032]
- **acceptance_criteria**:
  - [ ] AC-001: Given 提交一个 job（type: `long-image-render`），When 调用入队 API，Then 返回 `{ jobId: 'xxx' }`，随后 `GET /api/v1/jobs/xxx` 返回 `{ status: 'pending' }` [ARCH#§2.M-010 + F-005 AC-004]
  - [ ] AC-002: Given 相同 `Idempotency-Key` 的两次请求，When 第二次到达，Then 返回第一次的 `jobId`（不新建 job），Redis key `idem:{apiKeyId}:{sha256}` TTL 24h [ARCH#§2.M-010]
  - [ ] AC-003: Given 客户端连接 `GET /api/v1/jobs/:id/events` SSE 端点，When job 状态从 `pending` → `running` → `succeeded`，Then SSE 流推送 3 个事件（`progress`/`progress`/`succeeded`），每个事件含 `jobId` 和 `percent` 字段 [ARCH#§2.M-010 API-020]
  - [ ] AC-004: Given job 状态机，When job 状态转换 `running → failed`，Then E-005 Job 表中对应记录 `status` 字段更新为 `'failed'`，`error` 字段含错误描述
- **deliverables**:
  - [ ] `apps/relay/src/job/queue.ts` — BullMQ 队列工厂（命名 `bullmq-{kind}`）
  - [ ] `apps/relay/src/job/state-machine.ts` — `pending → running → succeeded/failed` 状态机
  - [ ] `apps/relay/src/job/idempotency.ts` — `sha256` 去重缓存（Redis）[ARCH#§2.M-010]
  - [ ] `apps/relay/src/job/sse-bridge.ts` — BullMQ QueueEvents → Hono `streamSSE` 桥
  - [ ] `apps/relay/src/routes/jobs.ts` — `GET /api/v1/jobs/:id`（状态查询）+ `GET /api/v1/jobs/:id/events`（SSE）
  - [ ] `tests/relay/job-queue.test.ts` — AC-001..AC-004（使用 testcontainers 或 mock Redis）
- **relates_to**: [F-005, M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010
  - prd-wechat-flow-f001-f014#§2.F-005

---

### T-035: M-010 Playwright headless 渲染池（长图 + 封面）

- **目标**: 实现 Playwright Chromium headless 进程池，执行长图（全高截图）和封面（横版 900×383 / 方版 900×900）渲染，产出 PNG 字节流
- **模块**: M-010 (中继服务)
- **task_kind**: feature
- **priority**: P1
- **complexity**: large
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-034]
- **acceptance_criteria**:
  - [ ] AC-001: Given 调用长图渲染 job，When Playwright worker 执行，Then 产出 PNG 字节流，图片宽度与 `viewportWidth` 参数一致（默认 750px），高度 = 内容实际高度（自适应）[F-005 AC-001]
  - [ ] AC-002: Given 调用横版封面渲染，When 执行，Then 产出 PNG 宽度 = 900px，高度 = 383px [F-005 AC-002]
  - [ ] AC-003: Given 方版封面参数，When 执行，Then 产出 PNG 为 900×900px
  - [ ] AC-004: Given Playwright 渲染完成，When 字节流写入对象存储（local 模式：`public/exports/`），Then job result 含可访问的 URL 路径
- **deliverables**:
  - [ ] `apps/relay/src/headless/playwright-pool.ts` — Playwright chromium.launch 进程池
  - [ ] `apps/relay/src/headless/render-long-image.ts`
  - [ ] `apps/relay/src/headless/render-cover.ts`
  - [ ] `apps/job-worker/src/index.ts` — job worker 进程入口（消费 BullMQ）
  - [ ] `tests/relay/headless-render.test.ts` — AC-001..AC-004（需 Chromium，CI 环境限制时标 `@skip-in-ci`）
- **relates_to**: [F-005, M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010
  - prd-wechat-flow-f001-f014#§2.F-005

---

### T-036: M-009 MCP server stdio transport + 鉴权骨架（API key scope=user）

- **目标**: 初始化 `apps/mcp-server`，实现 stdio transport 入口、API key 鉴权（scope=user）、scope-guard 前置守卫
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: true
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given MCP server 通过 stdio transport 启动（`node dist/stdio.js`），When 发送 MCP `initialize` 消息，Then 返回合规的 MCP server capabilities 响应（含 `tools` 列表）
  - [ ] AC-002: Given 请求不携带有效 API key，When 调用任意 Tool，Then 返回 `E_AUTH_REQUIRED` 错误，不执行 Tool 逻辑 [ARCH#§2.M-009]
  - [ ] AC-003: Given `scope=admin` 的 API key，When 尝试调用 `render_markdown` Tool（scope=user 路由），Then 返回 403 `E_PERMISSION_DENIED` [ARCH#§2.M-009]
  - [ ] AC-004（production path）: `apps/mcp-server/src/transport/stdio.ts` 作为服务入口被 `apps/mcp-server/src/index.ts` 导入并在 `main()` 中调用 `startStdioTransport()`
- **deliverables**:
  - [ ] `apps/mcp-server/src/transport/stdio.ts` — stdio transport 入口
  - [ ] `apps/mcp-server/src/auth/api-key.ts` — API key 哈希验证 + scope 读取 [ARCH#§2.M-009]
  - [ ] `apps/mcp-server/src/auth/scope-guard.ts` — user/admin scope 前置守卫
  - [ ] `apps/mcp-server/src/tools/router.ts` — Tool dispatcher 骨架（16 个 Tool 占位）
  - [ ] `apps/mcp-server/src/index.ts` — server 入口
  - [ ] `tests/mcp-server/auth.test.ts` — AC-002..AC-003 单元测试
- **relates_to**: [F-013, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - prd-wechat-flow-f001-f014#§2.F-013

---

### T-037: M-009 render_markdown / lint_markdown / get_ruleset_version Tool 实现

- **目标**: 实现 MCP server 的核心渲染工具：`render_markdown`、`lint_markdown`、`get_ruleset_version`，连接 M-008 composeRender use case
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-036, T-011]
- **acceptance_criteria**:
  - [ ] AC-001: Given 通过 stdio transport 调用 `render_markdown({ markdown: '# Hello', themeId: 'default' })`，When 执行，Then 返回 `{ html: '<...>', diagnostics: [...], rulesetVersion: '...', themeVersion: '...' }` [F-013 AC-002 + ARCH#§2.M-009]
  - [ ] AC-002: Given 相同 Markdown + 相同 `themeId`，When 两次调用 `render_markdown`，Then 两次返回的 `html` 字段 `sha256` 完全相同（确定性渲染）[F-013 AC-001]
  - [ ] AC-003: Given 调用 `get_ruleset_version`，When 执行，Then 返回 `{ coreVersion: '...', themeVersion: '...', rulesetVersion: '...' }` 三元组 [F-013 AC-002 + ARCH#§2.M-009]
  - [ ] AC-004: Given 调用 `lint_markdown({ markdown: '...' })`（含 `position:fixed` 样式），When 执行，Then 返回 `{ diagnostics: [{ level: 'error', ... }] }`，不返回 `html` 字段
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/render-markdown.ts` — `render_markdown` Tool 实现
  - [ ] `apps/mcp-server/src/tools/lint-markdown.ts` — `lint_markdown` Tool
  - [ ] `apps/mcp-server/src/tools/get-ruleset-version.ts` — `get_ruleset_version` Tool
  - [ ] 更新 `apps/mcp-server/src/tools/router.ts` — 注册以上 3 个 Tool
  - [ ] `tests/mcp-server/tools/render-markdown.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-013, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - prd-wechat-flow-f001-f014#§2.F-013

---

### T-038: M-009 list_themes / describe_theme / list_blocks / describe_block Tool

- **目标**: 实现 MCP server 的组件/主题发现工具，返回 JSON Schema 格式的 `attrsSchema`
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: all
- **security_sensitive**: false
- **dependencies**: [T-036, T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given 调用 `list_themes`，When 执行，Then 返回数组长度 ≥ 5，每项含 `id`、`name` 字段 [F-013 AC-002]
  - [ ] AC-002: Given 调用 `describe_block({ blockId: 'callout' })`，When 执行，Then 返回对象含 `attrsSchema` 字段，该字段符合 JSON Schema Draft-7 格式（`type: 'object'`，`properties` 非空）[F-013 AC-002 + ARCH#§2.M-012]
  - [ ] AC-003: Given 调用 `list_marks`，When 执行，Then 返回数组长度 ≥ 11，含 `badge`、`highlight` 等 [F-013 AC-002]
  - [ ] AC-004: Given 调用 `list_blocks`，When 执行，Then 返回数组长度 ≥ 25（与 T-024 一致）
  - [ ] AC-005: Given 调用 `describe_theme({ id: 'default' })`，When 执行，Then 返回对象含 `paintable` 和 `templates` 字段
  - [ ] AC-006: Given 调用 `describe_mark({ markId: 'badge' })`，When 执行，Then 返回对象含 `attrsSchema` JSON Schema
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/list-themes.ts`
  - [ ] `apps/mcp-server/src/tools/describe-theme.ts`
  - [ ] `apps/mcp-server/src/tools/list-blocks.ts`
  - [ ] `apps/mcp-server/src/tools/describe-block.ts`
  - [ ] `apps/mcp-server/src/tools/list-marks.ts`
  - [ ] `apps/mcp-server/src/tools/describe-mark.ts`
  - [ ] `tests/mcp-server/tools/describe-block.test.ts` — AC-001..AC-006 单元测试
- **relates_to**: [F-013, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - arch-wechat-flow-modules#§2.M-012

---

### T-039: M-009 export_long_image / export_cover / get_job / upload_image Tool

- **目标**: 实现 MCP server 异步长任务工具：`export_long_image`、`export_cover`、`get_job`、`upload_image`，统一异步 job 模型
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-036, T-034, T-035]
- **acceptance_criteria**:
  - [ ] AC-001: Given 调用 `export_long_image({ markdown: '...', themeId: 'default' })`，When 执行，Then 立即返回 `{ jobId: 'xxx' }` [F-005 AC-004 + F-013 AC-002]
  - [ ] AC-002: Given 已返回的 `jobId`，When 调用 `get_job({ jobId: 'xxx' })`，Then 返回 `{ status: 'pending' | 'running' | 'succeeded' | 'failed', result?: { url: '...' } }` [F-013 AC-002]
  - [ ] AC-003: Given `Idempotency-Key` 相同的两次 `export_long_image` 请求，When 第二次，Then 返回第一次的 `jobId`（幂等性）[F-013 AC-004]
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/export-long-image.ts`
  - [ ] `apps/mcp-server/src/tools/export-cover.ts`
  - [ ] `apps/mcp-server/src/tools/get-job.ts`
  - [ ] `apps/mcp-server/src/tools/upload-image.ts`
  - [ ] `tests/mcp-server/tools/export-long-image.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-005, F-013, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - prd-wechat-flow-f001-f014#§2.F-005

---

### T-040: M-001 C-014 JobProgressBar + Toast（C-011）接线 SSE 进度

- **目标**: 实现 JobProgressBar（C-014）和 Toast（C-011），接线 SSE 事件流展示长任务进度
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-034, T-DS-008]
- **acceptance_criteria**:
  - [ ] AC-001: Given job 处于 `running` 状态，When SSE 推送 `{ percent: 45 }`，Then JobProgressBar 进度填充宽度变为 45%，文字显示「正在导出 45%」[ui-spec-wechat-flow-c001-c014#§2.C-014]
  - [ ] AC-002: Given job 完成（`succeeded`），When SSE 推送完成事件，Then 进度条填充色变 `--color-success`，文字显示「导出成功」，含下载链接
  - [ ] AC-003: Given Toast 组件，When `type: 'success'`，Then 背景 `--color-success-subtle`，左边框 `3px solid --color-success`，3000ms 后自动消失 [ui-spec-wechat-flow-c001-c014#§2.C-011]
  - [ ] AC-004: Given Toast `type: 'error'`，When 渲染，Then 不自动消失（需用户手动关闭）[ui-spec-wechat-flow-c001-c014#§2.C-011]
- **deliverables**:
  - [ ] `apps/editor/src/components/common/JobProgressBar.vue` — C-014 实现
  - [ ] `apps/editor/src/components/common/Toast.vue` — C-011 实现
  - [ ] `apps/editor/src/composables/use-sse-job.ts` — SSE 事件流订阅 composable（连接 relay SSE 端点）
- **relates_to**: [F-005, M-001, C-011, C-014]
- **context_load**:
  - ui-spec-wechat-flow-c001-c014#§2.C-011
  - ui-spec-wechat-flow-c001-c014#§2.C-014

---

### T-041: P-003 主题市场页面（/themes 路由）

- **目标**: 实现 P-003 主题市场页面（`/themes` 路由），含内置主题卡片网格、筛选栏、社区扩展占位卡片、响应式三档布局
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-022, T-005, T-DS-008]
- **acceptance_criteria**:
  - [ ] AC-001: Given 访问 `/themes`，When 页面加载，Then 显示 ≥ 5 张 ThemeCard（扩展版，缩略图高 120px），含「使用此主题」按钮 [F-003 AC-003 + ui-spec-wechat-flow-p001-p005#§3.P-003]
  - [ ] AC-002: Given 当前已应用的主题，When 在 P-003 页面，Then 对应卡片显示「正在使用」徽章（`--color-brand-subtle` 背景）
  - [ ] AC-003: Given 点击某主题「使用此主题」按钮，When 点击，Then 主题切换，Toast（success）提示「已切换到 XX 主题」，TopBar 主题指示器更新
- **deliverables**:
  - [ ] 更新 `apps/editor/src/pages/ThemesPage.vue` — P-003 完整实现（含网格布局 + 筛选 + 社区占位卡片）
  - [ ] `apps/editor/src/components/themes/ThemeCardExtended.vue` — 扩展版主题卡片（缩略图更大）
- **relates_to**: [F-003, F-008, P-003]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - ui-spec-wechat-flow-p001-p005#§3.P-003

---

### T-042: P-004 设置页（/settings 路由）— 图床配置 + API 密钥分组

- **目标**: 实现 P-004 设置页（`/settings` 路由），包含图床配置（6 类图床折叠卡片）和 API 密钥（微信 AppID/AppSecret）两个分组；凭据本地加密存储
- **模块**: M-001 (编辑器 UI), M-013 (浏览器端持久化)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-005, T-033, T-DS-008]
- **acceptance_criteria**:
  - [ ] AC-001: Given 访问 `/settings`，When 页面加载，Then 显示左侧导航（编辑器/主题与品牌/同步与协作/图床配置/API密钥/关于），默认选中「编辑器」分组 [ui-spec-wechat-flow-p001-p005#§3.P-004]
  - [ ] AC-002: Given 「图床配置」导航项，When 点击，Then 右侧显示 6 个图床折叠卡片；展开「七牛云」卡片，可填写 AccessKey/SecretKey（密码框，不明文显示）
  - [ ] AC-003: Given 填写图床配置后点击「保存」，When 保存，Then 凭据写入 IndexedDB（`preferences` store，key 加密处理），Toast 提示「设置已保存」，刷新页面后配置恢复 [A-001 假设 + F-006]
  - [ ] AC-004: Given 「API 密钥」分组，When 展示 AppSecret 输入框，Then 默认密码框形式（不明文），hover 显示「眼睛」图标可切换明/暗
- **deliverables**:
  - [ ] 更新 `apps/editor/src/pages/SettingsPage.vue` — P-004 完整实现
  - [ ] `apps/editor/src/components/settings/ImageHostConfig.vue` — 图床配置折叠卡片组
  - [ ] `apps/editor/src/components/settings/ApiKeyConfig.vue` — API 密钥配置分组
  - [ ] `packages/core/src/storage/credentials.ts` — 凭据本地加密存储（使用 Web Crypto API）
- **relates_to**: [F-006, M-001, M-013, P-004]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-013
  - ui-spec-wechat-flow-p001-p005#§3.P-004

---

### T-VAL-04: [VALIDATION] Sprint 4 验证：复制 HTML + 长图导出 + MCP render_markdown

- **目标**: 用户手动验证一键复制 HTML 可粘贴到公众号编辑器、长图异步导出、MCP stdio 调用
- **task_kind**: validation
- **tdd_acceptance**: skip
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **priority**: P0
- **sprint**: 4
- **user_facing_critical_path**: true
- **dependencies**: [T-030, T-031, T-035, T-037, T-042]
- **acceptance_criteria**:
  - [ ] 在编辑器中写入一段含标题/段落/粗体的 Markdown，点击「...」→「复制 HTML」（或 Ctrl+Shift+C），粘贴到微信公众号编辑器草稿页，视觉效果与本地预览差异 ≤ 5%（目视判断，无明显格式错乱）
  - [ ] 点击「...」→「下载 HTML」，浏览器弹出下载，保存为 `.html` 文件后在浏览器双击打开，内容正常渲染
  - [ ] 在设置页「图床配置」中配置 local 图床，在编辑器中拖拽一张图片到编辑区，图片上传成功，编辑区和预览区均显示上传后的 URL 图片
  - [ ] 通过 MCP stdio transport（`node dist/stdio.js`），发送 `render_markdown({ markdown: '# Hello' })` 消息，返回包含 `html`、`rulesetVersion`、`themeVersion` 字段的响应
  - [ ] 通过 MCP 调用 `export_long_image({ markdown: '...' })`，返回 `{ jobId: '...' }`，随后 `get_job({ jobId: '...' })` 轮询，最终 `status: 'succeeded'`，`result.url` 可访问
- **relates_to**: [F-004, F-005, F-006, F-013, M-009, M-010]
