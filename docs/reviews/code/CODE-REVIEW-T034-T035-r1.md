---
id: "code-review-T034-T035-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-034", "T-035"]
---

# CODE-REVIEW T-034 / T-035 — Cluster B: Job Queue + Headless Rendering

Layer 1 delegated to hook (lint hook configured in project).

---

## per-task L2 维度表

| task | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | ac-coverage | wiring |
|------|-----------|----------------|--------------|-------------|-----------|------------|----------|----------|-------------|--------|
| T-034 | OK | MEDIUM（见 SR-B-001/002） | OK | OK | OK | OK | OK | MEDIUM（见 SR-B-003） | OK（见 SR-B-004 注） | OK |
| T-035 | OK | MEDIUM（见 SR-B-005） | OK | OK | OK | OK | OK | OK | OK | OK |

---

## 发现清单

### [SR-B-001] MEDIUM error-handling: SSE 终态事件后 bridge 监听器未 detach，存在内存泄漏

- **category**: error-handling
- **root_cause**: self-caused
- **file**: `apps/relay/src/routes/jobs.ts:76-93`
- **描述**: `GET /api/v1/jobs/:jobId/events` 在 `onEvent` 收到 `succeeded` 或 `failed` 时调用 `resolve()` 使 Promise resolve，`streamSSE` 的 `async stream` 函数随即返回——但此路径中 `bridge.detach()` 从未被调用。`detach()` 仅在 `stream.onAbort()` 回调中被调用（客户端主动断开场景）。结果是 `createSseBridge` 注册到共享 `sseEmitter` 上的四个 handler（`active`/`progress`/`completed`/`failed`）在连接正常结束后持续驻留，每个 SSE 请求泄漏 4 个监听器。当并发 SSE 连接数量增大或长期运行时，EventEmitter 将触发 `MaxListenersExceededWarning`，并在极端情况下引发难以排查的幻象事件传递（已 detach 的 bridge 实例仍持有 `attachedJobId` 引用但未清空）。
- **建议**: 在 `onEvent` 检测到终态事件后，于 `resolve()` 之前或之后额外调用 `bridge.detach()`。最简修法：

  ```ts
  onEvent: (event, data) => {
    stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    if (event === "succeeded" || event === "failed") {
      bridge.detach();   // 在 resolve() 前清理
      resolve();
    }
  },
  ```

  或将 detach 职责内化到 `sse-bridge.ts` 的 `handleCompleted`/`handleFailed` 中（自调 `detach()`），但需确保 `onEvent` 仍在 `detach()` 之后触发一次。

---

### [SR-B-002] MEDIUM error-handling: POST /api/v1/jobs 未校验必填字段（kind/input/apiKeyId），缺字段时行为未定义

- **category**: error-handling
- **root_cause**: self-caused
- **file**: `apps/relay/src/routes/jobs.ts:16-42`
- **描述**: 路由直接对 `await c.req.json()` 的结果进行解构赋值 `const { kind, input, apiKeyId } = body`，未对必填字段做存在性和合法性校验。当客户端省略 `kind` 或 `apiKeyId` 时，`kind` 为 `undefined`，后续传入 `enqueue(undefined, ...)` 或 `computeIdempotencyKey` 时行为取决于下游实现——`createQueue(undefined, ...)` 会创建名称为 `bullmq-undefined` 的队列，且 BullMQ 不会抛出而是静默接受。`apiKeyId` 缺失时幂等 key 的隔离性(`idem:undefined:...`)完全失效，不同用户的幂等记录会发生碰撞。此外 `kind` 未被约束为 `JobKind` 合法值，任意字符串均可通过，在 `render-processor.ts` 中被 `throw new Error('unsupported render kind: ...')` 抛出，以未处理的 Worker 错误形式表面化。
- **建议**: 在解构前增加最简校验：

  ```ts
  const VALID_KINDS: Set<string> = new Set(["long-image-render", "cover-render", "image-upload", "wechat-asset-upload"]);
  if (!kind || !VALID_KINDS.has(kind) || !apiKeyId || typeof apiKeyId !== "string") {
    return c.json({ error: { code: "E_INVALID_REQUEST", message: "missing or invalid kind/apiKeyId" } }, 400);
  }
  ```

  或引入 zod schema 对请求 body 做完整校验（更符合 ARCH `arch#§5.3` 错误处理策略）。

