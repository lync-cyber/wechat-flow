---
id: "code-review-T-126-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-126"]
---

# CODE-REVIEW T-126 r1

Layer 1 delegated to hook（biome 已在编码阶段实时检查，commit 报告 0 error）。

## 审查范围

- `apps/relay/src/wechat-asset/uploader.ts`
- `apps/relay/src/routes/wechat-assets.ts`
- `apps/relay/src/index.ts`（wechatAssets 挂入 createApp 部分）
- `apps/job-worker/src/handlers/wechat-asset-upload.ts`
- `apps/job-worker/src/index.ts`
- `apps/job-worker/src/worker-kinds.ts`
- `tests/relay/wechat-assets-route.test.ts`
- `tests/relay/wechat-asset-uploader.test.ts`
- `tests/job-worker/wechat-asset-upload-handler.test.ts`

---

## 问题列表

### [R-001] HIGH: SSRF 防御缺口——DNS rebinding 未覆盖且注释表述歧义

- **category**: security
- **root_cause**: self-caused
- **描述**: `wechat-assets.ts` 第 8–10 行注释写 `// RFC 1918 / loopback literal-IP SSRF guard (DNS-rebinding not addressed — cataforge: wiring-placeholder)`。`cataforge: wiring-placeholder` 是框架豁免标记，其语义是"此处为占位连线，下游有 backlog"，用于 integration-wiring 维度的代码豁免。将其用于标注安全缺口（DNS rebinding）会被 Layer 1 wiring scanner 误当作已知占位豁免处理，导致该安全缺口无法被任何自动检查捕捉。此外，DNS rebinding 是一个实效缺口而非 wiring 问题——攻击者可注册一个解析到私有 IP 的公共域名，绕过当前仅基于 `parsed.hostname` 字面量比对的 IP 过滤（`isPrivateHost` 函数），让请求在 route 校验时通过、在 uploader 执行 fetch 时访问内网。当前正则覆盖了 IPv4 RFC 1918（10/172.16-31/192.168）、127.x、::1、localhost，**缺失**：IPv6 link-local（`fe80::`）、IPv4 link-local（169.254.x.x）、IANA 特殊用途段（0.0.0.0/8、100.64.x.x Carrier-grade NAT）。
- **建议**:
  1. 将 `cataforge: wiring-placeholder` 注释改为明确的 `[ASSUMPTION]` 标注并在 backlog 登记 DNS rebinding 缓解（如上游代理层 allowlist 或异步 DNS 预解析后二次过滤），不得使用框架豁免标记掩盖安全缺口。
  2. 补充 SSRF 正则缺失段：`169\.254\.\d{1,3}\.\d{1,3}`（link-local）、`^0\.`（0.0.0.0/8）、IPv6 link-local `^fe[89ab][0-9a-f]:`（case-insensitive）。
  3. 测试补充 169.254.x.x 负路径。

---

### [R-002] MEDIUM: access_token 缓存未区分 appId——多租户场景缓存污染

- **category**: security
- **root_cause**: self-caused
- **描述**: `wechat-asset-upload.ts` 中 `cachedToken` / `cacheExpiresAt` 是 handler 实例级单变量，无 appId 维度。`loadCredentials()` 在每次 job 执行时调用，若同一进程运行时更换了 `WECHAT_APP_ID`（重新部署环境变量、或多租户设计将来支持不同 appId），新 appId 对应的第一个 job 进来时缓存未过期，会把上一个 appId 的 token 传给新 appId 的 upload，微信 API 会返回 `40001 invalid credential`。当前单实例单凭据模式下影响有限，但代码结构埋下了此类风险且无注释说明假设。
- **建议**: 在缓存命中检查时加入 `appId` 比对：`cachedToken === null || now >= cacheExpiresAt || cachedAppId !== serverCreds.appId`。若刻意接受单凭据假设，需在 `createWechatAssetUploadHandler` 处以 `[ASSUMPTION]` 注释标注"此 handler 实例绑定单一 appId，不支持多租户轮换"。

---

### [R-003] MEDIUM: fetchAccessToken 错误路径静默返回空串——后续上传带空 token 无明确错误

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `apps/job-worker/src/index.ts` 第 23–27 行：

  ```ts
  const body = (await resp.json()) as { access_token?: string };
  return body.access_token ?? "";
  ```

  微信 `/cgi-bin/token` 在 `appId`/`appSecret` 错误时返回 `{ errcode: 40013, errmsg: "invalid appid" }` 而非含 `access_token` 字段，此时 `body.access_token` 为 `undefined`，函数返回 `""`。空串被传入 `uploadWechatAsset` 后打入 API URL 并执行实际 fetch，微信再次报 `40001`，错误诊断路径延长且第一个真实错误被掩盖。另外 `resp.ok` 未校验——HTTP 5xx 时 `resp.json()` 仍执行。

