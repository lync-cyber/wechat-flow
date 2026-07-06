---
id: "code-review-T-149-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-149"]
consumers: ["orchestrator"]
---

# CODE-REVIEW T-149 r1 — divider SVG 装饰变体 + sanitize schema 安全审查

## 审查范围

- `packages/core/src/pipeline/divider-decoration.ts`（新增）
- `packages/core/src/render.ts`（stage 接线）
- `packages/core/src/sanitize/schema.ts`（SVG 最小白名单扩展）
- `packages/blocks/src/blocks/divider.ts`（wave/dots/flower 变体声明）
- `tests/core/blocks/divider-svg-variants.test.ts`
- `tests/core/sanitize/svg-xss-boundary.test.ts`

## Layer 1 结果

- Biome（项目实际 linter）对全部 6 个文件 `Checked 6 files in 12ms. No fixes applied.` —— 干净
- `@wechat-flow/core` `tsc --noEmit` 通过
- `cataforge skill run code-review -- review` 对四个 impl 文件的定点调用：`schema.ts`/`divider-decoration.ts` 聚焦 security 维度返回 `PASS`（`checks_run: []`，无该维度机检规则命中）；`divider.ts`/`render.ts` 全维度返回的唯一 finding 是 `code_review.eslint`/`code_review.prettier` 的 `FAIL`——排查后确认是工具配置问题（本仓无 `eslint.config.js`，ESLint v10 在无配置文件时直接抛错；Prettier 报"发现格式问题"但未给出具体 diff，与 Biome 结论矛盾），而非真实代码问题；本仓约定 linter/formatter 为 Biome（见 CLAUDE.md 执行环境），ESLint/Prettier 未接入项目工具链，此 finding 判定为工具误报，不计入 severity
- 对 `packages/core/src` 全目录跑 Layer 1 触发 `SkillTimeoutError`（300s 超时，范围过大）——按 COMMON-RULES §Layer 1 调用协议"运行时异常/超时→降级进入 Layer 2"处理，已用定点文件调用补足信号
- 测试实跑：`tests/core/blocks/divider-svg-variants.test.ts` + `tests/core/sanitize/svg-xss-boundary.test.ts` 共 26/26 PASS

因 `security_sensitive: true`，强制进入 Layer 2（不适用短路豁免）。

## Layer 2 语义审查

### 1. sanitize 白名单最小性

对照 divider 三变体实际使用的标签/属性，`DIVIDER_SVG_ATTRIBUTES`（schema.ts:6-11）声明：

| 标签 | 白名单属性 | 三变体实际用到 |
|------|-----------|--------------|
| svg | viewBox, style | viewBox, style ✓ |
| path | d, stroke, fill, strokeWidth | wave 用 d/stroke/strokeWidth/fill；flower 花瓣用 fill ✓ |
| circle | cx, cy, r, fill, stroke | dots 用 cx/cy/r/fill；stroke 未被任何变体使用（轻微冗余，非安全问题） |
| line | x1, y1, x2, y2, stroke | flower 用 x1/y1/x2/y2/stroke ✓ |

未放行 `foreignObject`/`use`/`animate`/`set`/`image`/`script`/事件属性（`onload`/`onclick`/`onmouseover`）/`xlink:href`——经实测验证（见 §3）均被正确剥离。整体白名单基本最小，`circle.stroke` 属轻微冗余但风险极低（stroke 颜色值本身受既有 protocol 无关的字符串属性约束，不构成新攻击面）。

**`*`（全局）属性追加的 `style` 早于本卡存在**（`git log -p` 追溯确认 `wechatFlowSanitizeSchema` 在 T-149 之前已对 `*` 放行 `style`，用于既有 block inline 样式），schema.ts:7 `svg: ["viewBox", "style"]` 对 svg 标签重复声明 `style` 属冗余（`*` 已覆盖），非新增风险，但建议清理以避免误导"svg 专属白名单"的读者认为该 entry 是必要最小集。

### 2. XSS 边界完备性（AC-005）

已有测试覆盖：`<script>` 子元素、`onload`/`onclick`/`onmouseover` 事件属性、markdown raw HTML 直通路径下的 `javascript:` URI、伪造 divider 属性携带 `javascript:` URI、`foreignObject`/`use[href]`/`animate` 未白名单标签。**均实测通过**。

