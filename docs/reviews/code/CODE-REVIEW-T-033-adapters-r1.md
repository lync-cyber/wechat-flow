---
id: "code-review-t-033-adapters-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-033"]
---

# Code Review: T-033 云图床适配器（smms / custom / oss / cos）

Layer 1 delegated to hook（settings.json PostToolUse Edit → lint_format）。

## 审查范围

| 文件 | 职责 |
|------|------|
| `apps/relay/src/image-host/http.ts` | 注入式 HttpRequest 抽象 |
| `apps/relay/src/image-host/smms.ts` | SM.MS token-header 适配器 |
| `apps/relay/src/image-host/custom.ts` | 自定义 endpoint 适配器 |
| `apps/relay/src/image-host/oss.ts` | 阿里云 OSS v1 签名适配器 |
| `apps/relay/src/image-host/cos.ts` | 腾讯云 COS v5 签名适配器 |
| `apps/relay/src/image-host/factory.ts` | 扩展 4 种 kind 分支 |
| `apps/relay/src/credentials/store.ts` | 扩展 4 种 kind 读 env 凭据 |
| `tests/relay/smms.test.ts` | SM.MS 单测 |
| `tests/relay/custom.test.ts` | custom 单测 |
| `tests/relay/oss.test.ts` | OSS 单测 |
| `tests/relay/cos.test.ts` | COS 单测 |
| `tests/relay/image-host.test.ts` | factory kind 单测（含 store 测试） |

## 签名协议核查

### OSS v1

实现（`oss.ts:40`）：`PUT\n\n${contentType}\n${date}\n/${config.bucket}/${key}`

OSS v1 规范格式：`VERB\nContent-MD5\nContent-Type\nDate\nCanonicalizedOSSHeaders\nCanonicalizedResource`

- `Content-MD5` 空行：合规（OSS v1 允许省略 MD5）
- `CanonicalizedOSSHeaders` 无自定义 x-oss- 头：无需添加行
- `CanonicalizedResource`：`/${bucket}/${key}` —— OSS v1 虚拟托管格式下正确
- 结论：结构正确，不会导致真实上传失败

### COS v5

实现（`cos.ts:44-52`）：

```
signKey   = HMAC-SHA1(secretKey, signTime)
httpString = "PUT\n/{key}\n\n\n"
stringToSign = "sha1\n{signTime}\n{sha1Hex(httpString)}\n"
sig = HMAC-SHA1(signKey, stringToSign)
```

Authorization 字段：`q-sign-algorithm=sha1&q-ak=...&q-sign-time=...&q-key-time=...&q-header-list=&q-url-param-list=&q-signature=...`

- `httpString` 格式：`Method\nUriPathname\nHttpParameters\nHttpHeaders\n` —— 无参数/头时四行全为空，正确
- `stringToSign` 尾部 `\n`：符合 COS 规范
- `q-header-list=` 为空但请求发送了 `Content-Type`：见 R-001（MEDIUM）
- 结论：核心签名结构正确，不会导致上传必然失败

## 问题列表

### [R-001] MEDIUM: COS 签名未覆盖 Content-Type 头

- **category**: security
- **root_cause**: self-caused
- **描述**: `cos.ts:52` 中 `q-header-list=` 为空字符串，但实际请求发送了 `Content-Type` 头（第 61 行）。COS v5 规范要求放入签名的头必须出现在 `q-header-list` 中，且 `httpString` 的 HttpHeaders 段需包含对应键值；反之，不在 `q-header-list` 的头不被签名保护。当前实现 `Content-Type` 可被中间人替换而不影响签名校验。真实上传不会因此失败（COS 接受未签名的 `Content-Type`），但存在内容类型被篡改的理论风险。
- **建议**: 将 `Content-Type` 纳入签名：在 `httpString` 的 HttpHeaders 段加入 `content-type:{contentType}\n`，在 `q-header-list` 中写 `content-type`，并确保 Authorization 中 `q-header-list=content-type`。

---

