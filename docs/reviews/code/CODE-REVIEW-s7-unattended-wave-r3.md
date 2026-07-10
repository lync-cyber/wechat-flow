---
id: "code-review-s7-unattended-wave-r3"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-176", "T-177", "T-178", "T-186", "T-187"]
consumers: ["orchestrator", "user"]
---

# CODE-REVIEW: Sprint 7 无人值守波跨卡对抗审查 (r3 — R-006 大小写归一化修复终验)

范围：commit `812fec6`（`fix(core): FORBIDDEN CSS 校验比较归一化大小写，堵住 R-001/R-002 的大小写绕过面`），针对 `CODE-REVIEW-s7-unattended-wave-r2.md` R-006（HIGH）修复做终验。方法论同 r1/r2：主动证伪，不采信转述，逐条亲测。

## 修复内容核实（读 diff）

- `packages/core/src/registry/style-guard.ts::evaluateDeclaration`：新增 `propertyLower`/`valueLower` 派生变量，`FORBIDDEN_CSS_PROPS.has()`/`FORBIDDEN_DISPLAY_VALUES.has()`/`FORBIDDEN_POSITION_PROPS.has()`/`property.startsWith("-webkit-")`/`FORBIDDEN_VALUE_PATTERN_EXCEPTIONS.has()` 五处判断全部改用归一化后的小写变量比较；`reportedValue`/错误 `reason` 字符串插值仍使用原始 `property`/`trimmedValue`（未改写产物呈现值，仅改写比较逻辑）——**确认与 commit message 描述完全一致，非表面转述**。
- `packages/contracts/src/platform/wechat-paste.ts::isForbiddenCssValue`：入口 `stripped = value.toLowerCase()`；两轮例外白名单 `split/join` 均对 `exception` 调用 `.toLowerCase()` 后再匹配；最终 `FORBIDDEN_VALUE_PATTERNS` 匹配也对 `pattern.toLowerCase()` 比较——四处比较点全部归一化，逻辑自洽（`FORBIDDEN_VALUE_PATTERN_EXCEPTIONS`/`FORBIDDEN_VALUE_PATTERNS` 源常量本身已全部是小写字面量，归一化不引入例外条目自身失效风险）。
- 新增/扩测试：`tests/contracts/platform-constants-sync.test.ts`（+7，含大写 `-WEBKIT-`/`@MEDIA`/`:HOVER` 正向命中 + 大写变体例外白名单负向对照）、`packages/core/src/registry/variant.test.ts`、`tests/core/guard/construct-time-forbidden-guard.test.ts`、`tests/core/pipeline/forbidden-value-pattern-output.test.ts`、`tests/mcp-server/tools/register-variant.test.ts` 均有增量。全仓测试从 r2 的 4463 增至 **4481**（+18，与"14 个新测试"量级一致，未见夸大）。

## 逐项复验结果

### 1. 重放 r2 大小写探针 —— **全部拦截**

重放 r2 探针脚本（`probe-r2-adversarial.mts`）：

| 探针 | r2 结果 | r3 结果 |
|------|---------|---------|
| `registerVariant` `DISPLAY: GRID` | 绕过 | **`{property:"DISPLAY", value:"GRID", reason:'display value "GRID" is on the FORBIDDEN denylist'}`，已拦截** |
| `registerVariant` `Display: Grid` | 绕过 | **已拦截**（reason 同上模式） |
| `registerVariant` `display: INLINE-GRID` | 绕过 | **已拦截** |
| `registerVariant` `background: -WEBKIT-linear-gradient(...)` | 绕过 | **已拦截**（`isForbiddenCssValue` 归一化后命中） |
| `customCss` `background: -WEBKIT-linear-gradient(...)` | 渗透进最终 HTML | **`html contains -webkit- (case-insens)? false`，已拦截** |
| `customCss` `background: -WebKit-linear-gradient(...)`（混合大小写） | 渗透 | **已拦截** |

