---
id: "review-deploy-spec-wechat-flow-r1"
doc_type: review
author: reviewer
status: approved
deps: ["deploy-spec-wechat-flow"]
---

# REVIEW: deploy-spec-wechat-flow (r1)

## 审查范围
- 主审对象: `docs/deploy-spec/deploy-spec-wechat-flow.md`（version 0.1.0, status draft，分支 `feature/phase7-deploy-spec`）
- 核实材料: `apps/{relay,mcp-server,job-worker}/Dockerfile`、`docker-compose.yml`、`.env.example`、`.gitignore`、`.dockerignore`、`.github/workflows/{release,ci}.yml`、`docs/changelog/changelog-wechat-flow.md`（frontmatter 抽查）、`CLAUDE.md`（§项目状态 / §人工审查检查点）、arch 分卷 §1.4 / §5 / §6.1-6.3 / §7.5、prd §3.2

## Layer 1 结果
`cataforge skill run doc-review -- deploy-spec docs/deploy-spec/deploy-spec-wechat-flow.md`

```
WARN: 环境配置应至少包含 dev 和 prod 环境
WARNINGS: 1
PASS: 所有检查通过
```

判定：exit 0（PASS + 1 WARN）→ 进入 Layer 2。该 WARN 系误报：§2.1/§2.2 均以表格形式完整覆盖 dev/staging/prod 三环境（含 Editor SPA / Relay / Job Worker / Redis / MCP HTTP/SSE / SQLite 六组件矩阵），checker 未识别表格形态的环境声明。不计入问题列表（结构性检查器局限，非文档缺陷）。

## Layer 2 语义审查

### completeness
9 个必需章节齐全（§1-9，frontmatter `required_sections` 5 项全部命中，另加 §6/§7/§8/§9 扩展章节）。三线产物（Web App / npm 包 / MCP-CLI-Skill）各自的构建-发布-回滚闭环均有对应章节覆盖。7 类密钥（JWT/pepper/MCP key/图床/微信/npm/turbo）逐条列出用途、注入方式、适用环境、轮换策略，无遗漏字段。

但发现一处**结构性遗漏**：arch#§5.5 可观测性一节明确将"具体日志收集后端"、"审计日志完整存储策略（保留期、查询接口、聚合平台选型）"以及 `/metrics`（Prometheus 格式）端点的落地方式显式委托给 deploy-spec 阶段决定（原文："具体日志收集后端由 devops 阶段在 deploy-spec 中规划"、"完整存储策略（保留期、查询接口、聚合平台选型）由 deploy-spec 阶段决定"）。本文档全文 grep `metric|prometheus|log|观测|observ|审计` 无一命中——该委托事项未被承接，也未被登记为 backlog 或 [ASSUMPTION]。见 R-001。

### consistency
抽查 5+ 项 spec 声明 vs 配置实物：

