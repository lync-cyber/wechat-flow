---
id: "test-report-wechat-flow"
version: "1.0.0"
doc_type: test-report
author: qa-engineer
status: approved
deps: ["dev-plan-wechat-flow"]
consumers: [developer, qa-engineer, devops]
volume: main
required_sections:
  - "## 1. 测试策略"
  - "## 2. 测试用例矩阵"
  - "## 3. 覆盖率目标"
  - "## 4. 测试环境"
  - "## 5. 测试执行结果"
  - "## 6. 缺陷清单"
  - "## 7. 结论与建议"
---
# Test Report: wechat-flow

[NAV]
- §1 测试策略 → §1.1 金字塔, §1.2 IPC边界
- §2 测试用例矩阵
- §3 覆盖率目标
- §4 测试环境
- §5 测试执行结果
- §6 缺陷清单
- §7 结论与建议
- §8 doc-consistency 裁决清单
- §9 盲区登记
[/NAV]

## 1. 测试策略

Sprint 0-6（约 130 任务卡）已在 Phase 5 development 由 tdd-engine 产出函数/方法级 RED/GREEN 单元测试（2388 条，含边界与异常路径）。Phase 6 testing 聚焦三件事，不重复单元粒度：

1. **裁决 Phase Transition drift 降级项**——`cataforge skill run doc-consistency -- docs/` 报出的 1×HIGH + 3×MEDIUM + 1×MEDIUM，逐条溯源判定真伪（见 §8）。
2. **补跨模块集成链路与真实用户路径 E2E**——聚焦 tdd-engine 单元测试天然覆盖不到的：真实 Chromium 沙箱行为、未处理异常路径。
3. **核实已知缺口的当前状态**——不重新发现，仅核实 backlog 登记项是否仍然存在，写入 §9 盲区登记。

### 1.1 测试金字塔
| 层次 | 占比（累计） | 工具 | 关注点 |
|------|------|------|--------|
| Unit | ~95%（2388 条，Phase 5 产出） | vitest 2.1 | 函数/方法级，含 tdd-engine RED/GREEN |
| Integration | ~4%（cross-runtime + wiring 测试 + 本轮新增回归） | vitest 2.1（node/browser/edge 隔离运行时）| 模块间接口、Vue 组件 wiring、跨运行时一致性 |
| E2E | ~1%（233 视觉回归 + 2 真实浏览器安全用例，本轮新增） | Playwright 1.61（chromium） | 视觉一致性回归 + 真实用户输入安全路径 |

### 1.2 IPC边界测试
不适用——wechat-flow 是 Web App + npm 包 + MCP server/CLI，无桌面 IPC 层。跨进程边界（relay HTTP API、MCP stdio/HTTP transport、Worker 消息）由 `tests/relay/`、`tests/mcp-server/`、`tests/cross-runtime/worker.test.ts` 覆盖（Phase 5 产出，本轮核实仍绿）。

## 2. 测试用例矩阵

