---
id: "code-review-s7-unattended-wave-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-176", "T-177", "T-178", "T-186", "T-187"]
consumers: ["orchestrator", "user"]
---

# CODE-REVIEW: Sprint 7 无人值守波跨卡对抗审查 (r1)

审查范围：`34aaa28`(T-177) `8cabc9e`(T-178) `d25c969`(T-187) `5b2ba48`(T-186) `ca91063`(T-176)，diff 基线 `ca66d7d`。

方法论：主动证伪（红队），非合规打勾。每条 finding 附亲测证据。

## Findings

### [R-001] CRITICAL: `registerVariant`（MCP `register_variant` 工具，外部输入面）完全未接入 T-187 构造期 FORBIDDEN 守卫，`display:grid` 可注册并原样渗透进最终渲染 HTML
- **category**: security
- **root_cause**: upstream-caused
- **描述**: T-187 新建的 `style-guard.ts`（`FORBIDDEN_CSS_PROPS`/`FORBIDDEN_DISPLAY_VALUES`/`FORBIDDEN_VALUE_PATTERNS` 校验）只接入了 `registerBlock`/`registerTheme`/`registerMark` 三个**内置资产构造期**注册函数，未接入 `packages/core/src/registry/variant.ts::registerVariant` —— 而 `registerVariant` 正是 MCP `register_variant` 工具（`apps/mcp-server/src/tools/register-variant.ts`，`ALL_TOOL_SCHEMAS.register_variant` 已在 `router.ts:49` 实际注册为线上可调用工具，description "注册自定义 Block Variant 皮肤"）背后的注册函数，是项目自己在 T-187 CODE-REVIEW-r1 R-002 中明确点名的"**MCP 用户输入路径，最小暴露面原则**"最高风险面。`registerVariant` 的 `validateStyle`（variant.ts:24-49）仍是 T-187 之前的旧机制：仅 `filterCssAttrs`（XSS 模式黑名单）+ `isWhitelistedProperty`（`CSS_SAFE_PROPERTIES` 属性名白名单），**不检查 `FORBIDDEN_DISPLAY_VALUES`，也不检查 `isForbiddenCssValue`**。由于 `display` 本身在 `CSS_SAFE_PROPERTIES` 白名单内（`css-property-whitelist.ts:82`），`display: grid` / `display: inline-grid` 可以顺利通过 `registerVariant` 注册。

  亲测（见下方"亲测证据"）确认：① `registerVariant({blockId:"callout", id:"probe-grid-variant2", style:{root:{display:"grid",...}}})` **注册成功、不抛异常**；② 用该 variant 渲染文档后，最终 `renderMarkdown().html` **原样包含 `display: grid`**（output 相仅有 `patch-flex-to-block` 规则处理 `flex`/`inline-flex`，**没有任何规则处理 `grid`/`inline-grid`**——这正是 T-184 AC-004 notes 自己承认的已知缺口："float/grid/inline-grid/定位族...无对应 output 域运行期规则、由 T-187 构造守卫 + 全组合扫描兜底"，但 T-187 的"兜底"从未真正覆盖 `registerVariant` 这条路径）；③ 项目自己的 `lint-grid-layout` 规则确实在 diagnostics 里报了一条 `severity:"error"`、消息 "display:grid is not supported in the WeChat article renderer" —— 但这只是**诊断**（lint，不 strip/patch），最终 HTML 仍然原样带着会在微信真实渲染器里布局失败的 `display:grid`。
  
  T-187 的 `tests/blocks/wechat-paste-safe-output.test.ts` 全主题×全块×全变体扫描只遍历 `listBlocks()`（内置 block 的 built-in `variants` 数组），**从未遍历 `registerVariant` 注册的第三方变体**，因此这个口子在 T-187 声称的"全组合扫描门禁"里是完全的盲区，AC-005/AC-007"负向探针证明真实拦截"的覆盖范围实际上不含这条路径。T-187 CODE-REVIEW-r1 的 R-002 虽然点出了"`registerVariant` 服务 MCP 用户输入路径"这一事实，但审查者没有反向验证——`registerVariant` 自己的旧白名单机制是否真的能挡住 T-187 新增的 FORBIDDEN_DISPLAY_VALUES 类别；这是审查推理链条里的一个断点（对应 vector 4：审查者未对自己援引的分工论据做交叉验证）。