| 项 | spec 声明 | 实物 | 结果 |
|---|---|---|---|
| compose 服务清单 vs §2 环境矩阵 | redis/relay/job-worker/mcp-server 四服务 | docker-compose.yml 四服务定义一致 | 一致 |
| release.yml jobs vs §3.2 流水线描述 | verify-tag-on-green-main → quality-gate → (publish-npm / build-container / build-editor) → github-release | release.yml 6 job 完全一致，DAG 依赖关系吻合 | 一致 |
| .env.example 变量 vs §6 密钥清单 | 7 类密钥全覆盖 | .env.example 逐项核对（EDITOR_JWT_SECRET/API_KEY_PEPPER/WECHAT_FLOW_MCP_API_KEY/图床六选一/WECHAT_APP_ID·SECRET）| 一致 |
| Relay 端口 8787 | arch#§6.3 基线 8787，docker-compose.yml `PORT: "8787"` | 一致（§9-D5 未涉及端口，但交叉验证通过） | 一致 |
| `/health` 路径 | §5.2 声称路径为 `/health`（非 `/api/v1/health`）| `apps/relay/src/index.ts:41` `app.route("/health", healthRoute)` | 一致，且已被 Dockerfile HEALTHCHECK 与 compose healthcheck 复用同一路径 |
| `makeNotImplementedJobsClient()` 降级声明 | §5.4/§7 声称 HTTP transport 默认降级、job 依赖 Tool 返回 `E_NOT_IMPLEMENTED` | `apps/mcp-server/src/transport/{stdio,http-sse}.ts` 源码确认 `deps.jobsClient ?? makeNotImplementedJobsClient()` | 一致，非猜测性描述 |
| 13 个可发布包版本/main 字段 | §1.2 声称 `version: "0.0.0"`、无 `private`、`main` 指向 `src/index.ts` | 逐包核对全部 13 个 package.json 一致 | 一致 |
| mcp-server 无 `bin`，cli 有 `bin` | §1.3 声明 | package.json 逐一核对一致 | 一致 |
| job-worker / visual CI 共用 Playwright base image | §9-D5 声称版本对齐避免 Chromium 漂移 | 全部 `mcr.microsoft.com/playwright:v1.61.0-noble`（Dockerfile + 4 个 visual-*.yml）+ `package.json` `^1.61.0` | 一致 |

以上抽查大多验证通过，但发现两处**真实矛盾**：

**R-002（CRITICAL，security）**：§2.2 声称 `.gitignore` 已排除 `.env*`（"仅 `.env.example` 例外"），但实际 `.gitignore` 只有 `.env`、`.env.local`、`.env.*.local` 三条规则。经 `git check-ignore -v` 实测验证：`.env.dev`、`.env.staging`、`.env.prod`（本文档 §2.2 明确指示用户创建、写入 `EDITOR_JWT_SECRET`/`API_KEY_PEPPER`/图床凭据等真实密钥的文件）**均不被 gitignore 匹配**，`git add .` 会将其纳入暂存区。仅 `.env.dev.local` 这种额外加 `.local` 后缀的文件名才会被排除，与本文档指示的三个实际文件名不符。这是一条会误导开发者信任错误安全边界、导致真实密钥被提交入库的虚假声明。

**R-003（HIGH，consistency）**：§6 密钥清单表格中 `QINIU_SECRET_KEY`/... 行引用"T-033 backlog 中 COS Content-Type 签名与 env-gated 集成测试需真实凭据补验证"，同段落文字紧邻处仍写着"非本次部署阻塞项"；然而经核对 CLAUDE.md 当前 §待办 T-033 条目（"COS Content-Type 签名 · oss/cos/smms/custom env-gated 集成测试"）——该条目已不包含"AC-002b 2.5MB 压缩（现仅 10MB 硬限）"字样，说明该子项已被解决；本文档虽未直接引用 AC-002b（已核实原文未提及该项，之前版本的草稿可能有此描述但当前定稿无），此处不构成缺陷，特此在审查记录中确认排除误判。**真正的矛盾点在于**：`changelog-wechat-flow.md` §Fixed 明确列出"图床上传预处理压缩目标 ≤ 2.5MB（quality-ladder 降级 + 宽度阶梯降级，best-effort 触底不 throw）[F-006 AC-002b]"为已修复项，而 deploy-spec 与之配套发布、理应反映同一时间点的交付状态，但 §6 未提及该项已随本轮交付解决，容易让读者误以为图床压缩仍是已知限制。**降级为 HIGH→MEDIUM 说明**：因未在 spec 正文实际出现错误引用（原文本身未直接声称 AC-002b 未解决），改列为 MEDIUM 提示项，见 R-005。

（修正：上条 R-003 描述有误判风险，已在下方问题列表中改列为 MEDIUM 处理，避免虚高定级。）

