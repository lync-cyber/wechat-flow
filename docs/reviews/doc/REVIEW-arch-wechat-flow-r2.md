---
id: "review-arch-wechat-flow-r2"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data"]
---
# ARCH 文档增量审查报告 — wechat-flow r2

**被审文档**: arch-wechat-flow 0.2.0（主卷）+ arch-wechat-flow-modules + arch-wechat-flow-api + arch-wechat-flow-data（均 0.2.0）

**上轮报告**: `docs/reviews/doc/REVIEW-arch-wechat-flow-r1.md`（verdict: needs_revision，14 个问题）

---

## Layer 1 — 自动检查结论

| 分卷 | exit code | 关键发现 |
|------|-----------|---------|
| 主卷 (arch-wechat-flow.md) | **0 (PASS)** | WARN×3：行数 405 超阈值 / 跨分卷 API ID 不连续 / 跨分卷 E ID 不连续（正常现象） |
| 分卷-modules | 0 (PASS) | WARN×2：跨分卷 ID 不连续（正常现象） |
| 分卷-api | 0 (PASS) | WARN×2：行数 905 超阈值 / 跨分卷 M-012 引用未检出（正常） |
| 分卷-data | 0 (PASS) | WARN×2：行数 392 超阈值 / 跨分卷 ID 不连续（正常） |

**Layer 1 判定**：主卷从 r1 的 FAIL 变为 PASS。`sections_in_volumes` frontmatter 字段 + §2/§3/§4 占位句使 Layer 1 正确感知分卷结构。所有 WARN 均为跨分卷 ID 不连续或行数超阈值，均为已知正常现象，不阻断 Layer 2。

**进入 Layer 2。**

---

## Layer 2 — 增量 AI 语义审查

### r1 问题逐条验证

#### [R-001] HIGH → 已闭环
主卷 frontmatter 新增 `sections_in_volumes` 字段（§2→modules / §3→api / §4→data），NAV 块更新为含分卷引用的完整格式，§2/§3/§4 正文各有占位句并附超链接。`cataforge docs load arch-wechat-flow#§2` 可正确路由到分卷。Layer 1 主卷从 FAIL 变 PASS，问题**已消除**。

#### [R-002] HIGH → 已闭环
API 分卷 §3.5 新增 API-028..API-031（POST 创建 / GET 列出 / PATCH 轮换 / DELETE 吊销），含完整 Bearer admin-key + `X-Admin-Request: 1` header + IP 白名单 + 审计日志 + Zod request/response schema。M-009 `auth/scope-guard.ts` + M-010 `admin/api-keys.ts` + `auth/admin-guard.ts` 组件明确声明。NAV 及主卷占位句已同步更新为 `API-017..API-031`。问题**已消除**。

#### [R-003] HIGH → 已闭环
rn-005 (`tech-eval-stack-sanitizer.md`) 包含完整调研要素：三方案矩阵（rehype-sanitize / DOMPurify / sanitize-html）、推荐项、选型理由、来源 URL、"何时应重新评估"章节。§5.3 XSS 防护行明确声明 `rehype-sanitize 6.x`（基于 `hast-util-sanitize 5.x`）。M-002 `pipeline/sanitize.ts` 条目清晰标注 sanitizer 调用位置（mdast→hast 之后、M-003 过滤规则集之前）。CSS 属性二级白名单在 `pipeline/css-attr-filter.ts` 单独实现。问题**已消除**。

#### [R-004] HIGH → 已闭环
§5.2 新增"确定性容器迭代规范"子节，明确禁用 `Object.keys` / `Map.entries` / `Set.values` 隐式顺序，要求显式 `.sort()`，canonical JSON（`utils/canonical-json.ts`），定点数学（×1000 或 fractions.js）。M-002 内 `pipeline/serialize.ts` + `utils/deterministic.ts` 明确声明职责，`tests/cross-runtime/` 对每个 stage 输出运行 SHA-256 对比。问题**已消除**。

#### [R-005] MEDIUM → 已闭环
M-003 内新增"规则文件存放"小节，明确规则定义在 `packages/wechat-spec/src/rules/{rule-id}.ts`，fixture 在 `{rule-id}/input.html + expected.html + metadata.json`，多 case 时 `case-001/` 子目录。[previously-approved]（R-001..R-014 以外章节，MEDIUM 级，参见 r1）

#### [R-006] MEDIUM → 已闭环
§6.3 新增"部署约束基线"表，列出 Relay / MCP HTTP/SSE / Job Worker / y-websocket Server / Redis / SQLite 六个组件的端口、进程数/连接数、内存基线，并注明"deploy-spec 阶段按 SLO 校准"。问题**已消除**。

