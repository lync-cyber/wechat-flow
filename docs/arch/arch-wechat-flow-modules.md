---
id: "arch-wechat-flow-modules"
version: "0.10.1"
doc_type: arch
author: architect
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014"]
consumers: [tech-lead, ui-designer, developer, devops, qa-engineer]
volume: modules
volume_type: modules
split_from: "arch-wechat-flow"
required_sections:
  - "## 2. 模块划分"
---
# Architecture 分卷 — 模块划分: wechat-flow

[NAV]
- §2 模块划分 → M-001..M-013（含 M-010 admin 路由，承载 API-028..API-031 的 admin key 管理端点）
[/NAV]

## 2. 模块划分

> **实现状态（2026-07-09）**：ruleset 双语义域两相机制已落地——**T-182**（stage 机制 / 管线两相插点 / customCss 树域 / nightRisk 后移）、**T-183**（output 域 37 条规则归域开闸 + 基线审计）已交付：render output 相（stage 11）激活，生成样式的 font-family 剥除、position 剥除、<14px 字号夹至 14、rgba<0.15 夹至 0.15、em→px 归一化已在产物端生效。
>
> **本章 M-003/M-004/M-005/M-009 描述采用 wechat-typeset 平台保真模型的目标架构**（见 `AMENDMENT-platform-fidelity-r1.md`）：output 域 ruleset 本身即 hast 幂等 patch 层；**删除重复的独立模拟器**，兼容性报告 / 复制 / MCP 全部改指向 output ruleset。落地状态——**T-184**（平台常量单一源，治理三份常量表 + S1 同步断言）、**T-185**（消费方改指向 output ruleset + `PlatformAdapter{patch,inspect}` 薄层）、**T-186**（删模拟器 + 全消费方/MCP/文档同步 + breaking 版本化）、**T-187**（`registerBlock/Variant/Theme/Mark` 构造守卫含 Mark + 全主题×全组合扫描含标签）、**T-188**（dropcap/dialog px 宽修复）、**T-189**（主题/mark/dropcap font-family 声明退出）为落地任务，执行中。
>
> 因此当前代码库仍存在待收口的过渡态：独立模拟器 walker（`simulate-paste.ts` / `simulator/*` / `diff/per-node-diff.ts`）仍在、`RenderResult.postPaste` 字段仍在、`PlatformAdapter`/`inspect` 尚未建、Block/Theme/Mark 构造守卫尚未建、平台常量完整集（`FORBIDDEN_CSS_PROPS` 等）尚未单一源治理。**下游判定微信粘贴兼容性是否已强制、模拟器是否已删时以本状态为准，勿据目标态措辞误判为已交付。** 各节以现在时陈述的 PlatformAdapter / inspect / 构造守卫均指目标态，交付由 T-184..T-189 收口。

### M-001: 编辑器 UI

- **职责**: 浏览器编辑器的展示层与交互编排——三栏布局、命令面板、抽屉、对话框、源码 ↔ 预览联动、iframe 预览沙箱挂载。不直接持有渲染管线 stage，所有渲染调用经 M-008 应用层 use case
- **映射功能**: F-001 (AC-001..AC-009) / F-002 (AC-001..AC-006) / F-008 (AC-001 浏览 UI, AC-002 模板卡片，AC-004 模板应用) / F-014 (AC-006)
- **对外接口**: 无 HTTP 接口；订阅 M-008 提供的 use case 返回值与诊断流
- **依赖模块**: M-008 (应用层 use case) / M-005 (主题与组件注册中心) / M-012 (schema 契约层) / M-013 (浏览器端持久化)
- **内部关键组件**:
  - `EditorShell.vue` — 三栏布局与状态栏
  - `SourcePane`（基于 CodeMirror 6）— directive 语法高亮、补全
  - `PreviewPane` — iframe 沙箱（`sandbox="allow-same-origin"`，**无 `allow-scripts`** + CSP `default-src 'none'`，零 JS）挂载与视口切换（375 / 768 / desktop）；目录跳转、源码↔预览高亮联动、复制按钮覆盖层等 UI 钩子全部在主线程通过 `iframe.contentDocument` 与 overlay 实现，不向 iframe 内注入脚本。`allow-same-origin` 是主线程读写 `contentDocument`（源码↔预览高亮联动、目录跳转 `scrollTo`）的物理前提——opaque origin 下 `contentDocument` 访问抛 SecurityError；禁脚本由「无 `allow-scripts`（不创建脚本执行环境）+ CSP `default-src 'none'`（`script-src` 缺省回退，阻断所有脚本源 / inline / eval）」两层共同保证，沙箱配置与 CSP 互为冗余。安全论证见 arch#§5.3、决策记录 §8.2 Q3.8
  - `CommandPalette`、`InsertDrawer`、`ContextMenu` — 共享同一 command registry
  - `DiagnosticsPanel` — 兼容性报告分级展示（red / yellow / green）；inbound 数据契约为 M-003 输出的 `DiagnosticReport`（含 `diagnostics: Diagnostic[]`、`nodeChangeRecords: NodeChangeRecord[]`、`nightRiskIssues: NightRiskEntry[]` 三大字段）；面板渲染 `nodeChangeRecords` → 子组件 `CompatibilityDiffView`（UC-013.1）双栏对比；`nightRiskIssues` 非空时面板进入 `night-risk-alert` 视觉态（ui-spec UC-013）
  - `CompatibilityDiffView` — DiagnosticsPanel 子组件；订阅 `DiagnosticReport.nodeChangeRecords[]` 中匹配 `nodeSelector` 的 `NodeChangeRecord`，按 `before` / `after` outerHTML 与 `attrDiff` 渲染双栏对比；不主动调用渲染管线，所有数据由 M-003 在过滤执行时一次性记录
  - `ThemeSelector`、`PaintDrawer`、`PaletteDerivationDrawer` — 主题选择与单文档配色派生
  - `ThemeMarketGallery` — 主题模板市场（F-008）的 (主题, template) 卡片画廊；订阅 M-005 `listThemes()` × `listThemeTemplates(themeId)` 笛卡尔积，按缩略元数据渲染卡片，选中后调用 M-005 `describeTemplate(themeId, templateId)` 取预填 Markdown 创建新文档