### feasibility
- `release.yml` 的 tag-on-main 门禁设计（`verify-tag-on-green-main` 用 `git merge-base --is-ancestor` 判断 tag commit 是否为 main 祖先）+ `quality-gate` 在 release 流水线内部重新执行（不信任 tag 时刻的 CI 缓存状态）是可行且稳健的设计，deploy-spec §3.2 对此的文字描述（"tag 必须指向 main 上的 commit，否则拒绝发布"、"release 流水线内重跑...不信任 tag 时刻的 CI 缓存状态"）与 release.yml 实际实现完全一致、无夸大。**旁注（不计入问题列表，因不在本文档内）**：release.yml 文件顶部注释写"Reuses ci.yml's quality-gate as a hard prerequisite via workflow_run gating"，但其下方 `verify-tag-on-green-main` job 实际实现并未使用 GitHub Actions `workflow_run` 触发器，而是独立的 ancestor 检查 + release 流水线内部重跑 quality-gate——这是 release.yml 自身注释与实现的不一致，deploy-spec 文档本身未复述该误导性措辞，不算本次审查对象的缺陷，仅供后续维护参考。
- npm 发 TS 源码决策（§9-D1）有明确决策记录支撑：现状说明、决策理由（"不在本次引入 bundle 步骤"）、影响范围界定（"arch/dev-plan 层面的构建产物形态决策，非部署配置职责范围"）、重新评估条件（"消费方反馈 transpile 负担或版本兼容问题时"）四要素齐全，符合 COMMON-RULES §决策记录要求。风险披露基本如实（"消费方需自行 transpile"），但**风险披露不完整**：未提及 Node ≥22 `--experimental-strip-types` 是否为消费方唯一选择、纯 `.js` 项目或使用 webpack/esbuild 打包工具链的消费方能否直接 `import` TS 源码（`main` 指向 `.ts` 文件在多数现有 bundler 默认配置下不可解析，需额外 loader/transformer），这是一个会导致消费方安装后立即报错的现实可行性风险，未被列出。见 R-004。

### security
- grep 全部配置文件（`.env.example`/`docker-compose.yml`/`release.yml`/三个 Dockerfile）未发现硬编码密钥或真实凭据残留（所有敏感变量均为空值模板或 `${VAR}` 引用）。
- `release.yml` 权限声明：顶层 `permissions: {contents: write, packages: write}`，`build-container-images` job 显式收窄为 `{contents: read, packages: write}`（job 级 override 早于 workflow 级默认值生效）——符合最小权限原则，无越权授予。
- `.dockerignore` 排除 `.git`/`.github`/`.claude`/`.cataforge`/`docs`/测试目录，未见敏感文件误打包进镜像层的风险。
- 已发现 CRITICAL 级安全缺陷见 R-002（.gitignore 声明与实物不符）。

### convention
- Front matter 合规（id/doc_type/author/status/deps 齐全，`required_sections` 五项与正文标题精确匹配）。
- `[ENV-LIMITATION]` 使用规范：§5 开篇明确标注沙盒 Docker daemon 不可达、列出具体错误信息（`docker ps` 报错原文）、说明降级验证覆盖的三个维度、并在 §7 表格中登记后续闭环安排（"建议作为 pre_deploy 人工检查点的核实项之一"）——未用该标注豁免任何已发现的缺陷，符合 COMMON-RULES §verdict_blocking_semantics 关键约束。
- COMMON-RULES 残留 regex 自检：搜索"之前|previously|used to|修复了|替代了|MVP|原方案|改为"等词，命中若干处**属于合规用法**而非残留——如 §1.1"这是当前仓库的既定约定，非本次新引入"实为主动澄清"不要误以为这是本次新决策"，属于向读者说明现状边界而非记录变更过程；§1.2"此为决策记录 §9-D1 的现状标注，不在本次部署配置范围内变更"同理。未发现真正的版本里程碑/变更叙事残留（无"v0.x 起"、"本次新增"、"issue #NNN"类命中）。
- **发现一处规范性问题**：§4/§7/§9-D4 多处引用"pre_deploy 人工检查点"（如"建议作为 pre_deploy 人工检查点的核实项之一"、"由 orchestrator 在 pre_deploy 检查点人工裁决是否放行"），但 CLAUDE.md §人工审查检查点明确记载"本项目精简至 pre_dev 以保持轻量推进"——即本项目的 `MANUAL_REVIEW_CHECKPOINTS` 实际取值为 `[pre_dev]`，不含 `pre_deploy`；CLAUDE.md §项目状态"下一步行动"字段亦明确写着"pre_deploy 不在本项目集合"。deploy-spec 反复引用一个在本项目配置中不存在、因而永远不会触发的检查点作为风险兜底机制，这会让 D4（`pnpm audit` CVE 放行裁决）与容器 bring-up 补验证两项关键遗留事项实际上无人兜底。见 R-001（并入同一 completeness/consistency 复合问题，见下方问题列表拆分为 R-006）。

