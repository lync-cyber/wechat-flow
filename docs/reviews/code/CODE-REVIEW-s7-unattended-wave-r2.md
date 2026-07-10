---
id: "code-review-s7-unattended-wave-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-176", "T-177", "T-178", "T-186", "T-187"]
consumers: ["orchestrator", "user"]
---

# CODE-REVIEW: Sprint 7 无人值守波跨卡对抗审查 (r2 — R-001/R-002 修复复验)

范围：commit `2e18b81`（`fix(core): registerVariant 值级 FORBIDDEN 构造守卫 + output 相 FORBIDDEN 值模式补救规则`），针对 `CODE-REVIEW-s7-unattended-wave-r1.md` 的 R-001（CRITICAL）/ R-002（HIGH）修复做对抗性复验。方法论同 r1：主动证伪，不采信转述，逐条亲测。

## 修复内容核实（读 diff）

- `packages/core/src/registry/variant.ts::validateStyle` 末尾追加 `rejected.push(...validateForbiddenDeclarations(style))` —— 确认真实接入 `style-guard.ts` 的 `validateForbiddenDeclarations`（与 `registerBlock`/`registerTheme`/`registerMark` 同一函数），非表面绕过。
- 新增 `packages/ruleset/src/rules/builtin/strip-forbidden-value-pattern.ts`（`stage:"output"`, `scope:"strip"`, `priority:85`），`matcher`/`transform` 均调用 `isForbiddenCssValue(\`${prop}: ${val}\`)`，命中即整条声明剥离（非改写）；已挂入 `builtin/index.ts::ALL_RULES`，`registry.test.ts` 计数同步更新为 45 条（38 output / 7 authoring）。
- 新增 fixture 三件套（`strip-forbidden-value-pattern/{input,expected,metadata}`）、`tests/core/pipeline/forbidden-value-pattern-output.test.ts`（customCss 场景 + emphasis 例外白名单）、`tests/mcp-server/tools/register-variant.test.ts` 新增 R-001 段（display:grid/inline-grid 经 MCP 路径拒绝）、`packages/core/src/registry/variant.test.ts` 新增两条单测。

## 逐项复验结果

### 1. 重放 r1 原始探针

- **`registerVariant({blockId:"callout", style:{root:{display:"grid",...}}})`**：重放 r1 原探针脚本，**从注册成功变为正确抛出** `rejectedDeclarations: [{slot:"root", property:"display", value:"grid", reason:'display value "grid" is on the FORBIDDEN denylist'}]`。**已拦截，确认修复。**
- **`customCss: "p{background:-webkit-linear-gradient(red,blue);display:-webkit-box;-webkit-line-clamp:3}"`**：重放 r1 原探针脚本，渲染结果 `result.html.includes("-webkit-")` 从 `true` 变为 `false`；`<p style="...">` 中不再含 `background: -webkit-linear-gradient` 或 `display: -webkit-box`。**已拦截，确认修复。**

原始两个探针均已验证拦截生效，非表面转述。

### 2. 对抗性绕过尝试 —— **发现新的、仍然存活的绕过面（大小写变体）**

亲测（探针脚本对 `registerVariant` 与 `customCss` 两条路径逐一构造大小写/空白变体，见下方"亲测证据"）：

