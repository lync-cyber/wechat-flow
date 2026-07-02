---
id: "code-review-t131-b1-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-131"]
---

# CODE-REVIEW: T-131 backlog 残差 B1 — 桌面侧栏文档列表 (P-002)

## 审查范围

- `apps/editor/src/components/panel/DocListPanel.vue`（新建）
- `apps/editor/src/components/panel/LeftPanelTabs.vue`（docs Tab 占位 stub → `DocListPanel` 接线）
- `apps/editor/src/components/panel/__tests__/DocListPanel.test.ts`（新建，6 用例）
- `apps/editor/src/components/panel/__tests__/LeftPanelTabs.test.ts`（末尾追加 2 条接线测试）

分支：`fix/t131-desktop-doc-list`。规范依据：`ui-spec-wechat-flow-p001-p005#§3.P-002`（桌面/平板 - 左侧面板「文档」Tab 内嵌小节）。

## Layer 1

`cataforge skill run code-review -- <4 files>` → **PASS**（0 errors / 0 warnings）。补充跑 `npx biome check` 同 4 文件 → clean。

## Layer 2 — AI 语义审查

### 测试执行验证
`pnpm --filter @wechat-flow/editor exec vitest run src/components/panel/__tests__/DocListPanel.test.ts src/components/panel/__tests__/LeftPanelTabs.test.ts` → 26/26 PASS（DocListPanel 6 + LeftPanelTabs 20，含新增 2 条接线用例）。

### AC 覆盖逐条核对

| AC | 规范要求 | 实现 | 测试 | 结论 |
|----|---------|------|------|------|
| AC-001 | 「+ 新建」40px 操作区跳 `/themes` | `.doc-list-panel__header` 固定 `height: 40px`，按钮全宽，`goToThemes()` → `router.push("/themes")` | 断言按钮存在 + 点击后 `mockRouterPush` 收到 `/themes` | 覆盖，断言绑定真实路由调用值 |
| AC-002 | populated 44px 列表项，标题 14px ellipsis + updatedAt 副标题 11px muted | `.doc-list-panel__item` `height: 44px`；`.doc-list-panel__item-title` 14px + `text-overflow: ellipsis`；`.doc-list-panel__item-subtitle` 11px `--color-text-muted` | 断言渲染 N 个 item、标题文本命中、副标题非空且两条不同 | 覆盖；副标题断言未校验具体日期格式（见 LOW-001），但已规避 locale/timezone 脆性 |
| AC-003 | 当前文档激活态：2px brand 左竖条 + `--color-brand-subtle` 背景 + brand 文字 | `--active` 修饰符：`border-left: 2px solid var(--color-brand)` + `background: var(--color-brand-subtle)` + 标题 `color: var(--color-brand)` | 断言 `currentDocId` 匹配项带 `--active` class、其余不带 | 覆盖，class 存在性断言绑定真实条件渲染逻辑（`doc.id === store.currentDocId`） |
| AC-004 | loading 3 条 skeleton（70%/50% 交替），pulse 动画 | `v-for="(width, i) in ['70%','50%','70%']"` + `@keyframes doc-list-panel-pulse` infinite | 断言 pending 时 3 条 skeleton 存在，resolve 后消失（用手控 Promise 而非 fake timer，规避竞态） | 覆盖；宽度序列为 70/50/70（非规范字面"交替"精确复现 50/70/50 或任意组合，但满足"70%/50% 交替"语义） |
| AC-005 | empty「还没有文档」+「创建第一篇」跳 `/themes` | 文案 + `data-testid="doc-list-create-first"` 链接 `@click.prevent="goToThemes"` | 断言文案命中 + 点击后 `mockRouterPush` 收到 `/themes` | 覆盖 |
| AC-006 | 点击项跳 `/docs/${id}` | `openDoc(id)` → `router.push(\`/docs/${id}\`)` | 断言点击非当前项后 `mockRouterPush` 收到 `/docs/doc-2` | 覆盖；未覆盖点击**当前已激活项**是否重复导航（见 LOW-002） |

**接线验证（LeftPanelTabs.vue）**：占位 `<div data-testid="docs-content">文档</div>` 已被 `<DocListPanel />` 替换，`.left-panel-tabs__docs-placeholder` 样式块同步移除（无死样式残留）。新增 2 条测试显式断言 `docs-content` 不再存在 + 真实 `DocListPanel` 内容（新建按钮 / 文档项 / empty 文案）渲染 — 断言方向正确，防止"组件存在但未挂载"的假绿。

### completeness