- **建议**: 在 `registerVariant::validateStyle`（variant.ts:24-49）内追加对 `FORBIDDEN_DISPLAY_VALUES`/`isForbiddenCssValue` 的检查（可直接复用 `style-guard.ts` 的 `evaluateDeclaration`，与 `registerBlock`/`registerTheme`/`registerMark` 统一走同一校验函数，消除"内置资产 vs 第三方 MCP 输入"两套并行黑名单口径的分裂）；`tests/blocks/wechat-paste-safe-output.test.ts` 的全组合扫描补一轮对 `registerVariant` 注册路径的负向探针（如 `display:grid`/`display:inline-grid` 应被拒绝，而非渲染后才被动依赖 lint 诊断）。

### [R-002] HIGH: `customCss`（MCP `render_markdown` 工具的 `customCss` 请求参数）同样完全绕过 FORBIDDEN_VALUE_PATTERNS 值模式校验，`-webkit-` 前缀值可原样渗透进最终渲染 HTML
- **category**: security
- **root_cause**: upstream-caused
- **描述**: `packages/core/src/pipeline/custom-css.ts::filterDeclarations`（L72-95）对 juice 贡献的每条声明只做 `isWhitelistedProperty(prop)` 属性名白名单检查，**从不调用 `isForbiddenCssValue`**（T-184/T-187 引入的 `-webkit-`/`@media`/`@keyframes`/`:hover`/`:active` 值模式黑名单，定义于 `packages/contracts/src/platform/wechat-paste.ts`，目前唯一消费方是 `style-guard.ts`）。由于 `background`/`display` 等属性本身在 `CSS_SAFE_PROPERTIES` 白名单内，一段包含 `background: -webkit-linear-gradient(red, blue)` 或 `display: -webkit-box` 的 customCss，会原样通过属性名白名单检查，合并进最终 hast 树的 `style` 属性，再经 `wechatAdapter.patch()`（output 相）——output 相同样没有任何规则专门清洗"合法属性名 + `-webkit-` 前缀值"这一模式（只有 `strip-position`/`strip-font-family`/`patch-flex-to-block` 三条针对特定属性/值的窄规则），最终原样写入 `render().html`。

  亲测（见下方）：`renderMarkdown(md, {customCss: "p{background:-webkit-linear-gradient(red,blue);display:-webkit-box;-webkit-line-clamp:3}"})` 渲染结果的 `<p style="...">` 中**同时包含** `background: -webkit-linear-gradient(red, blue)` 与 `display: -webkit-box`（只有 `-webkit-line-clamp: 3` 因为是独立属性名不在白名单内被拒绝，diagnostics 里能看到对应 warning）。`customCss` 经 `render_markdown` MCP 工具的 `customCss: z.string().optional()` 请求字段直接对外可达（`apps/mcp-server/src/tools/render-markdown.ts:9`）。

  T-184 AC-004 notes 明确把"float/grid/-webkit- 类无 output 域运行期规则"的缺口指派给"T-187 构造守卫 + 全组合扫描兜底"，但 `customCss` 是**请求时输入**，构造期守卫（block/theme/mark 注册）在语义上根本触及不到它；T-187 的扫描测试（`wechat-paste-safe-output.test.ts`）也不含任何 customCss 场景 fixture。这与 R-001 是同一类"三层防御模型在两个外部输入面（`registerVariant` 与 `customCss`）上都没有真正落地"的系统性缺口，非本波任何单卡的孤立改动引入（`custom-css.ts` 本身未被此波任何 commit 触碰），但本波（尤其 T-184/T-187）对外宣称的"分层防御已闭环"叙事覆盖了这两个真实存在的缺口，构成审查层面的过度自信。
- **建议**: `filterDeclarations`（custom-css.ts）在 `isWhitelistedProperty` 通过后追加 `isForbiddenCssValue` 值模式检查，命中即降级为 diagnostics 警告并剔除该声明（与现有"不在白名单则拒绝并记 diagnostic"的处理路径一致）；或在 output 相新增一条通用规则，对任意保留属性的值做 `FORBIDDEN_VALUE_PATTERNS` 扫描并剥离（不局限于 `strip-position`/`strip-font-family`/`patch-flex-to-block` 这三条窄规则）。

