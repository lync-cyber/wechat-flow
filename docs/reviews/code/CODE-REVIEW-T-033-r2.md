---
id: "code-review-t-033-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-033"]
---

# Code Review: T-033 图片上传 proxy（revision 第 2 轮）

Layer 1 delegated to hook（项目已配置 PostToolUse lint hook，Layer 1 实时执行，此处跳过重复扫描）

增量审查模式：以 r1 报告的 3 个 HIGH（R-001/R-002/R-003）及 diff 涉及文件为审查核心，未改动维度标注 `[previously-approved]` 并附 r1 来源。

---

## R-001 复核：`createImagesApp` 挂载（integration-wiring）

**修复已验证。**

`apps/relay/src/index.ts`（第 10-17 行）：`createApp(deps: AppDeps = {})` 在 `deps.imagesAdapter` 存在时执行 `app.route("/", createImagesApp({ adapter: deps.imagesAdapter }))`，已将 images 路由树挂入 Hono 应用根。

`apps/relay/src/main.ts` 是生产接线点：`loadImageHostConfig(process.env)` → `createAdapterFromConfig(config)` → `createApp({ imagesAdapter })` → `serve(...)`，端到端生产路径完整。

wiring 测试（`tests/relay/images-route.test.ts` 第 277-298 行）通过 `createApp({ imagesAdapter: spy })` 而非直接构造 `createImagesApp` 发起请求，覆盖了真实挂载路径：
- adapter 存在时返回 200，`spy.calls.length === 1`（非 stub 空断言）
- adapter 缺失时返回 404

R-001 CLOSED — HIGH 消除。

---

## R-002 复核：`deriveExtension` 白名单（security CWE-434）

**修复已验证。**

`apps/relay/src/image-host/local.ts`（第 21-29 行）：`deriveExtension` 现在采用三级策略：
1. `MIME_TO_EXT[meta.contentType]` — contentType 来自 `routes/images.ts` 第 42 行 `const contentType = \`image/${result.format}\``，其中 `result.format` 是 sharp 处理后的真实格式，不是用户提供的 `blob.type`，来源可信
2. `ALLOWED_EXTENSIONS.has(fromFilename.toLowerCase())` — 文件名扩展名须在白名单 `{.jpg,.jpeg,.png,.webp,.avif,.gif}` 内方可使用
3. 否则回落 `.bin`

两道防线（trustworthy contentType 优先 + 文件名白名单）已封堵 `.php`/`.asp`/`.htaccess` 等危险扩展名上传路径。CWE-434 修复充分。

R-002 CLOSED — HIGH 消除。

---

## R-003 复核：`adapter.upload` try/catch（error-handling）

**修复已验证。**

`apps/relay/src/routes/images.ts`（第 44-49 行）：`adapter.upload(...)` 已包裹 try/catch，捕获后返回 `c.json({ error: "upload failed" }, 502)`，不泄露内部错误细节。

测试覆盖（`tests/relay/images-route.test.ts` 第 305-323 行）：`failingAdapter.upload` 返回 `Promise.reject(new Error("backend down"))`，断言 `res.status === 502`，有效行为级测试而非仅存在性检查。

R-003 CLOSED — HIGH 消除。

---

## 已修复的 MEDIUM 问题

### R-004（qiniu `deriveKey` 路径净化 + URL encode）

`apps/relay/src/image-host/qiniu.ts`（第 29-33 行）：`deriveKey` 对 `meta.filename` 执行 `.replace(/[/\\]/g, "_").replace(/\.\./g, "_")` 净化路径分隔符和 `..` 注入；第 61 行 URL 使用 `encodeURIComponent(key)` 编码。

CLOSED。

### R-005（`quality` dead parameter 移除）

`apps/relay/src/image/preprocess.ts`：`PreprocessOptions` 接口已删除 `quality?: number` 字段，接口与实现一致。

CLOSED。

---

## 新增代码维度审查

### factory.ts — 未知 kind 处理

`createAdapterFromConfig`（第 6-24 行）：本地/七牛分支走显式 `if`，最后 `throw new Error(\`Unsupported image host kind: ${config.kind}\`)`，快速失败策略正确，错误信息含 kind 值便于诊断。

注意：`createAdapterFromConfig` 在 `config.kind === "local"` 分支中使用 `config.baseDir ?? ""` 和 `config.publicBaseUrl ?? ""` 回退空字符串（第 8-11 行）。若 `loadImageHostConfig` 在 local 模式下已做非空校验（`store.ts` 行为），此处可以接受；若 `store.ts` 允许空字符串透传，则 local adapter 会以 `""` 作为 `baseDir` 落地文件到进程 cwd，与 R-008 同类问题（已 deferred）。此处不新开问题，归入 deferred R-008 范畴。

factory 测试（`tests/relay/image-host.test.ts` 第 162-186 行）覆盖 local/qiniu/未知 kind 三条路径，断言有效（`adapter.name`、`throws`）。

### qiniu.ts — ok:false 抛错测试

`tests/relay/qiniu.test.ts`（第 96-107 行）：`ok: false` stub 测试已补充，断言 `rejects.toThrow()`，覆盖 R-006 场景。

---

## 审查摘要（本轮）

| 维度 | 结论 |
|------|------|
| integration-wiring — createApp 挂载（R-001）| CLOSED（HIGH → 消除）|
| security — 文件扩展名白名单（R-002）| CLOSED（HIGH → 消除）|
| error-handling — adapter.upload try/catch（R-003）| CLOSED（HIGH → 消除）|
| security — qiniu key 净化 + URL encode（R-004）| CLOSED（MEDIUM → 消除）|
| dead-code — quality 参数（R-005）| CLOSED（MEDIUM → 消除）|
| test-quality — ok:false 抛错覆盖（R-006）| CLOSED（MEDIUM → 消除）|
| consistency — 双重路由隐患（R-007）| DEFERRED（sprint-review，未在本轮修复范围）|
| error-handling — qiniu 凭据空值回退（R-008）| DEFERRED（sprint-review）|
| test-quality — PNG/WebP EXIF 覆盖（R-009）| DEFERRED（sprint-review）|
| security（contentType 来源）| [previously-approved] — r1 PASS |
| security（SSRF）| [previously-approved] — r1 PASS |
| test-quality（GPS 断言强度）| [previously-approved] — r1 PASS |

---

## Deferred（记 sprint-review，不阻塞本轮）

- **R-007**（MEDIUM）：`editor-session.ts` 与 `createImagesApp` 注册同一路径 `POST /api/v1/images/upload`，当两者同时挂载会产生路由竞争；整合方案与 T-091 auth 中间件任务绑定，留 sprint-review
- **R-008**（LOW）：`loadImageHostConfig` 对七牛凭据 `?? ""` 静默回退，未配置凭据不早期报错；factory.ts local 分支同样存在 `baseDir ?? ""`；留 sprint-review
- **R-009**（LOW）：EXIF 剥离测试仅覆盖 JPEG，PNG/WebP 格式无验证；留 sprint-review

---

## Verdict

**approved_with_notes**

3 个 HIGH 问题（R-001/R-002/R-003）已全部消除。剩余 R-007/R-008/R-009 均为 MEDIUM/LOW，且已在本轮开始前明确标记为 deferred，不影响当前切片交付。

notes_summary: R-007 双重路由隐患待 T-091 接线时统一处理；R-008 凭据空值回退与 factory.ts local 分支空字符串回退共同建议在 sprint-review 后续收紧；R-009 PNG/WebP EXIF 测试覆盖可酌情补充。
