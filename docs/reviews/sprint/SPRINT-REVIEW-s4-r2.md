---
id: "sprint-review-s4-r2"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s4", "arch-wechat-flow-modules", "arch-wechat-flow-api", "dev-plan-wechat-flow"]
---

# Sprint 4 完成度审查 — r2（全量闭环：UI 任务 + DESIGN/VALIDATION 门禁）

## 审查范围与边界

r1 仅覆盖 feature 侧已合 main 子集（T-030/031/034/035/037/038/039/118~122/092），并显式排除所有 UI 任务和 DESIGN/VALIDATION 门禁任务。r2 覆盖 Sprint 4 全集，重点为：

| 审查分支 | 说明 |
|---|---|
| **批量 code-review（A）** | T-040/T-041/T-093 + 下载 HTML wiring，无独立 CODE-REVIEW，本报告 per-task L2 维度表等价交付 |
| **聚合已有审查（B）** | T-042 CODE-REVIEW-T-042-r1（security_sensitive，verdict=needs_revision→修复后合并）|
| **门禁性核对（C）** | T-102/T-105/T-106 设计 sign-off；T-111 VALIDATION 结果与推延项阻塞性判断 |
| **r1 HIGH 修复回归（D）** | SR-A-001/SR-A-002/SR-C-001 三项确认仍生效 |
| **T-093 三观察落项（E）** | progress 恒 0 / dragging 浮层悬停不显 / client session security |

---

## Layer 1 结构检查结论

（同 r1 运行环境，噪声特性不变，此轮重点关注 r1 之后新增任务的结构 finding）

| 类别 | 性质 |
|---|---|
| task_status_done MEDIUM | 同 r1，项目状态外部追踪（CLAUDE.md），非缺陷 |
| unplanned_files LOW | 同 r1，deliverables 非穷举，实现期拆分文件被误判 |
| code_review_present MEDIUM | T-040/041/093 无独立 CODE-REVIEW，本报告 merged-review 覆盖 |
| ac_coverage | T-040 AC 中 toast-host/wiring 挂载点需 Layer 2 分析 |

Layer 1 noise 与 r1 判断相同，聚焦 Layer 2 语义审查。

---

## D. r1 HIGH 修复回归确认

### SR-A-002（onCopyHtml 传真实 notify）— **已修复 · 确认生效**

`EditorShell.vue:175-181` 的 `onCopyHtml()` 现传 `notify: pushToast`（`pushToast` 来自 `useToast()`）。用户点击复制后 Toast 正常触发。

### SR-A-001（compose-copy.test.ts AC-002 永真测试）— **已修复 · 确认生效**

当前 `compose-copy.test.ts` 的 AC-002 段落（第 126-137 行）：调用 `composeCopy({ markdown, themeId })`，从 `capturedItems` 找到 `text/html` ClipboardItem，`await blob.text()` 读取真实内容，断言 `not.toMatch(/<style[\s>]/i)` 且 `not.toContain("var(--")`。`mockSimulatePaste` 返回 `SAMPLE_FILTERED_HTML`（已不含 `<style>` 和 `var(--`）。先前"仅断言常量字符串"的两个永真 `it` 已删除，AC-002 通过真实 `composeCopy` 调用链验证。**已修复。**

### SR-C-001（describe-theme.ts templates 硬编码 `[]`）— **已修复 · 确认生效**

`apps/mcp-server/src/tools/describe-theme.ts` 现为：

```ts
import { describeTheme, listThemeTemplates } from "@wechat-flow/core";
export function describeThemeTool(args) {
  const id = String(args.id ?? "");
  const theme = describeTheme(id);
  if (!theme) return { code: "E_NOT_FOUND", id };
  return { ...theme, templates: listThemeTemplates(id) };
}
```

`listThemeTemplates(id)` 真实调用，硬编码 `[]` 已消除。**已修复，SR-C-002/SR-E-006 连带消解。**

---

