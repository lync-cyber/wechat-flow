---
id: "code-review-T-094-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-094"]
---

# CODE-REVIEW T-094 — 源码 ↔ 预览双向高亮联动

Layer 1 delegated to hook（`matcher: Edit` → `lint_format.py` 已配置，编码阶段实时修复）

---

## 总体评估

**verdict: approved_with_notes**

无 CRITICAL / HIGH 问题。发现 3 个 MEDIUM 问题、2 个 LOW 问题。

---

## 问题列表

### [R-001] MEDIUM: `sandbox="allow-same-origin"` 与 arch M-001 `sandbox=""` 存在已知契约偏离，缺少正式文档记录

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `arch-wechat-flow-modules#§2.M-001` 和 `arch-wechat-flow#§5.3` 明文规定 `sandbox=""` 空属性（Q3.8 "完全禁 JS"），当前实现改为 `sandbox="allow-same-origin"`。此变更是 AC-004 （主线程 contentDocument 联动）的物理必要条件（`sandbox=""` 下 iframe origin 为 opaque，`contentDocument` 不可访问），但 arch 原文与当前实现已不一致，任何读到 arch M-001 的后续子代理/开发者都会产生误解。

  **安全工程评估**：`allow-same-origin` 不含 `allow-scripts`，结合 CSP `default-src 'none'`（无 `script-src` 声明），形成"两层禁脚本"组合。浏览器行为：`allow-same-origin` 给 iframe 同源身份从而让父页面可访问 `contentDocument`，但本身不授予脚本执行权；无 `script-src` 的 CSP 会阻断任何脚本加载与行内脚本。这是合理的安全工程解，未引入额外脚本执行风险。

  **问题核心不是安全风险，而是架构契约漂移未记录**：arch 文档成为错误参考。真实沙盒 XSS 阻断仍需 T-058 Playwright E2E（happy-dom 无法验证浏览器 sandbox 语义，已知）。

- **建议**: 在 arch `arch-wechat-flow#§5.3 预览 iframe 沙箱` 和 `arch-wechat-flow-modules#§2.M-001` 补一行说明：`allow-same-origin` 是联动功能（F-001 AC-004）的必要条件，`allow-scripts` 仍被禁用，两层防护（sandbox + CSP `default-src 'none'`）共同构成"禁脚本"保证。同步更新 Q3.8 决策记录。可作为 arch amendment 或 inline 注记处理，不需要撤回当前实现。

---

### [R-002] MEDIUM: `srcdoc` 每次更新后 click 监听器绑定失效，`detachPreviewClickListener` 无法正确清理旧 document 上的监听器

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `useBidirectionalHighlight.attachPreviewClickListener` 在 `onMounted` 时绑定 `clickHandler` 到 `iframe.contentDocument`。但每当 `editorStore.previewHtml` 变更，PreviewPane 的 `srcdoc` computed 属性重新赋值，浏览器用全新 `Document` 替换 `contentDocument`。旧 document 上注册的 clickHandler 不再生效，新 document 无监听器——即每次内容更新后 AC-001（点击预览→源码光标）联动静默失效，直到下一次手动 re-attach。

  此外，`detachPreviewClickListener` 在 `onUnmounted` 时读取的是当前（已是最新）的 `contentDocument`，而 `removeEventListener` 的目标 document 与当初 `addEventListener` 的 document 不同，因此 `remove` 实际上无操作，旧 document 上的引用靠 GC 自然回收（不会泄漏到 DOM，但行为不正确）。

  测试层面：wiring 测试只验证初次 attach/detach，未覆盖"srcdoc 更新后 click 仍可用"场景，因此 170 个测试全绿但问题潜伏。

- **建议**: 在 `useBidirectionalHighlight` 中将 `attachPreviewClickListener` / `detachPreviewClickListener` 改为在每次内容更新时重新绑定，或在 EditorShell 中监听 `previewHtml` 变更后重新调用 attach（`watch(editorStore.previewHtml, () => { detachPreviewClickListener(); attachPreviewClickListener(); })`），或改用 `load` 事件（`iframe.addEventListener('load', onLoad)`）在每次 document 刷新时重新绑定 `contentDocument` 监听器。