原 r2 记录的全部绕过样本本轮重放均转为拦截，且拒绝原因（`rejectedDeclarations`/`reason` 字段）语义正确（明确指向 FORBIDDEN denylist 命中，非泛化错误）。**R-006 修复真实生效，非表面绕过。**

对照组（不应被误伤，本轮同步复核）：`background: url(grid.png)`（值含"grid"子串但语义无关）在 `registerVariant` 侧仍**正确通过**，未见大小写归一化引入新的误杀。

### 2. 最后一轮绕过尝试

#### Unicode / locale 边角

- **土耳其大写带点 İ（U+0130）构造 `-WEBKİT-transform`**：`turkishWebkit.toLowerCase()` 输出 `-webki̇t-transform`（i + 组合点上符 U+0307，非纯 ASCII "i"）——证实 JS 内置 `.toLowerCase()` 对该字符的默认（locale-independent）行为不会把 İ 折叠成普通 ASCII "i"，与 `.toLocaleLocaleCase("tr")` 的土耳其locale特殊行为不同（协调者要求的"验证即可"点已确认：本项目用的是 `.toLowerCase()` 而非 `.toLocaleLowerCase()`，不受运行时 locale 影响，属固定的 Unicode 默认大小写映射，非"每次运行结果不同"的不稳定源）。该探针经 `registerVariant` 提交，被**白名单缺席路径**（`isWhitelistedProperty`，非 FORBIDDEN 分支）拦截——因为无论大小写折叠结果如何，这个非 ASCII 属性名从未在 `CSS_SAFE_PROPERTIES` 白名单内，默认拒绝架构独立兜底，不依赖本次归一化修复。
- **土耳其小写无点 ı（U+0131）构造 `-webkıt-transform`**：同样被白名单缺席路径拦截，机理同上。
- **全角 Unicode 构造 `display: ｇｒｉｄ`（U+FF47 等全角字符，非 ASCII "grid"）**：`registerVariant` 侧**未被拦截**（注册成功）。经核实**非缺陷**——全角字符串在任何真实 CSS 解析器/微信渲染器中都不会被识别为 `grid` 关键字（CSS 规范层面关键字匹配限定 ASCII 范围），该值本质上是一个渲染器无法识别的无效声明，等同于该属性被忽略，不构成真实攻击路径；这也印证 FORBIDDEN denylist 的"归一化"只需覆盖 ASCII 大小写折叠（`.toLowerCase()` 现有实现已满足），无需额外处理非 ASCII 视觉相似字符（因为那些字符串本身对目标渲染器无害）。

综合结论：Unicode/locale 边角未发现新的可利用绕过；土耳其字符两个探针因架构上"默认拒绝的属性名白名单"独立兜底而安全，全角字符探针因目标渲染器不识别该关键字而无害，均非本次归一化修复需要覆盖的范围。

#### 混合大小写例外白名单（不误杀）

- **`registerMark({id:"r3-mixed-case-emphasis-probe", style:"-Webkit-Text-Emphasis: filled circle"})`**：**注册成功**（`FORBIDDEN_VALUE_PATTERN_EXCEPTIONS.has(propertyLower)` 正确识别混合大小写变体为已知例外，不误杀）。
- **真实内置 emphasis mark**（`packages/marks/src/marks/emphasis.ts`，小写声明 `-webkit-text-emphasis`）：渲染 `:emphasis[重点]` 后确认 `-webkit-text-emphasis` 原样存活于最终 HTML，`nodeChangeRecords` 无 `strip-forbidden-value-pattern` 命中——**修复未引入对既有上线功能的回归**。
- **`isForbiddenCssValue` 对大写变体例外的直接验证**（对照新增测试 `tests/contracts/platform-constants-sync.test.ts` R-006 段）：`-WEBKIT-PRINT-COLOR-ADJUST: exact`、`-WEBKIT-OVERFLOW-SCROLLING: touch`、大写 `-WEBKIT-TEXT-EMPHASIS` 组合声明均返回 `false`（不判定为 FORBIDDEN）——三条例外条目在大小写归一化后全部正确保留豁免语义，测试断言与本轮独立探针结果一致。
- **`registerVariant` 侧的 `-Webkit-Text-Emphasis`**：仍被拦截，但拦截原因是"不在白名单"（`isWhitelistedProperty`），**不是** FORBIDDEN 误杀——`registerVariant` 的属性名白名单本就不含任何 `-webkit-*` 属性（无论是否例外），这是既有设计（MCP 用户输入面最小暴露原则），例外白名单语义上只服务于 `registerBlock`/`registerTheme`/`registerMark`/customCss 的 FORBIDDEN-denylist 校验路径，两者定位不同，非本轮回归。

