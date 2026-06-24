---
id: "sprint-review-s4-r1"
doc_type: sprint-review
author: reviewer
status: draft
deps: ["dev-plan-wechat-flow", "dev-plan-wechat-flow-s4", "arch-wechat-flow-modules", "arch-wechat-flow-api"]
---

# Sprint 4 完成度审查 — r1（feature 侧已完成子集）

## 审查范围与边界

**本轮审查范围**：Sprint 4 已实现并合入 main 的 feature 任务子集，重点消化此前延后的 per-task code-review。

| 在范围内（feature，已合 main） | 状态 |
|---|---|
| T-030 / T-031（composeCopy / composeExportHtml，apps/editor） | 批量审（Cluster A） |
| T-034 / T-035（BullMQ 队列 / Playwright 池，apps/relay + job-worker） | 批量审（Cluster B） |
| T-037 / T-038 / T-039（MCP Tool，apps/mcp-server） | 批量审（Cluster C） |
| T-118 / T-119 / T-120 / T-121 / T-122（register_variant + L3 cascade，packages/core） | 批量审（Cluster D） |
| T-092（主题 template + 9 维守护 + describe_template，core+themes+mcp+contracts） | 批量审（Cluster E） |
| T-032（Hono 骨架，chore）/ T-033 / T-036 / T-091 | 已有独立 CODE-REVIEW，不重审 |

**排除在本轮闭环外**（DESIGN / VALIDATION 门禁阻塞，非质量问题）：
- T-040 / T-041 / T-042 / T-093（UI 页 .vue + composable）—— 待 T-102 / T-105 / T-106 Penpot 视觉稿用户 sign-off 解锁
- T-102 / T-105 / T-106（[DESIGN]）、T-111（[VALIDATION]）

> **结论先述**：feature 侧整体 **needs_revision**，由 2 个 HIGH 驱动（均为单点可补丁，不影响核心渲染/队列/注册链路正确性）。Sprint 4 本身因 UI 任务未解锁尚未到闭环点，本报告不构成 Phase Transition 门禁，仅驱动对已合并代码的修复工作。

---

## Layer 1 结构检查结论

`cataforge skill run sprint-review -- 4`：16 blocking + 304 advisory。**绝大多数为项目级追踪特征噪声，非缺陷**：

| 类别 | 数量 | 性质 |
|---|---|---|
| task_status_done MEDIUM | 25 | 噪声 —— 本项目状态外部追踪（CLAUDE.md §项目状态 + PR/git），dev-plan 卡无 `status:` 字段 |
| unplanned_files LOW | 257 | 噪声 —— 任务卡 deliverables 为代表性非穷举，实现期正常拆分文件（types/factory/http/keys.ts、package.json、tsconfig.json）被误判 gold-plating |
| deliverables_exist HIGH | 15 | 10 个 = UI 任务真未做（排除在外）；5 个 = 已合并任务的交付物路径漂移（见下） |
| ac_coverage HIGH | 1 | T-122 AC-007（见 SR-D-004，annotation gap 非逻辑缺口） |
| code_review_present MEDIUM | 22 | 本轮批量审查覆盖即消除 |

### [SR-L1-001] MEDIUM consistency: dev-plan deliverable 路径相对实现 stale（已合并任务）
- **category**: consistency
- **root_cause**: upstream-caused（dev-plan 卡声明路径，实现期合理调整落点未回写）
- **描述**: 三处已合并任务的 deliverable 路径与实际落点不符（代码存在、功能完整，仅路径漂移）：
  - T-119 卡 `packages/core/src/theme/registry/variant.ts` → 实际 `packages/core/src/registry/variant.ts`
  - T-092 卡 `packages/core/src/theme/template-registry.ts` → 实际 `packages/core/src/registry/template.ts`
  - T-092 卡 `apps/mcp-server/src/tools/mcp/tool-contracts.ts` → 实际 `packages/contracts/src/mcp/tool-contracts.ts`
- **建议**: 由 tech-lead 在 dev-plan 修订时对账三处路径；非阻塞。

