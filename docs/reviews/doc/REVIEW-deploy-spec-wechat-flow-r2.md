---
id: "review-deploy-spec-wechat-flow-r2"
doc_type: review
author: reviewer
status: approved
deps: ["deploy-spec-wechat-flow"]
---

# REVIEW: deploy-spec-wechat-flow (r2, 增量复审)

## 审查范围
- 复审类型: Revision Protocol Step 4 增量复审，针对 `docs/reviews/doc/REVIEW-deploy-spec-wechat-flow-r1.md` 的 6 个问题（R-001~R-006）
- 主审对象: `docs/deploy-spec/deploy-spec-wechat-flow.md`（修订版）+ `.gitignore`（新增 4 规则）+ `docker-compose.yml`（mcp-server healthcheck）
- 范围收窄: 仅复审 6 个问题的修复处 + 修复涉及的新增/改写章节（§2.2/§2.3/§5 开篇/§6 图床行/§7 容器行/§9-D1/D4/D6）全维度；其余无 CRITICAL/HIGH 的 r1 维度标 [previously-approved]（见下）

## Layer 1 结果
`cataforge skill run doc-review -- deploy-spec docs/deploy-spec/deploy-spec-wechat-flow.md`

```
WARN: 环境配置应至少包含 dev 和 prod 环境
WARNINGS: 1
PASS: 所有检查通过
```

判定：exit 0（PASS + 1 WARN），与 r1 相同的已知误报（checker 未识别表格形态的环境声明），不计入问题列表。

## 逐问题复核

### R-002 CRITICAL（`.gitignore` 声明与实际配置不符）— 已修复，实证通过

亲手重跑（非信任修复方自报）：

```
$ touch .env.dev .env.staging .env.prod .env.example .env.dev.local
$ git check-ignore -v .env.dev .env.staging .env.prod .env.example
.gitignore:17:.env.dev	.env.dev
.gitignore:18:.env.staging	.env.staging
.gitignore:19:.env.prod	.env.prod
.gitignore:20:!.env.example	.env.example
```

`.env.dev`/`.env.staging`/`.env.prod` 三个真实密钥文件均命中忽略规则；`.env.example` 命中的是取反规则（`git status --short` 确认其仍作为可追踪的 untracked/tracked 文件出现，不被忽略）。走的是 r1 建议的方案①（新增显式规则，而非改文档措辞迁就旧 `.gitignore`）。

spec §2.2 陈述与 `.gitignore` 实况逐字比对：正文声称"`.gitignore` 显式列出 `.env` / `.env.local` / `.env.*.local` / `.env.dev` / `.env.staging` / `.env.prod` 六条规则，并用 `!.env.example` 显式排除模板文件"——与 `.gitignore` 第 14-20 行实际内容（6 条规则 + 1 条例外）逐字符一致，且正文内联的 `git check-ignore -v` 输出样例与本次亲测输出完全吻合（文件名、行号、匹配规则均一致）。无夸大或漏报。

**结论：R-002 修复有效，CRITICAL 消除。**

### R-006 HIGH（反复引用不存在的 `pre_deploy` 人工检查点）— 已修复，逐处核实

```
$ grep -n "pre_deploy" docs/deploy-spec/deploy-spec-wechat-flow.md
145: ...本项目 `MANUAL_REVIEW_CHECKPOINTS` 现仅含 `[pre_dev]`，不含 `pre_deploy`——该补验证无自动门禁兜底，需开发者...主动执行...
229: ...本项目 `MANUAL_REVIEW_CHECKPOINTS` 仅含 `[pre_dev]`，无 `pre_deploy` 自动门禁兜底该项，需开发者在 release tag 推送前主动执行...
269（D4）: ...本项目 `MANUAL_REVIEW_CHECKPOINTS` 现仅含 `[pre_dev]`，不含 `pre_deploy`——CLAUDE.md Anti-Patterns 原文引用的 `orchestrator pre_deploy checkpoint` 在本项目当前配置下不存在自动触发点，CVE 放行裁决需改用本项目实际存在的人工闸门：`release.yml` 的 `publish-npm-packages` job 已配置 GitHub Environment `npm-publish`...
```

3 处全部核实：均已从"假设 pre_deploy 存在并作为兜底"改写为"明确声明 pre_deploy 不存在于本项目配置 + 显式路由到真实存在的替代机制"（release tag 人工推送 + EVENT-LOG 手动回写 / GitHub Environment `npm-publish` required reviewers）。无一处残留"假设检查点存在"式引用。§4 发布检查清单未见新增 pre_deploy 引用（该清单本身未提及 pre_deploy，不适用）。

