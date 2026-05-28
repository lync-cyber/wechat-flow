---
id: "arch-wechat-flow-api"
version: "0.6.1"
doc_type: arch
author: architect
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
consumers: [tech-lead, ui-designer, developer, devops, qa-engineer]
volume: api
volume_type: api
split_from: "arch-wechat-flow"
required_sections:
  - "## 3. 接口契约"
---
# Architecture 分卷 — 接口契约: wechat-flow

[NAV]
- §3 接口契约 → API-001..API-015, API-016（合并条目，含 6 个 Tool）, API-017..API-033
  - §3.1 MCP Tool 契约 (API-001..API-015, API-016 合并条目, API-033 describe_template)
  - §3.2 Relay REST/SSE 接口 (API-017..API-021)
  - §3.3 CLI 命令契约 (API-022..API-025)
  - §3.4 Yjs 同步接口 (API-026..API-027)
  - §3.5 Admin API key 管理 (API-028..API-031)
  - §3.6 Editor Session 鉴权 (API-032)
[/NAV]

## 3. 接口契约

> 公共约定：
> - 所有 schema 用 Zod 4 表达，TS 推导类型在 `@wechat-flow/contracts` 同时 `export type X = z.infer<typeof XSchema>`；本文档示例字段用 `{ type, required, desc }` 三元组速记，对应 Zod 表达详见下方
> - 所有 MCP Tool 响应均包含 `versionTriple: {coreVersion, themeVersion, rulesetVersion}` 字段（未单独列出时由 transport 层自动注入）
> - `Diagnostic` 通用结构：`{severity: 'red'|'yellow'|'green', ruleId?: string, nodeRef?: {line, column}, message: string}`
> - 长任务统一异步 job 模型：返回 `{jobId: string}`，调用方通过 `get_job` 轮询或订阅 SSE
>
> **Idempotency-Key 约定**（适用所有写操作 + 长任务入队）：
> - Header 名：`Idempotency-Key`，类型 string，长度 ≤ 200 字符
> - 推荐值：`sha256(canonicalize(input) + toolsetVersion).hex` 全 64 字符
> - 缺省行为：不去重，每次调用都入队产生新 `jobId`
> - 命中行为：服务端 24 小时 TTL 内同 `(apiKeyId, idempotencyKey)` 直接返回**原 jobId**（即使任务已 `failed` 也返回原 jobId，调用方自行决定是否换 key 重试）
> - 冲突行为：同 `idempotencyKey` 但 `canonicalize(input)` hash 不同时返回 `409 E_IDEMPOTENCY_CONFLICT`
>
> **统一错误响应** (`ErrorResponse`)：
> ```ts
> z.object({
>   error: z.object({
>     code: z.string(),         // E_SCHEMA / E_THEME_NOT_FOUND / E_QUOTA_EXCEEDED / ...
>     message: z.string(),
>     details: z.unknown().optional(),
>     requestId: z.string(),
>   })
> })
> ```
>
> **HTTP 状态码语义**：
> - `2xx`: 200 同步成功 / 202 长任务已入队
> - `4xx 客户端错误`: 400 入参 schema 校验失败（`E_SCHEMA`）/ 401 API key 无效（`E_AUTH`）/ 403 沙箱权限拒绝（`E_PERMISSION_DENIED`）/ 404 资源不存在（`E_NOT_FOUND`）/ 409 idempotency 冲突（`E_IDEMPOTENCY_CONFLICT`）/ 429 配额超限（`E_QUOTA_EXCEEDED`）
> - `5xx 服务端错误`: 500 内部错误（`E_INTERNAL`）/ 502 上游错误（`E_UPSTREAM`，如微信素材库 / 图床）/ 503 服务过载（`E_OVERLOAD`，Job 队列堆积超阈值）/ 504 上游超时（`E_TIMEOUT`）
>
> **共享 QuotaConfigSchema**（在 `@wechat-flow/contracts` 内定义；API-028 与 E-010 单源引用）：
> ```ts
> export const QuotaConfigSchema = z.object({
>   requestsPerMinute: z.number().int().min(1).max(10000).default(60),
>   burstSize: z.number().int().min(1).max(1000).default(120),
>   requestsPerDay: z.number().int().min(1).max(1000000).default(10000),
>   monthlyJobCap: z.number().int().min(1).max(1000000).default(50000),
>   maxConcurrentJobs: z.number().int().min(1).max(100).default(5),
> });
> ```
> M-009 / M-010 rate-limit 中间件按此字段执行；任何字段命名漂移视为 contracts 违规。

### 3.1 MCP Tool 契约 (API-001..API-016, API-033)

#### API-001: render_markdown

```yaml
tool: render_markdown
module: M-009
maps_to: F-013 AC-002 (主入口) / F-001 / F-002 / F-007
request:
  body:
    markdown: { type: string, required: true, desc: "完整 Markdown 源码，含 frontmatter" }
    themeId: { type: string, required: false, desc: "覆盖 frontmatter 中的主题，缺省时取 frontmatter.theme 或 default" }
    rulesetVersion: { type: string, required: false, desc: "锁定规则集版本，缺省取最新" }
    paint: { type: "Record<string, string>", required: false, desc: "单文档配色覆盖（受 theme.paintable 约束）" }
    baseColor: { type: string, required: false, desc: "调色板派生 seed（hex / lch）" }
response:
  schema:
    html: { type: string, desc: "最终 inline-styled HTML" }
    diagnostics: { type: "Diagnostic[]", desc: "渲染管线全 stage 汇聚的诊断" }
    versionTriple: { type: "VersionTriple", desc: "{coreVersion, themeVersion, rulesetVersion}" }
  errors:
    SchemaValidationError: { code: "E_SCHEMA", desc: "Markdown frontmatter / directive 参数 schema 校验失败" }
    ThemeNotFound: { code: "E_THEME_NOT_FOUND" }
    RulesetVersionMismatch: { code: "E_RULESET_VERSION_MISMATCH" }
```