## C. 门禁性核对

### C-1. DESIGN 门禁（T-102/T-105/T-106）— **全部 sign-off 确认**

`docs/EVENT-LOG.jsonl` 中存在以下三条 `user_decision` 记录（以 `design_signoff` 为 `event.detail` 前缀）：

| 任务 | 时间戳 | 结论 |
|---|---|---|
| T-102 | 2026-06-25T07:48:34+00:00 | approved — UC-014/P-003/P-004 全覆盖 |
| T-106 | 2026-06-25T07:59:34+00:00 | approved — UC-017~022 六组件 ≥2 状态变体 |
| T-105 | 2026-06-25T07:59:34+00:00 | approved — P-003 三档 + 5 缩略图基准 |

三批视觉稿 sign-off 记录均存在，DESIGN 门禁已正式解锁 T-040/041/042/093。

### C-2. T-111 VALIDATION — 实测通过 vs 环境受限推延

根据 `dev-plan-wechat-flow-s4.md` T-111 `validation_result` 字段：

| AC | 状态 | 说明 |
|---|---|---|
| 复制/下载 HTML | 实测通过 | 复制双 MIME、下载 blob=7182B/wechat-flow.html |
| 拖拽上传 | 实测通过 | vite proxy→relay→local 图床，占位原子替换 |
| MCP render_markdown | 实测通过 | 集成测试 11 passed（build 产物未含 key-seeding 限制）|
| Editor session | 实测通过 | 匿名 bootstrap，scope=upload，JWT 透传 |
| export_long_image（MCP）| **环境受限推延** | 需 job-worker + Playwright 管线（T-035 覆盖） |
| 主题卡 pixelmatch | **环境受限推延** | 需 T-058 比对 harness |
| 真实公众号粘贴 | 周期任务推延 | T-090 周期任务验证 |

**阻塞性判断**：两项推延 AC（export_long_image、pixelmatch）均有明确的覆盖任务（T-035/T-058/T-090）承载：
- `export_long_image` 的完整 job-worker+Playwright 路径是 T-035 的核心 deliverable，Sprint 4 范围内 T-034/T-035 已实现队列层，完整 Playwright headless 渲染池为其续 Sprint 任务；
- pixelmatch 视觉回归是 T-058 的专项 harness 任务，T-105 Penpot 缩略图基准已就绪；
- 真实公众号粘贴是 T-090 周期验证任务。

三者均有具体后续任务承接，**不构成 Sprint 4 阻塞**，归入已知 deferred backlog，无需 conditional_release。

---

## E. T-093 三观察落项

### E-1. progress 恒 0（AC-002 进度百分比）

**发现**：`use-image-upload.ts` 的 `upload()` 在调用 `uploadImageFn(file)` 时不传 `onProgress` 回调，`progress.value` 在上传开始时设为 0、结束时由 success/error 分支覆盖，**始终为 0**。`ImageUploadOverlay` 中 `{{ progress }}%` 和 `JobProgressBar percent` 均基于此值，故显示永远为 0%。

**评估**：AC-002 要求「显示进度百分比」。当前 `/api/v1/images/upload` 是一次性 POST（sharp 处理 + 写入），relay 端不发 SSE progress 事件，客户端无法拿到实时进度。`use-sse-job` 是长任务 SSE 进度的 composable，上传链路未接。`progress` 字段有结构但语义空壳（始终 0 → 无进度意义）。

**结论**：AC-002 覆盖的"显示进度百分比"要求是 relay 未实现的流式进度特性，属 sprint-level scope 缺口。归为 **MEDIUM** 级别的 ac-coverage 问题（不阻塞核心上传流程，但 AC-002 语义验证存疑）。

### E-2. dragging 浮层悬停不显（UC-018 dragging 态 wiring）

