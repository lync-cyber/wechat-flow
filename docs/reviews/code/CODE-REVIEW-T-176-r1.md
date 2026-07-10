---
id: "code-review-T-176-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-176"]
consumers: ["orchestrator", "tdd-engine"]
---

# CODE-REVIEW-T-176-r1: 槽位 typography 下推

Layer 1 delegated to hook（`.claude/settings.json` PostToolUse `Edit|Write` 已配置 `lint_format.py`，编码期实时 fix）。本报告为 Layer 2 AI 语义审查，standard 模式，task_kind=fix，不短路。

## 审查范围

- `packages/core/src/pipeline/inline-style.ts`（核心实现，diff 见 git diff）
- `tests/core/pipeline/slot-typography-cascade.test.ts`（新增，10 测试）
- `tests/core/blocks/dialog-chat-bubbles.test.ts`（helper 精化 1 处）

## 复核方法

- 静态阅读 diff 全文 + 追踪 `AmbientBlockContext` / `INHERITABLE_PROPS` / `extractInheritedStyle` / `getBlockSlotStyle` 完整调用链
- 手工推导 dialog chat-bubbles 两层嵌套槽位（cell → bubble → 内层 `<p>`）与 steps card（title/description）的合并结果，逐条与新增测试断言比对
- 用一次性 node 脚本实跑 `renderMarkdown` 验证关键 token 解析路径（`--font-size-sm` 13px → 输出 14px，确认由既有 min-font-size 输出阶段 clamp 规则而非本次改动引入）
- 复跑 `pnpm biome check` 对 3 个改动文件（Checked 3 files，无新增 fix）与 `packages/core` 独立 `tsc --noEmit`（exit 0）
- 复跑新增测试文件（10/10 passed）+ 全部既有 slot 相关回归套件（`dialog-chat-bubbles` 17、`inline-style-layered` 8、`typography-cascade` 7、`theme-blocks-migration-invariance` 5、`tests/core/blocks/` 全目录 256 测试）确认零回归
- 核对 `INHERITABLE_PROPS` 涉及属性（`text-align`/`font-family`/`letter-spacing`）均在 `css-property-whitelist.ts` 白名单内，不会被输出阶段过滤丢弃

## 逐 AC 核实结论

- **AC-001**：己方/对方气泡内 `<p>` 计算 `color` 确认来自槽位链下推（`bodyBaseline ⊕ blockInherited({}) ⊕ slotStyle(bubble)`，slotStyle 的 `color` 覆盖 bodyBaseline 的全局 p 色）；`distinctPrimaryTheme` 用非巧合色值有效证明真实下推而非默认色巧合相等。`text-align` 保持 `left`（不被 `cell-right` 的 `text-align:right` 污染）机制正确：`childAmbientBlock.slotInherited` 在每层槽位重置为该槽位自身 `extractInheritedStyle(slotStyle)`，丢弃祖先槽位（cell）的布局属性，仅经 `blockInherited`（容器 root，此处为空）向下传递。手工推导与测试断言完全吻合，cross-theme（literary）用例同样验证。
- **AC-002**：title/description 计算 `line-height` 与同文档段落一致（default 1.85 / literary 2），源头为 `inlineStyle()` 入口从 `tokens.p?.default` 动态提取的 `bodyBaseline`，而非硬编码；description 自身 `font-size`/`color` 声明优先级正确保留（slotStyle 在合并链最后展开）。`font-size: 14px` 断言经实测确认来自既有输出阶段 min-font-size 下限 clamp（`--font-size-sm` 主题声明值 13px），非本次改动引入的偏差，属既有机制与新增机制的正确叠加。
- **AC-003**：`INHERITABLE_PROPS` + `extractInheritedStyle` 单一定义被容器路径与槽位路径共用，无 slot 特化散点分支；无槽位场景字节级不变通过复用既有 `AC-T120-002` 回归基线 SHA（`a6dadcd254...`，5 主题基线定义于 `inline-style-layered.test.ts`，本次未改动且全部保持通过）间接锁定，新增测试对 default 主题做了直接复算校验。容器 root 路径本身合并公式（`resolveSlotDeclarations({...l1,...l2})`）未变，不受 `bodyBaseline` 注入影响，与既有行为保持同构。
- **AC-004**：四门禁复核结果与提交方描述一致（vitest/typecheck/biome 复跑通过）；cross-runtime 未重跑基于「fixtures.ts 仅含 callout 默认变体、无槽位路径触达」的判断，经查该 fixture 确实不含任何 `data-block-slot` 结构，判断成立，golden SHA 未变依据可信。

