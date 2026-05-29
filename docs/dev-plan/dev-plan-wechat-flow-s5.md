---
id: "dev-plan-wechat-flow-s5"
version: "0.4.1"
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
- Sprint 5 任务卡 → T-043..T-049, T-050a, T-050b, T-051, T-055, T-073, T-074, T-075, T-077..T-084, T-103, T-112
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
  - [ ] AC-001: Given `applyZhTypo({ markdown: '这是GitHub的项目' })`，When 调用，Then 返回 `{ fixed: '这是 GitHub 的项目', perRule: { 'zh-en-space': 2 }, totalChanges: 2 }` [F-014 AC-001 + ARCH#§2.M-008]
  - [ ] AC-002: Given Markdown 含代码块 ```` ```\ncall GitHub()\n``` ````，When `applyZhTypo`，Then 代码块内容不被修改（跳过代码区域）[F-014 AC-002]
  - [ ] AC-003: Given `'这是"引用"内容'`，When `applyZhTypo`，Then 返回 `'这是“引用”内容'`（直引号 → 弯引号）[F-014 AC-001]
  - [ ] AC-004: Given `'结尾...'`，When `applyZhTypo`，Then 返回 `'结尾……'`（3 点省略号 → 6 点中文省略号）[F-014 AC-001]
- **deliverables**:
  - [ ] `packages/zh-typo/src/rules/zh-en-space.ts`
  - [ ] `packages/zh-typo/src/rules/fullwidth-punctuation.ts`
  - [ ] `packages/zh-typo/src/rules/smart-quotes.ts`
  - [ ] `packages/zh-typo/src/rules/ellipsis-dash.ts`
  - [ ] `packages/zh-typo/src/apply.ts` — `applyZhTypo(input) → ZhTypoResult`（mdast 解析 → text 节点变换 → stringify）
  - [ ] `packages/zh-typo/src/index.ts`
  - [ ] `tests/zh-typo/apply.test.ts` — AC-001..AC-004 单元测试
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
  - [ ] AC-001: Given `composeApplyZhTypo({ markdown: '...' })` 调用，When 执行，Then 返回 `{ fixed: '...', perRule: Record<string, number>, totalChanges: number, diff: DiffEntry[] }` [ARCH#§2.M-008]
  - [ ] AC-002: Given `diff` 字段，When 检查，Then 每个 `DiffEntry` 含 `original`（修订前文本片段）、`revised`（修订后文本片段）、`ruleId` 字段，可用于 UI 高亮展示
  - [ ] AC-003: Given `totalChanges === 0`（无需修订的文档），When `composeApplyZhTypo`，Then 返回 `{ fixed: 原始markdown, totalChanges: 0, diff: [] }`（不做不必要处理）
- **deliverables**:
  - [ ] `packages/core/src/composers/apply-zh-typo.ts` — `composeApplyZhTypo(input: { markdown: string }) → ZhTypoComposerResult` [ARCH#§2.M-008]
  - [ ] `tests/app-layer/compose-apply-zh-typo.test.ts` — AC-001..AC-003 单元测试
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
  - [ ] AC-001: Given 调用 `apply_zh_typo({ markdown: '这是GitHub的项目' })`，When 执行，Then 返回 `{ fixed: '这是 GitHub 的项目', perRule: {...}, totalChanges: N }` [F-013 AC-002 + F-014 AC-005]
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/apply-zh-typo.ts` — `apply_zh_typo` Tool 实现
  - [ ] 更新 `apps/mcp-server/src/tools/router.ts` — 注册 `apply_zh_typo`
  - [ ] `tests/mcp-server/tools/apply-zh-typo.test.ts` — AC-001 单元测试
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
  - [ ] AC-001: Given 点击 ContextMenu「中文排版修订」，When 触发，Then diff 预览 Modal（C-012 form-variant）弹出，展示修订前/后对比和逐 rule 计数 [F-014 AC-003 + F-001 AC-008]
  - [ ] AC-002: Given diff 预览 Modal，When 用户点击「确认修订」，Then 编辑器内容替换为 `fixed` 字符串，PreviewPane 刷新，Toast 提示「已修订 N 处」
  - [ ] AC-003: Given 用户确认修订后，When 按 Ctrl+Z 撤销，Then 编辑器内容回到修订前的状态（修订操作纳入 CodeMirror undo 栈）[F-014 AC-004]
  - [ ] AC-004: Given 编辑器内容为空或无排版问题，When 触发「中文排版修订」，Then ContextMenu 该菜单项处于 `item-disabled` 状态（灰色不可点击）[ui-spec-wechat-flow-c001-c014#§2.C-016]
- **deliverables**:
  - [ ] `apps/editor/src/components/zh-typo/ZhTypoPreviewModal.vue` — diff 预览 Modal（包装 C-012）
  - [ ] 更新 `apps/editor/src/components/panel/ContextMenu.vue` — 接线「中文排版修订」菜单项
  - [ ] `apps/editor/src/composables/use-zh-typo.ts` — 触发 → 预览 → 确认 → 写回 composable
- **relates_to**: [F-014, M-001, C-012, C-016]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-001
  - prd-wechat-flow-f001-f014#§2.F-014
  - ui-spec-wechat-flow-c001-c014#§2.C-016

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
  - [ ] AC-001: Given `registerTheme({ id: 'org-theme', extends: 'default', delta: { tokens: { '--color-brand': '#003366' } } })`，When 应用 `org-theme`，Then 产出 HTML 中主题色为 `#003366`（delta 覆盖），其他 token 继承 default 主题 [F-009 AC-001]
  - [ ] AC-002: Given 品牌包锁定了 `--color-brand` 和 `--color-accent`，When 写作者尝试通过 `paint` 覆盖 `--color-brand`，Then 该覆盖被忽略（品牌包优先），diagnostics 含 warn [F-009 AC-002]
- **deliverables**:
  - [ ] `packages/core/src/inheritance/delta-merge.ts` — 主题继承 delta 合并 [ARCH#§2.M-005]
  - [ ] `packages/core/src/brand-pack/lock.ts` — 品牌包锁定逻辑
  - [ ] `tests/core/theme-inheritance.test.ts` — AC-001..AC-002 单元测试
- **relates_to**: [F-009, M-005]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-005
  - prd-wechat-flow-f001-f014#§2.F-009

---

### T-050a: apps/cli 核心命令 init + validate（M-011）

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
  - [ ] AC-001: Given `wechat-flow init my-pack --template plugin`，When 执行，Then 创建 `my-pack/` 目录，含 `manifest.json`、`src/index.ts`、`package.json` 骨架文件（plugin 模板）；`my-pack/` 目录在文件系统中存在可检索 [F-010 AC-003]
  - [ ] AC-002: Given `wechat-flow validate ./my-pack`（合规 pack），When 执行，Then 退出码 0，stdout 含「通过：manifest ✓ schema ✓ 主题守护 ✓」[F-010 AC-005]
  - [ ] AC-003: Given `wechat-flow validate ./broken-pack`（manifest 缺少 `name` 字段），When 执行，Then 退出码非 0，stderr 含 `E_MANIFEST_INVALID: missing required field 'name'`
  - [ ] AC-004（production path）: `apps/cli/src/index.ts` 中可检索到 `.command('init')` 和 `.command('validate')` 的字面注册调用
- **deliverables**:
  - [ ] `apps/cli/src/commands/init.ts` — `--template plugin|theme` 两种骨架
  - [ ] `apps/cli/src/commands/validate.ts` — manifest + schema + 主题守护 + variant 申报一致性
  - [ ] `apps/cli/src/index.ts` — CLI 入口（使用 `commander` 或 `citty`）
  - [ ] `tests/cli/validate.test.ts` — AC-002..AC-003 单元测试
- **relates_to**: [F-010, M-011]
- **context_load**:
  - arch-wechat-flow-modules#§2.M-011
  - prd-wechat-flow-f001-f014#§2.F-010

---

### T-050b: apps/cli 渲染壳命令 dev/publish/render/copy/export（M-011，thin wrapper）

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
- **dependencies**: [T-050a, T-011, T-031, T-030]
- **acceptance_criteria**:
  - [ ] AC-001: Given `wechat-flow dev ./my-pack`，When 执行，Then 启动 Vite dev 进程，stdout 含「Watching for changes...」[ARCH#§2.M-011]
  - [ ] AC-002: Given 修改 pack 文件后，When HMR 触发，Then stdout 输出含 `[wechat-flow:hmr]` 前缀的刷新提示（≤2s 内输出）
  - [ ] AC-003: Given `wechat-flow render --input article.md --theme default`，When 执行，Then stdout 输出 inline-styled HTML（不含 `<style>` 标签）
  - [ ] AC-004: Given `wechat-flow publish ./my-pack`，When pack 文件 SHA256 与上次发布不同，Then stdout 输出 'new pack version detected' 提示；退出码 0
  - [ ] AC-005: Given `wechat-flow export --input article.md --format html`，When 执行，Then 生成 standalone `.html` 文件
- **deliverables**:
  - [ ] `apps/cli/src/commands/dev.ts` — Vite middleware + HMR + pack live-reload [ARCH#§2.M-011]
  - [ ] `apps/cli/src/commands/publish.ts` — pack 打包骨架
  - [ ] `apps/cli/src/commands/render.ts` — Tool 契约壳
  - [ ] `apps/cli/src/commands/copy.ts` — Tool 契约壳
  - [ ] `apps/cli/src/commands/export.ts` — Tool 契约壳
  - [ ] 更新 `apps/cli/src/index.ts` — 注册以上 5 个子命令
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
- **dependencies**: [T-020, T-036]
- **acceptance_criteria**:
  - [ ] AC-001: list_tokens() 返回数组长度 ≥ 60（F-003 AC-004），每项含 id/category（color/spacing/font/decoration/alignment 之一）
  - [ ] AC-002: describe_token('color.brand') 返回 `{ id, category, value, themeOverrides? }`
  - [ ] AC-003: Tool 实现仅调用 M-005 注册中心 API，不含业务逻辑
- **deliverables**:
  - [ ] `apps/mcp-server/src/tools/list-tokens.ts`
  - [ ] `apps/mcp-server/src/tools/describe-token.ts`
  - [ ] `tests/mcp-server/tools/list-tokens.test.ts`
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
- **dependencies**: [T-044, T-046, T-050a, T-050b, T-051, T-073, T-074, T-075, T-077, T-079, T-080, T-081, T-082, T-083, T-084]
- **acceptance_criteria**:
  - [ ] 运行 `wechat-flow init my-test-pack --template plugin`，生成骨架目录；进入目录运行 `wechat-flow validate .`，输出退出码 0 + 通过信息
  - [ ] 在编辑器中写入含中英文混排的 Markdown（如「这是GitHub的项目，包含react组件」），点击「...」→「中文排版修订」，diff 预览 Modal 弹出并展示变更（中英间加空格），点击「确认修订」，编辑器内容更新，按 Ctrl+Z 可撤销
  - [ ] 通过 MCP HTTP transport（`POST /mcp/tools/apply_zh_typo`），发送含中英混排的 Markdown，返回 `{ fixed: '...', totalChanges: N }` 响应
  - [ ] 点击模板卡片应用模板成功（T-073 模板市场验证）
  - [ ] 素材库上传 smoke test：mock 微信 API 返回 mediaId，接口返回 `{ jobId: uuid }`（T-077 验证）
  - [ ] Tool 全集 grep 验证：23 个 Tool 文件在 `apps/mcp-server/src/tools/` 下存在，包含 `describe_template`
- **relates_to**: [F-010, F-014, M-007, M-009, M-011]