---

### [R-003] MEDIUM: `NODE_ID_RE` 正则是模块级有状态变量，`extractNodeLocations` 的 `lastIndex` 重置靠调用约定，有并发安全隐患

- **category**: structure
- **root_cause**: self-caused
- **描述**: `apps/editor/src/use-cases/render.ts` 第 21 行：

  ```ts
  const NODE_ID_RE = /data-node-id="(\d+:\d+)"/g;
  ```

  全局正则带 `/g` 标志时携带 `lastIndex` 状态。当前代码在 `extractNodeLocations` 内手动 `NODE_ID_RE.lastIndex = 0` 重置，此方式在单线程 JS 中通常安全，但：(1) 如果未来代码路径在同一 tick 内多次并行进入（例如 Vue `watch` + 某个 async race），重置与读取之间存在竞态；(2) 把有状态对象暴露为模块级变量属于隐式耦合，后续调用者若直接 `exec` 而不重置会得到错误结果。

- **建议**: 将正则移入函数体，或去掉 `/g` 标志改用 `matchAll`（`html.matchAll(/data-node-id="(\d+:\d+)"/g)`），后者每次调用返回新迭代器，不共享 `lastIndex`。

---

### [R-004] LOW: `PreviewPane.test.ts` 第 69 行注释仍写 `sandbox=""`，与实际值 `allow-same-origin` 不符

- **category**: convention
- **root_cause**: self-caused
- **描述**: 测试文件 `apps/editor/src/components/editor/__tests__/PreviewPane.test.ts` 第 69 行注释：

  ```
  // 脚本原文在 srcdoc 中，但 sandbox="" 阻断执行 → 全局变量保持 undefined
  ```

  当前实现 `sandbox="allow-same-origin"` 而非 `sandbox=""`，注释描述的技术机制不准确（`sandbox=""` 是通过零特权完全阻断，而当前是 `allow-same-origin` + CSP `default-src 'none'` 组合阻断）。注释与代码不一致会误导后续维护者。

- **建议**: 将注释更新为当前实际机制：`sandbox="allow-same-origin"` 无 `allow-scripts`，且 CSP `default-src 'none'` 阻断脚本执行。

---

### [R-005] LOW: `use-codemirror.ts` 中 `onValueChange` 和 `onSelectionChange` 均注册 `EditorView.updateListener`，两个独立 listener 每次 update 各触发一次，轻微性能开销

- **category**: performance
- **root_cause**: self-caused
- **描述**: `use-codemirror.ts` 中当两个回调都提供时会注册两个 `EditorView.updateListener.of(...)`。CodeMirror 每次 update（包括光标移动、文档变更）都会触发两个 listener。对于高频的 selectionChange，值变更 listener 会做一次额外的 `update.docChanged` 判断后返回 false，但仍占一次 listener 调用。

  这在当前规模下不构成问题，属于轻微冗余开销。

- **建议**: 可将两者合并为单个 `updateListener` 处理 `docChanged` 和 `selectionSet`，减少 listener 数量。但鉴于对当前用户场景（单文档编辑器）无可感知影响，此优化可延后至重构任务处理。

---

## 安全维度补充说明（不计入问题数）

以下是针对 task prompt 明确要求的安全维度的完整评估：

**1. `allow-same-origin` + CSP `default-src 'none'` 组合能否阻断脚本执行？**

结论：**可以**。机制：`allow-same-origin` 仅授予 iframe 同源身份，不含 `allow-scripts` 意味着浏览器不为 iframe 创建脚本执行环境；CSP `default-src 'none'` 作为 defense-in-depth 层，即使 sandbox 配置意外放松，CSP 也会阻断任何脚本源。两层组合在技术上等价于"父页面可读 DOM，但 iframe 内绝无脚本执行"。真实 sandbox 行为仍需 T-058 Playwright E2E 验证（happy-dom 不实现 sandbox 语义）。