#### API-002: lint_markdown

```yaml
tool: lint_markdown
module: M-009
maps_to: F-013 AC-002
request:
  body:
    markdown: { type: string, required: true }
    themeId: { type: string, required: false }
response:
  schema:
    diagnostics: { type: "Diagnostic[]" }
    versionTriple: { type: "VersionTriple" }
```

#### API-003: list_themes

```yaml
tool: list_themes
module: M-009
maps_to: F-013 AC-002
request: {}
response:
  schema:
    themes: { type: "ThemeSummary[]", desc: "{id, name, description, version, scene}[]" }
```

#### API-004: describe_theme

```yaml
tool: describe_theme
module: M-009
maps_to: F-013 AC-002 / F-008 AC-004
request:
  body:
    themeId: { type: string, required: true }
response:
  schema:
    id: { type: string }
    name: { type: string }
    version: { type: string }
    tokens: { type: "TokenDefinition[]" }
    paintable: { type: "string[] | 'all-colors'", desc: "可被 frontmatter.paint 覆盖的 token 路径白名单" }
    assets: { type: "Record<string, AssetRef>", desc: "主题装饰资产清单" }
    templates: { type: "TemplateMeta[]", desc: "该主题已注册的 template 预设变体清单（templateId + 缩略元数据），不含 Markdown 正文；调用方需取正文时调用 API-033 describe_template (F-008 AC-004)" }
  errors:
    ThemeNotFound: { code: "E_THEME_NOT_FOUND" }
```

#### API-005: list_blocks

```yaml
tool: list_blocks
module: M-009
maps_to: F-013 AC-002 / F-003 AC-006
request:
  body:
    themeId: { type: string, required: false, desc: "若指定，仅列出该主题已渲染支持的 Block" }
response:
  schema:
    blocks: { type: "BlockSummary[]", desc: "{id, name, description, directiveSyntax}[]" }
```

#### API-006: describe_block

```yaml
tool: describe_block
module: M-009
maps_to: F-013 AC-002 / F-010 AC-004
request:
  body:
    blockId: { type: string, required: true }
response:
  schema:
    id: { type: string }
    name: { type: string }
    attrsSchema: { type: "JSONSchema", desc: "Block 属性的 JSON Schema 表达，便于 LLM 生成合法 Markdown" }
    variants: { type: "VariantSummary[]" }
    tokenDependencies: { type: "string[]", desc: "该 Block 消费的 token 路径" }
```

#### API-007: list_marks

```yaml
tool: list_marks
module: M-009
maps_to: F-013 AC-002 / F-003 AC-005
request: {}
response:
  schema:
    marks: { type: "MarkSummary[]" }
```

#### API-008: describe_mark

```yaml
tool: describe_mark
module: M-009
maps_to: F-013 AC-002
request:
  body:
    markId: { type: string, required: true }
response:
  schema:
    id: { type: string }
    name: { type: string }
    attrsSchema: { type: "JSONSchema" }
    inlineSyntax: { type: string, desc: "行内 directive 用法示例" }
```

#### API-009: list_tokens / describe_token

```yaml
tool: list_tokens
module: M-009
maps_to: F-013 AC-002 / F-003 AC-004
request:
  body:
    themeId: { type: string, required: false }
response:
  schema:
    tokens: { type: "TokenSummary[]", desc: "{id, category: 'color'|'spacing'|'font'|'decoration'|'alignment'}[]" }

# describe_token 同 path 形态:
tool_2: describe_token
request:
  body:
    tokenId: { type: string, required: true }
    themeId: { type: string, required: false }
response:
  schema:
    id: { type: string }
    category: { type: string }
    valueByTheme: { type: "Record<string, unknown>", desc: "每个主题中此 token 的实际值" }
    paintable: { type: boolean, desc: "是否在指定主题中可被 paint 覆盖" }
```

#### API-010: list_block_variants

```yaml
tool: list_block_variants
module: M-009
maps_to: F-013 AC-002 / F-003 AC-007
request:
  body:
    blockId: { type: string, required: true }
response:
  schema:
    variants: { type: "VariantSummary[]", desc: "{id, name, themeAffinity?: string[], description}[]" }
```

#### API-011: describe_variant

```yaml
tool: describe_variant
module: M-009
maps_to: F-013 AC-002
request:
  body:
    blockId: { type: string, required: true }
    variantId: { type: string, required: true }
response:
  schema:
    id: { type: string }
    blockId: { type: string }
    consumedTokens: { type: "string[]" }
    consumedAssets: { type: "string[]" }
    directiveExample: { type: string }
```

#### API-012: derive_palette