**发现**：`SourcePane.vue` 的 `handleDragEnter` 会调 `imageUpload.startDrag()` → `state.value = "dragging"`，`showOverlay` 仅在 `handleImageFile()` 被调用时才设为 `true`（即 drop 触发后）。因此在 dragenter 阶段 `showOverlay.value` 仍为 `false`，`ImageUploadOverlay` 未渲染，用户看不到 dragging 浮层提示。

**评估**：`ImageUploadOverlay` 组件本身有 `dragging` 状态正确渲染（测试通过），但挂载时机不对——`showOverlay` 在 dragenter 时未设为 true，仅等到 drop 后才显示。dragging 浮层的设计目的是给用户"可以松开"的实时提示，当前行为缺失。

**结论**：AC-001 要求「显示 UC-018 uploading 状态并插入占位节点」，dragging 态浮层是 UC-018 独立的前置态。缺失 dragging 提示属于 wiring-completeness 缺口，归为 **MEDIUM** 级别。

### E-3. client session composable security（use-editor-session.ts）

**发现**（security 维度完整审查）：

1. **JWT 存储方式**：`cachedJwt` 为模块级别闭包变量（`let cachedJwt: string | undefined`），每个 `useEditorSession()` 调用实例独立持有，**不写入 localStorage/sessionStorage/Cookie**，不落入 URL，仅在内存中。符合 T-091 AC-005「CSP 允许 sessionJwt 出现在 Authorization header 但禁止出现在 URL query」的要求。
2. **作用域**：scope 来自 relay 响应（`scope: ["upload"]`），客户端不自行扩权，JWT 内容由 relay 控制。
3. **续期机制**：当前实现**无主动续期逻辑**（`fetchPromise = null` 后下次调用重新 bootstrap 获取新 token），不调用 `/api/v1/editor/session/refresh` 端点。T-091 AC-003（refresh 端点）已实现在 relay 侧，客户端 composable 未对接。
4. **fingerprint 安全**：`getOrCreateFingerprint()` 使用 `crypto.getRandomValues`（高熵），localStorage 读写异常有 try/catch 兜底，回落到不持久化的随机值。fingerprint 仅用作匿名 session 标识，无密码学级安全需求，实现合理。
5. **并发竞态**：`fetchPromise` 加锁防止并发多次 bootstrap，符合 T-091 设计。

**结论**：整体 security 维度通过，无 CRITICAL/HIGH 问题。归为 **LOW 级别观察**：客户端无主动续期逻辑，长会话（>15min）图片上传 JWT 过期后 relay 将拒绝请求（401），用户需刷新页面重新 bootstrap。当前为已知 deferred，T-091 的 refresh 端点已实现，客户端对接留待后续 Sprint。

---

## A. 批量 code-review：per-task L2 维度表

✅=无问题　⚠=MEDIUM/LOW　❌=HIGH/CRITICAL

| task | structure | error-handling | test-quality | duplication | dead-code | complexity | coupling | security | ac-coverage | wiring |
|------|-----------|----------------|-------------|-------------|-----------|------------|----------|----------|-------------|--------|
| T-040（JobProgressBar/Toast/use-sse-job） | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ |
| T-041（ThemesPage/TemplateThemeCard） | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T-042（已有 CODE-REVIEW-T-042-r1，聚合） | ✅ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | — |
| T-093（上传 UI 接线） | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ |
| 下载 HTML wiring | ✅ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### T-040 详细说明

**ac-coverage ⚠**：T-040 声明 `use-sse-job.ts` 为 deliverable，用于连接 relay SSE 端点，但在生产 EditorShell/ContextMenu/JobProgressBar 挂载路径中，`use-sse-job` 未被任何生产组件消费（`JobProgressBar.vue` 作为展示组件，不自行订阅 SSE）。`use-sse-job` 目前为孤立 composable，生产链路中 SSE→JobProgressBar 的完整消费者不存在（如挂载到 export-long-image 触发的 JobProgressBar 容器）。属已知 wiring-completeness 缺口，任务卡未声明 `wiring_placeholder`。

