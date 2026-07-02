---
id: "deploy-spec-wechat-flow"
version: "0.1.0"
doc_type: deploy-spec
author: devops
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data", "prd-wechat-flow", "test-report-wechat-flow"]
consumers: [devops]
volume: main
required_sections:
  - "## 1. 构建流程"
  - "## 2. 环境配置"
  - "## 3. CI/CD流水线"
  - "## 4. 发布检查清单"
  - "## 5. 本地最小栈验证证据"
---
# Deployment Specification: wechat-flow

[NAV]
- §1 构建流程
- §2 环境配置
- §3 CI/CD流水线
- §4 发布检查清单
- §5 本地最小栈验证证据
- §6 密钥清单
- §7 部署后验证与真实环境闭环安排
- §8 回滚机制
- §9 决策记录
[/NAV]

## 1. 构建流程

wechat-flow 按 arch#§6.1 分发形态拆分为三条独立构建产物线，均以仓库根为构建上下文：

### 1.1 Web App（Editor SPA + Relay + Job Worker）

| 产物 | 构建命令 | 产出 | 部署单元 |
|------|---------|------|---------|
| Editor SPA 静态产物 | `pnpm --filter @wechat-flow/editor build`（`vue-tsc --noEmit && vite build`） | `apps/editor/dist/` | CDN / 静态托管（Nginx / Cloudflare Pages / Vercel 静态托管，见 §2） |
| Relay 容器镜像 | `docker build -f apps/relay/Dockerfile .` | `ghcr.io/<owner>/wechat-flow-relay:<tag>` | Node 容器（arch#§6.3） |
| Job Worker 容器镜像 | `docker build -f apps/job-worker/Dockerfile .` | `ghcr.io/<owner>/wechat-flow-job-worker:<tag>` | Node 容器（Playwright Chromium base，arch#§6.3） |

`apps/relay`、`apps/job-worker`、`apps/mcp-server`、`apps/cli` 的 `package.json` `build` 脚本均为 `echo skip`（无打包步骤）——这些应用以 Node 22 原生 `--experimental-strip-types` 直接运行 TypeScript 源码（与既有 `dev` 脚本一致的执行模型），容器镜像因此拷贝源码 + workspace 依赖而非编译产物；这是当前仓库的既定约定，非本次新引入。若未来切到打包分发（如 `tsup`/`esbuild` bundle），Dockerfile 的 `COPY` + `CMD` 层需同步调整。

### 1.2 npm 包（8 个可发布包）

`packages/{core,contracts,plugin-api,ruleset,blocks,marks,palette,zh-typo}` + `packages/themes/{default,magazine,literary,business,tech}`（共 13 个 workspace 包，均 `package.json.version: "0.0.0"`，均无 `private: true` 标记 → 默认可发布）。

构建命令：`pnpm publish -r --access public --no-git-checks`（见 `.github/workflows/release.yml`）。**当前无打包步骤**——各包 `main` 直接指向 `src/index.ts` 源码入口，`build` 脚本同样是 `echo skip`；npm 发布的是 TypeScript 源码本身（消费方需自行 transpile，或未来引入 `tsup` 产出 `dist/` + 补 `exports` 字段）。此为决策记录 §9-D1 的现状标注，不在本次部署配置范围内变更。

### 1.3 MCP server / CLI / Skill bundle

| 分发形态 | 构建产物 | 启动方式 |
|---------|---------|---------|
| MCP stdio | `apps/mcp-server` 源码，随 npm 包分发 | `npx @wechat-flow/mcp-server`（**已知差距**：`package.json` 当前无 `bin` 字段，`npx` 直接执行不可用——见 §9-D2，需 dev 补一个 `bin` 入口脚本，devops 范围外） |
| MCP HTTP/SSE | 容器镜像 `wechat-flow-mcp-server` | `docker build -f apps/mcp-server/Dockerfile .` → 容器 CMD 直接调用 `startHttpTransport()`（library entry，非 self-invoking，见 §9-D2） |
| CLI | `apps/cli` 源码，随 npm 包分发 | `npx @wechat-flow/cli`（`bin.wechat-flow` 已在 `package.json` 声明，指向 `src/index.ts`；同样是源码级 bin，无预编译） |
| Skill bundle | `skill/` 目录（`SKILL.md` + `prompts/` + `resources/`） | 静态文件，随仓库或独立发布物分发，无需构建步骤 |