---

### [SR-B-003] MEDIUM security: POST /api/v1/jobs 无鉴权中间件保护，apiKeyId 由客户端自报

- **category**: security
- **root_cause**: self-caused
- **file**: `apps/relay/src/routes/jobs.ts:15-43`
- **描述**: `apiKeyId` 完全由请求 body 的 `apiKeyId` 字段自报，路由中无任何鉴权中间件验证该 key 的有效性。任意客户端可以伪造任意 `apiKeyId` 进行 job 提交，导致：①幂等隔离失效——攻击者可碰撞他人的幂等记录；②资源滥用——无限制地将 render job 写入 BullMQ 队列；③计费/配额归因完全不可信。注：CLAUDE.md §待办 已记录 `T-033 deferred R-007 editor-session 与 auth 中间件`，说明 auth 中间件是计划中的独立任务，属 upstream-gap 范畴而非完全遗漏。但当前状态下此端点在生产路径上是开放的，严重等级应标记以追踪。
- **建议**: 短期内添加简单的 API key 存在性校验中间件（验证 `apiKeyId` 在 key store 中存在），或至少添加 `Authorization` 头提取逻辑，避免完全依赖 body 自报的 `apiKeyId`。长期由 T-091/auth 中间件任务彻底解决。

---

### [SR-B-004] LOW test-quality: T-034 AC-001 的 POST 路由测试中 enqueue 回调未将记录写入 store，导致 GET 状态验证靠 store 预置而非 enqueue 产物

- **category**: test-quality
- **root_cause**: self-caused
- **file**: `tests/relay/job-queue.test.ts:117-143`
- **描述**: "POST /api/v1/jobs enqueues a job and returns a jobId string" 这一测试仅校验了 `res.status === 200` 和 `body.jobId` 的类型/非空，但 `enqueue` 回调中虽调用了 `store.upsert(record)`，所用的 `record.jobId` 是 fixture 固定值 `"00000000-0000-0000-0000-000000000001"`，而实际返回给客户端的也是这个固定 `jobId`——两者绑定在一起。若改为 `enqueue` 内不 upsert，或产生不同 jobId，测试仍然 PASS 但业务逻辑已断。这是弱断言，但严重程度有限（上下文已有 GET 路由用预置 record 验证 state，整体 AC 已覆盖）。
- **建议**: 在 POST 测试后追加一次 GET `/api/v1/jobs/${body.jobId}` 请求验证状态，让测试形成 POST→GET 链，断言强度更高。

---

### [SR-B-005] MEDIUM error-handling: playwright-pool 中 ensureBrowsers 存在并发竞态，多个并发 withPage 调用可能突破 size 上限

- **category**: error-handling
- **root_cause**: self-caused
- **file**: `apps/relay/src/headless/playwright-pool.ts:14-19`
- **描述**: `ensureBrowsers()` 检查 `browsers.length < size` 并 `while` 循环 `push`，但该函数是 `async` 的且未加锁。若两个 `withPage()` 调用并发到来且 `browsers` 为空，两个协程都会通过 `while` 条件检测并各自进入 `chromium.launch()`。由于 `await` 点上的让步，两者都可能在对方完成之前读到 `browsers.length === 0`，结果创建出 2 个（甚至更多）浏览器实例，超过 `size` 上限。在 `size=1`（job-worker 默认 POOL_SIZE=2 但 render test 使用 `size:1`）场景下可能多启动浏览器，增加内存开销，且 `nextIndex % browsers.length` 之后基于比预期更多的浏览器数量轮询。
- **建议**: 使用初始化 Promise 单例避免重复并发 launch：

  ```ts
  let initPromise: Promise<void> | null = null;
  function ensureBrowsers(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        while (browsers.length < size) {
          browsers.push(await chromium.launch({ headless: true, channel: "chromium" }));
        }
      })();
    }
    return initPromise;
  }
  ```

  注意：若后续 `close()` 后需要重新 launch，则 `initPromise` 需在 `close()` 时重置为 `null`。

