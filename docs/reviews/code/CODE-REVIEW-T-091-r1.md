---
id: "code-review-t-091-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-091"]
---

# Code Review: T-091 — Editor Session JWT 颁发与续期端点（API-032）

Layer 1 delegated to hook（项目 `.claude/settings.json` 含 lint hook，编码阶段已通过 biome 实时检查；任务报告 biome 干净）

security_sensitive: true → Layer 2 强制执行，不短路。

---

## 问题列表

### [R-001] HIGH: oauth token 未校验即签发 JWT（E_AUTH 路径缺失）

- **category**: security
- **root_cause**: self-caused
- **描述**: API-032 契约明确定义 `401 E_AUTH — oauth token 验证失败`。然而 `issueEditorSession` 对 `bootstrap: 'oauth'` 路径接受任意 `oauthToken` 字符串（`z.string().min(1)`），不对上游 OAuth 提供方执行任何校验（无 introspect / token-info 调用，无签名验证，无 audience 检查）。攻击者可构造任意字符串获取有效 editor JWT。
- **建议**: 在核心层（`editor-session.ts`）或路由层增加 oauth token 校验逻辑（至少通过 `EditorSessionDeps` 注入 `verifyOAuthToken(provider, token): Promise<OAuthClaims>` 钩子）；缺省实现可在当前阶段 `throw new Error("E_AUTH: oauth verification not configured")` 保持 fail-closed，测试注入 stub；对应 `401 E_AUTH` 错误路径需增加测试覆盖。

---

### [R-002] HIGH: X-Editor-Origin CORS 白名单检查缺失（E_PERMISSION_DENIED 路径缺失）

- **category**: security
- **root_cause**: self-caused
- **描述**: API-032 契约定义 `X-Editor-Origin` 为必填 header，`403 E_PERMISSION_DENIED — origin 不在白名单 / IP 触发反滥用`。当前实现：① `issueBodySchema` 未声明该 header；② 路由处理器未读取 `X-Editor-Origin`；③ `EditorSessionDeps` 无白名单配置字段；④ 实际测试全部带上该 header 但从未触发校验。任何来源都可以调用该端点，CORS 限制形同虚设。
- **建议**: 在 `EditorSessionDeps`（或独立的 `EditorOriginGuard`）增加 `allowedOrigins: string[]` 配置；路由层在 zod 解析前读取 `X-Editor-Origin` 并与白名单比对，不在白名单时返回 `403 E_PERMISSION_DENIED`；补充白名单命中/未命中的测试用例。

---

### [R-003] MEDIUM: 错误响应格式与 ARCH 契约不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: ARCH §3 公共约定的统一 `ErrorResponse` 结构为 `{ error: { code, message, details?, requestId } }`，但实现返回的是扁平格式：`{ error: "E_QUOTA_EXCEEDED" }` / `{ error: "E_UNAUTHORIZED" }` / `{ error: "validation_error", issues: [...] }` / `{ error: "invalid_json" }` 等。下游客户端若按 `error.code` 解析会失败；`requestId` 字段完全缺失（无法追踪请求）。测试也按扁平格式断言（`body.error === "E_QUOTA_EXCEEDED"`），掩盖了不一致。
- **建议**: 统一错误响应为 `{ error: { code: "E_QUOTA_EXCEEDED", message: "...", requestId: "..." } }`；或在 ARCH 契约文档中将 API-032 的错误格式显式标注为 `简化格式`（但这属于文档 amendment，不是代码补丁）；无论哪条路，测试断言应与选定格式一致。

---

### [R-004] MEDIUM: 匿名 bootstrap 限流仅作用于 anonymous 分支，oauth bootstrap 无 IP 级限流

- **category**: security
- **root_cause**: self-caused
- **描述**: 当前限流逻辑（`rateLimiter.check(clientIp, ...)` 调用）仅在 `input.bootstrap === 'anonymous'` 分支执行。`bootstrap: 'oauth'` 路径没有任何速率限制，攻击者可高频枚举 oauth token 或大量签发 JWT。API-032 契约的 `429 E_QUOTA_EXCEEDED` 语义未限定仅匿名路径，且 `403 E_PERMISSION_DENIED — IP 触发反滥用` 对 oauth 路径同样适用。
- **建议**: 为 oauth bootstrap 也配置 IP 级速率限制（可用不同的 `rateLimiter` 实例或更宽的限额）；或在 `EditorSessionDeps` 中明确区分 `anonRateLimiter` 与 `oauthRateLimiter`，并在文档中阐明设计决策。

---

### [R-005] MEDIUM: AC-003「refresh 仅在 exp 前 1min 内有效」未实现也未测试

- **category**: completeness
- **root_cause**: self-caused
- **描述**: AC-003 要求「refresh（exp 前 1min 内）→ 新 JWT」，隐含仅在窗口内才可续期。`refreshEditorSession` 实现中无窗口检查——只要 JWT 未过期即可续期，exp 前 59min 同样可成功调用。测试用例通过控制 clock 进入 30s 窗口来触发续期，但从未验证「窗口外续期被拒绝」的反向路径。
- **建议**: 在 `refreshEditorSession` 中增加：`if (expMs - nowMs > 60_000) throw new Error("Refresh not yet allowed")`；对应添加「exp 前 90s 尝试续期应失败」测试。

---

### [R-006] MEDIUM: `extractBearer` 正则大小写不敏感但 RFC 7235 要求 `Bearer` 大写开头