## 2. 环境配置

### 2.1 组件矩阵（dev / staging / prod）

| 组件 | dev | staging | prod |
|------|-----|---------|------|
| Editor SPA | `vite dev`（localhost:5173, HMR） | 静态托管预发布 bucket/Pages，`VITE_RELAY_BASE_URL` 指向 staging relay | CDN 生产 bucket/Pages，`VITE_RELAY_BASE_URL` 指向 prod relay，启用长缓存 + hash 文件名（Vite 默认） |
| Relay | `docker compose up relay`（本机 Redis） | 容器化部署，1 副本，`EDITOR_ALLOWED_ORIGINS` 限定 staging 域名 | 容器化部署，≥2 副本 + 负载均衡，`EDITOR_ALLOWED_ORIGINS` 限定生产域名，`IMAGE_HOST` 切换真实云图床 |
| Job Worker | `docker compose up job-worker`，`RENDER_POOL_SIZE=2` | 1 副本，`RENDER_POOL_SIZE=2` | 按并发量水平扩展，`RENDER_POOL_SIZE=min(cpu_count,4)`（arch#§6.3 部署约束基线） |
| Redis | `docker compose up redis`（单实例，无持久化要求） | 单实例 + AOF 持久化 | 单实例（或托管 Redis 服务）+ 持久化 + 满载告警阈值 80%（arch#§6.3） |
| MCP HTTP/SSE | 可选，`docker compose --profile mcp up mcp-server` | 与 Relay 同域名不同 path prefix，或独立容器 | 同 staging，视负载决定是否与 Relay 拆分部署（arch#§6.3） |
| SQLite/libsql | 未部署（当前无组件读写该存储，见 §9-D3） | 同左 | 同左；E-005/E-006/E-009/E-010 等服务端持久化实体的落地时间点由后续 sprint 决定 |

### 2.2 环境变量差异化

统一模板见 `.env.example`（仓库根）；各环境复制为 `.env.dev` / `.env.staging` / `.env.prod`，**均不提交版本控制**。`.gitignore` 显式列出 `.env` / `.env.local` / `.env.*.local` / `.env.dev` / `.env.staging` / `.env.prod` 六条规则，并用 `!.env.example` 显式排除模板文件，使其保持可追踪。已实测验证（`git check-ignore -v`）：

```
.gitignore:17:.env.dev	.env.dev
.gitignore:18:.env.staging	.env.staging
.gitignore:19:.env.prod	.env.prod
.gitignore:16:.env.*.local	.env.dev.local
.gitignore:20:!.env.example	.env.example
```

三个真实密钥文件（`.env.dev`/`.env.staging`/`.env.prod`）逐一命中忽略规则，`.env.example` 命中的是取反规则（不被忽略，保持可追踪）。差异集中在：

- `EDITOR_ALLOWED_ORIGINS`：按环境域名收紧（dev 允许 `localhost:5173`，prod 仅生产域名）
- `IMAGE_HOST`：dev 默认 `local`（本地磁盘），staging/prod 应切换真实图床（`oss`/`cos`/`smms`/`qiniu`/`custom`，见 §6）
- `REDIS_URL`：dev 指向 `docker compose` 内网服务名 `redis`，staging/prod 指向托管 Redis 实例地址
- `VITE_RELAY_BASE_URL`（Editor 构建期变量，非运行时）：三环境分别指向各自 Relay 端点

### 2.3 可观测性承接（arch#§5.5 委托事项）

arch#§5.5 将日志收集后端、`/metrics` 端点落地方式、审计日志完整存储策略三项显式委托给本文档规划，逐项承接如下：