## 边界核实

- `quote` 大引号变体 `quote-mark` 槽位 `line-height:0.6`（低于 1.2 可读性下限）正确通过 `slotLineHeightExempt` 豁免、未被行高链覆写，标记逻辑改为读取 `merged["line-height"]`（原为 `slotStyle["line-height"]`）后手工验证该槽位场景计算结果不变（自身声明始终在合并链最后，未受影响）。

## 发现问题

### [R-001] LOW: slotLineHeightExempt 判据源从"槽位自身声明"隐性扩大为"槽位合并后计算值"，缺配套回归测试锚定新语义边界
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `isBelowLineHeightFloor` 的输入从 `slotStyle["line-height"]`（仅槽位自身声明）改为 `merged["line-height"]`（`bodyBaseline ⊕ blockInherited ⊕ slotStyle` 合并后计算值，inline-style.ts:208）。当前代码库中唯一低于 1.2 的行高声明（quote large-quote-mark 的 quote-mark 槽位）恰好由槽位自身声明，两种判据在现状下等价，因此该变化未被任何测试用例区分验证。若未来出现"槽位自身不声明 line-height，但 blockInherited/bodyBaseline 侧携带低于 1.2 的值"的场景（理论上可能，例如某容器 root 声明了一个低行高的可继承属性），豁免语义会静默变化而无测试锚定，行为回归时不会被发现。
- **建议**: 补一条边界测试用最小构造（自定义 BlockStyleTable 或 mock block 使 blockInherited 携带 line-height < 1.2、槽位自身不声明 line-height）显式锁定"合并后计算值"判据的预期行为，或在函数旁补注释说明该扩大是有意为之（与"效果导向豁免"设计一致），避免后续重构误判为可回退的实现细节。

### [R-002] LOW: bodyBaseline 静默退化为空对象缺失覆盖
- **category**: completeness
- **root_cause**: self-caused
- **描述**: `inlineStyle()` 入口 `bodyBaseline = extractInheritedStyle(resolveSlotDeclarations(tokens.p?.default ?? {}, designTokens))`（inline-style.ts:349-351）。当调用方传入的 `themeTokens` 不含 `p.default`（例如直接调用 `inlineStyle()` 而非经由 `render.ts` 走主题注册表、或自定义 `BlockStyleTable` 遗漏 `p` 键）时，`bodyBaseline` 静默退化为 `{}`，槽位内容将完全失去正文基线注入（回退到 T-176 之前"仅槽位自身声明"的行为），无诊断信息、无测试覆盖此路径。
- **建议**: 补一条测试断言"themeTokens 不含 p.default 时槽位仍能优雅渲染（无崩溃，仅缺失基线注入）"，或在 `BlockStyleTable` 类型契约层面强制 `p.default` 必填以杜绝此退化路径的可能性；二选一即可，当前仅为潜在盲点记录，不影响本任务卡验收范围内的实际调用路径（`render.ts` 恒经主题注册表传入完整 `p.default`）。

## Verdict

**approved_with_notes**

0 个 CRITICAL / HIGH；2 个 LOW（R-001 / R-002），均为非阻塞的测试覆盖盲点建议，不影响 AC-001~AC-004 的当前正确性判定。四项 AC 逐条复核通过，机制同构、优先级合并顺序、边界豁免均验证无误，全部相关回归套件（新增 10 + 既有 286+ slot 相关测试）复跑零失败，biome/tsc 复核通过。

### 收口闭合（同批）

- R-001 已闭合：新增边界测试「豁免判据取合并后计算值」——自定义 theme 令 `blocks.steps.card` 声明 `line-height: 0.9`（槽位自身不声明），断言 title/description 槽位继承后的 0.9 越过 output 相 `clamp-line-height` 存活且非被抬至下限 1.2，以可观测效果锁定判据源为「合并计算值」而非「槽位自声明」（瞬态 `data-lh-exempt` 标记由 clamp 规则消费后剥除，故断言存活值而非标记）。
- R-002 已闭合：新增边界测试「themeTokens 缺 p.default 时 bodyBaseline 退化」——剔除 `blocks.p` 的 theme 下断言己方气泡 `<p>` 仍带槽位声明色 `#fafaf9` 且不再获正文基线 `line-height: 1.85` 注入，锚定优雅退化路径（不崩溃、仅缺基线注入、槽位自声明存活）。

闭合后 `tests/core/pipeline/slot-typography-cascade.test.ts` 计 12 测试全绿；`tests/tsconfig.json` tsc exit 0、biome clean。
