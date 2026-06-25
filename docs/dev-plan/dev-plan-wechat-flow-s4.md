---
id: "dev-plan-wechat-flow-s4"
version: "0.5.2"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data", "ui-spec-wechat-flow", "ui-spec-wechat-flow-uc001-uc014", "ui-spec-wechat-flow-p001-p005"]
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
- Sprint 4 任务卡 → T-030..T-042, T-091, T-092, T-093, T-102, T-105, T-106, T-111, T-118..T-122
[/NAV]

**Sprint 目标**: 一键复制 inline HTML 可粘贴到公众号编辑器；MCP server `render_markdown` 可通过 stdio transport 调用；图床配置和上传可用。

---

## 3. 任务卡详细

### T-102: [DESIGN] Penpot — UC-014 JobProgressBar + P-003 主题市场 + P-004 设置页视觉稿

- **目标**: 产出 JobProgressBar、主题市场页、设置页的视觉稿
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: UC-014 JobProgressBar 视觉稿覆盖 `queued`/`running`/`completed`/`failed` 4 个状态，含进度轨道 + 进度填充 + 文字描述行
  - [ ] AC-002: P-003 主题市场初版视觉稿含桌面档 4 列卡片网格布局 + 筛选栏（含 (主题, template) 组合卡片布局占位，完整三档视觉稿由 T-105 交付）
  - [ ] AC-003: P-004 设置页视觉稿含左侧导航栏 + 右侧内容区，图床配置折叠卡片展开态可见
  - [ ] AC-004: 通过 Penpot MCP `find_shape` 可检索到 `UC-014`、`P-003`、`P-004`
- **deliverables**:
  - [ ] Penpot 项目：UC-014, P-003, P-004 视觉稿页面
