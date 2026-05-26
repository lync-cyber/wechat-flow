---
id: "review-arch-wechat-flow-r1"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data"]
---
# ARCH 文档审查报告 — wechat-flow

**被审文档**: arch-wechat-flow (主卷) + arch-wechat-flow-modules + arch-wechat-flow-api + arch-wechat-flow-data

---

## Layer 1 — 自动检查结论

| 分卷 | exit code | 关键发现 |
|------|-----------|---------|
| 主卷 (arch-wechat-flow.md) | **1 (FAIL)** | FAIL×3：脚本检测 §2 模块划分 / §3 接口契约 / §4 数据模型 缺失（内容已分卷，主卷无正文，脚本未感知分卷结构）；WARN×4：NAV 块章节与实际章节不一致 / 行数超 300 / ID 不连续（跨分卷） |
| 分卷-modules | 0 (PASS) | WARN×2：跨分卷 ID 不连续（正常现象） |
| 分卷-api | 0 (PASS) | WARN×2：行数 709 超阈值 / 跨分卷 M-012 引用未检出（正常） |
| 分卷-data | 0 (PASS) | WARN×1：行数 392 超阈值 |

**Layer 1 判定说明**：主卷 FAIL 原因为脚本对分卷结构的感知局限——§2/§3/§4 以注释形式声明见分卷，但脚本仍要求主卷正文存在对应章节。该 FAIL 属于工具局限（框架 Layer 1 已知场景），不反映文档实质性缺失。NAV 块不一致（WARN）属实质性问题，已在 Layer 2 中评级。

**所有分卷 PASS**，进入 Layer 2。

---

## Layer 2 — AI 语义审查

### 问题列表

---

### [R-001] HIGH: 主卷 [NAV] 块与实际章节不一致——§2/§3/§4 声明存在但主卷正文缺失章节标题

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 主卷 `[NAV]` 块声明了 `§2 模块划分`、`§3 接口契约`、`§4 数据模型` 三个节点，但主卷正文中这三个 `## 2.`/`## 3.`/`## 4.` 标题均不存在（内容已完整移至分卷）。按照文档导航约定，主卷 [NAV] 声明的章节应在主卷正文中有对应占位（即使仅一行指向分卷），否则任何通过 `cataforge docs load arch#§2` 等方式加载的下游消费方（tech-lead / developer）会得到空结果，陷入"章节声明存在但内容不可达"的困境。Layer 1 的三个 FAIL 正是此不一致的直接体现。
- **建议**: 在主卷 §2/§3/§4 位置各加一行占位，如 `> 见分卷 [arch-wechat-flow-modules.md](./arch-wechat-flow-modules.md)`，使 NAV 声明与实际文件结构对齐，同时让 `cataforge docs load` 和 Layer 1 检查可正确定位。

---

### [R-002] HIGH: MCP key 生命周期管理 admin API 在接口契约分卷中完全缺失

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 主卷 §5.3 安全明确声明"key 生命周期管理（创建 / 吊销 / 轮换）暴露 admin API"，PRD §3.2 也要求"具体 key 生命周期管理与吊销机制由 architect 阶段规划"。但分卷 arch-wechat-flow-api.md 的 API-017..API-027 中完全找不到任何 key 创建 / 吊销 / 轮换 / 列举的 REST endpoint。E-010 ApiKey 实体有 `revokedAt` 字段，M-009 `auth/api-key.ts` 也提及相关逻辑，但无对应的 API 契约。下游 tech-lead 无法依据 ARCH 实现 key 管理功能。
- **建议**: 在接口契约分卷的适当位置（§3.2 或新 §3.5）补充 API key 管理端点：`POST /api/v1/admin/api-keys`（创建）、`DELETE /api/v1/admin/api-keys/:id`（吊销）、`POST /api/v1/admin/api-keys/:id/rotate`（轮换）、`GET /api/v1/admin/api-keys`（列举），并声明鉴权要求（需 `scope=admin` 的 key）。

---