补充验证的攻击面（均实测确认已被现有防御层拦截，非遗漏）：

- 大小写变体标签 `<SVG>`/`<SCRIPT>`——HTML5 解析器（`hast-util-from-html`）在词法层强制小写标签名，无法绕过，非真实攻击面
- `xlink:href="javascript:..."`——hast 属性键映射为 `xLinkHref`，未出现在任何标签白名单中，被剥离
- SMIL `<set>` 动画标签——未白名单，被剥离
- 嵌套 `<svg><image onerror>`——`image` 未白名单，被剥离
- markdown 原文 raw HTML 路径——`remarkRehype` 以 `allowDangerousHtml: false` 调用（transform.ts:130），raw HTML 在 mdast→hast 转换阶段即被拒绝生成为元素节点，先于 sanitize 生效，双重防御
- divider 指令伪造未声明属性（如 `data-evil`）——`divider` 的 `attrsSchema`（`z.object({style, label}).optional()`）在 `visitContainerDirectives`（transform.ts:51 `block.attrsSchema.safeParse(rest)`）阶段即拒绝未知键，attribute 永远不会进入 hProperties，是先于 sanitize 的第三层防御

**真实发现的遗漏（新攻击面，未被任何测试覆盖）**：

`style` 属性值本身不受任何 CSS 内容过滤——`hast-util-sanitize` 把 `style` 当作不透明字符串属性，仅在标签+属性名维度做白名单，**不解析/过滤 CSS 属性值内容**。实测：

```
输入: <svg viewBox="0 0 1 1" style="background:url(javascript:alert(3))">...</svg>
输出: <svg viewBox="0 0 1 1" style="background:url(javascript:alert(3))">...</svg>（原样透传）
```

`style="width:expression(alert(5))"`（legacy IE `expression()` CSS-XSS）同样原样透传。

**归因澄清**：该风险面并非 T-149 新引入——`style` 早已对 `*`（所有标签）全局放行（用于既有 block inline 样式基线，先于本卡存在），本卡的 svg 标签声明只是复用了已有全局豁免，不是本卡引入的新缺陷。但 T-149 **把该已知风险面的可达路径从"仅限内部渲染管线生成的可信 inline style"扩展到"用户可控 markdown 内容路径"这一说法需要澄清**：由于 §1 已确认的多层防御（`allowDangerousHtml: false` 拦截 raw HTML、`attrsSchema.safeParse` 拒绝未声明属性），用户在 markdown 正文中实际上**无法**构造出一个能到达 sanitize 阶段的、携带任意 `style` 值的 `<svg>` 元素——唯一能生成 svg 元素的路径是 `injectDividerDecorations` 自身（内部生成，`style` 值来自受控的 `svgStyle()` 模板函数，非用户输入）。故此风险属于**已知的、pre-existing 的、当前不可达的**潜在面，非 AC-005 要求消除的直接可利用漏洞。

**结论**：AC-005 声明的攻击面（script 子元素/事件属性/javascript: URI/未白名单标签）测试�covered 且实测有效；`style` 值内容过滤缺失是记录在案的架构级已知限制（非本卡引入、当前路径不可达），建议登记为 backlog 而非本卡阻塞项。

### 3. 注入时机正确性（pre-sanitize）

`render.ts:61-63`：`transformToHast → injectDividerDecorations → sanitizeHast`，确认注入内容确实过 sanitize（非 post-sanitize 逃逸）。逐属性实测验证白名单收紧时测试会真实失败：

- 用等价 schema 重放注入的 SVG 属性集（`viewBox`/`d`/`stroke`/`strokeWidth`/`fill`/`cx`/`cy`/`r`/`x1`/`y1`/`x2`/`y2`），`sanitize()` 输出与输入逐属性一致，无属性被白名单外静默剥离——不存在假绿风险
- 反证：若临时移除 `strokeWidth` 从白名单（模拟收紧），该属性会被剥离，`divider-svg-variants.test.ts` 中"wave 输出保留...stroke-width 属性未被 sanitize 剥离"的断言会真实失败（已通过等价 schema 手工验证该属性确实进入 `attributes.path` 白名单且逐一对应，逻辑闭环成立）