- **relates_to**: [ui-spec-wechat-flow-uc001-uc014#§2.UC-014, ui-spec-wechat-flow-p001-p005#§3.P-003, §3.P-004]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-014
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
  - [ ] AC-003: Given composeCopy 成功执行，When 完成，Then 触发 UC-011 Toast（`type: 'success'`，消息「已复制到剪贴板」）[F-004 AC-001]
  - [ ] AC-004（production path）: `apps/editor/src/components/layout/TopBar.vue` 或 `ContextMenu.vue` 内含字面 `onCopyHtml()` 处理函数，调用 `composeCopy`，文件路径和函数名可在代码中直接检索到
  - [ ] AC-005: Given composeCopy 内部 pipeline，When 执行，Then 调用顺序为 composeRender → simulatePaste → buildDualMimePayload；剪贴板写入前必经 simulatePaste 节点 [F-004 AC-004]
- **deliverables**:
  - [ ] `apps/editor/src/use-cases/copy.ts` — `composeCopy(input: ComposeCopyInput) → Promise<void>` (import simulatePaste from M-004)
  - [ ] `apps/editor/src/use-cases/dual-mime-payload.ts` — `buildDualMimePayload(html: string, text: string) → ClipboardItem[]` [ARCH#§2.M-008]
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
  - [ ] `apps/editor/src/use-cases/export-html.ts` — `composeExportHtml(input) → string` [ARCH#§2.M-008]
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
  - [ ] `apps/mcp-server/src/tools/router.ts` — Tool dispatcher 骨架（24 个 Tool 占位，含 register_variant）
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
  - [ ] AC-004: Given 调用 `lint_markdown({ markdown: '...' })`（含 `position:fixed` 样式），When 执行，Then 返回 `{ diagnostics: [{ level: 'warning', ... }] }`（custom-css strip-position 路径：被拒声明静默 strip，渲染不中断，warning 语义），不返回 `html` 字段
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
  - [ ] AC-005: Given 调用 `describe_theme({ id: 'default' })`，When 执行，Then 返回对象含 `paintable` 和 `templates` 字段；`templates` 为数组，每项含 `templateId`、`description` 字段 [ARCH#§2.M-005]
  - [ ] AC-006: Given 调用 `describe_mark({ markId: 'badge' })`，When 执行，Then 返回对象含 `attrsSchema` JSON Schema
  - [ ] AC-007: Given 调用 `describe_theme({ id: 'default' })`，When 执行，Then 返回对象含 `templates` 字段；`templates` 为数组且每项含 `templateId`、`description` 字段（不新增 `list_theme_templates` Tool） [ARCH#§3.API-033 + ARCH#§2.M-005]
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
- **priority**: P0
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

### T-040: M-001 UC-014 JobProgressBar + Toast（UC-011）接线 SSE 进度

- **目标**: 实现 JobProgressBar（UC-014）和 Toast（UC-011），接线 SSE 事件流展示长任务进度
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-034, T-102]
- **acceptance_criteria**:
  - [ ] AC-001: Given job 处于 `running` 状态，When SSE 推送 `{ percent: 45 }`，Then JobProgressBar 进度填充宽度变为 45%，文字显示「正在导出 45%」[ui-spec-wechat-flow-uc001-uc014#§2.UC-014]
  - [ ] AC-002: Given job 完成（`succeeded`），When SSE 推送完成事件，Then 进度条填充色变 `--color-success`，文字显示「导出成功」，含下载链接
  - [ ] AC-003: Given Toast 组件，When `type: 'success'`，Then 背景 `--color-success-subtle`，左边框 `3px solid --color-success`，3000ms 后自动消失 [ui-spec-wechat-flow-uc001-uc014#§2.UC-011]
  - [ ] AC-004: Given Toast `type: 'error'`，When 渲染，Then 不自动消失（需用户手动关闭）[ui-spec-wechat-flow-uc001-uc014#§2.UC-011]
- **deliverables**:
  - [ ] `apps/editor/src/components/common/JobProgressBar.vue` — UC-014 实现
  - [ ] `apps/editor/src/components/common/Toast.vue` — UC-011 实现
  - [ ] `apps/editor/src/composables/use-sse-job.ts` — SSE 事件流订阅 composable（连接 relay SSE 端点）
- **relates_to**: [F-005, M-001, UC-011, UC-014]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-011
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-014

---

### T-041: P-003 主题市场页面（/themes 路由）

- **目标**: 实现 P-003 主题市场页面（`/themes` 路由），含内置主题卡片网格、筛选栏、社区扩展占位卡片、响应式三档布局
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-022, T-005, T-092, T-102]
- **acceptance_criteria**:
  - [ ] AC-001: Given 访问 `/themes`，When 页面加载，Then 显示 ≥ 5 张 UC-022 TemplateThemeCard（含主题缩略图 + template 选择器），以 `(themeId, templateId)` 为组合展示，使用 `listThemeTemplates(themeId)` 动态获取可用 template 列表 [F-003 AC-003 + ui-spec-wechat-flow-p001-p005#§3.P-003]
  - [ ] AC-002: Given 当前已应用的主题，When 在 P-003 页面，Then 对应卡片显示「正在使用」徽章（`--color-brand-subtle` 背景）
  - [ ] AC-003: Given 点击某主题「使用此主题」按钮，When 点击，Then 主题切换，Toast（success）提示「已切换到 XX 主题」，TopBar 主题指示器更新
  - [ ] AC-004: Given 某主题 T-092 预填 template 已就绪，When 用户在卡片上选择 template，Then 编辑器内容替换为该 template 的 Markdown 内容（调用 `describeTemplate(themeId, templateId).markdown`）[ARCH#§2.M-005]
- **deliverables**:
  - [ ] 更新 `apps/editor/src/pages/ThemesPage.vue` — P-003 完整实现（含网格布局 + 筛选 + 社区占位卡片 + template 选择器）
  - [ ] `apps/editor/src/components/themes/TemplateThemeCard.vue` — UC-022 实现（(主题, template) 组合卡，含缩略图 + template 下拉选择）
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
- **dependencies**: [T-005, T-033, T-102]
- **acceptance_criteria**:
  - [x] AC-001: Given 访问 `/settings`，When 页面加载，Then 显示左侧导航（编辑器/主题与品牌/同步与协作/图床配置/API密钥/关于），默认选中「编辑器」分组 [ui-spec-wechat-flow-p001-p005#§3.P-004]
  - [x] AC-002: Given 「图床配置」导航项，When 点击，Then 右侧显示 6 个图床折叠卡片；展开「七牛云」卡片，可填写 AccessKey/SecretKey（密码框，不明文显示）
  - [x] AC-003: Given 填写图床配置后点击「保存」，When 保存，Then 凭据写入 IndexedDB（`preferences` store，key 加密处理），Toast 提示「设置已保存」，刷新页面后配置恢复 [A-001 假设 + F-006]
  - [x] AC-004: Given 「API 密钥」分组，When 展示 AppSecret 输入框，Then 默认密码框形式（不明文），hover 显示「眼睛」图标可切换明/暗
- **deliverables**:
  - [x] 更新 `apps/editor/src/pages/SettingsPage.vue` — P-004 完整实现
  - [x] `apps/editor/src/components/settings/ImageHostConfig.vue` — 图床配置折叠卡片组
  - [x] `apps/editor/src/components/settings/ApiKeyConfig.vue` — API 密钥配置分组
  - [x] `packages/core/src/storage/credentials.ts` — 凭据本地加密存储（使用 Web Crypto API）
- **relates_to**: [F-006, M-001, M-013, P-004]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-013
  - ui-spec-wechat-flow-p001-p005#§3.P-004

---

### T-091: M-010 Editor Session JWT 颁发与续期端点（API-032）

- **目标**: 实现 `POST /api/v1/editor/session` 与 `POST /api/v1/editor/session/refresh` 两个端点：Editor SPA 不持长期 API key，通过 OAuth 或匿名 bootstrap 交换 ≤15min JWT；JWT 在后续 API-017..020 调用中作为 Bearer token 鉴权。
- **模块**: M-010 (中继服务)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: true
- **dependencies**: [T-032]
- **acceptance_criteria**:
  - [ ] AC-001: Given OAuth bootstrap 入参（`{ bootstrap: 'oauth', provider, oauthToken }`），When 调用 `POST /api/v1/editor/session`，Then 返回 `{ sessionJwt, expiresAt, refreshUntil, scope, sessionId }`，`expiresAt - now() <= 15 * 60 * 1000`，scope 不含 `admin` 与 `wechat-asset` [ARCH#§3.6 API-032]
  - [ ] AC-002: Given 匿名 bootstrap（`{ bootstrap: 'anonymous', deviceFingerprint }`），When 同 IP 1 分钟内重复调用 ≥ 10 次，Then 第 11 次返回 429 `E_QUOTA_EXCEEDED` [ARCH#§3.6]
  - [ ] AC-003: Given 持有效 JWT 调用 `POST /api/v1/editor/session/refresh`（exp 前 1min 内），When 服务端校验 sessionId 未吊销，Then 返回新 JWT，旧 JWT 在 grace 期内仍可用 [ARCH#§3.6]
  - [ ] AC-004: Given Editor 拿到 sessionJwt 调用 `POST /api/v1/images/upload`，When 中间件 `auth/token-resolver.ts` 解析 Bearer，Then 按 `iss='editor'` 走 session 校验路径并放行；同样的 token 调用 admin 端点 `POST /api/v1/admin/api-keys` 返回 403
  - [ ] AC-005: Given JWT 签名密钥 `EDITOR_JWT_SECRET` 未配置，When 服务启动，Then 进程退出码 1 并输出明确错误（防止生产环境裸跑无密钥）；CSP 允许 sessionJwt 出现在 `Authorization` header 但禁止出现在 URL query
- **deliverables**:
  - [ ] `apps/relay/src/auth/editor-session.ts` — JWT 颁发与续期实现（jose 或 jsonwebtoken）
  - [ ] `apps/relay/src/auth/token-resolver.ts` — Bearer 统一解析（区分 API key vs editor session JWT）
  - [ ] `apps/relay/src/routes/editor-session.ts` — `POST /api/v1/editor/session` + `/refresh` 路由
  - [ ] `apps/relay/src/middleware/auth.ts` — 更新中间件接入 token-resolver
  - [ ] `apps/editor/src/composables/use-editor-session.ts` — 客户端 session 获取与续期 composable
  - [ ] `tests/relay/editor-session.test.ts` — AC-001..AC-005 单元测试
- **relates_to**: [F-006, PRD §3.2, ARCH#§3.6 API-032, M-010]
- **context_load**:
  - arch-wechat-flow-api#§3.6
  - arch-wechat-flow-modules#§2.M-010
  - prd-wechat-flow#§3.2

---

### T-093: UC-018 编辑器内上传 UI 接线（拖拽/粘贴/进度/重试）

- **目标**: 落地 F-006 AC-004 的编辑器内上传 UI：SourcePane 拖拽/粘贴触发上传、占位节点、进度反馈与失败重试，接线 T-033 relay 上传与 T-091 session JWT。
- **模块**: M-001 (编辑器 UI), M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-033, T-091, T-106]
- **acceptance_criteria**:
  - [ ] AC-001: Given 用户将图片拖拽到 SourcePane，When drop，Then 显示 UC-018 `uploading` 状态并插入 `<img data-uploading="true">` 占位节点；上传成功后原子替换为最终 URL [F-006 AC-004]
  - [ ] AC-002: Given 用户在编辑器粘贴图片（clipboard item 含 image/*），When paste，Then 触发同一上传流程（复用 T-033 API）并显示进度百分比 [F-006 AC-004]
  - [ ] AC-003: Given 上传失败，When UC-018 进入 `error` 状态，Then 点击「重试」可重入上传流程；点击「取消」删除占位节点并关闭浮层 [F-006 AC-004]
  - [ ] AC-004（production path）: `SourcePane.vue` 中可检索到 `onDropImage` 与 `onPasteImage` 处理函数，且调用 `composeUploadImage` / relay 上传接口并透传 Editor session JWT
- **deliverables**:
  - [ ] `apps/editor/src/components/upload/ImageUploadOverlay.vue` — UC-018 实现
  - [ ] 更新 `apps/editor/src/components/editor/SourcePane.vue` — 拖拽/粘贴接线
  - [ ] `apps/editor/src/composables/use-image-upload.ts` — 上传状态机（idle/dragging/uploading/success/error）
  - [ ] `tests/editor/image-upload-overlay.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-006, M-001, M-008, UC-018]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-006
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-018
  - arch-wechat-flow-modules#§2.M-010

---

### T-111: [VALIDATION] Sprint 4 验证：复制 HTML + 长图导出 + MCP render_markdown + 上传 UI

- **目标**: 用户手动验证一键复制 HTML 可粘贴到公众号编辑器、长图异步导出、MCP stdio 调用
- **task_kind**: validation
- **tdd_acceptance**: skip
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **priority**: P0
- **sprint**: 4
- **user_facing_critical_path**: true
- **dependencies**: [T-030, T-031, T-035, T-037, T-042, T-091, T-092, T-093]
- **acceptance_criteria**:
  - [ ] 在编辑器中写入一段含标题/段落/粗体的 Markdown，点击「...」→「复制 HTML」（或 Ctrl+Shift+C），剪贴板中含 `text/html` + `text/plain` 两个 MIME；将 HTML 传入 `simulatePaste()` 后与本地预览 inline-styled HTML 跑 pixelmatch（同 T-058 5 主题 × heading/paragraph/code 子集口径），ratio ≤ 0.05 通过（真实公众号粘贴回归由 T-090 周期任务验证）
  - [ ] 点击「...」→「下载 HTML」，浏览器弹出下载，保存为 `.html` 文件后在浏览器双击打开，内容正常渲染
  - [ ] 在设置页「图床配置」中配置 local 图床，在编辑器中拖拽一张图片到编辑区，图片上传成功，编辑区和预览区均显示上传后的 URL 图片
  - [ ] 通过 MCP stdio transport（`node dist/stdio.js`），发送 `render_markdown({ markdown: '# Hello' })` 消息，返回包含 `html`、`rulesetVersion`、`themeVersion` 字段的响应
  - [ ] 通过 MCP 调用 `export_long_image({ markdown: '...' })`，返回 `{ jobId: '...' }`，随后 `get_job({ jobId: '...' })` 轮询，最终 `status: 'succeeded'`，`result.url` 可访问
  - [ ] Editor session 链路：浏览器打开 Editor，DevTools Network 观察 `POST /api/v1/editor/session` 返回 200 + sessionJwt；后续 `POST /api/v1/images/upload` 携带该 JWT，DevTools 中检查 Authorization header 非空且非长期 API key
  - [ ] 主题模板市场卡片缩略图视觉回归：对 5 内置主题各默认 template，使用 T-092 预填 Markdown 渲染缩略图，与 T-105 Penpot 视觉稿对比，pixelmatch ratio ≤ 0.05
- **relates_to**: [F-004, F-005, F-006, F-013, M-009, M-010]

---

### T-092: 主题预设 template 内容产出 + 9 维守护实现

- **目标**: 为 5 内置主题各产出 ≥ 1 份预填 Markdown template（覆盖 9 基础元素 + ≥ 6 核心 Block 容器）；在 M-005 实现 template 注册与查询接口；在 M-006 追加第 9 维守护 `validateThemeTemplates`；接通 API-033 `describe_template` Tool
- **模块**: M-005 (主题注册中心), M-006 (调色板派生/守护), M-009 (MCP server)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
- **security_sensitive**: false
- **notes**: expected_tool_budget=~110 (orchestrator 调度参考)
- **dependencies**: [T-022, T-024]
- **acceptance_criteria**:
  - [ ] AC-001: Given 调用 `defineTemplate({ themeId: 'default', templateId: 'starter', markdown: '...', metadata: { description: '...' } })`（M-005 接口），When 执行，Then `listThemeTemplates('default')` 返回数组含 `{ templateId: 'starter', description: '...' }`；`describeTemplate('default', 'starter')` 返回对象含 `markdown`、`metadata` 字段 [ARCH#§2.M-005]
  - [ ] AC-002: Given `packages/themes/<themeId>/templates/<templateId>.md` 文件存在（5 主题 × 1 template），When 主题包加载，Then `listThemeTemplates(themeId)` 对每个 `themeId` 返回 ≥ 1 个 template 条目
  - [ ] AC-003: Given 任意一份 template 的 Markdown 内容，When 渲染并检查，Then 覆盖白名单中全部 9 基础元素（H1-H6、段落、列表、引用、链接、代码块、分隔线、图片、表格）且包含 ≥ 6 核心 Block 容器（callout、card、steps、quote、pull-quote、compare 中至少 6 类） [F-011 AC-009 + ARCH#§2.M-006]
  - [ ] AC-004: Given M-005 已实现第 9 维守护，When 调用 `validateThemeTemplates(themeId): ThemeTemplateValidationResult`，Then 对覆盖完整的主题返回 `{ valid: true, themeId, templateCount: N, missingElements: [] }`；对缺失元素的 template 返回 `{ valid: false, missingElements: ['table', 'callout'] }` 等具体缺失列表 [ARCH#§2.M-005]
  - [ ] AC-005: Given `packages/core/src/theme-guard/template-coverage.test.ts`，When 运行，Then 每个内置主题至少 1 个 template 通过守护校验，测试文件使用 `packages/themes/*/templates/*.md` fixture 读取真实内容
  - [ ] AC-006: Given 通过 MCP stdio transport 调用 `describe_template({ themeId: 'default', templateId: 'starter' })`（API-033 Tool），When 执行，Then 返回 `{ themeId: 'default', templateId: 'starter', markdown: '...', metadata: { description: '...' } }`，Tool schema 定义在 `apps/mcp-server/src/tools/mcp/tool-contracts.ts` [ARCH#§3.API-033]
- **deliverables**:
  - [ ] `packages/themes/default/templates/starter.md` — default 主题预填 Markdown
  - [ ] `packages/themes/magazine/templates/starter.md` — magazine 主题预填 Markdown
  - [ ] `packages/themes/literary/templates/starter.md` — literary 主题预填 Markdown
  - [ ] `packages/themes/business/templates/starter.md` — business 主题预填 Markdown
  - [ ] `packages/themes/tech/templates/starter.md` — tech 主题预填 Markdown
  - [ ] `packages/core/src/registry/template.ts` — `defineTemplate` / `listThemeTemplates` / `describeTemplate` 实现（M-005 接口扩展）
  - [ ] `packages/core/src/theme-guard/template-coverage.ts` — `validateThemeTemplates` 第 9 维守护实现（M-005 扩展（`packages/core/src/theme-guard/template-coverage.ts`））
  - [ ] `packages/core/src/theme-guard/template-coverage.test.ts` — 单元测试（AC-005）
  - [ ] `apps/mcp-server/src/tools/describe-template.ts` — API-033 `describe_template` Tool 实现
  - [ ] `packages/contracts/src/mcp/tool-contracts.ts` — 更新，追加 `describe_template` Tool schema
  - [ ] 更新 `apps/mcp-server/src/tools/router.ts` — 注册 `describe_template` Tool
  - [ ] `tests/mcp-server/tools/describe-template.test.ts` — AC-006 集成测试
- **relates_to**: [F-003, F-008, F-011, M-005, M-006, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - arch-wechat-flow-modules#§2.M-006
  - arch-wechat-flow-api#§3.API-033
  - arch-wechat-flow-data#§4.E-011
  - prd-wechat-flow-f001-f014#§2.F-011

---

### T-105: [DESIGN] P-003 主题模板市场 Penpot 设计（含 (主题, template) 组合卡片缩略图）

- **目标**: 产出 P-003 主题模板市场页的完整视觉稿（三档响应式）+ ≥ 5 张 (主题, template) 组合卡片缩略图，作为 T-041 与 T-111 视觉回归的参照
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: Penpot 中绘制 P-003 主题模板市场页面视觉稿（桌面/平板/移动三档），网格布局使用 UC-022 TemplateThemeCard 组件，与 `ui-spec-wechat-flow-p001-p005#§3.P-003` 对齐
  - [ ] AC-002: 绘制 ≥ 5 张 (主题, template) 组合卡片缩略图，各对应 5 内置主题（default / magazine / literary / business / tech）的默认 template，缩略图尺寸与 UC-022 规格一致
  - [ ] AC-003: 同步到 Penpot Design System 库，提供组件 ID 引用清单，通过 Penpot MCP `find_shape` 可检索到 `P-003`、`UC-022`
  - [ ] AC-004: 签字记录写入 `docs/EVENT-LOG.jsonl`（`phase=development, event=design_signoff`）
- **deliverables**:
  - [ ] Penpot 项目：P-003 主题模板市场页面视觉稿（三档） + ≥ 5 张 (主题, template) 组合卡片缩略图
- **relates_to**: [F-003, F-008, P-003, UC-022]
- **context_load**:
  - ui-spec-wechat-flow-p001-p005#§3.P-003

---

### T-106: [DESIGN] 6 个新组件 Penpot 设计（UC-017 ~ UC-022）

- **目标**: 产出 UC-017 ~ UC-022 共 6 个新组件的 Penpot 视觉规格，涵盖状态变体与 Design Token 接线
- **task_kind**: design
- **tdd_acceptance**: skip
- **priority**: P1
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: 在 Penpot 中绘制 6 个新组件视觉规格，每个组件含 default / hover / active（或 disabled）至少 2 个状态变体：
    - UC-017 ZhTypoReviseDialog — 双栏 diff Modal，左栏原文 / 右栏改后 + rule 计数 + undo 按钮
    - UC-018 ImageUploadOverlay — 编辑器内浮层，含 drop zone / 上传进度条 / 重试按钮 / 占位符
    - UC-019 PaintDrawer — 右侧抽屉（宽 280px），含 color picker + frontmatter 绑定字段
    - UC-020 BaseColorDeriveModal — 居中 Modal + 色块矩阵（派生色预览）
    - UC-021 DirectiveAutocompletePopover — 光标下浮层 + 二级 Block/Mark variant 选择列表
    - UC-022 TemplateThemeCard — (主题, template) 组合卡片，含缩略图 + template 下拉选择器
  - [ ] AC-002: 每个组件 Penpot 命名遵循 `C-{NNN}` 模式，与 `ui-spec-wechat-flow-uc001-uc014` 对应章节对齐
  - [ ] AC-003: 组件挂接到 Penpot Design System Token，通过 Penpot MCP `find_shape` 可检索到 UC-017 ~ UC-022
  - [ ] AC-004: 签字记录写入 `docs/EVENT-LOG.jsonl`（`phase=development, event=design_signoff`）
- **deliverables**:
  - [ ] Penpot 项目：UC-017 ~ UC-022 共 6 个组件视觉规格页面
- **relates_to**: [UC-017, UC-018, UC-019, UC-020, UC-021, UC-022]
- **context_load**:
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-017
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-018
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-019
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-020
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-021
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-022

---

### T-118: M-012 contracts schema 演进（customCss + registerVariant + themeBlocks variant 维度）

- **目标**: 在 `@wechat-flow/contracts` 契约层追加 `customCss` 字段、`registerVariant` 请求/响应 schema、`RejectedDeclaration` 类型、themeBlocksSchema variant 维度，并将 tool-count 对账测试从 23 更新到 24
- **模块**: M-012 (schema 契约层)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005]
- **security_sensitive**: false
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given `import { renderMarkdownRequestSchema } from '@wechat-flow/contracts'`，When `renderMarkdownRequestSchema.safeParse({ markdown: '# H', customCss: 'p { color: red; }' })`，Then `result.success === true`；`customCss` 字段类型推导为 `string | undefined` [ARCH#§3.API-001]
  - [ ] AC-002: Given `import { registerVariantRequestSchema, registerVariantResponseSchema } from '@wechat-flow/contracts'`，When `registerVariantRequestSchema.safeParse({ blockId: 'callout', variantId: 'my:dark', label: 'Dark', style: { root: { 'background-color': '#000' } } })`，Then `result.success === true` [ARCH#§3.API-034]
  - [ ] AC-003: Given `registerVariantResponseSchema.safeParse({ registered: false, variantId: 'my:dark', rejectedDeclarations: [{ slot: 'root', property: 'background-color', value: '#000', reason: 'not in whitelist' }] })`，When 解析，Then `result.success === true`；`rejectedDeclarations[0]` 含 `slot / property / value / reason` 四字段 [ARCH#§3.API-034]
  - [ ] AC-004: Given `import { themeBlocksSchema } from '@wechat-flow/contracts'`，When `themeBlocksSchema.safeParse({ callout: { default: { 'background-color': '#fff' }, dark: { 'background-color': '#000' } } })`，Then `result.success === true`；schema 结构为 `z.record(z.string(), z.record(z.string(), z.record(z.string(), z.string())))` 即 `blockName → variantId → prop → value`，`default` 键无特殊校验（由 guard 逻辑在 M-005 处执行） [ARCH#§8.2.Q3.15]
  - [ ] AC-005: Given `tests/contracts/tool-count.test.ts`，When 运行，Then 断言 `packages/contracts/src/mcp/tool-contracts.ts` 导出的 Tool schema 数量为 24（20 同步 + 4 异步），测试不通过时输出 `Expected 24 tool schemas, got N` [ARCH#§3]
- **deliverables**:
  - [ ] 更新 `packages/contracts/src/mcp/render-markdown.ts`（或 `tool-contracts.ts` 对应位置）— 追加 `customCss: z.string().optional()`
  - [ ] `packages/contracts/src/mcp/register-variant.ts` — 导出 `registerVariantRequestSchema`、`registerVariantResponseSchema`、`RejectedDeclaration` 类型
  - [ ] 更新 `packages/contracts/src/theme/theme-definition.ts` — `themeBlocksSchema` 改为三层嵌套 record（`blockName → variantId → Record<prop, value>`）
  - [ ] 更新 `packages/contracts/src/mcp/tool-contracts.ts` — 追加 `register_variant` Tool schema 占位，Tool 总数 24
  - [ ] 更新 `tests/contracts/tool-count.test.ts` — 断言值改为 24
- **relates_to**: [M-012, API-001, API-034]
- **context_load**:
  - arch-wechat-flow-api#§3.API-001
  - arch-wechat-flow-api#§3.API-034
  - arch-wechat-flow-modules#§2.M-012

---

### T-119: M-005 registerVariant / getBlockBaseStyle + blocks defineBlock base-style 携带

- **目标**: 在 M-005 注册中心实现 `registerVariant` 与 `getBlockBaseStyle` 接口；在 `packages/blocks` 的 `defineBlock` 调用中为每个内置 Block 携带 `baseStyle` 槽位样式；与 plugin-api `defineVariant` 共享 `registry/variant.ts` 校验链路
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
- **security_sensitive**: false
- **dependencies**: [T-118, T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given `registerVariant({ blockId: 'callout', id: 'my:dark', label: 'Dark', style: { root: { 'background-color': '#1a1a1a' } } })` 调用，When 执行，Then `listBlockVariants('callout')` 返回含 `{ id: 'my:dark', label: 'Dark' }` 的条目；`getBlockBaseStyle('callout', 'my:dark')` 返回 `{ 'background-color': '#1a1a1a' }` [ARCH#§2.M-005]
  - [ ] AC-002: Given `registerVariant` 的 `style` 参数含不在 css-attr-filter 白名单内的属性（如 `{ root: { position: 'fixed' } }`），When 调用，Then 抛结构化错误，错误对象含 `rejectedDeclarations: [{ slot: 'root', property: 'position', value: 'fixed', reason: 'not in css-attr-filter whitelist' }]`，不产生部分注册 [ARCH#§3.API-034]
  - [ ] AC-003: Given 对已注册 variantId 重复调用 `registerVariant`（相同 blockId + variantId），When 调用，Then 抛 `E_VARIANT_CONFLICT` 错误（409 语义），现有注册条目不变 [ARCH#§3.API-034]
  - [ ] AC-004: Given `packages/blocks/src/blocks/callout.ts` 的 `defineBlock('callout', ...)` 调用，When 执行，Then `getBlockBaseStyle('callout', 'default')` 返回非空 record（含 callout block 的骨架结构样式，如 `{ 'border-left': '4px solid currentColor', 'padding': '...' }`）[ARCH#§8.2.Q3.15]
  - [ ] AC-005: Given `defineBlock` 携带的 `baseStyle` 缺 `root` 槽位键，或缺 `default` variant 条目，When 注册执行，Then 抛结构化错误并拒绝注册（`default` 键守护在 M-005 注册时执行，schema 层不约束——对账 T-118 AC-004）[ARCH#§8.2.Q3.15]
  - [ ] AC-006（production path）: `packages/blocks/src/factory.ts` 中可检索到 `baseStyle` 字段的接收与传递，`registerVariant` 调用出现在 `packages/core/src/theme/variant-registry.ts` 或 `registry/variant.ts` 中并可被直接检索到
- **deliverables**:
  - [ ] `packages/core/src/registry/variant.ts` — `registerVariant(opts)` 实现（校验 + 存储，进程内 Map）
  - [ ] 更新 `packages/core/src/theme/registry/block.ts` — `defineBlock` 签名扩展 `baseStyle?: Record<string, Record<string, string>>`，注册时存入 `default` variant
  - [ ] 更新 `packages/core/src/theme/index.ts` — 导出 `registerVariant`、`getBlockBaseStyle`
  - [ ] 更新 `packages/blocks/src/blocks/*.ts` — 至少 callout / card / steps / quote / pull-quote / compare 携带 `baseStyle`（root 槽必含）
  - [ ] `tests/core/theme/register-variant.test.ts` — AC-001..AC-005 单元测试
- **relates_to**: [M-005, F-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - arch-wechat-flow-api#§3.API-034
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-120: pipeline/inline-style.ts 分层合成 + pipeline/custom-css.ts juice pass

- **目标**: 改造 `pipeline/inline-style.ts` 为 L1⊕L2 分层合成（(block,variant) 键索引 + base-style ⊕ theme token override）；新增 `pipeline/custom-css.ts` 实现 L3 条件 juice/client cascade pass（无 customCss 时字节级不变约束）；整理 `TokenDictionary` 同名异构问题
- **模块**: M-002 (渲染管线核心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: large
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: required
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
- **security_sensitive**: false
- **dependencies**: [T-118, T-119, T-007]
- **acceptance_criteria**:
  - [ ] AC-001: Given `renderMarkdown({ markdown: ':::callout\ncontent\n:::', themeId: 'default' })` 无 `customCss` 参数，When 执行，Then 输出 HTML 的 callout 容器元素的 `style` 属性含 `getBlockBaseStyle('callout', 'default')` 的声明，不含 CSS 变量（`var(--`）[ARCH#§2.M-002 stage 5]
  - [ ] AC-002: Given 相同 Markdown + 相同 themeId + 无 `customCss`，When 与当前 T-007 实现的输出对比，Then SHA-256 完全相同（字节级不变约束，L1⊕L2 路径不扰动现有 CI fixture 基线）[ARCH#§8.2.Q3.9]
  - [ ] AC-003: Given `renderMarkdown({ markdown: '# Hello', themeId: 'default', customCss: 'h1 { color: red; }' })`，When 执行，Then 输出 HTML 中 `<h1>` 元素的 `style` 属性含 `color: red`（juice cascade 生效）[ARCH#§8.2.Q3.9]
  - [ ] AC-004: Given `customCss` 含 css-attr-filter 白名单外的属性（如 `h1 { position: fixed; }`），When 执行，Then 输出 HTML 中 `<h1>` 不含 `position` 属性；`result.diagnostics` 含 `source: 'custom-css'` 的诊断条目，`message` 描述被拒绝的声明 [ARCH#§3.API-001]
  - [ ] AC-005: Given 渲染管线 stage 5 的 `pipeline/custom-css.ts`，When `customCss` 为 `undefined` 或空字符串，Then 跳过整个 juice pass，不引入任何 juice 调用开销；测试通过 spy 确认 `inlineContent` 未被调用
  - [ ] AC-006: Given `packages/core/src/pipeline/inline-style.ts` 局部 `TokenDictionary` 类型，When 与 `packages/contracts/src/palette/token-dictionary.ts` 的 `TokenDictionary` 比较，Then 两者不再同名且语义清晰区分（pipeline 内部类型改名或导入明确区分）[ARCH#§2.M-002]
- **deliverables**:
  - [ ] 更新 `packages/core/src/pipeline/inline-style.ts` — 分层合成：`getBlockBaseStyle` 查 L1，themeBlocksSchema override 查 L2，(block,variant) 键索引展开，`sortedEntries` 确定性遍历；局部 `TokenDictionary` 类型重命名消除歧义
  - [ ] `packages/core/src/pipeline/custom-css.ts` — L3 条件 pass：`customCss` 非空时 serialize → `juice/client` `inlineContent` → re-parse → 全树重过 `css-attr-filter`；被拒声明产 `Diagnostic` 汇入 `RenderResult.diagnostics`
  - [ ] 更新 `packages/core/package.json` — 追加 `juice` 为活依赖（`juice/client` 入口）
  - [ ] `tests/core/pipeline/inline-style-layered.test.ts` — AC-001..AC-002, AC-006 单元测试
  - [ ] `tests/core/pipeline/custom-css.test.ts` — AC-003..AC-005 单元测试
- **relates_to**: [M-002, API-001]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002
  - arch-wechat-flow-api#§3.API-001
  - arch-wechat-flow#§8.2

---

### T-121: pipeline/transform.ts containerDirective/leafDirective 展开（容器渲染缝隙）

- **目标**: 在 `pipeline/transform.ts` 补全 containerDirective / leafDirective 的展开逻辑，将 `:::blockId{.variant}` 指令展开为 Block 渲染模板 hast 结构（含 root/title/body 槽位），消费 `RenderOptions` 的 themeId/variant 上下文；修复 `_options` 参数未消费缺陷
- **模块**: M-002 (渲染管线核心)
- **task_kind**: feature
- **priority**: P0
- **complexity**: medium
- **sprint**: 4
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **security_sensitive**: false
- **dependencies**: [T-119, T-120]
- **acceptance_criteria**:
  - [ ] AC-001: Given Markdown `:::callout{.warning}\ncontent\n:::` 经 `renderMarkdown`，When 执行，Then 输出 HTML 含 Block 骨架结构（外层容器 div 含 `data-block="callout"` 属性，inner body slot 含 `<p>content</p>`）[ARCH#§2.M-002 stage 2]
  - [ ] AC-002: Given `:::callout{.my-variant}\ncontent\n:::` 且 `my-variant` 已通过 `registerVariant` 注册，When `renderMarkdown` 执行，Then 输出元素的 `style` 属性包含 `getBlockBaseStyle('callout', 'my-variant')` 声明（分层合成通路 L1 正确消费 variant 上下文） [ARCH#§8.2.Q3.15]
  - [ ] AC-003: Given `pipeline/transform.ts` 内 `_options` 参数，When 调用 `renderMarkdown({ themeId: 'magazine' })`，Then `options.themeId` 值 `'magazine'` 被传入 directive 展开逻辑中（可通过 spy 确认 options 对象在展开路径中被读取，非 undefined）
  - [ ] AC-004: Given attrsSchema 含必填字段的 Block（假设 `:::steps{.list}` 缺少 required 属性），When `renderMarkdown` 执行，Then `result.diagnostics` 含 `source: 'transform'`、`severity: 'warning'` 的诊断条目，渲染不中断（降级为原始 hast 节点）[ARCH#§2.M-002]
- **deliverables**:
  - [ ] 更新 `packages/core/src/pipeline/transform.ts` — containerDirective / leafDirective handler 实现：attrsSchema 校验（zod safeParse）+ Block hast 骨架生成 + slot 填充 + variant 参数透传给 inline-style 阶段；`_options` 参数重命名为 `options` 并消费 `themeId/variant`
  - [ ] `tests/core/pipeline/transform-container.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [M-002, F-003]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-002
  - arch-wechat-flow-modules#§2.M-005

---

### T-122: M-009 register_variant Tool 实现 + router 注册（API-034）

- **目标**: 在 MCP server 实现 `register_variant` Tool（API-034），连接 M-005 `registerVariant`，在 tools/router.ts 注册为第 24 个 Tool
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P0
- **complexity**: small
- **sprint**: 4
- **tdd_mode**: light
- **tdd_refactor**: auto
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007]
- **security_sensitive**: false
- **dependencies**: [T-118, T-119, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: Given 通过 stdio transport 调用 `register_variant({ blockId: 'callout', variantId: 'my:dark', label: 'Dark', style: { root: { 'background-color': '#1a1a1a' } } })`，When 执行，Then 返回 `{ registered: true, variantId: 'my:dark', rejectedDeclarations: [] }` [ARCH#§3.API-034]
  - [ ] AC-002: Given `register_variant` 调用 `style` 含白名单外属性，When 执行，Then 返回 `{ registered: false, variantId: '...', rejectedDeclarations: [{ slot, property, value, reason }] }`，`registered` 为 `false`，不产生部分注册 [ARCH#§3.API-034]
  - [ ] AC-003: Given `blockId` 不存在于 Block 注册中心，When 调用 `register_variant`，Then 返回错误 `{ code: 'E_BLOCK_NOT_FOUND' }`（HTTP 语义 404）[ARCH#§3.API-034]
  - [ ] AC-004: Given 对已注册的 (blockId, variantId) 组合重复调用 `register_variant`（内置 / 插件 / 先前注册均算占用），When 执行，Then 返回错误 `{ code: 'E_VARIANT_CONFLICT' }`（HTTP 语义 409），现有注册条目不变 [ARCH#§3.API-034]
  - [ ] AC-005: Given `style` 含该 Block 渲染模板未声明的槽位键（如 `{ 'unknown-slot': { color: '#000' } }`），When 调用，Then 返回错误 `{ code: 'E_SLOT_UNKNOWN' }`（HTTP 语义 422）[ARCH#§3.API-034]
  - [ ] AC-006: Given `blockId` / `variantId` / `label` 任一为空字符串，或 `style` 为空 map / 不符合 `Record<string, Record<string, string>>` 结构，When 调用，Then 返回错误 `{ code: 'E_SCHEMA' }`（HTTP 语义 400）[ARCH#§3.API-034]
  - [ ] AC-007（production path）: `apps/mcp-server/src/tools/router.ts` 中可检索到 `register_variant` 注册调用，且文件字面包含 `registerTool('register_variant', ...)` 或等价的路由注册语句；`apps/mcp-server/src/tools/register-variant.ts` 文件存在
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/register-variant.ts` — `register_variant` Tool 实现（thin wrapper → M-005 `registerVariant`）
  - [ ] 更新 `apps/mcp-server/src/tools/router.ts` — 注册 `register_variant`（Tool 总数达 24）
  - [ ] `tests/mcp-server/tools/register-variant.test.ts` — AC-001..AC-006 单元测试
- **relates_to**: [F-010, F-013, M-009, M-005, API-034]
- **context_load**:
  - arch-wechat-flow-api#§3.API-034
  - arch-wechat-flow-modules#§2.M-009
