---
id: "code-review-T-036-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-036"]
---

# CODE-REVIEW T-036 — MCP server stdio transport + 鉴权骨架

Layer 1 delegated to hook（项目配置了 PostToolUse `lint_format` hook，biome check clean；跳过 Layer 1，直接进入 Layer 2 语义审查）。

## 审查范围

- `apps/mcp-server/src/auth/api-key.ts`
- `apps/mcp-server/src/auth/scope-guard.ts`
- `apps/mcp-server/src/tools/router.ts`
- `apps/mcp-server/src/transport/stdio.ts`
- `apps/mcp-server/src/index.ts`
- `tests/mcp-server/auth.test.ts`
- `tests/mcp-server/server.test.ts`

---

## 问题列表

### [R-001] HIGH: `registerAllTools` 硬编码 `null` keyRecord，端到端鉴权路径不通

- **category**: security
- **root_cause**: self-caused
- **描述**: `router.ts` 第 21 行 `dispatchTool(name, _args, null)` 无论请求来源如何，恒将 `keyRecord` 固定为 `null`。stdio transport 的 `startStdioTransport` 不注入 API key 上下文；`createServer` 亦无签名可接收 `ApiKeyStore`。结果是：所有经真实 stdio transport 到来的 Tool 调用，传入 `guardUserScope` 的永远是 `null`，`guardUserScope` 恒返回 `{ code: "E_AUTH_REQUIRED" }`，即**任何 Tool 调用都被拒绝**，而非仅无效 key 才被拒绝。这与 arch#§2.M-009 要求的"scope=user 可调 Tool"相悖。单测 `auth.test.ts` 通过是因为它直接调用 `dispatchTool(name, {}, { scope: "user" })` 注入了合法 record，绕过了 `registerAllTools` 的 wiring，使 AC-002/AC-003 仅在单测层面成立，端到端不成立。
- **建议**: T-036 范围内已存在 `ApiKeyStore` 与 `verifyApiKey` 的实现，但缺少"从 stdio 请求上下文中提取 API key 并 verify"的落地点。stdio transport 层无 per-request header，故常见做法是（a）从进程环境变量初始化固定 user key 供开发/单机场景；（b）在每条消息的 `_meta` 字段携带 key 并在 MCP tool handler 内解析。需在 `registerAllTools` 或 `ServerDeps` 中引入 `ApiKeyStore`（或提取好的 `ApiKeyRecord`），将鉴权解析结果传入 `dispatchTool`。若 stdio 场景本任务范围内确认不需 per-request key（全信任单进程模式），须在代码或任务卡中以 `wiring_placeholder: true` 显式标注并关联后续任务，而非静默 hardcode `null`。

---

### [R-002] MEDIUM: `verifyApiKey` 用 SHA-256 哈希裸比较，适合高熵 token 但缺少常数时间比较

- **category**: security
- **root_cause**: self-caused
- **描述**: `api-key.ts` 使用 `store.get(hash)` 做 Map 查找。Map 键比较是字符串相等判断，V8 的字符串比较不保证常数时间，理论上存在时序侧信道（timing side-channel）。对 API key 这类高熵（≥128 bit entropy）token，sha256 哈希后 hex 长度固定（64 chars），时序差异极小（微秒级），实际可利用性极低。但 arch#§5.3 明确"凭据隔离"为安全基线，`security_sensitive: true` 任务应采用最佳实践。
- **建议**: 使用 `crypto.timingSafeEqual`（Node.js `crypto` 内置）对哈希结果做常数时间比较，替换 Map 直接 `get`。实现方式：将 store 迭代改为遍历 + `timingSafeEqual`，或维护已知哈希 Buffer 做常数时间比对。若项目明确接受高熵 token 下时序侧信道可忽略不计的风险，需在代码中写一行注释说明原因（这是非显然 WHY，属于"隐式约束"类注释豁免）。

---

### [R-003] MEDIUM: `createServer` / `startStdioTransport` 不接受 `ApiKeyStore`，导致生产入口无法配置鉴权存储

