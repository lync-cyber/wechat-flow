---
id: "code-review-T-094-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-094"]
---

# CODE-REVIEW T-094 — 增量复审（revision diff）

Layer 1 delegated to hook（`matcher: Edit` → `lint_format.py` 已配置，编码阶段实时修复）

上轮报告：`docs/reviews/code/CODE-REVIEW-T-094-r1.md`

---

## 复审范围

仅审查 revision diff 涉及的文件：

- `apps/editor/src/composables/use-bidirectional-highlight.ts`
- `apps/editor/src/use-cases/render.ts`
- `apps/editor/src/composables/use-codemirror.ts`
- `apps/editor/src/components/editor/__tests__/PreviewPane.test.ts`
- `tests/editor/bidirectional-highlight-wiring.test.ts`
- `tests/editor/bidirectional-highlight.test.ts`

---

## 总体评估

**verdict: approved**

R-002 / R-003 / R-004 / R-005 全部有效修复，无 CRITICAL / HIGH / MEDIUM / LOW 新问题引入。

---

## 各问题复审结论

### R-001：pending arch M-001 amendment

**状态: 代码层已确认合理，挂起 arch M-001 文档层 amendment**

R-001 属于架构契约漂移记录缺失，已由 orchestrator 单独发起 arch amendment，不在本轮代码复审范围内。安全工程评估（`allow-same-origin` 无 `allow-scripts` + CSP `default-src 'none'` 两层防护）在 r1 中已确认合理，实现本身无须改动。

---

### R-002：fix confirmed — srcdoc 更新后 click 监听器重绑定

**状态: fixed**

**修复机制验证：**

`use-bidirectional-highlight.ts` 引入了 `bindClickHandler()` 私有函数，拆分"在当前 `contentDocument` 上注册点击监听"的逻辑。`attachPreviewClickListener` 执行两步操作：
1. 立即调用 `bindClickHandler()` 绑定当前 `contentDocument`；
2. 在 iframe 元素本身注册 `load` 事件（`loadHandler = () => { bindClickHandler(); }`），每次 srcdoc 刷新产生新 `contentDocument` 后重新绑定。

`detachPreviewClickListener` 修正句柄错位问题：先通过 `iframe.removeEventListener("load", loadHandler)` 撤销 load 监听（消除重绑定来源），再对**当前** `contentDocument` 调用 `removeEventListener("click", clickHandler)` 清理已绑定的点击处理器。两次 `null` 置空确保不重复 remove。

`onIframeLoad()` 作为 `load` 回调内部逻辑的公开镜像，供测试环境直接调用。

**测试覆盖验证：**

`tests/editor/bidirectional-highlight-wiring.test.ts` 新增 3 个 `describe` 块中的 3 个测试：
- `after simulated iframe reload, click on data-node-id element still triggers setCursorToLine`：通过动态 getter 模拟 `contentDocument` 切换（firstDoc → secondDoc），调用 `onIframeLoad()` 触发重绑，随后在 secondDoc 上触发点击事件，验证 `setCursorToLine(7)` 被调用。该测试**真正覆盖"内容更新→reload→新 document 上点击仍有效"**核心场景，而非仅测初次绑定。
- `iframe load event handler is registered on getIframe() element`：验证 `attachPreviewClickListener` 在 iframe 元素上注册了 `load` 事件。
- `detach removes load listener from iframe element and click listener from current contentDocument`：验证 detach 同时撤销 load 监听和 click 监听，句柄值一致。

AC-004 约束无破坏：全链路仍通过 `contentDocument.addEventListener` / `querySelector` / `classList`，无脚本注入。

---

### R-003：fix confirmed — 模块级有状态正则已消除

**状态: fixed**