| 委托事项 | 承接方案 | 环境差异 |
|---------|---------|---------|
| 结构化日志收集后端 | Relay/Job Worker/MCP server 统一输出 JSON 格式日志（`level/ts/requestId/tool/latencyMs/coreVersion/rulesetVersion`，arch#§5.5 已定义字段）到容器 stdout；不在本次引入集中式日志平台 | dev/staging：`docker compose logs` 直接查看；prod：**[ASSUMPTION]** 由容器编排/托管平台（如 ghcr.io 镜像所在的容器服务、Kubernetes 或云厂商容器实例）原生 stdout 采集链路承接（如 CloudWatch Logs / Loki / 云厂商日志服务），具体平台选型留待实际 prod 基础设施确定时补充；重新评估条件：prod 部署目标平台确定后，此处需补充实际 sink 配置 |
| `/metrics`（Prometheus 格式）端点 | 当前 Relay/MCP server 源码未实现该端点（`apps/relay`、`apps/mcp-server` 路由表无 `/metrics`）——**登记为 backlog**，非本次部署阻塞项，落点：dev 任务补 `prom-client` 或等价库输出 `render_markdown_latency_ms`/`job_queue_depth`/`paste_simulation_diff_ratio` 三项 arch#§5.5 定义的关键 SLI | 端点补齐后，dev/staging 环境可选接入本地 Prometheus + Grafana（docker-compose profile 扩展）；prod 视基础设施决定是否接入托管 APM（如 Datadog/云厂商 Prometheus 托管服务） |
| 审计日志完整存储策略 | M-007 `acl/audit-log.ts` 当前输出结构化 JSON（`timestamp/actor/action/resource/result/traceId`）到运行时日志流，**不入业务数据库**（arch#§5.5 现状）。与 §9-D3 记录的 SQLite/libsql 服务端持久化未激活现状一致——审计日志的独立查询接口、保留期策略与聚合平台选型均依赖后续 sprint 激活持久化层后才可实现 | 本轮不实现集中化查询与保留期策略，仅保留进程 stdout（随上述日志收集后端方案一并采集）；重新评估条件：E-010 等实体的 DB 持久化接线完成后（见 §9-D3），需在此节补审计日志表 schema、保留期（建议 ≥180 天以满足安全事件回溯）与查询接口方案 |

## 3. CI/CD流水线

### 3.1 既有 CI（`.github/workflows/ci.yml`，本次不改动）

`push`/`pull_request` 到 `main` 触发 `quality-gate`（lint→typecheck→test:coverage）+ `cross-runtime` + `guards`（三 job 并行）。另有独立视觉回归（`visual-core.yml` PR 触发核心矩阵、`visual-sampled.yml` PR 触发抽样矩阵、`visual-nightly.yml` 每日全量、`visual-update.yml` 手动触发基线更新）与 `perf.yml`（性能基准）。此六 job 全绿是发布前提，本次部署配置在其上**扩展**发布链路，不改动既有六个 workflow 文件。

### 3.2 新增发布流水线（`.github/workflows/release.yml`）

触发：推送 `v{major}.{minor}.{patch}` 格式 tag（arch#§7.5 Git 约定）。

```
verify-tag-on-green-main（tag 必须指向 main 上的 commit，否则拒绝发布）
  → quality-gate（release 流水线内重跑 lint/typecheck/test:coverage，不信任 tag 时刻的 CI 缓存状态）
    → publish-npm-packages（environment: npm-publish，需人工在 GitHub Environment 配置 protection rule）
    → build-container-images（matrix: relay / mcp-server / job-worker，推送 ghcr.io，tag: {version} + latest）
    → build-editor-spa（构建产物存 90 天 artifact）
      → github-release（打包 editor-dist.tar.gz，自动生成 release notes）
```

- `publish-npm-packages` 使用 GitHub Environment `npm-publish` + `secrets.NPM_TOKEN`，可配置 required reviewers 做人工闸门（发布前人工确认版本号正确，见 §9-D1 现状说明——当前无自动 version bump 工具，tag 前需人工核对各包 `package.json.version` 已同步更新）。
- 容器镜像统一推送到 GitHub Container Registry（`ghcr.io/<owner>/wechat-flow-{relay,mcp-server,job-worker}`），复用 `secrets.GITHUB_TOKEN`，无需额外注册表凭据。
- `build-editor-spa` 的 `VITE_RELAY_BASE_URL` 取自 GitHub Environment/Repository Variable `EDITOR_PROD_RELAY_BASE_URL`（非 secret，构建期公开变量）。

### 3.3 缓存策略

- npm 依赖：`pnpm/action-setup` + `actions/setup-node` 的 `cache: pnpm`（沿用 ci.yml 既有策略）
- 容器镜像层：`docker/build-push-action` 的 `cache-from/cache-to: type=gha`（按 component 分 scope，避免 relay/mcp-server/job-worker 三镜像互相冲刷缓存）
- Turborepo 远程缓存：`TURBO_TOKEN`/`TURBO_TEAM` secrets 存在时命中，缺失时优雅降级本地 `.turbo`（与 ci.yml 一致）

## 4. 发布检查清单