- **建议**: 检查 `resp.ok`，并在 `body.errcode` 存在或 `body.access_token` 缺失时提前 throw，携带 `errcode`/`errmsg` 以便 BullMQ job 记录可追溯失败原因：

  ```ts
  if (!resp.ok) throw new Error(`WeChat token endpoint HTTP ${resp.status}`);
  const body = (await resp.json()) as { access_token?: string; errcode?: number; errmsg?: string };
  if (typeof body.errcode === "number" || !body.access_token) {
    throw new Error(`WeChat token error: ${body.errmsg ?? "missing access_token"} (${body.errcode ?? "unknown"})`);
  }
  return body.access_token;
  ```

---

### [R-004] MEDIUM: uploader 未校验 imageUrl 下载响应的 ok 状态

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `uploader.ts` 第 33–34 行直接 `await downloadResp.arrayBuffer()` 而不检查 `downloadResp.ok`。若 imageUrl 对应的资源返回 HTTP 404/403/5xx，当前代码会将空/错误的二进制体作为图片上传到微信，微信 API 可能报 `media_invalid`，错误信息与真正原因（imageUrl 下载失败）完全脱节，调试困难。
- **建议**: 在 `arrayBuffer()` 前加守卫：

  ```ts
  if (!downloadResp.ok) {
    throw new Error(`Failed to download imageUrl: HTTP ${downloadResp.status}`);
  }
  ```

---

### [R-005] MEDIUM: apiKeyId 回落 `?? ""` 隐藏鉴权穿透路径

- **category**: security
- **root_cause**: self-caused
- **描述**: `wechat-assets.ts` 第 70 行：`const apiKeyId = c.get("auth")?.sub ?? "";`。`createApp` 中 wechatAssets 路由在 `deps.auth` 存在时才挂 auth middleware，`auth` 缺失时整段 `if (deps.wechatAssets) { if (deps.auth) {...} app.route(...) }` 会无鉴权地挂载路由。在无鉴权情形下 `c.get("auth")` 返回 `undefined`，`apiKeyId` 回落为 `""`，job 以空 apiKeyId enqueue，下游无法溯源请求方。此为 belt-and-suspenders 失效场景（auth 配置遗漏时无 fail-safe）。
- **建议**: 在 route handler 内部对 `apiKeyId` 加显式守卫，auth context 缺失时 500 或 401（取决于期望语义），不得以空串 enqueue：

  ```ts
  const apiKeyId = c.get("auth")?.sub;
  if (!apiKeyId) {
    return errorResponse(c, 401, "E_UNAUTHORIZED", "auth context missing");
  }
  ```

  同时建议在 `createApp` 中若 `wechatAssets` 存在但 `auth` 缺失时打 WARN 日志或 throw，防止错误配置静默部署。

---

### [R-006] LOW: uploader 未给 FormData 媒体文件指定 MIME type——微信 API 可能因 `application/octet-stream` 拒绝

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `uploader.ts` 第 40 行 `form.append("media", new Blob([imageBytes]), "media")`，`new Blob([imageBytes])` 不指定 `type`，默认 MIME 为 `""` 或 `application/octet-stream`。微信 add_material 接口对图片要求 Content-Type 为 `image/jpeg` 或 `image/png`；部分运行时（Node.js 内置 fetch、undici）会在 multipart 中透传 Blob.type，若 MIME 不匹配微信可能返回 `40004 media_type_invalid`。
- **建议**: 根据 `input.type` 推断 MIME（`image → image/jpeg`，`thumb → image/jpeg`，`voice → audio/mpeg`）并传给 `new Blob([imageBytes], { type: mimeType })`；或从 `imageUrl` 下载响应的 `Content-Type` header 透传。

---

### [R-007] LOW: SSRF 测试未覆盖 127.0.0.1 变体和 `localhost` 字面量

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `wechat-assets-route.test.ts` AC-004 测试块覆盖了 10.x/192.168/172.x/172.31（class A/B/C 边界），但缺少 `127.0.0.1`（loopback IPv4）和 `localhost` 字面量的负路径测试。正则 `PRIVATE_IP_RE` 包含 `127\.\d{1,3}\.\d{1,3}\.\d{1,3}` 与 `localhost` 但没有测试覆盖，若正则在某个运行时构建中因 flag 问题退化，此缺口不会被发现。
- **建议**: 补充 `https://127.0.0.1/img.png` 和 `https://localhost/img.png` 的 400 断言测试。

