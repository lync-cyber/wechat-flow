---
id: "code-review-T-010-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-010"]
---

# CODE-REVIEW-T-010-r1 — PreviewPane (iframe 沙箱 + 视口切换)

Layer 1 delegated to hook (PostToolUse Edit → `lint_format`)
security_sensitive: true — Layer 2 强制完整安全审查，不短路

---

## 审查摘要

**verdict**: approved_with_notes
**refactor 触发评估**: 无命中 — 不触发 refactorer

---

## 安全维度审查 (security — 强制完整审查)

### sandbox 属性

`PreviewPane.vue` 第 103 行：`sandbox=""`。Vue 模板静态属性 `sandbox=""` 编译后产出 HTML 属性值为空字符串，`getAttribute('sandbox')` 返回 `""`，满足 arch-wechat-flow#§5.3 "空属性（最严格档位）"要求。`PreviewPane.test.ts` AC-001 测试已验证 `getAttribute('sandbox') === ""`，断言有效。

### CSP meta 注入

`PreviewPane.vue` 第 27–28 行声明：
```
"default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;"
```

arch-wechat-flow#§5.3 架构约定的 CSP 模板为：`default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`。实现与架构约定完全一致，包含 implementer 补充的 `img-src https: data:; font-src https: data:;`，此两条未越界，属于合理且架构明确声明的条目。

注入方式为 `contentDocument.write()` 写入 `<meta http-equiv="Content-Security-Policy" ...>`。meta CSP 是 HTTP header CSP 的合理替代，在 iframe origin=null（opaque）场景下无 HTTP 响应头可设置，此为唯一正确路径。

### XSS 注入面评估

`writeContent(html: string)` 第 30–38 行直接将 `html` prop 注入到 `<body>` 标签内：
```html
<body>${html}</body>
```

此处 `html` 为 prop 传入的渲染产物，在 T-011 未接线前为空串，T-011 后接 `composeRender()` 输出。两层防御：(1) sandbox="" 禁止脚本上下文创建；(2) CSP `default-src 'none'` 阻止脚本源。架构设计 §5.3 "预览 iframe 沙箱"指出 sanitizer 在 hast→pre-paste stage 前置执行，PreviewPane 消费的是已 sanitize 的 HTML，不再需要在此处再次过滤。整体注入面评估：**无高危问题**。

### AC-002 XSS 阻断测试有效性评估（关键）

`PreviewPane.test.ts` 第 62–73 行写入含 `<script>window.__xss_test = "injected";</script>` 的 HTML，断言 `window.__xss_test` 为 undefined。

**关键限制（测试环境妥协）**：happy-dom 不实现真实浏览器的 iframe sandbox 语义。在 happy-dom 中 `iframe.contentDocument.write()` 向 `contentDocument` 写入 script 标签，但 happy-dom 的 iframe 沙箱实际上是在同一 JS 运行时（Node.js）中执行，`sandbox=""` 属性对 DOM write 的脚本执行阻断**在 happy-dom 中不可靠**。当前测试断言为 `undefined` 通过，很可能是因为 happy-dom 根本不执行 `contentDocument.write()` 写入的 `<script>`（不模拟 document.write 触发执行），而非 sandbox 真正阻断了执行。此测试为**假绿**——它验证的是"happy-dom 不执行被 write 的 script"而非"真实浏览器 sandbox 阻断了脚本"。

这是环境限制导致的测试妥协，不属于实现缺陷，但该测试的存在会给代码审查者/维护者错误的安全保证感。真实 sandbox 行为需依赖 Playwright/真实浏览器 E2E 测试验证，当前 unit test 层面无法真实覆盖此安全 AC。

### loadContent 双写路径

`onMounted` 立即调用 `writeContent(props.htmlContent)`，`watch` 监听后续变化（`{ immediate: false }`）。初始 write 在 mounted 时 iframeRef 已挂载，`contentDocument` 可访问，逻辑正确。watch 的 `immediate: false` 确保不重复初始写入，响应式路径无竞态问题。

---

## 问题列表

### [R-001] MEDIUM: AC-002 XSS 沙箱阻断测试在 happy-dom 下为假绿，无法验证真实 sandbox 语义

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `PreviewPane.test.ts` 第 62–73 行的 XSS 测试断言 `window.__xss_test` 为 undefined。happy-dom 不实现真实 iframe sandbox 的脚本隔离语义（happy-dom 的 iframe 在同一 Node.js 进程内运行，`contentDocument.write()` 写入的 `<script>` 标签不会被 happy-dom 调度执行），因此该断言即使 sandbox 属性根本不存在也仍然通过 — 测试无法区分"sandbox 生效阻断了脚本"与"happy-dom 不执行 document.write 触发的脚本"两种情形。当前测试给出的安全保证是虚假的，可能导致未来维护者误认为 sandbox 阻断已被充分验证。
- **建议**: (1) 在测试注释中明确标注此测试为环境限制妥协，不能替代真实浏览器验证，例如：`// NOTE: happy-dom does not enforce iframe sandbox script isolation; this test only verifies the component writes expected HTML structure`；(2) 将真实 sandbox 阻断验证纳入 Playwright E2E 测试套件（Task T-108 Sprint 1 验证阶段）；(3) 测试改为验证"含 script 的内容写入后 iframe.contentDocument.body.innerHTML 包含 script 元素，但 window 全局未被污染"，并在注释中说明 happy-dom 局限。