### [R-003] HIGH: XSS 防护的 sanitizer 选型未明确——缺少具体库名或实现路径

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: §5.3 安全行"XSS 防护"仅描述"sanitizer 在 `hast → pre-paste` stage 强制执行白名单标签 / 属性"，M-002 内也仅列出 `pipeline/sanitize.ts`，均未声明具体使用哪个库（`rehype-sanitize`、自实现白名单过滤器等选项有本质差异）。PRD §3.2 明确要求"禁止将用户输入直接以未过滤方式注入 DOM；任何等价于 `dangerouslySetInnerHTML` 的逃逸路径须由 sanitizer 守门"，这是安全基线，实现选型不明确会直接影响 security review 结论。
- **建议**: 在 §5.3 XSS 防护行的"架构机制"列补充 sanitizer 选型决策，如"使用 `rehype-sanitize` 配合自定义白名单 schema，inline style 属性额外经 CSS 属性白名单过滤"，或在 M-002 `pipeline/sanitize.ts` 条目中声明采用何种库及白名单来源。

---

### [R-004] HIGH: 确定性渲染对 Map 迭代顺序的处理未声明

- **category**: completeness
- **root_cause**: self-caused
- **描述**: §5.2 可靠性声明"core 不依赖 `Math.random` / `Date.now` / 文件系统 / 网络；序列化使用稳定排序的属性 key"，覆盖了最显见的非确定性来源，但遗漏了 JavaScript 中 `Map` 迭代顺序（insertion order，ES2015 保证，但跨 runtime 实现差异值得明确）、`Object.keys()` 顺序（V8 vs SpiderMonkey 实测有差异的边界场景）、`Set` 迭代顺序等。PRD §3.3 要求"字节级 SHA-256 一致"，跨四 runtime（V8/SpiderMonkey/WebKit/workerd）的任何迭代顺序差异都会破坏字节级一致性。架构文档未给出对这类边界的处理策略，implementer 无法从 ARCH 得知该如何写代码。
- **建议**: 在 §5.2 确定性渲染行补充：对 `Map`/`Object`/`Set` 的迭代顺序问题，规定在序列化前对 key 进行明确的字典序排序（如 `JSON.stringify(Object.fromEntries([...map.entries()].sort(...)))`），或在 M-002 `pipeline/serialize.ts` 条目中说明序列化规范覆盖这些边界。

---

### [R-005] MEDIUM: 规则集 fixture 目录结构与存储格式未具体化

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: ARCH §7.2 目录结构中列出 `tests/ruleset-fixtures/`，M-003 提及 `rules/builtin/ — ≥ 42 条内置规则`，PRD F-007 已给出 19 条示例。但全文找不到：(1) 规则集 fixture 的目录组织形式（按规则 ID、按 scope 分类，还是扁平排列）；(2) 规则定义的文件格式（TS 对象、JSON、YAML？）；(3) PRD 的 19 条示例规则与 ARCH 承诺的 ≥42 条之间的 23 条缺口，ARCH 未给出补充来源说明（实测规则库、已知平台特性文档等）或 `[ASSUMPTION]` 标注。tech-lead 在拆分 dev-plan 任务时将无法确定 fixture 目录结构，implementer 不知道如何组织 42 条规则文件。
- **建议**: (1) 在 M-003 或 §7.2 中补充 fixture 目录组织约定，如 `tests/ruleset-fixtures/{rule-id}/input.html + expected.html`；(2) 在 M-003 的 `rules/builtin/` 条目中补充规则文件形态（如每条规则一个 TS 文件导出 `RuleDefinition`），并对 PRD 19 条→ARCH 42 条的差距给出 `[ASSUMPTION]` 标注说明补充来源计划。

---

### [R-006] MEDIUM: §6.3 后端服务部署边界缺少端口和资源约束声明

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 审查重点第 8 项要求检查 §6.3 是否列出 Redis / SQLite / Playwright headless pool / y-websocket-server 四个部署单元的端口/网络/资源约束。当前 §6.3 描述了各部署单元的职责和配置，但未声明：(1) Redis 的默认端口与网络隔离要求；(2) Playwright headless pool 的进程数上限与内存预算（Chromium 单进程约 200MB，进程池无上限声明对 devops 阶段造成不确定性）；(3) y-websocket server 的最大并发 WebSocket 连接数与内存上限。devops 阶段规划容器 resource limit 时缺乏参考基线。
- **建议**: 在 §6.3 补充一张"部署约束基线"表，列出各后端组件的参考端口、内存下限、进程/连接数建议值（可以是范围而非精确值），并注明由 deploy-spec 阶段按实际规模调整。

---