### [SR-L1-002] MEDIUM missing-deliverable: T-091 客户端 `use-editor-session.ts` 缺失
- **category**: missing-deliverable
- **root_cause**: self-caused（合理延后，无显式记录）
- **描述**: T-091 deliverable `apps/editor/src/composables/use-editor-session.ts`（客户端 session 获取/续期 composable）在磁盘不存在。其消费者（T-040 / T-093 UI 任务）均被 DESIGN 门禁阻塞未做，故客户端 composable 随之延后。relay 服务端 session 端点（`auth/editor-session.ts` / `auth/token-resolver.ts` / `routes/editor-session.ts`）已实现并有 CODE-REVIEW-T-091。
- **建议**: 将客户端 `use-editor-session.ts` 显式登记为随 T-040/T-093 UI 解锁的依赖交付物，避免被遗忘。

### [SR-L1-003] LOW consistency: T-091 `middleware/auth.ts` 未创建（职责落 token-resolver）
- **category**: consistency
- **root_cause**: self-caused（结构调整，已被 CODE-REVIEW-T-091 覆盖）
- **描述**: T-091 卡声明更新 `apps/relay/src/middleware/auth.ts`，实际 Bearer 解析职责落在 `apps/relay/src/auth/token-resolver.ts`，middleware/ 仅有 `validator.ts`。Cluster B 另发现 `POST /api/v1/jobs` 当前无鉴权挂载（SR-B-003），与此结构调整相关。
- **建议**: 见 SR-B-003；auth 中间件统一接线任务（CLAUDE.md 已 deferred）一并处理。

### [SR-L1-004] 配置建议（非缺陷）
- dev-plan 主卷 frontmatter 增 `project_features.task_status_external: true` → 消除 25 项 task_status_done 误报。
- 如需治理 unplanned_files 噪声，可加 `project_features.unplanned_glob_patterns`（`**/*.test.ts`、`**/types.ts`、`**/package.json` 等），但 257 项主因是 deliverables 非穷举，建议接受现状或在卡中补 representative 标注。

---

## Layer 2 per-task 维度表（merged-review 等价交付）

✅=无问题　⚠=MEDIUM/LOW　❌=HIGH/CRITICAL

| task | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | ac-coverage | wiring/consistency |
|------|-----------|----------------|-------------|-------------|-----------|------------|----------|----------|-------------|--------------------|
| T-030 | ✅ | ⚠ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅(use-case) |
| T-031 | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ✅ |
| T-034 | ✅ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ⚠ | ✅ | ✅ |
| T-035 | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-037 | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-038 | ⚠ | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠ |
| T-039 | ✅ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ |
| T-118 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-119 | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-120 | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-121 | ⚠ | ✅ | ⚠ | ✅ | ⚠ | ✅ | ✅ | ✅ | ⚠ | ⚠ |
| T-122 | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ✅ |
| T-092 | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ⚠ | ✅ | ⚠ | ⚠ |

per-task CODE-REVIEW 报告：`docs/reviews/code/CODE-REVIEW-T034-T035-r1.md`、`CODE-REVIEW-T-118-T-122-cluster-d-r1.md`、`CODE-REVIEW-T-092-r1.md`（Cluster A/C 发现内联于本报告）。

---

## 发现清单

### HIGH（驱动 needs_revision）

#### [SR-A-002] HIGH ac-coverage: T-030 AC-003 生产路径 Toast 永不展示（notify 传 no-op）
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: `composeCopy` 内部调 `input.notify?.({type:'success', message:'已复制到剪贴板'})` 实现 AC-003。但 `apps/editor/src/components/layout/EditorShell.vue:173-178` 的 `onCopyHtml` 将 `notify` 硬编码为空箭头函数 `() => {}` → 用户实际点击复制后 Toast 永不出现。use-case 单测以 spy 验证函数内部调用了 notify，未覆盖生产接线把 notify 吞成 no-op。
- **建议**: EditorShell.vue 传入真实 Toast 实现（Toast store / 事件总线）；补 wiring 测试断言 onCopyHtml 透传的 notify 真触发 Toast。