`render.ts` 已将 `const NODE_ID_RE = /data-node-id="(\d+:\d+)"/g`（模块级有状态变量）完全移除，改用 `html.matchAll(/data-node-id="(\d+:\d+)"/g)`（第 23 行）。`String.prototype.matchAll` 每次调用生成新的迭代器，正则字面量不携带跨调用 `lastIndex`，消除了共享状态竞态隐患。`NODE_ID_RE.lastIndex = 0` 手动重置代码同步删除。修复彻底，无残留。

---

### R-004：fix confirmed — PreviewPane.test.ts 注释已更新

**状态: fixed**

第 69 行注释由原来的：
```
// 脚本原文在 srcdoc 中，但 sandbox="" 阻断执行 → 全局变量保持 undefined
```
更新为：
```
// 脚本原文在 srcdoc 中，但 sandbox="allow-same-origin" 无 allow-scripts，且 CSP default-src 'none' 阻断执行 → 全局变量保持 undefined
```
描述与实际机制（`allow-same-origin` 无 `allow-scripts` + CSP 组合阻断）一致。

关键保护性断言**完整保留**：
- `expect(sandboxVal).not.toContain("allow-scripts")` （第 25 行）
- `expect(srcdoc).toContain("default-src 'none'")` （第 36 行）
- CSP `style-src 'unsafe-inline'` 断言（第 37 行）

未弱化任何安全验证。

---

### R-005：fix confirmed — updateListener 已合并为单个

**状态: fixed**

`use-codemirror.ts` 中原本分两个 `EditorView.updateListener.of(...)` 的注册已合并为单个 listener（第 44–61 行），在同一回调内依次判断 `update.docChanged`（防抖触发 `onValueChange`）和 `update.selectionSet`（触发 `onSelectionChange`）。

**行为等价性验证：**
- `docChanged` 分支逻辑与合并前完全一致：防抖 timer 清理 + `PREVIEW_DEBOUNCE_MS` 延迟 + 回调调用。
- `selectionSet` 分支逻辑与合并前完全一致：`doc.lineAt(head).number` → `onSelectionChange(line)`。
- 两者为独立条件判断（`if (onValueChange && update.docChanged)` + `if (onSelectionChange && update.selectionSet)`），互不干扰。

整体写法规范，listener 数量从 2 降为 1，消除轻微冗余开销。

---

## 新引入问题检查

**结论：无**

逐条审查 revision diff，未发现：
- 逻辑回归（`bindClickHandler` 中 `removeEventListener` 在首次绑定前 `clickHandler` 为 `null` 时调用 remove 是 no-op，正确）；
- 测试假绿（r2 新测试的 `secondDoc.addEventListener.mock.calls[0][1]` 捕获的是真实重绑定后的点击处理器，并通过 `mockTarget.closest` 返回真实 mockElement 触发 `setCursorToLine`，非常量真值断言）；
- 未覆盖的边界（`getIframe()` 返回 `null` 时 `attachPreviewClickListener` 提前 return，`detachPreviewClickListener` 用可选链 `iframe?.removeEventListener` 防 null，与 r1 一致）；
- 命名或规范问题。

---

## 未审查维度（[previously-approved]）

以下维度在 r1 中已审查通过，revision diff 未涉及相关代码，不重复审查：

- **completeness**（AC-001/002/003/004 接线完整性）：[previously-approved, ref: CODE-REVIEW-T-094-r1]
- **security**（XSS 阻断、querySelector 注入、data-node-id 不进粘贴产物）：[previously-approved, ref: CODE-REVIEW-T-094-r1]
- **convention**（命名规范、文件结构）：[previously-approved, ref: CODE-REVIEW-T-094-r1]
- **structure**（模块职责划分、composable 接口）：[previously-approved, ref: CODE-REVIEW-T-094-r1]

---

## 最终结论

| 问题 | 复审结论 |
|------|---------|
| R-001 | pending arch M-001 amendment（代码层实现 r1 已确认合理） |
| R-002 | fixed |
| R-003 | fixed |
| R-004 | fixed |
| R-005 | fixed |
| 新问题 | 无 |

**verdict: approved**