结论：混合大小写例外在其设计生效的路径（`registerMark`/`isForbiddenCssValue` 直接调用）上正确不误杀；`registerVariant` 侧的"仍被拦截"是既有白名单架构的预期行为，非本次修复引入的误伤。

#### Tab / 换行分隔的声明变体

- `registerMark({style:"color:red;\tposition:\nabsolute"})`：**正确拦截**（`property:"position"` 命中 FORBIDDEN denylist）——`parseMarkStyleDeclarations` 对每个 `;` 分隔片段做 `.trim()`，制表符/换行符在属性名与值两侧被正确清除，未产生解析偏差。
- `registerMark({style:"color:red;\n  DISPLAY:\tGRID  "})`：**正确拦截**（`property:"DISPLAY"`/`value:"GRID"` 命中 display FORBIDDEN denylist，证明大小写归一化与空白裁剪两个机制正确共同生效，无相互干扰）。

结论：制表符/换行符分隔变体未发现解析层面的绕过面。

### 3. R-001/R-002/R-006 全链闭合确认

- **R-001（CRITICAL，r1）**：`registerVariant` 值级 FORBIDDEN 校验（2e18b81）+ 大小写归一化（812fec6）——**全链闭合**。原始探针（小写）与大小写变体探针均已拦截。
- **R-002（HIGH，r1）**：`customCss` 侧新增 output 相 `strip-forbidden-value-pattern` 规则（2e18b81）+ 大小写归一化（812fec6）——**全链闭合**。原始探针与大小写变体探针均已拦截；例外白名单（emphasis mark）未被误杀。
- **R-006（HIGH，r2）**：**本轮闭合**。r2 记录的全部大小写绕过样本已重放确认拦截；新增的 Unicode/locale/tab-newline 对抗探针未发现新的绕过面。

### 4. R-003/R-004/R-005/R-007 disposition 复核 —— **维持不变**

`git show 812fec6 --stat --name-only` 核实本次修复涉及文件（`style-guard.ts`/`wechat-paste.ts`/4 个测试文件）与 R-003（`strip-width-height-inline`/`gallery.ts`/`decorate-utils.ts`/`render.ts` 管线顺序）、R-004（`inline-style.ts` 槽位继承链）、R-005（`tests/cross-runtime/fixtures.ts`）、R-007（`tests/core/registry/token.test.ts`）涉及的任何文件**零交集**。独立重算 cross-runtime 黄金哈希（`computeFixtureHashes()` vs `EXPECTED_HASHES`）确认三条 fixture 仍 `ALL MATCH: true`，无漂移。四项 disposition（R-003/R-004 MEDIUM、R-005/R-007 LOW，均非阻塞）维持 r2 判定不变，本轮不重新展开论证。

### 5. 门禁抽验

- `pnpm vitest run` 全量：**`276 passed | 2 skipped (278)` files / `4481 passed | 10 skipped (4491)` tests，零失败**（较 r2 的 4463 净增 18，与本次修复新增测试量级一致）。
- `pnpm typecheck`（turbo 50 tasks）：全绿；`npx tsc -p tests/tsconfig.json --noEmit`：exit 0。
- `pnpm biome check .`：`Checked 866 files. No fixes applied.`
- cross-runtime 黄金哈希独立重算：无漂移（见上）。