- **category**: convention
- **root_cause**: self-caused
- **描述**: `extractBearer` 使用 `/^Bearer\s+(\S+)$/i` 允许 `bearer`、`BEARER` 等变体。RFC 7235 § 2.1 定义 `auth-scheme` 大小写不敏感，因此实现本身无安全问题；然而当前实现与 AC-005「token 在 Authorization header」的校验测试未覆盖大小写变体，且正则使用不敏感标志而其他鉴权逻辑（`resolveBearer` 调用方）隐式假设已正确提取，若业务上需要严格 `Bearer` 则应去掉 `/i`。这属于低风险惯例问题，但 `/i` 标志意图与实际测试不一致。
- **建议**: 去掉 `/i` 并明确仅接受标准 `Bearer`（RFC 7235 行为）；或补充大小写变体测试明确文档化宽松策略。

---

### [R-007] MEDIUM: `token-resolver.ts` 未处理 `iss` 为非 editor 的有效 JWT（长期 API key 路径形式不完整）

- **category**: completeness
- **root_cause**: self-caused
- **描述**: ARCH API-032 behavior 第 3 条：「JWT `iss='editor'` 时走 session 校验路径，API key（长期）走原 E-010 哈希校验路径」。`resolveBearer` 目前仅处理 editor JWT，当 `iss !== 'editor'` 时直接返回 `{ valid: false, iss: payload.iss }`——即使是一个合法 API key（长期 token 非 JWT 格式）也返回 false，不走 E-010 哈希校验。测试 R-004-test（`resolveBearer identifies long-term API key`）只验证了 `iss !== 'editor'`，未验证 API key 被实际验证通过。
- **建议**: `resolveBearer` 应在 `iss !== 'editor'` 分支调用 API key 哈希校验；若长期 key 验证是 T-091 范围外的功能（另一任务负责），应在代码中加 `// cataforge: wiring-placeholder` 注释并关联 backlog ID，并在测试中明确声明该路径是 stub（而非已完整实现的断言）。

---

### [R-008] LOW: `deviceFingerprint` 的 Zod 约束与 ARCH 契约不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: ARCH API-032 body schema 为 `deviceFingerprint: z.string().min(16).max(128)`，但 `issueBodySchema` 中仅声明 `z.string().min(1)`，少了 `.max(128)` 约束且最小长度从 16 降至 1。攻击者可传入单字符 fingerprint，绕过 fingerprint 稳定性假设。
- **建议**: 将 `deviceFingerprint` 的 schema 校正为 `z.string().min(16).max(128)` 与 ARCH 契约对齐；添加边界值测试（长度 1、15、16、128、129）。

---

### [R-009] LOW: `refreshUntil` 语义与 ARCH 契约描述不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: ARCH API-032 描述 `refreshUntil` 为「允许续期窗口（exp 前 1min 起）」——即续期窗口的**起始时刻**（`exp - 1min`），客户端应在 `now >= refreshUntil` 时才触发续期。实现中 `refreshUntil = expiresAt + SESSION_DURATION_MS`（即 exp 后再加 15min），语义变成「最晚可续期截止」。两种定义均合理但不同，实际行为（续期何时被允许）也因 AC-003 窗口检查缺失而未落地（见 R-005）。
- **建议**: 在 ARCH 或代码文档中明确 `refreshUntil` 的语义（起始 vs 截止）；按选定语义修正实现和测试；若定义为「续期窗口结束时刻」，则应与 R-005 的实现联动。

---

### [R-010] LOW: 测试中 oauthToken 未校验但测试文件未声明 stub 意图

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: 所有 oauth bootstrap 测试传入 `oauthToken: "gho_test_token_123"` 等字符串，由于当前无 oauth token 验证（见 R-001），这些字符串被静默接受。测试成功并非因为验证通过，而是因为验证根本不存在。测试注释 `/** In-memory session store ... */` 仅说明 session store 注入，未声明 oauth 验证路径是 stub。这导致 AC-001 测试套件给人「oauth 流程已完整」的错误印象。
- **建议**: 在 describe "AC-001" 块顶部添加注释，明确标注「oauth token 上游验证暂未实现，oauthToken 字段当前不做校验」；或在 `makeDefaultDeps` 中注入一个显式 stub `verifyOAuthToken: async () => ({ valid: true })`，让测试意图可见。

---

## 自检

出 verdict 前检查：
- CRITICAL：0
- HIGH：2（R-001 oauth 未验证、R-002 X-Editor-Origin 白名单缺失）
- MEDIUM：5（R-003 错误格式、R-004 oauth 无限流、R-005 续期窗口未实现、R-006 正则策略、R-007 长期 key 路径）
- LOW：3（R-008 schema 不一致、R-009 refreshUntil 语义、R-010 测试意图）

HIGH 存在 → verdict: **needs_revision**

---

## Verdict

**needs_revision**

关键安全路径问题：
1. **R-001 (HIGH)**: `bootstrap: 'oauth'` 路径接受任意 oauthToken，无上游 OAuth token 校验，可伪造 editor JWT。需注入 `verifyOAuthToken` 钩子并在缺省时 fail-closed。
2. **R-002 (HIGH)**: `X-Editor-Origin` CORS 白名单检查完全缺失，任意来源均可成功调用该端点，与 API-032 契约及 `403 E_PERMISSION_DENIED` 路径不符。

修复后可降至 approved_with_notes（MEDIUM/LOW 问题建议一并评估是否在同一 revision 中处理）。