**wiring ⚠**：`Toast.vue` 已实现，`useToast()` composable（`pushToast`）已在 EditorShell/ThemesPage 生产消费。但 Toast 宿主（Toast 容器，将 `toasts` 列表渲染为 Teleport 浮层）未在 EditorShell 或 App.vue 中挂载。`use-toast.ts` 存在，Toast 组件存在，但无 toast-host 容器，`pushToast` 调用会追加到 `toasts` ref 但没有组件渲染出来展示给用户。

### T-041 详细说明

AC-001/002/003/004 全部有对应测试，断言有效（真实 pinia store 状态变更、spyOn setContent、pushToast 调用验证）。测试使用 `vi.mock("@wechat-flow/core", ...)` 对 `listThemes/listThemeTemplates/describeTemplate` 打 mock，`ThemesPage` 的生产代码调用真实包（无 mock），mock 仅限于测试作用域，不影响生产路径。`ThemesPage` 展示逻辑完整，无 HIGH 问题。

**低优先级注记（非阻塞）**：`TemplateThemeCard.vue` 的「使用此模板」按钮对 `templateId=""` 场景（某主题无模板时 ThemesPage 插入空 templateId 占位卡）会调用 `describeTemplate(themeId, "")` 并被 try/catch 静默吞掉，UI 无反馈——可接受，边界行为。

### T-042 聚合说明（CODE-REVIEW-T-042-r1）

r1 报告 verdict=needs_revision（2 HIGH：R-001 keyBytes 内嵌/R-002 主密钥明文存 IDB）。CLAUDE.md §项目状态 记录修订后实证：
- `EncryptedRecord = { iv, ciphertext }` 已去掉 `keyBytes`
- 主密钥以 `extractable: false` CryptoKey 直存 IDB（fake-indexeddb 实证 CryptoKey 可存）
- 目标单测 53 passed（credentials 15 含 `extractable===false` / 无 keyBytes / 密文非明文）

r1 的 R-001/R-002 已根治。**残留 MEDIUM/LOW**（R-003 至 R-009）未进入独立修复 Sprint，仍为 notes：
- R-003 MEDIUM（clearCredential 非原子性）、R-004/R-005 MEDIUM（clear 无错误处理）、R-006 MEDIUM（组件测试 mock 掉加密链路）
- R-007/R-008/R-009 LOW（fake-indexeddb 跨版本注记/local 语义/占位 section 未标 ASSUMPTION）

### 下载 HTML wiring 详细说明

**command-registry.ts**：`export-download-html` 命令 `run: () => deps.downloadHtml?.()` 真实调用，非 `placeholder`。测试文件 `command-registry.test.ts` 第 77-84 行显式断言 `downloadHtml` 被调用，且第 86-98 行确认 `placeholder` 字段正确区分。

**EditorShell.vue**：`onDownloadHtml()` 调用 `composeExportHtml(...)` + `Blob` + `URL.createObjectURL` + `anchor.click()`，完整接线。`onContextMenuCommand` 传 `downloadHtml: onDownloadHtml`，`buildEditorCommands` 接收并在 `export-download-html.run()` 中透传。

**error-handling ⚠**：`onDownloadHtml` 为 `async` 函数，调用方 `onContextMenuCommand` 不 await 其返回值（`cmd?.run()` — `run` 签名为 `() => void`），Promise rejection 会被静默忽略。`composeExportHtml` 理论上可抛（渲染失败），当前无 try/catch，用户无错误提示。建议捕获后 `pushToast({ type: 'error', ... })`（LOW 级别）。

---

## 发现清单

### MEDIUM

