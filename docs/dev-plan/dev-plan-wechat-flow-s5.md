---
id: "dev-plan-wechat-flow-s5"
version: "0.5.0"
doc_type: dev-plan
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "ui-spec-wechat-flow", "ui-spec-wechat-flow-p001-p005"]
consumers: [developer, qa-engineer]
volume: sprint
volume_type: sprint
split_from: "dev-plan-wechat-flow"
split_policy: no-further-split
required_sections:
  - "## 3. 任务卡详细"
---
# Dev Plan 分卷 — Sprint 5: CLI + 插件系统 + 中文排版 + 收尾功能

[NAV]
- Sprint 5 任务卡 → T-043..T-049, T-116, T-117, T-051, T-055, T-073, T-074, T-075, T-077..T-084, T-103, T-112
[/NAV]

**Sprint 目标**: CLI `validate` 可跑；`apply_zh_typo` MCP Tool 可用；插件沙箱骨架建立；MCP HTTP/SSE transport 就绪；素材库上传链路（T-077/T-078/T-079）就绪；/themes 模板市场增强（T-073）落地筛选与 seed 扩展；Block 补全 Phase 2（T-074，P1 必含 5 种）；MCP Tool 补全包装（T-080..T-084）。

---

## 3. 任务卡详细

### T-103: [DESIGN] Penpot — P-005 移动端只读预览视觉稿（PS-009）

- **目标**: 产出 P-005 移动端只读预览页面视觉稿，重点验证底部固定栏拇指热区可达性（320px 宽度）
- **task_kind**: design
- **tdd_acceptance**: skip
- **tdd_mode**: skip
- **tdd_skip_reason**: "Penpot 设计稿，由用户视觉验证 sign-off"
- **priority**: P2
- **complexity**: small
- **sprint**: 5
- **dependencies**: [T-095]
- **acceptance_criteria**:
  - [ ] AC-001: P-005 视觉稿含 375px 和 320px 两个设备宽度 Frame，底部固定栏高 56px，「文档切换」和「一键复制」按钮可见
  - [ ] AC-002: 在 320px Frame 中验证「一键复制」按钮单手可达（拇指热区覆盖按钮中心区域，按钮最小触控区 ≥ 44×44px）[PS-009]
  - [ ] AC-003: 通过 Penpot MCP `find_shape` 可检索到 `P-005`
- **deliverables**:
  - [ ] Penpot 项目：P-005 移动端只读预览视觉稿（含两个宽度 Frame）
