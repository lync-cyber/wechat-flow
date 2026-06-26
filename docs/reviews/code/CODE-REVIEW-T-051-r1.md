---
id: "code-review-T-051-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-051"]
---

# Code Review: T-051 — M-009 HTTP/SSE transport + admin API key 管理端点

Layer 1 delegated to hook（项目已配置 PostToolUse biome lint hook）

**Verdict**: needs_revision

---

## 问题列表

### [R-001] HIGH: admin-guard 缺省时允许所有 IP，违背 arch 规定的 loopback 默认白名单

- **category**: security
- **root_cause**: self-caused
- **描述**: `arch#§2.M-010` 明确规定 `auth/admin-guard.ts` 的 IP 白名单"缺省时仅允许 loopback"（即 127.0.0.1/::1）。而实现中 `allowedIps` 为空/undefined 时直接 `跳过 IP 校验`，允许所有来源访问 admin 端点（见 admin-guard.ts:31-34）。这意味着若部署者未配置 `ADMIN_IP_ALLOWLIST`，admin 端点对任意网络 IP 开放，仅剩 X-Admin-Request header 作为唯一防线。
- **建议**: 在 `createAdminGuard` 中将 `allowedIps` 默认值设为 `["127.0.0.1", "::1"]`，而非"空时跳过检查"。若需放开所有 IP 应显式传入 `allowedIps: []` 并附 opt-in 标志（如 `allowAllIps: true`），不得以空列表静默绕过。

---

### [R-002] HIGH: admin-guard 缺少 Bearer token scope 校验，鉴权基线不完整

- **category**: security
- **root_cause**: self-caused
- **描述**: `arch#§2.M-010` 描述 admin-guard 的鉴权基线为四层：(1) Bearer key 哈希命中 E-010.scope='admin' 行；(2) X-Admin-Request: 1 header；(3) IP 白名单；(4) 审计日志。当前实现只校验了 (2) X-Admin-Request header 和 (3) IP 白名单（且默认行为有误，见 R-001），完全省略了 (1) Bearer token 哈希校验。任何持有 X-Admin-Request: 1 header（且 IP 命中）的请求都可调用 admin 端点，无需任何 API key。结合 R-001 的 IP 白名单缺省问题，当前默认配置下 admin 端点对整个网络完全开放，仅凭一个自定义 header 即可访问。
- **建议**: 在 middleware 中补充 Bearer token 解析：读取 `Authorization: Bearer <key>` → 计算 SHA-256 哈希 → 查询 scope='admin' 的 key 记录（可通过 deps 注入 `lookupAdminKey: (hash: string) => boolean`）。缺少或无效 token 返回 401 E_AUTH_REQUIRED，scope 不匹配返回 403 E_FORBIDDEN。

---

### [R-003] MEDIUM: HTTP transport 的 `scope: "user"` 硬编码绕过鉴权，未授权工具调用面存在

- **category**: security
- **root_cause**: self-caused
- **描述**: `http-sse.ts:48` 传入 `{ scope: "user" }` 作为硬编码的 `ApiKeyRecord`，`guardUserScope` 对 `scope === "user"` 直接放行（scope-guard.ts:9-11）。这意味着 HTTP transport 端点无需任何 API key 即可调用全部 24 个 Tool，完全跳过了 arch §5.3 定义的 user-level API key 鉴权。虽然任务说明指出"auth is the caller's responsibility at the transport layer"，但 arch 设计中 M-009 明确要求"API key + per-key 配额"，当前状态使所有 Tool 对无认证 HTTP 请求开放。
- **建议**: HTTP transport 应从请求头读取 Bearer token 并通过 token-resolver 校验，未通过者返回 401。若当前 wiring backlog 阶段确实延迟实现，应在代码中用 `// cataforge: wiring-placeholder` 明确标注并在 backlog 登记，而非以注释说明"auth is the caller's responsibility"后直接注入 user scope。

---

### [R-004] MEDIUM: API key 哈希无加盐，存在彩虹表攻击风险

- **category**: security
- **root_cause**: self-caused
- **描述**: `api-keys.ts:23-25` 中 `hashKey` 函数对原始 key 直接做 SHA-256，无 salt。虽然 `wf_` + 24 字节随机数（48 hex chars）的 key 空间已非常大，暴力枚举成本极高，但无盐哈希若数据库泄漏后无法防止事后彩虹表或预计算攻击，也不符合 OWASP 密钥存储建议（应使用 HMAC 或 bcrypt/scrypt/argon2）。arch 文档描述为 `crypto.subtle.digest('SHA-256')` 无加盐，设计层已未要求，但最佳实践应使用 HMAC-SHA256 + 应用级固定密钥（PEPPER）。
- **建议**: 改用 `createHmac('sha256', process.env.API_KEY_PEPPER ?? '').update(raw).digest('hex')`，或记录 `[ASSUMPTION]` 说明当前无盐 SHA-256 是已接受的权衡（key 随机性足够高，无盐在此熵级别下可接受），使设计决策可追溯。

