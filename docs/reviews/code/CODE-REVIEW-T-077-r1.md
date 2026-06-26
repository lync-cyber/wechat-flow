---
id: "code-review-T-077-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-077"]
---

# Code Review: T-077 — M-010 wechat-asset uploader + BullMQ kind `wechat-asset-upload`

> 本报告由 orchestrator inline 复核产出（reviewer 子代理派发本会话连接中断，兜底接管）。Layer 1 由 biome hook 兜底（0 error）；Layer 2 如下。

**Verdict**: approved_with_notes

被审：`apps/relay/src/routes/wechat-assets.ts`、`apps/relay/src/wechat-asset/{uploader,credential-loader}.ts`、`apps/job-worker/src/handlers/wechat-asset-upload.ts` + `tests/relay/wechat-asset-uploader.test.ts`（23 测试全 PASS）。凭据隔离正面：handler 仅经 `loadCredentials()` 取服务端凭据，忽略 job input 中的凭据字段（AC-002 ✓）；credential-loader 缺 AppID/Secret 即抛（✓）。

---

## 问题列表

### [R-001] MEDIUM: uploader 结果 `url` 回传含 access_token 的 API URL（潜在凭据泄漏）

- **category**: security
- **root_cause**: self-caused
- **描述**: `uploader.ts:45` `url: apiUrl`，而 `apiUrl` 内含 `access_token=...` query。一旦 access_token 接线落地（当前 handler 传 `accessToken:""` 故为潜伏态），Job.result.url 会把 access_token 暴露给轮询 job 的客户端 / 日志。语义上也错误——应回传微信响应体的素材 `url` 而非 API 调用 URL。
- **建议**: 取微信 add_material 响应的 `body.url`（image/thumb 类型返回）填充结果 url；绝不回传含 token 的 apiUrl。与 access_token 接线任务一并修。

### [R-002] MEDIUM: 实际素材上传链路未实现（imageUrl 未传输 + access_token 获取缺失）

- **category**: completeness
- **root_cause**: self-caused
- **描述**: uploader 仅用 `type` 拼 add_material URL，从未把 `input.imageUrl` 的字节以 multipart 发送给微信；access_token 获取流程未实现（handler 传空串）。当前为可单测的骨架，真实上传不可用。
- **建议**: 登记 wiring backlog：① access_token 获取（AppID/Secret → /cgi-bin/token，带缓存）；② 拉取 imageUrl 字节并 multipart POST add_material。已并入 Sprint 5 wiring backlog。

### [R-003] MEDIUM: 路由以空 apiKeyId 入队，且未挂鉴权

- **category**: security
- **root_cause**: self-caused
- **描述**: `wechat-assets.ts:38` `enqueue("wechat-asset-upload", input, "")` 硬编码空 apiKeyId，job 无法归因到发起方；路由尚未挂载到 createApp 鉴权链（mount 延后）。
- **建议**: 挂载到 createApp 时经 auth middleware 取 apiKeyId 注入 enqueue。并入 wiring backlog（route mount）。

### [R-004] LOW: imageUrl 缺协议/SSRF 校验

- **category**: security
- **root_cause**: self-caused
- **描述**: 路由仅校验 imageUrl 为非空字符串。待 uploader 真正 fetch imageUrl 时，无 https/host 校验存在 SSRF 风险。
- **建议**: 校验 imageUrl 为 https 且（按需）host 白名单；随 R-002 真实上传一并加固。

---

## Verdict

**approved_with_notes** — 0 CRITICAL / 0 HIGH / 3 MEDIUM / 1 LOW。凭据隔离与错误码传播实现正确、测试充分；MEDIUM/LOW 均与 access_token / 真实上传 / route mount 的 deferred wiring 强相关，已登记 backlog，不阻塞模块落地。access_token 接线落地时须同步修 R-001（token 泄漏）与 R-002/R-004。

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 (R-001, R-002, R-003) |
| LOW | 1 (R-004) |
