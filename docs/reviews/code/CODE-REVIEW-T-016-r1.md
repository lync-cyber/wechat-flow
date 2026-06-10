---
id: "code-review-T-016-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-016"]
---

# CODE-REVIEW T-016 — sanitize 阶段 (security_sensitive: true)

Layer 1 delegated to hook（项目配置了 PostToolUse lint hook，编码阶段已通过 biome 实时修复）

## 审查范围
- `packages/core/src/pipeline/sanitize.ts`
- `packages/core/src/sanitize/schema.ts`
- `packages/core/src/pipeline/css-attr-filter.ts`
- `packages/contracts/src/mcp/tool-contracts.ts`
- `packages/core/src/render.ts`
- `tests/core/sanitize.test.ts`

---

## ① postPaste 实现偏差

`renderMarkdownResponseSchema`（tool-contracts.ts line 17）使用 `z.boolean().default(false)`。`render.ts` 硬编码 `postPaste: false`（line 29）。

**裁决**：schema 侧的 `.default(false)` 引入了一个隐患：当 `composeCopy` 路径（Sprint 4 T-030）最终返回 `postPaste: true` 时，若调用方用 `renderMarkdownResponseSchema.parse(response)` 解析，而响应对象中 `postPaste` 字段因某种原因缺失（如序列化遗漏），`.default(false)` 会静默吞掉缺失，令 `true` 信号丢失，成为 false。

任务卡 AC-005 要求"renderMarkdownResponseSchema 能解析含 postPaste 字段的响应"，测试（line 122–134）只覆盖了 `postPaste: false` 的解析路径，**未测试 `postPaste: true` 能正确穿透 schema**。当前 `render.ts` 三路径（renderMarkdown/Preview/render_markdown）均 hardcode `false` 符合 arch M-002 约定；`composeCopy` 为 `true` 的路径尚未实现（T-030），但 schema 的 default 已埋下未来静默截断的风险。

见问题 R-001。

---

## ② css-attr-filter 主路径接线

取证路径：`render.ts` → `inlineStyle(hast)`（line 21） → `inline-style.ts` line 84 → `filterCssAttrs(mergedStyle)`。

`filterCssAttrs` **已在生产路径上**：通过 `inlineStyle` 内部调用，在 `sanitizeHast` 之后、`serializeHast` 之前执行。`sanitizeHast` 只控制允许哪些 `style` 属性存在，`filterCssAttrs` 在 `inlineStyle` 阶段对 style 值内容进行过滤。

`sanitizeHast` 本身不导出（index.ts 无导出），外部消费者无法跳过 `inlineStyle` 单独调用 `sanitizeHast`，故不存在消费侧绕过风险。

**结论**：接线完整，无缺口。

---

## ③ style 属性放行面 / XSS 缝隙

`wechatFlowSanitizeSchema`（schema.ts line 8）将 `"style"` 追加到 `"*"` 通配符条目，即所有元素的 `style` 属性均通过 hast-util-sanitize 放行。后续在 `inlineStyle` 阶段 `filterCssAttrs` 对 style 值进行二次过滤。

**缝隙分析**：

1. **已覆盖**：`expression(`, `@import`, `javascript:`, `behavior:`, `url(javascript:` 均在 `css-attr-filter.ts` 的 block patterns 内（line 1–7）。
2. **未覆盖 — unicode/CSS 转义绕过**：`filterCssAttrs` 的正则针对明文字符串，不处理 CSS 转义序列（如 `j\61vascript:` → `javascript:`）或 unicode 编码（`\0000006A`）。攻击者可构造 `style="color: red; j\61vascript: alert(1)"` 绕过当前 `\bjavascript\s*:/i` 正则。
3. **未覆盖 — `-moz-binding`**：IE/Firefox 旧式绑定 XSS 载体 `-moz-binding: url(...)` 未在 block patterns 中。
4. **`@import` 覆盖范围限定**：`/@import\b/i` 只匹配 `@import` 关键字出现在 style 属性值中，正常情况 style 属性不应含 `@import`（属于样式表层，非 style 属性），此模式保留即可，但缺乏测试验证。

缝隙 2 是 style 属性 XSS 的经典绕过向量，在微信编辑器粘贴场景下若上游来源为不可信 HTML 则存在实际风险。

见问题 R-002。

---

## ④ sanitize 插入位置

`render.ts` 流水线顺序：`parseMarkdown` → `transformToHast` → **`sanitizeHast`**（line 17） → `injectNodeIds`（条件，line 18–20） → `inlineStyle`（line 21） → `serializeHast`。

sanitize 在 `transformToHast` 之后、`injectNodeIds` 之前执行。`injectNodeIds` 注入的 `data-wf-node-id` 属性在 sanitize 之后添加，不受 sanitize 剥除影响。`renderMarkdown` 默认路径（不传 `injectNodeIds`）中 `injectNodeIds` 不执行，不存在 data 属性被剥除问题。

