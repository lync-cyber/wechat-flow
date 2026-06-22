---
id: "code-review-T-036-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-036"]
---

# CODE-REVIEW T-036 — MCP server stdio transport + 鉴权骨架（增量复审）

Layer 1 delegated to hook（biome clean；跳过 Layer 1，直接进入 Layer 2 增量语义审查）。

## 审查范围（增量）

revision diff 涉及文件：
- `apps/mcp-server/src/auth/api-key.ts`（R-002 timingSafeEqual 修复）
- `apps/mcp-server/src/auth/scope-guard.ts`（R-005 fail-closed allowlist 修复）
- `apps/mcp-server/src/tools/router.ts`（R-001 keyRecord 贯通 + R-006 wiring-placeholder 标注）
- `apps/mcp-server/src/transport/stdio.ts`（R-001/R-003 createServer/startStdioTransport 注入 apiKeyStore + rawApiKey）
- `tests/mcp-server/server.test.ts`（R-004 端到端鉴权测试 + 去存在性断言）

r1 中未标 CRITICAL/HIGH 的维度：[previously-approved, r1]（命名规范 convention、接口一致性 consistency、基础错误处理 error-handling）不重复审查。

---

## 逐条 r1 Finding 确认

### R-001 HIGH — `registerAllTools` 硬编码 `null` keyRecord

**状态：已消除。**

`router.ts` 的 `registerAllTools` 现在接收 `keyRecord: ApiKeyRecord | null` 参数（第 19 行），并将其传入每次 `dispatchTool` 调用（第 22 行）。`stdio.ts` 的 `createServer` 从 `deps.apiKeyStore` 和 `deps.rawApiKey` 解析 keyRecord（第 18-20 行），再传给 `registerAllTools`；`startStdioTransport` 从 `process.env.WECHAT_FLOW_MCP_API_KEY` 填入 rawApiKey（第 27 行）。硬编码 null 的路径已不存在。

端到端验证（见 server.test.ts）：
- AC-002：`createServer()` 无 key store → `callTool` 返回 `E_AUTH_REQUIRED`（第 46-49 行，`callToolWithServer(undefined, ...)`，经真实 InMemoryTransport + Client.callTool 路径）。
- AC-003：admin key → `callTool` 返回 `E_PERMISSION_DENIED`（第 52-58 行）。
- 合法 user key → `callTool` 返回 `E_NOT_IMPLEMENTED`（第 61-68 行，即鉴权通过）。

三条端到端用例均通过 `createServer` 生产路径构造，非直接调用 `dispatchTool`，R-001 所指的"绕过真实 transport wiring"问题已消除。

### R-002 MEDIUM — `verifyApiKey` 裸比较缺少常数时间

**状态：已消除。**

`api-key.ts` 改为 `Buffer.from(hash, "hex")` + `timingSafeEqual`（第 15-22 行）。

安全逻辑深审（见下方"revision 新引入安全逻辑正确性"节）。

### R-003 MEDIUM — `createServer`/`startStdioTransport` 不接受 `ApiKeyStore`

**状态：已消除。**

`ServerDeps` 增加了 `apiKeyStore?: ApiKeyStore` 和 `rawApiKey?: string` 两个可选字段（第 6-11 行），`createServer` 和 `startStdioTransport` 均消费这两个字段。

### R-004 MEDIUM — AC-004 存在性断言不等价行为验证

**状态：已消除。**

r1 中的 `expect(typeof startStdioTransport).toBe("function")` 存在性断言已不见于 server.test.ts；现有 AC-004 测试（第 72-78 行）使用 `vi.fn()` stub 注入 `main(start)`，验证 stub 被调用一次。

剩余考量：此测试仍不覆盖"main() 无参时默认走 startStdioTransport"的路径（r1 建议的 spy 写法），但 r1 对此仅评为 MEDIUM；当前测试相比 r1 的存在性断言已有实质改进，未引入新问题。无参默认路径可见于 `index.ts` 第 6 行静态定义 `start: () => Promise<void> = startStdioTransport`，TypeScript 编译期可见，不构成 HIGH/CRITICAL 风险。

### R-005 LOW — `guardUserScope` 隐式 allowlist

**状态：已消除。**

`scope-guard.ts` 改为显式 fail-closed：null → `E_AUTH_REQUIRED`，scope=user → null（通过），其余 → `E_PERMISSION_DENIED`（第 5-12 行）。`ApiKeyRecord.scope` 当前类型仅 `"user" | "admin"`；新增 scope 值时 TypeScript 类型收窄会在最后分支产生 never，需显式处理，不存在默认放行。

### R-006 LOW — `dispatchTool` 忽略 `_args`

**状态：维持（by-design 标注已落地）。**

`router.ts` 第 1 行已添加 `// cataforge: wiring-placeholder — Tool handlers 占位返回 E_NOT_IMPLEMENTED，真实实现见 T-037/T-038/T-039/T-122`，明确关联后续任务。r1 定性为 follow-up LOW、不阻塞 T-036，此次不计入问题列表。

---

## revision 新引入安全逻辑正确性审查

### `verifyApiKey` 的 `timingSafeEqual` 循环