#### [SR-R2-001] MEDIUM ac-coverage: T-040 Toast 宿主容器未挂载，pushToast 调用不可见
- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: `Toast.vue` 组件和 `useToast()` composable 已实现，`EditorShell.vue` / `ThemesPage.vue` 中 `pushToast` 调用已接线（如 `onCopyHtml` → `pushToast({ type:'success' })`、主题切换 → `pushToast({ type:'success' })`）。但在 `EditorShell.vue` 或 `App.vue` 的 template 中，无 Toast 列表容器渲染（无如 `<ToastHost />` 或 `<Teleport to="body"><div v-for="t in toasts"><Toast ... /></div></Teleport>` 结构）。`toasts` ref 会被追加，但无任何组件渲染 Toast 气泡到 DOM。用户在实际操作中看不到任何 Toast 通知，SR-A-002 修复（onCopyHtml 接真实 notify）的生产效果因 toast-host 缺失而无法真正落地。
- **建议**: 在 `EditorShell.vue` template 内（或 `App.vue`）添加 Teleport toast-host：`<Teleport to="body"><div class="toast-host" style="fixed bottom right z-top"><Toast v-for="t in toasts" :key="t.id" v-bind="t" :on-close="() => dismissToast(t.id)" /></div></Teleport>`。补对应的 wiring 测试。

#### [SR-R2-002] MEDIUM wiring-completeness: T-040 use-sse-job 无生产消费者，SSE→JobProgressBar 链路不通
- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: `use-sse-job.ts` 实现完整（SSE start/stop/progress/succeeded/failed 状态机，测试通过），但在生产代码中无任何组件导入并调用它。`JobProgressBar.vue` 是纯展示组件（props in，无内部 SSE 订阅），`EditorShell.vue` 的 `onContextMenuCommand` 中 `export-long-image` 是 placeholder（`run: () => {}`），不触发 SSE 流程。T-040 AC-001/AC-002 的 SSE→进度更新→JobProgressBar 渲染全链路在生产中无法触发——组件和 composable 各自有测试绿，但 wiring 层断开。
- **建议**: T-040 任务卡声明的依赖链（T-034 BullMQ → relay SSE → use-sse-job → JobProgressBar）需要一个消费者组件（如 `ExportJobPanel.vue`）挂载到 EditorShell，在 `export-long-image` 触发时初始化 `useSseJob().start(jobId)` 并将 `{ status, percent }` 传给 `JobProgressBar`。当前为已知 wiring gap，建议登记为 backlog 或在任务卡加 `wiring_placeholder: true` 标注，避免下次 sprint-review 重复误判。

#### [SR-R2-003] MEDIUM ac-coverage: T-093 AC-002 progress 恒 0，进度百分比语义空壳
- **category**: ac-coverage
- **root_cause**: self-caused
- **描述**: `use-image-upload.ts` 的 `progress` ref 在 `upload()` 开始时设为 0，结束时由 success/error 分支控制，但 `uploadImageFn(file)` 调用不传 progress 回调，全程 `progress.value` 保持 0。`ImageUploadOverlay` 的 uploading 态显示 `{{ progress }}%` 和 `JobProgressBar :percent="progress"` 均始终为 0。AC-002「显示进度百分比」的字面语义未真实落地（显示 0% 而非实时进度）。relay `POST /api/v1/images/upload` 为同步处理（无 SSE 流式进度），是架构层面的约束。
- **建议**: 两个选项：(1) 放弃实时百分比（relay 端不发流式进度），改为不确定进度动画（`progress = undefined`，进度条显示 "处理中…" 而非 "0%"），AC-002 语义调整为"显示上传进度状态"而非"百分比"；(2) relay 端上传端点升级为 SSE/chunked，传输阶段推 progress 事件，客户端用 `use-sse-job` 订阅。当前归为 MEDIUM，不阻塞核心上传功能。