## 亲测证据汇总

1. 重放 r2 探针脚本 `probe-r2-adversarial.mts`：全部此前记录为 `[BYPASS?]` 的行本轮均变为 `[BLOCKED]`，具体输出见上表；customCss 侧两条大写/混合大小写 webkit 值探针 `html contains -webkit- (case-insens)?` 从 `true` 变为 `false`。
2. 新增探针脚本 `probe-r3-final.mts`：
   - Unicode 边角：`-WEBKİT-transform`/`-webkıt-transform`（土耳其变体）经 `registerVariant` 均因白名单缺席被拦截；`display: ｇｒｉｄ`（全角）未被拦截但确认对真实渲染器无害。
   - 混合大小写例外：`registerMark({style:"-Webkit-Text-Emphasis: filled circle"})` 注册成功（例外正确识别）；真实 emphasis mark 渲染后 `-webkit-text-emphasis` 存活确认。
   - Tab/换行变体：`registerMark({style:"color:red;\tposition:\nabsolute"})` 与 `{style:"color:red;\n  DISPLAY:\tGRID  "}` 均正确拦截。
3. `git show 812fec6` 全量 diff 通读，逐处比对代码改动与 commit message 描述、r2 report R-006 建议的修复方案（`.toLowerCase()` 归一化、比照 `isWhitelistedProperty` 先例）完全一致。
4. `pnpm vitest run` 全量：4481 passed/10 skipped，0 失败。
5. `pnpm typecheck` + `npx tsc -p tests/tsconfig.json --noEmit` + `pnpm biome check .`：全绿。
6. 独立重算 cross-runtime 黄金哈希：`ALL MATCH: true`，与 r1/r2 记录一致，无漂移。
7. `git show 812fec6 --stat --name-only` 核实与 R-003/R-004/R-005/R-007 涉及文件零交集。

## Verdict

**approved**

r1 CRITICAL（R-001）与 HIGH（R-002）、r2 HIGH（R-006）三条阻塞项经三轮独立对抗性复验（含原始探针重放 + 大小写变体 + Unicode/locale 边角 + tab/换行解析边界 + 例外白名单不误杀四类对抗尝试）**全部确认真实闭合，未发现新的 CRITICAL/HIGH**。按 COMMON-RULES §三态判定逻辑，无 CRITICAL/HIGH 且无 MEDIUM/LOW 待办产生于本轮（本轮未新增问题）——`approved`。

### notes_summary（跨轮次遗留，非阻塞，供 backlog 参考）

- R-003（MEDIUM，r1）：T-178 回归测试 / code-review 将 gallery/compare/dropcap table-cell 场景表述为"生产真实场景"，但管线顺序（authoring 相早于 `inlineStyle()` 注入）证明该规则对这三类场景从未生效过；不构成功能缺陷，建议收窄测试注释与任务卡表述。
- R-004（MEDIUM，r1）：T-176 槽位继承链 `childAmbientBlock.slotInherited` 取自槽位自身声明而非含 `bodyBaseline` 的合并值，理论上存在"槽位内嵌套非槽位/非主题 token 标签且槽位自身未声明可继承属性"的静默丢失缺口，当前代码库因所有实际嵌套场景（dialog bubble）均显式声明 `color` 而未触发；建议补边界测试或调整实现消除。
- R-005（LOW，r1）：`tests/cross-runtime/fixtures.ts` 仅 3 条 fixture，均不含 dialog/steps/gallery/table-cell 等本波实际改动路径，"golden SHA 未变"结论真实但覆盖面有限；建议后续补充相应 fixture。
- R-007（LOW，r2）：`tests/core/registry/token.test.ts` 的 `AC-006` 两条用例在测试体内动态 `import()` 整个 core 包 barrel（实测单用例耗时 3.2~3.9 秒，同文件其余用例 <10ms），是 implementer 所称"token.test.ts 预存 flake"的合理技术根源，非功能性回归；建议后续把该动态 import 提至模块级/`describe` 顶层复用。