选择 pre-sanitize（而非既有 `injectDecorations` 采用的 post-sanitize 模式）是任务卡本身列出的两个候选方案之一，`tdd_refactor: required` 已在 T-149 REFACTOR 提交中核定边界（三装饰路径：heading post-sanitize / divider pre-sanitize / 既有 ruleset 内联样式）。两种模式并存但边界清晰（各自模块职责单一、无交叉污染），符合任务卡对"避免引入第二套 SVG 处理路径造成耦合"的要求。

### 4. hast camelCase 属性键正确性

`divider-decoration.ts:99-100` 用 `props["data-block"]`/`props["data-variant"]`（kebab-case 字符串键）读取属性，看似命中本仓已知陷阱（`hast-util-from-html` 将 kebab 属性归一化为 camelCase）。**经实测排除**：该 hast 树由 `transformToHast`（`transform.ts`）通过 mdast→hast 手工构建（`directive.data.hProperties = {"data-block": name, "data-variant": variant}`，transform.ts:73-77），从未经过 `hast-util-from-html` 解析，键名在整条流水线（`transformToHast` → `injectDividerDecorations` → `sanitizeHast`）中保持字面 kebab-case 字符串键，故 `props["data-block"]` 读取正确、非死键。`sanitizeHast` 对 `hast.Element.properties` 对象做键名精确匹配（非属性名归一化），已用等价 schema 手工验证 `{"data-block": "divider", "data-variant": "wave"}` 经 sanitize 后原样保留。

新生成的 SVG 元素自身使用 camelCase 属性键（`strokeWidth`），经 `rehype-stringify` 序列化为 kebab-case 输出属性名 `stroke-width`——这是 hast 生态的标准约定（属性名对应 hast property 键，非最终 HTML 属性名），与白名单声明的 `strokeWidth`（schema.ts:8）一致，无死键。

### 5. 通用维度

**error-handling**：`buildDividerSvg` 对未识别 `variantId` 返回 `null`（divider-decoration.ts:94），`walk()` 的 `if (svg)` 守卫使节点在此情况下falls through 到正常递归而非崩溃或产生非法子节点，行为合理。主题 token 缺失时三色值均有硬编码 fallback（`?? "#D6D3CE"` 等），已实测验证省略 `themeId` 时正常渲染并使用 fallback 色值，不抛异常。**测试缺口**：现有测试文件未覆盖"未知/非 SVG 变体（default/thick/solid/dashed/dotted）在注入阶段被正确跳过"及"无主题时 fallback 色值生效"两条路径——虽经手工验证行为正确，但缺乏回归保护，后续重构该模块时无测试兜底。

**test-quality（真实发现，见下方 R-001）**：AC-006 断言使用 `toContain` 子串匹配源码字面值而非验证计算样式完整性，掩盖了一个真实的 CSS 输出缺陷。

## 问题列表

### [R-001] HIGH: `svgStyle()` 生成的 margin CSS 值为非法/错误的 3-value shorthand，导致 SVG 未按设计意图水平居中
- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `divider-decoration.ts:6-8` 中 `svgStyle(margin)` 函数体为 `` `display: block; margin: ${margin} auto` ``，三处调用点均传入已是完整 2-value margin 字符串（`"24px 0"`/`"20px 0"`），拼接后产生 `margin: 24px 0 auto`。CSS margin shorthand 语法下这是**3-value 形式**（top=24px, left/right=0, bottom=auto），而非代码显然想要的"垂直 24px，水平 auto 居中"效果。实测 `renderMarkdown(":::divider{.wave}\n:::", {...})` 输出 `style="display: block; margin: 24px 0 auto"`；AC-006 原文明确要求"margin 计算值符合各变体规格（wave/flower 24px 0，dots 20px 0）"——当前输出值 `24px 0 auto` 与规格不符（多出的 `auto` 分量使 left/right margin 固定为 0 而非居中）。由于 SVG 元素在无显式 `width` 时按 intrinsic 尺寸参与块级布局，`margin-left/right: 0`（而非 `auto`）意味着**SVG 实际未水平居中**，与函数名 `svgStyle` 及 `auto` 后缀显露的设计意图相悖，属真实视觉回归。
- **建议**: 修正为二选一：① `svgStyle` 改用真正的 2-value 语义，调用点传入垂直分量单值（如 `svgStyle("24px")` → 内部拼接为 `margin: 24px auto`）；② 或直接放弃 `auto` 后缀，调用点已传入的 `"24px 0"` 本身即完整合规值，`svgStyle` 不再追加 `auto`（若居中并非设计意图，需与 T-140 样张核对确认）。无论采用哪种，须同步把 AC-006 测试断言从 `toContain("margin: 24px 0")` 改为对完整字符串做精确匹配（`toBe`/`toEqual` 而非 `toContain`），避免同类 3-value/2-value shorthand 混淆问题再次被子串匹配掩盖。