- **relates_to**: [ui-spec-wechat-flow-p001-p005#§3.P-005, PS-009]
- **context_load**:
  - ui-spec-wechat-flow-p001-p005#§3.P-005

---

### T-043: packages/zh-typo 中文排版 4 类规则（M-008 依赖包）

- **目标**: 实现 `@wechat-flow/zh-typo` 包，4 类排版修订规则：中英空格、全半角标点、智能引号、省略号/破折号；仅对 mdast `text` 节点应用，跳过代码/链接 URL/HTML 块
- **模块**: M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-006]
- **acceptance_criteria**:
  - [x] AC-001: Given `applyZhTypo({ markdown: '这是GitHub的项目' })`，When 调用，Then 返回 `{ fixed: '这是 GitHub 的项目', perRule: { 'zh-en-space': 2 }, totalChanges: 2 }` [F-014 AC-001 + ARCH#§2.M-008]
  - [x] AC-002: Given Markdown 含代码块 ```` ```\ncall GitHub()\n``` ````，When `applyZhTypo`，Then 代码块内容不被修改（跳过代码区域）[F-014 AC-002]
  - [x] AC-003: Given `'这是"引用"内容'`，When `applyZhTypo`，Then 返回 `'这是“引用”内容'`（直引号 → 弯引号）[F-014 AC-001]
  - [x] AC-004: Given `'结尾...'`，When `applyZhTypo`，Then 返回 `'结尾……'`（3 点省略号 → 6 点中文省略号）[F-014 AC-001]
- **deliverables**:
  - [x] `packages/zh-typo/src/rules/zh-en-space.ts`
  - [x] `packages/zh-typo/src/rules/fullwidth-punctuation.ts`
  - [x] `packages/zh-typo/src/rules/smart-quotes.ts`
  - [x] `packages/zh-typo/src/rules/ellipsis-dash.ts`
  - [x] `packages/zh-typo/src/apply.ts` — `applyZhTypo(input) → ZhTypoResult`（mdast 解析 → text 节点变换 → stringify）
  - [x] `packages/zh-typo/src/index.ts`
  - [x] `tests/zh-typo/apply.test.ts` — AC-001..AC-004 单元测试
- **relates_to**: [F-014, M-008]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-014
  - arch-wechat-flow-modules#§2.M-008

---

### T-044: M-008 composeApplyZhTypo use case + diff 预览

- **目标**: 实现 `composeApplyZhTypo` use case，产出 diff 预览（修订前后对比）和逐 rule 计数，供 UI 展示
- **模块**: M-008 (应用层 use case)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-043]
- **acceptance_criteria**:
  - [x] AC-001: Given `composeApplyZhTypo({ markdown: '...' })` 调用，When 执行，Then 返回 `{ fixed: '...', perRule: Record<string, number>, totalChanges: number, diff: DiffEntry[] }` [ARCH#§2.M-008]
  - [x] AC-002: Given `diff` 字段，When 检查，Then 每个 `DiffEntry` 含 `original`（修订前文本片段）、`revised`（修订后文本片段）、`ruleId` 字段，可用于 UI 高亮展示
  - [x] AC-003: Given `totalChanges === 0`（无需修订的文档），When `composeApplyZhTypo`，Then 返回 `{ fixed: 原始markdown, totalChanges: 0, diff: [] }`（不做不必要处理）
- **deliverables**:
  - [x] `packages/core/src/composers/apply-zh-typo.ts` — `composeApplyZhTypo(input: { markdown: string }) → ZhTypoComposerResult` [ARCH#§2.M-008]
  - [x] `tests/app-layer/compose-apply-zh-typo.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-014, M-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-008
  - prd-wechat-flow-f001-f014#§2.F-014

---

### T-045: M-009 apply_zh_typo Tool 实现

- **目标**: 实现 MCP server 的 `apply_zh_typo` Tool，连接 `composeApplyZhTypo` use case
- **模块**: M-009 (MCP server)
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-036, T-044]
- **acceptance_criteria**:
  - [x] AC-001: Given 调用 `apply_zh_typo({ markdown: '这是GitHub的项目' })`，When 执行，Then 返回 `{ fixed: '这是 GitHub 的项目', perRule: {...}, totalChanges: N }` [F-013 AC-002 + F-014 AC-005]
- **deliverables**:
  - [x] `apps/mcp-server/src/tools/apply-zh-typo.ts` — `apply_zh_typo` Tool 实现
  - [x] 更新 `apps/mcp-server/src/tools/router.ts` — 注册 `apply_zh_typo`
  - [x] `tests/mcp-server/tools/apply-zh-typo.test.ts` — AC-001 单元测试
- **relates_to**: [F-013, F-014, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - prd-wechat-flow-f001-f014#§2.F-014

---

### T-046: M-001 中文排版修订 UI（diff 预览 Modal + ContextMenu 接线）

- **目标**: 实现编辑器中文排版修订的 UI 流程：用户触发 → diff 预览 Modal 展示 → 确认后写回编辑器，并纳入 undo 栈
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-044, T-027]
- **acceptance_criteria**:
  - [x] AC-001: Given 点击 ContextMenu「中文排版修订」，When 触发，Then diff 预览 Modal（UC-012 form-variant）弹出，展示修订前/后对比和逐 rule 计数 [F-014 AC-003 + F-001 AC-008]
  - [x] AC-002: Given diff 预览 Modal，When 用户点击「确认修订」，Then 编辑器内容替换为 `fixed` 字符串，PreviewPane 刷新，Toast 提示「已修订 N 处」
  - [x] AC-003: Given 用户确认修订后，When 按 Ctrl+Z 撤销，Then 编辑器内容回到修订前的状态（修订操作纳入 CodeMirror undo 栈）[F-014 AC-004]
  - [x] AC-004: Given 编辑器内容为空或无排版问题，When 触发「中文排版修订」，Then ContextMenu 该菜单项处于 `item-disabled` 状态（灰色不可点击）[ui-spec-wechat-flow-uc001-uc014#§2.UC-016]
- **deliverables**:
  - [x] `apps/editor/src/components/zh-typo/ZhTypoPreviewModal.vue` — diff 预览 Modal（包装 UC-012）
  - [x] 更新 `apps/editor/src/components/panel/ContextMenu.vue` — 接线「中文排版修订」菜单项
  - [x] `apps/editor/src/composables/use-zh-typo.ts` — 触发 → 预览 → 确认 → 写回 composable
- **relates_to**: [F-014, M-001, UC-012, UC-016]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - prd-wechat-flow-f001-f014#§2.F-014
  - ui-spec-wechat-flow-uc001-uc014#§2.UC-016

---

### T-047: M-007 插件沙箱 Worker 骨架（Comlink RPC + 网络门禁）

- **目标**: 实现 Web Worker 沙箱骨架（M-007）：启动时删除全局网络对象，通过 Comlink RPC 桥接 plugin-api，实现网络门禁（network-gate + audit-log）
- **模块**: M-007 (插件沙箱与 plugin-api)
- **task_kind**: feature
- **priority**: P1
- **complexity**: large
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-004]
- **acceptance_criteria**:
  - [ ] AC-001: Given Worker 运行时，When 检查 `globalThis.fetch` 是否存在，Then 应为 `undefined`（启动时已 `delete globalThis.fetch / XMLHttpRequest / WebSocket / EventSource`）[ARCH#§2.M-007]
  - [ ] AC-002: Given 插件代码调用 `requestResource('https://example.com/data')`，When manifest `permissions.network` 未包含该 URL pattern，Then `requestResource` 抛出 `E_PERMISSION_DENIED` 错误 [ARCH#§2.M-007]
  - [ ] AC-003: Given 插件代码调用 `requestResource` 被 allow，When 执行，Then `audit-log` 记录一条 `{ allow: true, url, pluginId, ts }` 条目 [ARCH#§2.M-007]
  - [ ] AC-004: Given Worker 运行超时（超过 5s），When 检测，Then Worker 被终止，降级为 `placeholder` 组件，返回 `{ type: 'fallback', reason: 'timeout' }`
  - [ ] AC-005: Given Worker 启动后，When 检查，Then `typeof globalThis.fetch === 'undefined' && typeof globalThis.XMLHttpRequest === 'undefined'`，否则 assertNetIsolation 抛 E_WORKER_NETWORK_LEAK 并 self.close()
- **deliverables**:
  - [ ] `packages/plugin-api/src/worker/runtime.ts` — Worker 入口 + Comlink RPC 桥 [ARCH#§2.M-007]
  - [ ] `packages/plugin-api/src/acl/network-gate.ts` — URL pattern 白名单检查
  - [ ] `packages/plugin-api/src/acl/audit-log.ts` — 审计日志
  - [ ] `packages/plugin-api/src/validation/manifest-check.ts` — manifest 三层校验骨架
  - [ ] `packages/plugin-api/src/runtime/violation-detector.ts` — 超时/内存检测
  - [ ] `packages/plugin-api/src/fallback/placeholder.ts` — 降级占位符
  - [ ] `packages/plugin-api/src/worker/assert-net-isolation.ts` — 网络隔离断言
  - [ ] `tests/plugin-api/sandbox.test.ts` — AC-001..AC-005 单元测试
- **relates_to**: [F-010, M-007]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-007
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-048: M-007 plugin-api surface（defineBlock/defineVariant/defineRule/defineTheme）

- **目标**: 实现 plugin-api surface（沙箱内白名单 API）：`defineBlock`、`defineVariant`、`defineRule`、`defineTheme`、`registerAsset`
- **模块**: M-007 (插件沙箱与 plugin-api)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-047, T-020]
- **acceptance_criteria**:
  - [ ] AC-001: Given 插件沙箱内调用 `defineBlock({ id: 'my-block', attrsSchema: z.object({...}), render: () => '...' })`，When 执行（通过 Comlink RPC），Then 主线程 M-005 Block 注册中心可通过 `describeBlock('my-block')` 查到该 Block
  - [ ] AC-002: Given `defineVariant({ blockId: 'callout', id: 'my-variant', render: () => '...' })`，When 执行，Then `listBlockVariants('callout')` 返回含 `my-variant` [F-010 AC-006]
  - [ ] AC-003: Given manifest 声明 variant 注册意图但实际未调用 `defineVariant`，When plugin 加载完成，When `manifest-check` 验证，Then 产生 `E_MANIFEST_VARIANT_MISMATCH` warning
- **deliverables**:
  - [ ] `packages/plugin-api/src/surface/plugin-api.ts` — `defineBlock` / `defineVariant` / `defineRule` / `defineTheme` / `registerAsset` / `requestResource` API [ARCH#§2.M-007]
  - [ ] 更新 `packages/plugin-api/src/validation/manifest-check.ts` — AC-003 校验逻辑
  - [ ] `tests/plugin-api/surface.test.ts` — AC-001..AC-003 单元测试
- **relates_to**: [F-010, M-007]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-007
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-049: M-005 品牌包锁定（delta-merge + brand-pack lock）

- **目标**: 实现主题继承（父主题 + delta 合并）和品牌包锁定（字体/配色/组件子集锁定），连接 P-004 设置页「主题与品牌」分组
- **模块**: M-005 (主题与组件注册中心)
- **task_kind**: feature
- **priority**: P2
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-020]
- **acceptance_criteria**:
  - [x] AC-001: Given `registerTheme({ id: 'org-theme', extends: 'default', delta: { tokens: { '--color-brand': '#003366' } } })`，When 应用 `org-theme`，Then 产出 HTML 中主题色为 `#003366`（delta 覆盖），其他 token 继承 default 主题 [F-009 AC-001]
  - [x] AC-002: Given 品牌包锁定了 `--color-brand` 和 `--color-accent`，When 写作者尝试通过 `paint` 覆盖 `--color-brand`，Then 该覆盖被忽略（品牌包优先），diagnostics 含 warn [F-009 AC-002]
- **deliverables**:
  - [x] `packages/core/src/inheritance/delta-merge.ts` — 主题继承 delta 合并 [ARCH#§2.M-005]
  - [x] `packages/core/src/brand-pack/lock.ts` — 品牌包锁定逻辑
  - [x] `tests/core/theme-inheritance.test.ts` — AC-001..AC-002 单元测试
- **relates_to**: [F-009, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-009

---

### T-116: apps/cli 核心命令 init + validate（M-011）

- **目标**: 实现 `apps/cli` 的 2 个核心子命令：`init`（两种骨架：plugin / theme）、`validate`（manifest + schema + 主题守护 + variant 申报一致性）；建立 CLI 入口骨架
- **模块**: M-011 (CLI)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: [AC-001, AC-002, AC-003]
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-047, T-048]
- **acceptance_criteria**:
  - [x] AC-001: Given `wechat-flow init my-pack --template plugin`，When 执行，Then 创建 `my-pack/` 目录，含 `manifest.json`、`src/index.ts`、`package.json` 骨架文件（plugin 模板）；`my-pack/` 目录在文件系统中存在可检索 [F-010 AC-003]
  - [x] AC-002: Given `wechat-flow validate ./my-pack`（合规 pack），When 执行，Then 退出码 0，stdout 含「通过：manifest ✓ schema ✓ 主题守护 ✓」[F-010 AC-005]
  - [x] AC-003: Given `wechat-flow validate ./broken-pack`（manifest 缺少 `name` 字段），When 执行，Then 退出码非 0，stderr 含 `E_MANIFEST_INVALID: missing required field 'name'`
  - [x] AC-004（production path）: `apps/cli/src/index.ts` 中可检索到 `.command('init')` 和 `.command('validate')` 的字面注册调用
- **deliverables**:
  - [x] `apps/cli/src/commands/init.ts` — `--template plugin|theme` 两种骨架
  - [x] `apps/cli/src/commands/validate.ts` — manifest + schema + 主题守护 + variant 申报一致性
  - [x] `apps/cli/src/index.ts` — CLI 入口（使用 `commander` 或 `citty`）
  - [x] `tests/cli/validate.test.ts` — AC-002..AC-003 单元测试
- **relates_to**: [F-010, M-011]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-011
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-117: apps/cli 渲染壳命令 dev/publish/render/copy/export（M-011，thin wrapper）

- **目标**: 实现 `apps/cli` 的 5 个渲染壳子命令：`dev`（Vite middleware + HMR）、`publish`（pack 打包骨架）、`render`、`copy`、`export`；各命令为 thin wrapper，业务逻辑委托给 M-008 / M-011 库
- **模块**: M-011 (CLI)
- **task_kind**: feature
- **priority**: P2
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: [AC-001, AC-002, AC-003, AC-004]
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-116, T-011, T-031, T-030]
- **acceptance_criteria**:
  - [x] AC-001: Given `wechat-flow dev ./my-pack`，When 执行，Then 启动 Vite dev 进程，stdout 含「Watching for changes...」[ARCH#§2.M-011]
  - [x] AC-002: [SUPERSEDED by T-127] 占位 HMR 的 `[wechat-flow:hmr]` stdout 前缀契约由 T-127 真实 Vite `server.ws.send({ type: 'full-reload' })` HMR 接管；dev 命令 HMR 行为以 T-127 AC-001/AC-002 为权威
  - [x] AC-003: Given `wechat-flow render --input article.md --theme default`，When 执行，Then stdout 输出 inline-styled HTML（不含 `<style>` 标签）
  - [x] AC-004: Given `wechat-flow publish ./my-pack`，When pack 文件 SHA256 与上次发布不同，Then stdout 输出 'new pack version detected' 提示；退出码 0
  - [x] AC-005: Given `wechat-flow export --input article.md --format html`，When 执行，Then 生成 standalone `.html` 文件
- **deliverables**:
  - [x] `apps/cli/src/commands/dev.ts` — Vite middleware + HMR + pack live-reload [ARCH#§2.M-011]
  - [x] `apps/cli/src/commands/publish.ts` — pack 打包骨架
  - [x] `apps/cli/src/commands/render.ts` — Tool 契约壳
  - [x] `apps/cli/src/commands/copy.ts` — Tool 契约壳
  - [x] `apps/cli/src/commands/export.ts` — Tool 契约壳
  - [x] 更新 `apps/cli/src/index.ts` — 注册以上 5 个子命令
- **relates_to**: [F-010, M-011]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-011
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-051: M-009 HTTP/SSE transport + admin API key 管理端点

- **目标**: 实现 MCP server HTTP/SSE transport 和 admin API key 管理端点（API-028..API-031），含 admin-guard 鉴权（IP 白名单 + X-Admin-Request header + 审计日志）
- **模块**: M-009 (MCP server), M-010 (中继服务)
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-036]
- **acceptance_criteria**:
  - [ ] AC-001: Given MCP server HTTP transport 启动（`node dist/http.js`），When 向 `POST /mcp/tools/render_markdown` 发送合法 JSON，Then 返回渲染结果，HTTP 200
  - [ ] AC-002: Given 向 `POST /admin/api-keys` 发送请求，When 不携带 `X-Admin-Request: 1` header，Then 返回 403 `E_FORBIDDEN` [ARCH#§2.M-010]
  - [ ] AC-003: Given admin 操作（创建 API key），When 执行，Then 审计日志（`audit-log.ts`）记录 `{ actor, action: 'create-api-key', target, ts }` [ARCH#§2.M-010]
  - [ ] AC-004: Given `POST /admin/api-keys` 成功创建，When 返回，Then 响应体含 `{ apiKey: 'wf_xxx' }`（明文，仅此一次）；随后同一 admin 端点的 `GET /admin/api-keys` 返回的列表中对应条目 `apiKey` 字段不含明文（哈希存储）[ARCH#§2.M-009]
- **deliverables**:
  - [ ] `apps/mcp-server/src/transport/http-sse.ts` — HTTP/SSE transport
  - [ ] `apps/relay/src/admin/api-keys.ts` — admin API key CRUD（API-028..API-031）[ARCH#§2.M-010]
  - [ ] `apps/relay/src/auth/admin-guard.ts` — IP 白名单 + X-Admin-Request header 校验
  - [ ] `tests/relay/admin-api-keys.test.ts` — AC-002..AC-004 单元测试
- **relates_to**: [F-013, M-009, M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - arch-wechat-flow-modules#§2.M-010

---

### T-055: P-005 移动端只读预览（/preview/:docId + 底部固定栏）

- **目标**: 实现 P-005 移动端只读预览页面（`/preview/:docId`）：单栏内容预览区 + 底部固定栏（文档切换 + 一键复制）
- **模块**: M-001 (编辑器 UI)
- **task_kind**: feature
- **priority**: P2
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-005, T-010, T-103]
- **acceptance_criteria**:
  - [ ] AC-001: Given 访问 `/preview/:docId`，When vw < 768px，Then 仅显示内容预览 iframe（375px 视口宽度）+ 底部固定栏（高 56px），无编辑区、左侧面板、右栏 [ui-spec-wechat-flow-p001-p005#§3.P-005]
  - [ ] AC-002: Given 底部固定栏「一键复制」按钮，When 点击（Clipboard API 支持），Then `composeCopy` 被调用，Toast 提示「已复制」；若 Clipboard API 不支持，Then 选中全文并 Toast 提示「请手动长按复制」[A-005 假设]
  - [ ] AC-003: Given 底部「文档切换」按钮，When 点击，Then P-002 文档列表底部抽屉（Bottom Sheet）从底部滑入（`--duration-base`，高度最大 60vh）
  - [ ] AC-004: 不支持 Clipboard API 时降级到 textarea + document.execCommand('copy') 并触发 Toast [F-004 AC-007]
- **deliverables**:
  - [ ] 更新 `apps/editor/src/pages/PreviewPage.vue` — P-005 完整实现
  - [ ] `apps/editor/src/components/mobile/MobileBottomBar.vue` — 底部固定栏（高 56px，z-index `--z-mobile-bar`）
  - [ ] `apps/editor/src/components/mobile/DocumentListSheet.vue` — P-002 移动端底部抽屉实现
- **relates_to**: [F-001, F-004, M-001, P-005]
- **context_load**:
  - ui-spec-wechat-flow-p001-p005#§3.P-005
  - prd-wechat-flow-f001-f014#§2.F-001

---

### T-073: /themes 模板市场增强（筛选 + seed 扩展，不新增路由）

- **目标**: 在既有 P-003 `/themes` 页面基础上增强筛选与卡片信息密度，扩展模板 seed（按主题命名空间），不新增 `/templates` 路由、不引入本地模板 CRUD 双轨模型
- **模块**: M-001 / M-005
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-041, T-092]
- **acceptance_criteria**:
  - [ ] AC-001: `/themes` 页面展示 3 列网格，按 (themeId, templateId) 组合渲染卡片，支持按主题与场景关键词筛选（不新增独立页面）
  - [ ] AC-002: 在 T-092 每主题 ≥1 的基础上扩展为「每主题目标 ≥2（P1 增强）」，seed 仍存放于 `packages/themes/{themeId}/templates/*.md`
  - [ ] AC-003: 点击模板卡片 → 创建新文档并应用该模板内容（调用 `describeTemplate(themeId, templateId)`）
  - [ ] AC-004: 路由保持 `{ path: '/themes', component: ThemesPage }`，不得引入 `/templates` 路由
  - [ ] AC-005: 模板来源仅为 M-005 注册中心（`listThemeTemplates` / `describeTemplate`），不新增本地模板 CRUD
- **deliverables**:
  - [ ] 更新 `apps/editor/src/pages/ThemesPage.vue` — 增强筛选/排序/空态
  - [ ] 更新 `apps/editor/src/components/themes/TemplateThemeCard.vue` — 卡片信息增强与交互完善
  - [ ] `packages/themes/default/templates/*.md`（≥ 2 个）
  - [ ] `packages/themes/magazine/templates/*.md`（≥ 2 个）
  - [ ] `packages/themes/literary/templates/*.md`（≥ 2 个）
  - [ ] `packages/themes/business/templates/*.md`（≥ 2 个）
  - [ ] `packages/themes/tech/templates/*.md`（≥ 2 个）
- **relates_to**: [F-008, M-001, M-005]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-008
  - arch-wechat-flow-modules#§2.M-005
  - ui-spec-wechat-flow-p001-p005#§3.P-003

---

### T-074: packages/blocks Block 补全 Phase 2（P1 必含 5 种）

- **目标**: 在 T-024 P0 必含 25 种 Block 基础上新增 5 种 P1 必含 Block：author-card / publication-skeleton / kpi-card / qa / footnote；累计 ≥ 30 种，含 variant 注册
- **模块**: M-005
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-024]
- **acceptance_criteria**:
  - [ ] AC-001: listBlocks() 长度 ≥ 30，新增 5 个 ID（author-card/publication-skeleton/kpi-card/qa/footnote）
  - [ ] AC-002: 每新增 Block 注册 ≥ 2 variant，attrsSchema 通过 Zod parse 无异常
  - [ ] AC-003: 5 套主题 default/magazine/literary/business/tech 对新增 Block 提供基础 CSS
- **deliverables**:
  - [ ] `packages/blocks/src/blocks/author-card.ts`
  - [ ] `packages/blocks/src/blocks/publication-skeleton.ts`
  - [ ] `packages/blocks/src/blocks/kpi-card.ts`
  - [ ] `packages/blocks/src/blocks/qa.ts`
  - [ ] `packages/blocks/src/blocks/footnote.ts`
  - [ ] `tests/blocks/p1-essentials.test.ts`
- **relates_to**: [F-003, M-005]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-005

---

### T-077: M-010 wechat-asset uploader.ts + BullMQ kind `wechat-asset-upload`

- **目标**: 实现 M-010 微信公众号素材库上传 proxy：调用微信开放平台 `/cgi-bin/material/add_material` API（持有 AppID/AppSecret），通过 BullMQ kind `wechat-asset-upload` 入队
- **模块**: M-010
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_acceptance**: all
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-033, T-042]
- **acceptance_criteria**:
  - [ ] AC-001: POST /api/v1/wechat-assets/upload 入参含 imageUrl + type ('image'|'voice'|'video'|'thumb')，返回 `{ jobId: uuid }` [ARCH#§3.API-018]
  - [ ] AC-002: BullMQ kind 'wechat-asset-upload' 在 worker 中调用 `wechat-asset/uploader.ts`，使用服务端持有的 AppID/AppSecret（不进浏览器）
  - [ ] AC-003: 上传成功后 Job.result 含 `{ mediaId, url, type }`；失败时 error.code 反映微信开放平台 errcode
  - [ ] AC-004: 单元测试 mock 微信开放平台返回 `{ media_id: "xxx" }`，断言路径完整
- **deliverables**:
  - [ ] `apps/relay/src/wechat-asset/uploader.ts`
  - [ ] `apps/relay/src/wechat-asset/credential-loader.ts` — 从 credentials store 取 AppID/AppSecret
  - [ ] `apps/relay/src/routes/wechat-assets.ts` — POST /api/v1/wechat-assets/upload
  - [ ] `apps/job-worker/src/handlers/wechat-asset-upload.ts`
  - [ ] `tests/relay/wechat-asset-uploader.test.ts`
- **relates_to**: [F-005, M-010]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-005
  - arch-wechat-flow-modules#§2.M-010
  - arch-wechat-flow-api#§3.API-018

---

### T-078: M-008 composeUploadWechatAsset use case

- **目标**: 实现 M-008 应用层 use case：编辑器/CLI/MCP server 共享的素材库上传调用入口；提交到 T-077 relay endpoint 并返回 JobHandle
- **模块**: M-008
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-031, T-077]
- **acceptance_criteria**:
  - [ ] AC-001: composeUploadWechatAsset({ imageUrl, type }) 调用 POST /api/v1/wechat-assets/upload，返回 `JobHandle { jobId }`
  - [ ] AC-002: 入参 imageUrl 校验为 https URL，type 在 4 个枚举值之内，否则抛 ValidationError
  - [ ] AC-003: 提供 SSE 监听帮手 `subscribeJob(jobId, onProgress, onComplete, onError)`
- **deliverables**:
  - [ ] `packages/core/src/composers/upload-wechat-asset.ts`
  - [ ] `tests/app-layer/compose-upload-wechat-asset.test.ts`
- **relates_to**: [F-005, M-008]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-005
  - arch-wechat-flow-modules#§2.M-008

---

### T-079: M-009 upload_to_wechat_asset Tool（thin wrapper → T-078）

- **目标**: MCP Tool 层 thin wrapper，调用 T-078 composer，禁止持有业务逻辑
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-077, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: MCP Tool `upload_to_wechat_asset({ imageUrl, type })` 立即返回 `{ jobId: uuid }` [F-013 AC-002 + F-005 AC-003]
  - [ ] AC-002: Tool 实现仅调用 composeUploadWechatAsset，不含业务逻辑（grep 该文件无 fetch / DB / 加密相关代码）
  - [ ] AC-003: jobId 格式为 z.string().uuid()
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/upload-to-wechat-asset.ts` — thin wrapper
  - [ ] `tests/mcp-server/tools/upload-to-wechat-asset.test.ts`
- **relates_to**: [F-005, F-013, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-009
  - arch-wechat-flow-api#§3.1.API-016

---

### T-080: M-009 list_tokens / describe_token Tool（thin wrapper → M-005）

- **目标**: MCP Tool 暴露 token 注册表（list_tokens / describe_token）；thin wrapper 调用 M-005
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-020, T-036, T-123]
- **acceptance_criteria**:
  - [x] AC-001: list_tokens() 返回数组长度 ≥ 60（F-003 AC-004），每项含 id/category（color/spacing/font/decoration/alignment 之一）
  - [x] AC-002: describe_token('color.brand') 返回 `{ id, category, value, themeOverrides? }`
  - [x] AC-003: Tool 实现仅调用 M-005 注册中心 API，不含业务逻辑
- **deliverables**:
  - [x] `apps/mcp-server/src/tools/list-tokens.ts`
  - [x] `apps/mcp-server/src/tools/describe-token.ts`
  - [x] `tests/mcp-server/tools/list-tokens.test.ts`
- **relates_to**: [F-013, M-009, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - arch-wechat-flow-modules#§2.M-009

---

### T-081: M-009 list_block_variants / describe_variant Tool（thin wrapper → M-005）

- **目标**: MCP Tool 暴露 variant 注册表查询；thin wrapper 调用 M-005
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-024, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: list_block_variants('callout') 返回数组长度 ≥ 3，每项含 id/blockId/render? 元数据
  - [ ] AC-002: describe_variant('callout', 'feature') 返回对象含 attrsSchema + token/asset 依赖列表
  - [ ] AC-003: Tool 实现仅调用 M-005 注册中心 API，不含业务逻辑
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/list-block-variants.ts`
  - [ ] `apps/mcp-server/src/tools/describe-variant.ts`
  - [ ] `tests/mcp-server/tools/list-block-variants.test.ts`
- **relates_to**: [F-013, M-009, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005

---

### T-082: M-009 derive_palette Tool（thin wrapper → M-006）

- **目标**: MCP Tool 暴露调色板派生；thin wrapper 调用 M-006
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-023, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: derive_palette({ primary: '#a8322a' }) 返回 token 字典对象，含 background / accent / status / decoration 至少 4 类 token
  - [ ] AC-002: 派生后 token 通过 M-006 WCAG 对比度校验
  - [ ] AC-003: Tool 实现仅调用 M-006 derivePalette，不含业务逻辑
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/derive-palette.ts`
  - [ ] `tests/mcp-server/tools/derive-palette.test.ts`
- **relates_to**: [F-013, M-009, M-006]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-006

---

### T-083: M-009 simulate_paste Tool（thin wrapper → M-004）

- **目标**: MCP Tool 暴露粘贴过滤模拟；thin wrapper 调用 M-004
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-017, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: simulate_paste({ html }) 返回 `{ filteredHtml, diffNodes, droppedAttrs }`
  - [ ] AC-002: 包含 `<style>` 标签的输入经 simulate_paste 后 droppedAttrs 含 'style-tag'
  - [ ] AC-003: Tool 实现仅调用 M-004 simulatePaste，不含业务逻辑
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/simulate-paste.ts`
  - [ ] `tests/mcp-server/tools/simulate-paste.test.ts`
- **relates_to**: [F-013, M-009, M-004]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-004

---

### T-084: M-009 export_clipboard_payload Tool（thin wrapper → M-008 composeCopy）

- **目标**: MCP Tool 暴露 clipboard payload 构造；thin wrapper 调用 M-008 composeCopy 内部函数
- **模块**: M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: small
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-030, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: export_clipboard_payload({ markdown, themeId }) 返回 `{ html, text }`，html 为已 inline-styled 且经 simulatePaste 处理的 HTML（与 composeCopy pipeline 一致）
  - [ ] AC-002: 返回的 html 不含 `<style>` 标签
  - [ ] AC-003: Tool 实现仅调用 M-008 composeRender + simulatePaste，不直接复制 composeCopy 业务逻辑
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/export-clipboard-payload.ts`
  - [ ] `tests/mcp-server/tools/export-clipboard-payload.test.ts`
- **relates_to**: [F-013, M-009, M-008]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-008

---

### T-075: packages/blocks Block 补全 Phase 3（P1 增量 10 种）

- **目标**: 在 T-074 (≥ 30 种) 基础上新增 10 种 P1 增量 Block：tip-grid / warning / disclaimer / reading-time / citation / definition-list / advert-card / related-cards / social-cta / subscribe-cta；累计 ≥ 40 种
- **模块**: M-005
- **task_kind**: feature
- **priority**: P1
- **complexity**: medium
- **sprint**: 5
- **tdd_mode**: light
- **tdd_acceptance**: all
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-074]
- **acceptance_criteria**:
  - [ ] AC-001: listBlocks() 长度 ≥ 40（F-003 AC-006 P0 25 + P1 必含 5 + P1 增量 10）
  - [ ] AC-002: 10 个新增 Block 各注册 ≥ 1 variant，attrsSchema 通过 Zod parse
  - [ ] AC-003: 5 套主题对新增 Block 提供基础 CSS
  - [ ] AC-004: `registry.listAllVariants().length >= 120`；按 8 类核心 Block 分配最低 variant 配额：callout/quote/steps ≥ 10，pull-quote/table-grid/divider/card/highlight/compare ≥ 5，其余 Block ≥ 2
- **deliverables**:
  - [ ] `packages/blocks/src/blocks/tip-grid.ts`
  - [ ] `packages/blocks/src/blocks/warning.ts`
  - [ ] `packages/blocks/src/blocks/disclaimer.ts`
  - [ ] `packages/blocks/src/blocks/reading-time.ts`
  - [ ] `packages/blocks/src/blocks/citation.ts`
  - [ ] `packages/blocks/src/blocks/definition-list.ts`
  - [ ] `packages/blocks/src/blocks/advert-card.ts`
  - [ ] `packages/blocks/src/blocks/related-cards.ts`
  - [ ] `packages/blocks/src/blocks/social-cta.ts`
  - [ ] `packages/blocks/src/blocks/subscribe-cta.ts`
  - [ ] `tests/blocks/p1-incremental.test.ts`
- **relates_to**: [F-003, M-005]
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-005

---

### T-112: [VALIDATION] Sprint 5 验证：CLI validate + apply_zh_typo + 插件沙箱

- **目标**: 用户/开发者手动验证 CLI 工具链、中文排版修订 UI 流程、插件沙箱基本功能
- **task_kind**: validation
- **tdd_acceptance**: skip
- **tdd_mode**: skip
- **tdd_skip_reason**: "由 orchestrator 触发用户手动验证，不进 TDD 流程"
- **priority**: P1
- **sprint**: 5
- **user_facing_critical_path**: true
- **dependencies**: [T-044, T-046, T-116, T-117, T-051, T-073, T-074, T-075, T-077, T-079, T-080, T-081, T-082, T-083, T-084]
- **acceptance_criteria**:
  - [ ] 运行 `wechat-flow init my-test-pack --template plugin`，生成骨架目录；进入目录运行 `wechat-flow validate .`，输出退出码 0 + 通过信息
  - [ ] 在编辑器中写入含中英文混排的 Markdown（如「这是GitHub的项目，包含react组件」），点击「...」→「中文排版修订」，diff 预览 Modal 弹出并展示变更（中英间加空格），点击「确认修订」，编辑器内容更新，按 Ctrl+Z 可撤销
  - [ ] 通过 MCP HTTP transport（`POST /mcp/tools/apply_zh_typo`），发送含中英混排的 Markdown，返回 `{ fixed: '...', totalChanges: N }` 响应
  - [ ] 点击模板卡片应用模板成功（T-073 模板市场验证）
  - [ ] 素材库上传 smoke test：mock 微信 API 返回 mediaId，接口返回 `{ jobId: uuid }`（T-077 验证）
  - [ ] Tool 全集 grep 验证：24 个 Tool 文件在 `apps/mcp-server/src/tools/` 下存在，包含 `describe_template`、`register_variant`
- **relates_to**: [F-010, F-014, M-007, M-009, M-011]

---

### T-123: M-005 TokenDefinition 重塑 + 设计系统 token 目录 seed（≥60 token，五类覆盖）

- **目标**: 将 `packages/core/src/registry/token.ts` 的 `TokenDefinition` 重塑为 `{ id, category, value, themeOverrides? }` shape；从 ui-spec §1 设计系统 token 表 seed ≥60 个 token（覆盖 color/font/spacing/decoration/alignment 五类）；从 `packages/core/src/index.ts` 导出 `registerToken`/`listTokens`/`describeToken`；更新 `packages/contracts` 中相关 schema；使 T-080（list_tokens / describe_token MCP Tool）的底层数据层就绪
- **模块**: M-005
- **task_kind**: feature
- **priority**: P1
- **complexity**: M
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: false
- **dependencies**: [T-020]
- **relates_to**: [F-003, M-005, M-009, T-080]
- **acceptance_criteria**:
  - [ ] AC-001: Given `TokenDefinition` 类型已更新，When 编译 `packages/core`，Then TypeScript 编译通过且 `TokenDefinition` 接口含必填字段 `id: string`、`category: 'color' | 'spacing' | 'font' | 'decoration' | 'alignment'`、`value: string` 以及可选字段 `themeOverrides?: Record<string, string>` [ARCH#§2.M-005]
  - [ ] AC-002: Given token seed 模块在 `packages/core/src/registry/token-seed.ts` 中已注册全部内置 token，When 调用 `listTokens()`，Then 返回数组长度 ≥ 60，且包含 color/spacing/font/decoration/alignment 五类，每类 ≥ 2 项 [ARCH#§2.M-005, prd#§2.F-003.AC-004]
  - [ ] AC-003: Given token seed 已加载，When 调用 `describeToken('color.brand')`，Then 返回对象字面匹配 `{ id: 'color.brand', category: 'color', value: '#2D5A4E', themeOverrides?: ... }` [ARCH#§2.M-005]
  - [ ] AC-004: Given token seed 已加载，When 遍历 `listTokens()` 按 category 分组，Then color ≥ 20 项（ui-spec §1.1 全覆盖）、font ≥ 14 项（ui-spec §1.2 全覆盖）、spacing ≥ 8 项（ui-spec §1.3.1 全覆盖）、decoration ≥ 12 项（ui-spec §1.3.2 radius + §1.4 shadow/z-index 全覆盖） [prd#§2.F-003.AC-004]
  - [ ] AC-005: [ASSUMPTION] alignment 类别映射至 ui-spec §1.6 断点 token（`--bp-tablet`/`--bp-desktop`）及任何声明了布局对齐语义的 token；若 architect 后续明确扩展 alignment 定义，seed 可增量追加而无需破坏现有注册表结构
  - [ ] AC-006: Given `packages/core/src/index.ts` 已更新导出，When 从 `@wechat-flow/core` 导入 `{ registerToken, listTokens, describeToken }`，Then 三个函数在运行时均可正常调用（不抛 "not a function" 错误）；生产接线路径：`packages/core/src/index.ts` 中 `export { registerToken, listTokens, describeToken } from "./registry/token.ts"`
  - [ ] AC-007: Given `packages/contracts/src/mcp/tool-contracts.ts` 已更新，When `listTokensResponseSchema` 验证 `{ tokens: [{ id: 'color.brand', category: 'color', value: '#2D5A4E' }] }`，Then zod 解析结果 `.success === true`（schema 已不再是空 passthrough）
  - [ ] AC-008: Given 现有 token registry 测试套件（`tests/core/` 下相关文件）执行，When 运行 `pnpm vitest run`，Then 全部通过（无回归）；既有使用 `name` 字段的测试须迁移为 `id` 字段或保持兼容，不允许遗留破坏性不兼容
- **deliverables**:
  - [ ] `packages/core/src/registry/token.ts` — 重塑后的 `TokenDefinition` 接口 + 注册表函数
  - [ ] `packages/core/src/registry/token-seed.ts` — ≥60 个内置设计系统 token 的 seed 注册调用（从 ui-spec §1 枚举，含 CSS 变量名作为 `id`）
  - [ ] `packages/core/src/index.ts` — 新增 `registerToken`/`listTokens`/`describeToken` 导出
  - [ ] `packages/contracts/src/mcp/tool-contracts.ts` — 更新 `listTokensResponseSchema`/`describeTokenResponseSchema` 为带结构 zod schema
  - [ ] `tests/core/registry/token.test.ts` — 覆盖 AC-001..AC-005 的单元测试（含分类计数断言）
- **context_load**:
  - prd-wechat-flow-f001-f014#§2.F-003
  - arch-wechat-flow-modules#§2.M-005
  - ui-spec-wechat-flow#§1

---

### T-124: plugin-api Worker 真实 bootstrap（网络隔离 + Comlink RPC 接线）

- **目标**: 收尾 T-047 R-001/R-002/R-003/R-004。将 `worker/runtime.ts` 从骨架升级为完整 Worker 入口：启动时执行 `delete globalThis.fetch/XMLHttpRequest/WebSocket/EventSource` + `assertNetIsolation()` 断言；接入 Comlink RPC 桥；`surface/plugin-api.ts` 四个占位方法替换为真实委托实现；`acl/audit-log.ts` 的 `getEntries()` 返回数组拷贝（非引用）；消除 `ViolationResult`↔`FallbackPayload` 类型重复定义
- **模块**: M-007
- **task_kind**: feature
- **priority**: P2
- **complexity**: M
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-047]
- **acceptance_criteria**:
  - [ ] AC-001: Given `worker/runtime.ts` 已实现 `assertNetIsolation()`，When 在测试中 stub `globalThis.fetch` 为 `() => {}` 后调用 `assertNetIsolation()`，Then 抛出错误码 `E_WORKER_NETWORK_LEAK` [ARCH#§2.M-007]
  - [ ] AC-002: Given `worker/runtime.ts` 启动序列，When 调用 Worker 入口初始化函数，Then 执行顺序为 `delete globalThis.fetch` → `delete globalThis.XMLHttpRequest` → `delete globalThis.WebSocket` → `delete globalThis.EventSource` → `assertNetIsolation()` 断言；可通过 spy/mock 顺序验证 [ARCH#§2.M-007]
  - [ ] AC-003: Given `surface/plugin-api.ts` 的 `requestResource(url, init?)` 已接入 `acl/network-gate.ts`，When 调用 `requestResource('https://allowed.example.com/data')`（URL 在 manifest permissions.network 白名单），Then `network-gate.check()` 返回 allow 且 `audit-log` 记录一条 `{ action: 'allow', url, pluginId }` 条目 [ARCH#§2.M-007]
  - [ ] AC-004: Given `requestResource` 请求 URL 不在 manifest permissions.network 白名单，When 调用 `requestResource('https://blocked.example.com')`，Then 抛出错误码 `E_PERMISSION_DENIED` 且 `audit-log` 记录 `{ action: 'deny', url, pluginId }` 条目 [ARCH#§2.M-007]
  - [ ] AC-005: Given `acl/audit-log.ts` 已写入若干条目，When 调用 `auditLog.getEntries()`，Then 返回值是新数组（修改返回数组不影响内部 log 条目数）
  - [ ] AC-006: Given 类型层面，When 编译 `packages/plugin-api`，Then `ViolationResult` 与 `FallbackPayload` 只在一处定义，另一处通过 import 引用，TypeScript 编译通过无 TS2305/TS2307 [ARCH#§2.M-007]
  - [ ] AC-007 [ENV-LIMITATION → conditional_release]: Given 真实浏览器 Worker 环境，When 加载包含 `import` 的 plugin pack 并启动 Worker，Then `globalThis.fetch` 在 Worker 内为 `undefined`；happy-dom/jsdom 无法真实模拟 Worker `delete global`，端到端验证需 Playwright E2E 环境（T-058）
- **blocking_conditions**:
  - condition: "真实浏览器 Worker 内 delete globalThis.fetch 生效验证"
    owner: qa-engineer
    when: "T-058 Playwright E2E harness 就绪后"
- **deliverables**:
  - [ ] `packages/plugin-api/src/worker/runtime.ts` — 完整 Worker 入口（delete 全局 + assertNetIsolation + Comlink RPC 桥）
  - [ ] `packages/plugin-api/src/surface/plugin-api.ts` — defineRule/defineTheme/registerAsset/requestResource 真实实现（requestResource 委托 network-gate）
  - [ ] `packages/plugin-api/src/acl/audit-log.ts` — `getEntries()` 返回数组拷贝
  - [ ] `packages/plugin-api/src/runtime/violation-detector.ts` 或 `packages/plugin-api/src/fallback/placeholder.ts` — 消除 `ViolationResult`/`FallbackPayload` 重复类型定义（统一 import）
  - [ ] `tests/plugin-api/worker-bootstrap.test.ts` — 覆盖 AC-001..AC-006
- **relates_to**: [F-010, M-007]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-007
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-125: relay admin 路由挂载 + mcp-server HTTP 进程启动（生产接线）

- **目标**: 收尾 T-051 deferred wiring。① `apps/relay/src/index.ts` `createApp()` 将 `createAdminApiKeysApp()` 挂载至 `/api/v1/admin/api-keys`（去 501 占位），并传入 admin deps（adminStore 内存 Map + admin-guard）；② `apps/relay/src/main.ts` 在 `serve()` 调用处正确传入 admin deps；③ `apps/mcp-server/src/index.ts` 新增 HTTP/SSE 进程启动入口（`@hono/node-server` serve），`transport/http-sse.ts` 接入 token-resolver 替换 passthrough 占位（内存 token Map + R-003 安全校验）；④ 验证 admin-guard 三层防御（Bearer + X-Admin-Request + IP 白名单）不回归
- **模块**: M-010, M-009
- **task_kind**: feature
- **priority**: P1
- **complexity**: M
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-051]
- **acceptance_criteria**:
  - [ ] AC-001: Given `apps/relay/src/index.ts` `createApp()` 已挂载 admin 路由，When 向 `POST /api/v1/admin/api-keys` 发送合法 admin Bearer + `X-Admin-Request: 1` 请求体（`{ name: 'test', scope: 'user' }`），Then 响应状态 201，body 含 `keyId: string(uuid)` 与 `key: string`，且明文 key 不出现在后续 `GET /api/v1/admin/api-keys` 的列表响应中 [ARCH#§3.API-028]
  - [ ] AC-002: Given admin 路由已挂载，When 发送无 `X-Admin-Request` header 的 admin 请求，Then 响应状态 403，body `code: 'E_PERMISSION_DENIED'` [ARCH#§3.API-028]
  - [ ] AC-003: Given admin 路由已挂载，When 发送非 admin scope Bearer token 的请求，Then 响应状态 401，body `code: 'E_AUTH'` [ARCH#§3.API-028]
  - [ ] AC-004: Given admin 路由已挂载，When 发送来自非白名单 IP 的 admin 请求（通过测试注入非 loopback IP），Then 响应状态 403，body `code: 'E_PERMISSION_DENIED'` [ARCH#§2.M-010]
  - [ ] AC-005: Given `GET /api/v1/admin/api-keys` 已挂载，When 以合法 admin 凭据列出 API key，Then 响应状态 200，body 结构含 `keys: Array<{ keyId, name, scope, status, quotaConfig, createdAt, lastUsedAt, expiresAt, revokedAt }>` 且不含 `key` 明文字段 [ARCH#§3.API-029]
  - [ ] AC-006: Given `PATCH /api/v1/admin/api-keys/:keyId/rotate` 已挂载，When 轮换存在的 keyId，Then 响应状态 200，body 含 `newKey: string` 与 `graceUntil: string(datetime)` [ARCH#§3.API-030]
  - [ ] AC-007: Given `DELETE /api/v1/admin/api-keys/:keyId` 已挂载，When 删除存在的 keyId，Then 响应状态 204；再次 DELETE 同一 keyId，Then 响应状态 409，body `code: 'E_CONFLICT'` [ARCH#§3.API-031]
  - [ ] AC-008: Given `apps/mcp-server/src/index.ts` 已添加 HTTP 进程启动入口，When HTTP transport token-resolver 接收非 passthrough 请求（Bearer token 对应内存 Map 中 scope=user 的 key），Then 请求放行到 Tool 路由；Bearer token 对应 scope=admin 时返回 403 `E_PERMISSION_DENIED` [ARCH#§2.M-009]
  - [ ] AC-009: Given 生产挂载路径，When 在 `apps/relay/src/index.ts` 中 `createApp()` 调用 `createAdminApiKeysApp(adminStore, adminGuard)` 并 `.route('/api/v1/admin/api-keys', adminApp)` 挂载，Then `/api/v1/admin/api-keys` 端点不再返回 501；接线字面调用点：`apps/relay/src/index.ts` 中 `app.route(...)` 语句 [ARCH#§2.M-010]
  - [ ] AC-010 [ENV-LIMITATION → conditional_release]: Given mcp-server HTTP 进程实际监听端口，When 向 `POST /mcp/tools/render_markdown` 发送真实 HTTP 请求，Then 响应时延 < 2s；需要真实进程起停环境（CI 集成测试或 Docker Compose 本地全栈）
- **blocking_conditions**:
  - condition: "mcp-server HTTP transport 真实进程端到端响应延迟验证"
    owner: qa-engineer
    when: "部署阶段 Docker Compose 全栈环境就绪后"
- **deliverables**:
  - [ ] `apps/relay/src/index.ts` — `createApp()` 内挂载 admin 路由（去 501），传入 `adminStore` + `adminGuard`
  - [ ] `apps/relay/src/main.ts` — `serve()` 调用传入正确 admin deps
  - [ ] `apps/mcp-server/src/index.ts` — 新增 HTTP 进程启动入口（`@hono/node-server` serve + `createHttpTransportApp()`）
  - [ ] `apps/mcp-server/src/transport/http-sse.ts` — token-resolver 替换 passthrough（内存 Map 校验 + scope 分流）
  - [ ] `tests/relay/admin-route-wiring.test.ts` — 覆盖 AC-001..AC-009（含 admin-guard 三层防御回归）
  - [ ] `tests/mcp-server/http-transport-token.test.ts` — 覆盖 AC-008
- **relates_to**: [F-013, M-010, M-009]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010
  - arch-wechat-flow-modules#§2.M-009
  - arch-wechat-flow-api#§3.API-028
  - arch-wechat-flow-api#§3.API-029
  - arch-wechat-flow-api#§3.API-030
  - arch-wechat-flow-api#§3.API-031

---

### T-126: 微信素材库上传完整实现（access_token 缓存 + multipart + 安全修复）

- **目标**: 收尾 T-077 R-001/R-002/R-003/R-004。① `wechat-asset/uploader.ts` 实现真实 imageUrl 下载 + multipart 上传 + 响应 `body.url` 赋值（修 R-001 access_token 泄漏）；② `job-worker/handlers/wechat-asset-upload.ts` 实现 `/cgi-bin/token` access_token 获取逻辑（带内存缓存，TTL < 7200s）；③ `routes/wechat-assets.ts` apiKeyId 从 auth context 注入（修 R-003 空串）；④ imageUrl https/SSRF 校验（修 R-004）；⑤ `createWechatAssetsApp()` 挂入 relay `createApp()`；⑥ `apps/job-worker/src/index.ts` 注册 `wechat-asset-upload` handler；全程使用 mock 微信 API 单测
- **模块**: M-010
- **task_kind**: feature
- **priority**: P2
- **complexity**: L
- **sprint**: 5
- **tdd_mode**: standard
- **tdd_refactor**: auto
- **security_sensitive**: true
- **dependencies**: [T-077, T-125]
- **acceptance_criteria**:
  - [ ] AC-001: Given `POST /api/v1/wechat-assets/upload` 已挂入 relay `createApp()`，When 以合法 user Bearer token 调用并携带 `{ imageUrl: 'https://cdn.example.com/img.png', type: 'image' }`，Then 响应状态 202，body 含 `jobId: string(uuid)` 与 `statusUrl: string(url)` [ARCH#§3.API-018]
  - [ ] AC-002: Given API-018 安全路径，When 调用端无 Authorization header，Then 响应状态 401，body `code: 'E_AUTH'`；When 传入非 user scope token，Then 响应状态 403，body `code: 'E_PERMISSION_DENIED'` [ARCH#§3.API-018]
  - [ ] AC-003: Given `routes/wechat-assets.ts` 已从 auth context 读取 `apiKeyId`，When `enqueue("wechat-asset-upload", input, apiKeyId)` 被调用，Then `apiKeyId` 等于 auth context 中解析出的非空 UUID 字符串（不为空串 `""`）[R-003 修复]
  - [ ] AC-004: Given imageUrl SSRF 校验已实现，When `imageUrl` 为 `http://` 协议（非 https）或解析为私有 IP 段（10.x.x.x / 172.16-31.x.x / 192.168.x.x）的 URL，When 触发上传，Then 响应状态 400，body `code: 'E_SCHEMA'` 或 `'E_SSRF_BLOCKED'` [R-004 修复，ARCH#§2.M-010]
  - [ ] AC-005: Given `job-worker/handlers/wechat-asset-upload.ts` 接入 access_token 获取逻辑，When mock `/cgi-bin/token` 返回 `{ access_token: 'mock-token-abc', expires_in: 7200 }`，Then handler 使用 `'mock-token-abc'` 向微信素材 API 发起请求（非空串 `""`）[R-002 修复]
  - [ ] AC-006: Given access_token 内存缓存已实现，When 在 TTL 内第二次调用 handler，Then `/cgi-bin/token` mock 仅被调用一次（缓存命中）
  - [ ] AC-007: Given `wechat-asset/uploader.ts` 已实现真实上传逻辑，When mock 微信素材 API 返回 `{ url: 'https://wechat-cdn.example.com/media/abc123' }`，Then `uploader` 将 `Job.result.url` 设为 `'https://wechat-cdn.example.com/media/abc123'`（不含 access_token 参数）[R-001 修复，ARCH#§2.M-010]
  - [ ] AC-008: Given `wechat-asset/uploader.ts` 需先下载 imageUrl 再上传，When mock imageUrl 端点返回 PNG 字节流，Then uploader 构造 multipart/form-data 请求发往微信 API（Content-Type 含 `multipart/form-data; boundary=...`）
  - [ ] AC-009: Given `apps/job-worker/src/index.ts` 已注册 `wechat-asset-upload` handler，When job-worker 进程启动并注册 workers，Then `workerRegistry` 中包含键 `'wechat-asset-upload'`；接线字面调用点：`apps/job-worker/src/index.ts` 中 `registerWorker('wechat-asset-upload', ...)` 或等效注册语句
  - [ ] AC-010 [ENV-LIMITATION → conditional_release]: Given 真实微信开放平台 AppID/AppSecret，When 上传真实图片 URL，Then 微信素材库返回真实 `mediaId`，job 状态流转到 `succeeded`；需 `WECHAT_APP_ID`/`WECHAT_APP_SECRET` 凭据与微信 API 网络访问权限
- **blocking_conditions**:
  - condition: "微信开放平台真实 API 端到端上传验证（access_token 实际获取 + multipart 素材上传 + mediaId 回填）"
    owner: qa-engineer
    when: "部署阶段具备真实微信 AppID/AppSecret 凭据后"
- **deliverables**:
  - [ ] `apps/relay/src/wechat-asset/uploader.ts` — imageUrl 下载 + multipart 上传 + `body.url` 提取（R-001 修复）
  - [ ] `apps/job-worker/src/handlers/wechat-asset-upload.ts` — `/cgi-bin/token` 获取 + 内存缓存（TTL < 7200s）+ 调用 uploader（R-002 修复）
  - [ ] `apps/relay/src/routes/wechat-assets.ts` — apiKeyId 从 auth context 注入（R-003 修复）+ imageUrl https/SSRF 校验（R-004 修复）
  - [ ] `apps/relay/src/index.ts` — `createWechatAssetsApp()` 挂入 `createApp()`（无独立修改文件，与 T-125 交接点：T-125 完成 admin 挂载后本卡追加 wechat 路由挂载）
  - [ ] `apps/job-worker/src/index.ts` — 注册 `wechat-asset-upload` handler
  - [ ] `tests/relay/wechat-asset-uploader.test.ts` — 覆盖 AC-005..AC-008（mock 微信 API + imageUrl 下载）
  - [ ] `tests/relay/wechat-assets-route.test.ts` — 覆盖 AC-001..AC-004（含 SSRF 校验、apiKeyId 注入）
  - [ ] `tests/job-worker/wechat-asset-upload-handler.test.ts` — 覆盖 AC-006（缓存命中）+ AC-009（handler 注册）
- **relates_to**: [F-005, M-010]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-010
  - arch-wechat-flow-api#§3.API-018

---

### T-127: CLI dev 命令真实 Vite 进程接线

- **目标**: 收尾 T-117 deferred wiring。`commands/dev.ts` 接入真实 Vite `createServer()` / middleware 模式，`serverFactory` 默认实现创建 Vite dev server 并启动 HMR；`apps/cli/package.json` 补 `vite` devDependency；`index.ts` dev 命令传递完整参数（packDir + serverFactory）
- **模块**: M-011
- **task_kind**: feature
- **priority**: P2
- **complexity**: S
- **sprint**: 5
- **tdd_mode**: light
- **tdd_refactor**: skip
- **security_sensitive**: false
- **dependencies**: [T-117]
- **acceptance_criteria**:
  - [ ] AC-001: Given `commands/dev.ts` 已实现可注入 `serverFactory`，When 以 mock serverFactory（返回 `{ ws: { send: vi.fn() } }`）调用 `runDev({ packDir: '/tmp/test-pack', serverFactory: mockFactory })`，Then mock serverFactory 被调用一次，调用参数含 `{ root: '/tmp/test-pack' }` [ARCH#§2.M-011]
  - [ ] AC-002: Given HMR 消息契约，When pack 文件变更触发 watcher 回调（mock）后调用 `formatHmrMessage({ type: 'full-reload', packDir })`，Then 返回对象含 `type: 'full-reload'` 字段，字符串序列化后可被 `JSON.parse` 还原
  - [ ] AC-003: Given `apps/cli/package.json` 已补 `vite` 依赖，When 运行 `pnpm typecheck`（或 `tsc --noEmit`）在 `apps/cli` 包下，Then 编译通过（`import { createServer } from 'vite'` 无 TS2307 模块未找到错误）[ARCH#§2.M-011]
  - [ ] AC-004 [ENV-LIMITATION → conditional_release]: Given 真实 Vite dev server 已启动，When 修改 packDir 下的主题文件，Then 浏览器收到 HMR `full-reload` 事件；需要真实 Node.js 进程 + 浏览器环境，CI 单测无法覆盖
- **blocking_conditions**:
  - condition: "真实 Vite dev server 启动 + 浏览器 HMR 接收验证"
    owner: developer
    when: "本地全栈开发环境手动验证（见 memory/local-fullstack-validation-setup.md）"
- **deliverables**:
  - [ ] `apps/cli/src/commands/dev.ts` — `serverFactory` 默认实现（`createServer` from vite）+ watcher 接线
  - [ ] `apps/cli/src/index.ts` — dev 命令调用 `runDev({ packDir })`；`serverFactory` 由 `dev.ts` 的 `defaultServerFactory`（真实 Vite `createServer`）默认承担，不在 index.ts 显式注入
  - [ ] `apps/cli/package.json` — 补 `vite` devDependency
  - [ ] `tests/cli/dev.test.ts` — 覆盖 AC-001..AC-002（mock serverFactory + HMR 消息格式）
- **relates_to**: [F-010, F-013, M-011]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-011