### [R-003] MEDIUM: T-178 回归测试 / code-review 把 gallery/compare/dropcap 的 table-cell 宽度场景包装成"生产真实场景"，但管线顺序证明该规则对这三类场景从未生效过
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `tests/ruleset/t178-strip-width-height-removed.test.ts` 顶部注释与 `CODE-REVIEW-T-178-r1.md`（verdict=approved，零问题）均将 "gallery duo/triptych cell、compare ledger cell、dropcap table-cell" 的 width 保留断言描述为验证"real production authoring surfaces"/"四种真实场景...load-bearing"。但源码追踪（`packages/core/src/render.ts:83,91`：`applyRuleset(hast, rules, "authoring")` 早于 `inlineStyle(hast, themeTokens, ...)`；`packages/blocks/src/blocks/gallery.ts::buildGalleryCell`/`decorate-utils.ts::slotElement` 对 `data-block-slot="cell"` 元素只设 `data-block-slot` 属性，不设 `style`）证明：gallery/compare/dropcap 的 table-cell `width` 声明是 `inlineStyle()`（**authoring 相之后**）通过 L1/L2 baseStyle 解析动态注入的，在 `strip-width-height-inline`（`stage:"authoring"`）实际执行的那一刻，这些元素在真实管线里**根本没有 `style` 属性可供该规则匹配**（`hasStyleProp` 要求 `el.properties.style` 是非空字符串）。也就是说该规则在真实 `renderMarkdown()` 管线中对这三类场景从来都是永远命中不了的死规则，移除它对这三类场景没有改变任何实际行为——测试本身通过手工构造"已经带有 style 属性"的 hast 片段直接喂给 `applyRuleset(..., "authoring")`（绕过 decorate/inlineStyle 的真实顺序），验证的是一个在生产管线中不会出现的中间状态，而非注释所声称的"real production authoring surfaces"。四个场景中只有"img 固定尺寸"（源 markdown/HTML 直接携带的 `style="width:200px;height:150px"`，在 authoring 相之前就已存在）是该规则曾经真实生效、现在确实需要回归锁定的场景。
  
  这不构成功能缺陷（移除规则本身是安全的，无论其对 3/4 场景是否曾经生效），但 T-178 任务卡"生产实证收窄"的论证依据与 code-review 对该测试"断言渲染后可观测值，符合保真类 AC 规范"的正面评价，在管线顺序这一点上是不准确的——是本轮红队复核中一个典型的"测试绿但未触达其声称路径"（hollow coverage narrative，非 hollow assertion）案例。
- **建议**: 收窄 T-178 测试注释与任务卡 notes 的表述，明确 gallery/compare/dropcap 三个 table-cell 场景是"防止未来有人把 strip-width-height-inline 类规则错误地移到 authoring 相之后运行"的结构性回归锁，而非"过去真实发生过的剥离风险"；如需验证"完整 renderMarkdown() 管线下 gallery/compare/dropcap 的真实渲染宽度存活"，应新增一条经 `renderMarkdown()`（而非裸 `applyRuleset`）的端到端断言。

### [R-004] MEDIUM: 槽位内嵌套非槽位、非主题 token 标签（如自定义 mark）时，`bodyBaseline` 不通过 `slotInherited` 继续下传，当前代码库仅因巧合未触发可观测缺陷
- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-176 `packages/core/src/pipeline/inline-style.ts` 的槽位路径（L192-212）里，`childAmbientBlock.slotInherited = extractInheritedStyle(slotStyle)` 取自槽位**自身声明**的 `slotStyle`，而非包含 `bodyBaseline` 的 `merged`（L202-206：`merged = {...bodyBaseline, ...ambientBlock.blockInherited, ...slotStyle}`）。这意味着：若某个槽位包裹了非槽位、非 `data-block` 的"tag path"子元素（如自定义 mark 渲染出的裸 `<span>`，`themeTokens.span` 未定义故 `base` 为空），且该子元素自身没有声明相应可继承属性（依赖 `bodyBaseline` 兜底），而**该槽位自身也没有声明这个属性**（依赖 bodyBaseline 补齐），则该子元素会既拿不到槽位自身样式也拿不到 bodyBaseline，静默丢失预期的排版属性。

  当前代码库恰好不触发此缺陷：① 唯一会把富文本（含 mark 可能性）嵌套进槽位的场景是 dialog `bubble-left`/`bubble-right`（`slotElement(side, element.children)` 包住原始 `<p>`），而两者的 `baseStyle` 都显式声明了 `color`（`CHAT_BUBBLE_SHARED_STYLE` + `background`/`color` 覆盖），故 `slotInherited` 恰好带上了 `<p>` 需要的 `color`；② 其余槽位（title/description/caption/quote-mark/author）均通过 `textContentOf()` 抽取为纯文本节点，不含任何嵌套标签，不触达该路径。该分析已通过读代码路径穷举确认（`grep slotElement(` 全部 6 个消费点逐一走查），未见任何测试覆盖"槽位内嵌套 mark 且槽位自身未声明该可继承属性"的组合。