### [R-002] MEDIUM: 未知/非 SVG divider 变体与无主题 fallback 路径缺测试覆盖
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `divider-decoration.ts` 的 `walk()` 对非 SVG 变体（`default`/`thick`/`solid`/`dashed`/`dotted`）与 `buildDividerSvg` 返回 `null` 的分支、以及 `injectDividerDecorations` 在 `theme` 为 `undefined` 时使用硬编码 fallback 色值（`#D6D3CE`/`#A8A29E`/`#2D5A4E`）的分支，均无对应测试用例。经审查手工验证行为正确（未知变体 falls through 不产生 SVG；无主题时 fallback 生效），但缺乏回归测试意味着后续重构（如变更 fallback 常量或调整 `walk` 递归逻辑）时无法被测试网捕获。
- **建议**: `divider-svg-variants.test.ts` 补充两条用例：① `:::divider\n:::`（default 变体）与 `:::divider{.solid}\n:::` 渲染结果不含 `<svg>` 标签；② 省略 `themeId` 渲染 wave/dots/flower 任一变体，验证输出色值等于硬编码 fallback 常量。

### [R-003] LOW: `circle` 标签白名单的 `stroke` 属性未被任何变体实际使用
- **category**: security
- **root_cause**: self-caused
- **描述**: `DIVIDER_SVG_ATTRIBUTES.circle`（schema.ts:9）声明 `["cx", "cy", "r", "fill", "stroke"]`，但 dots 变体的 `buildDotsSvg`（divider-decoration.ts:34-49）仅生成 `cx`/`cy`/`r`/`fill`，未使用 `circle.stroke`。属最小必要集的轻微超集，风险极低（`stroke` 值本身受既有约束，非新增可执行面），但与"最小必要放行集"的任务卡目标略有偏差。
- **建议**: 若确认三变体设计规格中 `circle` 确无 `stroke` 使用场景，移除该属性；若为预留未来变体扩展，建议在 schema.ts 加一行注释说明保留理由（当前无任何说明）。

### [R-004] LOW: `svg` 标签的 `style` 白名单条目与全局 `*.style` 重复声明
- **category**: convention
- **root_cause**: self-caused
- **描述**: `DIVIDER_SVG_ATTRIBUTES.svg`（schema.ts:7）声明 `["viewBox", "style"]`，但 `style` 早已在 `wechatFlowSanitizeSchema.attributes["*"]`（schema.ts:21）全局放行（先于本卡存在，用于既有 block inline 样式）。svg 标签级的 `style` 声明是冗余的（即使移除，`*` 仍会放行），容易让后续读者误以为这是 svg 专属最小集的必要组成部分。
- **建议**: 从 `DIVIDER_SVG_ATTRIBUTES.svg` 中移除 `style`（保留 `viewBox` 即可，`*` 已兜底 `style`），使 svg 专属白名单更准确反映"仅此标签独有、非全局属性覆盖的部分"。

## Verdict

**needs_revision**

存在 1 个 HIGH（R-001：AC-006 未真实满足，SVG 未按设计意图居中，且被弱断言掩盖）。R-002/R-003/R-004 为 MEDIUM/LOW，不单独阻塞但建议随 R-001 一并修复。

修复指引：优先修 R-001（`svgStyle` margin 拼接逻辑 + 收紧 AC-006 测试断言为精确匹配），R-002 建议同批补充测试覆盖；R-003/R-004 可延后处理或在下次 REFACTOR 一并清理。AC-004/AC-005（安全维度）经本轮审查确认合格，无需围绕安全维度返工。