---

### [R-008] LOW: AC-009 工作注册测试通过检查常量数组而非真实 Worker 实例——存在形式覆盖

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `wechat-asset-upload-handler.test.ts` AC-009 测试仅断言 `WORKER_QUEUE_KINDS.includes("wechat-asset-upload")`，并未验证 `apps/job-worker/src/index.ts` 真实创建并注册了对应 Worker。`index.ts` 第 41–43 行确实有 `new Worker("wechat-asset-upload", ...)` 的实例化，但该路径完全不在测试覆盖内（index.ts 因含副作用而不宜直接 import，可理解）。常量数组测试是合理的 zero-side-effect 代理，但 test docstring 过度声称"verifies worker registration in index.ts"而实际仅验证常量。
- **建议**: 调整 test 名称 / docstring 使之如实表达"WORKER_QUEUE_KINDS 常量包含 wechat-asset-upload"，不声称验证 index.ts 注册行为，避免误导后续阅读者高估覆盖范围。

---

## 安全专项结论（R-001~R-005 小结）

| 项 | 结论 |
|----|------|
| R-001 token 不泄漏 | **通过**：`result.url` 取自 `body.url`，不含 `access_token`；token 仅出现在 WeChat API 请求 URL query 中（符合微信 API 设计），不写入 Job.result 其他字段，不经日志记录 |
| R-004 SSRF 实效性 | **部分**：literal-IP 覆盖 RFC 1918 + loopback，缺 169.254/0.0.0.0/IPv6 link-local；DNS rebinding 未解决且注释标记误用框架豁免语义（已列为 HIGH R-001） |
| R-002 access_token 缓存安全 | **基本可用**：TTL 正确、clock 可注入、appId 维度缺失（MEDIUM R-002） |
| R-003 apiKeyId 注入 | **通过**：`auth.sub` 来自 JWT 验证后的 context，非空时可追溯；空串回落路径存在隐患（MEDIUM R-005） |
| multipart 正确性 | **基本正确**：FormData + POST 结构正确，MIME type 未显式指定（LOW R-006） |

---

## Verdict

**needs_revision**

存在 1 个 HIGH 问题（R-001：SSRF 防御中 `cataforge: wiring-placeholder` 标记误用掩盖安全缺口 + DNS rebinding 缺口无任何追踪机制）；4 个 MEDIUM、3 个 LOW。

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 4 |
| LOW | 3 |

---

## 修复闭环确认（orchestrator inline 复核）

revision 已完成，8 项全部闭环，最终 verdict **approved**：

- **R-001 (HIGH) 已修**：移除 SSRF 处误用的 `cataforge: wiring-placeholder` 标记；**亲验**私有/保留段正则补全为 10/172.16-31/192.168/127/169.254/0.x + localhost + IPv6 括号 host（`[::1]`/`[fe80-fb..]` link-local/`[fc-fd..]` ULA，IPv6 hostname 含括号已正确处理）；DNS rebinding 改用 `[ASSUMPTION]` 注释声明已知缺口（待后续域名解析层加固，登记 backlog）。新增 7 条 SSRF 负路径测试。
- **R-002 (MEDIUM) 已修**：access_token 缓存加 `cachedAppId` 维度，appId 变更强制重新 fetch。
- **R-003 (MEDIUM) 已修**：`fetchAccessToken` 对 `resp.ok` + errcode/缺失 access_token 抛错，不静默回落空串。
- **R-004 (MEDIUM) 已修**：uploader 检查 imageUrl 下载 `resp.ok`，失败抛含状态码错误。
- **R-005 (MEDIUM) 已修**：route apiKeyId 缺失 fail-closed（401 E_UNAUTHORIZED），不以空串 enqueue。
- **R-006/R-007/R-008 (LOW) 已修**：FormData MIME 按 type 推断；补 127.0.0.1/localhost 负路径；AC-009 描述对齐常量断言实际范围。

独立验证：target 49 passed、relay+job-worker 回归 363 passed/1 skip、relay/job-worker/tests typecheck 0、biome 0。conditional_release（真实微信 API 端到端）AC-010 blocking_conditions 承接。新增 backlog：DNS rebinding 域名解析层 SSRF 加固（[ASSUMPTION] 已标注）。