- [ ] 所有测试通过（`quality-gate` job 绿，含 `pnpm test:coverage`）
- [ ] 视觉回归通过（`visual-core.yml` + `visual-sampled.yml` 在合并 main 前的 PR 上已绿；release tag 不重跑视觉回归，信任 main 上的既有绿色状态）
- [ ] 版本号已更新：待发布的 npm 包 `package.json.version` 与 git tag `v{version}` 一致（当前无自动化校验，人工核对，见 §9-D1）
- [ ] CHANGELOG 已更新（`docs/changelog/changelog-wechat-flow.md` 含当前版本条目）
- [ ] 安全扫描通过（`guards` job 的 `gitleaks` 全历史密钥扫描 + `pnpm guard:secrets` secretlint；`pnpm audit` 未接入 CI，见 §9-D4）
- [ ] 环境变量矩阵核对：目标环境 `.env.{dev,staging,prod}` 中的必需变量（`EDITOR_JWT_SECRET`/`API_KEY_PEPPER`/`IMAGE_HOST` 对应凭据）已配置且非默认值
- [ ] `EDITOR_ALLOWED_ORIGINS` 已收紧为目标环境真实域名（非 `*` 或 dev 通配）
- [ ] `docker compose config` 语法校验通过（本次已本地验证，见 §5）
- [ ] Release notes / GitHub Release 草稿已生成并人工过目

## 5. 本地最小栈验证证据

> 沙盒环境 Docker Desktop daemon 不可达（`com.docker.service` 处于 Stopped 且无权限启动，`docker ps` 报 `failed to connect to the docker API`）——**无法执行完整 `docker compose up` 容器化 bring-up**。本节记录实际可执行的降级验证：源码级直接启动 Relay（Node 进程，非容器）+ 编辑器生产构建 + docker-compose 语法校验，覆盖了构建入口、环境变量契约、服务可达性三个维度；容器镜像本身的构建与启动（`docker build` + `docker compose up`）标记为 [ENV-LIMITATION]。本项目 `MANUAL_REVIEW_CHECKPOINTS` 现仅含 `[pre_dev]`，不含 `pre_deploy`——该补验证无自动门禁兜底，需开发者在具备 Docker daemon 的环境（本机 / CI runner）**主动**执行一次容器化 bring-up 并将结果回写 `docs/EVENT-LOG.jsonl`，建议时点为 release tag 推送前（与 §7 表格最后一行的 PRD §3.5 人工周期验证同批完成）。

### 5.1 Editor SPA 生产构建

启动命令：`pnpm build`（turbo 全仓构建，含 `@wechat-flow/editor`）

```
@wechat-flow/editor:build: vite v6.4.3 building for production...
@wechat-flow/editor:build: ✓ 1248 modules transformed.
@wechat-flow/editor:build: dist/index.html                             0.56 kB │ gzip:   0.32 kB
@wechat-flow/editor:build: dist/assets/EditorPage-DeLD5dzg.js         61.70 kB │ gzip:  20.60 kB
@wechat-flow/editor:build: dist/assets/index-DyzykzJa.js              82.50 kB │ gzip:  23.45 kB
@wechat-flow/editor:build: dist/assets/vendor-CxQu5BBj.js            901.24 kB │ gzip: 297.84 kB
@wechat-flow/editor:build: ✓ built in 11.63s
 Tasks:    18 successful, 18 total
```

已核对的部署面：`vue-tsc --noEmit` 类型检查通过、Vite 生产构建产出 `dist/` 静态资源、构建产物体积（`vendor` chunk 901KB 有代码分割优化空间，非阻塞项，标 §9 待办）。

### 5.2 Relay 源码级启动 + 健康检查（容器外，Node 直跑）

启动命令（模拟 `.env.example` 最小必需变量，`IMAGE_HOST=local` 免云凭据）：
```
IMAGE_HOST=local LOCAL_BASE_DIR=/tmp/wf-uploads LOCAL_PUBLIC_BASE_URL=http://localhost:3000/uploads \
EDITOR_JWT_SECRET=dev-secret-min-32-chars-long-xxxx REDIS_URL=redis://127.0.0.1:6379 PORT=3000 \
node --experimental-strip-types apps/relay/src/main.ts
```

bring-up 日志：
```
relay listening on http://localhost:3000
```

健康检查验证：
```
$ curl -sS http://localhost:3000/health
{"status":"ok","version":"0.0.0"}
```