| 探针 | 路径 | 结果 |
|------|------|------|
| `DISPLAY: GRID`（属性+值全大写） | `registerVariant` | **绕过**（注册成功，无异常） |
| `Display: Grid`（属性+值首字母大写） | `registerVariant` | **绕过** |
| `display: INLINE-GRID`（值全大写） | `registerVariant` | **绕过** |
| `display:  inline-grid`（双空格） | `registerVariant` | 阻止（`trim()` 已处理空白，非绕过面） |
| `background: -WEBKIT-linear-gradient(...)`（值级 webkit 大写） | `registerVariant` | **绕过** |
| `Position: Absolute`（属性大写） | `registerVariant` | 阻止（因 `isWhitelistedProperty` 内部 `.toLowerCase()`，白名单缺席路径本身大小写无关，非 FORBIDDEN 分支生效） |
| `-WEBKIT-transform: rotate(45deg)`（属性名本身大写 webkit 前缀） | `registerVariant` | 阻止（同上，白名单缺席路径兜底） |
| `background: -WEBKIT-linear-gradient(...)` | `customCss` | **绕过**（`-WEBKIT-` 原样出现在最终 HTML） |
| `background: -WebKit-linear-gradient(...)`（混合大小写） | `customCss` | **绕过** |
| `display: GRID`（值全大写） | `customCss` | **绕过**（且诊断数组为空，比小写 `grid` 更隐蔽——小写至少还有 `lint-grid-layout` 诊断） |
| `display: grid`（小写，对照组） | `customCss` | 未拦截（`patch-flex-to-block`/`strip-forbidden-value-pattern` 均不覆盖 `grid`，仅 `lint-grid-layout` 诊断，此为 r1 R-005 已知范围外缺口，非本轮新增） |
| `grid-template-columns: 1fr 1fr`（属性名含"grid"子串，值安全） | `registerVariant` | 阻止（原因是不在白名单，非 FORBIDDEN 误杀——核实无"grid 子串误伤合法属性"问题） |
| `background: url(grid.png)`（值含"grid"子串，语义无关） | `registerVariant` | 通过（正确未被误杀） |
| `content:"a;-webkit-fake";background:red`（分号夹带尝试） | `customCss` | 未泄漏（`content` 属性本身不在白名单被整体丢弃，非因为分号解析被智能识别） |

**根因**（对 `packages/contracts/src/platform/wechat-paste.ts::isForbiddenCssValue` 与 `packages/core/src/registry/style-guard.ts::evaluateDeclaration` 逐行核实）：

1. `evaluateDeclaration`（style-guard.ts:16-53）的 `FORBIDDEN_CSS_PROPS.has(property)`、`property === "display" && FORBIDDEN_DISPLAY_VALUES.has(trimmedValue)`、`FORBIDDEN_POSITION_PROPS.has(property)`、`property.startsWith("-webkit-")` 四处判断**全部对原始大小写做精确匹配，未做 `.toLowerCase()` 归一化**。
2. `isForbiddenCssValue`（wechat-paste.ts:53-64）对 `FORBIDDEN_VALUE_PATTERNS`（`-webkit-`/`@media`/`@keyframes`/`:hover`/`:active`）的 `stripped.includes(pattern)` 同样是大小写敏感的子串匹配。
3. 对照组：`isWhitelistedProperty`（`css-property-whitelist.ts:106-108`）**已经**在比较前调用 `prop.toLowerCase().trim()`——项目自己早就确立了"CSS 属性名比较前归一化大小写"的先例，但 T-184/T-187/本次修复新增的 FORBIDDEN 系列检查全部没有遵循这个先例。CSS 属性名/关键字值在真实浏览器与微信渲染器里是大小写不敏感的（`DISPLAY: GRID` 与 `display: grid`效果完全相同），因此这不是"边缘畸形输入"，而是用大小写就能复现 R-001/R-002 所描述的完全相同的生产缺陷（布局失败 / -webkit- 值渗透）。
4. 影响面精确边界：`position`/`float`/`font-family`/`-webkit-`前缀属性名（如 `-webkit-transform` 作为独立属性）因为不在 `CSS_SAFE_PROPERTIES` 白名单里、且白名单检查本身大小写无关，所以这几类**不受此次新发现的大小写绕过影响**（无论大小写都会被白名单缺席挡住）。真正受影响的是：① `display` 的 FORBIDDEN_DISPLAY_VALUES 值检查（因为 `display` 本身合法在白名单内，检查只能靠 FORBIDDEN 分支，而该分支大小写敏感）；② `isForbiddenCssValue` 覆盖的值模式（`-webkit-`/`@media`/`@keyframes`/`:hover`/`:active`）对任意合法属性（`background`/`content`/`text-shadow` 等）的 case bypass，`customCss` 与 `registerVariant` 两条路径都受影响。

### 3. 例外白名单核实（emphasis mark `-webkit-text-emphasis`）