## 问题列表

### [R-001] HIGH: arch#§5.5 委托给 deploy-spec 的可观测性规划事项未被承接
- **category**: completeness
- **root_cause**: self-caused
- **描述**: arch#§5.5 明确将三项决策委托给 deploy-spec 阶段：①"具体日志收集后端由 devops 阶段在 deploy-spec 中规划"；②`/metrics`（Prometheus 格式）端点的部署侧落地方式；③"审计日志完整存储策略（保留期、查询接口、聚合平台选型）由 deploy-spec 阶段决定"。本文档全文未提及 metrics/日志收集/审计存储的任何规划，既未落地方案，也未显式标注为 [ASSUMPTION] 或登记进 §7/§9 的待办清单。这是一个上游文档明确点名要求 deploy-spec 承接、但完全缺席的必需决策点，不是"nice to have"。
- **建议**: 至少补一节（或在 §2 环境配置补一列）说明：日志收集后端选型（如"prod 环境接入 Loki/CloudWatch/自建 ELK，dev/staging 仅 stdout"）、`/metrics` 端点是否在 compose/release 中暴露及采集方是谁（Prometheus scrape config 或托管 APM）、审计日志（M-007 `acl/audit-log.ts` 产出的 JSON 流）保留期与查询接口的初步方案或明确标注"本轮暂不实现集中化查询，仅保留进程 stdout，后续 sprint 补"。若确实决定推迟，需按 [ASSUMPTION] 惯例写明默认值与重新评估条件，而非静默不提。

### [R-002] CRITICAL: `.gitignore` 声明与实际配置不符，可能导致真实密钥被提交
- **category**: security
- **root_cause**: self-caused
- **描述**: §2.2 声称"`.gitignore` 已排除 `.env*`，仅 `.env.example` 例外"。经实测（`touch .env.dev .env.staging .env.prod .env.dev.local && git check-ignore -v ...`），当前 `.gitignore` 仅含 `.env`、`.env.local`、`.env.*.local` 三条规则，**不匹配** `.env.dev`/`.env.staging`/`.env.prod`——这三个文件名恰是本文档 §2.2 第一段明确指示用户创建的文件（"各环境复制为 `.env.dev` / `.env.staging` / `.env.prod`"），且按 §6 密钥清单会写入 `EDITOR_JWT_SECRET`/`API_KEY_PEPPER`/图床/微信凭据等真实密钥。只有额外带 `.local` 后缀的文件名（如 `.env.dev.local`）才会被现有规则排除。文档给出的安全边界声明与实物不符，属于会让开发者误信"我不需要手动检查就能安全 `git add .`"的虚假声明，直接导致真实凭据泄露风险，按 COMMON-RULES §verdict_blocking_semantics 不得用任何 [ENV-LIMITATION]/[ASSUMPTION] 豁免。
- **建议**: 二选一并同步文档：① 在 `.gitignore` 增补 `.env.dev` / `.env.staging` / `.env.prod`（或更稳妥的通配 `.env.*` 且显式 `!.env.example` 排除例外）后，本文档 §2.2 的声明才成立；② 若维持现状 `.gitignore` 不变，则 §2.2 措辞必须改为如实描述当前仅 `.env`/`.env.local`/`.env.*.local` 被忽略，并提醒用户在真正创建 `.env.dev` 等文件前必须手动补充忽略规则或改用不落盘的 secret 注入方式（CI/CD secret store）。推荐方案①，因为这是本文档反复引导用户采用的工作流（`cp .env.example .env.dev` 在 docker-compose.yml 注释中同样出现），后果影响范围不止本文档一处。