已核对的部署面：Relay 无需真实 Redis 连接即可完成 HTTP 服务启动（`ioredis` 惰性连接，job 队列相关端点在无 Redis 时会失败但不阻塞进程启动与 `/health`）、`EDITOR_JWT_SECRET`/`API_KEY_PEPPER`/`IMAGE_HOST` 环境变量契约按 §6 声明生效、`/health` 路由路径确认为 `/health`（非 `/api/v1/health`，避免 Dockerfile HEALTHCHECK 路径写错）。验证后已终止进程（`Stop-Process`），确认 3000 端口回收（`curl` 连接被拒绝）。

### 5.3 docker-compose 语法校验（daemon 不可达，仅 config 解析）

```
$ EDITOR_JWT_SECRET=x API_KEY_PEPPER=y docker compose config
name: wechat-flow
services:
  job-worker: {...}
  redis: {...}
  relay: {...}
  mcp-server: {...}
```

`docker compose config` 成功解析全部 4 个服务定义（`redis`/`relay`/`job-worker`/`mcp-server`），确认必需变量的 `:?` 硬性校验语法生效（`EDITOR_JWT_SECRET`/`API_KEY_PEPPER` 缺失时 compose 会在 `up` 前报错拒绝启动，而非静默传入空字符串）。

### 5.4 CLI 与 MCP stdio 探测性验证

- `node --experimental-strip-types apps/cli/src/index.ts --version` → 输出 `0.0.0`，CLI commander 入口可执行
- `node --experimental-strip-types apps/cli/src/index.ts validate --help` → 输出 `validate <packDir>` 帮助文本，子命令注册正常
- MCP stdio server（`apps/mcp-server/src/index.ts`）**无自执行入口**（仅 `export { main }`，需调用方显式 `main()`）——`node apps/mcp-server/src/index.ts` 空跑无输出，符合库入口设计但确认了 §1.3 / §9-D2 记录的 `bin` 缺口是真实的，非猜测

## 6. 密钥清单

| 密钥名 | 用途 | 注入方式 | 环境 | 轮换策略 |
|--------|------|---------|------|---------|
| `EDITOR_JWT_SECRET` | Editor Session JWT 签名密钥（API-032），`apps/relay/src/auth/editor-session-config.ts` 启动时硬性校验 | GitHub Secret（CI）/ Secret Manager 或 `.env.{env}`（运行时，仅本地开发用后者） | dev/staging/prod（各环境独立值） | 建议 90 天；轮换需滚动重启 Relay（旧 JWT 在 TTL≤15min 内自然失效，无需强制踢出会话） |
| `API_KEY_PEPPER` | Admin API key HMAC-SHA256 pepper（`apps/relay/src/admin/api-keys.ts`） | 同上 | dev/staging/prod | 建议 90 天；轮换会使全部既有 admin key hash 失效，需配合重新分发 key |
| `WECHAT_FLOW_MCP_API_KEY` | MCP stdio server 调用方鉴权（PRD §3.2 MCP 鉴权基线） | 本地环境变量（MCP stdio 为本地嵌入启动，不走 CI） | 本地开发者各自持有 | 按需（用户主动请求吊销/重新签发） |
| `QINIU_SECRET_KEY` / `OSS_ACCESS_KEY_SECRET` / `COS_SECRET_KEY` / `SMMS_TOKEN` / `CUSTOM_UPLOAD_TOKEN` | 图床上传凭据（六选一或多选，`IMAGE_HOST` 决定实际生效项） | Secret Manager（prod 推荐）/ GitHub Secret（CI 集成测试，见 T-033 backlog） | staging/prod（dev 默认 `IMAGE_HOST=local` 免凭据） | 按云厂商建议轮换周期（多数 90-180 天）；上传前预处理压缩（≤2.5MB，quality-ladder + 宽度阶梯降级）已随本版本交付（见 changelog §Fixed `[F-006 AC-002b]`），本行仅涉及 COS Content-Type 签名与 env-gated 集成测试两项残留（T-033 backlog，非本次部署阻塞项） |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信公众号素材库上传（Job Worker `loadWechatCredentials`，lazy 加载——仅处理 `wechat-asset-upload` job 时才读取，未配置不影响其余 job kind 与进程启动） | Secret Manager（prod）/ GitHub Secret（T-126 env-gated 集成测试） | staging/prod（有素材库上传需求时才配置） | 微信平台侧管理；AppSecret 泄露需在公众号后台重置 |
| `NPM_TOKEN` | npm 包发布（`pnpm publish -r`） | GitHub Environment Secret（`npm-publish` environment，建议配置 required reviewers） | release 流水线专用 | 按 npm 账号安全建议（granular access token，scope 限定 publish，90-180 天或按需） |
| `TURBO_TOKEN` / `TURBO_TEAM` | Turborepo 远程缓存（可选，缺失优雅降级） | GitHub Secret | CI/release 流水线 | 无强制轮换要求（非敏感级凭据，仅缓存加速） |