亲测渲染 `:emphasis[重点]`：输出 `<span style="text-emphasis: filled circle; text-emphasis-position: under left; -webkit-text-emphasis: filled circle">重点</span>`，`-webkit-text-emphasis` 原样存活，`nodeChangeRecords` 中无 `strip-forbidden-value-pattern` 命中记录，`diagnostics` 为空数组。**例外白名单未被误杀，确认正确**（追踪 `isForbiddenCssValue` 内部两轮 `split/join` 逻辑：先按 `-webkit-${exception}` 剥离一次，再按裸 `exception` 剥离一次，"`-webkit-text-emphasis`"作为字面 `exception` 条目在第二轮被整体从待检字符串中移除，剩余部分不再含任何 FORBIDDEN_VALUE_PATTERNS 子串）。

### 4. R-003/R-004/R-005 维持原判定复核

`git show 2e18b81 --stat` 确认本次修复仅触及 `packages/core/src/registry/variant.ts`（+2 行）、`packages/ruleset/src/rules/builtin/{index.ts,strip-forbidden-value-pattern.ts}`（新增）、对应 fixture、`packages/ruleset/src/rules/registry.test.ts`（计数更新）、三个新/改测试文件——**未触及** r1 R-003（`packages/ruleset/src/rules/builtin/strip-width-height-inline.ts` 已删除文件/`tests/ruleset/t178-strip-width-height-removed.test.ts`/`gallery.ts`/`decorate-utils.ts`/`render.ts` 管线顺序）、R-004（`packages/core/src/pipeline/inline-style.ts`）、R-005（`tests/cross-runtime/fixtures.ts`）涉及的任何文件。三项 disposition（R-003/R-004 MEDIUM、R-005 LOW，均非阻塞）维持不变，本轮不重新展开论证。

### 5. 门禁抽验

- `pnpm vitest run` 全量一次：`276 passed | 2 skipped (278)` files / **`4463 passed | 10 skipped (4473)`** tests，零失败——与 implementer 自报"4463 pass"数字完全一致，且本次运行**未观察到任何失败**（含 `tests/core/registry/token.test.ts`）。
- 针对性复核"token.test.ts 预存 flake"说法：定位到 `tests/core/registry/token.test.ts`（未被本次修复 diff 触及，与 R-001/R-002 无代码关联）。单独重跑该文件 3 次，均 49/49 全绿，但注意到 `AC-006: registerToken / listTokens / describeToken are exported from core index > registerToken exported from core index is a function` 单个用例耗时稳定在 **3.2~3.9 秒**（同文件其余用例均 <10ms 量级），显著异常。读源码定位原因：该用例内联 `await import("../../../packages/core/src/index.ts")`——在测试体内动态导入整个 core 包 barrel 文件（而非模块顶层静态导入一次性摊销），每次执行都要重新解析/转换其完整依赖图（含 `@wechat-flow/ruleset`/`@wechat-flow/contracts`/`@wechat-flow/marks` 等）。这是一个**测试自身的 test-quality 问题**（重量级动态 import 放在单个 it 内、无跨用例复用），与本次 R-001/R-002 修复的业务逻辑无因果关系；但本次修复给 `packages/ruleset/src/rules/builtin/index.ts` 新增了一个规则文件（`strip-forbidden-value-pattern.ts`），边际增加了该动态 import 的依赖图体积，在 CI 资源紧张时更容易逼近 vitest 默认单测超时——"预存 flake、本次修复非根因但可能边际推高概率"的说法**基本成立**，本轮 4 次独立执行（3 次单文件 + 1 次全量）均未复现失败，判定为**非阻塞、已知肌理的 test-quality 问题**，不影响本轮修复验收。

## 亲测证据汇总