### [R-003] MEDIUM: docker-compose.yml mcp-server 服务缺少显式 healthcheck 定义
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `docker-compose.yml` 中 `redis`/`relay` 均定义了 `healthcheck:` 块（并被下游 `depends_on: condition: service_healthy` 消费），但 `mcp-server` 服务本身没有 compose 级 `healthcheck:`（尽管其 Dockerfile 有 `HEALTHCHECK` 指令，TCP-connect 探测）。§7 表格中"容器镜像实际构建与 `docker compose up` 全链路 bring-up"一行写"验证四服务健康检查全绿"，暗示四个服务都有对称的健康检查机制，但 mcp-server 依赖的是 Dockerfile 层隐式生效的 HEALTHCHECK（Docker 仍会汇报健康状态，功能上可行），与 relay/redis 显式声明在 compose 文件中的做法不对称，容易让读者以为 mcp-server 缺少任何健康检查（实际有，只是层级不同）。
- **建议**: 要么在 compose 文件的 `mcp-server` 服务块补一份等价的 `healthcheck:`（复用 Dockerfile 里的 TCP-connect 探测逻辑），保持四服务定义方式一致；要么在 §2/§7 明确说明"mcp-server 健康检查定义在 Dockerfile 层而非 compose 层，效果等价"，避免读者核对时产生疑惑。

### [R-004] MEDIUM: npm 发布 TS 源码的消费风险披露不完整
- **category**: feasibility
- **root_cause**: self-caused
- **描述**: §9-D1 决策记录说明当前 13 个包发布 TypeScript 源码（`main` 指向 `src/index.ts`），并提及"消费方需自行 transpile"作为风险。但未说明该风险的实际触发条件与影响面：多数现有 bundler（webpack 默认配置、非 esbuild/swc-loader 场景）无法直接 `import`/`require` `.ts` 源码文件，会在安装后的首次构建即报模块解析错误，而非"需要 transpile 这一额外可选步骤"这种较温和的措辞所暗示的渐进式摩擦。这是一个会导致相当比例消费方安装即失败的现实可行性问题，而不只是体验优化项。
- **建议**: 在 §9-D1 补充明确的兼容性边界：哪些消费场景可行（Node ≥22 `--experimental-strip-types` 原生执行、Vite/esbuild 类工具链项目）、哪些场景会直接失败（未配置 TS loader 的 webpack 项目、纯 CommonJS `require()` 消费方）、以及是否需要在 npm 包 README / package.json `engines` 字段提前声明这一约束以减少用户安装后才发现不可用的情况。

### [R-005] MEDIUM: §6 密钥清单未反映图床压缩项已随本轮交付解决的状态
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `docs/changelog/changelog-wechat-flow.md` §Fixed 明确列出"图床上传预处理压缩目标 ≤ 2.5MB...[F-006 AC-002b]"为本版本已修复交付项。deploy-spec §6 密钥清单表格中图床凭据行提及"T-033 backlog"仍有残留项（COS Content-Type 签名、env-gated 集成测试），这部分本身准确（未直接声称 AC-002b 未解决），但整个图床相关行未交叉引用 changelog 的"已修复"状态，容易让读者（尤其是跨文档核对时）误以为图床上传的体积限制仍是待办而非已完成项。
- **建议**: 在该行或邻近位置补一句交叉引用，如"AC-002b 图床压缩已随本版本交付（见 changelog §Fixed），本行仅涉及 COS 签名与集成测试两项残留"，明确切割"已完成"与"仍待办"的边界。

