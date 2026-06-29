---
id: "code-review-T-124-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-124"]
---

# CODE-REVIEW T-124 r1 — plugin-api Worker 真实 bootstrap

Layer 1 delegated to hook（`.claude/settings.json` PostToolUse Edit → `lint_format`，biome 0 error/0 warning 已由 implementer 确认）。

## 审查范围

- `packages/plugin-api/src/worker/runtime.ts`
- `packages/plugin-api/src/acl/acl-request.ts`（新建）
- `packages/plugin-api/src/acl/network-gate.ts`
- `packages/plugin-api/src/acl/audit-log.ts`
- `packages/plugin-api/src/runtime/violation-result.ts`（新建）
- `packages/plugin-api/src/runtime/violation-detector.ts`
- `packages/plugin-api/src/fallback/placeholder.ts`
- `packages/plugin-api/src/surface/plugin-api.ts`
- `packages/plugin-api/src/validation/manifest-check.ts`
- `tests/plugin-api/worker-bootstrap.test.ts`（新建）
- `tests/plugin-api/sandbox.test.ts`（contract 同步）

---

## R-001 安全核心审查：checkNetworkAccess 通配符边界

`network-gate.ts` 的 `isBoundary()` + `matchSubdomainPattern()` 组合实现如下：

**标准前缀通配符**（`https://host*`）：
- `isBoundary` 检查 next char 是否属于 `{ '/', '?', '#', end-of-string }`
- 拒绝了 `.`（domain extension）、`@`（userinfo 注入）、`:`（port）、任意字母（host extension）
- `https://api.example.com*` 正确拒绝 `https://api.example.com.evil.org/`、`https://api.example.comATTACKER/`
- `@` userinfo bypass（`https://allowed.com@evil.com/`）：`@` 不在边界集合 → 正确拒绝

**子域通配符**（`https://*.example.com/*`）：
- `dotIdx = urlAfterScheme.indexOf(".example.com")`：在 `a.b.example.com` 上找到 `dotIdx=3`，`subdomain="a.b"` 含点 → 拒绝多级子域。
- `afterHost` 边界检查：`api.example.com:8080` 的 `afterHost[0]=':'` → 拒绝含端口的子域 URL（略为严格，是功能限制，非安全漏洞）。
- 路径参数绕过（`evil.com/x?d=.example.com`）：`subdomain="evil.com/x?d="` 含 `/` → 正确拒绝。
- 空 label（`https://.example.com/`）：`dotIdx=0 <= 0` → 正确拒绝。

网络隔离核心逻辑**正确**，未发现可利用的 ACL 绕过路径。

---

## 问题列表

### [R-001] HIGH: surface/plugin-api.ts requestResource 未完成 network-gate 委托

- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-124 deliverable 明确要求"surface/plugin-api.ts — requestResource 真实实现（requestResource 委托 network-gate）"，AC-003 要求"surface/plugin-api.ts 的 requestResource(url) 已接入 acl/network-gate.ts"。但当前实现（`surface/plugin-api.ts:102-105`）仍为永远抛出 `E_PERMISSION_DENIED` 的占位 stub：

  ```typescript
  async requestResource(_url: string): Promise<Response> {
    // Network access is proxied via ACL in production Comlink path.
    return Promise.reject(new Error("E_PERMISSION_DENIED"));
  }
  ```

  测试侧（`worker-bootstrap.test.ts` AC-003/AC-004）直接 import `acl/acl-request.ts` 的 `aclRequestResource` 进行测试，绕过了 surface 层的实际委托关系，导致测试绿色但 surface 层交付物未完成。`aclRequestResource` 仅在测试中调用，在生产代码路径中无任何引用。

- **建议**: 在 `createPluginSurface` 中，`requestResource` 应接收 `aclRequestResource` 作为注入依赖（或直接调用），将 URL 通过 network-gate 校验后再执行 fetch。Worker 侧若通过 Comlink RPC 调用，invoke 方法需路由到 `aclRequestResource`。

---

### [R-002] HIGH: manifest-check.ts requestResource 拒绝请求不写审计

- **category**: security
- **root_cause**: self-caused
- **描述**: `manifest-check.ts` 的 `requestResource` 函数（第 54-70 行）在拒绝请求时不记录审计：

  ```typescript
  if (!allowed) {
    throw new Error(E_PERMISSION_DENIED);  // 无 auditRecord({ action: "deny", ... })
  }
  auditRecord({ action: "allow", url, pluginId: manifest.id, ts: Date.now() });
  ```

  而同任务新建的 `acl-request.ts` 的 `aclRequestResource` 则两个分支都记录审计（allow 和 deny）。两函数形成互相矛盾的安全契约：`manifest-check.ts` 的拒绝事件在审计日志中不留痕迹，导致恶意插件的越权尝试无法被事后追溯。

  `sandbox.test.ts` 第 132-141 行更将"拒绝不记录审计"作为正向断言固化，进一步强化了这个安全盲点：

  ```typescript
  it("does not record an audit entry when access is denied", () => {
    // ...
    expect(audit).not.toHaveBeenCalled();
  });
  ```

