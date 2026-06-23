---
id: "code-review-t-033-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-033"]
---

# Code Review: T-033 图片上传 proxy（图床适配器）+ sharp 预处理

Layer 1 delegated to hook（项目已配置 PostToolUse lint hook，Layer 1 实时执行，此处跳过重复扫描）

security_sensitive: true → Layer 2 强制执行（豁免短路）

---

## 审查摘要

| 维度 | 结论 |
|------|------|
| security — 凭据隔离 AC-004 | PASS |
| security — EXIF/GPS 真剥离 | PASS（机制正确但有 MEDIUM 风险点）|
| security — 文件名注入 / 路径穿越 | HIGH（local adapter 扩展名未白名单过滤）|
| security — SSRF | PASS（上传目标硬编码，无用户控制）|
| error-handling — adapter.upload 未受保护 | HIGH |
| error-handling — 边界 413/400 | PASS |
| dead-code — quality 参数 | LOW |
| integration-wiring — createImagesApp 未挂载 | HIGH |
| test-quality — GPS 断言强度 | PASS（真实 piexifjs 解析，非存在性检查）|
| test-quality — adapter 错误路径覆盖缺失 | MEDIUM |
| completeness — 4 个适配器未实现 | 已知延后（备注）|

---

## 问题列表

### [R-001] HIGH: `createImagesApp` 未挂载到 relay 应用入口，POST /api/v1/images/upload 在生产路径不可达

- **category**: structure（integration-wiring）
- **root_cause**: self-caused
- **描述**: `apps/relay/src/routes/images.ts` 导出了 `createImagesApp`，但 `apps/relay/src/index.ts` 从未 import 或 `app.route()` 注册该 Hono 子应用。生产路径 `POST /api/v1/images/upload` 实际上由 `apps/relay/src/routes/editor-session.ts` 中的同名占位路由（只返回 `{status:"ok"}`，不执行图片预处理或上传）处理。真实的 `createImagesApp` 仅在测试代码中直接构造调用，并不经过 relay 应用路由树。这意味着即便测试全部通过，F-006 的端点在实际服务器请求中无法到达。
- **建议**: 在 `apps/relay/src/index.ts` 的 `createApp()` 中：①注入 `ImageHostAdapter`（通过 `loadImageHostConfig` + 工厂函数创建）；②`import { createImagesApp } from "./routes/images.ts"`；③`app.route("/", createImagesApp({ adapter }))`。同时将 `editor-session.ts` 中的 `/api/v1/images/upload` 占位路由（返回 `{status:"ok"}` 的 stub）移除或改造为调用真实 `createImagesApp`，避免双重路由冲突。

---

### [R-002] HIGH: local adapter `deriveExtension` 未对用户提供的文件扩展名做白名单过滤，可导致可执行脚本存储

- **category**: security
- **root_cause**: self-caused
- **描述**: `apps/relay/src/image-host/local.ts` 的 `deriveExtension()` 从 `meta.filename` 中取 `extname(meta.filename)` 作为落地文件的扩展名。`meta.filename` 来自 `routes/images.ts` 中的 `(file as { name?: string }).name ?? "upload"`，即客户端上传的 Blob/File 名称，完全由请求方控制。若用户上传文件名为 `shell.php`、`exploit.php5`、`backdoor.asp` 或 `config.htaccess`，则落地文件将以相应扩展名保存（如 `{hash}.php`）。若 `baseDir` 指向 Web 服务器静态目录（如 Nginx `root`），则服务器端脚本执行、目录遍历 `.htaccess` 注入等攻击成为可能。这是 CWE-434（Unrestricted Upload of File with Dangerous Type）的典型表现。
- **建议**: 在 `deriveExtension` 中增加扩展名白名单过滤：仅允许 `.jpg`/`.jpeg`/`.png`/`.webp`/`.avif`/`.gif` 等安全图片扩展名，其他一律返回空字符串（由 MIME 类型映射决定默认扩展名）。参考实现：在 `fromFilename` 赋值后检查 `ALLOWED_IMAGE_EXTENSIONS.has(fromFilename.toLowerCase())`，不在白名单则走 mimeMap 回退。

---