### [R-007] MEDIUM: F-007 规则集 PRD 19 条示例 vs ARCH ≥42 条目标的关系未在 ARCH 中显式处理

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-007 明确说明"下表列出 19 条代表性规则示例……完整规则集（≥ 42 条）的详尽枚举由 architect 在 arch 阶段补充"。ARCH 接受了 ≥42 条的目标（§5.4 兼容性、M-003、E-004 中均有体现），但并未在任何地方给出剩余 23 条的来源计划——是由 architect 已归纳完毕放在实现阶段补充，还是以 `[ASSUMPTION]` 标注交 implementer 从微信平台实测中收集？此模糊性会导致 tech-lead 在拆 dev-plan 任务时对 M-003 的工作量范围判断不准确。
- **建议**: 在 M-003 或 §8 附录中增加一段说明，说明 23 条的补充计划（例："PRD 19 条为示例基线，实测补充规则由 implementer 阶段通过平台行为验证录入 `rules/builtin/`；[ASSUMPTION] 截至 dev-plan 阶段规则总数以 42 条为实现门槛"），使下游消费方知晓预期边界。

---

### [R-008] MEDIUM: §5.3 安全中 iframe preview 的 sandbox 属性设置存在潜在歧义

- **category**: security
- **root_cause**: self-caused
- **描述**: §5.3 XSS 防护行声明"iframe 预览使用 `sandbox="allow-same-origin"`（不开 `allow-scripts`）"。`allow-same-origin` 与 `allow-scripts` 不同时开启时，iframe 内的 JavaScript 完全被禁用，这意味着预览内容中任何依赖 JS 的渲染效果（如 Yjs 同步状态展示）都无法运行——这对于一个纯静态 inline-styled HTML 预览来说通常是正确的。但问题在于：(1) 当 `allow-same-origin` 单独开启时，iframe 内文档**可以访问父页面的 cookie 和 localStorage**（仅 script 执行被禁止，但若将来产物中注入了 event handler 属性如 `onerror` 则仍有风险）；(2) 若 sanitizer 白名单意外放过了 `on*` 属性，`sandbox="allow-same-origin"` 不提供 JS 执行保护。理想的 iframe 沙箱设置应为空 `sandbox`（完全隔离）或 `sandbox="allow-same-origin allow-scripts"` + CSP 守门——但 ARCH 未给出这个设计决策的完整推理。
- **建议**: 在 §5.3 中补充 iframe sandbox 属性的完整设计决策，说明为何选择 `allow-same-origin` 而非空 sandbox，以及 sanitizer 白名单如何保证 `on*` 属性不泄漏。或者将 sandbox 设为空（仅 allow-same-origin 用于 Clipboard API 需求时改为 allow-scripts + allow-same-origin，并加 CSP 头）。

---

### [R-009] MEDIUM: API-018 (wechat-assets/upload) 和 API-019 (renders/*) 的 response schema 不完整

- **category**: completeness
- **root_cause**: self-caused
- **描述**: 对照审查重点第 2 项（API request/response 完整性），检查各 API 的 response schema：
  - API-018 response `202` 写的是 `{ schema: "{ jobId: string }" }` — 使用了 string 而非 Zod 表达式，与 API-017、API-020 的正式格式不一致，tech-lead 无法确认是否需要 uuid 约束
  - API-019 (长图 + 封面) 的 202 response 同样使用 `{ schema: "{ jobId: string }" }` 裸字符串，缺少 uuid 约束说明
  - API-021 (MCP HTTP/SSE transport) response `200` 写的是 `MCP JSON-RPC response or SSE stream of MCP messages`——无 schema 结构，下游无从验证
- **建议**: 对 API-018 / API-019 的 202 response 统一改为 Zod 表达式（`z.object({ jobId: z.string().uuid() })`），与 API-017 保持格式一致；API-021 的响应格式说明添加 MCP JSON-RPC 协议引用或至少给出 `type: "result" | "error"` 的顶层区分。

---

### [R-010] MEDIUM: M-013 对外接口中 YDocBinding 类型未定义

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: M-013 的 `enableSync(docId, { wsUrl, authToken }) → YDocBinding` 接口返回 `YDocBinding` 类型，但全文（包括 M-012 schema 契约层）未给出 `YDocBinding` 的字段定义。下游使用方（如 M-001 编辑器 UI）在调用 `enableSync` 后如何获取连接状态、如何订阅 awareness 变更，无法从 ARCH 推断。
- **建议**: 在 M-013 的对外接口说明中，补充 `YDocBinding` 的最小结构定义，如 `{ docId: string, provider: WebsocketProvider, awareness: Y.Awareness, disconnect: () => void }`，或说明该类型从 `yjs` / `y-websocket` 外部包直接透传。

