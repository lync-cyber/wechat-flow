---
id: "arch-wechat-flow-modules"
version: "0.4.0"
doc_type: arch
author: architect
status: draft
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
consumers: [tech-lead, ui-designer, developer, devops, qa-engineer]
volume: modules
volume_type: modules
split_from: "arch-wechat-flow"
required_sections:
  - "## 2. 模块划分"
---
# Architecture 分卷 — 模块划分: wechat-flow

[NAV]
- §2 模块划分 → M-001..M-013（含 M-009 admin 路由，承载 API-028..API-031 的 admin key 管理端点）
[/NAV]

## 2. 模块划分

### M-001: 编辑器 UI

- **职责**: 浏览器编辑器的展示层与交互编排——三栏布局、命令面板、抽屉、对话框、源码 ↔ 预览联动、iframe 预览沙箱挂载。不直接持有渲染管线 stage，所有渲染调用经 M-008 应用层 use case
- **映射功能**: F-001 (AC-001..AC-009) / F-002 (AC-001..AC-006) / F-008 (AC-001 浏览 UI, AC-002 模板卡片，AC-004 模板应用) / F-014 (AC-006)
- **对外接口**: 无 HTTP 接口；订阅 M-008 提供的 use case 返回值与诊断流
- **依赖模块**: M-008 (应用层 use case) / M-005 (主题与组件注册中心) / M-012 (schema 契约层) / M-013 (浏览器端持久化)
- **内部关键组件**:
  - `EditorShell.vue` — 三栏布局与状态栏
  - `SourcePane`（基于 CodeMirror 6）— directive 语法高亮、补全
  - `PreviewPane` — iframe 沙箱（`sandbox=""` 空属性 + CSP `default-src 'none'`，零 JS）挂载与视口切换（375 / 768 / desktop）；目录跳转、源码↔预览高亮联动、复制按钮覆盖层等 UI 钩子全部在主线程通过 `iframe.contentDocument` 与 overlay 实现，不向 iframe 内注入脚本
  - `CommandPalette`、`InsertDrawer`、`ContextMenu` — 共享同一 command registry
  - `DiagnosticsPanel` — 兼容性报告分级展示（red / yellow / green）
  - `ThemeSelector`、`PaintDrawer`、`PaletteDerivationDrawer` — 主题选择与单文档配色派生