#### [SR-R2-004] MEDIUM wiring-completeness: T-093 dragging 浮层在 dragenter 时未显示
- **category**: wiring-completeness
- **root_cause**: self-caused
- **描述**: `SourcePane.vue` 的 `handleDragEnter` 调用 `imageUpload.startDrag()` 将状态设为 `"dragging"`，但 `showOverlay.value` 仍为 `false`（仅 `handleImageFile` 被调用时才设为 `true`）。`ImageUploadOverlay` 以 `v-if="showOverlay"` 控制挂载，dragenter 阶段不显示。用户拖拽图片到编辑区时无 UC-018 dragging 浮层提示（「松开以上传」），只有 drop 后才能看到 uploading 态浮层。UC-018 dragging 态视觉稿在 T-106 已 sign-off，实现与设计不符。
- **建议**: `handleDragEnter` 中增加 `showOverlay.value = true`，并在 `handleDragLeave` 中当 state 回到 idle 时设回 `false`（避免拖出区域后浮层残留）。补测试断言 dragenter 后 overlay 可见。

### LOW

#### [SR-R2-005] LOW error-handling: onDownloadHtml Promise rejection 无用户反馈
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `EditorShell.vue` 的 `onDownloadHtml()` 是 async 函数，`onContextMenuCommand` 中 `cmd?.run()` 调用时 run 签名为 `() => void`，Promise rejection 静默丢失。`composeExportHtml` 渲染失败时用户无错误提示。
- **建议**: `onDownloadHtml` 内 try/catch + `pushToast({ type: 'error', message: '下载失败' })`，优先级 LOW。

#### [SR-R2-006] LOW security: use-editor-session 无主动续期，长会话 JWT 过期后上传静默失败 401
- **category**: security
- **root_cause**: self-caused
- **描述**: `useEditorSession` 缓存首次 bootstrap 的 JWT（`cachedJwt`），无主动续期逻辑（不调 `/api/v1/editor/session/refresh`）。JWT 15min 后过期，`defaultUploadImage` 发送含过期 JWT 的请求，relay 返回 401，`use-image-upload.ts:38` 解析错误码后状态变 error + errorMsg。用户看到「上传失败」但不知根因是 session 过期。
- **建议**: `getSessionToken()` 中结合 `expiresAt` 判断是否需要续期，在 exp 前 1min 内主动调 `/refresh`（T-091 relay 端已实现）。LOW 优先级，deferred 至后续 Sprint，对应 T-091 客户端 composable 对接。

#### [SR-R2-007] LOW test-quality: T-042 R-009 占位 section 缺少 [ASSUMPTION] 标记（沿用 r1 结论）
- **category**: convention
- **root_cause**: self-caused
- **描述**: `SettingsPage.vue` 编辑器/主题与品牌/同步与协作/关于四个 section 的 `<p class="settings-content__placeholder">` 缺少内联注释标注依赖任务。
- **建议**: 同 CODE-REVIEW-T-042-r1 R-009 建议，LOW，不阻塞。

---

## B. T-042 残留 MEDIUM/LOW 聚合

（CODE-REVIEW-T-042-r1 verdict 已升为 approved，2 HIGH 根治，下列残留项由 sprint-review 追踪）

| ID | 严重等级 | 摘要 |
|---|---|---|
| R-003 | MEDIUM | clearCredential 非原子性（两步事务） |
| R-004 | MEDIUM | ImageHostConfig clear() 无 try/catch，失败无 Toast |
| R-005 | MEDIUM | clear() 失败时内存字段与 IDB 不一致 |
| R-006 | MEDIUM | 组件测试全量 mock credentials，加密链路未端到端覆盖 |
| R-007 | LOW | fake-indexeddb 跨版本稳定性未标注 |
| R-008 | LOW | clear("local") 隐式触发语义未显式守卫 |
| R-009 | LOW | 四占位 section 缺 [ASSUMPTION]（对应 SR-R2-007） |

---

## 偏移率分析（drift-rate）

**Sprint 4 规划 AC 总数**：