---

### [R-011] LOW: 主卷 NAV 块中 §3 引用"API-001..API-027"但 API-016 实际为合并条目

- **category**: consistency
- **root_cause**: self-caused
- **描述**: NAV 块 `§3 接口契约 → API-001..API-027` 暗示 27 个独立编号，但 API-016 是 6 个 Tool 的合并条目（4 个长任务 Tool + `get_job` + `get_ruleset_version`），实际物化后可能为 API-016a..API-016f。此不一致会在 dev-plan 引用 API 编号时产生歧义。
- **建议**: NAV 中改为 `API-001..API-016 (含 API-016 合并条目) + API-017..API-027`，或在 API-016 说明中明确"暂编为单条目，dev-plan 可展开为 API-016a..API-016f"。

---

### [R-012] LOW: tech-eval research notes 格式合规性——rn-001/rn-002/rn-003/rn-004 均缺少"何时应重新评估"章节（除 rn-004 外）

- **category**: convention
- **root_cause**: self-caused
- **描述**: 按审查重点第 12 项，tech-eval research notes 应包含"选项对比表 + 推荐项 + 选型理由 + 来源 URL + 何时应重新评估"五要素。经核查：rn-001（monorepo）、rn-002（frontend）、rn-003（backend）均缺少"何时应重新评估"章节；rn-004（sync-protocol）有该章节，格式完整。rn-001/rn-003 有来源 URL，rn-002 来源链接仅两条（Vue release notes + Svelte docs），未覆盖所有方案。
- **建议**: 为 rn-001 / rn-002 / rn-003 各补充一个"何时应重新评估"小节，说明该选型的重新评估触发条件（如 Turborepo 重大 API 变更 / Vue Vapor 生态覆盖率变化 / Hono 多 runtime 支持降级等）。

---

### [R-013] LOW: 主卷 §1.4 技术栈表中 Cloudflare Workers / Vercel Edge 的版本列为"—"

- **category**: convention
- **root_cause**: self-caused
- **描述**: §1.4 技术栈表中"运行时 (Edge)"一行的版本字段为"—"。虽然 Edge runtime 无独立版本号，但与其他所有行格式不一致，且 Cloudflare Workers runtime 版本（通过 `wrangler` 版本和 workerd 版本管理）对 `@cloudflare/vitest-pool-workers` 的兼容性有具体要求，"—"会让 tech-lead 在环境搭建时缺少参考。
- **建议**: 将版本列改为"wrangler 3.x / workerd latest"或类似具体引用，并在选型理由列或调研来源列补充 Miniflare/workerd 与 `@cloudflare/vitest-pool-workers` 的版本兼容信息。

---

### [R-014] LOW: 文档纪律扫描——主卷 §5.5"后续按输入哈希定位历史结果"含过程性表述痕迹

- **category**: convention
- **root_cause**: self-caused
- **描述**: 主卷 §5.5 可观测性最后一行："审计追溯：版本三元组与 `Idempotency-Key` 写入每条 job 记录，支持**后续**按输入哈希定位历史结果"——"后续"是时序性词汇，属轻微过程性表述，接近 CLAUDE.md §代码与文档纪律所限制的过程标签。
- **建议**: 改为"支持按输入哈希定位历史 job 结果"，去掉"后续"。

---

## 三态判定

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 4 (R-001..R-004) |
| MEDIUM | 6 (R-005..R-010) |
| LOW | 4 (R-011..R-014) |

**verdict: needs_revision**

存在 4 个 HIGH 级问题：主卷 NAV/章节不一致导致可达性问题（R-001）、admin API 完全缺失（R-002）、sanitizer 选型不明确影响安全基线（R-003）、确定性渲染对 Map 迭代顺序的处理未声明（R-004）。需要修订后重新提交审查。

---

## 修订优先级

1. **R-001**: 主卷 §2/§3/§4 补充占位行，修复 NAV 一致性（影响所有下游 doc-nav 加载）
2. **R-002**: 补充 admin API key 管理端点（安全功能完整性）
3. **R-003**: 明确 sanitizer 库选型（安全基线可追溯性）
4. **R-004**: 补充 Map/Object 迭代顺序序列化规范（确定性渲染完整性）
5. **R-005/R-006/R-007**: MEDIUM 问题可在同一修订轮次处理