**2. `style-src 'unsafe-inline'` 是否引入风险？**

`unsafe-inline` 对 style 的放开是 inline-styled HTML 的必要条件（产品核心功能）。无 `allow-scripts`，style 属性本身无法执行脚本（除 `expression()`，但该 vector 只在 IE 中生效，现代浏览器不支持）。CSS `url()` 可能加载外部资源，但 `img-src https: data:` 仅允许 HTTPS 图片和 data URI，`font-src https: data:` 类同，无额外泄露路径。

**3. `img-src data:` / `font-src data:` 是否引入风险？**

`data:` URI 在 img/font 上下文中允许内联图片和字体，这是排版工具的正常需求。data URI 不能用于 script-src（CSP 分别管控各 directive），不构成脚本执行 vector。

**4. `data-node-id` 属性是否泄漏到粘贴产物？**

`render.ts` 中 `injectNodeIds` 只在 `options?.injectNodeIds === true` 时注入。`editor.ts` 中 `updatePreview` 传 `injectNodeIds: true`，但这仅用于预览路径。`composeRender` 默认 `injectNodeIds` 为 `undefined`（不传），其他调用路径（copy/export/MCP `render_markdown`）不传此参数，故 `data-node-id` 不会进入粘贴产物。通过测试 "html does NOT contain data-node-id attributes when injectNodeIds is omitted" 验证。

**5. `querySelector` 注入风险？**

`nodeId` 来源链：`injectNodeIds` 注入 `${sourceLine}:${idx}`（两个整数）→ `extractNodeLocations` 正则 `/data-node-id="(\d+:\d+)"/g` 提取（只含 `\d:` 字符）→ `findNodeIdForLine` 返回 → `querySelector('[data-node-id="${nodeId}"]')`。全链路仅含数字和冒号，无法构造 CSS 注入向量。安全。

**6. 无脚本注入路径验证**

`use-bidirectional-highlight.ts` 中所有 iframe 交互通过 `contentDocument.addEventListener` / `querySelector` / `classList` 完成，无 `innerHTML` / `insertAdjacentHTML` / `createElement('script')` / `postMessage` / `contentWindow` 调用。AC-004 在代码结构上满足。

---

## 接线完整性

- AC-001（预览点击→源码光标）：`useBidirectionalHighlight.attachPreviewClickListener` → `clickHandler` → `setCursorToLine` → EditorShell 中的 `view.dispatch({ selection: { anchor: pos }, scrollIntoView: true })`。链路完整，但存在 R-002 描述的 srcdoc 更新后监听器失效问题。
- AC-002（源码光标→预览高亮）：`SourcePane.onSelectionChange` → `EditorShell.onSourceSelectionChange` → `highlightPreviewNode(editorStore.nodeLocations, cursorLine)` → `doc.querySelector` / `classList.add('cm-highlighted')`。链路完整，200ms 淡出由 `setTimeout` 实现。
- AC-003（data-node-id 注入）：`renderMarkdown({ injectNodeIds: true })` → `injectNodeIds(hast)` → serialize。链路完整。
- AC-004（仅 contentDocument，无脚本注入）：见安全维度说明第 6 点，满足。

---

## 测试质量小结

- 17 个 existing 测试 + 12 个 wiring 测试断言质量整体合格：覆盖了 data-node-id 格式、有/无位置数据、不注入 inline 元素、正向/反向光标映射、attach/detach 回调验证等。
- happy-dom 边界已诚实标注（5 处明确注释 "T-058 Playwright E2E 层覆盖"）。
- `not.toContain("allow-scripts")` 和 CSP `default-src 'none'` 断言均存在，未被弱化（PreviewPane.test.ts 第 24-26 行，第 35-38 行）。
- 未覆盖 R-002 所描述的"srcdoc 更新后 click 监听器重新绑定"场景。

