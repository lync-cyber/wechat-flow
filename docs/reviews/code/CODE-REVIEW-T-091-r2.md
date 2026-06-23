---
id: "code-review-t-091-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-091"]
---

# Code Review: T-091 — Editor Session JWT 颁发与续期端点（API-032）增量再审（r2）

Layer 1 delegated to hook（项目 `.claude/settings.json` 含 lint hook；任务报告 biome 干净）

security_sensitive: true → Layer 2 强制执行，不短路。

增量审查模式：仅审 revision diff 涉及的文件和函数；r1 中无 CRITICAL/HIGH 的维度标注 `[previously-approved]`。

---

## R-001 复核：OAuth token 未校验（r1 HIGH → 已修复？）

**审查结论：已修复，升为 [previously-approved]**

核验点：
1. `EditorSessionDeps` 新增 `verifyOAuthToken: (provider: OAuthProvider, token: string) => Promise<OAuthClaims | null>` — 已确认（editor-session.ts L27）
2. `resolveSubject()` 在 oauth 分支调用 `deps.verifyOAuthToken`，返回 `null` 时抛 `EditorAuthError` — 已确认（editor-session.ts L52-56），fail-closed
3. 路由层 catch `EditorAuthError` → 返回 `401 E_AUTH` — 已确认（routes/editor-session.ts L66-69）
4. `makeDefaultDeps` 注入真实 stub：`token.startsWith("invalid") ? null : { sub: ... }` — 已确认（test L29-32），意图可见
5. HTTP 层 401 E_AUTH 测试：传 `"invalid-oauth-token"` → 期望 `status 401 + body.error === "E_AUTH"` — 已确认（test L271-291），断言有效
6. 核心层 `issueEditorSession` 抛错测试：`"invalid-direct"` → `.rejects.toThrow()` — 已确认（test L293-300）

**r1 R-001 HIGH 关闭。**

---

## R-002 复核：X-Editor-Origin 白名单缺失（r1 HIGH → 已修复？）

**审查结论：已修复，升为 [previously-approved]**

核验点：
1. `EditorSessionDeps` 新增 `allowedOrigins: string[]` — 已确认（editor-session.ts L29）
2. 路由处理器在 JSON 解析前先读取 `x-editor-origin` header，不在 `deps.allowedOrigins` 时返回 `403 E_PERMISSION_DENIED` — 已确认（routes/editor-session.ts L37-40），check 顺序在解析前（fail-fast）
3. `makeDefaultDeps` 注入 `allowedOrigins: ["https://editor.example.com"]` — 已确认（test L31）
4. 非白名单 origin → 403 E_PERMISSION_DENIED 测试 — 已确认（test L232-252），断言 `status 403 + body.error === "E_PERMISSION_DENIED"`
5. 缺失 origin header → 403 测试 — 已确认（test L254-269），`!origin` 分支覆盖

**r1 R-002 HIGH 关闭。**

---

## 新增代码全维度审查

以下对 revision diff 新增代码进行全维度扫描。

### R-004（限流）复核 — diff 新增路径

r1 R-004 MEDIUM 指出：限流仅在 anonymous 分支，oauth 无 IP 级限流。

**本轮观察**：revision 将 `rateLimiter.check` 移至 `issueBodySchema.safeParse` 之后、`issueEditorSession` 调用之前（routes/editor-session.ts L56-61），**不区分 bootstrap 类型**，oauth 路径同样经过限流检查。

核验：路由 L56-61 无分支判断，`rateLimiter.check(clientIp, deps.clock())` 在 `parsed.data` 赋值后统一执行，覆盖 anonymous + oauth 两路径。

**r1 R-004 MEDIUM 已修复**，降为 [previously-approved]。

---

### 新维度：安全（security）— origin 检查位置

origin 白名单检查在 JSON 解析（`c.req.json()`）之前（L37-40），这是正确设计——未授权 origin 无法触发 JSON 解析路径，避免潜在的 JSON 解析侧信道。**无问题。**

---

### 新维度：error-handling — EditorAuthError 捕获范围

routes/editor-session.ts L63-71 中 `try { ... } catch (e) { if (e instanceof EditorAuthError) { ... } throw e; }` 正确区分 `EditorAuthError`（401）与其他内部错误（re-throw），符合 fail-closed 原则。**无问题。**

---

### 新维度：test-quality — 新增 4 个安全测试

**断言有效性**：
- `rejects request whose X-Editor-Origin is not allowlisted`：断言 `status 403` + `body.error === "E_PERMISSION_DENIED"` — 有效
- `rejects request with missing X-Editor-Origin header`：断言 `status 403` — 有效（缺少 body.error 断言，但已足够覆盖核心路径）
- `rejects oauth bootstrap with 401 E_AUTH when token verification fails`：断言 `status 401` + `body.error === "E_AUTH"` — 有效
- `issueEditorSession rejects when oauth token verification returns null`：`.rejects.toThrow()` — 弱断言（未校验抛出的错误类型/消息），但可接受作为最低覆盖