```typescript
// api-key.ts L13-24
export function verifyApiKey(raw: string | undefined, store: ApiKeyStore): ApiKeyRecord | null {
  if (!raw) return null;
  const inputBuf = Buffer.from(hashApiKey(raw), "hex");
  let matched: ApiKeyRecord | null = null;
  for (const [storedHash, record] of store) {
    const storedBuf = Buffer.from(storedHash, "hex");
    if (inputBuf.length === storedBuf.length && timingSafeEqual(inputBuf, storedBuf)) {
      matched = record;
    }
  }
  return matched;
}
```

**遍历全部 entry 不 early-return**：循环遍历整个 store，无 break/return，命中后继续遍历剩余条目，避免通过 loop 次数推断 key 在 store 中的位置。常数时间行为正确。

**长度不等时处理**：`hashApiKey` 固定输出 SHA-256 hex，始终 64 字节（以 Buffer from hex 解码后 32 字节）。store 中的 hash 亦由 `hashApiKey` 生成，因此 `inputBuf.length === storedBuf.length` 在正常使用下恒真。即便出现异常（如 store 被外部污染写入非 hex 字符串），length 不等时短路跳过，不调用 `timingSafeEqual`，不会抛 `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH`，无崩溃风险。

**多 entry 命中问题**：store 允许多条 hash→record 映射，若两条 hash 碰撞（SHA-256 碰撞概率可忽略不计）则后命中者覆盖前者（`matched = record` 非累加）。此行为等价于"取最后一个命中值"，对业务无副作用（不同 key 同 scope 时无影响，不同 scope 时偶有非预期 scope，但 SHA-256 碰撞场景属理论）。

**空 store 处理**：store 为 `new Map()` 时循环体不执行，`matched` 保持 null，返回 null（`E_AUTH_REQUIRED`）。正确。

结论：`verifyApiKey` 的常数时间实现逻辑正确，无可利用漏洞。

### `guardUserScope` fail-closed 审查

显式枚举：null → `E_AUTH_REQUIRED`，scope=user → null，其余 → `E_PERMISSION_DENIED`。无"未知 scope 默认通过"路径，fail-closed 语义成立。

### `startStdioTransport` 环境变量读取

`process.env.WECHAT_FLOW_MCP_API_KEY` 作为 rawApiKey 读入，传给 `createServer` → `verifyApiKey`。

潜在面评估：
1. **泄漏面**：key 仅在进程内存中存在于 `rawApiKey` 临时变量，经 `hashApiKey` 后存入 store；原始字符串不持久化、不打印、不落日志（代码中无 `console.log`/`process.stdout.write` 含 rawApiKey 的路径）。环境变量本身由操作系统进程隔离保护，在 stdio MCP 典型部署场景（父进程 spawn 子进程）中不经网络传输。
2. **注入面**：`rawApiKey` 仅经 `hashApiKey`（SHA-256 散列），不用于 SQL/shell 命令/模板拼接，无注入向量。
3. **值缺失处理**：`process.env.WECHAT_FLOW_MCP_API_KEY` 未设时值为 `undefined`，`verifyApiKey` 首行 `if (!raw) return null`，返回 `E_AUTH_REQUIRED`；行为可预期，非崩溃。

结论：`startStdioTransport` 的环境变量读取模式无泄漏/注入风险，符合 stdio 单机场景的安全基线。

### 端到端鉴权测试断言强度

`callToolWithServer` 辅助函数（server.test.ts 第 30-43 行）通过 MCP SDK 的 `InMemoryTransport` 构造完整客户端-服务端通道，调用 `client.callTool`，从 `res.content[0].text` 解析 JSON，读取 `code` 字段。

断言绑定的是 Tool 响应体中 `code` 字段的具体字符串值（`"E_AUTH_REQUIRED"` / `"E_PERMISSION_DENIED"` / `"E_NOT_IMPLEMENTED"`），而非存在性/调用计数。三条用例覆盖了"无 key"、"admin key"、"有效 user key"全部正路径，属于契约级断言，不是弱断言。

---

## 问题列表

本次增量复审未发现新 CRITICAL 或 HIGH 问题。r1 的 R-006 LOW 维持 by-design 标注不计新问题。

无新问题录入。

---

## 总结

| 严重等级 | r1 数量 | 本轮（新） | 状态 |
|----------|---------|-----------|------|
| CRITICAL | 0 | 0 | — |
| HIGH | 1 | 0 | R-001 已消除 |
| MEDIUM | 3 | 0 | R-002/R-003/R-004 已消除 |
| LOW | 2 | 0 | R-005 已消除；R-006 by-design 不计 |

---

## Verdict

**approved**

r1 的全部 HIGH/MEDIUM 问题（R-001 端到端鉴权路径不通、R-002 非常数时间比较、R-003 注入点缺失、R-004 弱断言）均已消除；R-005 LOW fail-closed 已修复；R-006 LOW 已落 wiring-placeholder 标注。revision 新引入的 `timingSafeEqual` 循环逻辑正确（常数时间、安全跳过、空 store 处理无崩溃）；`guardUserScope` fail-closed 无绕过；环境变量读取无泄漏/注入面；端到端测试断言绑定真实契约字段。
