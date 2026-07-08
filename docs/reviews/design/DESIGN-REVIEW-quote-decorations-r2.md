---
id: "design-review-quote-decorations-r2"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-174"]
consumers: ["orchestrator"]
---

# 设计一致性复审 — 四个装饰变体（T-168 AC-006 / T-174 AC-004）

## 审查方式

本轮为 r1 的复审，核验 T-174 是否消除 r1 [R-001] HIGH（装饰色值/字体跨主题渲染不生效）。方法沿用 r1：scratchpad 独立脚本 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`registerTheme`，显式 `registerTheme` 注册 `default`/`literary`/`tech` 三个主题包的 default export（`ThemeDefinition`），用 `npx tsx` 执行取得四个装饰变体在三个主题下的最终 inline-styled HTML。脚本：`r2-render-verify.ts`（scratchpad，任务结束后删除）。

补充实证：`tests/core/theme/slot-token-resolution.test.ts`（T-174 新增，23 个测试）实际运行验证——`npx vitest run tests/core/theme/slot-token-resolution.test.ts` → **23 passed**。该测试套件断言渲染值等于**各主题 `tokens.ts` 实值**（非字符串字面量/非仅存在性），是本轮复审的关键佐证。

## 一、pull-quote decorated（引号进首段行首 + 居中署名）

**跨主题渲染实证**：

| 主题 | quote-mark `color` | author `color` |
|------|--------------------|-----------------|
| default | `#2D5A4E` | `#78716C` |
| literary | `#7B4F2E` | `#8A7050` |
| tech | `#58A6FF` | `#6E7681` |

三主题渲染值与各自 `packages/themes/{theme}/src/tokens.ts` 的 `--color-brand` / `--color-text-muted` 逐一比对，**完全一致**；三主题互不相同（非恒等硬编码残留）。root 容器非色值布局声明（`text-align:center`/`padding:24px 16px`/`margin:24px 0`/`font-size:1.25em`）跨三主题字节级不变，符合 §10.3（这些声明本非装饰色值，不应随主题变化）。渲染 HTML 中无 `var(--...)` 占位语法残留（微信契约要求的字面值 inline 样式满足）。

**结构性 AC 无回归**：`<span>` 仍为 `<p>` 首个子节点、署名 `—— 鲁迅` 前缀完整，三主题下均保持——T-168 AC-001/AC-004 未受 T-174 改动影响。

**样张对照**：default 主题下渲染值（`#2D5A4E`/`#78716C`）与 r1 记录字节级相同（default 主题 token 值本就等于此前硬编码值），r1 已完成的样张逐像素比对结论继续有效，无需重复截图。

**结论**：R-001 涉及本变体的部分已消除。

## 二、quote large-quote-mark（大引号同行 + 无边框）

**跨主题渲染实证**（`quote-mark` span `color`）：default `#2D5A4E` / literary `#7B4F2E` / tech `#58A6FF`，与各主题 `--color-brand` 完全一致。root 容器跨三主题均不含 `border-left`（AC-002 无回归）。

**quote root 基线色 `#555`**：跨 default/literary/tech 三主题渲染**仍字节级相同**（`packages/blocks/src/blocks/quote.ts` 的 `large-quote-mark`/`dropcap` 两变体 `baseStyle.root.color` 仍为字面量 `#555`，未接入 token；5 个主题包 `blocks/quote.ts` 均未注册 `quote` 容器键的 L2 覆盖）。此项为任务交底中**已登记范围外事项**（§10.5 未指明 token 映射且 default 主题无对应值 token，映射歧义已上抛 ui-designer 裁定），本轮实测复核确认现状与登记描述一致，非本轮新发现独立缺陷，见问题列表 R-004（记录性，不计入 verdict）。

**quote-mark font-family 未锁定（r1 R-002）**：复核 `large-quote-mark` 变体 `baseStyle["quote-mark"]` 声明仍只含 `font-size`/`color`/`opacity`/`line-height`/`display`/`vertical-align`/`margin-right`，无 `font-family`——T-174 范围明确只覆盖 quote-mark/dropcap 首字色 + dropcap 字体 + pull-quote 署名色，未包含 quote-mark 自身字体，故此项**未被** T-174 触及，符合预期不算回归。状态持续，仍 LOW，见 R-002（沿用 r1 判定）。

**结论**：R-001 涉及本变体的装饰色部分已消除；root 基线色与 quote-mark 字体两项均为已知登记项/范围外事项，非新阻塞。

## 三、quote dropcap（首字下沉 table 双格悬挂）

**跨主题渲染实证**（`dropcap` cell）：