**边界覆盖**：

当前未覆盖：`verifyOAuthToken` 抛出异常（非 null 返回，如网络超时）时的行为——`resolveSubject` 未 catch，异常会穿透到路由 L63 的 try/catch，但由于仅捕获 `EditorAuthError`，网络异常会被 re-throw 进而成为 500。这是与 R-001 stub 接口设计的微妙边界，属于防御性考量。

---

## 维度汇总（增量）

| 维度 | r1 状态 | 本轮结论 |
|------|---------|---------|
| security: oauth 未验签 (R-001) | HIGH | **已修复 [previously-approved from r1]** |
| security: origin 白名单 (R-002) | HIGH | **已修复 [previously-approved from r1]** |
| security: oauth 无限流 (R-004) | MEDIUM | **已修复 [previously-approved from r1]** |
| consistency: 错误格式 (R-003) | MEDIUM | [previously-approved from r1]（跨切任务，deferred） |
| completeness: refresh 窗口 (R-005) | MEDIUM | [previously-approved from r1]（deferred） |
| convention: Bearer 大小写 (R-006) | MEDIUM | [previously-approved from r1]（deferred） |
| completeness: 长期 key 路径 (R-007) | MEDIUM | [previously-approved from r1]（deferred） |
| consistency: deviceFingerprint schema (R-008) | LOW | [previously-approved from r1]（deferred） |
| consistency: refreshUntil 语义 (R-009) | LOW | [previously-approved from r1]（deferred） |
| test-quality: stub 意图 (R-010) | LOW | **已改善**（makeDefaultDeps 显式注入 verifyOAuthToken stub，意图可见）[previously-approved from r1] |
| test-quality: verifyOAuthToken 抛异常路径 | 新增观察 | LOW（见下） |

---

## 问题列表（本轮新增）

### [R-011] LOW: `verifyOAuthToken` 抛出异常时 500 而非 401/503

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `resolveSubject` 仅处理 `verifyOAuthToken` 返回 `null` 的场景（抛 `EditorAuthError`）；若 `verifyOAuthToken` 自身抛出异常（如网络超时、OAuth 提供方不可达），异常穿透到路由 L63 的 catch 块——由于 `instanceof EditorAuthError` 为 false，异常被 re-throw，Hono 框架将其渲染为 500。API-032 对 OAuth 提供方不可达的行为未定义，但 500 将内部实现细节暴露给调用方，且会被客户端误判为服务故障。测试中无任何用例覆盖 `verifyOAuthToken` 抛异常路径。
- **建议**: 在 `resolveSubject` 的 oauth 分支对 `verifyOAuthToken` 调用增加 try/catch，将异常转为 `EditorAuthError`（或专用的 `EditorServiceUnavailableError`）并返回 `503 / 401`；同时补充 `verifyOAuthToken: async () => { throw new Error("network error") }` 测试用例，验证不泄露 500。

---

## 自检

出 verdict 前检查：
- CRITICAL：0
- HIGH：0（r1 R-001/R-002 均已修复核验通过）
- MEDIUM：0（r1 R-003/R-004/R-005/R-006/R-007 中 R-004 本轮修复，其余已 deferred）
- LOW：1（R-011 新增，error-handling；r1 LOW 问题均 deferred）

无 CRITICAL/HIGH，有 LOW → verdict: **approved_with_notes**

---

## Verdict

**approved_with_notes**

r1 的两个 HIGH 问题（R-001 oauth 未验签、R-002 origin 白名单）均已正确修复，并有有效测试覆盖：

- R-001：`verifyOAuthToken` 依赖注入 + fail-closed `EditorAuthError` + 路由 401 映射 + HTTP 层及核心层双覆盖测试
- R-002：`allowedOrigins` 注入 + 路由前置检查（解析前） + 非白名单/缺失两路径测试

r1 R-004 限流覆盖 oauth 路径的 MEDIUM 问题也在本轮 revision 中一并修复。

剩余问题（R-003/R-005/R-006/R-007/R-008/R-009/R-010）已登记为 deferred，按原计划在 sprint-review 批量处理。新观察到 R-011（LOW）为防御性建议。

**notes_summary**: R-011 LOW — `verifyOAuthToken` 抛异常时未捕获，可能暴露 500；建议在 `resolveSubject` 加 try/catch 转为受控错误并补充测试。其余 deferred MEDIUM/LOW 不影响当前安全路径正确性。