```yaml
tool: derive_palette
module: M-009
maps_to: F-013 AC-002 / F-003 AC-011 / F-010 AC-007
request:
  body:
    primary: { type: string, required: true, desc: "主色（hex / lch / oklch）" }
    secondary: { type: string, required: false }
    accent: { type: string, required: false }
    dark: { type: boolean, required: false, desc: "派生暗色梯度" }
response:
  schema:
    tokens: { type: "Record<string, string>", desc: "派生的完整 token 字典" }
    wcagWarnings: { type: "Diagnostic[]", desc: "对比度低于 AA 的 token 对警告" }
```

#### API-013: apply_zh_typo

```yaml
tool: apply_zh_typo
module: M-009
maps_to: F-013 AC-002 / F-014 (AC-005)
request:
  body:
    markdown: { type: string, required: true }
    rules: { type: "('zh-en-space'|'punctuation'|'quotes'|'ellipsis-dash')[]", required: false, desc: "缺省 4 类全启" }
response:
  schema:
    fixed: { type: string, desc: "修订后的 Markdown" }
    perRule: { type: "Record<string, number>", desc: "每类规则命中次数" }
    totalChanges: { type: number }
```

#### API-014: simulate_paste

```yaml
tool: simulate_paste
module: M-009
maps_to: F-013 AC-002 / F-011 AC-002
request:
  body:
    html: { type: string, required: true, desc: "待模拟粘贴的 HTML（通常为已 inline-styled 的渲染产物）" }
response:
  schema:
    filteredHtml: { type: string }
    diffNodes: { type: "NodeDiff[]", desc: "粘贴前后逐节点差异" }
    droppedAttrs: { type: "Record<string, string[]>", desc: "按节点路径列出被剥除的属性" }
```

#### API-015: export_clipboard_payload

```yaml
tool: export_clipboard_payload
module: M-009
maps_to: F-013 AC-002 / F-004 AC-001
request:
  body:
    markdown: { type: string, required: true }
    themeId: { type: string, required: false }
response:
  schema:
    html: { type: string, desc: "text/html MIME 载荷（已经过粘贴过滤模拟前置）" }
    text: { type: string, desc: "text/plain MIME 载荷（W3C 要求 HTML 必须配 plain fallback）" }
```

#### API-016: 异步长任务 Tool 簇 + get_job + get_ruleset_version

```yaml
# upload_image
tool: upload_image
module: M-009
maps_to: F-013 AC-004 / F-006 AC-001..AC-004
request:
  body:
    imageData: { type: string, required: true, desc: "base64 或 multipart 引用" }
    target: { type: "'local'|'qiniu'|'oss'|'cos'|'smms'|'custom'", required: true }
    customConfig: { type: "Record<string, unknown>", required: false }
response:
  schema:
    jobId: { type: "string (uuid)" }

# upload_to_wechat_asset
tool: upload_to_wechat_asset
module: M-009
maps_to: F-013 AC-004 / F-005 AC-003
request:
  body:
    imageUrl: { type: string, required: true }
    type: { type: "'image'|'voice'|'video'|'thumb'", required: true }
response:
  schema:
    jobId: { type: "string (uuid)" }

# export_long_image
tool: export_long_image
module: M-009
maps_to: F-013 AC-004 / F-005 AC-001
request:
  body:
    html: { type: string, required: true, desc: "已 inline-styled HTML" }
    viewportWidth: { type: number, required: false, desc: "缺省 375" }
response:
  schema:
    jobId: { type: "string (uuid)" }

# export_cover
tool: export_cover
module: M-009
maps_to: F-013 AC-004 / F-005 AC-002
request:
  body:
    html: { type: string, required: true }
    format: { type: "'landscape-900x383'|'square-900x900'", required: true }
response:
  schema:
    jobId: { type: "string (uuid)" }

# get_job
tool: get_job
module: M-009
maps_to: F-013 AC-004
request:
  body:
    jobId: { type: "string (uuid)", required: true }
response:
  schema:
    jobId: { type: "string (uuid)" }
    state: { type: "'pending'|'running'|'succeeded'|'failed'" }
    progress: { type: number, desc: "0..1" }
    result: { type: "unknown | null", desc: "succeeded 时为对应任务结果（URL / mediaId / 二进制引用）" }
    error: { type: "{code, message} | null" }

# get_ruleset_version
tool: get_ruleset_version
module: M-009
maps_to: F-013 AC-002 / F-007 AC-003
request: {}
response:
  schema: |
    z.object({
      versionTriple: z.object({
        coreVersion: z.string(),      // semver
        themeVersion: z.string(),     // semver
        rulesetVersion: z.string(),   // semver
      }),
      ruleCount: z.number().int().min(42),   // 当前规则集生效规则数（≥42）
      schemaVersion: z.string(),             // Public Tool Schema 版本（semver）
      builtAt: z.string().datetime(),        // 规则集 manifest 构建时间（ISO 8601）；不参与 F-013 AC-001 字节级一致断言，快照回归测试需 redact
    })
```

> 说明：API-016 是 6 个相关 Tool 的合并条目（4 个长任务 + `get_job` + `get_ruleset_version`）；与 §3.1 API-001..API-015 + API-033 合并后 Tool 总数为 **23**（**19 同步 + 4 异步**）。同步 19 = API-001..API-015（含 API-009 拆 `list_tokens` + `describe_token` 共 16 同步）+ `get_job` + `get_ruleset_version`（2 同步轮询入口）+ `describe_template`（API-033，1 同步）；异步 4 = `upload_image` + `upload_to_wechat_asset` + `export_long_image` + `export_cover`。编号在物料化时可按需展开为 API-016a..API-016f。所有长任务 Tool 与 `get_job` 的 `jobId` 字段统一 `z.string().uuid()`，与 Relay REST API-017/018/019 及 E-008 主键约束对齐。