### [R-003] HIGH: `routes/images.ts` 的 `adapter.upload()` 调用无 try/catch，上传失败时产生未处理异常

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `apps/relay/src/routes/images.ts` 第 44 行 `adapter.upload(result.data, ...)` 裸调用无任何错误捕获。当适配器抛出错误（七牛 API 返回非 2xx、本地磁盘写入失败、网络超时）时，异常会穿透 Hono handler 变成未受控的 500，并可能在响应体中泄露内部实现细节（如 Hono 的默认错误序列化）。与之对比，同一文件中 `preprocessImage` 已用 try/catch 包装（第 35-39 行），但 `adapter.upload` 未做同样防护，错误处理一致性缺失。
- **建议**: 在 `adapter.upload()` 外包 try/catch，捕获后返回 `c.json({ error: "upload failed" }, 502)`（或 500）。避免暴露适配器内部错误消息字符串，日志层记录完整错误。

---

### [R-004] MEDIUM: qiniu 适配器 `deriveKey` 直接使用用户提供的 `meta.filename` 作为对象存储 key，无任何过滤或编码

- **category**: security
- **root_cause**: self-caused
- **描述**: `apps/relay/src/image-host/qiniu.ts` 的 `deriveKey()` 在 `meta.filename` 非空时直接 `return meta.filename`，该 key 随后拼入 FormData 并构成 URL：`${config.domain}/${key}`。若文件名含 `../`、`%2F`、空格或其他特殊字符，对象存储 key 可能出现语义歧义（部分厂商对 `../` 路径做 canonical 化），构成的 URL 也未 encode（`encodeURIComponent` 缺失）导致生成的 URL 对含空格/中文文件名无效。此外，若攻击者提供长度极端的文件名，可能触发七牛 API 的 key 长度限制导致上传失败。
- **建议**: ①将 key 改为 hash-based 生成（类似 local adapter），完全去除用户输入对 key 的影响；或②对 filename 做严格白名单过滤并限制长度（≤128 字符，仅 `[a-zA-Z0-9._-]`）。③返回的 URL 中 key 部分使用 `encodeURIComponent` 编码。

---

### [R-005] MEDIUM: `preprocessImage` 的 `quality` 参数声明但从未消费（dead parameter）

- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `apps/relay/src/image/preprocess.ts` 第 4-6 行 `PreprocessOptions` 接口声明了 `quality?: number` 字段，但 `preprocessImage` 函数体（第 22-25 行）的 sharp 调用链完全忽略该选项——未向 `.jpeg({ quality: ... })` 或 `.png(...)` 等格式输出方法传递 quality 参数。调用方若设置 `{ quality: 60 }` 期望降低输出质量，实际上不会生效，造成 API 语义误导。这与 AC-002b「2.5MB 压缩目标」相关，也是主线程已注意到的点。
- **建议**: 要么在 sharp 管线中消费 `quality`（如 `.toFormat('jpeg', { quality: opts?.quality ?? 85 })`），要么从接口定义中删除该字段。保留声明却不消费违反 COMMON-RULES §代码即事实原则。

---