- **建议**: `manifest-check.ts` 的 `requestResource` 应在拒绝路径也调用 `auditRecord({ action: "deny", ... })`，并同步修改 `sandbox.test.ts` 的对应断言以验证 deny 事件确实被记录。长期看应统一使用 `aclRequestResource` 替代 `manifest-check.ts` 中的实现。

---

### [R-003] MEDIUM: E_PERMISSION_DENIED 常量三处重复定义

- **category**: duplication
- **root_cause**: self-caused
- **描述**: T-124 正确消除了 `ViolationResult`/`FallbackPayload` 类型重复，但遗漏了同等重要的常量重复：
  - `packages/plugin-api/src/validation/manifest-check.ts:18` — `export const E_PERMISSION_DENIED = "E_PERMISSION_DENIED"`
  - `packages/plugin-api/src/acl/acl-request.ts:4` — `export const E_PERMISSION_DENIED = "E_PERMISSION_DENIED"`
  - `packages/plugin-api/src/surface/plugin-api.ts:104` — 字符串字面量 `"E_PERMISSION_DENIED"`（未引用任何常量）

  `packages/plugin-api/src/index.ts` 导出的是 `manifest-check.ts` 中的版本，而 `acl-request.ts` 自己又定义了一个同名同值版本，两者在类型层面不形成引用关系。

- **建议**: 将 `E_PERMISSION_DENIED` 移至单一权威来源（建议 `acl/acl-request.ts` 或独立的 `constants.ts`），其余模块改为 import；`plugin-api.ts:104` 的字符串字面量改用常量引用。

---

### [R-004] MEDIUM: Comlink 暴露的 invoke() 未路由到 aclRequestResource

- **category**: completeness
- **root_cause**: self-caused
- **描述**: `bootstrapWorker` 通过 `comlink.expose(createPluginRpc())` 暴露 RPC API，其 `invoke()` 方法（`runtime.ts:9-11`）仅返回 `null`，未与 `aclRequestResource` 建立路由关系：

  ```typescript
  async invoke(_method: string, _args: unknown[]): Promise<unknown> {
    return null;
  }
  ```

  Worker 内已通过 delete + `assertNetIsolation` 切断直接网络访问，但当插件通过 Comlink 调用 `invoke('requestResource', [url])` 时，将得到 `null` 而非 ACL 校验后的网络响应。安全隔离（负路径）工作正常，但被允许的请求（正路径）在 Comlink 层无法到达 `aclRequestResource`，使整个 ACL 实现在生产路径中功能失效。

- **建议**: `createPluginRpc` 的 `invoke` 应实现方法路由，将 `requestResource` 分发到 `aclRequestResource`；或将 `invoke` 替换为直接暴露 `requestResource` 等具名方法的对象。

---

### [R-005] LOW: 缺少 @userinfo 注入和多级子域的负路径测试

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `network-gate.ts` 的实现正确拒绝了两类攻击向量，但 `worker-bootstrap.test.ts` 的 R-001 测试段（第 438-488 行）未覆盖：
  - `@` userinfo 注入：`https://allowed.com@evil.com/path` 对 `https://allowed.com/*` 模式
  - 多级子域：`https://a.b.example.com/data` 对 `https://*.example.com/*` 模式

  `isBoundary` 对 `@` 的正确拒绝以及 `matchSubdomainPattern` 对含点子域的正确拒绝均无回归测试保护。

- **建议**: 补充两条负路径测试：① `checkNetworkAccess("https://allowed.com@evil.com/path", ["https://allowed.com/*"])` 应为 `false`；② `checkNetworkAccess("https://a.b.example.com/data", ["https://*.example.com/*"])` 应为 `false`。

---

### [R-006] LOW: sandbox.test.ts 与 worker-bootstrap.test.ts 的审计契约互相矛盾

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `sandbox.test.ts:132` 的测试明确断言"拒绝时不记录审计"（对应 `manifest-check.ts` 旧行为），而 `worker-bootstrap.test.ts:299-324` 的测试断言"拒绝时记录 `action:'deny'` 审计"（对应 `acl-request.ts` 新行为）。两套测试均通过，但它们文档化了互相矛盾的安全契约，使得读者无法判断拒绝审计是否为系统预期行为。

- **建议**: 在 `sandbox.test.ts` 中为对应测试添加注释，说明其测试的是 `manifest-check.ts` 旧路径（待废弃），与 `acl-request.ts` 的新行为有意不同；或直接将 `sandbox.test.ts` 中的旧行为断言更新以对齐新契约。

---

## 安全维度综合评估