## 7. 部署后验证与真实环境闭环安排

以下 backlog 项（CLAUDE.md §待办 已登记，test-report §9 盲区登记同步核实）需真实凭据/进程环境闭环，非本次 deploy-spec 交付范围内可验证，登记安排以便后续会话跟进：

| 项 | 现状 | 闭环安排 |
|----|------|---------|
| T-124 Worker delete 全局 | 未核实（环境范围外） | 需真实 Web Worker 生命周期跨进程验证；在 staging 部署后由 QA 执行浏览器手动验证，或补 Playwright 真实 Worker E2E |
| T-125 mcp HTTP 进程生产接线 | **本次核实：`startHttpTransport()` 默认 `makeNotImplementedJobsClient()`，job 依赖类 Tool（`export_long_image`/`export_cover`/`upload_to_wechat_asset`）返回 `E_NOT_IMPLEMENTED`** | 需 dev 补一个生产 `JobsClient` 实现（HTTP 调用 Relay `/api/v1/renders/*`、`/api/v1/jobs/:jobId`），通过 `ServerDeps.jobsClient` 注入；当前 `docker-compose.yml` mcp-server 服务与 Dockerfile 已就位但会以此降级状态运行，已在 compose 文件内联注释标注，不属部署配置缺陷 |
| T-126 微信真实 API | 环境不可达（需真实 AppID/Secret） | staging 环境配置真实测试公众号凭据后，人工触发一次 `upload_to_wechat_asset` 全链路验证；`docs/EVENT-LOG.jsonl` 回写结果（PRD §3.5 发布前周期验证同款机制） |
| T-127 CLI dev 命令真实 Vite 进程 | 未核实（环境范围外） | 本地开发者场景验证，非部署链路阻塞项 |
| mcp-server `bin` 入口缺失（见 §9-D2） | `package.json` 无 `bin` 字段，`npx @wechat-flow/mcp-server` 当前不可用 | 需 dev 补 thin bin 脚本（如 `bin/mcp-server.mjs` 调用 `startStdioTransport()`）；devops 范围外，登记供下一轮 dev 任务 |
| 容器镜像实际构建与 `docker compose up` 全链路 bring-up | [ENV-LIMITATION]，本次沙盒 Docker daemon 不可达（见 §5） | 需在具备 Docker daemon 的环境（开发者本机 / CI runner）执行 `docker compose --env-file .env.dev up -d` 并验证四服务健康检查全绿；本项目 `MANUAL_REVIEW_CHECKPOINTS` 仅含 `[pre_dev]`，无 `pre_deploy` 自动门禁兜底该项，需开发者在 release tag 推送前**主动**执行并将结果记入 `docs/EVENT-LOG.jsonl`（同 §5 开篇说明） |
| PRD §3.5 发布前周期验证（5 主题 × 1 篇真实公众号编辑器粘贴回归） | 尚未执行（首次发布前必需） | release tag 推送前，人工在真实公众号编辑器执行粘贴回归，结果回写 `docs/EVENT-LOG.jsonl`；`visual-core.yml`/`visual-sampled.yml` 覆盖 CI 默认门禁层级，不能替代该人工层级（PRD §3.5 三层级定义） |

## 8. 回滚机制