### [R-002] MEDIUM: store.ts 中 4 个新 kind 的 env 读取路径无测试覆盖

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/relay/image-host.test.ts` 中 `loadImageHostConfig` 的测试仅覆盖 `local` 和 `qiniu` 两种 kind。新增的 `oss`、`cos`、`smms`、`custom` 四种 kind 的 env-var 到 credentials 映射路径（`store.ts:36-84`）无任何单测。若 env 变量名拼写错误或映射逻辑有缺漏，测试不会捕获。
- **建议**: 在 `image-host.test.ts` 的 `loadImageHostConfig` describe 块中补充 4 个 kind 的基础测试（各 1-2 条：kind 字段正确、关键 credentials 字段从对应 env var 读取）。

---

### [R-003] MEDIUM: OSS Authorization 头格式未在测试中验证完整结构

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/relay/oss.test.ts` 验证了 Authorization 头 "starts with 'OSS '"（`/^OSS /`）和 "contains accessKeyId"，但未验证其完整格式 `OSS <accessKeyId>:<base64-hmac-signature>` 中的冒号分隔符与签名字段存在性。若 `hmacSha1Base64` 返回空字符串或 accessKeyId 拼接逻辑错误（如 `OSS :sig` 或 `OSS ak` 缺冒号），现有测试会误放行。
- **建议**: 增加断言 `expect(auth).toMatch(/^OSS [^:]+:.+$/)` 验证冒号分隔符和非空签名部分存在。

---

### [R-004] LOW: `buildOssKey` / `buildCosKey` 路径净化仅替换 `..` 为一次，不处理编码变体

- **category**: security
- **root_cause**: self-caused
- **描述**: `oss.ts:20-22` 和 `cos.ts:23-27` 的 key 净化逻辑先将 `/` 和 `\` 替换为 `_`，再替换 `..`。对于纯文件名输入（来自 `meta.filename`），路径穿越威胁较低；但未处理 URL 编码变体（`%2F`、`%5C`）。当前上下文中 `meta.filename` 来自 API 调用方，若上游未净化则存在理论风险。
- **建议**: 在 `buildOssKey` / `buildCosKey` 中解码 `decodeURIComponent(meta.filename)` 后再净化，或在文档/类型注释中明确要求上游提供已净化的文件名。

---

### [R-005] LOW: custom 适配器的 endpoint 未做协议校验

- **category**: security
- **root_cause**: self-caused
- **描述**: `custom.ts:31` 直接将 `config.endpoint`（来自 `env.CUSTOM_UPLOAD_ENDPOINT`）用于 HTTP 请求，未校验是否为 `https://` 开头。攻击面为 env 配置错误，不是运行时注入，但若部署环境配置被篡改（如注入 `file://` 或 `http://internal`），可触发 SSRF。
- **建议**: 在 `createCustomAdapter` 构造时检查 `config.endpoint.startsWith("https://") || config.endpoint.startsWith("http://")` 并对 `file://` 等非 HTTP 协议抛出构造错误；或在 store.ts 中校验 `CUSTOM_UPLOAD_ENDPOINT` 格式。

---

## 未覆盖缺口（信息性，非问题）

- 4 个新适配器均无 env-gated 集成测试（实际签名正确性验证）。已知缺口，与已审查 qiniu 适配器保持一致，在 mock 单测框架内属可接受策略；真实签名正确性依赖 dev env 验证。

## Verdict

**approved_with_notes**

无 CRITICAL 或 HIGH 问题。签名协议结构正确（OSS v1 / COS v5 均符合云厂商规范），secretKey/accessKeySecret 仅用于 HMAC 计算，不进 body/URL/日志，基础安全边界成立。存在 2 个 MEDIUM（R-001 COS Content-Type 未签名、R-002 store env 读取路径无测试）和 1 个 MEDIUM（R-003 OSS Authorization 格式断言不完整）以及 2 个 LOW。建议在下一迭代或 sprint-review 前修复 R-002（补 store 测试成本低）。