| 任务 | 计划 AC 数 | 实际交付 AC | 延期 AC |
|---|---|---|---|
| T-030 | 5 | 5 | 0 |
| T-031 | 2 | 2 | 0 |
| T-034 | 3 | 3 | 0 |
| T-035 | 3 | 3 | 0（headless 池实现，长图 E2E 推延 T-111） |
| T-037 | 5 | 5 | 0 |
| T-038 | 5 | 5 | 0 |
| T-039 | 3 | 3 | 0 |
| T-040 | 4 | 4（组件） | 0（toast-host wiring 属组件集成，非新 AC）|
| T-041 | 4 | 4 | 0 |
| T-042 | 4 | 4 | 0 |
| T-091 | 5 | 5（服务端）；客户端 composable 关联 use-editor-session | 0（T-093 内交付）|
| T-092 | 6 | 6 | 0 |
| T-093 | 4 | 4（含 AC-002 progress 语义存疑） | 0（结构交付，进度值为 0）|
| T-118~T-122 | ~17 | ~17 | 0 |
| T-111 | 7 | 5 | 2（export_long_image + pixelmatch，环境受限）|

**规划 AC 总数**：约 81。**延期 AC**：2（T-111 环境受限推延，非实现缺失）。**计划外 AC**：下载 HTML wiring（原为 T-030/031 的隐含需求，明确登记在 T-111 中）= 0 额外。

**偏移率**：2 / 81 ≈ **2.5%**，低于 20% 阈值，**不触发 HIGH**。两项推延有明确后续任务覆盖，不构成 Sprint 4 质量门禁问题。

---

## per-task 结论汇总

| 任务（r2 新增） | 结论 | 说明 |
|---|---|---|
| T-040（JobProgressBar/Toast/use-sse-job）| approved_with_notes | toast-host 未挂载（SR-R2-001）、use-sse-job 无生产消费者（SR-R2-002） |
| T-041（ThemesPage/TemplateThemeCard）| approved | AC 全覆盖，测试有效，wiring 完整 |
| T-042（凭据加密，聚合）| approved_with_notes | 2 HIGH 已根治，残留 4 MEDIUM + 3 LOW 见聚合表 |
| T-093（上传 UI 接线）| approved_with_notes | progress 恒 0（SR-R2-003）、dragging 浮层缺失（SR-R2-004）、session 续期 LOW（SR-R2-006）|
| 下载 HTML wiring | approved_with_notes | onDownloadHtml 无错误处理（SR-R2-005 LOW）|
| T-102/T-105/T-106（DESIGN 门禁）| approved（sign-off 确认）| EVENT-LOG 三条 user_decision 记录存在 |
| T-111（VALIDATION）| approved_with_notes | 5/7 AC 实测通过；2 项推延有覆盖任务，不阻塞 |
| r1 HIGH 修复（SR-A-001/002/C-001）| approved（回归确认）| 三项均已修复，代码实读确认 |

---

## 质量聚合（跨 Sprint 4 全量 CODE-REVIEW 模式）

结合 r1 MEDIUM/LOW 残留项与 r2 新发现，以下模式反复出现：

1. **wiring-completeness 盲区**：组件实现 + 单元测试均绿，但消费者挂载点（toast-host、sse-job 消费者、dragging overlay）缺失，只有集成/e2e 才能捕获——建议在 dev-plan 任务卡 `wiring_evidence` 字段补消费点路径，避免 sprint-review 漏审。
2. **error 路径 Toast 反馈不一致**：copy.ts AC-004 / onDownloadHtml / clear() 三处均有"操作失败无反馈"模式，建议统一 error boundary 习惯（try/catch + pushToast(error)）。
3. **mock 覆盖范围**：ThemesPage 和 T-042 组件测试对 `@wechat-flow/core` 做不同程度 mock，导致加密链路/真实数据流未在组件层集成验证。低优先级但有累积风险。

---

## 结论

**verdict: approved_with_notes**

所有 HIGH 问题均已在 r1 修复（SR-A-001/002/SR-C-001），r2 新发现全部为 MEDIUM/LOW 级别，无新增 CRITICAL/HIGH。

| 严重等级 | 数量 | ID |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 4 | SR-R2-001/002/003/004 |
| LOW | 3 | SR-R2-005/006/007（+ T-042 残留 3 LOW 继承）|