| 主题 | `color` | `font-family` |
|------|---------|----------------|
| default | `#2D5A4E` | `'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif` |
| literary | `#7B4F2E` | `'Source Han Serif CN', 'Noto Serif CJK SC', 'SimSun', '宋体', Georgia, serif` |
| tech | `#58A6FF` | `'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, 'PingFang SC', sans-serif` |

与各主题 `tokens.ts` 的 `--color-brand` / `--font-family-heading` 逐一核对，**完全一致**。`line-height:1`（T-157 曾报告缺失项）三主题下均保留。`display:table`/`table-cell` 结构、`width:1%`/`white-space:nowrap`/`vertical-align:top`/`padding-right:8px` 等布局声明跨主题不变（本非装饰色值/字体，符合预期）。

**样张对照**：`content-elements-dropcap.png`（T-140 产出，5 主题色值对照表）明文标注 `default #2D5A4E`/`literary #7B4F2E`/`tech #58A6FF`，均标注消费 `--color-brand`/`--font-family-heading`；本轮三主题实测色值与样张标注**逐一比对完全吻合**。样张对 tech 面板标注"不建议启用——工程化调性不符"，此为 UI 层"是否在 InsertDrawer 推荐该变体"的产品判断，不影响渲染管线本身必须正确响应 markdown 源码/复制粘贴触发的场景，两者不矛盾。

**结论**：R-001 涉及本变体的部分**完全消除**，且与样张色值表逐项吻合。

## 四、paragraph dropcap（段落首字下沉，同 table 双格悬挂技法）

**跨主题渲染实证**（`dropcap` cell）：色值/字体与「三、quote dropcap」表格完全一致（default `#2D5A4E`/`'LXGW WenKai'...`，literary `#7B4F2E`/`'Source Han Serif CN'...`，tech `#58A6FF`/`'SF Pro Display'...`），与各主题 token 值逐一核对一致。`decorate-utils.ts` 的 `injectDropcapMutation` 仍为 quote.ts/paragraph.ts 共用同一实现（同源，非分叉）。

正文 `<p>` 自身颜色不受 dropcap 装饰影响（`paragraph` block 无 root baseStyle，符合 r1 R-003 记录的设计意图，本轮复核结论不变）。

**结论**：R-001 涉及本变体的部分完全消除。

## 新发现（本轮，非 R-001 范围）

在核对 quote/paragraph dropcap 跨主题 `<p>` 正文标签（非 dropcap slot 本身）字体声明时，观察到 literary 主题下 `<p>` 标签的渲染字体族为 `'Source Han Serif CN', 'Noto Serif CJK SC', 'SimSun', Georgia, serif`（缺 `'宋体'`），而 dropcap slot 消费的 `literaryTokens["--font-family-heading"]` 为 `'Source Han Serif CN', 'Noto Serif CJK SC', 'SimSun', '宋体', Georgia, serif`（含 `'宋体'`）。核实 `packages/themes/literary/src/blocks/paragraph.ts` 第 6 行，其 `p` 标签的 `font-family` 为独立字面量声明，与同包 `tokens.ts` 的 `--font-family-heading`/`--font-family-body` 字符串轻微不同步（少一个字体名）。此路径（`themeTokens[tagName]` 标签级 L1 默认值）与 T-174 改动的 slot 装饰路径（`getBlockSlotStyle` + `resolveTokenPlaceholder`）完全独立，非 T-174 引入、也非 R-001 范围内——记为 R-005（LOW，供后续主题包维护参考，不影响本轮 verdict）。

## 问题列表

### [R-001] 状态：resolved（原 HIGH）

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: r1 报告的装饰色值/字体跨主题渲染不生效问题（`quote-mark`/`dropcap`/`author` 三个 slot 涉及的颜色与字体在 `baseStyle` L1 硬编码、跨主题字节级相同）已通过 T-174 消除。`packages/blocks/src/blocks/{quote,pull-quote,paragraph}.ts` 的 `quote-mark`/`dropcap`/`author` 三个 slot 声明改为 `var(--color-brand)` / `var(--font-family-heading)` / `var(--color-text-muted)` 占位语法；`packages/core/src/pipeline/inline-style.ts` 新增 `resolveTokenPlaceholder()` + `FALLBACK_SLOT_TOKENS`，`getBlockSlotStyle()` 经 `effectiveTheme.tokens`（`render.ts` 第 78 行经 `inlineStyle(hast, themeTokens, effectiveTheme?.tokens)` 传入）解析出各主题实际 token 值。本轮 default/literary/tech 三主题 × 四变体共 12 组渲染实证（HTML 直接核对）+ `slot-token-resolution.test.ts` 23 个断言测试（实跑 PASS）双重验证：渲染值与各主题 `tokens.ts` 权威值逐一比对完全一致，三主题间互不相同，且最终 HTML 无 `var(--...)` 残留。tech 深色主题下装饰对比度问题一并改善（旧值 `#2D5A4E` vs 背景 `#161B22` 对比度约 2.2:1，新值 `#58A6FF` vs 同背景约 6.85:1，通过 WCAG AA 4.5:1 常规文本阈值）。
- **建议**: 无（已消除，T-168 AC-006 / T-174 AC-004 均可闭环）。