#### [R-007] MEDIUM → 已闭环
M-003 新增"PRD 19 条 vs ARCH ≥42 条差距"段落，明确说明 23+ 条来自微信客户端平台实测，并标注 `[ASSUMPTION]`"截至 dev-plan 阶段规则总数以 42 条为实现门槛"。问题**已消除**。

#### [R-008] MEDIUM → 已闭环（修复方案比建议更彻底）
架构改为 `srcdoc` + `sandbox="allow-scripts"`（不含 `allow-same-origin`），origin 为 null（opaque origin）。二级防御：sanitizer 全量移除 `on*` 属性 + CSS 二级白名单 + CSP meta 标签。理由完整说明（why not 空 sandbox / why not allow-same-origin）。r1 建议中的 `allow-same-origin` 风险已消除，采用更安全的 opaque origin 方案。但发现 **新问题（见 R-NEW-001）**。

#### [R-009] MEDIUM → 已闭环
API-018 response 改为 `z.object({ jobId: z.string().uuid(), statusUrl: z.string().url() })`，API-019 长图/封面 response 均改为 `z.object({ jobId: z.string().uuid(), statusUrl: z.string().url() })`。API-021 response 增加完整 `McpResponse` discriminatedUnion schema，含 `type: z.literal('result') | z.literal('error')` 顶层区分。问题**已消除**。

#### [R-010] MEDIUM → 已闭环
M-013 `enableSync` 返回值 `YDocBinding` 已补完整 TypeScript interface：`docId`/`doc`/`provider`/`awareness`/`sync` 状态机（`'idle'|'connecting'|'syncing'|'synced'|'error'`）+ `on`/`off`/`disconnect`/`destroy` 方法。问题**已消除**。

#### [R-011] LOW → 已闭环
主卷 NAV 改为 `API-001..API-016 含合并条目、API-017..API-031`，API 分卷 NAV 明确 `API-016（合并条目，含 6 个 Tool）`。下游引用 API 编号时无歧义。问题**已消除**。

#### [R-012] LOW → 已闭环
rn-001（monorepo）`## 何时应重新评估`：含 5 条触发条件。rn-002（frontend）`## 何时应重新评估`：含 5 条触发条件。rn-003（backend）`## 何时应重新评估`：含 5 条触发条件。rn-004（sync-protocol）已有。rn-005（sanitizer，新增）`### 何时应重新评估`：含 4 条触发条件。问题**已消除**。

#### [R-013] LOW → 已闭环
§1.4 Edge runtime 行版本改为 `wrangler 3.x + workerd (Cloudflare 2024.x runtime)`，调研来源改为 `Hono multi-runtime docs / Cloudflare workerd release notes`。问题**已消除**。

#### [R-014] LOW → 已闭环
主卷 §5.5 "后续"已删除，改为"支持按输入哈希定位历史 job 结果"，过程性表述已消除。问题**已消除**。

---

### 新发现问题

---

### [R-NEW-001] HIGH: iframe `sandbox="allow-scripts"` 与 CSP `default-src 'none'` 相互矛盾，导致主题 JS 钩子实际无法执行

- **category**: security
- **root_cause**: self-caused
- **描述**: §5.3 "预览 iframe 沙箱"在两个维度上存在矛盾：
  1. `sandbox="allow-scripts"` 从浏览器 sandbox 层面允许 iframe 内执行 JavaScript；架构设计理由声明这是为了支持"复制按钮、目录跳转"等主题 JS 钩子（`why not 空 sandbox` 一节）。
  2. 同一节点的 CSP 声明：`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;">`——`default-src 'none'` 且无 `script-src` 或 `script-src 'unsafe-inline'`，意味着 CSP 完全阻止 `<script>` 内联代码执行（既无来源也无 `unsafe-inline`）。
  
  实际效果：两层策略相互矛盾——sandbox 层放行 JS，CSP 层又阻止所有 inline script。按规范，CSP meta 标签优先于 sandbox 对脚本的放行，导致主题 JS 钩子（复制按钮、目录跳转等）在实际浏览器中会静默失败（CSP violation，无 JS 执行）。若目标是既支持主题 JS 钩子又防止恶意脚本，则 CSP 需要 `script-src 'unsafe-inline'`（弱化 CSP 但依赖 sanitizer 兜底），或改为完全禁 JS（`sandbox` 不含 `allow-scripts`，纯静态预览）。当前文档声称两者兼得，但实现路径不自洽。
  
  下游 tech-lead 在实现时需要做设计决策，但 ARCH 给出的方案无法直接落地，属于设计缺陷。