- **category**: structure
- **root_cause**: self-caused
- **描述**: `transport/stdio.ts` 的 `ServerDeps` 仅含 `name` 和 `version`，`createServer` 不接受 `ApiKeyStore` 或任何鉴权上下文参数。这意味着即使修复了 R-001（在 `registerAllTools` 中传入 keyRecord），也需要修改 `ServerDeps` / `createServer` 签名才能从外部注入 key store。两处不匹配导致"注入点缺失"与"hardcode null"共同构成结构性问题。
- **建议**: 在 `ServerDeps` 中增加可选 `keyStore?: ApiKeyStore` 字段，`createServer` 将其透传给 `registerAllTools`；`startStdioTransport` 从环境变量读取 key 并初始化 store 后传入 `createServer`。此改动可与 R-001 修复合并，是同一 root cause 的两侧。

---

### [R-004] MEDIUM: AC-004 `main()` 测试仅验证"starter 被调用一次"，未覆盖 `startStdioTransport` 作为默认参数的 production 路径

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `server.test.ts` 第 31-38 行的 AC-004 测试注入了 `vi.fn()` 替代 starter，验证了 `main(start)` 调用 `start()` 一次。但 `main` 的默认参数是 `startStdioTransport`；test 未验证当不传参（`main()`）时默认走的是 `startStdioTransport`（第 33-36 行的 `expect(typeof startStdioTransport).toBe("function")` 是存在性断言，只验证导出存在，不验证 `main()` 默认调用的是它）。若默认参数被意外改为其他值，此测试仍然通过。
- **建议**: 补充一个 spy 测试：`vi.spyOn` 或 `vi.mock` 拦截 `startStdioTransport`，调用 `main()`（无参），断言被拦截函数恰好被调用一次。这才能真正验证 `main` 无参时默认 starter 与 `startStdioTransport` 一致。

---

### [R-005] LOW: `guardUserScope` 中 `scope=user` 通过路径依赖隐式假设，未穷举 scope 枚举值

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `scope-guard.ts` 当前逻辑：null → E_AUTH_REQUIRED，admin → E_PERMISSION_DENIED，其余（包含 user）→ null（通过）。这依赖了 `scope` 只有 "user" / "admin" 两个值。若 `ApiKeyRecord.scope` 未来新增值（如 "readonly" / "service"），新 scope 会默认通过 Tool 鉴权，这是隐式 allowlist 语义而非显式 allowlist。
- **建议**: 将最后的 `return null` 改为显式 `if (keyRecord.scope === "user") return null; return { code: "E_PERMISSION_DENIED" };`，或增加 `default` 分支拒绝未知 scope。这将枚举穷举逻辑与 TypeScript 类型系统对齐（TypeScript 类型收窄后的 unreachable 分支显式处理），防止 scope 扩展时的默认放行。

---

### [R-006] LOW: `dispatchTool` 忽略 `_args` 参数且不做任何 schema 校验

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `router.ts` 第 10 行 `_args: unknown` 参数被完全忽略（前缀 `_` 也是刻意标记）。T-036 范围内 24 个 Tool 均返回 `E_NOT_IMPLEMENTED`，args 校验是占位符阶段正确的 by-design。但此条记录在案：T-037/038 实现真实 Tool 时，需对每个 Tool 的 `_args` 做 schema 校验（`ALL_TOOL_SCHEMAS` 已存在），否则非法入参会直达业务层。
- **建议**: 此 LOW 为 follow-up 备忘，不阻塞 T-036。建议在 `dispatchTool` 或 `registerAllTools` 的 handler 中添加 `// cataforge: args-schema-validation required in T-037` 注释（或任务卡 `wiring_placeholder: true` 标注），确保后续任务接收时不遗漏。

---

## 总结

| 严重等级 | 数量 | 问题编号 |
|----------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 1 | R-001 |
| MEDIUM | 3 | R-002, R-003, R-004 |
| LOW | 2 | R-005, R-006 |

---

## Verdict

**needs_revision**

R-001（HIGH）：`registerAllTools` 硬编码 `keyRecord = null`，导致端到端所有 Tool 调用均被鉴权拒绝。`security_sensitive: true` 语境下此为阻塞级别问题。AC-002/AC-003 所对应的鉴权契约仅在单测直接调 `dispatchTool` 时成立，经真实 stdio transport 路径不成立。

R-002、R-003（MEDIUM）：安全实践改进与结构性签名缺失，与 R-001 修复高度关联，建议同批次修复。

R-004（MEDIUM）：测试存在性断言不能等价于行为验证，AC-004 存在漏洞。