| 维度 | 结论 |
|------|------|
| 网络隔离（delete + assertNetIsolation） | 正确：4 个全局删除 + 断言检查 + selfClose 兜底 |
| Comlink 暴露面最小化 | 正确：仅暴露 `{ invoke }` 接口 |
| network-gate 通配符边界 | 正确：isBoundary 覆盖 `./@/:` 等绕过路径 |
| 子域展开逻辑 | 正确：空 label / 多级 / 路径参数绕过均拒绝 |
| audit 不可变（getEntries 拷贝） | 正确：`[...this.entries]` |
| 类型去重（ViolationResult/FallbackPayload） | 正确 |
| surface requestResource 委托 | **缺失**（见 R-001）|
| Comlink invoke 路由 | **缺失**（见 R-004）|
| 拒绝事件审计 | **部分缺失**（manifest-check.ts，见 R-002）|

---

## Verdict

~~**needs_revision**~~（首轮结论，见下方 Revision 复核）

存在 2 个 HIGH（R-001 surface 委托未完成、R-002 拒绝事件不审计），2 个 MEDIUM（R-003 常量重复、R-004 invoke 路由缺失），2 个 LOW（R-005/R-006 测试覆盖与契约一致性）。

网络隔离的负路径安全机制（delete + assertNetIsolation + network-gate 边界）实现正确，ACL 绕过分析未发现漏洞；但 surface 层未完成 network-gate 委托（AC-003 可观测条件未满足）、拒绝审计缺失（forensic gap），须回归修复。

---

## Revision 复核（r1 闭环）

实跑验证命令：

- `pnpm vitest run tests/plugin-api/` → **3 passed（57 tests），0 failed**
- `pnpm --filter @wechat-flow/plugin-api typecheck` → **0 error**

### R-001 closed

`surface/plugin-api.ts` 第 2 行从 `acl/acl-request.ts` 引入 `aclRequestResource`；`createPluginSurface` 的 `requestResource` 方法（第 110-115 行）在 `acl` 依赖注入时调用 `aclRequestResource(url, acl.manifest, acl.auditLog, acl.fetch)`，未注入时 fail-closed（立即 reject `E_PERMISSION_DENIED`）。`aclRequestResource` 已进入 surface 生产引用链，不再仅存在于测试侧。闭环。

### R-002 closed

`manifest-check.ts` 第 68-70 行在拒绝分支调用 `auditRecord({ action: "deny", url, pluginId: manifest.id, ts: Date.now() })`，与 allow 分支对称。`sandbox.test.ts` 第 132-151 行对应测试已改为断言 `audit` 被调用一次且 `recorded.action === 'deny'`（不再是 `not.toHaveBeenCalled`）。拒绝审计 forensic gap 消除。闭环。

### R-003 closed

`acl/acl-request.ts` 第 4 行是 `E_PERMISSION_DENIED` 的唯一定义源。`manifest-check.ts` 第 1 行 import 并在第 4 行 re-export（不再独立定义）。`surface/plugin-api.ts` 第 2 行从 `acl/acl-request.ts` 直接引入常量，第 112 行使用常量引用而非字符串字面量。`index.ts` 经 `manifest-check.ts` re-export 链对外暴露，无循环依赖（acl-request.ts 不引用 manifest-check.ts 或 index.ts）。闭环。

### R-004 closed

`runtime.ts` 第 17-22 行 `invoke` 方法实现方法路由：`method === "requestResource"` 时从 `args` 取 `url`，调用 `aclRequestResource(url, deps.manifest, deps.auditLog, deps.fetch)` 并返回结果。Comlink 暴露面已完成 ACL 委托。闭环。

### R-005 closed

`worker-bootstrap.test.ts` 第 490-500 行新增两条负路径测试：① `checkNetworkAccess("https://allowed.com@evil.com/path", ["https://allowed.com/*"])` 断言 `false`（`@userinfo` 注入）；② `checkNetworkAccess("https://a.b.example.com/data", ["https://*.example.com/*"])` 断言 `false`（多级子域）。两者均以实际 false 断言，无 mock 旁路。闭环。

### R-006 closed

`sandbox.test.ts` deny 分支测试已更新为断言 `action:'deny'` 被记录，与 `worker-bootstrap.test.ts` 中对 `aclRequestResource` 的 deny 审计断言保持相同语义。两套测试不再文档化矛盾契约。闭环。

### 新问题扫描

- `acl?` / `rpc?` 可选注入：surface 无 acl 时 fail-closed（reject），Worker 无 rpc 时 invoke 返回 null 但网络全局删除和 assertNetIsolation 无条件执行，安全隔离不受影响。无安全回归。
- `manifest-check.ts` 的同步 `requestResource` 与 `acl-request.ts` 的异步 `aclRequestResource` 并存：`requestResource` 仍被 `sandbox.test.ts` 覆盖测试（非死码），两函数服务不同调用场景（同步回调 vs 异步生产路径），接口差异有据可查。无新 HIGH/CRITICAL。
- index.ts re-export 链无重复导出冲突，无循环依赖。
- 未发现为通过测试而弱化安全断言的情况。

**最终 verdict：approved**