### [R-006] MEDIUM: qiniu 测试未覆盖上传失败路径（`res.ok = false`），`adapter.upload` 错误路径缺乏测试

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/relay/qiniu.test.ts` 中的 `makeHttpPost` 工厂函数始终返回 `{ ok: true, ... }`，没有任何测试用例模拟 `ok: false` 场景——即七牛上传 API 返回非 2xx 时 `adapter.upload` 是否真的抛出 `Error("Qiniu upload failed")`。同样，`tests/relay/images-route.test.ts` 没有测试 `adapter.upload` 抛出异常时路由层的行为（见 R-003，目前会穿透为 500）。
- **建议**: 在 `qiniu.test.ts` 增加 `ok: false` 的 httpPost stub 测试 `adapter.upload` 抛出错误；在 `images-route.test.ts` 增加 spy adapter 的 `upload` 方法 reject 场景，断言路由返回 5xx 而非未处理异常。

---

### [R-007] MEDIUM: `editor-session.ts` 中 `/api/v1/images/upload` 的占位路由与 `routes/images.ts` 实现形成双重路由隐患

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `apps/relay/src/routes/editor-session.ts` 第 73-89 行定义了 `POST /api/v1/images/upload` 路由（做鉴权后返回 `{status:"ok"}`，不执行真实上传），这本应是 T-091 鉴权接线的占位。但 `routes/images.ts` 中的 `createImagesApp` 也注册了同一路径 `POST /api/v1/images/upload`（执行真实预处理+上传）。如果两者都被挂载到同一 Hono app，Hono 的路由匹配按注册顺序取第一个匹配，导致其中一个永远不可达，且无编译期警告。这会在 T-091（editor-session 接线）与 T-033（images 接线）汇合时产生隐蔽的路由竞争。
- **建议**: 明确约定这两个路由的分工：`editor-session.ts` 的 `/api/v1/images/upload` 应作为鉴权中间件而非终点 handler，鉴权通过后转发至 `createImagesApp` 处理；或将两者合并为一个路由（鉴权 + 预处理 + 上传），避免两个 handler 注册同一路径。

---

### [R-008] LOW: `loadImageHostConfig` 对七牛凭据使用 `?? ""` 静默回退空字符串，应区分「未配置」与「空值」

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `apps/relay/src/credentials/store.ts` 第 26-29 行对 `QINIU_ACCESS_KEY` 等四个七牛环境变量使用 `env.QINIU_ACCESS_KEY ?? ""` 回退，当环境变量缺失时不抛出错误，仅以空字符串填入凭据。这样构造出的 `QiniuConfig` 可以通过类型检查，但后续使用时七牛 API 会以鉴权错误拒绝请求，错误信息指向业务逻辑而非配置问题，难以定位。
- **建议**: 对 `kind="qiniu"` 分支中必需凭据（accessKey/secretKey/bucket/domain）做显式非空校验，缺少任一立即抛出 `Error("QINIU_ACCESS_KEY is required")`，与 `IMAGE_HOST` 缺失时的处理保持一致。

---

### [R-009] LOW: EXIF 剥离测试仅覆盖 JPEG 格式，不验证 PNG/WebP 输入的 EXIF 剥离行为

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/relay/image-preprocess.test.ts` 所有 AC-001 相关测试 fixture 仅构造 JPEG 输入。sharp 对所有格式默认不保留 metadata（无需显式 `.withMetadata()` 调用），PNG 和 WebP 中的 EXIF/XMP 数据同样会被剥离，但没有测试覆盖这个断言。由于 M-010 spec 要求「EXIF 剥离」适用于上传的图片（不限 JPEG），测试覆盖面有一定缺口。
- **建议**: 酌情增加 PNG 格式输入的 EXIF 剥离测试（piexifjs 不支持 PNG，但可使用 `exif-reader` 或 sharp 的 `.metadata()` 验证输出无 exif 字段）；或在代码注释中明确说明 sharp 默认行为覆盖所有格式（让后续维护者清楚不需要额外测试）。

---

## 已知延后范围（completeness 备注，非缺陷）

- `oss.ts`、`cos.ts`、`smms.ts`、`custom.ts` 四个适配器在本任务范围内标记为 deferred（需真实凭据验证）。dev-plan T-033 deliverables 列出了这四个文件，但任务说明中已知此次切片仅实现 local + qiniu，后续补齐。评审不将此列为缺陷，仅作 completeness 备注。

---

## 自检：verdict 一致性

- 存在 3 个 HIGH 问题（R-001/R-002/R-003）→ 三态判定为 **needs_revision**
- frontmatter status: approved（评审完成状态）与正文 verdict needs_revision 一致——`status` 字段表示「本报告已出评审结论」，verdict 另字段表达，无矛盾。

---

## Verdict

**needs_revision**

需修复的 HIGH 问题：
- **R-001**（`apps/relay/src/index.ts`）: `createImagesApp` 未挂载，端点生产路径不可达
- **R-002**（`apps/relay/src/image-host/local.ts:12-22`）: 文件扩展名无白名单，危险类型可上传
- **R-003**（`apps/relay/src/routes/images.ts:44`）: `adapter.upload()` 无 try/catch，上传失败未受控