T-094 既有测试（`render.ts` 路径 + `use-bidirectional-highlight` 接线）已在 173/173 绿中验证，无需重验。

**结论**：插入位置正确，T-094 路径不受影响。

---

## ⑤ schema.ts 类型强转

`schema.ts` line 15：`const baseAttrs = (base.attributes ?? {}) as Record<string, string[]>`。

`hast-util-sanitize` 的 `Schema.attributes` 类型实际为 `Record<string, Array<string | [string, ...Array<string | RegExp>]>>`（允许列表项为 `[attrName, allowedValue1, ...]` 元组形式）。将其强转为 `Record<string, string[]>` 后，在 `mergedAttributes[tag] = [...existing, ...(attrs as string[])]` 合并时，若 `existing` 中含元组形式的 allowlist 条目（如 `["class", /^wf-/]`），会被展开为 `string[]` 破坏其结构。

当前 `wechatFlowSanitizeSchema` 和 `defaultSchema` 的 attributes 均未使用元组 allowlist 形式，所以实测不会触发。但 `applySanitizeExtension` 是对外公开 API（被 AC-003 测试调用），若下游传入含元组 allowlist 的 extension，强转会静默损坏 schema。

见问题 R-003。

---

## ⑥ 测试质量

**AC-001（script 标签移除）**：双断言——`expect(output).not.toMatch(/<script/i)` + `expect(output).not.toContain("alert(1)")`，结构断言与载体断言双覆盖，符合 security_sensitive 任务要求。

**AC-002（css-attr-filter 过滤 javascript:）**：测试输入 `"color:red; javascript:void(0)"`，断言 `not.toContain("javascript:")` + `toContain("color:red")`。覆盖了 `BLOCK_DECLARATION_PATTERNS` 的 `\bjavascript\s*:/i` 路径。

**AC-003（extendSanitizeSchema 自定义标签）**：断言 `<wf-card` 和 `variant="feature"` 均存在，有效验证了 allowlist 合并逻辑。

**AC-004（expression() 过滤，pre-existing PASS）**：测试输入 `"width: expression(alert(1))"`，双断言 `not.toContain("expression(")` + `not.toContain("alert(1)")`。这是 AC-004 被标注为 pre-existing PASS 的用例，pattern `BLOCK_WHOLE_VALUE_PATTERNS` 覆盖。有独立测试锚定。

**AC-005（postPaste 字段）**：
- 第一个 it：`expect((result as Record<string, unknown>).postPaste).toBe(false)` — 使用类型转换绕过类型系统，若 `RenderResult` 类型未声明 `postPaste` 字段则属 workaround，但功能断言有效。
- 第二个 it（schema 解析）：仅测试 `postPaste: false` 解析，**未覆盖 `postPaste: true` 能正确穿透 schema 且不被 default(false) 重置**。当 composeCopy 路径实现时此测试空白将导致静默回归。

**缺失覆盖**：① CSS unicode/转义绕过路径无测试；② `-moz-binding` 无测试；③ 多重嵌套 XSS（如 style 属性中混合 script 编码）无测试。对于 `security_sensitive: true` 任务，这些绕过向量缺乏测试锚定。

见问题 R-004、R-005。

---

## 问题汇总

### [R-001] MEDIUM: postPaste schema default(false) 可静默截断 composeCopy true 路径
- **category**: security
- **root_cause**: self-caused
- **描述**: `renderMarkdownResponseSchema` 使用 `z.boolean().default(false)`。当 Sprint 4 T-030 实现 `composeCopy` 返回 `postPaste: true` 时，若响应对象序列化/传递过程中 `postPaste` 字段丢失，`.default(false)` 会静默将其设为 `false`，令 true 信号被截断而不报错。当前所有 render 路径 hardcode `false` 未触发，但埋下未来静默回归风险。测试 AC-005 仅覆盖 `postPaste: false` 解析，未验证 `postPaste: true` 能穿透 schema。
- **建议**: 将 schema 字段改为 `z.boolean()`（无 default），在 `renderMarkdown` 等实现侧显式赋值；或在 AC-005 增加 `postPaste: true` 解析验证用例，确保 default 不会遮盖 true 信号。T-030 实现前应补充该测试锚定。

---