#### API-033: describe_template

```yaml
tool: describe_template
module: M-009
maps_to: F-013 AC-002 / F-008 AC-004
desc: "返回 (themeId, templateId) 复合键对应的 template 预填 Markdown、白名单覆盖统计与 mdast 结构摘要；供 LLM Agent 在主题模板市场场景下取得预填起点。"
request:
  body:
    themeId: { type: string, required: true, desc: "主题 ID，须命中 list_themes 返回值" }
    templateId: { type: string, required: true, desc: "主题命名空间下的 templateId，须命中 describe_theme.templates 返回值" }
response:
  schema:
    markdown: { type: string, desc: "template 预填 Markdown 源码（含 frontmatter，已绑定 themeId）" }
    coveredElements:
      baseElements: { type: "string[]", desc: "命中的基础元素白名单子集（H1..H6 / paragraph / list / blockquote / link / code-block / hr / image / table 共 9 项）" }
      coreBlocks: { type: "string[]", desc: "命中的核心 Block 容器（callout / card / steps / quote / pull-quote / compare 等 ≥ 6 种）" }
    mdastSummary:
      nodeCount: { type: number, desc: "mdast 节点总数" }
      blockCount: { type: number, desc: "块级节点数（heading / paragraph / list / blockquote / code / etc.）" }
      markCount: { type: number, desc: "行内 mark 节点数（strong / emphasis / link / inlineCode / directive 等）" }
    dependencies:
      tokens: { type: "TokenPath[]", desc: "该 template 渲染时消费的 token 路径（来自模板中 Block / Mark 的 tokenDependencies 汇总）" }
      blocks: { type: "BlockId[]", desc: "该 template 引用的 Block ID 列表" }
  errors:
    ThemeNotFound: { code: "E_THEME_NOT_FOUND", http: 404, desc: "themeId 不存在于主题注册中心" }
    TemplateNotFound: { code: "E_TEMPLATE_NOT_FOUND", http: 404, desc: "templateId 在该 themeId 命名空间下不存在" }
zod_schema: |
  // request
  const DescribeTemplateRequestSchema = z.object({
    themeId: z.string(),
    templateId: z.string(),
  });
  // response
  const DescribeTemplateResponseSchema = z.object({
    markdown: z.string(),
    coveredElements: z.object({
      baseElements: z.array(z.string()),
      coreBlocks: z.array(z.string()),
    }),
    mdastSummary: z.object({
      nodeCount: z.number().int().nonnegative(),
      blockCount: z.number().int().nonnegative(),
      markCount: z.number().int().nonnegative(),
    }),
    dependencies: z.object({
      tokens: z.array(z.string()),
      blocks: z.array(z.string()),
    }),
  });
```

### 3.2 Relay REST/SSE 接口 (API-017..API-021)

#### API-017: POST /api/v1/images/upload

```yaml
path: /api/v1/images/upload
method: POST
module: M-010
maps_to: F-006 / F-013 AC-004
auth: API key (Bearer Header)
request:
  headers:
    Authorization: { type: string, required: true, desc: "Bearer <api-key>" }
    Idempotency-Key: { type: string, required: false, desc: "见 §3 公共 Idempotency-Key 约定" }
  body (multipart):
    file: { type: binary, required: true, desc: "≤ 10MB；上传后由 image/preprocess 做 EXIF 剥离 + 压缩 + 宽度规整 ≤ 1080px" }
    target: { type: "'qiniu'|'oss'|'cos'|'smms'|'local'|'custom'", required: true }
    customConfig: { type: "Record<string, unknown>", required: false, desc: "target='custom' 时承载自定义图床配置" }
zod_schema: |
  z.object({
    file: z.instanceof(File),
    target: z.enum(['qiniu', 'oss', 'cos', 'smms', 'local', 'custom']),
    customConfig: z.record(z.unknown()).optional(),
  })
response:
  202:
    schema: |
      z.object({ jobId: z.string().uuid() })
  400: { schema: ErrorResponse, desc: "E_SCHEMA — 入参校验失败" }
  401: { schema: ErrorResponse, desc: "E_AUTH — API key 无效" }
  409: { schema: ErrorResponse, desc: "E_IDEMPOTENCY_CONFLICT — Idempotency-Key 与既有 input hash 冲突" }
  413: { schema: ErrorResponse, desc: "E_PAYLOAD_TOO_LARGE — 文件超过 10MB" }
  429: { schema: ErrorResponse, desc: "E_QUOTA_EXCEEDED — 超出 per-key 配额" }
```

#### API-018: POST /api/v1/wechat-assets/upload

```yaml
path: /api/v1/wechat-assets/upload
method: POST
module: M-010
maps_to: F-005 AC-003
auth: API key (Bearer Header)
request:
  headers:
    Authorization: { type: string, required: true }
    Idempotency-Key: { type: string, required: false }
  body:
    imageUrl: { type: string, required: true, desc: "通常来自 /images/upload 上传结果" }
    type: { type: "'image'|'voice'|'video'|'thumb'", required: true }
response:
  202:
    schema: |
      z.object({
        jobId: z.string().uuid(),
        statusUrl: z.string().url(),  // 形如 /api/v1/jobs/{jobId}
      })
  401: { schema: ErrorResponse }
  502: { schema: ErrorResponse, desc: "微信素材库 API 上游错误" }
```