1. 重放 r1 探针脚本 `probe-registervariant-grid.mts`：`registerVariant(..., {display:"grid"})` 现在抛出 `Error: registerVariant: rejected declarations in variant "probe-grid-variant2"`，`rejectedDeclarations: [{slot:"root", property:"display", value:"grid", reason:'display value "grid" is on the FORBIDDEN denylist'}]`。
2. 重放 r1 探针脚本 `probe-customcss-webkit.mts`：`result.html` 不再含任何 `-webkit-`，`diagnostics` 仅保留原有的 `-webkit-line-clamp` 白名单缺席警告。
3. 新增对抗性探针脚本（`probe-r2-adversarial.mts`）逐条构造大小写/空白/子串变体，完整输出见上表；关键证据行：
   - `[BYPASS?] DISPLAY: GRID (upper property+value): registration SUCCEEDED (no throw)`
   - `[BYPASS?] Display: Grid (mixed case): registration SUCCEEDED (no throw)`
   - `[BYPASS?] display: INLINE-GRID (upper value): registration SUCCEEDED (no throw)`
   - `[BYPASS?] background: -WEBKIT-linear-gradient(red,blue) (upper value): registration SUCCEEDED (no throw)`
   - customCss 探针：`uppercase -WEBKIT- value: html contains -webkit- (case-insens)? true`，HTML 片段 `background: -WEBKIT-linear-gradient(red,blue)` 原样可见
   - customCss 探针：`display: GRID via customCss: ... diagnostics: []`（对照 `display: grid` 小写有 `lint-grid-layout` 诊断，大写连诊断都没有）
4. 例外白名单探针（`probe-r2-emphasis-exception.mts`）：`:emphasis[重点]` 渲染后 `-webkit-text-emphasis` 存活，`nodeChangeRecords` 无 `strip-forbidden-value-pattern` 命中。
5. `pnpm vitest run` 全量：`276 passed | 2 skipped (278)` files / `4463 passed | 10 skipped (4473)` tests，0 失败。
6. `tests/core/registry/token.test.ts` 单独重跑 3 次：均 `49 passed`；`AC-006 ...is a function` 单用例耗时 3222ms / 3867ms / 3679ms（对比同文件其余用例 <10ms），源码定位为该用例体内 `await import("../../../packages/core/src/index.ts")` 动态导入整个 core 包依赖图所致。
7. `git show 2e18b81 --stat` 确认修复 diff 范围（10 文件，186 插入/5 删除），与 R-003/R-004/R-005 涉及文件（`t178-strip-width-height-removed.test.ts`/`gallery.ts`/`decorate-utils.ts`/`render.ts`/`inline-style.ts`/`tests/cross-runtime/fixtures.ts`）零交集。
8. `packages/ruleset/src/apply.ts` + `packages/ruleset/src/rules/scope/strip.ts` + `packages/ruleset/src/rules/builtin/index.ts`（`SCOPE_ORDER`/排序函数）逐行核实：`strip`（SCOPE_ORDER=0）整体先于 `patch`（SCOPE_ORDER=3）执行，`priority` 字段只影响同一 `scope` 内的相对顺序（数值大者先执行），不影响跨 scope 顺序——`strip-forbidden-value-pattern`（scope:strip, priority:85）与 `patch-flex-to-block`（scope:patch, priority:50）之间的先后关系由 SCOPE_ORDER 决定（strip 恒先于 patch），priority 数值本身对这对规则的相对顺序不构成实际影响；已知会被 `strip-forbidden-value-pattern` 命中的 `-webkit-` 前缀声明（如 `display: -webkit-box`）在 strip 阶段即被整条剥离，不会流转到 `patch-flex-to-block` 所在的 patch 阶段，属预期行为、非缺陷。

## Findings（r2 新增）