---

### [SR-B-006] LOW consistency: runtime.ts 中 enqueue 函数 idempotencyKey 字段与 inputDigest 字段赋值相同，职责重叠

- **category**: consistency
- **root_cause**: self-caused
- **file**: `apps/relay/src/job/runtime.ts:57-71`
- **描述**: 在 `enqueue` 函数中，`idempotencyKey` 和 `inputDigest` 均被赋值为 `computeIdempotencyKey(...)` 的结果（同一个值），但两者在 `JobRecord` 类型定义中是独立字段，语义应有区分（`idempotencyKey` 是客户端提供的原始 key 或合成 key；`inputDigest` 是 input 内容的哈希）。在 `bullmq-store.ts` 中 `idemIndexKey(record.apiKeyId, record.idempotencyKey)` 构建的是 `jobidem:{apiKeyId}:{idempotencyKey}` 而非 `idem:` 前缀，与 `idempotency.ts` 中 `buildRedisKey` 使用的 `idem:` 前缀形成**双套幂等存储**——routes 层使用 `checkIdempotency` 走 `idem:` key，而 `BullmqJobStore.upsert` 额外写 `jobidem:` key，两套之间无同步逻辑，前者失效后不会查后者。这造成幂等机制存在两个独立存储路径，容易引发不一致。
- **建议**: 明确一套幂等存储路径的 SSOT；若 `jobidem:` index 用于 `findByIdempotency` 的备用查询，文档化这两套存储的关系；若 `inputDigest` 应该是 SHA256 of input（不含 `apiKeyId`/`key`），则 `runtime.ts:enqueue` 计算时应只对 input 部分哈希，与 routes 层的完整复合 key 区分开。

---

### [SR-B-007] LOW dead-code: SseBridgeDeps 中的 onEvent 字段类型与实际 SseBridge 接口声明了 detach() 但 SseBridgeDeps.onEvent 更像是回调注入

- **category**: dead-code
- **root_cause**: self-caused
- **file**: `apps/relay/src/job/types.ts:43-52`
- **描述**: `SseBridgeDeps` 的 `onEvent` 字段在接口 `SseBridge` 之外独立声明，而 `SseBridge` 的实现（`sse-bridge.ts`）并未将 `onEvent` 暴露给外部——它是构造时注入的闭包参数。类型上的 `SseBridgeDeps` 中同时有 `emitter` + `onEvent` + `initialRecord`，而 `SseBridge` 对外只有 `attach`/`detach`，这是合理的设计。标记为 LOW 因为 `SseBridgeDeps` 作为构造参数类型是必要的，严格来说不是 dead-code，只是接口文件中 deps 与 output 没有在同一 interface 注释中加以区分，可读性稍弱。
- **建议**: 可选：将 `SseBridgeDeps` 重命名为 `CreateSseBridgeOpts` 或加注释区分"工厂参数"与"产物接口"，提升可读性。

---

## Cluster B 结论

**verdict: approved_with_notes**

存在 3 个 MEDIUM 问题（SR-B-001 SSE 监听器泄漏、SR-B-002 请求字段缺校验、SR-B-005 playwright-pool 并发竞态）和 1 个 MEDIUM 安全问题（SR-B-003 鉴权缺失，该问题已在 CLAUDE.md 中以 deferred 方式追踪，属 upstream-gap 范畴），无 CRITICAL 或 HIGH 问题。测试分层（纯逻辑 DI 永跑 + 基础设施 gate）执行正确，AC-001~004 均有有效覆盖，wiring 从 `main.ts → createJobsRuntime → jobsDeps → createApp → createJobsApp → routes` 链路已验证贯通。