### [R-002] LOW: quote-mark 装饰字符未锁定 font-family（状态：持续，未被本轮改动触及）

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: 沿用 r1 判定不变。T-174 范围明确为 quote-mark/dropcap 首字色 + dropcap 字体 + pull-quote 署名色，未包含 `large-quote-mark`/`pull-quote decorated` 的 `quote-mark` slot 自身字体声明，故该 span 仍退回消费环境默认字体栈渲染，与已 sign-off 样张字形观感的差异依旧存在。不构成对现有 spec 明文的违反。
- **建议**: 同 r1——若需强化与样张视觉贴合度，可在 ui-spec 补充明确 `font-family` 声明并同步实现，不阻塞当前批次。

### [R-003] LOW: paragraph dropcap 变体正文颜色未受 quote 场景同等约束（信息性，状态不变）

- **category**: consistency
- **root_cause**: reviewer-calibration
- **描述**: 沿用 r1 判定，本轮复核确认设计意图不变（paragraph 首字下沉不应改变正文自身颜色语义），仅记录不计入缺陷统计。

### [R-004] LOW: quote root 基线色 `#555` 跨主题仍字节级相同（已登记范围外事项，本轮复核确认现状不变）

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: `quote` block 的 `large-quote-mark`/`dropcap` 两变体 `baseStyle.root.color` 仍为字面量 `#555`，未随主题变化（跨 default/literary/tech 三主题渲染实测确认字节级相同）；5 个主题包 `blocks/quote.ts` 均未注册 `quote` 容器键的 L2 覆盖。此为任务交底中已登记的范围外事项（§10.5 未指明 token 映射且 default 主题无对应值 token，映射歧义已上抛 ui-designer 裁定，orchestrator 已登记待办），本轮复核确认现状与登记描述一致，非独立新增阻塞性缺陷。
- **建议**: 沿用已登记待办处理路径，等待 ui-designer 裁定 token 映射后统一收敛，不阻塞本轮 verdict。

### [R-005] LOW: literary 主题 `p` 标签字体声明与自身 `tokens.ts` `--font-family-heading` 字面量轻微不同步（本轮新发现，非 T-174/R-001 范围）

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: `packages/themes/literary/src/blocks/paragraph.ts` 第 6 行 `p` 标签 `font-family` 字面量为 `'Source Han Serif CN', 'Noto Serif CJK SC', 'SimSun', Georgia, serif`，比同包 `tokens.ts` 的 `--font-family-heading`/`--font-family-body`（含 `'宋体'`）少一个字体名。此为标签级 L1 默认值路径（`themeTokens[tagName]`），与 T-174 改动的 slot 装饰路径完全独立，pre-existing、非本次改动引入，也不在 R-001 范围内。
- **建议**: 后续主题包维护时核对 `blocks/*.ts` 内联字体字面量与 `tokens.ts` 同名 token 是否需要保持同步，或考虑该路径也直接消费 token 常量而非复制字面量（长期可维护性）；不阻塞本轮 verdict。

## 结论

r1 报告的唯一 HIGH（R-001，装饰色值/字体跨主题渲染不生效）经 T-174 实现 `var(--token)` 占位语法 + `resolveTokenPlaceholder()` 解析机制**完全消除**：四个装饰变体（pull-quote decorated / quote large-quote-mark / quote dropcap / paragraph dropcap）在 default/literary/tech 三主题下的渲染实证与各主题 `tokens.ts` 权威值逐一吻合，且与 T-140 样张（`content-elements-dropcap.png` 5 主题色值对照表）标注完全一致；tech 深色主题下的可读性问题一并改善。T-168 AC-001~AC-005 的既有修正（定位/无边框/行高/署名前缀/悬挂技法）经复核**无回归**。

余下问题均为 LOW：R-002（quote-mark 字体未锁定，T-174 范围外）、R-003（信息性观察，判定不变）、R-004（quote root 基线色范围外事项，本轮确认现状与已登记待办一致，非新增独立缺陷）、R-005（本轮新发现，literary 主题 p 标签字体字面量与 tokens.ts 轻微不同步，独立于 T-174/R-001）。

## 三态判定

无 CRITICAL/HIGH，存在 LOW（R-002/R-003/R-004/R-005）→ 按 COMMON-RULES §三态判定逻辑，结论为 **approved_with_notes**。T-168 AC-006 与 T-174 AC-004 均可闭环。