- **建议**: 补一条边界测试锁定当前"槽位内嵌套 mark 依赖槽位自身声明色值"的隐性约束（例如构造一个自定义 block/variant，槽位 baseStyle 不声明 color、内容含 `:badge[text]` 一类不自带 color 的 mark，断言渲染结果），或将 `childAmbientBlock.slotInherited` 改为 `extractInheritedStyle(merged)`（含 bodyBaseline）以消除该潜在缺口，二选一。不影响当前 T-176 AC-001/AC-002 的正确性判定（两者测试场景均不落入该缺口）。

### [R-005] LOW: cross-runtime 黄金哈希 fixture 集合过窄，本波"golden SHA 未变"结论虽亲测无漂移，但结构上无法覆盖 dialog/steps/gallery/table-cell 等本波实际改动路径
- **category**: test-quality
- **root_cause**: upstream-caused
- **描述**: `tests/cross-runtime/fixtures.ts` 仅含 3 条 fixture（`cjk-heading` 纯标题段落、`block-directive` 裸 `:::callout`、`frontmatter` 纯段落），均不含 dialog/steps/gallery/compare（T-176 slot cascade 改动路径）也不含 table-cell/img 固定宽高（T-178 改动路径）。T-176/T-178/T-186 三份 code-review 均以"fixture 不含相关结构，golden SHA 未变判断成立"为由跳过 `pnpm gen:cross-runtime-hashes` 重生成。本轮红队复核已独立执行 `computeFixtureHashes()` 并与 `EXPECTED_HASHES` 逐条比对，确认**当前无漂移**（见亲测证据）——即"未变"结论本身真实无误，不是假绿。但该"未变"结论的真实含金量有限：cross-runtime 一致性门禁（Node/Worker/Edge/Browser 四 target 字节级一致）对本波实际改动的代码路径（slot cascade、table-cell 宽度）**从未被跑过**，"四门禁不覆盖 cross-runtime job 故豁免"的判断依据成立，但连带产生的"golden SHA 未变 = 跨运行时一致性已验证"的隐含印象对这两类改动是不成立的。
- **建议**: 非阻塞。建议后续往 `FIXTURES` 补至少一条含槽位排版（dialog/steps）与一条含 table-cell 宽度（gallery/compare）的 fixture，使 cross-runtime 门禁的覆盖面覆盖到项目实际存在的槽位级/表格级渲染路径，而非仅标题/段落/纯文本 block-directive。

## 亲测证据汇总

以下命令均在 `C:\Users\huanc\Work\GitRepo\wechat-flow-unattended`（分支 `feature/unattended-s7`）内实跑，未修改任何仓库内文件（探针脚本写在会话 scratchpad 目录，通过 `pathToFileURL` 绝对路径 import 仓内源码，不落盘到仓库）。