---

### [R-002] LOW: AC-004 (syncState 视觉状态) 未在 PreviewPane.test.ts 中测试 — 分布于独立文件

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PreviewPane 任务卡 AC-004 要求验证 `syncState:'syncing'` → SyncStateIndicator 颜色 + pulse。该 AC 的测试写在 `SyncStateIndicator.test.ts` 而非 `PreviewPane.test.ts`，导致 PreviewPane 组件的 `syncState` prop 传递链（PreviewPane → SyncStateIndicator）未在 PreviewPane 测试中验证。SyncStateIndicator.test.ts 覆盖了状态机内部逻辑（syncing/idle/connecting/synced/conflict，共 8 个用例），但缺少 error/offline 两个状态的测试用例（这两个状态在 SyncStateIndicator.vue CSS 中有定义：`--error` / `--offline`，`dotClasses` 仅返回状态 class 无 pulse）。PreviewPane.test.ts 中 defaultProps 将 syncState 固定为 "idle"，未覆盖任何其他状态从 PreviewPane 层面穿透到 SyncStateIndicator 的集成路径。
- **建议**: (1) 在 PreviewPane.test.ts 追加至少一个集成测试：`syncState="syncing"` 时 `data-testid="sync-dot"` 含 `sync-state-indicator--syncing` class；(2) 在 SyncStateIndicator.test.ts 补充 error/offline 两个状态的基础 class 测试。

---

### [R-003] LOW: `writeContent` 中 `iframeRef.value?.contentDocument` 可选链后无 `return` 注释，逻辑略隐晦

- **category**: structure
- **root_cause**: self-caused
- **描述**: `PreviewPane.vue` 第 31–32 行 `const doc = iframeRef.value?.contentDocument; if (!doc) return;`。此处在 iframe 未挂载时（`onMounted` 回调中 iframeRef 应已赋值，但 watch 回调若在 unmount 后触发则可能 null）静默忽略写入。silent guard 本身合理，但 `if (!doc) return` 在 watch 回调中若因竞态导致内容未写入时不会有任何提示，可能造成无声 bug。`onMounted` + `watch` 双写路径已有 `immediate: false` 保护，竞态概率低，但仍存在 edge case（如组件在 nextTick 前卸载）。
- **建议**: 可保持现状（当前实现对正常生命周期完全正确），MEDIUM 以下不强制修改；此为提示性记录。

---

## AC 覆盖核查

| AC | 测试文件 | 覆盖评估 |
|----|---------|---------|
| AC-001 (sandbox="" + CSP) | PreviewPane.test.ts describe AC-001，两用例 | 覆盖；sandbox 属性断言有效；CSP meta 查询断言有效 |
| AC-002 (htmlContent 写入，script 无执行) | PreviewPane.test.ts describe AC-002 | htmlContent 更新内容写入覆盖有效；XSS 阻断测试为假绿（见 R-001） |
| AC-003 (视口切换) | PreviewPane.test.ts describe AC-003，5 个用例 | 覆盖完整：375/768/auto width + 激活 class + button text + onViewportChange 回调均有效断言 |
| AC-004 (syncState syncing → color + pulse) | SyncStateIndicator.test.ts | SyncStateIndicator 内部逻辑覆盖（syncing/idle/connecting/synced/conflict），PreviewPane 集成层面未覆盖（见 R-002）；error/offline 状态缺失 |
| AC-005 (PreviewPane 在 EditorShell 挂载) | EditorShellWiring.test.ts | 覆盖：验证 right-panel 内含 data-testid=preview-pane，断言有效 |

---

## 结构与响应式正确性

- `onMounted` 写初始内容 + `watch({immediate: false})` 监听变化：响应式路径正确，无双重初始化。
- EditorShell.vue 右栏挂载 `<PreviewPane html-content="" sync-state="idle" />` 带 `wiring-placeholder` 注释，符合设计。已验证 EditorShell 其余逻辑（三栏/F11/抽屉/Splitter/TopBar）无回归修改。
- `SyncStateIndicator.vue` 实现干净，`dotClasses` computed 属性按状态返回对应 class 数组，逻辑清晰。

## Refactor 触发评估

三个 TDD_REFACTOR_TRIGGER 维度均未命中：
- complexity: 无高复杂度函数（最复杂为 `writeContent`，约 6 行）
- duplication: 无跨文件/函数重复
- coupling: 无模块间引用过密

不触发 refactorer。