- **建议**: 从以下两个方向选一个明确：
  - **方向 A（允许主题 JS，依赖 sanitizer）**: CSP 改为 `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`，并在安全说明中明确 inline script 执行依赖 sanitizer 全量移除 `on*` + CSS 二级白名单作为前置防线。
  - **方向 B（完全禁 JS，纯静态预览）**: 去掉 `sandbox="allow-scripts"`，只保留 `sandbox=""` 或 `sandbox="allow-same-origin"`（后者有 r1 R-008 分析的风险，故建议空 sandbox），并说明主题 JS 钩子（复制按钮等）由父页面通过 postMessage 注入，而非在 iframe 内运行。
  
  决策应更新 Q3.8 决策记录说明最终选定方向。

---

### [R-NEW-002] MEDIUM: API-028/API-029 中 `scope` 字段类型与 E-010 数据模型不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: E-010 `scope` 字段说明如下：`'user'` 或 `'admin'`（粗粒度）+ 细粒度逗号分隔补充 `'render'` / `'upload'` / `'wechat-asset'` / `'sync'`，示例值 `'user,render,upload'`。但 API-028 创建端点的 request schema 为 `scope: z.enum(['user', 'admin'])`，只允许两个粗粒度值，无法创建带细粒度限制的 key。API-029 列表响应的 `scope: z.enum(['user', 'admin'])` 也只有两个值，但 E-010 存储的可能是 `'user,render,upload'` 等复合字符串。两处 schema 与数据模型对不上，tech-lead 在实现 API-028 时会遇到"数据模型有细粒度但 API 无法设置细粒度"的矛盾。
- **建议**: 二选一：(1) 若细粒度 scope 是有意设计为仅在数据库层直接操作（不通过 API 暴露），则在 E-010 说明中注明"细粒度 scope 仅供将来扩展，当前版本通过 API 创建的 key 只支持 `user`/`admin` 粗粒度"；(2) 若 API-028 应支持细粒度创建，则 request schema 改为 `scope: z.string()` 并附约束说明（`'user'` / `'admin'` / `'user,render'` 等）或用 `z.string().regex(scopePattern)`，同时 API-029 response 的 `scope` 字段改为 `z.string()`。

---

### 文档纪律扫描

- **过程标签 regex**: 扫描主卷 + 三分卷，"后续"在主卷 §5.5 已清除（R-014 闭环）；modules 分卷 M-003 末句"由后续 patch 版本承载"描述规则集版本策略（静态事实），不属于禁止的修订批次标注，**不计为违规**。
- **溯源引用**: 全文无 `issue #` / `PR #` / `fixes #` 等引用，合规。
- **版本里程碑**: 全文无"v0.x 起"/"MVP 阶段"类表述，合规。
- **任务用时估算**: 全文无时间估算，合规。
- **frontmatter version**: 主卷与三分卷均为 `version: "0.2.0"`，符合本轮修订要求。

---

## 三态判定

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 1（R-NEW-001: iframe CSP 与 sandbox 策略矛盾） |
| MEDIUM | 1（R-NEW-002: scope 字段 API/数据模型不一致） |
| LOW | 0 |

### r1 原有问题闭环情况

| 编号 | 严重等级 | 状态 |
|------|---------|------|
| R-001 | HIGH | 已闭环 |
| R-002 | HIGH | 已闭环 |
| R-003 | HIGH | 已闭环 |
| R-004 | HIGH | 已闭环 |
| R-005 | MEDIUM | 已闭环 |
| R-006 | MEDIUM | 已闭环 |
| R-007 | MEDIUM | 已闭环 |
| R-008 | MEDIUM | 已闭环（方案升级，引入新 HIGH） |
| R-009 | MEDIUM | 已闭环 |
| R-010 | MEDIUM | 已闭环 |
| R-011 | LOW | 已闭环 |
| R-012 | LOW | 已闭环 |
| R-013 | LOW | 已闭环 |
| R-014 | LOW | 已闭环 |

**verdict: needs_revision**

r1 全部 14 个问题均已闭环，架构师修订质量高。但 R-008 的修订方案（Q3.8）引入了一个新的 HIGH 级别设计缺陷（R-NEW-001：`sandbox="allow-scripts"` 与 CSP `default-src 'none'` 相互矛盾，主题 JS 钩子实际无法执行），需要在接口契约落地前厘清设计方向。R-NEW-002 为 MEDIUM，可在同一修订轮次处理。

修订完成后下一轮（r3）仅需确认 R-NEW-001 的方向选定及对应的 §5.3 + Q3.8 更新，R-NEW-002 的 scope 字段一致性修复，可快速复核。