1. **`pnpm vitest run`** → `275 passed | 2 skipped (277)` files / `4451 passed | 10 skipped (4461)` tests，与 CODE-REVIEW-T-187-r2 自报的 "4451 passed/10 skipped" 完全一致。
2. **`pnpm typecheck`**（turbo，50 tasks）→ 全绿；**`npx tsc -p tests/tsconfig.json --noEmit`** → exit 0。
3. **`pnpm biome check .`** → `Checked 863 files in 755ms. No fixes applied.`
4. **`pnpm test:cross-runtime`** → Node/Worker/Edge/Browser 四 target 全绿（4 test files passed）。
5. **独立重算 cross-runtime 黄金哈希**：动态 import `tests/cross-runtime/fixtures.ts` 的 `computeFixtureHashes()`，与文件内 `EXPECTED_HASHES` 逐条比对，`ALL MATCH: true`（三条 fixture 哈希完全一致，无漂移）——独立坐实 T-176/T-178/T-186 三份 review "无需重生成 golden SHA" 的结论本身无误（但覆盖面见 R-005）。
6. **`:::callout` / `:::announcement` / `:::gallery` / `:::list` 裸指令探针**：渲染四个裸指令，仅 `callout` 产生 `directive-variant-invalid` 诊断（"callout 指令变体 default 不合法，合法变体为：tip、warning、info、danger"），其余三块诊断数组为空——独立坐实 T-177 AC-001 三块修复生效、callout 按 ui-spec §10.1 保留告警的现状。
7. **ui-spec §10.1 原文核实**：`docs/ui-spec/ui-spec-wechat-flow-block-variants.md:28-52` 确认存在"现状变体清单收敛"表格，`default → info` 收敛映射与"4 个具备真实形态差异的变体：tip/warning/info/danger"表述与 CODE-REVIEW-T-177-r1 的援引逐字一致，非审查者臆造依据。
8. **`registerVariant` FORBIDDEN 守卫绕过探针**（对应 R-001）：
   - `registerVariant({blockId:"callout", id:"probe-flex-variant", style:{root:{display:"flex",...}}})` → 注册成功不抛异常；渲染后 HTML 中 `display: flex` 已被 output 相 `patch-flex-to-block` 规则改写为 `display: block`（此路径有兜底）。
   - `registerVariant({blockId:"callout", id:"probe-grid-variant2", style:{root:{display:"grid",...}}})` → 注册成功不抛异常；渲染后 HTML **原样包含 `display: grid`**（`<section data-block="callout" data-variant="probe-grid-variant2" style="background-color: #eee; display: grid">...`），diagnostics 含 `lint-grid-layout` error 级诊断但未剥离该声明——**证实 R-001 所述的真实渗透**。
   - 对照组：`registerVariant({..., style:{root:{position:"absolute"}}})` → 正确抛出 `E_...`/`rejectedDeclarations`（`property:"position" ... not in css-attr-filter whitelist`），证明 `position` 确实被现有白名单机制挡住，仅 `display` 值级校验存在缺口。
9. **`customCss` FORBIDDEN_VALUE_PATTERNS 绕过探针**（对应 R-002）：`renderMarkdown(md, {customCss: "p{background:-webkit-linear-gradient(red,blue);display:-webkit-box;-webkit-line-clamp:3}"})` → 渲染结果 `<p style="...background: -webkit-linear-gradient(red, blue); display: -webkit-box">`，`result.html.includes("-webkit-")` 为 `true`；diagnostics 中仅 `-webkit-line-clamp: 3`（独立属性名，不在 `CSS_SAFE_PROPERTIES` 白名单）被拒绝并记 warning，`background`/`display` 的 `-webkit-` 值均未被任何层拦截。
10. **T-178 管线顺序核实**（对应 R-003）：读取 `packages/core/src/render.ts:83,91`（authoring ruleset 早于 `inlineStyle`）、`packages/blocks/src/blocks/gallery.ts::buildGalleryCell`（仅设 `data-block-slot`，不设 `style`）、`packages/blocks/src/decorate-utils.ts::slotElement`（同）、`packages/ruleset/src/rules/builtin/css-helpers.ts::hasStyleProp`（要求 `el.properties.style` 为非空字符串），结合 `tests/ruleset/t178-strip-width-height-removed.test.ts` 源码（手工构造带 `style` 属性的 hast 片段直喂 `applyRuleset(..., "authoring")`），静态证明 gallery/compare/dropcap 三类 table-cell 场景在真实管线中 `strip-width-height-inline` 从未有机会命中。
11. **T-176 槽位继承链核实**（对应 R-004）：通读 `inline-style.ts` 完整 `applyInlineStyles` 递归逻辑 + `packages/blocks/src/blocks/dialog.ts`/`steps.ts`/`compare.ts`/`gallery.ts`/`pull-quote.ts`/`quote.ts` 全部 6 处 `slotElement(` 调用点，逐一确认嵌套结构与 baseStyle 声明完整性。
12. 全仓 `grep` 核实 `simulate-paste.ts`/`simulator/*`/`diff/per-node-diff.ts`/`simulatePaste`/`SimulatePasteResult`/`NodeDiff`/`DroppedAttr` 无源码残留引用（仅 `apps/mcp-server/src/tools/simulate-paste.ts` 文件名沿用，内容已改为 `wechatAdapter.inspect` 薄封装）。
13. 读取 `packages/core/src/render.ts` 全文确认 `wechatAdapter.patch(afterCustomCss, rules)` 是 `render().html` 的实际数据源（output 相之后才 serialize），坐实 T-186 AC-002 复制三路改指向 `render()` 产物在语义上等价于原先经 `simulatePaste` 过滤（`patch` 内部即 `applyRuleset(...,"output")`，与旧 `render.ts` 内联调用行为等价）。
14. 确认 `register_variant` MCP 工具在 `apps/mcp-server/src/tools/router.ts:26,49` 与 `packages/contracts/src/mcp/tool-contracts.ts:190,225` 均已实际注册上线（非死代码/未接线占位），坐实 R-001 的可达性。