- **context_load**: [prd#§2.F-001, prd#§2.F-002, prd#§2.F-008, prd#§2.F-014, arch#§2.M-008, arch#§2.M-005]

### M-002: 渲染管线核心

- **职责**: 纯函数 stage 编排的确定性渲染管线；ruleset 双语义域两相执行（authoring 相在样式合成前、output 相为 serialize 前最后一个树变换）；版本三元组透传；确定性渲染保证；framework-agnostic 无 DOM 依赖。微信平台合规经 output 相 `PlatformAdapter.patch`（`wechat` 平台适配层，M-004）承载——`patch` 即 output 相 `applyRuleset(hast, rules, "output")` 那一次执行的具名封装（render 与 adapter 不各维护一份 output-stage 调用逻辑）；渲染目标区分见「render target 与平台 patch」
- **映射功能**: F-002 / F-003 (AC-002 热切换) / F-004 (AC-003 内联化 / AC-004 视觉一致性) / F-007 / F-013 (AC-001 跨运行时一致)
- **对外接口**: 包级 API（非 HTTP）：`renderMarkdown(input, options) → RenderResult`、`renderHast(hast, options) → string`；被 M-008 / M-009 / M-011 调用
- **依赖模块**: M-003 (规则集引擎，两相 `applyRuleset`) / M-004 (平台适配层 `PlatformAdapter` — `patch` 为 output 相 `applyRuleset` 的具名封装) / M-007 (plugin-api 类型) / M-012 (schema 契约层 + `extendSanitizeSchema` 共享契约)
- **管线 stage 序列（唯一权威）**: ruleset 按 `stage` 分两相执行——authoring 相（作者输入域）在样式合成前、output 相（产物合规域）为 serialize 前最后一个树变换。

  | 序号 | stage | 输入 → 输出 | 实现位置 | 相 / 备注 |
  |------|-------|-----------|---------|---------|
  | 1 | parse | Markdown → mdast | `pipeline/parse.ts` | remark + remark-directive |
  | 2 | transform | mdast → hast | `pipeline/transform.ts` | rehype 适配 + directive 展开 + `data-{block}-{attr}` 透传 + `decorate` 钩子（见「通用渲染机制」） |
  | 3 | dividerDecorations | hast → hast | `pipeline/divider-decoration.ts` | divider SVG 装饰变体注入（主题相关）；置于 sanitize（stage 4）之前——`<hr>`→SVG 容器结构须先生成，方能被 `wechatFlowSanitizeSchema` 作为合法结构校验放行；其余七类装饰（stage 9）仅注槽位/字面样式、不改可被 sanitize 拦截的标签结构，故置样式合成后 |
  | 4 | sanitize | hast → hast | `pipeline/sanitize.ts` | rehype-sanitize + wechatFlowSanitizeSchema（profile 参数）；hast 下游**单一守门点** |
  | 5 | **ruleset — authoring 相** | hast → hast | `applyRuleset(hast, rules, "authoring")` | 作者输入域：script/style/js-events/id/data/aria 结构清理，源位置诊断在此保真；样式合成前。keyword-lint 作用于 Markdown 源文本、独立调用，不在此 stage（见规则语义域契约） |
  | 6 | injectNodeIds | hast → hast | `pipeline/node-id-injector.ts` | 条件（`options.injectNodeIds`），注入 `data-node-id` 供 UC-013.1 diff view |
  | 7 | inlineStyle | hast → hast | `pipeline/inline-style.ts` | L1 block base-style ⊕ L2 主题 token override 分层合成（§8.2 Q3.15）+ 容器 typography 下推 |
  | 8 | contextAwareRender | hast → hast | `pipeline/context-aware-renderer.ts` | 上下文敏感渲染（`{{tokenId}}` SVG 注入、侧位交替等） |
  | 9 | injectDecorations | hast → hast | `pipeline/decoration-injector.ts` | 八类装饰经 M-005 `BlockDefinition.decorate` 注册表分发注入槽位 / 字面样式 |
  | 10 | **applyCustomCss（hast 树域）** | hast → hast | `pipeline/custom-css.ts` | L3 custom CSS cascade pass（§8.2 Q3.9/Q3.16）：juice 级联后 re-parse 回 hast、全树重过 `css-attr-filter`；收编入树域，output 相**之前**（无 customCss 时整 pass 跳过，token 路径产物字节级不变） |
  | 11 | **ruleset — output 相** | hast → hast | `applyRuleset(hast, rules, "output")`（经 `wechatAdapter.patch` 具名封装，同一执行点） | 产物合规域：serialize 前最后一个树变换，对全部生成样式（主题 tag 样式 / block baseStyle / 槽位 / `decorate` 字面样式 / 装饰注入 / customCss 级联结果）建模平台过滤；此步即 M-004 `PlatformAdapter.patch`，非 render 后再跑一遍 |
  | 12 | collectNightRiskIssues | hast → DiagnosticReport | `packages/core/src/pipeline/readability.ts` | 对 stage 11 output 相之后的**最终树**算夜间风险 / 对比度（消费真实产物计算样式）；仅产 `nightRiskIssues`，readability-* 三条字号/行高/段长诊断由 stage 11 `applyRuleset(...,"output")` 产出，不在此重复 |
  | 13 | serialize | hast → string | `pipeline/serialize.ts` | canonical 稳定排序字符串化 |

  `composeRender` 输出 = stage 13 结束的 inline-styled HTML——output 相（stage 11 = `wechatAdapter.patch`）已对产物建模平台合规，即已达平台稳定态。复制 / 导出剪贴板路径**直接复制 render 产物**（`render().html`，预览 ≡ 复制天然成立）。对**任意外部 HTML** 的平台兼容体检由 M-004 `PlatformAdapter.inspect` 承载，非渲染主路径职责。两相分域依据、45 条规则 stage 归属、开闸风险与用户决策矩阵见 §2.M-003 附录 A / B。
- **两相执行契约**: authoring 相与 output 相共用单一注册表 `applyRuleset(hast, rules, stage)` 按 `RuleDefinition.stage` 过滤执行；authoring 相位于 inlineStyle 之前（作者输入域，保留源位置诊断），output 相位于全部样式合成 / 装饰注入 / customCss 之后、serialize 之前（产物合规域，serialize 前最后一个树变换）。规则 stage 归属由 metadata 显式声明（无缺省），归域裁定见 §2.M-003 附录 A。output 相对样式合成 / 装饰 / customCss 生成的声明建模平台过滤——主题 tag 样式的 `font-family`、pull-quote 槽位的 `position: relative` 等声明在样式合成后方存在，仅 output 相可见并拦截；置于 authoring 相（inlineStyle 之前）的产物合规规则对这些生成声明不可见。
- **平台稳定态自证（原收敛不变量的诚实形式）**: `PlatformAdapter.inspect(render(x).html)` 对自家产物返回空 changes = 证明产物已达平台稳定态（output 相已将其落到稳定态，inspect 再跑零变更）。此为**按需触发的自证性质，非 CI 恒跑不变量**——`inspect` 只跑 output 域的**平台过滤规则子集**（strip / patch 族；排除 `clamp-*` / `readability-*` / `transform-em-to-px` / 夜间风险等产品归一，见 §2.M-003），render output 相已跑过该子集、inspect 幂等再跑零变更；且 render 产物 **div-free 由构造保证**（`allowDangerousHtml:false` + 容器原语 `section` + 零 div 创建，核实见 §2.M-003），inspect 专用 schema 的 div 剥离对自家产物零命中——故标签与规则两维均返回空。此为自证而非微信真机保真；正向真机保真由 §2.M-003「等效保真门禁」（全主题×全组合 CSS 模式 + 标签扫描）+ 附录 B 少量真机确认承载（避免 render/inspect 共享盲点假绿）。
- **render target 与平台 patch（render target 二选，非 TargetProfile 分治）**: 微信剪贴板 / 粘贴目标（renderMarkdown 默认、`composeCopy`、`export_clipboard_payload`、MCP `render_markdown`）在 output 相施加 `wechatAdapter.patch`——微信专属调整（`font-size` 夹 14、`rgba` 夹 0.15、SVG `#ffffff`→`#fefefe`、`position` 族剥除、`display:flex`→block 等）。**长图导出 / 封面导出为独立 render target**（M-008 `composeExportLongImage` / `composeExportCover` 经 M-010 Playwright 服务端光栅化）：**不施加微信平台 patch**——图片经服务端确定性光栅化、不经微信粘贴过滤，微信专属调整对图片无意义（SVG 可留 `#ffffff`、淡背景可留低 alpha）。此区分是**每 render target「微信平台适配层 vs 无适配」的二选**（`platform` 选 `wechat` 或不选），本架构无 `TargetProfile` 分治参数化类型。
- **font-family 在所有 render target 缺席（构造守卫的逻辑后果）**: `font-family` 纳入 §2.M-005 构造守卫 `FORBIDDEN_CSS_PROPS`，注册期拒绝声明（分阶段 T-189），故主题 / 块样式**根本不声明** font-family——它在微信剪贴板与图片导出两条 render target 均缺席，主题字体身份统一由字号层级 / 配色 / 间距 / 装饰承载。图片路径无 font-family 源可保留；**用户裁定（2026-07-09）接受全缺席、不引入 `fontStack` 机制**——图片导出与剪贴板一致均不携带 font-family（详 §2.M-003 附录 B 决策①）。重开条件：图片导出功能落地时产品重估需保留主题字体身份，届时再引入豁免块级构造守卫、仅图片光栅化消费的主题级 `fontStack` 元数据。
- **RenderResult.report 语义（postPaste 已删）**: `RenderResult` 不含 `postPaste` 布尔字段；含 `report: { nodeChangeRecords, nightRiskIssues }`——output 相 `applyRuleset` 的 `executeStrip/executeTransform` 产出的逐节点变更（含 customCss 被平台规则剥除的声明，如 font-family，以 warn 诊断对消费方 / LLM 可见）与夜间风险条目。复制 / 导出路径不再置"已过滤"布尔标记——复制即 render 产物，无对账双跑。
- **通用渲染机制（管线不含块名特化分支）**:
  1. **指令属性透传**（transform stage）: M-005 `BlockDefinition.directiveAttrs` 声明的指令 `{}` 属性经 strict 校验后，按 `data-{block}-{attr}` 命名透传至容器 hast 元素（如 `data-dialog-speaker` / `data-pull-quote-author` / `data-compare-left-label`）；块级子结构生成与装饰经 M-005 `decorate(element, ctx)` 钩子收编。transform 与 inline-style 均按通用规则驱动，不含 per-block 名分支。
  2. **容器 typography 下推 cascade**（inline-style stage）: 容器块 root 合成样式中的可继承属性集——`text-align` / `color` / `font-size` / `line-height` / `font-family` / `letter-spacing`——显式合并进容器内**无 slot 子元素**；优先级 **slot 样式 > 容器下推 > 全局 tag token**。全 inline 契约下不依赖运行时 CSS 继承（微信编辑器自带样式表不可控），容器 typography 意图须在合成期显式下推坐实。
- **内部关键组件**:
  - `pipeline/parse.ts` — Markdown → mdast (remark + remark-directive)
  - `pipeline/transform.ts` — mdast → hast (rehype 适配 + directive 组件展开)；指令声明属性按 `data-{block}-{attr}` 透传 + M-005 `decorate(element, ctx)` 钩子调用（见「通用渲染机制」，无块名特化分支）
  - `pipeline/inline-style.ts` — 分层样式合成（§8.2 Q3.15）：L1 block base-style（M-005 注册查询）⊕ L2 主题 token override，按 (block, variant) 键与标签名索引展开为元素 inline style，`sortedEntries` 确定性遍历；容器 typography 下推 cascade——容器块 root 合成样式的可继承属性集显式合并进无 slot 子元素（见「通用渲染机制」）
  - `pipeline/custom-css.ts` — L3 custom CSS cascade pass（hast 树域，管线 stage 10，output 相之前）：customCss / 注册 variant 样式存在时，经 `juice/client` `inlineContent` 做选择器匹配 + specificity 级联后 re-parse 回 hast 并**全树重过** `css-attr-filter`，产物以 hast 树交付 output 相与 serialize；无 custom CSS 时跳过整个 pass，token 路径产物字节级不变（CI fixture 基线不受扰动）；被白名单拒绝的选择器/声明以结构化诊断汇入 `RenderResult.diagnostics`
  - `pipeline/sanitize.ts` — 调用 `rehype-sanitize` 6.x，使用 `wechatFlowSanitizeSchema`（导出自 `sanitize/schema.ts`，基于 `hast-util-sanitize` 5.x 的 `defaultSchema` deepmerge，按目标平台参数化；渲染管线 schema **保留 div**，与 M-004 inspect 专用 schema 不同——见 §2.M-004）；位置：mdast→hast (`transform.ts`) **之后**、authoring 相规则集 **之前**；是 hast 进入 stage 链下游的**单一守门点**
  - `pipeline/css-attr-filter.ts` — sanitizer 之后的 CSS 属性二级白名单（解析 `style` 值为 declaration 列表，按 `packages/ruleset` 的 CSS 子集声明放行；拒绝 `expression(` / `javascript:` / `behavior:` / `@import`）
  - `pipeline/serialize.ts` — 稳定排序的 HTML 字符串化；统一调 `utils/canonical-json.ts` + `utils/deterministic.ts` 的辅助函数，禁用任何隐式迭代顺序
  - `sanitize/schema.ts` — 导出 `wechatFlowSanitizeSchema: Schema`（`Schema` 类型来自 `hast-util-sanitize`）；通过 `@wechat-flow/contracts` 提供的 `extendSanitizeSchema` 共享契约把自定义 Block 标签合入白名单，由 M-002 在初始化时消费 Block 注册中心 M-005 注入的 (tagSet, attrMap) 增量
  - `utils/deterministic.ts` — 确定性容器迭代辅助：`sortedKeys` / `sortedEntries` / `sortedSet` / `canonicalStringify`（详见主卷 §5.2 确定性容器迭代规范）
  - `version/triple.ts` — 三元组 `{coreVersion, themeVersion, rulesetVersion}` 计算与透传
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-007, prd#§3.3, arch#§2.M-003, arch#§2.M-004, arch#§5.2, arch#§5.3, arch#§8.2]

### M-003: 过滤规则集引擎

- **职责**: 微信平台过滤规则的版本化运行时——规则注册、按作用域（strip / clamp / transform / patch / lint）分类执行、**按语义域（`stage: authoring | output`）两相执行**、规则集版本号管理、规则补丁热加载（F-011 AC-005）；过滤执行时为受影响节点产 `NodeChangeRecord[]`、为低对比度节点产 `NightRiskEntry[]`，统一入 `DiagnosticReport` 供 M-001 消费。output 域规则集是「平台对任意输入的过滤行为」的单一事实源，被三消费方共享：注册期校验（M-005）、渲染 output 相（M-002 stage 11）、平台适配 inspect（M-004 `PlatformAdapter.inspect`）。**平台过滤规则子集（strip / patch 族）**是 output 域内建模「微信真机会剥/改什么」的那一子集（`strip-*` / `patch-*` / `transform-svg-*` 等）；`clamp-*` / `readability-*` / `transform-em-to-px` / `transform-uppercase-hex-lower` / 夜间风险等是**产品诊断 / 归一**（不建模微信平台行为），**不进 inspect 的平台判定**（`AMENDMENT-platform-fidelity-r1#§9` R5）——inspect 只跑平台过滤子集，`render` output 相跑全 output 域（平台过滤 ∪ 产品归一）
- **output 域 ruleset 本身即 hast 幂等 patch 层**: `strip-position` / `strip-font-family` / `patch-flex-to-block` / `transform-svg-white-offset` 等已是幂等 hast `RuleDefinition`、已在 `render.ts` output 相（stage 11）跑一次、`nodeChangeRecords` 已由 `apply.ts` 的 `executeStrip/executeTransform` 产出。采用 wechat-typeset 平台保真模型后，output ruleset = 平台 patch 链、`nodeChangeRecords` = inspect 报告——无须抽取 / 重写为独立 patch 层。**T-183 归域基础设施（`packages/ruleset` 37 条 output 域规则 + `stage-domain.test.ts` / `output-stage-behavior.test.ts` 基线）保留不拆**；平台保真重构只删重复的独立模拟器（见 §2.M-004），并在 output ruleset 之上做「补全平台常量单一源 + 补齐扫描面 + 兼容性报告/复制/MCP 改指向 output ruleset」三件事。
- **映射功能**: F-007 (AC-001..AC-004) / F-011 (AC-001 规则级 fixture / AC-005 补丁库 / AC-006 可读性 / AC-007 关键词)
- **规则语义域契约（stage，唯一权威）**: `RuleDefinition` 增 `stage: "authoring" | "output"` 字段；`metadata.json` schema 强制显式声明（无缺省值，缺失即 `E_SCHEMA` 校验 FAIL）。单一注册表两相执行——`applyRuleset(hast, ruleset, stage)` 先按 `stage` 过滤规则子集再执行：**该注册表 = `builtinRules`（42 条）+ `readabilityRules`（3 条）的 `RuleDefinition` 全集，作用于 hast 树**。`keyword-lint` **不在此注册表内**：它是独立函数 `lintMarkdown(content: string) → Diagnostic[]`（`lints/keyword-lint.ts`），作用于 Markdown 源文本而非 hast 树、语义归作者输入域但**不经 `applyRuleset` 分发**，故不计入 45 条注册、亦不占管线 stage 行（独立调用于 M-001 违规词检测与 M-009 `lint_markdown` Tool，诊断带 `ruleId: "keyword-lint"`，按 UC-013 分组判别契约归违规词组）。
  - **authoring 相（作者输入域）**: 运行于渲染管线 inlineStyle 之前（M-002 stage 5），保留 mdast/hast 源位置诊断。归此的规则其目标构造**只出现在作者输入、且管线从不生成**，或**迁至 output 会破坏管线语义脚手架**（`data-node-id` / `data-block` / `data-variant` / `data-slot` / `data-{block}-{attr}` 透传）。经 `applyRuleset(...,"authoring")` 分发的 `RuleDefinition` 清单：`strip-script` / `strip-style-tag` / `strip-js-events` / `strip-id-attr` / `strip-data-attr` / `strip-aria-hidden`。违规关键词检测（`lints/keyword-lint.ts` 的 `lintMarkdown`）语义同属作者输入域，但作用于 Markdown 源文本、独立调用（非 `applyRuleset` 分发），源位置诊断在此保真。
  - **output 相（产物合规域）**: serialize 前最后一个树变换（M-002 stage 11），对**全部生成样式**——主题 tag 样式、block L1/L2 baseStyle、槽位样式、`decorate` 字面样式、装饰注入、`applyCustomCss` 级联结果——建模平台过滤。归此的规则其目标是 CSS 声明或 CSS 值变换，产物中绝大多数此类声明由样式合成阶段生成而非作者手写；置于 authoring 相（inlineStyle 之前）的规则对生成样式不可见——pull-quote 槽位的 `position: relative`、主题 tag 样式的 `font-family` 等声明在样式合成后方存在，须由 output 相拦截。
  - 完整 43（现 45 注册）条归域裁定见**附录 A**。
- **对外接口**:
  - 包级 API：`applyRuleset(hast, ruleset, stage: "authoring" | "output") → {hast, report}`，其中 `report: DiagnosticReport`；`getRulesetVersion() → string`；被 M-002 两相调用（stage 5 传 `"authoring"`、stage 11 传 `"output"`）。`stage` 缺省行为不存在——调用方必须显式传相，防止误将全集在单点执行
  - **outbound 数据契约**：`DiagnosticReport.nodeChangeRecords[] → M-001 UC-013.1 CompatibilityDiffView 消费`；`DiagnosticReport.nightRiskIssues[] → M-001 DiagnosticsPanel `night-risk-alert` 状态消费`
- **依赖模块**: M-012 (schema 契约层 — Rule schema 含 `stage` 字段、DiagnosticReport schema) / `@wechat-flow/contracts` (`platform/wechat-paste.ts` 平台常量**单一源**，output 域规则、注册期构造守卫、平台适配 inspect 三消费方共享的平台事实源)
- **平台常量单一源**: `contracts/platform/wechat-paste.ts` 承载完整平台事实集（移植 wechat-typeset `rules.ts`）：`FORBIDDEN_CSS_PROPS` = [font-family, position, float]、`FORBIDDEN_DISPLAY_VALUES` = {flex, inline-flex, grid, inline-grid}、`FORBIDDEN_POSITION_PROPS`、`HARD_REMOVE_TAGS`、`FORBIDDEN_VALUE_PATTERNS` = [-webkit-, @media, @keyframes, :hover, :active]、`IFRAME_SRC_ALLOW` = [v.qq.com]、`NEAR_WHITE` = #fefefe。旧名 `WECHAT_PASTE_UNSAFE_TAGS` / `WECHAT_PASTE_STRIPPED_STYLE_PROPS` 保留为 re-export 别名（不破既有测试消费）。**S1 同步断言（单一源派生 + 单向 ⊆，非两份清单双向对账）**：S1 裁定「保留双编码（可读常量 + strip 规则）+ 同步断言测试」以**可满足的单向形式**落地——(a) 构造守卫的禁集**直接从本常量源派生**（`FORBIDDEN_CSS_PROPS ∪ FORBIDDEN_DISPLAY_VALUES ∪ FORBIDDEN_POSITION_PROPS`），不另立第二份守卫清单，无第二份即无漂移可对账，原「常量集 == 规则覆盖集」双向等式（float / grid / 定位族无对应 output 规则，字面恒不相等、不可满足）自然不需要；(b) output 补救规则（运行期 strip / patch：`strip-position` / `strip-font-family` / `patch-flex-to-block`）保留**单向轻断言「其靶向属性/值 ⊆ 平台常量集」**（防 output 规则漂出常量集、引入常量未登记的平台假设），不反向要求常量每一项都有 output 规则；(c) float / grid / 定位族等**无运行期规则**的平台事实由构造守卫（注册资产，从常量派生）+ 全覆盖扫描（产物）兜，不进 output 规则同步断言。`FORBIDDEN_VALUE_PATTERNS` 的 `-webkit-` 前缀带例外白名单——`print-color-adjust`（juice 注入）/ `overflow-scrolling`（iOS 动量滚动）/ `-webkit-text-emphasis`（`packages/marks/src/marks/emphasis.ts` 着重号真实排版）不误杀；扫描接入前须 grep 全仓 `-webkit-` 用例逐一裁定例外或处置
- **平台合规经 output 相 + render target 承载**（非 profile 参数化）: output 域规则集是微信平台过滤单一事实源，与 M-002 sanitize schema 参数、平台常量同源；平台知识更新只改常量 + 规则定义，三消费方（注册期构造守卫 / output 相 patch / 平台适配 inspect）同步演进。渲染目标区分为 render target 二选而非 `TargetProfile` 分治参数化（本架构无此类型）：微信剪贴板 / 粘贴路径经 `wechatAdapter.patch` 施加微信专属 output 平台规则；长图 / 封面导出为独立 render target，不施加微信平台 patch（微信专属调整对图片无意义）。`font-family` 因构造守卫注册期禁声明（§2.M-005），在两条 render target 均缺席（详 §2.M-002「render target 与平台 patch」「font-family 在所有 render target 缺席」与附录 B 决策①）
- **内部关键组件**:
  - `rules/registry.ts` — 规则注册中心；`RuleDefinition` 含 `stage` 字段；`applyRuleset(hast, ruleset, stage)` 按 stage 过滤执行
  - `rules/scope/strip.ts`、`clamp.ts`、`transform.ts`、`patch.ts`、`lint.ts` — 五类作用域执行器（scope 正交于 stage：scope 决定「如何改」，stage 决定「何时改」）
  - `rules/builtin/` — 42 条内置规则（每条一个 TS 文件 `rules/builtin/{rule-id}.ts` 导出 `RuleDefinition`，含 id / scope / **stage** / priority / matcher / transform / fixture 引用）；`rules/readability/` 另注册 3 条可读性 lint 规则；`strip-width-height-inline` 已裁移除（生产实证过严——误伤 img/table 合法尺寸），不参与两相执行
  - `version/manifest.ts` — 规则集 manifest 与版本号
  - `patch-loader.ts` — 已知 Bug 补丁库热加载（`loadPatchBundle(url)` 取远端 `PatchBundle`，`applyPatchBundle` 先整体编译校验后原子 upsert 进 registry）。`PatchBundle = { version, formatVersion?, patches: PatchEntry[] }`，`PatchEntry` 为 in-memory `RuleDefinition`（含 matcher/transform 函数与 `stage`）或 JSON 可传输的声明式条目 `DeclarativePatchEntry = { id, scope, stage, priority, match, apply }`——`match` 为 `PatchMatcherSpec`（style-prop / tag / attr / and / or 组合），`apply` 为 `PatchTransformSpec { transform, params? }`，`transform` id 在 `patch-dsl.ts` 的 transform registry 中注册后经 `compilePatchEntry` 编译为可执行 RuleDefinition（详 `patch-dsl.ts`，研究依据 rn-007）
  - `rules/readability/{readability-font-size-min,readability-line-height-min,readability-paragraph-length}.ts` — F-011 AC-006 可读性运行时检查的 3 条 `RuleDefinition`（`scope: lint`，一文件一规则，`rules/readability/index.ts` 聚合为 `readabilityRules`）；归 output 相，经 M-002 stage 11 `applyRuleset(hast, rules, "output")` 统一分发，消费**最终树的计算样式**（字号 / 行高须在 inlineStyle 后才有真值），产 `readability-` 前缀 `Diagnostic[]` 汇入 `DiagnosticReport.diagnostics`。颜色对比度 / 夜间风险（`NightRiskEntry` → `DiagnosticReport.nightRiskIssues`）不由这 3 条规则承载，而由 M-002 核心包的 `packages/core/src/pipeline/readability.ts`（管线 stage 12 `collectNightRiskIssues`）对最终树独立计算，对 `contrastRatio < 4.5`（WCAG AA 文本基准）的节点产 `NightRiskEntry` 按 `nodeSelector` 去重
  - `lints/keyword-lint.ts` — F-011 AC-007 违规关键词检测，独立函数 `lintMarkdown(content)` 作用于 Markdown 源文本（作者输入域，源位置诊断），**非 `RuleDefinition`、不经 `applyRuleset` 分发**；词库 `packages/ruleset/src/keyword-list.json`，bump 时 rulesetVersion 升 minor
  - `report/node-change-recorder.ts` — 每条 `strip` / `clamp` / `transform` / `patch` 作用域规则触发节点变更前后由执行器调 `recordChange(node, ruleId)`，记录 `before = outerHTML(node)` 与 `after = outerHTML(node')`，对属性集合做 add / remove / modify / keep 四类对账后追加 `AttrDiffEntry[]`；记录写入 `DiagnosticReport.nodeChangeRecords`，按 `nodeSelector` 唯一
  - **DiagnosticReport 数据类型**（schema 单源在 M-012 `diagnostic/diagnostic-report.ts`）：
    ```ts
    interface DiagnosticReport {
      diagnostics: Diagnostic[];                   // severity / ruleId / nodeRef / message
      nodeChangeRecords: NodeChangeRecord[];       // 粘贴前后逐节点变更（UC-013.1 数据源）
      nightRiskIssues: NightRiskEntry[];           // 夜间风险条目（UC-013 night-risk-alert 数据源）
      versionTriple: VersionTriple;
    }

    interface NodeChangeRecord {
      nodeSelector: string;        // 例：`body > div.section > p:nth-child(3)`
      before: string;              // 触发前的 outerHTML
      after: string;               // 触发后的 outerHTML
      attrDiff: AttrDiffEntry[];   // 属性级 diff
      triggerRuleId: string;       // 触发本次变更的 RuleId
    }

    interface AttrDiffEntry {
      attrName: string;
      op: 'add' | 'remove' | 'modify' | 'keep';
      oldValue?: string;
      newValue?: string;
    }

    interface NightRiskEntry {
      nodeSelector: string;
      contrastRatio: number;       // 实测前景 / 背景对比度
      foreground: string;          // 前景颜色（hex / rgb / lch 序列化）
      background: string;          // 背景颜色（同上）
      suggestion: string;          // 修复建议文本（例：「将前景调至 #1A1A1A 以满足 AA 4.5:1」）
    }
    ```
  - **UC-013 诊断分组判别契约**（公开契约；M-001 DiagnosticsPanel 据此把 `DiagnosticReport` 分四组渲染，组序固定 兼容性 → 可读性 → 违规词 → 夜间风险）：
    - 违规词组 ← `diagnostics` 中 `ruleId === "keyword-lint"` 的条目
    - 可读性组 ← `diagnostics` 中 `ruleId` 以 `readability-` 为前缀的条目
    - 兼容性组 ← `diagnostics` 中其余全部条目（`ruleId` 不匹配上两类判别，含无 `ruleId` 项）
    - 夜间风险组 ← `nightRiskIssues` 独立数组（非 `diagnostics` 成员）

    判别在 `Diagnostic.ruleId` 现有字段上进行，不引入 `category` / `group` 新字段；`ruleId` 前缀 `lint-`（`lint-filter-backdrop` / `lint-grid-layout` / `lint-position-fixed` 等 `scope: lint` 兼容性规则）语义归兼容性组，与可读性组的 `readability-` 前缀互不相交。分组判别正交于 `stage` 归域——同一规则的分组语义（面板呈现）与两相执行位点（管线时序）互不影响。
- **等效保真门禁（替代 CI 恒跑收敛不变量）**: 删除独立模拟器后，PRD 产品契约「粘贴过滤后视觉一致」由两条机制承载——(1) **平台稳定态自证**：`PlatformAdapter.inspect(render(x).html)` 对自家产物返回空 changes（inspect 只跑**平台过滤规则子集**且 render output 相已跑过该子集、幂等再跑零变更；inspect 专用 schema 的标签剥离对 render 产物亦零命中，因 render 产物 **div-free**——见下），为按需触发的自证性质，非 CI 恒跑不变量；(2) **等效保真门禁**：扫**全注册主题 × 全 block × 全 variant** 的最终 HTML，含 `FORBIDDEN_CSS_PATTERNS` CSS 模式扫描（带 `-webkit-` 例外白名单）+ 不安全标签扫描（`WECHAT_PASTE_UNSAFE_TAGS`），任一命中即门禁红——这是删收敛不变量后的等效保真门禁（`tests/blocks/wechat-paste-safe-output.test.ts` 升级为全主题全组合 + 标签扫描）。**收敛不变量 `simulatePaste(render(x)) === []` 是自证性质非微信真机保真**：inspect 用的是 output 域的平台过滤子集、与 render 同源，对自家产物零变更会掩盖二者共同的平台建模盲点（如未剥某属性则两侧同盲）；正向真机保真须由等效保真门禁 + 少量微信真机粘贴确认（附录 A.4 dropcap 真机前置 / 附录 B 样张 sign-off）承载，不能以自证不变量假绿代替
  - **render 产物 div-free（核实结论，2026-07-09）**: 自证「inspect 对自家产物返回空」在标签维度成立的前提是 render 产物不含 `div`（inspect 专用 schema 剥 `div`，见 §2.M-004）。已核实 render 产物 **div-free 由构造保证**：① `packages/core/src/pipeline/transform.ts` 的 `remarkRehype({ allowDangerousHtml: false })` 使 Markdown 源中的裸 `<div>`（及任意裸 HTML）**不被转成 hast 元素**、在 mdast→hast 阶段即丢弃，从不进入 sanitize / 下游树（并非「经 sanitize 存活」）；② 全 source 零 `div` 元素创建——block 容器原语为 `section`（`transform.ts` 指令 `hName="section"`、`blocks/steps.ts`、`blocks/decorate-utils.ts`），`decorate` 钩子不注入 `div`；③ customCss 级联 `pipeline/custom-css.ts` 的 `fromHtml(juicedHtml, { fragment: true })` re-parse 的是 juice 内联后的产物字符串——juice 只对既有元素内联 style、不新建 `div` 容器，输入 div-free 则输出 div-free。故 `inspect(render(x)).changes === []` 命题成立、非过度声明；**inspect 专用 schema 剥 div 的存在理由是 inspect 面向的任意外部 HTML 可含 div，与自家产物无关**
- **规则文件存放**: 规则定义在 `packages/ruleset/src/rules/builtin/{rule-id}.ts`；fixture 在同名子目录 `packages/ruleset/src/rules/builtin/{rule-id}/`，目录结构：
  - `input.html` — 进入规则前的 hast 序列化
  - `expected.html` — 规则应用后的 hast 序列化
  - `metadata.json` — `{ ruleId, scope, stage, priority, description, wechatVersion: { minSupported, knownBuggy[] } }`（`stage` 必填）
  - 多 case 时按 `case-001/`、`case-002/` 子目录组织，每个子目录含同样三件套
- **规则集版本化策略**: `packages/ruleset/package.json` `version` 字段即 `rulesetVersion`；任何规则变更（新增 / 修改 transform / 优先级调整 / **stage 归域迁移**）须 bump version；ruleset version 与 core / theme 一同进入版本三元组
- **PRD 19 条 vs ARCH ≥42 条差距**: PRD F-007 §2 表列 19 条代表性规则作为示例基线。架构目标 ≥42 条由 implementer 在 `packages/ruleset` 包内补充并以 fixture 形式版本化；剩余 23+ 条来自微信客户端平台实测（公众号编辑器粘贴行为对照、客户端渲染兼容性验证）。`[ASSUMPTION]` 截至 dev-plan 阶段规则总数以 42 条为实现门槛；超 42 条视为规则集质量提升，由后续 patch 版本承载。
- **context_load**: [prd#§2.F-007, prd#§2.F-011, arch#§2.M-002, arch#§2.M-004, arch#§2.M-005]

---

#### 附录 A: 45 条内置规则归域裁定表（分组开闸执行清单）

规则清册核实：`packages/ruleset/src/rules/builtin/` 42 条（metadata 支撑）+ `rules/readability/` 3 条 = 45 条注册；减 `strip-width-height-inline`（已裁移除）= 44 条参与两相执行。**归属依据**判据：目标构造是否由样式合成 / 装饰 / customCss **生成**（生成→output），或迁 output 是否破坏管线语义脚手架（破坏→authoring）。**开闸风险** = 迁至 output 相后对现有生成样式的预期命中，是开闸时逐组基线 diff 审计的预警。

##### A.1 authoring 相（作者输入域，7 条 + keyword-lint）——不迁移

| ruleId | scope | 归属依据 | 不迁移理由 |
|---|---|---|---|
| transform-list-to-table | transform | 结构改写靶向作者输入 `<ul>`（非样式合成产物）；`ulToTable` 构造裸 `table/td`，须**前置于**表格样式 pass 方能被样式化 | 归域裁定（T-183 开闸审计）：迁 output 相则结构改写发生在 inlineStyle 之后，重建的裸 td 丢弃已施加的列表样式（实证 03/11 fixture 列表表格样式全失）。结构改写属 authoring 域，与 transform-ul-marker-type「取舍活跃者」取 table 策略 |
| strip-script | strip | `<script>` 仅来自作者输入，管线从不生成 | 迁 output 无收益；与 sanitize 冗余的源结构清理，authoring 保留源位置诊断 |
| strip-style-tag | strip | `<style>` 仅来自作者输入，管线从不生成 | 同上 |
| strip-js-events | strip | `on*` 事件处理器仅来自作者输入 | 变更分析显式列 authoring；管线不生成事件属性 |
| strip-id-attr | strip | 作者 `id` 属性；injectNodeIds 用 `data-node-id` 不与 `id` 冲突（已核实 node-id-injector.ts） | 管线不生成 `id`，迁 output 无必要 |
| strip-data-attr | strip | 作者任意 `data-*`；matcher **须显式排除**管线语义前缀 `data-node-id`/`data-block`/`data-variant`/`data-slot`/`data-{block}-{attr}`——安全性来自属性名排除，非执行顺序（`data-{block}-{attr}` 透传在 transform stage 2 生成，恒早于本规则所在 authoring stage 5，靠时序在生成前清理不可能） | 留 authoring 的真实理由：迁 output 相则树上已积累 injectNodeIds / decorate / customCss 全部生成的 `data-*` 脚手架，误清面更大；无论置于哪一相，对语义 `data-*` 的保护均由属性名排除承载，与 diff view / customCss 重解析所需的脚手架一致 |
| strip-aria-hidden | strip | `aria-hidden` 仅来自作者输入（已核实：divider/decoration 注入不产 aria-hidden） | 迁 output 无必要；注：现有 camelCase matcher 在真实解析路径 no-op（与归域正交，独立处理） |
| keyword-lint（`lints/keyword-lint.ts`，非 `RuleDefinition`、不经 `applyRuleset` 分发） | lint | 违规词检测须映射作者源文位置；`lintMarkdown(content)` 作用于 Markdown 源文本 | 独立于两相注册表——语义域天然作者输入，源位置诊断在此保真；不计入 45 条注册、不占 stage 行 |

##### A.2 output 相（产物合规域，37 条）——分组开闸

| ruleId | scope | 归属依据（生成源） | 开闸风险（迁 output 后预期命中） |
|---|---|---|---|
| strip-css-var | strip | 槽位/decorate 样式以 `var(--token)` 占位生成（实证 `var(--color-brand)`/`var(--font-family-heading)`） | 命中全部 var 占位槽位/装饰样式；须确认 token 解析后无残留，否则展开顺序与 inlineStyle 交互需定 |
| strip-calc-expression | strip | `calc()` 可由 baseStyle/customCss 生成 | 命中生成样式中的 calc |
| strip-flex-gap | strip | flex 容器 gap/justify-content/align-items 可由 baseStyle 生成 | 命中生成 flex 布局声明；与 patch-flex-to-block 联动 |
| strip-font-family | strip | 主题 tag 样式 / block baseStyle 全量生成 font-family（旗舰实证：主题 font-family 全量绕过） | 命中全部主题 tag 样式与块 baseStyle 的 font-family——决策① 已裁定**无差别剥除**（不设 system-font 白名单豁免，撤销 system-only）。分阶段（T-189）：现运行期 `strip-font-family` 兜底 → 清理主题 / mark 声明 → §2.M-005 构造守卫注册期禁声明；终态 font-family 在两条 render target 均缺席（图片路径亦无源可保留，详附录 B 决策①） |
| strip-negative-margin | strip | 负 margin 可由 baseStyle/decorate 生成 | 命中生成负 margin |
| strip-position | strip | 槽位样式生成 position（实证先例 pull-quote 槽位 `position: relative`） | **命中 pull-quote 等槽位 position——真实潜伏违规，开闸即修复样式** |
| strip-pseudo-classes | strip | 伪类/伪元素 inline 残影来自 customCss juice 级联 | 命中 customCss 处理残留；须置于 applyCustomCss 之后 |
| strip-transform-origin | strip | transform-origin 可由 decorate 生成 | 命中生成 transform-origin |
| clamp-font-size | clamp | font-size 由主题 token / baseStyle 生成 | **命中 < 14px 生成字号：announcement/gallery/pull-quote/steps/code-block(全主题) 13px、footnote 12px——决策矩阵②冲突** |
| clamp-line-height | clamp | line-height 由 baseStyle 生成 | **命中 < 1.2 生成行高：quote 0.6（装饰引号）、paragraph/pull-quote/quote 1（dropcap 紧排）——须按语境豁免非正文行** |
| clamp-letter-spacing | clamp | letter-spacing 生成 | 命中越界生成字距 |
| clamp-word-spacing | clamp | word-spacing 生成 | 命中越界生成词距 |
| clamp-text-indent | clamp | text-indent 生成（首行缩进） | 命中越界生成缩进 |
| clamp-padding | clamp | padding 由容器/callout baseStyle 生成 | 现状扫描无 > 48px 命中；开闸后新增块须守下限 |
| clamp-margin-top-bottom | clamp | margin 由块间距 baseStyle 生成 | 现状扫描无 > 48px 命中 |
| clamp-border-radius | clamp | border-radius 由卡片 baseStyle 生成 | 现状扫描无 > 24px 命中 |
| clamp-image-width | clamp | 图片显式 width | 命中 > 677px |
| clamp-image-max-width | clamp | 图片 max-width | 命中 > 100% |
| clamp-rgba-alpha | clamp | rgba 低 alpha 由装饰/背景 baseStyle 生成 | **命中 < 0.15 生成透明度：callout `rgba(0,0,0,0.06)` 淡背景——提至 0.15 会显著加深，真实视觉冲突，决策矩阵②** |
| transform-em-to-px | transform | em 声明由 baseStyle/token 生成（扫描 565 处 em 占用，如 paragraph 2.2em dropcap、quote 2em/2.2em、pull-quote 1.25em） | **命中全部生成 em 值；1em=16px 归一化多数视觉等价，须核对 line-height 无单位与 em 混用——决策矩阵② em 清单** |
| transform-rem-to-px | transform | rem 生成 | 命中生成 rem |
| transform-vw-to-percent | transform | vw 生成 | 命中生成 vw |
| transform-vh-fallback | transform | vh 生成 | 命中生成 vh |
| transform-hsl-to-rgb | transform | hsl 颜色可由 token 生成 | 命中生成 hsl 颜色 |
| transform-uppercase-hex-lower | transform | 大写 hex 可由 token/主题生成（实证 business table/tokens `#FFFFFF`） | 命中生成大写 hex（归一化，低风险） |
| transform-svg-white-offset | transform | 装饰 SVG 注入纯白 #ffffff（divider/装饰） | 命中装饰 SVG 纯白——落 #fefefe（微信实测纯白光栅化透明风险），无争议；须核对 kpi-card #ffffff 是否 SVG 上下文 |
| transform-svg-url-normalize | transform | 装饰 SVG `url("#x")` 引号 | 命中装饰 SVG url 片段引号 |
| transform-data-uri-unquote | transform | data URI url() 引号（背景图生成） | 命中生成 data URI 引号 |
| transform-ul-marker-type | transform | list-style-type 由主题生成，标记物化读生成值 | 命中主题列表样式；须在 inlineStyle 后读 list-style-type；transform-list-to-table 归 authoring 后 ul 已转 table，本规则对列表内容惰性（table 策略活跃） |
| patch-flex-to-block | patch | display:flex 可由 baseStyle 生成 | 命中生成 flex→block |
| patch-pseudo-element-materialize | lint | ::before/::after 来自 customCss/主题装饰 | 诊断生成/customCss 伪元素；须置于 applyCustomCss 之后。`scope: lint`（非 patch）——伪元素物化仅能在 juice 处理后**诊断**而不改写树，故命名带 `patch-` 但作用域为 lint |
| lint-filter-backdrop | lint | backdrop-filter 可由 baseStyle/customCss 生成 | 诊断生成 backdrop-filter |
| lint-grid-layout | lint | display:grid 可由 baseStyle 生成 | 诊断生成 grid |
| lint-position-fixed | lint | position:fixed 可由生成样式产生 | 诊断生成 fixed |
| readability-font-size-min | lint | 须读最终计算字号（token/baseStyle 生成）；现运行于 inlineStyle 前无法见生成字号（潜伏失效） | 命中全部生成小字号——与 clamp-font-size 同源，决策矩阵② |
| readability-line-height-min | lint | 须读最终计算行高 | 命中生成低行高——与 clamp-line-height 同源 |
| readability-paragraph-length | lint | 段落长度检查宜在最终树 | 命中长段落（结构诊断，低风险） |

##### A.3 已移除（1 条，标注留档）

| ruleId | scope | 处置 |
|---|---|---|
| strip-width-height-inline | strip | 已裁移除——生产实证过严，误伤 img/table 合法固定尺寸；不参与两相执行，归域表仅留档 |

##### A.4 平台事实纠正（wechat-typeset 权威 > 网络调研 > 现状）

采用 wechat-typeset 平台保真模型后，以下平台事实以 wechat-typeset（同作者多年真机实测）为权威修订，覆盖网络调研与现状：

| 项 | 裁定 | 说明 |
|---|---|---|
| CSS `transform` 属性 | **不剥** | wechat-typeset 禁区无 `transform`；本就无 `strip-transform` 规则，维持。注：A.2 的 `transform-*` 系列（`transform-em-to-px` 等）是**值变换作用域**规则，与 CSS `transform` 属性无关，照常保留 |
| `font-family` | **无差别剥除**（微信剪贴板路径） | 撤销 system-only 白名单；`strip-font-family` 命中全部生成 font-family。图片导出 render target 不施加平台 patch、font-family 保留（§2.M-002） |
| `float` | **构造期禁止 + 扫描抓漏** | 纳入 `FORBIDDEN_CSS_PROPS`，注册期构造守卫拒绝；output ruleset 无运行期 strip-float，decorate 动态注入的 float 由 §2.M-005 全覆盖扫描（层 3）抓漏，非运行期剥（缺口登记见 `AMENDMENT-platform-fidelity-r1#§9` R3） |
| `-webkit-` / `@media` / `@keyframes` / `:hover` / `:active` | **纳入 `FORBIDDEN_VALUE_PATTERNS` + 扫描** | 带例外白名单：`print-color-adjust`（juice 注入）/ `overflow-scrolling`（iOS 动量滚动）/ `-webkit-text-emphasis`（`packages/marks/src/marks/emphasis.ts` 着重号真实排版）不误杀；扫描接入前须 grep 全仓 `-webkit-` 用例逐一处置 |
| SVG 纯白 `#ffffff` | **→ `#fefefe`（`NEAR_WHITE`）** | `transform-svg-white-offset` 保留；仅 SVG 上下文，非 SVG 背景白色不受影响（微信实测纯白光栅化透明风险） |
| dropcap `width:1%; white-space:nowrap` | **真 bug，改显式 px 宽** | paragraph/quote dropcap 与 dialog shrink cell 用 `width:1%; white-space:nowrap` 依赖 `nowrap` 阻止 1% shrink-cell 塌陷；**微信剥 `white-space:nowrap` 留 `1%` → 单元格塌陷**。改按字号推导的显式 px 宽（非硬编码 44px）；`display:table` 本体存活须 ≤6 份真机确认**作为前置**（T-188），塌陷则装饰布局改真 `<table>` |

---

#### 附录 B: 用户决策矩阵（已裁定 2026-07-08）

三项决策均已由用户拍板（2026-07-08）；下方各决策保留候选选项与理由以承载决策记录，以「**用户裁定**」行为准。分组开闸按裁定直接执行，无遗留待确认项——唯 ②-ii 的新样张基准须用户 sign-off（该 sign-off 为开闸时门槛）。

##### 决策①: font-family 策略

- **选项 A（微信剪贴板路径无差别剥除 font-family）**: output 相 `strip-font-family` 命中全部主题 tag 样式与块 baseStyle 的 font-family，产物不含 font-family，微信系统字体栈接管。诚实「所见即所粘」。
  - **影响面**: 全部 5 主题（default / magazine / literary / business / tech）的字体身份不再体现于剪贴板产物；literary 宋体、tech 等宽等字体标识须靠字号层级 / 配色 / 间距 / 装饰承载；ui-spec §10.5 及相关字体条款须 amendment（owner=ui-designer）；预览须同步反映微信实际字体或明示「预览字体 ≠ 粘贴字体」；主题字体保留语义收窄至图片导出 render target。
- **选项 B（保留 font-family + 兼容性诊断警告）**: 微信剪贴板路径不剥 `font-family`，产物保留 font-family，预览美观且主题身份完整；`inspect` / 兼容性报告标注「font-family 将被微信剥除」诊断。
  - **影响面**: 预览与实际粘贴视觉系统性不一致（失真）——复制产物保留 font-family 而微信真机剥除，「所见即所粘」在剪贴板路径不成立。
- **推荐**: **选项 A（剥除）**。理由：(1) 产品契约核心 =「粘贴过滤后视觉一致」，font-family 是微信实测剥除项（wechat-typeset 生产实证：剥 inline font-family），保留即制造预览/产物系统性失真，违背契约根基；(2) 复制即 render 产物、无独立模拟器对账——产物须在 output 相已达平台稳定态，保留 font-family 则产物含微信必剥项、`inspect` 对自家产物非空（平台稳定态自证失败）；(3) 主题身份可由字号层级 / 配色 / 间距 / 装饰 SVG 充分承载，字体非唯一身份载体。
- **用户裁定（2026-07-09）**: **选项 A（无差别剥除 + 禁声明）**。微信剪贴板 / 粘贴路径经 `wechatAdapter.patch` 在 output 相无差别剥除 font-family（不设 system-font 白名单，撤销 system-only）；且 §2.M-005 构造守卫将 font-family 纳入 `FORBIDDEN_CSS_PROPS`，主题 / mark 注册期禁声明（分阶段 T-189）。故 font-family 在**所有 render target 缺席**——主题字体身份统一由字号层级 / 配色 / 间距 / 装饰承载。下游：ui-spec §10.5 及相关字体条款须 amendment（owner=ui-designer）。
- **[用户裁定 2026-07-09] 图片导出路径的字体保真 = 接受全缺席**: TargetProfile 删除 + 构造守卫禁声明后，0.9.5 本决策括注「长图导出等 profile 保留 font-family」**已被推翻**——图片路径（长图 / 封面光栅化）无 font-family 源可保留。用户裁定**接受全缺席、不引入 `fontStack` 机制**：图片导出与剪贴板一致均不携带 font-family，主题字体身份统一由字号 / 配色 / 间距 / 装饰承载。重开条件：图片导出功能真正落地时产品重估需保留主题字体身份，届时再引入豁免块级构造守卫、仅供图片光栅化 render target 消费的主题级 `fontStack` 元数据。
- **重评估条件**: 微信编辑器后续版本停止剥除 inline font-family（须实测验证），或产品新增「非微信剪贴板目标平台」成为主用例——font-family 处置按 render target 重新标定。

##### 决策②: clamp / transform 阈值与现有块样式冲突清单

现有块/主题样式中会被 output 相 clamp/transform 类规则命中的声明（扫描 `packages/blocks/src` + `packages/themes/*/src`，排除 node_modules）：

| 冲突项 | 命中规则 | 现有样式（实测） | 规则阈值/行为 | 冲突性质 | 处置方向（推荐） |
|---|---|---|---|---|---|
| 小字 12–13px | clamp-font-size / readability-font-size-min | announcement/gallery/pull-quote/steps/code-block(全主题) 13px；footnote 12px；business/literary heading 13px（须核对是否 label） | 下限 14px | 生成字号 < 平台下限 | **已裁定 A**：小字统一提至 14px 对齐平台下限（微信正文最小可读 14px 是 wechat-typeset 构建期硬约束）；候选 (B) caption/footnote 豁免 clamp 未采纳（无权威依据证明 <14px 在微信可读，拒拟合现状） |
| dropcap/装饰行高 | clamp-line-height / readability-line-height-min | quote 0.6（装饰引号）；paragraph/pull-quote/quote 1（首字下沉紧排） | 下限 1.2 | 生成行高 < 下限 | **已裁定**：以「首字下沉/装饰字符非正文行」为客观依据修订规则匹配范围（按语境放行），**非放宽全局阈值**——正文行仍守 1.2 下限 |
| em 单位声明 | transform-em-to-px | 565 处 em 占用（paragraph 2.2em、quote 2em/2.2em、pull-quote 1.25em、citation 0.9em、disclaimer 0.875em 等） | 1em=16px 转 px | 生成 em 批量转换 | 逐条随开闸基线 diff 审计；em→px 归一化多数视觉等价（低风险），须核对无单位 line-height 与 em 未混用、字号继承链无级联失真 |
| 淡背景透明度 | clamp-rgba-alpha | callout `rgba(0,0,0,0.06)` 等 11 处 < 0.15 | 下限 0.15 | 生成 alpha < 下限 | **已裁定 B**：0.06→0.15 提 alpha 至下限、无豁免特例，同步样张基准（真实视觉变更，新基准须用户 sign-off，开闸时门槛）；候选 (A) 装饰性淡背景豁免 clamp-rgba-alpha 未采纳 |
| SVG 纯白 | transform-svg-white-offset | divider/装饰 SVG #ffffff；kpi-card #ffffff（须核对 SVG vs 背景）；business table `#FFFFFF` | #ffffff→#fefefe（仅 SVG 上下文） | 生成 SVG 白色 | 直接落 #fefefe（微信实测纯白光栅化透明风险），无争议；非 SVG 背景白色不受影响 |
| border-radius / padding / margin | clamp-border-radius / clamp-padding / clamp-margin-top-bottom | 扫描**无** > 24px 圆角 / > 48px 内外边距命中 | 上限 24px / 48px | 现状无冲突 | 无需处置；开闸后作为新增块的守护下限 |

- **用户裁定（2026-07-08）**:
  - **②-i 小字下限**: **选项 A** —— 命中 announcement/gallery/pull-quote/steps/code-block 13px 与 footnote 12px 统一提至 14px，对齐微信正文最小可读下限，无豁免。
  - **②-ii 淡背景透明度**: **选项 B（非豁免）** —— callout `rgba(0,0,0,0.06)` 等 11 处 <0.15 一律提 alpha 至 0.15，产物严守 clamp 下限无特例；此为真实视觉变更，**新样张基准须用户 sign-off（开闸时门槛）**。
  - **其余清单项（无须用户抉择，据实为已裁定）**: dropcap/装饰行高按「首字下沉/装饰字符非正文行」语境豁免（正文行仍守 1.2 下限）；em→px 随开闸基线逐条 diff 审计（低风险）；SVG 纯白 → #fefefe（无争议）；border-radius/padding/margin 现状无冲突，开闸后作为新增块守护下限。
- **推荐总则**: 阈值冲突一律按客观权威标准裁定（WCAG / 微信实测下限 / 平台白名单），**禁止反推阈值以令现状产物通过**（拟合现状 = 循环论证、放过真缺陷）。逐条命中在开闸时以基线 diff 审计坐实：命中即二选一——「真实潜伏违规 → 修复样式」或「规则过严 → 按权威依据修订规则匹配范围/阈值」（`position:relative` 与 `strip-width-height-inline` 分别代表两类裁定方向）。
- **重评估条件**: 微信编辑器渲染下限变化（须实测），或新目标平台 profile 引入不同阈值时，各阈值随 profile 重新标定。

### M-004: 平台适配层 PlatformAdapter

- **职责**: output 域规则集**之上**的薄编排 + 报告层（非独立过滤 walker、非重新实现平台模型）——把「渲染管线 output 相 patch」与「对任意外部 HTML 的平台兼容体检 inspect」封装为统一平台抽象；为多平台（xhs / zhihu 预留）留扩展点，当前仅实 `wechat`。**不持有独立平台模型**：`patch` / `inspect` 共用 M-003 output 域规则集这一单一平台事实源，删除了与 output ruleset 重复建模的独立模拟器（`simulate-paste.ts` / `simulator/*` / `diff/per-node-diff.ts`）与收敛不变量对账机器
- **映射功能**: F-002 (AC-005 / AC-006 兼容性报告) / F-004 (AC-004 / AC-005 视觉一致性) / F-011 (AC-002)
- **对外接口**:
  ```ts
  interface PlatformAdapter {
    id: string; name: string;
    patch(hast): hast;               // = render output 相既有 applyRuleset(hast, rules, "output") 的具名封装（同一执行点）
    inspect(html: string): PatchLog; // 对任意外部 HTML：专用 inspect schema 标签剥离 ⊕ output 平台过滤规则子集 → 报告
  }
  ```
  - `wechatAdapter` 为首个（当前唯一）实现；`patch` 面向渲染管线（我方 hast），`inspect` 面向任意外部 HTML 字符串，入口不同。**规则集关系：`inspect` 规则集 ⊆ `patch` 规则集**——`patch` = 全 output 域规则（平台过滤 ∪ 产品归一 `clamp-*` / `readability-*` / `em→px` / 夜间风险），`inspect` **仅跑平台过滤规则子集**（strip / patch 族，建模微信真机剥/改；排除产品归一，见 §2.M-003 与 `AMENDMENT-platform-fidelity-r1#§9` R5）；二者非同一集，`inspect` 不对外部 HTML 报告产品归一（否则把「字号夹 14 / em→px / hex 转小写」当微信平台行为误报）。
  - `patch` **不是 render 后再跑一遍**——它就是 `render.ts` output 相既有 `applyRuleset(afterCustomCss, rules, "output")` 那一次执行的具名封装（M-002 stage 11）；render.ts 内部经 `wechatAdapter.patch` 调用同一执行点，render 与 adapter 不各维护一份 output-stage 调用逻辑而随时间漂移。
- **inspect 诚实语义**: inspect 面向**任意外部 HTML**（LLM 兼容性自查），语义 = 「wechat-flow 平台模型（标签剥离 ⊕ output 平台规则）会对这段 HTML 做什么」。
  - **专用 inspect schema（关键实现约束）**: `inspect` **不能复用渲染管线 schema**——`wechatFlowSanitizeSchema` 与 `hast-util-sanitize` `defaultSchema` 的**标签白名单都含 div**（不主动剥 div）。inspect 须构造**专用 inspect schema** = `defaultSchema.tagNames` 减去 `WECHAT_PASTE_UNSAFE_TAGS ∪ HARD_REMOVE_TAGS`，方能真剥 div / script 等；否则 `inspect(<div style="position:absolute">)` 仍返回空、对**任意外部 HTML** 不诚实。此专用 schema 的存在理由是 **inspect 面向任意外部 HTML（外部输入可含 div）**——**并非**渲染管线「留了 div」：渲染管线故意在 schema 白名单保留 div 标签，但 render 产物本身 **div-free 由构造保证**（`transform.ts` `allowDangerousHtml:false` 拦截 Markdown 裸 `<div>`、容器原语 `section`、零 div 创建，见 §2.M-003）。inspect = 专用 schema 标签剥离 ⊕ output 平台过滤规则报告。
  - **对自家 render 产物返回空 = 产物已达平台稳定态**（原收敛不变量的诚实形式，按需触发**非 CI 恒跑**）。**不宣称「预测微信真机」**——它报的是我方平台模型；真机保真由 §2.M-003「等效保真门禁」（全主题×全组合扫描）+ 少量真机确认承载。MCP request schema 钉死 `{ html: string }`（外部 HTML），tool description 明确「面向任意 HTML 的平台兼容体检；对已渲染产物返回空即干净」。
- **PatchLog 数据形**: `{ patchedHtml: string, changes: PatchChange[] }`；`PatchChange = { patch: string, label: string, count: number, samples: { selector: string, before: string }[] }`。兼容性报告 `nodeChangeRecords` 仍由 M-003 `apply.ts` 的 `executeStrip/executeTransform` 产出（现状即如此，删模拟器不影响此来源，见 §2.M-003）——DiagnosticsPanel / CompatibilityDiffView 消费源保持单一模型、无面板侧双源复活。
- **删除清单（独立模拟器）**: `simulate-paste.ts`、`simulator/{strip-attrs,strip-tags,rewrite-structure}.ts`、`diff/per-node-diff.ts` 删除；包级 `simulatePaste` / `SimulatePasteResult` / `NodeDiff` / `DroppedAttr` 导出删除（breaking npm API，见 `AMENDMENT-platform-fidelity-r1#§5`）；收敛不变量 CI 性质测试删除；`RenderResult.postPaste` 删除；`TargetProfile` / P-Q-N 三分 / platformFidelity 标记 / oracle-as-CI-gate 删除。删 `diff/per-node-diff.ts` 顺带消解位置下标 diff bug（数组下标 `beforeEls[i]` vs `afterEls[i]` 在节点删除后索引移位致级联错位）。
- **依赖模块**: M-003 (规则集引擎 — `patch` / `inspect` 复用 output 域规则集，非独立实现；`div` 携带样式剥离由 inspect 专用 schema 承载、`position` 族 / `font-family` 建模由 output 规则承载) / M-012 (schema 契约层 — PatchLog schema)
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-011, arch#§2.M-002, arch#§2.M-003]

### M-005: 主题与组件注册中心

- **职责**: 内置主题、Block / Mark / Variant / Token、主题装饰资产的注册与查询；Block 携带 `category` 功能分类（驱动 UC-015 InsertDrawer 分类 tab 数据化）与 base-style（§8.2 Q3.15 L1 层）——base-style 随 `defineBlock` 注册持有，按 (blockId, variantId) 查询供 M-002 stage 5 合成，内置 variant 与 `default` variant 均可携带静态 base-style；自定义样式容器 variant 双路径注册（plugin-api `defineVariant` 与 MCP API-034 `register_variant`，共享 `registry/variant.ts` 存储与 F-010 AC-005 校验链路，进程内生命周期，§8.2 Q3.16）；主题守护 9 维静态校验（含「内置 template 完整性」维度，F-011 AC-009）；主题热切换；template 作为主题命名空间下的预设变体登记（F-008）；扩展点支持第三方主题与 template pack 注册
- **映射功能**: F-003 (AC-001..AC-012) / F-008 (AC-001 注册, AC-002 白名单覆盖, AC-003 frontmatter 语义, AC-004 describe_theme/describe_template) / F-009 (AC-001 继承 + AC-002 品牌包) / F-011 (AC-003 主题守护 9 维 / AC-009 template 完整性)
- **对外接口**: 包级 API：
  - 主题层：`registerTheme(definition)`、`listThemes()`、`describeTheme(id)`、`listBlocks()`、`describeBlock(id)`、`listBlockVariants(blockId)`、`registerVariant({ blockId, id, label, style }) → void`（style 即该 variant 的 base-style；命中平台禁区时**核心函数抛出**含 `rejectedDeclarations`（`{ slot, property, value, reason }`）的结构化错误——拒绝清单挂在被抛出的 Error 对象上，成功路径无返回值；**MCP `register_variant` 边界层 catch 该异常后转 `{ registered: false, rejectedDeclarations }` 非抛出响应**，非直传——见「注册期构造守卫」）、`getBlockBaseStyle(blockId, variantId) → Record<string, string>`（M-002 stage 5 合成入口；解析顺序见「Block / Variant 注册契约」）、`derivePalette(seed)`、`validateThemeGuard(theme) → GuardResult`
  - **template 层（主题命名空间隔离）**：
    - `defineTemplate({ themeId, templateId, render }) → void` — 独立注册 API；与 `defineTheme.templates` 字段语义等价
    - `listThemeTemplates(themeId: string): TemplateMeta[]` — 返回该主题已注册的全部 template 元数据（轻量，不含 Markdown 正文）
    - `describeTemplate(themeId: string, templateId: string): TemplateDef` — 返回 template 完整定义（含预填 Markdown 与 metadata）；themeId / templateId 任一不存在抛 `E_NOT_FOUND`
    - `validateTemplateCoverage(themeId: string, templateId: string): CoverageReport` — 静态校验 template 是否覆盖 F-003 AC-012 白名单（9 基础元素 + ≥ 6 核心 Block 容器），返回逐项缺失清单
    - `validateThemeTemplates(themeId: string): ThemeTemplateValidationResult` — 9 维守护第 9 维（内置 template 完整性）执行器；遍历该主题全部 template 调 `validateTemplateCoverage`，任一未覆盖即整体 `pass: false`；由 `guard/validate-theme-templates.ts` 实现，于 CI 守护流程阻断发布
  - 被 M-002 / M-008 / M-009 调用
- **注册期构造守卫（主防线，构造期硬防已注册设计资产）**: `registerBlock` / `registerVariant` / `registerTheme` / `registerMark` 的样式声明命中平台禁区即**拒绝**——禁区 = `FORBIDDEN_CSS_PROPS`（`font-family` / `position` / `float`）∪ `FORBIDDEN_DISPLAY_VALUES`（`display: flex / inline-flex / grid / inline-grid`）∪ `FORBIDDEN_POSITION_PROPS`（`top` / `right` / `bottom` / `left` / `z-index`）∪ 平台禁用值域（§2.M-003 平台常量单一源）。**核心 register* 函数命中即抛出**含 `rejectedDeclarations`（`{ slot, property, value, reason }` 结构化清单）的错误——`rejectedDeclarations` 挂在被抛出的 Error 上、成功路径无返回值携带清单（对齐 `registerVariant` 现状 `packages/core/src/registry/variant.ts:100-107` 的 `throw Object.assign(new Error(...), { rejectedDeclarations })` 模式）；`reason` 含可执行替代指引（如「主题身份用字号 / 字重 / 配色 / 间距 / 布局承载，勿用 font-family」）。**MCP 边界层（`register_variant` 等 Tool wrapper）catch 该异常后转 `{ registered: false, rejectedDeclarations }` 非抛出响应**——Block / Theme / Mark 守卫同此模式（core throw + MCP 边界 catch-and-restructure），非「core 不抛、MCP 直传」。此校验沿既有 `registry/css-property-whitelist.ts`（`CSS_SAFE_PROPERTIES` / `isWhitelistedProperty`）单一机制扩展——白名单放行 ∩ 平台禁区剔除，不建平行校验器；`CSS_SAFE_PROPERTIES` **移除 font-family**（令 customCss / register 对 font-family 也 fail-fast 而非静默剥）。
  - **按输入来源分工（守卫 vs output 补救，非按属性分两级）**: 构造守卫（主防线）拦截**已注册设计资产**——内置 block / variant / theme / mark，以及第三方 / LLM 经 `register*` 提交的资产。运行期 output 补救规则（`patch-flex-to-block` / `strip-position` / `strip-font-family` 等，M-003 output 相）拦截**唯一无 register 步、守卫拦不住的输入 = 运行期 `customCss`**（用户 / LLM 渲染时注入）。二者覆盖**不同输入源**、非冗余：同一属性（如 `display: flex`）在已注册资产里被守卫**源头拒绝**（资产须改写为微信安全布局），在运行期 customCss 里被 `patch-flex-to-block` **兜底转 block**——「守卫禁 flex」与「output 补 flex」不矛盾（管不同输入），本架构不建「构造禁集 vs output 补救集」两级属性分类法。
  - **现状差异（构造守卫须据实建设，非「复用」）**: 仅 `registerVariant` 现有 `validateStyle` / `rejectedDeclarations` 机制可直接复用；`registerBlock` 只校验 slot 形状、`registerTheme` 零校验、`registerMark` 零校验且 `MarkDefinition.style` 是**字符串**（如 `inline-code` 的 `font-family: monospace`、`emphasis` 的 `-webkit-text-emphasis`）须先 CSS 字符串解析——Block / Theme / Mark 三者的守卫基础设施须**从零建构**，与 Variant 声明式结构不同形（T-187）。
  - **内置资产 FORBIDDEN 声明须源头清理（守卫上线前置，非仅 font-family）**: 构造守卫抛出前，**全部内置设计资产**（block / variant / theme / mark）不得再声明任何 `FORBIDDEN_CSS_PROPS` ∪ `FORBIDDEN_DISPLAY_VALUES` ∪ `FORBIDDEN_POSITION_PROPS` 成员，否则进程启动注册内置资产时守卫抛异常 → 注册中断 → 全 suite 无法加载注册表（硬阻塞）。清理**不限于 font-family**：已核实 `packages/blocks/src/blocks/author-card.ts` 静态 baseStyle 声明 `display: flex`（内置块真 bug）——须**源头迁移**为微信安全布局（`display: table` / `inline-block` 等），不靠 output `patch-flex-to-block` 蒙混（该规则管运行期 customCss，不为内置块违规兜底）。守卫上线前须 grep 全仓内置资产静态声明（`display:(flex|grid)` / `position:` / `float:` / `font-family:` / 定位族），逐项源头改写清零。分阶段落地：运行期 output 规则兜底（现状）→ **审计并清理全内置资产 FORBIDDEN 声明**（font-family：5 主题 tokens / heading / paragraph / code-block + `packages/blocks/src/blocks/{paragraph,quote}.ts` dropcap 装饰 + `packages/marks/src/marks/inline-code.ts`；flex：`author-card` 迁 table/inline-block；扫描出的其余违规同批）→ 上构造守卫。构造守卫禁声明的**逻辑后果**：font-family 在所有 render target 缺席（图片路径亦无源可保留，详附录 B 决策①）。
  - 作用是把「产物在 output 相被 strip」的失效前移到注册期显式拒绝，使 output 相对内置样式源的命中收敛为零；output 相对生成声明的实际拦截目标退化为动态 customCss / 第三方注入 / T-189 分阶段清理未竟的残留。平台知识与 M-003 output 域规则、M-002 sanitize schema 同源于平台常量单一源
- **依赖模块**: M-006 (调色板派生) / M-007 (plugin-api 类型) / M-012 (schema 契约层 — TemplateDef / CoverageReport schema + `extendSanitizeSchema` 共享契约；M-005 通过此契约把自定义 Block 标签合入 M-002 sanitize 白名单，避免与 M-002 形成模块环) / `@wechat-flow/contracts` (平台常量 `platform/wechat-paste.ts`，注册期校验的平台事实源)
- **内部关键组件**:
  - `registry/theme.ts`、`block.ts`、`mark.ts`、`variant.ts`、`token.ts` — 五类注册表
  - `registry/template.ts` — template 注册中心；存储结构 `Map<themeId, Map<templateId, TemplateDef>>`；支持 `defineTheme.templates: Record<TemplateId, TemplateDef>` 嵌套与 `defineTemplate({ themeId, templateId, render })` 独立 API 两路注册；同名 templateId 在不同 themeId 下互相隔离
  - `guard/nine-dimensions.ts` — 主题守护 9 维校验；维度清单：基线选择器密度、核心 block 覆盖率、token 覆盖率、跨主题身份 token 防碰撞、元数据完整性、theme.css 属性合规、WCAG 对比度自动校验（阈值 4.5，WCAG AA 文本基准，与 M-002 `pipeline/readability.ts` 夜间风险/对比度收集器阈值一致；同一 token 在守护通过后运行时不会复现 `nightRiskIssues`）、装饰资产完整性、内置 template 完整性
  - `guard/validate-theme-templates.ts` — 9 维新维度执行器：`validateThemeTemplates(themeId: string): ThemeTemplateValidationResult`；调用 `listThemeTemplates(themeId)` 取该主题全部 template，对每个 template 调 `validateTemplateCoverage(themeId, templateId)`，任一未覆盖即记 `pass: false` 与缺失项；单元测试位于 `packages/core/src/theme-guard/template-coverage.test.ts`
  - `inheritance/delta-merge.ts` — 主题继承 + delta 合并（F-009）；继承时 templates 字典亦按 delta 合并
  - `brand-pack/lock.ts` — 品牌包字体 / 配色 / 组件子集锁定
- **数据类型定义**（schema 单源在 M-012 `theme/manifest-schema.ts` 与 `theme/template-schema.ts`）：
  ```ts
  interface TemplateDef {
    id: string;                  // templateId（主题命名空间内唯一）
    themeId: string;             // 归属主题 ID
    markdown: string;            // 预填 Markdown 源码（含 frontmatter）
    metadata: {
      title: string;             // 显示名（如「科技评测」）
      description: string;       // 一句话场景说明
      thumbnailUrl?: string;     // 缩略图 URL，可选；缺省时由 ThemeMarketGallery 现场渲染缩略
    };
  }

  // 轻量元数据（listThemeTemplates 返回值，不含 markdown 正文以减少 payload）
  type TemplateMeta = Pick<TemplateDef, 'id' | 'themeId' | 'metadata'>;

  interface CoverageReport {
    pass: boolean;
    coveredElements: string[];   // 命中的基础元素白名单子集（H1..H6 / paragraph / list / blockquote / link / code-block / hr / image / table）
    missingElements: string[];   // 未命中的基础元素
    coveredBlocks: BlockId[];    // 命中的核心 Block 容器（callout / card / steps / quote / pull-quote / compare 等）
    missingBlocks: BlockId[];    // 未命中的核心 Block 容器
  }

  interface ThemeTemplateValidationResult {
    pass: boolean;
    themeId: string;
    templates: { templateId: string; coverage: CoverageReport }[];
    failingTemplates: string[];  // pass=false 的 templateId 集合
  }
  ```
- **Block / Variant 注册契约**（schema 单源在 M-012；实现位于 `registry/block.ts` 与 `registry/variant.ts`）：

  ```ts
  type BlockCategory =
    | 'text'        // 正文类：段落、标题、列表、引用、分隔线、代码块、表格、定义列表 等基础排版
    | 'media'       // 媒体类：图片、图注、图集、视频、音频、二维码 等
    | 'emphasis'    // 强调类：提示框、高亮块、警示、小技巧、拉引、免责声明 等注意力容器
    | 'structured'  // 结构类：卡片、步骤、时间线、对比、问答 等信息骨架
    | 'marketing'   // 营销类：CTA、订阅、推荐、小程序卡、广告卡、社交引导 等公众号运营组件
    | 'meta';       // 元信息类：作者卡、页脚、脚注、引用出处、阅读时长 等文末/边栏元数据

  interface BlockVariant {
    id: string;
    label?: string;
    baseStyle?: Record<string, Record<string, string>>;  // 该内置 variant 的静态样式（slot → cssProp → cssValue），与 registerVariant 提交的 style 同构；缺省时该 variant 无 L1 静态样式
  }

  // 块级 hast 装饰钩子上下文：变体、指令透传属性、文档级渲染状态
  interface BlockDecorateContext {
    variant: string;                                     // 当前变体 id（含 default）
    attrs: Record<string, string>;                       // directiveAttrs 校验后的指令透传属性
    docState: Record<string, unknown>;                   // 文档级渲染状态（如 dialog speaker 侧位交替分配）
  }

  interface BlockDefinition {
    id: string;
    name: string;
    category: BlockCategory;                              // required，无默认值；全部 40 个内置 block 必须声明，驱动 UC-015 InsertDrawer 分类 tab 数据化（落地 A-014 从占位约定到冻结决策，取代旧「行内 / 块级 / 标注 / 封面」4 分类临时占位）
    directiveAttrs: ZodObject;                           // strict zod object，建模指令 `{}` 语法域标注属性（指令正文内容不在此域）；声明域外属性经 strict 校验拒绝
    variants: BlockVariant[];
    baseStyle?: Record<string, Record<string, string>>;  // block 级 default variant 的静态样式；含 baseStyle 时必含 `root` slot
    slots: string[];                                     // 必含 `root`
    decorate?: (element: HastElement, ctx: BlockDecorateContext) => void;  // 可选块级 hast 装饰钩子；transform 展开容器 hast 后调用，收编块级子结构生成与装饰
  }
  ```

  `directiveAttrs` 建模 markdown 指令 `{}` 语法域标注属性（指令正文天然在指令体内，不属此域），各内置 block 的声明属性集：

  | Block | directiveAttrs 声明属性集 |
  |-------|--------------------------|
  | `pull-quote` | `{ author?: string }` |
  | `dialog` | `{ speaker?: string, avatar?: string }` |
  | `compare` | `{ 'left-label'?: string, 'left-value'?: string, 'right-label'?: string, 'right-value'?: string, title?: string }` |
  | 其余全部内置 block | 空 strict object（不接受任何指令属性） |

  strict 语义：`directiveAttrs` 为 strict zod object，声明域外的属性一律拒绝并汇入渲染诊断；合法指令属性经校验后按 §2.M-002 `data-{block}-{attr}` 机制透传至 hast。**结构化数据模型（`attrsSchema` + `render(attrs)`）不在 core 注册中心承载**，自持于 plugin-api M-007 surface（见 §2.M-007）。

  `decorate(element, ctx)` 为可选块级 hast 装饰钩子：transform 展开容器 hast 后按 blockId 调用，`ctx` 携带 `variant`、指令透传 `attrs` 与文档级 `docState`（如 dialog speaker 侧位交替分配）；块级子结构生成与装饰逻辑收编于此钩子，渲染管线不含块名特化分支（见 §2.M-002 通用渲染机制）。

  `getBlockBaseStyle(blockId, variantId)` 的 L1 base-style 解析顺序（M-002 stage 5 合成入口，与 §8.2 Q3.15 三层合成语义一致，仅解析 L1）：

  1. `variantId === 'default'` → 读 `blockDef.baseStyle.root`；
  2. `variantId` 命中 `blockDef.variants` 中某内置 variant 且该 variant 带 `baseStyle` → 读 `variant.baseStyle.root`；
  3. 否则回退 `registry/variant.ts` 运行时 store（`registerVariant` / `defineVariant` 注册的动态样式容器 variant）→ 读 `entry.style.root`；
  4. 均未命中 → `{}`。

  内置静态 base-style 与 `registerVariant` 运行时动态样式容器 variant 两路径并存：前者在 block 定义时随 `defineBlock` 声明，后者在进程内动态注册（§8.2 Q3.16），二者经同一 `css-attr-filter` 白名单校验（白名单放行 ∩ 平台禁区剔除，见「注册期构造守卫」），L1 合成入口统一为 `getBlockBaseStyle`。

- **主题 token 契约**: token 字典契约由 E-002 承载（五大类别 open record，`ThemeTokens = Record<string, string>`；个别 token 名不在 arch 层枚举，落在各主题包 `packages/themes/{theme}/src/tokens.ts`）。现有 token 字典已含 `--font-size-h1..h6`、`--color-code-bg` / `--color-code-text`（inline code）、`--font-size-sm` / `--align-text-caption`（caption 小字复用）等完整视觉槽位；Block / Markdown 基础元素视觉升级在此 open record 内新增 token 属非破坏性变更，不改 E-002 契约结构，不在 arch 层新增 token 名。

- **template 命名空间隔离语义**: 主题是 template 的命名空间；同名 templateId（如各内置主题均提供的 `starter`）在不同主题下独立定义且渲染产物不同；frontmatter `theme: tech` + `template: starter` 解析为 (themeId=tech, templateId=starter) 复合键，运行时仅作为审计标记不参与渲染（PRD F-008 AC-003）
- **内置 template 完整性下限**: 每内置主题（default / magazine / literary / business / tech）须 ≥ 1 预设 template；每 template 须 mdast 覆盖 F-003 AC-012 白名单 9 基础元素 + ≥ 6 核心 Block 容器；不达标由 `guard/nine-dimensions.ts` 在 CI 阻断发布（F-011 AC-009）
- **内置 template 清单**: 每内置主题 `templates/` 目录下提供一份通用起步模板 `starter` 加一份场景化模板，文件名即 templateId：

  | 主题 | 场景化 templateId | 通用 templateId |
  |------|------------------|----------------|
  | default | `listicle`（清单体） | `starter` |
  | magazine | `feature-story`（专题特写） | `starter` |
  | literary | `essay`（散文随笔） | `starter` |
  | business | `case-study`（案例分析） | `starter` |
  | tech | `tutorial`（教程 / How-to） | `starter` |

  各主题在其 `templates/{templateId}.md` 提供具体实现；templateId 在其 themeId 命名空间内唯一，同名 templateId 在不同主题下可独立定义，视觉差异由主题 token 与 Block variant 驱动。
- **context_load**: [prd#§2.F-003, prd#§2.F-008, prd#§2.F-009, prd#§2.F-011, arch#§2.M-006]

### M-006: 调色板派生

- **职责**: 从单一主色或 `{primary, secondary?, accent?, dark?}` seed 在 LCH 感知均匀色彩空间派生完整 token 字典（背景明暗梯度、辅助色、状态色、装饰色）
- **映射功能**: F-003 (AC-011 base-color 派生) / F-010 (AC-007 第三方主题消费派生 API) / F-013 (`derive_palette` Tool)
- **对外接口**: 包级 API：`derivePalette(seed, options) → TokenDictionary`；被 M-005 / M-009 调用
- **依赖模块**: 无（纯函数包，依赖外部 color 库如 `culori`）
- **内部关键组件**:
  - `lch/derive.ts` — LCH 空间梯度计算
  - `tokens/dictionary-builder.ts` — 派生 token 字典构建
  - `wcag/contrast-validator.ts` — 派生后对比度校验
- **context_load**: [prd#§2.F-003, prd#§2.F-010]

### M-007: 插件沙箱与 plugin-api

- **职责**: 第三方插件运行的 Web Worker 沙箱 + 通过 Comlink 暴露给沙箱内代码的 plugin-api surface（白名单 API）；沙箱内禁全局网络对象，外部网络请求经"仅事件通道"代理；运行时违规检测与降级
- **映射功能**: F-010 (AC-002 manifest+schema+render 三件套 / AC-005 自动校验 / AC-006 variant 注册扩展点 / AC-008 沙箱隔离)
- **对外接口**:
  - 主线程 API：`loadPlugin(packUrl) → PluginHandle`、`unloadPlugin(id)`、`grantPermissions(id, manifest.permissions)`
  - 沙箱内 plugin-api surface：`defineBlock`、`defineVariant`、`defineRule`、`defineTheme`、`registerAsset`、`requestResource(url, init?) → Promise<Response>`（唯一网络出口）
- **plugin-api `DefineBlockInput` 结构化契约**: 沙箱内 `defineBlock(input: DefineBlockInput)` 的入参自持结构化数据模型——`attrsSchema`（结构化 zod schema，建模第三方插件 Block 的数据属性，如自定义营销块 `promo-banner { headline: string, cta: string, imageUrl: string }`、时间线块 `plugin-timeline { events: string[] }`；示例均为第三方插件场景，其 blockId 命名空间与内置 40 块无交集，内置 Block 的属性模型以 §2.M-005 `directiveAttrs` 为准）与 `render(attrs) → hast`（结构化属性驱动的渲染函数，是结构化 `attrsSchema` 的唯一正当消费方）。结构化 schema 自持于 M-007 plugin-api surface，其类型工厂由 M-012 `component/attrs-schema.ts` 提供；**core 注册中心（M-005 `BlockDefinition`）不承载结构化 schema**——core 仅持 `directiveAttrs`（指令 `{}` 语法域）与可选 `decorate`（hast 装饰钩子），见 §2.M-005。
- **依赖模块**: M-005 (主题与组件注册中心) / M-003 (规则集引擎 — 规则补丁注册路径) / M-012 (schema 契约层)
- **内部关键组件**:
  - `worker/runtime.ts` — Worker 入口与 Comlink RPC 桥；启动时执行 `assertNetIsolation()`：先 `delete globalThis.fetch / XMLHttpRequest / WebSocket / EventSource`，随即断言 `typeof globalThis.fetch === 'undefined' && typeof globalThis.XMLHttpRequest === 'undefined'`，断言失败抛 `E_WORKER_NETWORK_LEAK` 并 `self.close()` 终止 Worker；该断言覆盖 bundler 注入 polyfill / Comlink 版本意外引入 fetch 的回归路径
  - `surface/plugin-api.ts` — 白名单 API 定义；`requestResource` 实现 = `comlink.proxy(mainThreadAcl.requestResource)`
  - `acl/network-gate.ts` — 主线程网络门禁：读取 pack manifest 的 `permissions.network: string[]`（URL pattern 白名单，支持 `https://*.example.com/*` 通配），命中放行调用 `fetch`，未命中抛 `E_PERMISSION_DENIED`
  - `acl/audit-log.ts` — 所有 `requestResource` 调用结果（allow/deny + url + pluginId + ts）写入 §5.5 审计流
  - `validation/manifest-check.ts`、`schema-check.ts`、`render-sniff.ts` — 加载时三层校验
  - `runtime/violation-detector.ts` — 运行时违规检测（超时、内存、API 调用频率）
  - `fallback/placeholder.ts` — 校验或运行时违规降级为占位符
- **网络代理时序**:
  ```
  Plugin (Worker)                  PluginHost (Main thread)
        │                                  │
        │ requestResource("https://x/")    │
        ├─────────── Comlink ─────────────▶│
        │                                  ├─ network-gate.check(url, manifest.permissions.network)
        │                                  ├─ audit-log.write(allow|deny)
        │                                  ├─ deny → throw E_PERMISSION_DENIED
        │                                  ├─ allow → fetch(url, init)
        │                                  ▼
        │◀─────────── Response (structured clone) ─────────
  ```
- **context_load**: [prd#§2.F-010, prd#§3.2, arch#§5.3]

### M-008: 应用层 use case

- **职责**: 编辑器、MCP server、CLI 三端共享的"语义级用户意图"封装层——把"渲染 + 复制"、"渲染 + 导出 HTML"、"渲染 + 长图 job"、"中文排版修订"等任务串接为单个调用入口，不持有 UI 状态，不持有 DOM
- **映射功能**: F-001 / F-004 / F-005 (AC-001 长图 / AC-002 封面 / AC-003 素材库上传 / AC-004 异步 job) / F-006 / F-013 (AC-001 共享 use case) / F-014
- **对外接口**: 包级 API：`composeRender(input) → RenderResult`、`composeCopy(input) → ClipboardPayload`、`composeExportHtml(input) → string`、`composeExportLongImage(input) → JobHandle`、`composeExportCover(input) → JobHandle`、`composeUploadImage(input) → JobHandle`、`composeUploadWechatAsset(input) → JobHandle`、`composeApplyZhTypo(input) → {fixed, perRule, totalChanges, diff: DiffEntry[]}`
- **依赖模块**: M-002 (渲染管线核心) / M-005 (主题与组件注册中心) / M-010 (中继服务客户端) / `@wechat-flow/zh-typo`（copy 路径直接复制 render 产物，无 M-004 依赖）
- **内部关键组件**:
  - `composers/render.ts`、`copy.ts`、`export-html.ts`、`export-long-image.ts`、`export-cover.ts`
  - `composers/upload-image.ts`、`upload-wechat-asset.ts`
  - `composers/apply-zh-typo.ts`
  - `clipboard/dual-mime-payload.ts` — F-004 AC-001 html + text 双 MIME 组装
- **`composeCopy` pipeline 约束**：`composeRender → buildDualMimePayload → navigator.clipboard.write`；剪贴板 HTML 载荷**直接取 `composeRender` 产物**（`render().html`）——因 output 相（§2.M-002 stage 11 = `wechatAdapter.patch`）已对产物建模平台合规、产物即平台稳定态，预览 ≡ 复制天然成立（PRD F-004 AC-004）。**copy 三路（`composeCopy` / CLI `runCopy` / MCP `export_clipboard_payload`）的 render 调用须 `injectNodeIds: false`**——`data-node-id` 交互脚手架仅预览路径注入，禁止为省一次 render 而复用预览已注入 node-id 的结果，否则脚手架泄漏进微信剪贴板。对**外部粘贴输入**的兼容性体检由 M-009 `simulate_paste`（= `inspect`）独立入口承载
- **context_load**: [prd#§2.F-001, prd#§2.F-004, prd#§2.F-005, prd#§2.F-006, prd#§2.F-013, prd#§2.F-014, arch#§2.M-002, arch#§2.M-003, arch#§2.M-004, arch#§2.M-010]

### M-009: MCP server

- **职责**: 对 LLM Agent 暴露 24 个 Tool（20 同步 + 4 异步长任务；含 `get_job` 与 `get_ruleset_version`；含 `describe_template` 提供 F-008 主题预设变体查询；含 `register_variant` 提供 F-010 AC-010 注册式自定义样式容器 variant）；stdio + HTTP/SSE 双 transport；API key + per-key 配额；Idempotency-Key 去重；版本三元组透传到响应；**鉴权基线**两级（`scope=user` Tool 调用 vs `scope=admin` 管理端点；admin key 只走 M-010 admin 路由，不能调 Tool）
- **映射功能**: F-013 (AC-001..AC-006) / F-008 (AC-004 describe_template Tool) / F-010 (AC-010 register_variant Tool)
- **对外接口**: MCP Tool（24 个，20 同步 + 4 异步）— 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-001..API-016 + API-033 + API-034
- **MCP 工具契约（采用平台保真模型的 re-map，breaking 见 `AMENDMENT-platform-fidelity-r1#§5`）**:
  - `simulate_paste` (API-014)：语义 = `PlatformAdapter.inspect`，resp 为 PatchLog 形 `{ patchedHtml, changes: [{ patch, label, count, samples: [{ selector, before }] }] }`。**保留工具 key `simulate_paste`**（改 key 破 tool-count / 外部配置），但**必须带 tool `description`** 澄清语义（面向任意外部 HTML 的平台兼容体检；对已渲染产物返回空即干净）；`filteredHtml` 作 `patchedHtml` 别名保留一个过渡窗口（breaking，见 `AMENDMENT-platform-fidelity-r1#§5`）。
  - `render_markdown` (API-001)：**删 `postPaste`**；resp 带 `report{ nodeChangeRecords, nightRiskIssues }`——使 customCss 被平台规则剥除的声明（含 font-family）以 warn 诊断对 LLM 可见；可选 `platform` 参数 `z.enum(["wechat"])`，未注册平台显式 `E_UNSUPPORTED_PLATFORM`（**禁静默回退**）。
  - `export_clipboard_payload` (API-015)：返回 `render().html`（复制即 render 产物）。
  - **全 24 工具补 `description`**：`router.ts` 现仅注册 inputSchema、零 description（既有 LLM 友好度硬伤），借本次补齐。
  - **breaking 版本化**：`postPaste` 删除、`simulate_paste` 字段重命名与结构变、`@wechat-flow/core` `simulatePaste` 导出删除属 breaking API 变更——`@wechat-flow/core` 与 mcp-server major/minor bump + CHANGELOG 逐项迁移条目；MCP 契约版本信号现仅 `rulesetVersion` 探测不到工具形变，由 CHANGELOG 承担、release go/no-go 清单加「MCP 契约 breaking 说明」。产品文档 `skill/SKILL.md` / `skill/references/tool-catalog.md`（现硬编码 `simulate_paste→{filteredHtml,diffNodes,droppedAttrs}`）须重写为新语义。
- **依赖模块**: M-008 (应用层 use case) / M-002 / M-005 / M-006 / M-010 / M-012
- **内部关键组件**:
  - `transport/stdio.ts`、`transport/http-sse.ts` — 双 transport entry
  - `auth/api-key.ts` — API key 鉴权 + per-key 配额；校验 `scope` 字段；user / admin 两级 key 哈希存储于 E-010 ApiKey 表；明文仅在创建时由 admin API 返回一次
  - `auth/scope-guard.ts` — Tool 路由前置守卫：仅 `scope=user` 可达 Tool 路由表；admin scope 直接 403 `E_PERMISSION_DENIED`
  - `idempotency/dedup.ts` — `sha256(input + toolsetVersion)` 去重缓存
  - `tools/router.ts` — 24 个 Tool 的 dispatcher，映射到 M-008 composer 或 M-005 查询（`describe_template` 直达 M-005 `describeTemplate(themeId, templateId)`；`register_variant` 直达 M-005 `registerVariant(...)` 并回传 `{ registered, rejectedDeclarations }`，注册条目进程内生命周期见 §8.2 Q3.16；`simulate_paste` 直达 M-004 `wechatAdapter.inspect`）；**每个 Tool 注册须带 `description`**（补齐既有零 description 硬伤）；Tool 层为 thin wrapper，禁止持有业务逻辑（业务逻辑统一在 M-008 / M-006 / M-005 / M-004）
  - `version/triple-injection.ts` — 响应注入版本三元组
- **Skill bundle 协同**: `skill/SKILL.md` 引用本模块 24 个 Tool 的调用顺序约定（典型链：`list_themes` → `describe_theme` → `describe_template` → `render_markdown` → `simulate_paste` → `upload_to_wechat_asset`），由 LLM Agent 解析为语义任务；Skill bundle 与 MCP server 共版本号发布
- **两阶段取数语义**: `describe_theme.templates` 仅返回 `TemplateMeta[]`（轻量元数据，含 `id` / `themeId` / `metadata`，不含 Markdown 正文），用于 LLM Agent 浏览主题命名空间下可选 template；`describe_template` 返回完整 `TemplateDefinition`（含可用于创建文档的 Markdown 正文 + 覆盖统计 + mdast 摘要 + 依赖清单），**仅在 one-time 创建文档时拷贝** —— 拷贝完成后 frontmatter 中的 `theme` / `template` 字段不再持续消费 Markdown 正文，仅作为审计标记保留
- **context_load**: [prd#§2.F-013, prd#§3.2, arch#§3]

### M-010: 中继服务

- **职责**: 凭据中继（AppID/AppSecret / 图床 token 服务端持有）；图片上传 proxy；公众号素材库上传 proxy；BullMQ 长任务调度；Playwright Chromium worker 编排；y-websocket Yjs 协同子服务；**承载 admin API key 管理端点**（API-028..API-031，仅 `scope=admin` 可达）
- **映射功能**: F-005 (AC-001..AC-004) / F-006 (AC-001 多图床 / AC-002 压缩 / AC-003 EXIF 剥离 / AC-004 重试) / F-012 (AC-001..AC-004 同步) / F-013 (AC-004 鉴权 + 配额 + job + admin 管理)
- **对外接口**: HTTP REST + SSE + WebSocket — 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-017..API-021 + API-026..API-027 + API-028..API-031（admin API key 管理端点）
- **依赖模块**: M-012 (schema 契约层) / Redis 7.x (BullMQ + idempotency + awareness pub/sub) / Playwright (Chromium headless) / SQLite/Postgres (持久化)
- **内部关键组件**:
  - `credentials/store.ts` — 凭据存储抽象（环境变量 / KMS / Vault，由 deploy-spec 终定）
  - `image-host/qiniu.ts`、`oss.ts`、`cos.ts`、`smms.ts`、`local.ts`、`custom.ts` — 6 类图床适配器
  - `wechat-asset/uploader.ts` — 微信素材库上传 (持有 AppID/AppSecret)
  - `job/queue.ts` — BullMQ 队列工厂；queue 命名 `bullmq-{kind}` (kind ∈ image-upload / wechat-asset-upload / long-image-render / cover-render)；job name 形如 `<kind>:<apiKeyId>:<idemKey-prefix8>`；默认 attempts=3 + exponential backoff (起 1s, factor 2, max 30s)
  - `job/idempotency.ts` — `sha256(canonicalize(input) + toolsetVersion)` 计算；Redis key `idem:{apiKeyId}:{sha256}` TTL 24h；命中返回原 `jobId`，未命中入队
  - `job/state-machine.ts` — `pending → running → succeeded / failed` 状态机；BullMQ events 同步写 E-005 Job 表
  - `job/sse-bridge.ts` — BullMQ QueueEvents → Hono `streamSSE` 桥，按 `jobId` route 推送 `progress / succeeded / failed`
  - `headless/playwright-pool.ts` — Playwright `chromium.launch({headless: true})` 进程池；按 `viewportWidth / format` 配置 page；渲染长图 / 封面后落地为 PNG 字节流 → 写对象存储 → 回填 Job.result
  - `image/preprocess.ts` — `sharp` 库做 EXIF 剥离、压缩、宽度规整（≤ 1080px）
  - `yjs/y-websocket-server.ts` — y-websocket 服务端 integration（Hono `/yjs/:docId` 端点 + WebSocket upgrade）；维护 Y.Doc 内存副本；订阅 Redis `yjs:awareness:{docId}` channel；周期性 snapshot 节流（每 60s 或 100 ops）写 E-009 YDocSnapshot
  - `admin/api-keys.ts` — admin API key 管理路由（POST 创建 / GET 列出 / PATCH 轮换 / DELETE 吊销）；前置 `auth/admin-guard.ts` 校验 `scope=admin`；创建端点用 `crypto.randomUUID` + `crypto.subtle.digest('SHA-256')` 生成 key 与哈希；明文 key 仅在响应中出现一次
  - `auth/admin-guard.ts` — admin API 鉴权基线：(1) 校验 Bearer key 哈希命中 E-010.scope='admin' 行；(2) 强制 `X-Admin-Request: 1` 自定义 header（防止 CSRF）；(3) 来源 IP 白名单（环境变量 `ADMIN_IP_ALLOWLIST` 配置；缺省时仅允许 loopback）；(4) admin 操作全部写审计日志（actor=apiKeyId, action, target, ts）到 §5.5 审计追溯通道
  - `auth/editor-session.ts` — Editor SPA 短期 JWT 颁发与续期；HS256 签名（`EDITOR_JWT_SECRET` 环境变量），载荷遵循 API-032 schema；sessionId 写入审计日志 §5.5
  - `auth/token-resolver.ts` — 统一 Bearer token 解析：根据 JWT `iss='editor'` vs API key（非 JWT 串）分流到 session 校验或 E-010 哈希校验
- **context_load**: [prd#§2.F-005, prd#§2.F-006, prd#§2.F-012, prd#§2.F-013, prd#§3.2, arch#§5.3, arch#§6.3]

### M-011: CLI

- **职责**: 主题/插件开发者脚手架——`init` / `dev`（本地热重载）/ `validate`（manifest + schema + 主题守护）/ `publish`；与 LLM Agent 通过同一份 Tool 契约的命令行壳调用（F-013 AC-003）
- **映射功能**: F-010 (AC-003 CLI 脚手架 / AC-006 variant 校验) / F-013 (AC-003 CLI 分发形态)
- **对外接口**: CLI 命令 — 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-022..API-025
- **依赖模块**: M-002 (渲染管线核心 — `validate` / `dev` 本地执行) / M-005 (主题守护) / M-007 (manifest + schema 校验) / M-008 (use case — `cli render` 等命令)
- **内部关键组件**:
  - `commands/init.ts` — `--template plugin|theme` 两种骨架
  - `commands/dev.ts` — Vite middleware + HMR + pack live-reload
  - `commands/validate.ts` — manifest + schema + 主题守护 9 维（含内置 template 完整性） + variant 申报一致性
  - `commands/publish.ts` — pack 打包 + 发布到 registry
  - `commands/render.ts`、`copy.ts`、`export.ts` — Tool 契约的 CLI 壳
- **context_load**: [prd#§2.F-010, prd#§2.F-013]

### M-012: schema 契约层

- **职责**: 全项目类型与运行时 schema 单一事实来源——MCP Tool 入参出参、Hono RPC 路由契约、组件 schema（内置 Block `directiveAttrs` 指令域 / 插件 Block 结构化 `attrsSchema` 数据域）、主题 manifest、pack manifest、Rule schema、Diagnostic 结构、Job 结构；提供 TS 类型 + 运行时校验器 + JSON Schema 导出（喂 LLM）；提供跨模块共享契约接口 `extendSanitizeSchema(tagSet, attrMap)` 作为 M-002 sanitize 白名单扩展点，M-005 等 Block 注册方通过此接口注入自定义标签，断开 M-002 ↔ M-005 模块环
- **映射功能**: F-010 (AC-004 全链路类型推导 + 运行时校验) / F-013 (AC-002 强类型 schema 契约 / AC-005 schema 演进策略)
- **对外接口**:
  - 包级类型导出：`z.infer<typeof XxxSchema>` 直推 TS 类型
  - schema 工厂函数：每个领域对象一个 `z.object({...})` 定义
  - JSON Schema 互转：`toJSON(schema) → JSONSchema`（包装 `z.toJSONSchema()`），供 `describe_block` / `describe_mark` / `describe_theme` 等 MCP Tool 喂 LLM Agent
  - 运行时校验：`schema.parse(input)` / `schema.safeParse(input)`
- **依赖模块**: 无（最底层 contracts 包）；外部依赖 `zod@4.x` + 可选 `@zod/mini`（浏览器 bundle 体积敏感场景）
- **内部关键组件**:
  - `mcp/tool-contracts.ts` — 24 个 Tool 的 request / response Zod schema；如 `renderMarkdownRequestSchema = z.object({ markdown: z.string(), themeId: z.string().optional(), rulesetVersion: z.string().optional(), paint: z.record(z.string()).optional(), baseColor: z.string().optional(), customCss: z.string().optional() })`；长任务 Tool 的 `jobId` 字段统一 `z.string().uuid()`；`describeTemplateRequestSchema` / `describeTemplateResponseSchema`（详 API-033）；`registerVariantRequestSchema` / `registerVariantResponseSchema`（详 API-034）
  - `relay/route-contracts.ts` — Hono RPC 路由契约（与 Hono 4.x `zValidator` middleware 集成）
  - `component/attrs-schema.ts` — 组件属性 schema 类型工厂：内置 Block 的 `directiveAttrs`（指令 `{}` 语法域）、内置 Mark 的行内指令属性、以及插件 Block 自持的结构化 `attrsSchema`（M-007 plugin-api 数据域）统一经此产出可 `toJSON` 的 zod schema；`describe_block` 对 `source=builtin` 输出 `directiveAttrs` 的 JSON Schema、对 `source=plugin` 输出结构化 `attrsSchema` 的 JSON Schema，`describe_mark` 输出 mark 行内指令属性的 JSON Schema，供 LLM 书写合法块 / 行内 directive
  - `theme/manifest-schema.ts`、`theme/template-schema.ts`（导出 `TemplateDefSchema` / `TemplateMetaSchema` / `CoverageReportSchema`，详 E-011）、`pack/manifest-schema.ts`、`ruleset/rule-schema.ts`
  - `sanitize/extend-schema.ts` — 导出 `extendSanitizeSchema(tagSet: ReadonlySet<string>, attrMap: ReadonlyMap<string, readonly string[]>) → SanitizeSchemaExtension` 共享契约；返回值结构与 `hast-util-sanitize` `Schema` 的 `tagNames` / `attributes` 字段对齐；包路径 `packages/contracts/src/sanitize/extend-schema.ts`
  - `diagnostic/diagnostic-report.ts` — 含 `DiagnosticSchema` / `DiagnosticReportSchema` / `NodeChangeRecordSchema` / `AttrDiffEntrySchema` / `NightRiskEntrySchema`（详 M-003 数据类型定义、E-008 字段集）
  - `job/structure.ts`、`version/triple-structure.ts`
  - `yjs/sync-message-schema.ts` — Yjs 同步消息（snapshot / awareness payload）schema，与 y-websocket 协议对齐
  - `versioning/deprecation-window.ts` — semver major + minor deprecation window 工具
- **context_load**: [prd#§2.F-010, prd#§2.F-013]

### M-013: 浏览器端持久化与同步

- **职责**: 浏览器端多文档管理、本地草稿持久化与自动备份；同步与协作能力（基于 Yjs CRDT）作为可选拓扑保留，当前发布不接通服务端
- **映射功能**: F-001 (AC-005 多文档 / 持久化 / 自动备份, P0) / F-012 (AC-001..AC-004, P2 — 仅保留接口与协议设计，不交付实现)
- **优先级**: 本模块持久化部分 P0（F-001 依赖）；同步接口与 Y.Doc 结构作为架构候选保留以避免后续激活时返工，**接口与协议设计与 P0 同质量**，当前发布不交付实现
- **对外接口**: 包级 API：
  - 多文档：`saveDraft(doc)`、`listDocuments()`、`loadDocument(id)`、`deleteDocument(id)`、`createBackup(id)`
  - Yjs 同步：`enableSync(docId, { wsUrl, authToken }) → YDocBinding`、`disableSync(docId)`、`getSyncState(docId) → { connected, awareness: AwarenessState[] }`
  - 历史：`fetchHistory(docId)`、`restoreVersion(docId, snapshotId)`、`diffVersions(docId, snapAId, snapBId)`
- **YDocBinding 类型签名**:
  ```ts
  import type * as Y from 'yjs';
  import type { Awareness } from 'y-protocols/awareness';
  import type { WebsocketProvider } from 'y-websocket';

  interface YDocBinding {
    docId: string;
    doc: Y.Doc;
    provider: WebsocketProvider;
    awareness: Awareness;
    sync: {
      status: 'idle' | 'connecting' | 'syncing' | 'synced' | 'error';
      lastSyncedAt?: number;     // unix ms
      lastError?: { code: string; message: string };
    };
    on(event: 'sync-status' | 'awareness-change' | 'error', listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
    disconnect(): void;          // 关闭 ws；Y.Doc 仍在内存中保留
    destroy(): void;             // 关闭 ws + 释放 Y.Doc 内存（不删 IndexedDB 持久化）
  }
  ```
- **依赖模块**: M-008 (应用层 use case — sync 编排) / M-010 (中继服务 — y-websocket 服务端) / M-012 (schema — sync-message-schema) / 外部 `yjs@13.6.x` / `y-codemirror.next@0.3.x` / `y-indexeddb`
- **内部关键组件**:
  - `storage/indexeddb-adapter.ts` — IndexedDB (via `idb` 8.x) 适配器；存储 E-001 Document
  - `storage/y-indexeddb-binding.ts` — `y-indexeddb` 集成：每个文档对应一个 `Y.Doc`，持久化到 IndexedDB；离线编辑保留 op-log
  - `documents/manager.ts` — 多文档元数据管理
  - `backup/auto-backup.ts` — 自动备份策略（每 60s 或编辑后空闲 5s）
  - `sync/y-doc-factory.ts` — Y.Doc 结构创建：每文档一个 Y.Doc，含 `Y.XmlFragment` (markdown 源码 via `y-codemirror.next`) + `Y.Map` (frontmatter metadata)
  - `sync/y-websocket-client.ts` — `WebsocketProvider` 包装：连接 `wss://relay/yjs/{docId}`，header 携带 API key；自动重连（指数退避）
  - `sync/awareness-codec.ts` — awareness payload 序列化（光标位置 / 选区 / 用户 ID + 显示色）
  - `editor/y-codemirror-binding.ts` — `y-codemirror.next` 把 CodeMirror 6 SourcePane 绑定到 Y.XmlFragment
  - `history/snapshot-manager.ts` — 周期性 Y.encodeStateAsUpdate 快照；按需 restore（应用 update 到新 Y.Doc）
  - `history/diff-versions.ts` — 基于 Y.diffUpdate / yjs-utils 计算两快照差异
- **Yjs 文档结构**:
  ```
  Y.Doc (per document)
   ├─ XmlFragment "markdown"   ← y-codemirror.next 绑定 CodeMirror 6
   └─ Map         "frontmatter"
       ├─ theme:        string
       ├─ paint:        Map<string, string>
       ├─ base-color:   string
       └─ template:     string
  ```
- **awareness 中继**: WebsocketProvider 客户端 ↔ y-websocket server (M-010) ↔ Redis pub/sub channel `yjs:awareness:{docId}`，跨进程广播；客户端断线 30s 后服务端清理其 awareness 条目
- **快照策略**: 服务端 y-websocket server 节流每 60s 或 100 ops 调用 `Y.encodeStateAsUpdate(doc)` 写入 E-009 YDocSnapshot；客户端不主动写服务端快照（避免 race）
- **离线优先**: 编辑器禁用同步时也 100% 可用，IndexedDB 是 source of truth；用户启用同步是显式动作（设置抽屉切换）
- **context_load**: [prd#§2.F-001, prd#§2.F-012, arch#§2.M-010, arch#§4.E-009, arch#§4.E-010]
