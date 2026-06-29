---
id: "code-review-T-125-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-125"]
---

# CODE-REVIEW T-125 r1 — relay admin 路由挂载 + mcp-server HTTP 进程入口

Layer 1 delegated to hook（PostToolUse biome hook 已配置，编码阶段实时 lint，0 error）

## 审查范围

| 文件 | 说明 |
|------|------|
| `apps/relay/src/index.ts` | createApp 加 adminDeps 挂 /api/v1/admin 路由，去 501 |
| `apps/relay/src/main.ts` | 构造内存 admin guard + adminApp 注入 createApp |
| `apps/mcp-server/src/transport/http-sse.ts` | scope !== "user" → 403 E_FORBIDDEN |
| `apps/mcp-server/src/transport/http-entry.ts` | 新建，startHttpTransport 进程入口 |
| `apps/mcp-server/src/index.ts` | re-export |
| `tests/relay/admin-route-wiring.test.ts` | admin 路由接线测试 |
| `tests/mcp-server/http-transport-token.test.ts` | HTTP transport token scope 测试 |

---

## 问题列表

### [R-001] HIGH: 生产 admin guard 未启用 Bearer token 验证层（Layer 1 静默跳过）

- **category**: security
- **root_cause**: self-caused
- **描述**: `apps/relay/src/main.ts` 中 `createAdminGuard` 调用未传 `lookupAdminKey`，导致 admin-guard 三层防御的 Layer 1（Bearer token → HMAC hash → admin scope 校验）整体跳过。`createAdminGuard` 的 Layer 1 通过 `if (lookupAdminKey) { ... }` 条件保护，缺失时无论 Authorization header 是否存在/合法均不校验。生产环境对 `/api/v1/admin/api-keys` 的任何请求只需：① 来自 localhost（IP 白名单默认通过）② 携带 `X-Admin-Request: 1` 即可成功创建/旋转/撤销 API key，无需有效的 admin Bearer token。这使 Bearer 认证层在生产路径上完全失效。
- **建议**: 在 `main.ts` 初始化 `lookupAdminKey`——至少提供一个内存查找函数，从 `adminApp` 共享的同一 `store` 中按哈希比对返回 keyId；若 store 为空（初始状态）返回 null，拒绝所有无 key 请求（fail-closed）。标注内存实现的 `wiring-placeholder` 并挂到 conditional_release 的 DB 持久化 backlog。同时补一个"生产路径无 lookupAdminKey 时拒绝请求"的测试（与 AC-003 方向相同，但针对 main.ts 的路径）。

### [R-002] MEDIUM: `createApp` 中 `auth` 与 `adminDeps` 分支独立，允许无 relay auth 层挂载 admin 路由

- **category**: security
- **root_cause**: self-caused
- **描述**: `apps/relay/src/index.ts` 中 `if (deps.auth)` 和 `if (deps.adminDeps)` 是完全独立的条件分支。当 `adminDeps` 有值而 `auth` 为空时，relay 层的 `createAuthMiddleware(deps.auth, { requireScope: "admin" })` 中间件不会被注册到 `/api/v1/admin/*`，但 `adminDeps.app` 仍然被挂载到 `/api/v1`。admin 路由依赖自身 guard middleware（`guard.middleware`）提供保护，设计上可行；但此分支独立使得调用方可以在无 relay auth 的情况下挂载 admin 路由而无任何编译期/运行期警告，形成一个隐性的错误配置路径。测试中 `makeWiredApp` 仅传 `adminDeps` 不传 `auth`，已激活这一配置，测试结果虽正确（admin guard 仍保护），但测试覆盖的配置与生产配置不一致（生产两者均有）。
- **建议**: 在 `index.ts` 中将 admin 路由挂载条件改为 `if (deps.adminDeps)`（现状）同时记录：若 `auth` 同时存在，relay-level auth 中间件已在前面注册（现状已满足）；若单独使用需依赖 adminDeps.app 内部 guard。或者更明确：在 `AdminDeps` 接口文档或 `createApp` JSDoc 中注明"adminDeps 需同时配合 auth 使用以获得完整的双层鉴权"，防止未来调用方误配置。

### [R-003] MEDIUM: 测试文件保留预实现状态描述注释

- **category**: convention
- **root_cause**: self-caused
- **描述**: 两个测试文件的顶层 JSDoc 注释描述了任务实现前的状态（"All tests FAIL until the wiring is implemented"、"Currently createApp returns 501 for that path"、"Currently FAILS because the transport does not enforce admin scope"），以及行内注释如"Pre-wiring this returns 404, causing test to FAIL here"。这些注释属于设计过程残留，违反 COMMON-RULES §禁止设计阶段与变更说明残留。已提交的代码是实现后状态，这些描述已失真，会误导维护者认为测试仍在失败。
- **建议**: 删除两个测试文件顶层 JSDoc 中描述任务前状态的段落，以及 `admin-route-wiring.test.ts` 中行内的"Pre-wiring this returns 404..."注释。保留 AC 编号标注（如"T-125 AC-001"）以维持可追溯性；仅删除描述"以前/当前失败"的叙事内容。

### [R-004] LOW: `startHttpTransport` 未从 mcp-server 包 barrel 导出

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `apps/mcp-server/src/transport/http-entry.ts` 新增的 `startHttpTransport` 是 mcp-server HTTP 进程入口函数，但 `apps/mcp-server/src/index.ts` 仅新增了 `createHttpTransportApp` 和 `HttpTransportDeps`、`TokenResolver` 类型的 re-export，未导出 `startHttpTransport`。消费方若从包公开入口使用 HTTP transport，无法通过 `@wechat-flow/mcp-server` 直接导入该函数，需绕过 barrel 走内部路径（`@wechat-flow/mcp-server/src/transport/http-entry.ts`），破坏包封装边界。
- **建议**: 在 `apps/mcp-server/src/index.ts` 中追加 `export { startHttpTransport } from "./transport/http-entry.ts";`。