**结论：R-006 修复有效，HIGH 消除。**

### R-001 HIGH（arch#§5.5 委托给 deploy-spec 的可观测性事项未承接）— 已修复，逐项比对

`cataforge context read arch-wechat-flow#§5.5` 委托清单：
1. "具体日志收集后端由 devops 阶段在 deploy-spec 中规划"
2. `/metrics`（Prometheus 格式）端点，关键 SLI: `render_markdown_latency_ms` / `job_queue_depth` / `paste_simulation_diff_ratio`
3. "完整存储策略（保留期、查询接口、聚合平台选型）由 deploy-spec 阶段决定"（审计日志）

deploy-spec 新增 §2.3 可观测性承接（三行表格）逐项比对：
- 行 1（日志收集后端）：明确 stdout JSON 输出 + dev/staging `docker compose logs` 直查 + prod `[ASSUMPTION]` 由容器编排/托管平台原生 stdout 采集链路承接，标注重新评估条件。**覆盖委托事项①**。
- 行 2（`/metrics`）：明确当前源码无该端点（`apps/relay`、`apps/mcp-server` 路由表无 `/metrics`，与实测一致——见下方源码核实）、登记为 backlog、指名 arch#§5.5 定义的三项 SLI 均在方案文字中原样引用（`render_markdown_latency_ms`/`job_queue_depth`/`paste_simulation_diff_ratio`）。**覆盖委托事项②**，且未假装已实现。
- 行 3（审计日志存储策略）：明确当前状态（M-007 `acl/audit-log.ts` 仅输出 stdout，不入库）+ 与 §9-D3 SQLite 未激活现状交叉引用一致 + 本轮不实现集中化查询、给出重新评估条件（E-010 持久化接线完成后）+ 具体建议值（保留期 ≥180 天）。**覆盖委托事项③**。

源码核实（防止"登记为 backlog"这一表述本身失实）：

```
$ grep -rn "'/metrics'\|\"/metrics\"" apps/relay/src apps/mcp-server/src
（无匹配）
```

确认 `/metrics` 端点在两个服务源码中均不存在，与 §2.3 行 2 的"当前 Relay/MCP server 源码未实现该端点"陈述一致，非猜测性描述。

**结论：R-001 修复有效，三项委托事项逐条承接，HIGH 消除。**

### R-003 MEDIUM（mcp-server 缺少显式 healthcheck）— 已修复

`docker-compose.yml` `mcp-server` 服务块新增：

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('node:net').createConnection(Number(process.env.PORT||8788),'127.0.0.1').on('connect',function(){this.end();process.exit(0)}).on('error',function(){process.exit(1)})"]
  interval: 15s
  timeout: 5s
  retries: 5
  start_period: 10s
