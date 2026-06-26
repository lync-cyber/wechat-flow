---
id: "code-review-T-047-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-047"]
---

# Code Review: T-047 — M-007 插件沙箱 Worker 骨架（Comlink RPC + 网络门禁）

> 本报告由 orchestrator inline 复核产出（reviewer 子代理派发本会话 4 次连接中断，按反复派发失败的兜底接管）。Layer 1 由 PostToolUse biome hook 兜底（biome 0 error）；Layer 2 安全/质量维度如下。

**Verdict**: approved_with_notes

被审：`packages/plugin-api/src/{acl/network-gate,acl/audit-log,worker/assert-net-isolation,runtime/violation-detector,fallback/placeholder,validation/manifest-check,worker/runtime}.ts` + `tests/plugin-api/sandbox.test.ts`（25 测试全 PASS）。AC-001..005 行为均经断言覆盖。

---

## 问题列表

### [R-001] LOW: network-gate 通配符前缀匹配未强制主机/路径边界

- **category**: security
- **root_cause**: self-caused
- **描述**: `checkNetworkAccess` 对以 `*` 结尾的 pattern 做 `url.startsWith(prefix)`。若插件 manifest 写 `https://host*`（无路径分隔符），会匹配 `https://host.evil.com/...`。当前以可信 manifest 为前提，风险取决于作者书写，但门禁语义应防御性更强。
- **建议**: 要求 pattern 含路径边界（如以 `/` 结尾）或对 host 段单独校验；或在 manifest-check 校验阶段拒绝无边界的裸 host 通配符。

### [R-002] LOW: worker/runtime.ts 为非功能骨架，真实 Worker 引导未实现

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `createPluginRpc().invoke` 返回 null 占位；真正的「启动期 `delete globalThis.fetch/XMLHttpRequest/WebSocket/EventSource` + Comlink RPC 桥接」未在 runtime 落地，AC-001/005 由 `assertNetIsolation` 单元断言而非 runtime 实际执行。符合任务「骨架」定位，但运行时沙箱尚未真正生效。
- **建议**: 标注为 wiring-placeholder 并登记后续任务：实际 Worker bootstrap（删除网络全局 + Comlink defineApi）。已并入 Sprint 5 wiring backlog。

### [R-003] LOW: ViolationResult 与 FallbackPayload 类型形状重复

- **category**: duplication
- **root_cause**: self-caused
- **描述**: `violation-detector.ts#ViolationResult` 与 `placeholder.ts#FallbackPayload` 均为 `{ type: "fallback"; reason: "timeout" }`，跨文件重复定义。
- **建议**: 抽取单一共享类型（如 `fallback/types.ts`），两处引用。

### [R-004] LOW: AuditLog.getEntries() 返回内部数组引用

- **category**: structure
- **root_cause**: self-caused
- **描述**: `getEntries()` 直接返回内部 `entries`，调用方可外部修改审计记录，破坏审计不可变性。
- **建议**: 返回浅拷贝（`return [...this.entries]`）或只读视图。

---

## Verdict

**approved_with_notes** — 0 CRITICAL / 0 HIGH / 0 MEDIUM / 4 LOW。沙箱骨架的纯函数/类单元实现正确且测试充分；LOW 项（网络门禁边界硬化、runtime 真实引导、类型去重、审计返回拷贝）记入 backlog，不阻塞落地。

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 4 (R-001..R-004) |