### [R-002] HIGH: css-attr-filter 未防御 CSS 转义/unicode 绕过
- **category**: security
- **root_cause**: self-caused
- **描述**: `filterCssAttrs` 中的 block patterns 对明文字符串有效，但不处理 CSS 转义序列（如 `j\61vascript:` 解码后为 `javascript:`）或 unicode 转义（`\6A`）。攻击者可构造 `style="j\61vascript: alert(1)"` 或 `style="color: red; \6A\61vascript: alert(1)"` 绕过 `/\bjavascript\s*:/i` 正则。微信编辑器会在粘贴时对这类转义进行渲染/解码，XSS 载体有效。此外 `-moz-binding: url(...)` 未在 block patterns 中，属于旧式 Firefox XSS 向量。
- **建议**: (1) 在 `filterCssAttrs` 执行 block pattern 匹配前，先对 CSS 值调用 CSS 转义解码（可用 `css-selector-parser` 或简单 `value.replace(/\\[0-9a-fA-F]{1,6}\s?/g, (m) => String.fromCodePoint(parseInt(m.slice(1), 16)))` 规范化）；(2) 补充 `-moz-binding` 到 `BLOCK_DECLARATION_PATTERNS`；(3) 为以上两个绕过向量补充测试。

---

### [R-003] LOW: applySanitizeExtension 类型强转可破坏元组形式 allowlist
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `schema.ts` line 15 将 `base.attributes` 强转为 `Record<string, string[]>`，忽略了 hast-util-sanitize 支持的 `[attrName, ...allowedValues]` 元组形式。当下游传入含元组 allowlist 的 extension 时，合并逻辑 `[...existing, ...(attrs as string[])]` 会将元组展开为扁平字符串数组，静默损坏 schema 语义。当前内置 schema 未使用元组格式，未实际触发。
- **建议**: 修正 `baseAttrs` 的类型为 `hast-util-sanitize` 实际的 attribute 类型（`Record<string, Array<string | [string, ...Array<string | RegExp>]>>`），去掉 `as Record<string, string[]>` 强转；或在函数 JSDoc 中明确注明"不支持元组 allowlist 格式"以防下游误用。

---

### [R-004] MEDIUM: AC-005 schema 测试未覆盖 postPaste: true 穿透路径
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `sanitize.test.ts` AC-005 第二个 it 只测试了 `postPaste: false` 的 safeParse 路径。`renderMarkdownResponseSchema` 的 `z.boolean().default(false)` 在字段缺失时静默补 false，但如果 composeCopy 路径（T-030）传入 `postPaste: true`，同一 schema 能否正确穿透未被验证。这是 T-016 作为安全敏感任务应当锚定的前向契约测试。
- **建议**: 在 AC-005 补充第三个 it：`renderMarkdownResponseSchema.safeParse({ ..., postPaste: true })` 断言 `parsed.data.postPaste === true`，确保 true 值不被 default 截断。

---

### [R-005] MEDIUM: security_sensitive 任务缺乏 CSS 转义绕过测试锚定
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: 对于 `security_sensitive: true` 的 T-016，`filterCssAttrs` 的测试（AC-002、AC-004）仅覆盖明文 XSS 载体，无 CSS 转义绕过（`j\61vascript:`）、unicode 转义（`\6A`）、`-moz-binding` 的测试用例。若攻击者使用编码绕过，filterCssAttrs 当前实现会放行，但测试套件不会捕获这个回归。
- **建议**: 补充至少两个转义绕过测试：(1) `filterCssAttrs("j\\61vascript: alert(1)")` 断言输出不含 `javascript:` 或整个值被清空；(2) `filterCssAttrs("color: red; -moz-binding: url(evil)")` 断言 `-moz-binding` 被过滤。需与 R-002 实现修复配套落地。

---

## 判定结论

**verdict: needs_revision**

存在 HIGH 级别问题（R-002：css-attr-filter CSS 转义绕过，security_sensitive 任务）。

| 编号 | 严重等级 | category | 维度 |
|------|---------|----------|------|
| R-001 | MEDIUM | security | ① postPaste default(false) |
| R-002 | HIGH | security | ③ CSS 转义绕过 |
| R-003 | LOW | error-handling | ⑤ 类型强转 |
| R-004 | MEDIUM | test-quality | ⑥ AC-005 缺 true 穿透测试 |
| R-005 | MEDIUM | test-quality | ⑥ security 缺转义绕过测试 |

**各维度一行结论**：
- ① postPaste: schema `.default(false)` 可静默截断 composeCopy true 路径，当前 hardcode false 未触发，T-030 前需补测试锚定 (MEDIUM)
- ② css-attr-filter 接线: 已通过 `inlineStyle` 在生产路径落地，接线完整 (无问题)
- ③ style 放行面: 明文 XSS 载体覆盖完整，CSS 转义绕过未防御 (HIGH)
- ④ sanitize 插入位置: transformToHast 之后、injectNodeIds 之前，T-094 路径不受影响 (无问题)
- ⑤ schema 类型强转: 元组 allowlist 格式未被当前 schema 使用，暂不触发但存在 API 契约漏洞 (LOW)
- ⑥ 测试质量: 主路径双断言合格，缺 postPaste: true 穿透测试和 CSS 转义绕过测试锚定 (MEDIUM×2)