**MEDIUM 项说明**：
- **SR-R2-001**（toast-host 未挂载）：用户当前看不到任何 Toast 通知（copyHtml/主题切换提示均不可见），优先修复建议
- **SR-R2-002**（use-sse-job 无生产消费者）：SSE 进度功能链路断开，对应 export-long-image 功能（属后续 Sprint feature）
- **SR-R2-003**（progress 恒 0）：AC-002 语义存疑，但核心上传功能正常
- **SR-R2-004**（dragging 浮层未显示）：UC-018 设计意图未落地，单点可修复

**Sprint 4 整体评估**：核心 feature（复制/下载 HTML、图片上传、凭据加密、主题市场、MCP 工具链）全部交付并有有效测试覆盖。推延项（export_long_image、pixelmatch、JWT 续期）均有明确后续任务承接，不构成 Phase Transition 阻塞。`approved_with_notes` 按 post_sprint 检查点语义：用户可选择修复 SR-R2-001/004（可见 UX 缺口，单点改动）后进入 Sprint 5，或接受 MEDIUM 现状（SR-R2-002/003 属后续 Sprint feature 范畴）直接推进。

---

## Revision 闭环（approved_with_notes 处置）

**用户决策**：修复 SR-R2-001 + SR-R2-004（单点可见 UX 缺口）→ Revision；SR-R2-002 / SR-R2-003 + 3 LOW → Sprint 5 backlog。经 tdd-engine light-dispatch 子代理闭环，orchestrator 独立验证。

| 编号 | 处置 | 落地 | 验证 |
|---|---|---|---|
| SR-R2-001 | **已修复** | 新建 `apps/editor/src/components/common/ToastHost.vue`（`<Teleport to="body">` + fixed 右下角，消费 `useToast()` 模块单例），挂载到 `apps/editor/src/App.vue` 根（与 `<router-view/>` 同级，覆盖 `/`、`/docs/:id`、`/themes`、`/settings`、`/preview/:id` 全部路由）。原误放 `EditorShell.vue` 的工作区 host 块撤回（仅编辑器路由可见 → 全局可见） | 6 个 `ToastHost.test.ts`（pushToast→气泡、error 型、多气泡、dismiss/点击关闭→移除、App 含 ToastHost wiring）；浏览器实测 `/themes` 路由 toast-host 存在并渲染 toast |
| SR-R2-004 | **已修复** | `SourcePane.vue` `handleDragEnter` 含 Files 时置 `showOverlay=true`；`handleDragLeave` 按 `relatedTarget` 判离 pane 才 `endDrag()`+收起（避免子元素移动闪烁）；`handleDrop` 同步收起 | 4 个 `SourcePaneDragOverlay.test.ts`（dragenter→overlay 可见、无 Files→不显、dragleave→隐藏、drop 清理） |
| SR-R2-002 | **Sprint 5 backlog** | use-sse-job 生产消费者（export-long-image 全链路，需 relay SSE 接线） | — |
| SR-R2-003 | **Sprint 5 backlog** | 上传进度（relay 端同步处理无流式 progress，需端点升级或改不确定进度动画 + AC-002 语义校正） | — |
| SR-R2-005/006/007 | **Sprint 5 backlog** | onDownloadHtml error 反馈 / JWT 主动续期 / 占位 section [ASSUMPTION] 标注 | — |

**独立验证（orchestrator，规避 turbo 缓存）**：根 `pnpm vitest run` = 102 files / 1199 passed / 1 skip；`vue-tsc --noEmit` exit 0；`biome check` 0 error；editor preview 浏览器实测 toast-host 全局渲染、零 console error。

**Sprint 4 收口结论**：选中的两条 MEDIUM 已闭环，其余 notes 显式登记 Sprint 5 backlog → Sprint 4 完成度审查 **结清**，进入 Sprint 5。