- 规范 P-002 桌面态提及"右侧三点菜单（hover 时出现，触发 UC-010）"未实现。核对 CLAUDE.md §待办 T-131 残差 B1 范围声明（"新建 / 列表项 44px / 当前文档 2px brand 指示条 / loading·empty·populated 三态"），三点菜单不在本次 backlog 显式范围内，且移动端 `DocumentListSheet.vue` 同样未实现该菜单（一致性对齐）。**判定为已知范围边界，非本任务缺陷**，登记为 informational 供后续 UC-010 接线任务追踪。
- 三态（loading/empty/populated）+ 新建操作区 + 激活指示 4 项范围声明的交付点全部落地，无空壳。

### test-quality

- 断言强度: 6 条 DocListPanel 用例 + 2 条 LeftPanelTabs 接线用例均绑定真实可观测状态（DOM 存在性 + class + 路由 mock 调用参数），无仅校验 mock 调用次数的弱断言。
- AC-004 loading→resolved 转换测试用手控 `Promise` 精确控制 pending/resolved 时序，规避 fake-timer 类测试的常见时序假象。
- AC-002/003/006 均用两条不同 `updatedAt`/`id` 的 fixture 文档，避免"渲染了某个东西就算过"的单文档退化断言。

### [R-001] LOW: `listDocuments()` reject 路径无错误处理、无测试覆盖
- **category**: error-handling
- **root_cause**: upstream-caused
- **描述**: `DocListPanel.vue` `onMounted` 对 `listDocuments()` 仅用 `try/finally` 控制 `isLoading`，无 `catch`。`listDocuments()` 内部 `getDb()` 依赖 `indexedDB.open()`，在隐私模式 / 存储配额耗尽 / 浏览器禁用 IndexedDB 场景会 reject；此时 Promise 拒绝导致未捕获异常（Vue 会打印警告但不阻断渲染），`isLoading` 因 `finally` 正确置 `false`，但 `docs.value` 保持初始空数组 —— UI 会静默呈现为 `empty` 态「还没有文档」而非任何错误提示，用户误判为"库中确无文档"。ui-spec P-002 状态流表仅定义 `loading/empty/populated` 三态，未定义 `error` 态，故规范本身未要求错误态视觉——本问题的根因是上游 spec 未覆盖此分支，而非实现遗漏 spec 已声明的行为。核对同类组件 `DocumentListSheet.vue`（移动端）同样无 reject 处理，确认这是既有模式的延续而非本次引入的新缺陷，且未在 backlog scope 声明中列出。
- **建议**: 后续会话在 ui-spec P-002 补 `error` 状态视觉定义（如复用 `Toast` 组件提示"加载文档列表失败"），或至少在 `DocListPanel.vue` / `DocumentListSheet.vue` 加 `catch` 记录诊断日志，避免 reject 与 empty 态视觉混淆。不阻塞本次交付（跟随既有模式、spec 未覆盖）。

### [R-002] LOW: AC-006 未覆盖点击当前已激活文档项的行为
- **描述**: 测试仅验证点击**非当前**文档项触发 `/docs/${id}` 导航；未覆盖点击**已激活**项（`doc.id === store.currentDocId`）是否重复触发 `router.push` 到同一路由。实现上 `openDoc` 无条件调用，行为合理（vue-router 对同路由 push 默认 no-op），但缺少显式测试记录这一边界预期。
- **category**: test-quality
- **root_cause**: self-caused
- **建议**: 补一条测试断言点击当前激活项仍调用 `router.push` 到自身 id（幂等验证），或显式记录"允许重复导航"为预期行为。不阻塞交付。

### [R-003] LOW: `formatUpdatedAt` 用 `toLocaleString()` 产出完整日期时间字符串，与紧凑 44px 列表项设计意图存在潜在冲突
- **描述**: ui-spec 仅要求副标题展示"最后修改时间"，未规定具体格式。`toLocaleString()`（如 `2026/7/2 12:00:00`）在窄栏（200~320px）+ 11px 字号 + `ellipsis` 截断场景下可能被截断到不可读，弱于相对时间格式（如"3 分钟前" / "昨天"）的信息密度。
- **category**: convention
- **root_cause**: reviewer-calibration
- **建议**: 非阻塞性建议，可在后续视觉走查中评估是否需要相对时间格式化；当前实现符合 spec 字面要求（"最后修改时间"），不构成缺陷。

## 结论

Layer 1 PASS，Layer 2 未发现 CRITICAL/HIGH。6 条 AC 全部有对应测试且断言绑定真实可观测状态（DOM/class/路由调用参数），无 mock-stub 全替换导致的假绿。LeftPanelTabs 接线验证到位（占位 stub 移除 + 真实内容渲染断言）。三点菜单（UC-010）缺失经核对 backlog scope 声明确认为已知范围边界，非本任务缺陷。仅 3 项 LOW（1 项 upstream-caused 错误处理缺口延续既有模式、1 项测试边界补充建议、1 项非阻塞格式建议）。

**Verdict: approved_with_notes**