### [R-006] HIGH: R-001/R-002 修复均可被简单大小写变体绕过——`registerVariant` 与 customCss 输出相剥离均未对 FORBIDDEN 检查做大小写归一化
- **category**: security
- **root_cause**: self-caused
- **描述**: 见上文"对抗性绕过尝试"与"根因"分析。`style-guard.ts::evaluateDeclaration` 的 `FORBIDDEN_DISPLAY_VALUES.has(trimmedValue)`/`property === "display"` 判断、`wechat-paste.ts::isForbiddenCssValue` 的 `stripped.includes(pattern)` 子串匹配，均未做大小写归一化，与项目已有的 `isWhitelistedProperty`（内部 `.toLowerCase()`）先例不一致。亲测确认 `registerVariant` 侧 `Display: Grid`/`DISPLAY: GRID`/`display: INLINE-GRID`/`background: -WEBKIT-linear-gradient(...)` 均可绕过注册期拒绝；customCss 侧 `-WEBKIT-linear-gradient(...)`/`-WebKit-linear-gradient(...)` 均可原样渗透进 `render().html`，且 `display: GRID`（大写）经 customCss 渗透时**连诊断都没有**（比已知的 grid 小写缺口更隐蔽）。CSS 关键字/属性名在真实渲染器中大小写不敏感，故这些绕过复现的是与 R-001/R-002 完全相同的生产缺陷（微信渲染器布局失败 / `-webkit-` 值渗透），只是攻击者多敲了几个大写字母。`position`/`float`/`font-family`/`-webkit-`前缀属性名因白名单缺席检查本身大小写无关而不受此绕过影响，已核实收窄范围仅限 `display` 值检查与 `isForbiddenCssValue` 覆盖的值模式检查两处。
- **建议**: 在 `evaluateDeclaration`（style-guard.ts）比较 `property`/`trimmedValue` 前统一 `.toLowerCase()`（比照 `isWhitelistedProperty` 先例）；`isForbiddenCssValue`（wechat-paste.ts）对 `value` 做 `.toLowerCase()` 后再做子串匹配（连带检查 `FORBIDDEN_VALUE_PATTERN_EXCEPTIONS` 的两轮 split/join 逻辑在归一化后是否仍正确——例外条目本身也需同步小写化比较，避免归一化引入"例外自身失效"的新回归）；补充与本轮探针等价的大小写变体负向测试用例（`DISPLAY:GRID`/`-WEBKIT-xxx`/混合大小写）锁定修复。

### [R-007] LOW: `token.test.ts` AC-006 用例存在结构性慢查询（测试体内动态 import 整包），非本轮修复引入但被边际放大，建议顺手治理
- **category**: test-quality
- **root_cause**: upstream-caused
- **描述**: 见上文"门禁抽验"分析。`tests/core/registry/token.test.ts` 的 `AC-006` describe 块两条用例均在 `it` 体内 `await import("../../../packages/core/src/index.ts")`，实测单用例稳定耗时 3.2~3.9 秒（同文件其余用例 <10ms），是 implementer 所称"token.test.ts 预存 flake"的合理技术根源（CI 资源紧张时可能逼近默认超时）。本次修复新增一条 ruleset 规则文件使该动态 import 的依赖图边际增大，与"预存但被边际推高概率"的说法一致，非本次修复的功能性回归。
- **建议**: 非阻塞。建议后续把该动态 import 提到 `describe` 块顶层或模块级一次性完成（其余用例已是这种写法，AC-006 这两条用例风格不一致），消除该测试文件内唯一的秒级用例。

## Verdict

**needs_revision**

存在 1 条 HIGH（R-006）。按 COMMON-RULES §三态判定逻辑，HIGH 存在即 needs_revision。

### r1 阻塞项闭合状态
- **R-001（CRITICAL，r1）**：**已闭合**——`registerVariant` 值级 FORBIDDEN 校验真实生效，原始探针（小写 `display:grid`）确认拦截。
- **R-002（HIGH，r1）**：**已闭合**——新增 output 相 `strip-forbidden-value-pattern` 规则真实生效，原始探针（小写 `-webkit-` 值）确认拦截；例外白名单（`-webkit-text-emphasis`）未被误杀。

### 本轮新增阻塞项
- **R-006（HIGH）**：R-001/R-002 的修复均可被简单大小写变体绕过（`Display: Grid`/`DISPLAY: GRID`/`-WEBKIT-linear-gradient(...)` 等），复现与原始 CRITICAL/HIGH 相同的生产缺陷（渲染器布局失败 / -webkit- 值渗透），仅需在 `evaluateDeclaration`/`isForbiddenCssValue` 两处补 `.toLowerCase()` 归一化即可修复（比照项目自身 `isWhitelistedProperty` 已有先例），改动面小、风险低。

### 非阻塞项（备查，disposition 不变）
- R-003（MEDIUM，r1）：T-178 回归测试"生产真实场景"表述与管线实际顺序不符，未受本次修复影响。
- R-004（MEDIUM，r1）：T-176 槽位继承链 `slotInherited` 潜在缺口，未受本次修复影响。
- R-005（LOW，r1）：cross-runtime golden fixture 覆盖面过窄，未受本次修复影响。
- R-007（LOW，r2 新增）：`token.test.ts` AC-006 测试体内动态 import 导致秒级耗时，是"预存 flake"说法的合理技术根源，非本次修复引入，建议顺手治理但不阻塞。