| 部署单元 | 回滚机制 |
|---------|---------|
| Editor SPA | CDN/静态托管保留前 N 次构建产物（GitHub Release artifact 90 天留存，见 §3.2）；回滚 = 重新指向前一版本 artifact，无需重新构建。生产环境建议 CDN 侧配置版本化路径（如 `/releases/{version}/`）+ 灰度切流，而非直接覆盖 `latest` |
| Relay / Job Worker / MCP HTTP 容器镜像 | 镜像双 tag（`{version}` + `latest`，见 §3.2）保证可按版本号 pin 回滚：`docker compose` 或容器编排平台将镜像 tag 从 `latest` 改指定 `{previous_version}` 后滚动重启即可；镜像保留策略由容器 registry（ghcr.io）默认保留周期承担，未设专门清理策略（标 §9 待办） |
| npm 包 | npm 不支持覆盖已发布版本；回滚 = 发布新的更高版本号并在 CHANGELOG 标注修复，或 `npm deprecate` 标记问题版本引导用户升级。**不使用 `npm unpublish`**（72 小时后不可用且会破坏依赖方 lockfile） |
| 数据库（Redis） | 当前 Redis 仅承载 BullMQ 队列 + idempotency 缓存 + awareness pub/sub（arch#§6.3），无持久业务数据 schema 变更需回滚；SQLite/libsql 服务端持久化尚未部署（见 §2.1），回滚策略随其激活时补充 |

## 9. 决策记录

### D1: npm 包当前发布"源码"而非编译产物

**现状**：13 个可发布 workspace 包 `main` 均指向 `src/index.ts`，`build` 脚本为 `echo skip`。**决策**：deploy-spec 按现状设计发布流水线（`pnpm publish -r` 直接发布源码），不在本次引入 `tsup`/`esbuild` bundle 步骤——这是 arch/dev-plan 层面的构建产物形态决策，非部署配置职责范围；若后续引入编译步骤，仅需在 `release.yml` 的 `publish-npm-packages` job 前插入 `pnpm -r build` 即可，工作流结构已预留该扩展点。**重新评估条件**：消费方反馈 TS 源码分发导致 transpile 负担或版本兼容问题时。

**消费方兼容性矩阵**（工具链层面 hard-fail vs 需转译，非温和的"额外可选步骤"）：

| 消费场景 | 结果 | 说明 |
|---------|------|------|
| Node ≥22 原生 `--experimental-strip-types` 直接 `import` | 可行 | 与本仓库自身应用（relay/mcp-server 等）运行方式一致，无需额外工具链 |
| Vite / esbuild / swc-loader 类工具链项目 | 可行 | 这类打包器默认支持 `.ts` 源码转译，`import '@wechat-flow/core'` 可直接解析 |
| 未配置 TS loader 的 webpack 默认配置项目 | **hard-fail** | webpack 默认不识别 `.ts` 扩展名，`main` 指向 `src/index.ts` 会在首次构建即报模块解析错误，而非渐进式摩擦 |
| 纯 CommonJS `require()` 消费方（无打包步骤，直接 Node 运行） | **hard-fail** | 包本身是 ESM + TS 源码，`require()` 既不能跳过类型剥离也不能跨 ESM/CJS 边界，安装后立即不可用 |
| Node <22 项目（无 `--experimental-strip-types`） | **hard-fail** | 缺少原生类型剥离能力，需自行引入 `ts-node`/`tsx` 等运行时转译层 |

登记为 backlog：npm 包 README 与 `package.json.engines` 字段应提前声明 `"node": ">=22"` 及"消费方需自行具备 TS 转译能力"约束，减少用户安装后才发现不可用的情况；此为 dev 任务范围（改包元数据），非 devops 本次部署配置职责。

### D2: mcp-server 缺少可执行入口（`bin` 字段 + self-invoking 容器 CMD）

**现状**：`apps/mcp-server/package.json` 无 `bin` 字段（`npx` 不可用）；`src/index.ts` 仅 `export { main }`，无 `if (import.meta.url === ...)` 之类自启动判断。**决策**：Dockerfile CMD 用内联 `node -e "import(...).then(...)"` 绕过而非修改源码（devops 能力边界不含改源码）；`npx` 场景（stdio 本地嵌入）标记为已知差距，登记 §7 供 dev 任务补 `bin` 入口脚本。**影响范围**：不影响 HTTP/SSE 容器化部署（已用内联启动绕过），仅影响 `npx @wechat-flow/mcp-server` 这一种分发路径。

### D3: SQLite/libsql 服务端持久化未纳入本次部署栈