| 用例ID | 功能 | 类型 | 输入 | 预期 | 优先级 |
|--------|------|------|------|------|--------|
| TC-001 | F-002 预览沙箱 XSS 防护 | E2E（真实浏览器） | 真实键入含 `<script>` 标签的 Markdown 到 SourcePane | iframe window 上下文全局变量不被注入，无 alert dialog 触发 | P0 |
| TC-002 | F-002 预览沙箱属性 | E2E（真实浏览器） | 导航到编辑器主页 | `preview-iframe` 的 `sandbox` 属性含 `allow-same-origin`，不含 `allow-scripts` | P0 |
| TC-003 | F-006 图片压缩目标（AC-002b） | 集成核实（源码走读+已有 fixture） | `preprocessImage()` 现有实现 | 核实是否存在 ≤2.5MB 压缩目标逻辑 | P1 |
| TC-004 | P-002 文档列表 reject 路径 | Unit 回归（补盲区） | `listDocuments()` mock reject | 核实 UI 是否静默退化为空态而非错误态 | P2 |
| TC-005 | Sprint 5 backlog 状态核实（SR-R2-002/003/005/006） | 集成核实（源码走读） | 生产代码搜索 | 核实各缺口是否仍存在 | P2 |
| TC-006 | doc-consistency HIGH [ac-traceability] 裁决 | 文档追溯核实 | PRD F-001~F-014 AC 清单 vs DEV-PLAN tdd_acceptance | 判定真缺口/token 碰撞误报 | P0 |
| TC-007 | doc-consistency MEDIUM [ui-coverage] F-010/F-013 裁决 | 文档追溯核实 | PRD F-010/F-013 定义 vs UI-SPEC 覆盖 | 判定是否合理排除 | P1 |
| TC-008 | doc-consistency MEDIUM [orphaned-component] UC-015/016/023 裁决 | 代码+文档交叉核实 | UI-SPEC 引用 + apps/editor 实现 | 判定组件是否真实 wiring | P1 |
| TC-009 | doc-consistency MEDIUM [entity-propagation] E-001~E-004/E-006 裁决 | 文档追溯核实 | ARCH 实体定义 vs DEV-PLAN 任务引用 | 判定真缺口/命名匹配误报 | P2 |
| TC-010 | 全量回归基线 | Integration | `pnpm vitest run` | 0 失败 | P0 |
| TC-011 | 跨运行时一致性 | Integration | `pnpm test:cross-runtime`（node/browser/edge） | 3 套件全绿，SHA-256 字节级一致 | P0 |
| TC-012 | 类型与格式基线 | 静态检查 | vue-tsc / tsc -p tests / biome | 0 error | P0 |
| TC-013 | T-058 视觉回归基线 | E2E（Playwright, page.setContent） | 5 主题 × P0 场景 + variant 矩阵 | pixelmatch ratio ≤ 0.05，233 项全过 | P1 |

## 3. 覆盖率目标

未在本轮执行 `vitest --coverage` 全量插桩（monorepo 规模下单次插桩成本高，且非本轮契约的必需产出；AC 级追溯矩阵是本轮的主覆盖信号）。定性覆盖评估：