### [R-005] LOW: `main.ts` 中 `lookupAdminKey` 缺省状态无 wiring-placeholder 标注

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `apps/relay/src/admin/api-keys.ts` 内的 `store` 选项标有 `// cataforge: wiring-placeholder` 注释，清晰标记了内存占位边界；但 `apps/relay/src/main.ts` 中 `createAdminGuard({ auditLog: ... })` 省略 `lookupAdminKey` 的状态没有对应标注，使部署者无法从代码本身识别这一配置缺口。
- **建议**: 在 `main.ts` 的 `createAdminGuard` 调用处添加注释说明 `lookupAdminKey` 的缺省状态及其对应的 backlog 依赖，例如 `// cataforge: wiring-placeholder — lookupAdminKey 未配置，Layer 1 Bearer 校验跳过；接 E-010 DB 后注入真实查找函数`。

---

## 特殊维度核查

### R-003 scope 判断正确性（重点审查 1）

`TokenResolver.resolve()` 的返回类型定义为 `Promise<"user" | "admin" | null>`（`http-sse.ts` 第 9 行），值域是严格的两值字符串枚举，不存在细粒度 scope 字符串（如 `"user,render"`）。`apps/mcp-server/src/auth/api-key.ts` 中的 `ApiKeyRecord.scope` 同为 `"user" | "admin"` 二值类型。因此 `scope !== "user"` 的逻辑等价于 `scope === "admin"`，不存在误拒合法 user-tier 细粒度 scope 的风险。**判定：无误，无问题。**

### admin 路由鉴权可达性（重点审查 2）

`createAdminApiKeysApp` 在构建时通过 `app.use("/admin/api-keys", guard.middleware)` 和 `app.use("/admin/api-keys/*", guard.middleware)` 注册 guard 中间件。guard 执行 X-Admin-Request 检查（Layer 2）和 IP 白名单（Layer 3）。admin 路由在 adminDeps app 内部自我保护，绕不过内部 guard。**Layer 1（Bearer 校验）的问题已在 R-001 中报告。**

### 内存占位标注（重点审查 4）

`api-keys.ts` 中 store 有明确的 `wiring-placeholder` 标注，并引用 E-010 backlog。`main.ts` 缺少对应标注（见 R-005）。

### 测试断言有效性（重点审查 5）

测试验证了 HTTP 状态码（201/200/403/401/404）和响应体字段（`body.error.code`、`body.apiKey`、`body.revoked`），断言绑定真实可观测属性，非弱断言。负路径（403/401/404）覆盖充分，包括缺 X-Admin-Request、无效 IP、非 admin Bearer、unknown token 等场景。**测试断言质量良好。**

---

## Verdict

**needs_revision**（含 1 HIGH）

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 2 |

R-001（HIGH）：生产 admin guard 未配置 `lookupAdminKey`，Bearer token 校验层整体静默跳过，任何来自 localhost 持有 `X-Admin-Request: 1` 的请求均可操作 API key store，属于访问控制漏洞，与 DB 持久化的 conditional_release 边界不同层，不可等价豁免。R-002、R-003 为 MEDIUM，R-004、R-005 为 LOW。

修复优先级：R-001 为阻塞项，需在 main.ts 中为 createAdminGuard 注入至少内存实现的 `lookupAdminKey`（从共享 store 按哈希查找），并补充生产路径无有效 admin token 时 Layer 1 拒绝的测试。

---

## 修复闭环确认（orchestrator inline 复核）

revision 已完成，5 项全部闭环，最终 verdict **approved**：

- **R-001 (HIGH) 已修**：`main.ts` 引入共享 `adminKeyStore`（内存 Map）同时注入 `createAdminApiKeysApp({ store })` 与 `lookupAdminKey` 闭包；guard 接入 `lookupAdminKey` 激活 Layer 1。**哈希一致性亲验**：`api-keys.ts#hashKey` 与 `admin-guard.ts#hashAdminKey` 均为 `createHmac("sha256", API_KEY_PEPPER).digest("hex")`，同源，POST 创建的 admin key 可被 Layer 1 lookup 命中（生产自举鉴权可达）。fail-closed（store 空/无匹配 → null → 403）。补 4 条生产路径测试（无 bearer→401、无效 bearer→403、store 空 fail-closed→403、合法 admin key→200）。
- **R-002 (MEDIUM) 已修**：`AdminDeps` 接口加 JSDoc 注明需配合 auth 获得双层鉴权。
- **R-003 (MEDIUM) 已修**：两测试文件删除设计阶段残留注释，保留 AC 编号。
- **R-004 (LOW) 已修**：`mcp-server/src/index.ts` 追加 `startHttpTransport` barrel 导出，实跑确认不触发 vitest 加载崩溃。
- **R-005 (LOW) 已修**：`main.ts` adminKeyStore 处加 `cataforge: wiring-placeholder` 标注。

独立验证：target 26 passed、relay+mcp 回归 459 passed/1 skip、relay/mcp typecheck 0、biome 0。orchestrator 另清理一处 revision 遗留 unused type import（`AdminApiKeysDeps`，grep=1 确认仅 import 行）。conditional_release 边界（DB 持久化 / mcp HTTP 真实端口监听）不在本任务范围，留 AC-010 blocking_conditions 承接。