**现状**：arch#§6.3 定义 E-005/E-006/E-009/E-010 等实体的服务端持久化目标是 SQLite（libsql/better-sqlite3），但代码库中未发现任何组件实际读写该存储（`admin/api-keys.ts` 用 in-memory `Map` 占位，源码内联注释明确标注 `wiring-placeholder`）。**决策**：`docker-compose.yml` 不包含 SQLite/libsql 服务定义，避免部署一个当前无消费方的空组件。**重新评估条件**：dev 侧完成 E-010 等实体的 DB 持久化接线后，需在此文档补 SQLite volume 挂载与备份策略。

### D4: `pnpm audit` 未接入 CI/release 流水线

**现状**：`.github/workflows/ci.yml` 与 `release.yml` 均未包含依赖漏洞扫描步骤；现有安全扫描仅覆盖密钥泄露（`gitleaks` + `secretlint`），不覆盖已知 CVE。**决策**：不在本次静默补充——CLAUDE.md Anti-Patterns 明确要求"上线前任何 HIGH/CRITICAL CVE 未确认即合并都属 release blocker"且"CVE 放行须经 orchestrator pre_deploy checkpoint"，引入扫描步骤本身不构成问题，但**扫描结果的放行决策超出 devops 职权**（devops 无 user_question 能力）。**本项目 `MANUAL_REVIEW_CHECKPOINTS` 现仅含 `[pre_dev]`，不含 `pre_deploy`**——CLAUDE.md Anti-Patterns 原文引用的 `orchestrator pre_deploy checkpoint` 在本项目当前配置下不存在自动触发点，CVE 放行裁决需改用本项目实际存在的人工闸门：`release.yml` 的 `publish-npm-packages` job 已配置 GitHub Environment `npm-publish`（可设 required reviewers），且 release 流程本身以人工推送 `v{version}` tag 为触发前提（§3.2），这两点构成天然的 go/no-go 关口。**登记为 needs_input 级别待办**：建议在 `release.yml` 的 `quality-gate` job 中追加 `pnpm audit --audit-level=high`（或 `osv-scanner`/`trivy` 对容器镜像扫描），发现 HIGH/CRITICAL 时阻断流水线，由 tag 推送者 / `npm-publish` environment 的 required reviewer 在合并/批准前人工确认是否放行——本次未直接加入流水线是因为**新增该门禁本身需要先与用户确认阈值与豁免流程**，属于需要人工输入的决策而非纯配置操作；若用户后续希望恢复框架级 `pre_deploy` 自动检查点，需在 CLAUDE.md §全局约定将其加回 `MANUAL_REVIEW_CHECKPOINTS`（超出 deploy-spec 自身可决定范围）。

### D5: 容器 base image 选型

**决策**：`relay`/`mcp-server` 用 `node:22-slim`（对齐 arch#§1.4 Node 22.x LTS，slim 变体减小体积同时保留 glibc 兼容 `sharp`/`playwright` 原生依赖的可移植性，未选 `alpine` 因其 musl libc 与 `sharp`/`playwright` 预编译二进制的兼容性历史上问题较多）；`job-worker` 用官方 `mcr.microsoft.com/playwright:v1.61.0-noble`（与 arch#§1.4 Playwright 1.4x 版本对齐，且与 `visual-core.yml`/`visual-sampled.yml`/`visual-nightly.yml` CI 视觉回归共用同一基础镜像版本号，避免 Chromium 版本漂移导致容器内渲染结果与 CI 视觉基线不一致）。

### D6: `.gitignore` env 文件规则修复方式

**现状**：修订前 `.gitignore` 仅含 `.env`/`.env.local`/`.env.*.local` 三条规则，不匹配本文档 §2.2 指导用户创建的 `.env.dev`/`.env.staging`/`.env.prod`，与 §2.2 原文"已排除 `.env*`"的声明矛盾（r1 审查 R-002 CRITICAL）。**决策**：选择方案①——直接在 `.gitignore` 补齐 `.env.dev`/`.env.staging`/`.env.prod` 三条显式规则 + `!.env.example` 例外，而非方案②（把文档指导的文件名改到已被忽略的 `.env.dev.local` 模式）。**理由**：`cp .env.example .env.dev` 这一工作流已在本文档 §2.2 与 `docker-compose.yml` 头部注释中反复出现，是既定约定；改规则一处生效，改命名需同步多处文案与用户习惯，风险面更大。**验证**：`git check-ignore -v .env.dev .env.staging .env.prod .env.dev.local .env.example` 实测三个目标文件与 `.env.dev.local` 均命中忽略规则，`.env.example` 命中 `!` 例外规则（保持可追踪），详见 §2.2。