| 模块 | 定性状态 | 说明 |
|------|----------|------|
| packages/core（渲染管线+IndexedDB） | 高 | Phase 5 单测 + cross-runtime 三运行时一致性验证 |
| packages/themes/*（5 主题） | 高 | T-058 视觉回归 233 项覆盖 5 主题 × P0 场景 + variant 矩阵 |
| packages/ruleset（42+ 规则） | 高 | 每规则独立 fixture 对 + 端到端综合 fixture（F-007 AC-002），本轮未见新缺口 |
| apps/editor（Vue SPA） | 高，新增真实浏览器安全验证 | Phase 5 组件级 + wiring 测试；本轮新增 PreviewPane 沙箱真实 Chromium E2E，补齐 happy-dom 无法验证的浏览器级安全断言 |
| apps/relay（图床/微信中继） | 中，1 项已知缺口未闭合 | AC-002b 压缩目标未实现（见 §6 DEFECT-001）；COS/OSS/七牛/SM.MS 真实凭据集成测试环境不可达 |
| Sprint 5 backlog 4 项（SSE 消费者/进度反馈/JWT 续期等） | 已知缺口，backlog 中 | 本轮核实仍未闭合，非新发现，见 §9 |

## 4. 测试环境

- 包管理器: pnpm@9.15.9（monorepo workspace）
- 运行时: Node.js v25.8.0（满足 `engines >= 22`）
- 测试框架: vitest 2.1.9；`pnpm --filter @wechat-flow/editor test` 从仓库根跑（历史踩坑：editor 测试须从根跑）
- 类型检查: `pnpm --filter @wechat-flow/editor exec vue-tsc --noEmit`（直跑，绕过 turbo 缓存假绿前科）+ `npx tsc -p tests/tsconfig.json --noEmit`
- Lint/Format: biome 1.9（`pnpm biome check .`，733 文件）
- E2E/视觉回归: Playwright 1.61.0，chromium 已装；`playwright.config.ts`（T-058 基线，`page.setContent` 自一致性）+ `playwright.design-overlay.config.ts`（真实 SPA 路由截图，webServer 起 `pnpm --filter @wechat-flow/editor dev`）+ 本轮新增 `playwright.security.config.ts`（真实 SPA 安全 E2E，同 webServer 模式）
- 平台: win32（本机验证），CI 端为 linux（Playwright 官方 Docker 镜像，独立基线）
- 未启动服务: relay 依赖 docker redis，本轮未启动（无需要真实凭据的用例需要它；本轮 relay 侧核实为源码走读，非运行时集成测试）

## 5. 测试执行结果

| 用例ID | 结果 | 耗时 | 备注 |
|--------|------|------|------|
| TC-001 | PASS | 3.1s | 真实 Chromium，`page.keyboard.type` 键入触发；iframe window 全局变量断言 undefined |
| TC-002 | PASS | 1.1s | sandbox 属性断言真实 DOM |
| TC-003 | 核实完成，确认缺陷仍存在 | — | `apps/relay/src/image/preprocess.ts` 仅 `resize({width:1080})`，无尺寸目标压缩循环 → DEFECT-001 |
| TC-004 | 核实完成，确认缺陷仍存在 | — | `DocListPanel.vue` `onMounted` 内 `try/finally` 无 `catch` → DEFECT-002；已补 vitest 回归测试固化现象 |
| TC-005 | 核实完成，4 项 backlog 均仍未闭合 | — | 见 §9，非本轮新增缺陷，登记不重复计入缺陷清单 |
| TC-006 | 裁决完成: **假阳性（token 碰撞）** | — | 见 §8-1 |
| TC-007 | 裁决完成: **正确排除（非缺陷）** | — | 见 §8-2 |
| TC-008 | 裁决完成: **假阳性（跨卷引用未被扫描）** | — | 见 §8-3 |
| TC-009 | 裁决完成: **假阳性（同上，跨卷/命名局部性）** | — | 见 §8-4 |
| TC-010 | PASS | 78.03s | 2388 passed / 8 skipped / 0 failed（199 test files + 1 skipped file）；1 条 unhandledRejection 诊断噪声（TC-004 回归测试主动复现的缺陷证据，非失败） |
| TC-011 | PASS | node 2.93s + edge 7.53s | node（2 tests）+ browser（含于 node 套件） + edge（1 test）三运行时全绿 |
| TC-012 | PASS | — | vue-tsc 0 error；tsc -p tests/tsconfig.json 0 error；biome 733 文件 0 error |
| TC-013 | PASS | 36.3s | 233/233，含新增 testIgnore 隔离后不受影响 |

### 5.1 执行汇总
- 总用例数: 2388（单元/集成，vitest）+ 2（E2E 安全新增）+ 233（视觉回归）+ 2（cross-runtime）= 2625（另 8 skipped）
- 通过: 2625 | 失败: 0 | 跳过: 8
- 通过率: 100%（除 skipped 外）

## 6. 缺陷清单

| 缺陷ID | 关联任务 | 严重等级 | 状态 | 描述 |
|--------|----------|----------|------|------|
| DEFECT-001 | T-033 | MEDIUM | open | `apps/relay/src/image/preprocess.ts` 仅实现宽度规整（≤1080px）与 EXIF 剥离（经 `.rotate()` 重编码），未实现 PRD F-006 AC-002b 要求的「压缩目标 ≤2.5MB」逻辑；`apps/relay/src/routes/images.ts:12` 仅有 10MB 硬上限校验（`maxBytes = 10*1024*1024`），无尺寸自适应质量压缩循环。10MB 硬限（平台准入门槛）与 2.5MB 推荐压缩目标（流量优化）是 PRD 明确区分的两层指标，当前仅前者生效。root_cause: self-caused（Phase 5 实现阶段遗留，非本轮引入）。属既有 backlog 登记项（CLAUDE.md §待办 T-033 图床），本轮核实仍未修复，正式计入缺陷清单以便走 debug 闭环。 |
| DEFECT-002 | T-016（DocListPanel 归属任务，P-002） | LOW | open | `apps/editor/src/components/panel/DocListPanel.vue:26-33` `onMounted` 内 `listDocuments()` 调用只有 `try/finally`，无 `catch`；Promise reject 时以 unhandled rejection 形式逃逸，UI 静默退化为「还没有文档」空态，与真实的「加载失败」语义混淆，用户无法区分「新用户无文档」与「IndexedDB 故障」。root_cause: upstream-caused（P-002 ui-spec 状态表仅定义 loading/empty/populated 三态，未定义 error 态，属规范缺口而非纯实现疏漏）。已在 `apps/editor/src/components/panel/__tests__/DocListPanel.test.ts` 新增回归测试固化现象（reject → 空态而非错误态），供 debug/implementer 后续按需修复参照。 |

**说明**：本轮未发现 CRITICAL/HIGH 级别新缺陷。§8 doc-consistency 裁决的 1×HIGH 经核实为检查器假阳性（不计入缺陷清单，理由见 §8-1）。§9 盲区登记中的既有 backlog 项（Sprint 5 遗留 4 项 + iframe XSS 环境缺口已在本轮解决）不重复计入本清单，按 CLAUDE.md 既有登记跟踪。

## 7. 结论与建议

**本轮 Phase 6 testing 未发现新增 CRITICAL/HIGH 缺陷**；发现 1×MEDIUM（DEFECT-001，图片压缩目标缺失，已知 backlog 项，本轮从「登记」升级为「正式缺陷」以便进入 debug 闭环）+ 1×LOW（DEFECT-002，DocListPanel 错误态缺口，本轮新发现并补充回归测试固化）。

全量回归基线（2388 单元/集成 + 233 视觉回归 + 2 跨运行时 + 2 新增 E2E 安全用例 = 2625 用例）100% 通过，typecheck / biome 全绿，跨运行时字节级一致性验证通过。iframe sandbox XSS 防护（此前 backlog 中标记为「happy-dom 假绿，需 Playwright 真验」的条目）本轮已用真实 Chromium + 真实键盘输入原语验证通过，此项 backlog 予以关闭。

**verdict: needs_revision**（DEFECT-001 为真实缺陷，按 COMMON-RULES §verdict_blocking_semantics 与 qa-engineer AGENT.md 约束，任何真实缺陷一律 needs_revision，不适用 conditional_release）。

**建议**：
1. DEFECT-001 交由 debug 闭环：`preprocessImage()` 需补充尺寸自适应压缩循环（sharp `quality` 参数迭代或 `resize` 二次收缩直到 ≤2.5MB），或如 architect 判定 2.5MB 目标不可行需回 PRD 修订 AC-002b（当前实现僅达成 10MB 硬限部分）。
2. DEFECT-002 优先级低，建议随 P-002 ui-spec 补充 error 态定义（`[ASSUMPTION]` 或走 amendment）一并修复，避免仅打补丁不补规范。
3. Sprint 5 backlog 4 项（SR-R2-002/003/005/006）与已知环境受限项（COS 签名、微信真实 API 等）继续按 CLAUDE.md §待办 track，不阻塞本轮 verdict（均非本轮新增，且非本轮契约要求闭环范围）。
4. 修复 DEFECT-001 后建议重跑 T-033 关联的 relay 图片处理测试与本轮 TC-003 核实步骤确认闭环，无需重跑全量套件。

## 8. doc-consistency 裁决清单

Phase Transition 时 `cataforge skill run doc-consistency -- docs/` exit 1，orchestrator 降级为 WARN 移交裁决。逐条裁决如下（完整 checker 原始输出、需求追踪矩阵见执行记录）：

### 8-1. HIGH [ac-traceability]: "PRD 中 12 个 AC 未传播到 DEV-PLAN: AC-001..AC-008"

**裁决：假阳性（bare-token 碰撞），不计入缺陷清单。**

证据链：
1. checker 报文本身列出的是裸 token `AC-001, AC-002, ..., AC-008`（8 个 distinct token，非 12 个不同 ID；"共 12 项"是碰撞计数，非唯一 ID 计数）。
2. PRD 分卷 `prd-wechat-flow-f001-f014.md` 中 **每个 F-xxx 独立拥有从 AC-001 开始编号的本地 AC 序列**（F-001 有 AC-001..AC-009，F-002 有 AC-001..AC-006，F-011 有 AC-001..AC-009，……14 个 feature 各自独立编号，AC-NNN 不是全局唯一 ID，须始终以 `F-xxx.AC-yyy` 限定）。
3. DEV-PLAN 每张任务卡的 `tdd_acceptance` 字段与 `acceptance_criteria` 清单**同样使用任务本地的裸 AC-NNN 编号**（如 T-004 `tdd_acceptance: [AC-001..AC-006]` 是 T-004 自己的验收标准编号，非 PRD F-004 的 AC 引用）——经抽样核实 `docs/dev-plan/dev-plan-wechat-flow-s0.md`/`s1.md` 多张任务卡均如此。
4. **同一次 checker 运行输出的《需求追踪矩阵》**（doc-consistency 自身产出）显示 F-001~F-014 全部 14 个 feature 在 DEV-PLAN Task 列均有非空任务列表，覆盖态为 `full`（10/14）或 `partial`（4/14，且 partial 项均有实际任务列表，非空白）。
5. sprint-review s6 r1（`docs/reviews/sprint/SPRINT-REVIEW-s6-r1.md`）已用 5 并行 reviewer 切片对 168 个规划 AC 做逐条深度核实，结论 **drift-rate = 0%**（零延期零计划外）——与本次 checker 报告的"12 项未传播"结论直接矛盾，进一步印证 checker 侧误报而非新回归。

结论：checker 的 AC 追踪对比逻辑在"任务卡本地编号 AC-NNN" vs "PRD 分卷内 F-xxx 本地编号 AC-NNN"两个不同命名空间之间做字面 token 比较，未做 `F-xxx.` 前缀限定，导致同名不同源的 token 被误判为"未传播"。`root_cause: reviewer-calibration`（工具侧命名空间处理边界情况，非文档质量问题）。

### 8-2. MEDIUM [ui-coverage]: F-010（开发者扩展与插件系统）、F-013（程序化调用 — MCP/CLI/Skill）未在 UI-SPEC 覆盖

**裁决：正确排除，非缺陷。**

F-010（插件包/组件清单/CLI 脚手架/variant 注册扩展点/MCP 注册扩展点）与 F-013（MCP server stdio+HTTP/SSE、Skill bundle、CLI 命令行壳）均面向**开发者/程序化调用方**，不产出终端用户可见页面或交互组件。核实 `docs/ui-spec/ui-spec-wechat-flow.md`、`ui-spec-wechat-flow-p001-p005.md` 全文无 F-010/F-013 关键字，符合预期——这两个 feature 天然不落 UI-SPEC 覆盖范围，checker 的 `ui-coverage` 维度按"user-facing 功能"启发式判定二者仍需 UI 覆盖属误判范围界定，`root_cause: reviewer-calibration`。不构成盲区，不登记。

### 8-3 / 8-4. MEDIUM [orphaned-component]: UC-015/UC-016/UC-023 未被任何页面引用；MEDIUM [entity-propagation]: ARCH E-001,E-002,E-003,E-004,E-006 未在 DEV-PLAN 任务中引用

**裁决：假阳性（跨卷/跨文档引用未被扫描到），不计入缺陷清单。**

- UC-015（InsertDrawer）、UC-016（ContextMenu）、UC-023（StatusBar）：`ui-spec-wechat-flow-uc001-uc014.md` 组件卷内部已显式声明触发关系（"「+」插入按钮…触发 UC-015 InsertDrawer"、"「...」次级菜单按钮…触发 UC-016 ContextMenu"），主卷 `ui-spec-wechat-flow.md` §2 组件清单与 A-014 决策记录同样交叉引用。checker 的 orphaned-component 扫描仅比对 `ui-spec-wechat-flow-p001-p005.md`（页面卷）文本，未纳入组件卷内部的 wiring 声明，属**跨卷引用盲区**，非真实孤立组件。代码侧核实：`apps/editor/src/components/panel/InsertDrawer.vue`、`ContextMenu.vue`、`apps/editor/src/components/layout/StatusBar.vue` 均已实现并挂载于 `EditorShell.vue`（P-001 编辑器页面壳），且各自有专门的 wiring 测试文件（`EditorShellStatusBarWiring.test.ts`、`EditorShellKeywordLintWiring.test.ts`）。`root_cause: reviewer-calibration`。
- E-001/E-002/E-003/E-004/E-006：ARCH 实体在 DEV-PLAN 任务卡中的引用同样以任务本地术语或间接（通过 M-xxx 模块号）方式出现，而非逐字面 `E-NNN` token 匹配；结合 sprint-review s6 的 168 AC drift-rate=0% 结论与 Sprint 0-6 130 张任务卡全部交付的既成事实，判定为**命名匹配局部性导致的误报**，而非实体真实未落地。`root_cause: reviewer-calibration`。

**处置建议**（非本轮阻塞项，登记供后续框架反馈）：doc-consistency 的 `ac-traceability` 与 `orphaned-component`/`entity-propagation` 检查器应支持跨分卷聚合扫描 + 命名空间限定比较（`F-xxx.AC-yyy` 而非裸 `AC-yyy`），建议计入 CLAUDE.md §待办 upstream/CataForge 反馈队列。

## 9. 盲区登记

以下均为**既有 backlog 登记项的本轮状态核实**，非本轮新发现，不重复计入 §6 缺陷清单（DEFECT-001 除外，该项本轮从"backlog 登记"正式升级为"缺陷清单条目"）：

| 盲区 | 本轮核实状态 | 说明 |
|------|-------------|------|
| iframe sandbox XSS（happy-dom 假绿） | **已闭合** | 本轮新增 `e2e/visual/preview-sandbox-security.spec.ts`，真实 Chromium + `page.keyboard.type` 真实键入验证脚本不执行，2/2 PASS。可从 backlog 移除。 |
| T-124 Worker delete 全局 | 未核实（环境范围外） | 需要真实 Worker 生命周期跨进程验证，本轮时间预算未覆盖，维持 backlog。 |
| T-125 mcp HTTP 进程 | 未核实（环境范围外） | 需起 MCP HTTP transport 真实进程，本轮未启动，维持 backlog。 |
| T-126 微信真实 API | 环境不可达 | 需真实 AppID/Secret，沙盒无法提供，维持 backlog（非缺陷阻塞项）。 |
| T-127 vite HMR 浏览器 | 未核实（环境范围外） | 本轮时间预算未覆盖，维持 backlog。 |
| SR-R2-002 use-sse-job 生产消费者缺失 | **核实：仍缺失** | 全仓 `.vue`/`.ts`（非测试）搜索 `useSseJob`/`use-sse-job` 无生产消费者，仅 `use-sse-job.ts` 自身与其单测引用。维持 backlog。 |
| SR-R2-003 上传 progress 恒 0 | 未核实本轮 | 未直接复测，沿用既有登记，维持 backlog。 |
| SR-R2-005 onDownloadHtml error 反馈缺失 | **核实：仍缺失** | `EditorShell.vue:234-241` `onDownloadHtml` 无 try/catch，`composeExportHtml` 失败无 `notify`/toast 反馈路径。维持 backlog。 |
| SR-R2-006 use-editor-session JWT 主动续期缺失 | **核实：仍缺失** | 全仓搜索无 proactive refresh 逻辑（`refreshToken`/JWT 续期关键字零命中于生产代码）。维持 backlog。 |
| SR-R2-007 SettingsPage 占位 section | 未核实本轮 | 未直接复测，沿用既有登记，维持 backlog。 |
| T-033 COS Content-Type 签名 / OSS/COS/SM.MS/custom env-gated 集成测试 | 环境不可达 | 需真实云凭据，沙盒无法提供，维持 backlog（非缺陷阻塞项，与 DEFECT-001 是同任务下的不同子项，DEFECT-001 是压缩目标逻辑缺失，本项是需要真实端点的签名验证，两者独立）。 |
| R-007 relay API key 哈希 | 未核实本轮 | 无 admin 存储落点，沿用既有登记，维持 backlog。 |

**e2e_backdoor_scan 结果回应**（`cataforge skill run testing -- scan-e2e e2e/visual/`）：扫描 7 个 e2e 文件，输出 `1 backdoor WARN, 1 real-input call(s) across 7 file(s)`，`RESULT: PASS (warnings only)`。该 WARN 命中 `e2e/visual/preview-sandbox-security.spec.ts:26` 的 `window.__wf_xss_marker__` 字符串——**这不是测试后门**，而是本用例刻意构造的 **XSS payload 本体**：它是被 `page.keyboard.type()`（真实键盘输入原语）键入编辑器源码面板的 Markdown 文本内容之一部分，用于验证该全局变量**是否被注入到 iframe window**（断言其为 `undefined`），验证方向与"用 `window.__*__` 后门绕过真实输入路径"完全相反——本用例恰恰是用真实输入路径去证明该类后门式全局变量注入在生产沙箱下不可能得逞。real-input call 计数 1（`page.keyboard.type`）准确反映本轮 E2E satisfies §E2E 真实性最低要求（真实用户输入原语触发 happy path）。