#### API-019: POST /api/v1/renders/long-image  &  POST /api/v1/renders/cover

```yaml
# 长图
path: /api/v1/renders/long-image
method: POST
module: M-010
maps_to: F-005 AC-001
auth: API key
request:
  body:
    html: { type: string, required: true }
    viewportWidth: { type: number, required: false }
response:
  202:
    schema: |
      z.object({
        jobId: z.string().uuid(),
        statusUrl: z.string().url(),
      })

# 封面
path: /api/v1/renders/cover
method: POST
module: M-010
maps_to: F-005 AC-002
auth: API key
request:
  body:
    html: { type: string, required: true }
    format: { type: "'landscape-900x383'|'square-900x900'", required: true }
response:
  202:
    schema: |
      z.object({
        jobId: z.string().uuid(),
        statusUrl: z.string().url(),
      })
```

#### API-020: GET /api/v1/jobs/:jobId  &  SSE /api/v1/jobs/:jobId/events

```yaml
# 轮询
path: /api/v1/jobs/{jobId}
method: GET
module: M-010
maps_to: F-013 AC-004
auth: API key
request:
  path:
    jobId: { type: string, required: true, desc: "uuid v4" }
response:
  200:
    schema: |
      z.object({
        jobId: z.string().uuid(),
        state: z.enum(['pending', 'running', 'succeeded', 'failed']),
        kind: z.enum(['image-upload', 'wechat-asset-upload', 'long-image-render', 'cover-render']),
        progress: z.number().min(0).max(1),
        result: z.unknown().nullable(),
        error: z.object({ code: z.string(), message: z.string() }).nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
  401: { schema: ErrorResponse, desc: "E_AUTH" }
  403: { schema: ErrorResponse, desc: "E_PERMISSION_DENIED — jobId 不属于该 apiKeyId" }
  404: { schema: ErrorResponse, desc: "E_NOT_FOUND" }

# 推送
path: /api/v1/jobs/{jobId}/events
method: GET (SSE)
transport: text/event-stream (Hono streamSSE)
module: M-010 (job/sse-bridge)
auth: API key
request:
  path:
    jobId: { type: string, required: true }
events:
  - { event: "progress", data_schema: "z.object({ progress: z.number().min(0).max(1) })" }
  - { event: "succeeded", data_schema: "z.object({ result: z.unknown() })" }
  - { event: "failed", data_schema: "z.object({ error: z.object({ code: z.string(), message: z.string() }) })" }
behavior:
  - "Hono streamSSE 桥接 BullMQ QueueEvents；连接建立时若 job 已终结直接推送一次终态事件后关闭"
  - "客户端断线由 Hono streamSSE 自动重连（Last-Event-ID 续传）"
```

#### API-021: POST /api/v1/mcp (HTTP/SSE transport)

```yaml
path: /api/v1/mcp
method: POST (HTTP) / GET (SSE upgrade)
module: M-009 (transport) + M-010 (共部署)
maps_to: F-013 AC-003
auth: API key (Bearer Header)
desc: "MCP 协议 HTTP/SSE transport 端点，与 stdio transport 共享同一 Tool 路由表 (M-009 tools/router)"
request:
  headers:
    Authorization: { type: string, required: true }
  body (POST):
    jsonRpcMessage: { type: object, required: true, desc: "MCP JSON-RPC 协议消息" }
response:
  200:
    desc: |
      MCP JSON-RPC 协议响应（POST）或 SSE 流（GET，`Content-Type: text/event-stream`）
    schema: |
      // 单条 JSON-RPC 消息（POST 响应 / SSE event data）按 MCP 协议规范二选一：
      const McpResponse = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('result'),
          jsonrpc: z.literal('2.0'),
          id: z.union([z.string(), z.number()]),
          result: z.unknown(),  // Tool 特定结果
        }),
        z.object({
          type: z.literal('error'),
          jsonrpc: z.literal('2.0'),
          id: z.union([z.string(), z.number(), z.null()]),
          error: z.object({ code: z.number(), message: z.string(), data: z.unknown().optional() }),
        }),
      ]);
    sse_event_format: |
      // SSE 流每条 event:
      // event: message
      // data: <McpResponse JSON>
      // id: <monotonic increasing int>
  401: { schema: ErrorResponse }
  429: { schema: ErrorResponse }
```

### 3.3 CLI 命令契约 (API-022..API-025)

#### API-022: wechat-flow init

```yaml
cli_command: wechat-flow init <name>
module: M-011
maps_to: F-010 AC-003
flags:
  --template: { type: "'plugin'|'theme'", required: true, desc: "选择脚手架骨架" }
  --dir: { type: string, required: false, desc: "目标目录，缺省 ./<name>" }
exits:
  0: "成功生成骨架"
  1: "目标目录非空或参数无效"
```

#### API-023: wechat-flow dev

```yaml
cli_command: wechat-flow dev
module: M-011
maps_to: F-010 AC-003 (热重载)
flags:
  --port: { type: number, required: false, desc: "缺省 5173" }
  --pack: { type: string, required: false, desc: "指向 pack 根目录，缺省 cwd" }
behavior: "启动 Vite middleware + HMR，pack 文件变更触发 live-reload，控制台输出 manifest+schema 校验诊断"
```

#### API-024: wechat-flow validate