---

### [R-005] MEDIUM: `audit` 的 `actor` 字段固定为字符串 `"admin"`，与 arch 要求的 `actor: apiKeyId` 不符

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `api-keys.ts:53` 中 `guard.audit({ actor: "admin", ... })`，而 `arch#§2.M-010` 规定审计日志的 `actor=apiKeyId`（即实际发起请求的 admin key ID）。当前实现 actor 永远为字面字符串 `"admin"`，无法追溯是哪个 admin key 执行了操作，违背审计可追溯性要求。
- **建议**: admin-guard 的 middleware 在校验 Bearer token 后，应将解析出的 `apiKeyId`（或 key 哈希摘要）存入 Hono context（如 `c.set('adminKeyId', id)`），post-auth handler 中通过 `c.get('adminKeyId')` 填充 `actor`。

---

### [R-006] MEDIUM: 缺少 PATCH（轮换）和 DELETE（吊销）端点，ac-coverage 对 arch 接口定义不完整

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `arch#§2.M-010` 规定 `admin/api-keys.ts` 应承载 POST 创建 / GET 列出 / PATCH 轮换 / DELETE 吊销四个端点（对应 API-028..API-031）。当前实现只实现了 POST 和 GET，PATCH 轮换和 DELETE 吊销完全缺失，且任务 AC 未包含这两个端点（AC 仅覆盖 AC-001~AC-004），说明任务拆分未对齐 arch 接口定义。
- **建议**: 若 PATCH/DELETE 属于后续 Sprint 任务，应在代码中留 stub 并添加 `// cataforge: wiring-placeholder` 及对应的 backlog task ID 标注；或在 sprint-review 时登记为已知缺口。当前直接缺失且无声明，属于未跟踪的范围偏移。

---

### [R-007] LOW: `resolveClientIp` 信任 `X-Forwarded-For` 第一个值，可被伪造

- **category**: security
- **root_cause**: self-caused
- **描述**: `admin-guard.ts:23-25` 解析客户端 IP 时直接取 `X-Forwarded-For` 的第一项。在无受信代理前置的部署中，攻击者可伪造 `X-Forwarded-For: 127.0.0.1` header 绕过 IP 白名单。OWASP 建议取最后一个可信代理添加的 IP（即从右向左数第一个非私有地址），或使用 `X-Real-IP`（由受信反向代理覆写）。
- **建议**: 若 IP 白名单是 security boundary（而非仅辅助过滤），应从右侧解析 XFF 或使用 Hono 的 `c.req.raw.socket?.remoteAddress`（原始套接字地址）。若当前仅作 defense-in-depth 层，标注 `[ASSUMPTION]` 说明已知 IP 欺骗风险及前置受信代理的部署要求。

---

### [R-008] LOW: transport-http 测试未覆盖空 body 场景

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `http-sse.ts:42` 中对空 body（`raw.length === 0`）有专门处理（`args = {}`），但 `transport-http.test.ts` 未测试 POST 空 body 情况。缺乏此用例时，该分支是否正确传参给 tool handler 无法验证。
- **建议**: 补充空 body 测试：POST `/mcp/tools/render_markdown` 无 body（或 Content-Length: 0），验证 handler 收到 `{}` 后返回有效错误或降级响应而非 JSON parse 崩溃。

---

### [R-009] LOW: 内存 store 单例问题 — 注入 store 默认值为 Map 实例而非工厂

- **category**: structure
- **root_cause**: self-caused
- **描述**: `api-keys.ts:28` 中 `store = new Map<string, ApiKeyEntry>()` 作为参数默认值。在 TypeScript/JavaScript 中，参数默认值在函数定义时只求值一次（ES6 默认参数的行为），但对于 `Map`，每次调用 `createAdminApiKeysApp()` 而不传 `store` 时都会创建新 Map 实例——这点实际上是正确的（与 Python 不同）。然而，若 `deps` 是 `AdminApiKeysDeps` 接口的一部分且 store 在解构时求值，当前写法可能在某些 bundler 下行为不同。更关键的是，这个 Map 是纯内存存储，进程重启后 key 数据全部丢失，而 arch 定义了 E-010 ApiKey 数据库表用于持久化。当前未使用持久化，应明确标注为 wiring placeholder。
- **建议**: 在代码注释或 backlog 中明确标注当前 Map 为开发期占位，正式实现需对接 E-010 数据库，避免在生产中误用内存存储。

---

## Verdict

**needs_revision**

存在 2 个 HIGH 问题（R-001 IP 白名单缺省行为与 arch 相悖、R-002 Bearer token scope 校验完全缺失），共同导致 admin 端点在默认配置下仅凭 X-Admin-Request: 1 自定义 header 即可访问，安全基线严重不足。

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 2 (R-001, R-002) |
| MEDIUM | 4 (R-003, R-004, R-005, R-006) |
| LOW | 3 (R-007, R-008, R-009) |