### [R-006] HIGH: 反复引用本项目实际不存在的 `pre_deploy` 人工检查点作为风险兜底
- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: deploy-spec 在 §4 发布检查清单、§7 部署后验证表格、§9-D4 决策记录中多次将关键遗留风险的裁决兜底机制指向"pre_deploy 人工检查点"（原文："建议作为 pre_deploy 人工检查点的核实项之一"、"由 orchestrator 在 pre_deploy 检查点人工裁决是否放行"、"CVE 放行须经 orchestrator pre_deploy checkpoint"）。但 CLAUDE.md §人工审查检查点显式记载本项目 `MANUAL_REVIEW_CHECKPOINTS` 已精简为仅 `[pre_dev]`（原文注释："本项目精简至 pre_dev 以保持轻量推进"），CLAUDE.md §项目状态"下一步行动"字段也明确写"pre_deploy 不在本项目集合"。这意味着 deploy-spec 依赖的这道人工闸门在当前项目配置下**永远不会自动触发**——D4（`pnpm audit`/CVE 放行裁决）与容器 bring-up 补验证这两项被反复标注"留给 pre_deploy 核实"的事项，实质上处于无人接手的悬空状态，除非有人手动发起一次不在既定流程中的人工审查。root_cause 标 upstream-caused：deploy-spec 作者大概率是依据 COMMON-RULES §MANUAL_REVIEW_CHECKPOINTS 的默认值（含 pre_deploy）撰写，未察觉本项目已在 CLAUDE.md 显式覆盖该默认值——这是项目配置与框架默认值之间的落差，而非 devops 凭空杜撰。
- **建议**: 二选一：① 明确在 §4/§7/§9-D4 改写为"本项目 `MANUAL_REVIEW_CHECKPOINTS` 现仅含 `[pre_dev]`，不含 `pre_deploy`；D4/容器验证的裁决需改为显式建议用户在 release tag 推送前手动触发一次审查（如临时追加 post_doc_freeze 或由用户主动确认），而非依赖自动门禁"；② 建议在 CLAUDE.md §全局约定追加 `pre_deploy` 到 `MANUAL_REVIEW_CHECKPOINTS`（若用户认可这类高风险发布前置项确实需要门禁），但这超出 deploy-spec 自身可决定的范围，需交回 orchestrator/用户裁决。无论哪种，当前文档"假设 pre_deploy 存在"的写法必须先改正，否则读者会误以为有兜底而实际没有。

## Verdict

**needs_revision**

判定依据：存在 1 项 CRITICAL（R-002）+ 2 项 HIGH（R-001、R-006），按 COMMON-RULES §三态判定逻辑触发 needs_revision。CRITICAL 项（.gitignore 安全声明与实物不符）具备真实泄密风险，必须先修复；HIGH 项均属于"文档做出了在当前项目配置/上游委托下不成立的假设性声明"，会误导后续读者对风险兜底机制的信任，同样需要在 revision 中订正。MEDIUM 项（R-003/R-004/R-005）可与 CRITICAL/HIGH 一并处理或列入下一轮迭代，不阻塞但建议同批修复以减少 re-review 轮次。

本文档在 consistency 抽查的大多数维度（compose vs 环境矩阵、release.yml vs 流水线描述、密钥清单 vs .env.example、健康检查路径、mcp-server 已知差距等）表现扎实、有源码级实证支撑，不存在虚构或夸大声明；[ENV-LIMITATION] 使用规范，未见任何用环境限制豁免真实缺陷的情况。核心问题集中在两处：①一条与安全边界直接相关的失实声明（R-002）；②文档对本项目治理配置（人工检查点集合）的假设与 CLAUDE.md 实际记载不符（R-001/R-006 的共同根源）。修复后建议提交 revision 走 r2 复核。