```yaml
cli_command: wechat-flow validate
module: M-011
maps_to: F-010 AC-002 / AC-005 / AC-006 / F-011 AC-003
flags:
  --pack: { type: string, required: false, desc: "缺省 cwd" }
  --strict-theme: { type: boolean, required: false, desc: "对主题强制 9 维守护（含内置 template 完整性）" }
exits:
  0: "全部校验通过"
  1: "至少一项校验失败（manifest / schema / variant 申报 / 主题守护 9 维）"
stdout: "结构化 JSON 诊断 + 人类可读 summary"
```

#### API-025: wechat-flow publish & 渲染壳命令

```yaml
# publish
cli_command: wechat-flow publish
module: M-011
maps_to: F-010 AC-003
flags:
  --registry: { type: string, required: false, desc: "缺省 npm public 或 .npmrc 配置" }
  --tag: { type: string, required: false, desc: "缺省 latest" }
behavior: "publish 前自动 invoke validate，失败阻断发布"

# render / copy / export — Tool 契约的 CLI 壳 (F-013 AC-003)
cli_commands:
  - "wechat-flow render <markdown-file> [--theme <id>] [--out <html-file>]"
  - "wechat-flow copy <markdown-file> [--theme <id>]"
  - "wechat-flow export <markdown-file> --format <html|long-image|cover-landscape|cover-square>"
maps_to: F-013 AC-003
behavior: "复用 M-008 应用层 use case，本地执行（render/copy）或经 Relay 提交 job（long-image/cover）"
```

### 3.4 Yjs 同步接口 (API-026..API-027)

#### API-026: WS /api/v1/yjs/:docId

```yaml
path: /api/v1/yjs/{docId}
method: GET (WebSocket upgrade)
transport: WebSocket (y-websocket protocol)
module: M-010 (y-websocket server) + M-013 (浏览器端 WebsocketProvider)
maps_to: F-012 AC-001 / AC-002 / AC-003 / AC-004
auth: API key (Bearer Header on upgrade request) + docId ACL（仅 docId 所属用户/团队 apiKeyId 可连）
request:
  headers:
    Authorization: { type: string, required: true, desc: "Bearer <api-key>" }
  path:
    docId: { type: string, required: true, desc: "Document.id (uuid v4)" }
protocol:
  desc: "y-websocket 标准二进制帧协议：sync step 1 (state vector) / sync step 2 (full update) / sync step 3 (update diff) / awareness update / awareness query"
  message_types:
    - { type: 0, name: "sync", desc: "Y.Doc state 同步" }
    - { type: 1, name: "awareness", desc: "用户光标/选区/在线状态广播" }
    - { type: 3, name: "auth", desc: "服务端通过 awareness 通知客户端鉴权失败" }
response:
  101: { desc: "WebSocket upgrade 成功" }
  401: { schema: ErrorResponse, desc: "API key 无效" }
  403: { schema: ErrorResponse, desc: "无权访问该 docId" }
  404: { schema: ErrorResponse, desc: "docId 不存在" }
errors:
  E_AUTH: "API key 无效"
  E_PERMISSION_DENIED: "无权访问该 docId"
  E_DOC_NOT_FOUND: "docId 不存在"
behavior:
  - "服务端维护 Y.Doc 内存副本；订阅 Redis pub/sub channel `yjs:awareness:{docId}` 跨进程广播 awareness"
  - "客户端连接后立即收到当前 Y.Doc 全量 state（sync step 2）"
  - "服务端节流 snapshot：每 60s 或累计 100 ops 调用 Y.encodeStateAsUpdate 写入 E-009 YDocSnapshot"
  - "客户端断线 30s 后服务端清理其 awareness 条目"
```

#### API-027: GET/POST /api/v1/yjs/:docId/snapshots

```yaml
# 列出历史快照
path: /api/v1/yjs/{docId}/snapshots
method: GET
module: M-010
maps_to: F-012 AC-003 (版本历史)
auth: API key
request:
  path:
    docId: { type: string, required: true }
  query:
    limit: { type: number, required: false, desc: "缺省 20，最大 100" }
    before: { type: string, required: false, desc: "ISO datetime，仅列此前快照" }
response:
  200:
    schema: |
      z.object({
        snapshots: z.array(z.object({
          snapshotId: z.string(),       // uuid v4
          docId: z.string(),
          createdAt: z.string(),        // ISO datetime
          opsCount: z.number(),         // 该快照覆盖的累计 ops
          sizeBytes: z.number(),
        })),
      })
  401: { schema: ErrorResponse }
  403: { schema: ErrorResponse }

# 恢复到指定快照
path: /api/v1/yjs/{docId}/snapshots/{snapshotId}/restore
method: POST
module: M-010
maps_to: F-012 AC-003 (回滚)
auth: API key
request:
  headers:
    Idempotency-Key: { type: string, required: false }
  path:
    docId: { type: string, required: true }
    snapshotId: { type: string, required: true }
response:
  200:
    schema: |
      z.object({
        newSnapshotId: z.string(),     // restore 操作产生的新快照
        restoredFromSnapshotId: z.string(),
        restoredAt: z.string(),
      })
  404: { schema: ErrorResponse, desc: "docId 或 snapshotId 不存在" }
behavior:
  - "restore 不删除历史快照，而是把目标快照作为新 update 应用到当前 Y.Doc 顶上，保留完整 op-log"
  - "广播 sync update 到所有在线 WebsocketProvider"
```