- **context_load**: [prd#§2.F-001, prd#§2.F-002, prd#§2.F-008, prd#§2.F-014, arch#§2.M-008, arch#§2.M-005]

### M-002: 渲染管线核心

- **职责**: 五段管线 `mdast → hast → pre-paste-hast → post-paste-hast → inline-styled HTML` 的纯函数 stage 编排；版本三元组透传；确定性渲染保证；framework-agnostic 无 DOM 依赖
- **映射功能**: F-002 / F-003 (AC-002 热切换) / F-004 (AC-003 内联化 / AC-004 模拟前置) / F-007 / F-013 (AC-001 跨运行时一致)
- **对外接口**: 包级 API（非 HTTP）：`renderMarkdown(input, options) → RenderResult`、`renderHast(hast, options) → string`；被 M-008 / M-009 / M-011 调用
- **依赖模块**: M-003 (规则集引擎) / M-004 (粘贴过滤模拟器) / M-005 (主题与组件注册中心) / M-007 (plugin-api 类型) / M-012 (schema 契约层)
- **内部关键组件**:
  - `pipeline/parse.ts` — Markdown → mdast (remark + remark-directive)
  - `pipeline/transform.ts` — mdast → hast (rehype 适配 + directive 组件展开)
  - `pipeline/inline-style.ts` — token + 主题样式展开为元素 inline style
  - `pipeline/sanitize.ts` — 调用 `rehype-sanitize` 6.x，使用 `wechatFlowSanitizeSchema`（导出自 `sanitize/schema.ts`，基于 `hast-util-sanitize` 5.x 的 `defaultSchema` deepmerge）；位置：mdast→hast (`transform.ts`) **之后**、过滤规则集（M-003）**之前**；是 hast 进入 stage 链下游的**单一守门点**
  - `pipeline/css-attr-filter.ts` — sanitizer 之后的 CSS 属性二级白名单（解析 `style` 值为 declaration 列表，按 `packages/wechat-spec` 的 CSS 子集声明放行；拒绝 `expression(` / `javascript:` / `behavior:` / `@import`）
  - `pipeline/serialize.ts` — 稳定排序的 HTML 字符串化；统一调 `utils/canonical-json.ts` + `utils/deterministic.ts` 的辅助函数，禁用任何隐式迭代顺序
  - `sanitize/schema.ts` — 导出 `wechatFlowSanitizeSchema: Schema`（`Schema` 类型来自 `hast-util-sanitize`）；Block 注册中心 M-005 在运行时通过 `extendSanitizeSchema(tagSet, attrMap)` 把自定义 Block 标签合入白名单
  - `utils/deterministic.ts` — 确定性容器迭代辅助：`sortedKeys` / `sortedEntries` / `sortedSet` / `canonicalStringify`（详见主卷 §5.2 确定性容器迭代规范）
  - `version/triple.ts` — 三元组 `{coreVersion, themeVersion, rulesetVersion}` 计算与透传
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-007, prd#§3.3, arch#§2.M-003, arch#§2.M-004, arch#§5.2, arch#§5.3]

### M-003: 过滤规则集引擎

- **职责**: 微信平台过滤规则的版本化运行时——规则注册、按作用域（strip / clamp / transform / patch / lint）分类执行、规则集版本号管理、规则补丁热加载（F-011 AC-005）
- **映射功能**: F-007 (AC-001..AC-004) / F-011 (AC-001 规则级 fixture / AC-005 补丁库)
- **对外接口**: 包级 API：`applyRuleset(hast, ruleset) → {hast, diagnostics, hits}`、`getRulesetVersion() → string`；被 M-002 调用
- **依赖模块**: M-012 (schema 契约层 — Rule schema)
- **内部关键组件**:
  - `rules/registry.ts` — 规则注册中心
  - `rules/scope/strip.ts`、`clamp.ts`、`transform.ts`、`patch.ts`、`lint.ts` — 五类作用域执行器
  - `rules/builtin/` — ≥ 42 条内置规则；每条规则一个 TS 文件 `rules/builtin/{rule-id}.ts` 导出 `RuleDefinition`（含 id / scope / priority / matcher / transform / fixture 引用）
  - `version/manifest.ts` — 规则集 manifest 与版本号
  - `patch-loader.ts` — 已知 Bug 补丁库热加载（按微信客户端版本号匹配）
- **规则文件存放**: 规则定义在 `packages/wechat-spec/src/rules/{rule-id}.ts`；fixture 在 `packages/wechat-spec/src/rules/{rule-id}/`，目录结构：
  - `input.html` — 进入规则前的 hast 序列化
  - `expected.html` — 规则应用后的 hast 序列化
  - `metadata.json` — `{ ruleId, scope, priority, description, wechatVersion: { minSupported, knownBuggy[] } }`
  - 多 case 时按 `case-001/`、`case-002/` 子目录组织，每个子目录含同样三件套
- **规则集版本化策略**: `packages/wechat-spec/package.json` `version` 字段即 `rulesetVersion`；任何规则变更（新增 / 修改 transform / 优先级调整）须 bump version；ruleset version 与 core / theme 一同进入版本三元组
- **PRD 19 条 vs ARCH ≥42 条差距**: PRD F-007 §2 表列 19 条代表性规则作为示例基线。架构目标 ≥42 条由 implementer 在 `packages/wechat-spec` 包内补充并以 fixture 形式版本化；剩余 23+ 条来自微信客户端平台实测（公众号编辑器粘贴行为对照、客户端渲染兼容性验证）。`[ASSUMPTION]` 截至 dev-plan 阶段规则总数以 42 条为实现门槛；超 42 条视为规则集质量提升，由后续 patch 版本承载。
- **context_load**: [prd#§2.F-007, prd#§2.F-011]

### M-004: 粘贴过滤模拟器

- **职责**: 复现微信公众号编辑器对粘贴 HTML 的过滤行为，作为渲染管线最后一道关卡；输出粘贴前后逐节点的精确变更对照
- **映射功能**: F-002 (AC-005 / AC-006 兼容性报告) / F-004 (AC-004 / AC-005 视觉一致性) / F-011 (AC-002)
- **对外接口**: 包级 API：`simulatePaste(hast) → {hast, diffNodes, droppedAttrs}`；被 M-002 在最后 stage 调用、被 M-009 `simulate_paste` Tool 直接调用
- **依赖模块**: M-003 (规则集引擎 — 共享 strip 规则)
- **内部关键组件**:
  - `simulator/strip-tags.ts` — 标签级剥除（style / script / 等）
  - `simulator/strip-attrs.ts` — 属性级剥除（id / class / style 选择性等）
  - `simulator/rewrite-structure.ts` — 结构改写（如 ul/ol → table 布局）
  - `diff/per-node-diff.ts` — 节点级 diff 输出（兼容性详情面板核心数据）
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-011]

### M-005: 主题与组件注册中心

- **职责**: 内置主题、Block / Mark / Variant / Token、主题装饰资产的注册与查询；主题守护 8 维静态校验；主题热切换；模板（F-008）登记；扩展点支持第三方模板 pack 注册
- **映射功能**: F-003 (AC-001..AC-011) / F-008 (AC-003 模板登记, AC-004 预编排模型) / F-009 (AC-001 继承 + AC-002 品牌包) / F-011 (AC-003 主题守护)
- **对外接口**: 包级 API：`registerTheme(definition)`、`listThemes()`、`describeTheme(id)`、`listBlocks()`、`describeBlock(id)`、`listBlockVariants(blockId)`、`derivePalette(seed)`、`validateThemeGuard(theme) → GuardResult`、`registerTemplate(definition)`、`listTemplates(themeId?)`、`describeTemplate(id)`；被 M-002 / M-008 / M-009 调用
- **依赖模块**: M-006 (调色板派生) / M-007 (plugin-api 类型) / M-012 (schema 契约层)
- **内部关键组件**:
  - `registry/theme.ts`、`block.ts`、`mark.ts`、`variant.ts`、`token.ts` — 五类注册表
  - `guard/eight-dimensions.ts` — 主题守护 8 维校验
  - `inheritance/delta-merge.ts` — 主题继承 + delta 合并（F-009）
  - `brand-pack/lock.ts` — 品牌包字体 / 配色 / 组件子集锁定
  - `template/registry.ts` — 模板登记（F-008 AC-003）；扩展点：`pack.manifest.templates[]` 注册路径与 `frontmatter.template` 解析链路
- **内置模板清单**: M-005 `template/registry.ts` 内置 5 主题 × 各 ≥ 2 模板 seed，覆盖 PRD F-008 备注的 8 类内容场景：

  | templateId | scenario | 适配主题 |
  |------------|----------|----------|
  | `tech-review` | 科技评测 | tech / default |
  | `poetry-essay` | 诗歌赏析 | literary |
  | `industry-report` | 行业分析报告 | business |
  | `life-vlog` | 生活记录 | magazine |
  | `tutorial` | 教程 / How-to | tech / default |
  | `book-review` | 书评 / 影评 | literary / default |
  | `kpi-summary` | 数据 / KPI 总结 | business |
  | `lifestyle-guide` | 生活方式指南 | magazine |

  每个 templateId 在内置主题的 `templates/` 目录下提供 Markdown 文件实现，模板 manifest 含 `id` / `name` / `scenario` / `targetThemes` / `content` 字段。
- **context_load**: [prd#§2.F-003, prd#§2.F-008, prd#§2.F-009, prd#§2.F-011, arch#§2.M-006]

### M-006: 调色板派生

- **职责**: 从单一主色或 `{primary, secondary?, accent?, dark?}` seed 在 LCH 感知均匀色彩空间派生完整 token 字典（背景明暗梯度、辅助色、状态色、装饰色）
- **映射功能**: F-003 (AC-011 base-color 派生) / F-010 (AC-007 第三方主题消费派生 API) / F-013 (`derive_palette` Tool)
- **对外接口**: 包级 API：`derivePalette(seed, options) → TokenDictionary`；被 M-005 / M-009 调用
- **依赖模块**: 无（纯函数包，依赖外部 color 库如 `culori`）
- **内部关键组件**:
  - `lch/derive.ts` — LCH 空间梯度计算
  - `tokens/dictionary-builder.ts` — 派生 token 字典构建
  - `wcag/contrast-validator.ts` — 派生后对比度校验
- **context_load**: [prd#§2.F-003, prd#§2.F-010]

### M-007: 插件沙箱与 plugin-api

- **职责**: 第三方插件运行的 Web Worker 沙箱 + 通过 Comlink 暴露给沙箱内代码的 plugin-api surface（白名单 API）；沙箱内禁全局网络对象，外部网络请求经"仅事件通道"代理；运行时违规检测与降级
- **映射功能**: F-010 (AC-002 manifest+schema+render 三件套 / AC-005 自动校验 / AC-006 variant 注册扩展点 / AC-008 沙箱隔离)
- **对外接口**:
  - 主线程 API：`loadPlugin(packUrl) → PluginHandle`、`unloadPlugin(id)`、`grantPermissions(id, manifest.permissions)`
  - 沙箱内 plugin-api surface：`defineBlock`、`defineVariant`、`defineRule`、`defineTheme`、`registerAsset`、`requestResource(url, init?) → Promise<Response>`（唯一网络出口）
- **依赖模块**: M-005 (主题与组件注册中心) / M-003 (规则集引擎 — 规则补丁注册路径) / M-012 (schema 契约层)
- **内部关键组件**:
  - `worker/runtime.ts` — Worker 入口与 Comlink RPC 桥；启动时执行 `assertNetIsolation()`：先 `delete globalThis.fetch / XMLHttpRequest / WebSocket / EventSource`，随即断言 `typeof globalThis.fetch === 'undefined' && typeof globalThis.XMLHttpRequest === 'undefined'`，断言失败抛 `E_WORKER_NETWORK_LEAK` 并 `self.close()` 终止 Worker；该断言覆盖 bundler 注入 polyfill / Comlink 版本意外引入 fetch 的回归路径
  - `surface/plugin-api.ts` — 白名单 API 定义；`requestResource` 实现 = `comlink.proxy(mainThreadAcl.requestResource)`
  - `acl/network-gate.ts` — 主线程网络门禁：读取 pack manifest 的 `permissions.network: string[]`（URL pattern 白名单，支持 `https://*.example.com/*` 通配），命中放行调用 `fetch`，未命中抛 `E_PERMISSION_DENIED`
  - `acl/audit-log.ts` — 所有 `requestResource` 调用结果（allow/deny + url + pluginId + ts）写入 §5.5 审计流
  - `validation/manifest-check.ts`、`schema-check.ts`、`render-sniff.ts` — 加载时三层校验
  - `runtime/violation-detector.ts` — 运行时违规检测（超时、内存、API 调用频率）
  - `fallback/placeholder.ts` — 校验或运行时违规降级为占位符
- **网络代理时序**:
  ```
  Plugin (Worker)                  PluginHost (Main thread)
        │                                  │
        │ requestResource("https://x/")    │
        ├─────────── Comlink ─────────────▶│
        │                                  ├─ network-gate.check(url, manifest.permissions.network)
        │                                  ├─ audit-log.write(allow|deny)
        │                                  ├─ deny → throw E_PERMISSION_DENIED
        │                                  ├─ allow → fetch(url, init)
        │                                  ▼
        │◀─────────── Response (structured clone) ─────────
  ```
- **context_load**: [prd#§2.F-010, prd#§3.2, arch#§5.3]

### M-008: 应用层 use case

- **职责**: 编辑器、MCP server、CLI 三端共享的"语义级用户意图"封装层——把"渲染 + 复制"、"渲染 + 导出 HTML"、"渲染 + 长图 job"、"中文排版修订"等任务串接为单个调用入口，不持有 UI 状态，不持有 DOM
- **映射功能**: F-001 / F-004 / F-005 (AC-001 长图 / AC-002 封面 / AC-003 素材库上传 / AC-004 异步 job) / F-006 / F-013 (AC-001 共享 use case) / F-014
- **对外接口**: 包级 API：`composeRender(input) → RenderResult`、`composeCopy(input) → ClipboardPayload`、`composeExportHtml(input) → string`、`composeExportLongImage(input) → JobHandle`、`composeExportCover(input) → JobHandle`、`composeUploadImage(input) → JobHandle`、`composeUploadWechatAsset(input) → JobHandle`、`composeApplyZhTypo(markdown) → {fixed, perRule, totalChanges}`
- **依赖模块**: M-002 (渲染管线核心) / M-004 (粘贴过滤模拟器) / M-005 (主题与组件注册中心) / M-010 (中继服务客户端) / `@wechat-flow/zh-typo`
- **内部关键组件**:
  - `composers/render.ts`、`copy.ts`、`export-html.ts`、`export-long-image.ts`、`export-cover.ts`
  - `composers/upload-image.ts`、`upload-wechat-asset.ts`
  - `composers/apply-zh-typo.ts`
  - `clipboard/dual-mime-payload.ts` — F-004 AC-001 html + text 双 MIME 组装
- **`composeCopy` pipeline 约束**：`composeRender → simulatePaste → buildDualMimePayload → navigator.clipboard.write`；剪贴板写入前必经 M-004 `simulatePaste` 节点，禁止跳过；该顺序由 `composers/copy.ts` 内联注释固定（PRD F-004 AC-004）
- **context_load**: [prd#§2.F-001, prd#§2.F-004, prd#§2.F-005, prd#§2.F-006, prd#§2.F-013, prd#§2.F-014, arch#§2.M-002, arch#§2.M-010]

### M-009: MCP server

- **职责**: 对 LLM Agent 暴露 22 个 Tool（16 同步 + 6 异步长任务，含 `get_job` 与 `get_ruleset_version`）；stdio + HTTP/SSE 双 transport；API key + per-key 配额；Idempotency-Key 去重；版本三元组透传到响应；**鉴权基线**两级（`scope=user` Tool 调用 vs `scope=admin` 管理端点；admin key 只走 M-010 admin 路由，不能调 Tool）
- **映射功能**: F-013 (AC-001..AC-006)
- **对外接口**: MCP Tool（22 个，16 同步 + 6 异步）— 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-001..API-016
- **依赖模块**: M-008 (应用层 use case) / M-002 / M-005 / M-006 / M-010 / M-012
- **内部关键组件**:
  - `transport/stdio.ts`、`transport/http-sse.ts` — 双 transport entry
  - `auth/api-key.ts` — API key 鉴权 + per-key 配额；校验 `scope` 字段；user / admin 两级 key 哈希存储于 E-010 ApiKey 表；明文仅在创建时由 admin API 返回一次
  - `auth/scope-guard.ts` — Tool 路由前置守卫：仅 `scope=user` 可达 Tool 路由表；admin scope 直接 403 `E_PERMISSION_DENIED`
  - `idempotency/dedup.ts` — `sha256(input + toolsetVersion)` 去重缓存
  - `tools/router.ts` — 22 个 Tool 的 dispatcher，映射到 M-008 composer；Tool 层为 thin wrapper，禁止持有业务逻辑（业务逻辑统一在 M-008 / M-006 / M-004）
  - `version/triple-injection.ts` — 响应注入版本三元组
- **Skill bundle 协同**: `skill/SKILL.md` 引用本模块 22 个 Tool 的调用顺序约定（典型链：`list_themes` → `describe_block` → `render_markdown` → `simulate_paste` → `upload_to_wechat_asset`），由 LLM Agent 解析为语义任务；Skill bundle 与 MCP server 共版本号发布
- **context_load**: [prd#§2.F-013, prd#§3.2, arch#§3]

### M-010: 中继服务

- **职责**: 凭据中继（AppID/AppSecret / 图床 token 服务端持有）；图片上传 proxy；公众号素材库上传 proxy；BullMQ 长任务调度；Playwright Chromium worker 编排；y-websocket Yjs 协同子服务；**承载 admin API key 管理端点**（API-028..API-031，仅 `scope=admin` 可达）
- **映射功能**: F-005 (AC-001..AC-004) / F-006 (AC-001 多图床 / AC-002 压缩 / AC-003 EXIF 剥离 / AC-004 重试) / F-012 (AC-001..AC-004 同步) / F-013 (AC-004 鉴权 + 配额 + job + admin 管理)
- **对外接口**: HTTP REST + SSE + WebSocket — 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-017..API-021 + API-026..API-027 + API-028..API-031（admin API key 管理端点）
- **依赖模块**: M-012 (schema 契约层) / Redis 7.x (BullMQ + idempotency + awareness pub/sub) / Playwright (Chromium headless) / SQLite/Postgres (持久化)
- **内部关键组件**:
  - `credentials/store.ts` — 凭据存储抽象（环境变量 / KMS / Vault，由 deploy-spec 终定）
  - `image-host/qiniu.ts`、`oss.ts`、`cos.ts`、`smms.ts`、`local.ts`、`custom.ts` — 6 类图床适配器
  - `wechat-asset/uploader.ts` — 微信素材库上传 (持有 AppID/AppSecret)
  - `job/queue.ts` — BullMQ 队列工厂；queue 命名 `bullmq-{kind}` (kind ∈ image-upload / wechat-asset-upload / long-image-render / cover-render)；job name 形如 `<kind>:<apiKeyId>:<idemKey-prefix8>`；默认 attempts=3 + exponential backoff (起 1s, factor 2, max 30s)
  - `job/idempotency.ts` — `sha256(canonicalize(input) + toolsetVersion)` 计算；Redis key `idem:{apiKeyId}:{sha256}` TTL 24h；命中返回原 `jobId`，未命中入队
  - `job/state-machine.ts` — `pending → running → succeeded / failed` 状态机；BullMQ events 同步写 E-005 Job 表
  - `job/sse-bridge.ts` — BullMQ QueueEvents → Hono `streamSSE` 桥，按 `jobId` route 推送 `progress / succeeded / failed`
  - `headless/playwright-pool.ts` — Playwright `chromium.launch({headless: true})` 进程池；按 `viewportWidth / format` 配置 page；渲染长图 / 封面后落地为 PNG 字节流 → 写对象存储 → 回填 Job.result
  - `image/preprocess.ts` — `sharp` 库做 EXIF 剥离、压缩、宽度规整（≤ 1080px）
  - `yjs/y-websocket-server.ts` — y-websocket 服务端 integration（Hono `/yjs/:docId` 端点 + WebSocket upgrade）；维护 Y.Doc 内存副本；订阅 Redis `yjs:awareness:{docId}` channel；周期性 snapshot 节流（每 60s 或 100 ops）写 E-009 YDocSnapshot
  - `admin/api-keys.ts` — admin API key 管理路由（POST 创建 / GET 列出 / PATCH 轮换 / DELETE 吊销）；前置 `auth/admin-guard.ts` 校验 `scope=admin`；创建端点用 `crypto.randomUUID` + `crypto.subtle.digest('SHA-256')` 生成 key 与哈希；明文 key 仅在响应中出现一次
  - `auth/admin-guard.ts` — admin API 鉴权基线：(1) 校验 Bearer key 哈希命中 E-010.scope='admin' 行；(2) 强制 `X-Admin-Request: 1` 自定义 header（防止 CSRF）；(3) 来源 IP 白名单（环境变量 `ADMIN_IP_ALLOWLIST` 配置；缺省时仅允许 loopback）；(4) admin 操作全部写审计日志（actor=apiKeyId, action, target, ts）到 §5.5 审计追溯通道
- **context_load**: [prd#§2.F-005, prd#§2.F-006, prd#§2.F-012, prd#§2.F-013, prd#§3.2, arch#§5.3, arch#§6.3]

### M-011: CLI

- **职责**: 主题/插件开发者脚手架——`init` / `dev`（本地热重载）/ `validate`（manifest + schema + 主题守护）/ `publish`；与 LLM Agent 通过同一份 Tool 契约的命令行壳调用（F-013 AC-003）
- **映射功能**: F-010 (AC-003 CLI 脚手架 / AC-006 variant 校验) / F-013 (AC-003 CLI 分发形态)
- **对外接口**: CLI 命令 — 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-022..API-025
- **依赖模块**: M-002 (渲染管线核心 — `validate` / `dev` 本地执行) / M-005 (主题守护) / M-007 (manifest + schema 校验) / M-008 (use case — `cli render` 等命令)
- **内部关键组件**:
  - `commands/init.ts` — `--template plugin|theme` 两种骨架
  - `commands/dev.ts` — Vite middleware + HMR + pack live-reload
  - `commands/validate.ts` — manifest + schema + 主题守护 8 维 + variant 申报一致性
  - `commands/publish.ts` — pack 打包 + 发布到 registry
  - `commands/render.ts`、`copy.ts`、`export.ts` — Tool 契约的 CLI 壳
- **context_load**: [prd#§2.F-010, prd#§2.F-013]

### M-012: schema 契约层

- **职责**: 全项目类型与运行时 schema 单一事实来源——MCP Tool 入参出参、Hono RPC 路由契约、组件 schema (attrsSchema)、主题 manifest、pack manifest、Rule schema、Diagnostic 结构、Job 结构；提供 TS 类型 + 运行时校验器 + JSON Schema 导出（喂 LLM）
- **映射功能**: F-010 (AC-004 全链路类型推导 + 运行时校验) / F-013 (AC-002 强类型 schema 契约 / AC-005 schema 演进策略)
- **对外接口**:
  - 包级类型导出：`z.infer<typeof XxxSchema>` 直推 TS 类型
  - schema 工厂函数：每个领域对象一个 `z.object({...})` 定义
  - JSON Schema 互转：`toJSON(schema) → JSONSchema7`（包装 `z.toJSONSchema()`），供 `describe_block` / `describe_mark` / `describe_theme` 等 MCP Tool 喂 LLM Agent
  - 运行时校验：`schema.parse(input)` / `schema.safeParse(input)`
- **依赖模块**: 无（最底层 contracts 包）；外部依赖 `zod@4.x` + 可选 `@zod/mini`（浏览器 bundle 体积敏感场景）
- **内部关键组件**:
  - `mcp/tool-contracts.ts` — 22 个 Tool 的 request / response Zod schema；如 `renderMarkdownRequestSchema = z.object({ markdown: z.string(), themeId: z.string().optional(), rulesetVersion: z.string().optional(), paint: z.record(z.string()).optional(), baseColor: z.string().optional() })`；长任务 Tool 的 `jobId` 字段统一 `z.string().uuid()`
  - `relay/route-contracts.ts` — Hono RPC 路由契约（与 Hono 4.x `zValidator` middleware 集成）
  - `component/attrs-schema.ts` — Block / Mark 的 `attrsSchema` 类型工厂；`describe_block` 调用 `toJSON(block.attrsSchema)` 输出 JSON Schema
  - `theme/manifest-schema.ts`、`pack/manifest-schema.ts`、`ruleset/rule-schema.ts`
  - `diagnostic/structure.ts`、`job/structure.ts`、`version/triple-structure.ts`
  - `yjs/sync-message-schema.ts` — Yjs 同步消息（snapshot / awareness payload）schema，与 y-websocket 协议对齐
  - `versioning/deprecation-window.ts` — semver major + minor deprecation window 工具
- **context_load**: [prd#§2.F-010, prd#§2.F-013]

### M-013: 浏览器端持久化与同步

- **职责**: 浏览器端多文档管理、本地草稿持久化与自动备份；同步与协作能力（基于 Yjs CRDT）作为可选拓扑保留，当前发布不接通服务端
- **映射功能**: F-001 (AC-005 多文档 / 持久化 / 自动备份, P0) / F-012 (AC-001..AC-004, P2 — 仅保留接口与协议设计，不交付实现)
- **优先级**: 本模块持久化部分 P0（F-001 依赖）；同步接口与 Y.Doc 结构作为架构候选保留以避免后续激活时返工，**接口与协议设计与 P0 同质量**，当前发布不交付实现
- **对外接口**: 包级 API：
  - 多文档：`saveDraft(doc)`、`listDocuments()`、`loadDocument(id)`、`deleteDocument(id)`、`createBackup(id)`
  - Yjs 同步：`enableSync(docId, { wsUrl, authToken }) → YDocBinding`、`disableSync(docId)`、`getSyncState(docId) → { connected, awareness: AwarenessState[] }`
  - 历史：`fetchHistory(docId)`、`restoreVersion(docId, snapshotId)`、`diffVersions(docId, snapAId, snapBId)`
- **YDocBinding 类型签名**:
  ```ts
  import type * as Y from 'yjs';
  import type { Awareness } from 'y-protocols/awareness';
  import type { WebsocketProvider } from 'y-websocket';

  interface YDocBinding {
    docId: string;
    doc: Y.Doc;
    provider: WebsocketProvider;
    awareness: Awareness;
    sync: {
      status: 'idle' | 'connecting' | 'syncing' | 'synced' | 'error';
      lastSyncedAt?: number;     // unix ms
      lastError?: { code: string; message: string };
    };
    on(event: 'sync-status' | 'awareness-change' | 'error', listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
    disconnect(): void;          // 关闭 ws；Y.Doc 仍在内存中保留
    destroy(): void;             // 关闭 ws + 释放 Y.Doc 内存（不删 IndexedDB 持久化）
  }
  ```
- **依赖模块**: M-008 (应用层 use case — sync 编排) / M-010 (中继服务 — y-websocket 服务端) / M-012 (schema — sync-message-schema) / 外部 `yjs@13.6.x` / `y-codemirror.next@0.3.x` / `y-indexeddb`
- **内部关键组件**:
  - `storage/indexeddb-adapter.ts` — IndexedDB (via `idb` 8.x) 适配器；存储 E-001 Document
  - `storage/y-indexeddb-binding.ts` — `y-indexeddb` 集成：每个文档对应一个 `Y.Doc`，持久化到 IndexedDB；离线编辑保留 op-log
  - `documents/manager.ts` — 多文档元数据管理
  - `backup/auto-backup.ts` — 自动备份策略（每 60s 或编辑后空闲 5s）
  - `sync/y-doc-factory.ts` — Y.Doc 结构创建：每文档一个 Y.Doc，含 `Y.XmlFragment` (markdown 源码 via `y-codemirror.next`) + `Y.Map` (frontmatter metadata)
  - `sync/y-websocket-client.ts` — `WebsocketProvider` 包装：连接 `wss://relay/yjs/{docId}`，header 携带 API key；自动重连（指数退避）
  - `sync/awareness-codec.ts` — awareness payload 序列化（光标位置 / 选区 / 用户 ID + 显示色）
  - `editor/y-codemirror-binding.ts` — `y-codemirror.next` 把 CodeMirror 6 SourcePane 绑定到 Y.XmlFragment
  - `history/snapshot-manager.ts` — 周期性 Y.encodeStateAsUpdate 快照；按需 restore（应用 update 到新 Y.Doc）
  - `history/diff-versions.ts` — 基于 Y.diffUpdate / yjs-utils 计算两快照差异
- **Yjs 文档结构**:
  ```
  Y.Doc (per document)
   ├─ XmlFragment "markdown"   ← y-codemirror.next 绑定 CodeMirror 6
   └─ Map         "frontmatter"
       ├─ theme:        string
       ├─ paint:        Map<string, string>
       ├─ base-color:   string
       └─ template:     string
  ```
- **awareness 中继**: WebsocketProvider 客户端 ↔ y-websocket server (M-010) ↔ Redis pub/sub channel `yjs:awareness:{docId}`，跨进程广播；客户端断线 30s 后服务端清理其 awareness 条目
- **快照策略**: 服务端 y-websocket server 节流每 60s 或 100 ops 调用 `Y.encodeStateAsUpdate(doc)` 写入 E-009 YDocSnapshot；客户端不主动写服务端快照（避免 race）
- **离线优先**: 编辑器禁用同步时也 100% 可用，IndexedDB 是 source of truth；用户启用同步是显式动作（设置抽屉切换）
- **context_load**: [prd#§2.F-001, prd#§2.F-012, arch#§2.M-010, arch#§4.E-009, arch#§4.E-010]