## Verdict

**needs_revision**

存在 1 条 CRITICAL（R-001）+ 1 条 HIGH（R-002），按 COMMON-RULES §三态判定逻辑，CRITICAL/HIGH 存在即 needs_revision，无豁免空间。

### 阻塞项（需进入 revision）
- **R-001（CRITICAL）**：`registerVariant`（MCP `register_variant` 工具）未接入 T-187 FORBIDDEN 构造期守卫，`display:grid`/`display:inline-grid` 可注册并原样渗透进最终渲染 HTML，破坏微信真实渲染器布局（项目自己的 `lint-grid-layout` 规则已证实该模式不受支持）。
- **R-002（HIGH）**：`customCss`（MCP `render_markdown` 工具的 `customCss` 参数）绕过 `isForbiddenCssValue` 值模式校验，`-webkit-` 前缀值可嵌入合法属性（`background`/`display` 等）原样渗透进最终渲染 HTML。

两条问题指向同一类系统性缺口：T-184/T-187 建立的"构造守卫 + output 补救 + 全组合扫描"三层防御模型，在两个**外部/请求时输入面**（`registerVariant` 与 `customCss`）上均未真正落地——构造期守卫语义上覆盖不到这两个面，output 相规则只窄覆盖 `position`/`font-family`/`flex`-`inline-flex`，全组合扫描测试只遍历内置资产渲染产物，不含这两类输入。建议指派到 T-187 或新开一张收口任务卡，统一让 `registerVariant::validateStyle` 与 `custom-css.ts::filterDeclarations` 复用同一份 `style-guard.ts` 校验逻辑（`FORBIDDEN_DISPLAY_VALUES` + `isForbiddenCssValue`），并在扫描门禁中补上这两条输入路径的负向探针。

### 非阻塞项（备查/建议顺手处理）
- R-003（MEDIUM）：T-178 回归测试与 code-review 对"生产真实场景"的表述与管线实际顺序不符（3/4 场景在真实管线中规则从未生效过），建议收窄表述、补一条经 `renderMarkdown()` 端到端的场景断言。
- R-004（MEDIUM）：T-176 槽位继承链存在潜在缺口（`slotInherited` 不含 `bodyBaseline`），当前代码库因巧合未触发，建议补边界测试或调整实现消除缺口。
- R-005（LOW）：cross-runtime golden fixture 集合过窄，未覆盖本波实际改动的槽位/表格渲染路径，建议后续补充 fixture。

### 未发现问题的核实项（供 orchestrator 参考，不构成 finding）
- T-177 callout 排除的 ui-spec 依据经原文核实真实存在，排除判断正确。
- T-186 删除面（simulator/simulate-paste/per-node-diff/postPaste 导出）全仓 grep 确认无死引用残留；复制三路改指向 `render()` 产物在语义上与原 `simulatePaste` 过滤路径等价（`patch()` 即原 output 相 `applyRuleset` 调用点的具名封装）。
- 全仓四门禁（vitest/typecheck-turbo/tests-tsconfig/biome）+ cross-runtime 均已独立复跑坐实全绿，与五份循环内 code-review 报告自报的门禁结果一致，未发现"声称亲测实为转述"的数字造假迹象（含对 T-177/T-178/T-187/T-186 四张卡之间测试数量增减趋势的抽样静态计数交叉核对，走势自洽）。