### 3.5 Admin API key 管理 (API-028..API-031)

> **共享 ScopeSchema**（在 `@wechat-flow/contracts` 内定义，本节 API-028 / API-029 引用）：
> ```ts
> export const ScopeSchema = z.string().regex(
>   /^(?:admin|user(?:,(?:render|upload|wechat-asset|sync))*)$/,
>   "scope 必须是 'admin' 或 'user' 可选拼接细粒度能力（render|upload|wechat-asset|sync），逗号分隔"
> );
> // 合法示例：'admin' | 'user' | 'user,render' | 'user,render,upload,wechat-asset'
> // admin 是最高权限不附加细粒度；细粒度仅缩窄 user key 可触达的子能力
> ```
> 鉴权层粗粒度判定（admin vs user）通过 `scope.startsWith('admin') ? 'admin' : 'user'` 实现；M-009 `auth/scope-guard.ts` 同时校验细粒度对 Tool 调用的可达性。
>
> **鉴权基线**（适用 API-028..API-031）：
> - 必须 Bearer `<admin-api-key>` 且该 key 对应 E-010 行 `scope='admin'`
> - 必须携带 `X-Admin-Request: 1` 自定义 header（防 CSRF / 误触发）
> - 来源 IP 须命中环境变量 `ADMIN_IP_ALLOWLIST` 白名单；缺省仅允许 loopback (`127.0.0.1` / `::1`)
> - 所有 admin 调用写审计日志（actor=apiKeyId, action, target, ts），日志通过 §5.5 审计追溯通道持久化
> - admin key 与 user key 在 E-010 表用 `scope` 字段区分；admin scope 不可调 23 个 Tool（M-009 `auth/scope-guard.ts` 拦截）

#### API-028: POST /api/v1/admin/api-keys

```yaml
path: /api/v1/admin/api-keys
method: POST
module: M-010 (admin/api-keys.ts)
maps_to: F-013 AC-004
auth: admin API key
request:
  headers:
    Authorization: { type: string, required: true, desc: "Bearer <admin-api-key>" }
    X-Admin-Request: { type: string, required: true, desc: "固定值 1" }
  body:
    schema: |
      z.object({
        name: z.string().min(1).max(100),                        // 人类可读名称
        scope: ScopeSchema,                                      // 'admin' | 'user' | 'user,render,...' 细粒度
        quotaConfig: QuotaConfigSchema.optional(),               // 字段定义见 §3 公共约定
        expiresAt: z.string().datetime().optional(),             // 缺省永不过期
        description: z.string().max(500).optional(),
      })
response:
  201:
    schema: |
      z.object({
        keyId: z.string().uuid(),
        key: z.string(),                  // 明文 key，仅本次响应返回，之后只能哈希查询
        name: z.string(),
        scope: ScopeSchema,
        quotaConfig: QuotaConfigSchema,
        createdAt: z.string().datetime(),
        expiresAt: z.string().datetime().nullable(),
      })
  401: { schema: ErrorResponse, desc: "E_AUTH — admin key 无效" }
  403: { schema: ErrorResponse, desc: "E_PERMISSION_DENIED — 非 admin scope / IP 未命中白名单 / X-Admin-Request 缺失" }
  400: { schema: ErrorResponse, desc: "E_SCHEMA" }
```

#### API-029: GET /api/v1/admin/api-keys

```yaml
path: /api/v1/admin/api-keys
method: GET
module: M-010 (admin/api-keys.ts)
maps_to: F-013 AC-004
auth: admin API key
request:
  headers:
    Authorization: { type: string, required: true }
    X-Admin-Request: { type: string, required: true }
  query:
    scope: { type: "'user'|'admin'", required: false, desc: "按 scope 过滤" }
    status: { type: "'active'|'revoked'|'expired'|'all'", required: false, desc: "缺省 'active'" }
    limit: { type: number, required: false, desc: "1..200，缺省 50" }
    cursor: { type: string, required: false, desc: "上一页返回的 nextCursor" }
response:
  200:
    schema: |
      z.object({
        keys: z.array(z.object({
          keyId: z.string().uuid(),
          name: z.string(),
          scope: ScopeSchema,
          status: z.enum(['active', 'revoked', 'expired']),
          quotaConfig: QuotaConfigSchema,
          createdAt: z.string().datetime(),
          lastUsedAt: z.string().datetime().nullable(),
          expiresAt: z.string().datetime().nullable(),
          revokedAt: z.string().datetime().nullable(),
          // 不返回明文 key 与哈希
        })),
        nextCursor: z.string().nullable(),
      })
  401: { schema: ErrorResponse }
  403: { schema: ErrorResponse }
```

#### API-030: PATCH /api/v1/admin/api-keys/:keyId/rotate

```yaml
path: /api/v1/admin/api-keys/{keyId}/rotate
method: PATCH
module: M-010 (admin/api-keys.ts)
maps_to: F-013 AC-004
auth: admin API key
desc: "生成新 key 哈希并标旧 key 进入 24h grace 期；grace 期内新旧 key 均可鉴权通过，过期后旧 key 自动 revoke"
request:
  headers:
    Authorization: { type: string, required: true }
    X-Admin-Request: { type: string, required: true }
    Idempotency-Key: { type: string, required: false }
  path:
    keyId: { type: string, required: true }
  body:
    schema: |
      z.object({
        graceHours: z.number().int().min(0).max(168).default(24),  // grace 期小时数，0 = 立即失效
      })
response:
  200:
    schema: |
      z.object({
        keyId: z.string().uuid(),
        newKey: z.string(),                       // 新明文 key，仅本次返回
        graceUntil: z.string().datetime(),         // grace 期截止时间
        rotatedAt: z.string().datetime(),
      })
  401: { schema: ErrorResponse }
  403: { schema: ErrorResponse }
  404: { schema: ErrorResponse, desc: "E_NOT_FOUND — keyId 不存在" }
  409: { schema: ErrorResponse, desc: "E_CONFLICT — 该 key 已被 revoke" }
```