```

与 `apps/mcp-server/Dockerfile` 第 43-44 行 `HEALTHCHECK` 指令的探测逻辑（同一 `node -e` TCP-connect 脚本、同一端口来源 `process.env.PORT||8788`）完全一致，两处仅 interval/retries 参数因 compose vs Dockerfile 语境略有差异（15s/5 次 vs 30s/3 次），属合理的编排层与镜像层默认值差异，不构成不一致。四服务（redis/relay/job-worker 依赖链、mcp-server）现均有对称的 compose 级 `healthcheck:` 定义（job-worker 无 healthcheck 属 r1 未质疑的既有设计，非本次修复范围）。§7 表格"验证四服务健康检查全绿"的表述现与实物对称一致。

**结论：R-003 修复有效，MEDIUM 消除。**

### R-004 MEDIUM（npm 发布 TS 源码消费风险披露不完整）— 已修复

§9-D1 新增"消费方兼容性矩阵"，5 行覆盖：Node≥22 原生剥离（可行）/ Vite-esbuild-swc 工具链（可行）/ 未配置 TS loader 的 webpack（hard-fail）/ 纯 CommonJS require（hard-fail）/ Node<22（hard-fail），并显式用"非温和的额外可选步骤"措辞纠正 r1 指出的语气问题。同时补充"登记为 backlog：npm 包 README 与 `package.json.engines` 字段应提前声明"，将后续动作转交 dev 任务范围，边界划分清晰。

**结论：R-004 修复有效，MEDIUM 消除。**

### R-005 MEDIUM（§6 密钥清单未反映图床压缩项已交付状态）— 已修复

§6 图床凭据行新增："上传前预处理压缩（≤2.5MB，quality-ladder + 宽度阶梯降级）已随本版本交付（见 changelog §Fixed `[F-006 AC-002b]`），本行仅涉及 COS Content-Type 签名与 env-gated 集成测试两项残留（T-033 backlog，非本次部署阻塞项）"。

交叉核实 `docs/changelog/changelog-wechat-flow.md` 第 33 行：`图床上传预处理压缩目标 ≤ 2.5MB（quality-ladder 降级 + 宽度阶梯降级，best-effort 触底不 throw）[F-006 AC-002b]`——引用的条目文字、AC 编号与实际 changelog 内容一致，未做失实引用。

**结论：R-005 修复有效，MEDIUM 消除。**

## [previously-approved] 维度

以下维度 r1 判定无 CRITICAL/HIGH，本轮未发现修复引入新的回归，沿用 r1 结论，标注 r1 报告编号（`REVIEW-deploy-spec-wechat-flow-r1`）不重复审查：

- **consistency（非 R-002/R-003/R-005 涉及部分）**：compose 服务清单 vs §2 环境矩阵、release.yml jobs vs §3.2 描述、密钥清单 vs `.env.example`、`/health` 路径、`makeNotImplementedJobsClient()` 降级声明、13 个包版本/`main`字段、mcp-server 无 `bin` / cli 有 `bin`、Playwright base image 版本对齐 —— [previously-approved, r1]
- **feasibility（非 R-004 涉及部分）**：`release.yml` tag-on-main 门禁设计、npm 发 TS 源码决策记录四要素完整性 —— [previously-approved, r1]
- **security（非 R-002 涉及部分）**：配置文件无硬编码密钥残留、`release.yml` 权限最小化收窄、`.dockerignore` 排除敏感目录 —— [previously-approved, r1]
- **convention（非 R-006 涉及部分）**：front matter 合规、`[ENV-LIMITATION]` 使用规范、COMMON-RULES 残留 regex 自检（r1 已确认命中项均为合规用法） —— [previously-approved, r1]；本轮针对新增/改写章节（§2.2/§2.3/§5 开篇/§9-D6）额外重跑残留 regex 自检，见下方"新增内容残留自检"，未发现新残留

### 新增内容残留自检（非 [previously-approved]，本轮新跑）

对 §2.2/§2.3/§5 开篇/§6 图床行/§7 容器行/§9-D1/D4/D6 全部新增或改写文本跑 COMMON-RULES 残留 regex：

```
之前|previously|used to|修复了|替代了|MVP|原方案|改为|之前是|现已废弃  → 全文档 0 命中
v[0-9]+\.[0-9]+\.[0-9]+\s*(起|新增|前后)                              → 0 命中
issue\s*#?\d+|PR\s*#?\d+|\(参\s*#\d+|pull request\s*#?\d+           → 0 命中
closeout|closes #\d+|fixes #\d+|landed in|本次新增|本轮加入|现已支持  → 2 命中（均在 §7/§9-D4，非本次修改范围，见下）
```

"本次新增"命中 2 处（行 228 mcp-server `bin` 缺口描述、行 269 D4 决策记录），均为 r1 既有文本、非本轮 6 处修复涉及范围，且语义上是"作者在撰写本 deploy-spec 过程中发现该缺口"的如实记录（非版本迭代残留叙事），r1 审查时的残留自检同样判定全文合规未标记问题。不计入本轮问题列表（超出增量复审范围，且非新引入）。

§9-D6 决策记录本身描述"`.gitignore` 修复"这一动作（"修订前 `.gitignore` 仅含...""决策：选择方案①..."），属于 COMMON-RULES §决策记录要求允许的关键决策留痕（考虑了哪些选项/为什么选择当前方案），且未使用被禁止的版本里程碑/过程标签措辞（无"v0.x起""本次新增""MVP"字样），是合规的决策记录用法而非变更说明残留。

## Verdict

**approved**

判定依据：r1 的 1 项 CRITICAL（R-002）+ 2 项 HIGH（R-001、R-006）经亲手实证（`git check-ignore -v` 复测、`grep pre_deploy` 逐处核实、`cataforge context read arch#§5.5` 逐项比对、源码级 `/metrics` grep 确认）全部验证修复有效，无残留、无回归、无新引入问题。3 项 MEDIUM（R-003/R-004/R-005）同批修复且逐一核实通过。Layer 1 与 r1 结果一致（同一已知误报 WARN，不计入问题）。新增/改写章节（§2.2/§2.3/§5/§6/§7/§9-D1/D4/D6）COMMON-RULES 残留自检、front matter 合规均通过。r1 判定无 CRITICAL/HIGH 的其余维度沿用批准，未发现修复引入的回归。

本轮复审 0 个 CRITICAL/HIGH/MEDIUM/LOW 遗留问题，deploy-spec-wechat-flow 文档质量达到可执行标准。