#### [SR-A-001] HIGH test-quality: T-030 AC-002 永真测试（断言常量字符串而非函数输出）
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/app-layer/compose-copy.test.ts:127-133` 下 AC-002 前两个 `it` 仅断言文件级常量 `SAMPLE_FILTERED_HTML`，从不调用 composeCopy；第三个 `it` 依赖 `mockSimulatePaste` 返回预设值，断言的是 mock 返回而非真实 `simulatePaste` 的过滤行为。AC-002 核心（simulatePaste 真正滤除 `<style>` 与 `var(--`）零真实覆盖。
- **建议**: 删除两个永真 `it`；补集成级测试，不 mock simulatePaste，喂含 `<style>`/`var(--` 的原始 HTML，断言最终 ClipboardItem 内容不含这些特征。

#### [SR-C-001] HIGH ac-coverage: describe_theme.templates 硬编码 `[]`，T-038 AC-005/007 语义空壳（wiring 缺口）
- **category**: ac-coverage / wiring
- **root_cause**: self-caused（T-092 交付 `listThemeTemplates` 数据后，T-038 describe_theme 未回接）
- **描述**: `apps/mcp-server/src/tools/describe-theme.ts:8-9` 强制覆盖 `templates: []`，无视主题已注册的 template。T-038 AC-005/007 要求 templates 数组（每项 templateId/description）。T-092 已实现 `listThemeTemplates`，硬编码 `[]` 使 AC-005/007 形式满足、语义未落地。测试 `describe-block.test.ts:79` 仅断言 `Array.isArray(templates)`，空数组即过，无法检出退化（SR-C-002 / SR-E-006 为同一缺陷的弱测试与 LOW 视角）。
- **建议**: describe-theme.ts 调 `listThemeTemplates(id)` 填充 templates；测试补 `templates.length >= 1` + 首元素含 templateId/description。一并消解 SR-C-002、SR-E-006。

### MEDIUM

- **[SR-A-004]** error-handling: `copy.ts:16` `navigator.clipboard.write` 失败未 try/catch，调用方无法感知；notify 支持 `type:'error'` 但错误路径未用。建议捕获后 notify error。
- **[SR-A-003]** test-quality: T-031 AC-002「无 var(--」断言隐依赖「default 主题不产生 CSS 变量」无注释；body 正则截取理论早停风险。建议显式注释测试意图。
- **[SR-B-001]** error-handling: `routes/jobs.ts:76-93` SSE 终态（succeeded/failed）后 `bridge.detach()` 仅在客户端 abort 触发，正常结束泄漏 4 个监听器 → `MaxListenersExceededWarning`。建议终态 resolve 前 detach。
- **[SR-B-002]** error-handling: `routes/jobs.ts:16-42` POST /jobs 无字段校验，`kind` 缺失建 `bullmq-undefined` 队列、`apiKeyId` 缺失幂等隔离失效。建议加必填校验返回 400。
- **[SR-B-003]** security: `routes/jobs.ts:15-43` POST /jobs 无鉴权，apiKeyId 客户端自报 → 幂等/配额/计费归因可伪造。属 auth 中间件 deferred（CLAUDE.md）/ SR-L1-003 范畴；建议短期加 key 存在性校验。
- **[SR-B-005]** error-handling: `headless/playwright-pool.ts:14-19` `ensureBrowsers()` 无锁，并发 `withPage` 可超 `size` 上限重复 launch。建议 init Promise 单例。
- **[SR-C-003]** ac-coverage: T-039 AC-001/002/003 仅测注入版 mock client；stdio 默认 `makeNotImplementedJobsClient` 路径零覆盖，`export_long_image` 返回假 `{jobId:"not-implemented"}` 静默成功不触发 `isError`。建议补 not-implemented client 行为测试。
- **[SR-C-004]** error-handling: `get-job.ts:4` `args.jobId as string` 无空值守卫，schema 为 `z.looseObject({})` 不拦缺省。建议 `String(args.jobId ?? "")` 或显式校验，与其他 Tool 对齐。
- **[SR-C-005]** consistency: `jobs/client.ts:16` not-implemented `enqueue` 返回假 jobId 而非错误码，`isErrorResult` 不识别（检查 `code` 字段）→ MCP 层 `isError:false`。建议改抛错或返回 `{code:"E_NOT_IMPLEMENTED"}`。
- **[SR-C-002]** ac-coverage: `describe-block.test.ts:79` AC-005/007 断言过弱（仅 `Array.isArray`）。随 SR-C-001 一并修。
- **[SR-D-003]** test-quality: `registry/variant.ts:135` `describeVariant(id)` 仅按 `v.id` 匹配，store 键为 `blockId::variantId`，跨 block 同名 variantId 返回依赖 Map 迭代顺序。建议补碰撞测试或改签名 `describeVariant(blockId, id)`。
- **[SR-D-001]** dead-code（自 HIGH 校准下调）: `pipeline/transform.ts:81` `transformToHast(mdast, options?, ...)` 的 `options` 从不被读取（主题合并在下游 `inlineStyle`）→ vestigial 参数。建议移除该参数简化签名；CLAUDE.md 已 deferred 记录。
- **[SR-D-002]** test-quality（自 HIGH 校准下调，upstream-caused）: `transform-container.test.ts:51` AC-T121-003 仅断言输出含 `data-block` 且不含字面 `"undefined"`，与 options 是否被消费无关 → AC 本身 mis-specified。建议重写 AC-T121-003 为回归守护或随 SR-D-001 删除。
- **[SR-D-004]** ac-coverage: T-122 AC-007 在 tests/ 无 `AC-007` 字面引用（Layer 1 flag），但 production path 已被 `createServer→InMemoryTransport→callTool('register_variant')` 端到端覆盖 → annotation gap 非逻辑缺口。建议补字面标注块消除误报。
- **[SR-D-005]** test-quality: T-120 AC-005 spy 弱化为 `customCss=""` vs 无 customCss 的 HTML 等价断言。可接受，严格遵循 AC 可补 `inlineContent` 调用次数 spy。
- **[SR-E-001]** consistency: `theme-guard/template-coverage.ts:13` `NINE_REQUIRED` 实含 14 检测项（h1-h6 展开），命名/AC-003「9 元素」误导。建议重命名 `REQUIRED_ELEMENTS` 或注释 9 大类映射。
- **[SR-E-002]** ac-coverage: AC-005 测试用 `import(\`../../../../packages/themes/${id}/src/index.ts\`)` 字符串拼接动态 import，结构变更静默失效。建议静态 import 5 主题包或配 vitest alias。
- **[SR-E-003]** error-handling: `tools/describe-template.ts:15` 靠副查询 `describeTheme` 区分「主题不存在 vs 模板不存在」，template/theme 两独立 Map，手动 `defineTemplate`（不经 registerTheme）场景返回误导性 `E_THEME_NOT_FOUND`。生产路径不受影响。建议错误区分内聚进 `describeTemplate`。
- **[SR-E-004]** coupling: `describe-template.ts` 工具层同时依赖 `describeTemplate` + `describeTheme`（仅作错误分类），SR-E-003 架构根因。建议工具层只捕错误码。

### LOW

- **[SR-A-005]** test-quality: `compose-copy.test.ts:140` AC-002 第三 `it` 用 `htmlItem?.getType` 可选链，htmlItem undefined 时断言静默假绿。建议先 `expect(htmlItem).not.toBeUndefined()`。
- **[SR-B-004]** test-quality: T-034 AC-001 POST 测试仅验 jobId 非空，未追加 GET。建议补 GET 验状态 pending。
- **[SR-B-006]** consistency: `runtime.ts` `idem:` 与 `bullmq-store.ts` `jobidem:` 双套幂等存储路径无同步，写放大 + 不一致风险。建议定 SSOT。
- **[SR-B-007]** dead-code: `job/types.ts:43` `SseBridgeDeps` 命名未区分工厂参数/产物接口。可选重命名。
- **[SR-C-006]** consistency: `describe-mark.ts:3` `attrsSchema` 模块级硬编码常量（marks 当前无 attrs），与 describe-block 动态 `z.toJSONSchema` 不一致。建议注释意图或命名 `EMPTY_ATTRS_SCHEMA`。
- **[SR-C-007]** dead-code: `router.ts` `ALL_TOOL_SCHEMAS` 注册 24 Tool，`buildHandlers` 实现 15，余 9 个（list_tokens/describe_token/list_block_variants/derive_palette/apply_zh_typo/simulate_paste/export_clipboard_payload/upload_to_wechat_asset 等）走 `E_NOT_IMPLEMENTED` fallback —— 对客户端可见但永不工作。建议注释占位或卡标 `wiring_placeholder:true`。属后续 Sprint（T-075 等）范围。
- **[SR-E-005]** consistency: `packages/contracts/src/mcp/tool-contracts.ts:111` `describeTemplateResponseSchema` 全字段 optional，空对象 `{}` 即过，无校验价值。建议 `z.discriminatedUnion` 收紧，随 API-033 富响应一并。
- **[SR-E-006]** consistency: `describe-theme.ts:8` `templates:[]` 硬编码 —— 与 SR-C-001 同一缺陷的 LOW 视角，随 SR-C-001 修复消解。

---

## dev-plan AC 校正（upstream-caused，sprint-review 处置）

- **AC-004（T-037 lint_markdown）**: dev-plan 写 position 诊断 `level:'error'`，实现实测 `warning`（custom-css strip-position 路径，rejected-but-stripped 渲染仍成功，warning 语义更合理）。测试 `render-markdown.test.ts:101` 已断言 `warning` 与实现一致。**建议改 dev-plan AC-004 `'error'`→`'warning'`，勿改 core/测试**。（CLAUDE.md 已记 deferred）

---

## deferred 逐条核对（CLAUDE.md §待办）

| deferred 项 | 核对结论 |
|---|---|
| T-092 ① 字段名 `{valid,...}` ↔ ARCH `{pass,...}` | 实现以 ARCH 为准，测试已注释偏差。**符合预期，无需跟进** |
| T-092 ② AC-006 富响应（coveredElements 等）未实现 | 当前简单响应，源码注释标 deferred。**符合预期**，富响应时同步收紧 SR-E-005 |
| T-092 ③ describe_theme.templates 硬编码 `[]` | **升级为 SR-C-001 HIGH**（T-092 数据已就绪，应回接） |
| T-092 ④ describeTemplateResponseSchema 宽松 | = SR-E-005 LOW，仍跟进 |
| T-092 ⑤ themes-only-contracts 边界（学习⑮） | 5 主题 `src/templates/index.ts` 仅 `import type ... @wechat-flow/contracts`，零 core import。**完全干净** |
| transformToHast.options 占位 | = SR-D-001/SR-D-002，建议移除参数 + 重写 AC-T121-003 |

---

## 结论

**verdict: needs_revision**

| Cluster | 任务 | 结论 |
|---|---|---|
| A | T-030 / T-031 | **needs_revision**（T-030: SR-A-001 + SR-A-002 两 HIGH） |
| B | T-034 / T-035 | approved_with_notes（4 MEDIUM + 3 LOW，分层测试/状态机/wiring 优秀） |
| C | T-037 / T-038 / T-039 | **needs_revision**（SR-C-001 HIGH describe_theme wiring） |
| D | T-118~T-122 | approved_with_notes（2 项 HIGH 校准为 MEDIUM/deferred） |
| E | T-092 | approved_with_notes（4 MEDIUM + 2 LOW；arch 边界干净） |

**进入修复的 HIGH（3 项，单点可补丁）**：
1. **SR-A-002** — EditorShell.vue onCopyHtml 接真实 Toast notify（用户可见缺陷）
2. **SR-A-001** — compose-copy.test.ts AC-002 补真实 simulatePaste 集成断言
3. **SR-C-001** — describe-theme.ts 接 listThemeTemplates（连带消解 SR-C-002 / SR-E-006）

**非阻塞跟进**：MEDIUM/LOW 项可批量纳入一次维护提交；dev-plan AC-004 文案校正 + SR-L1-001 路径对账 + SR-L1-002 客户端 composable 登记由 tech-lead 在 dev-plan 修订处理。

> Sprint 4 未闭环（UI/DESIGN/VALIDATION 待用户 Penpot sign-off）。本 needs_revision 针对已合并代码，不阻塞 Phase Transition；修复后可出 r2 复核或随 UI 解锁后整 Sprint 终审。