#### API-031: DELETE /api/v1/admin/api-keys/:keyId

```yaml
path: /api/v1/admin/api-keys/{keyId}
method: DELETE
module: M-010 (admin/api-keys.ts)
maps_to: F-013 AC-004
auth: admin API key
desc: "软删除：标 E-010.revokedAt = now()；不物理删除（保留审计可追溯）"
request:
  headers:
    Authorization: { type: string, required: true }
    X-Admin-Request: { type: string, required: true }
  path:
    keyId: { type: string, required: true }
response:
  204:
    desc: "吊销成功，无 body"
  401: { schema: ErrorResponse }
  403: { schema: ErrorResponse }
  404: { schema: ErrorResponse, desc: "E_NOT_FOUND — keyId 不存在" }
  409: { schema: ErrorResponse, desc: "E_CONFLICT — 该 key 已被 revoke" }
```

### 3.6 Editor Session 鉴权 (API-032)

> Editor SPA 部署于 CDN，**不持有任何长期 API key**；调用 Relay 受保护端点（API-017/018/019/020 等）须先经此端点交换短期 JWT。JWT 生命周期 ≤15min，过期前 1min 客户端主动续期；JWT 在 `Authorization: Bearer` header 传递，与 API key 共用同一鉴权中间件（中间件按 `iss` 字段区分）。

#### API-032: POST /api/v1/editor/session

```yaml
path: /api/v1/editor/session
method: POST
module: M-010 (中继服务)
maps_to: PRD §3.2 凭据隔离 / F-006 / F-005 P0 写作者路径
desc: "Editor SPA 交换短期 JWT 的唯一入口；支持两种 bootstrap：用户已登录账户的 OAuth token 兑换，或匿名 session（按 IP + device fingerprint 限流，调用 Tool 不可达 admin scope）"
auth: 见 request.body.bootstrap
request:
  headers:
    X-Editor-Origin: { type: string, required: true, desc: "Editor SPA origin（与 CORS 白名单比对）" }
  body:
    schema: |
      z.discriminatedUnion('bootstrap', [
        z.object({
          bootstrap: z.literal('oauth'),
          provider: z.enum(['github', 'wechat-mp', 'custom']),
          oauthToken: z.string(),               // 上游 OAuth 颁发的 access token
        }),
        z.object({
          bootstrap: z.literal('anonymous'),
          deviceFingerprint: z.string().min(16).max(128),  // 客户端生成的稳定 fingerprint
          captchaToken: z.string().optional(),  // 反滥用，可选 hCaptcha / Turnstile token
        }),
      ])
response:
  200:
    schema: |
      z.object({
        sessionJwt: z.string(),                  // 短期 JWT，HS256 签名，载荷含 iss='editor', sub=ownerRef, scope, exp, iat
        expiresAt: z.string().datetime(),        // ISO datetime，≤ now + 15min
        refreshUntil: z.string().datetime(),     // 允许续期窗口（exp 前 1min 起）
        scope: ScopeSchema,                      // 通常为 'user,render,upload'（不含 wechat-asset、不含 admin）
        sessionId: z.string().uuid(),            // 服务端 audit 追溯
      })
  400: { schema: ErrorResponse, desc: "E_SCHEMA — bootstrap 入参不合法" }
  401: { schema: ErrorResponse, desc: "E_AUTH — oauth token 验证失败" }
  403: { schema: ErrorResponse, desc: "E_PERMISSION_DENIED — origin 不在白名单 / IP 触发反滥用" }
  429: { schema: ErrorResponse, desc: "E_QUOTA_EXCEEDED — 匿名 session 限流" }
behavior:
  - "JWT 载荷 `{ iss:'editor', sub:ownerRef, scope, exp, iat, sessionId }`；HS256 签名，密钥从 Relay 环境变量 EDITOR_JWT_SECRET 读取"
  - "续期路径：客户端在 exp 前 1min 调用 POST /api/v1/editor/session/refresh（Authorization: Bearer 旧 JWT）；服务端校验 sessionId 未吊销后颁发新 JWT"
  - "M-009 / M-010 鉴权中间件统一按 Bearer token 解析；JWT `iss='editor'` 时走 session 校验路径，API key（长期）走原 E-010 哈希校验路径"
  - "AppID/AppSecret / 图床 token 在所有 session 路径下均不下发到浏览器；wechat-asset scope 仅 user/admin key 可携带，editor session 不可达 API-018"
```

> **API-017..020 鉴权语义补充**: `Authorization: Bearer <token>` 中 token 可为 (a) long-lived API key（CLI / MCP / 后端调用方）或 (b) Editor session JWT（仅 Editor SPA）。两类 token 通过 JWT header `iss` 字段或非 JWT 长度区分；M-009 / M-010 中间件统一接入 `auth/token-resolver.ts`。
