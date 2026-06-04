---
id: "arch-wechat-flow-modules"
version: "0.6.1"
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

### M-001: 编辑器 UI

- **职责**: 浏览器编辑器的展示层与交互编排——三栏布局、命令面板、抽屉、对话框、源码 ↔ 预览联动、iframe 预览沙箱挂载。不直接持有渲染管线 stage，所有渲染调用经 M-008 应用层 use case
- **映射功能**: F-001 (AC-001..AC-009) / F-002 (AC-001..AC-006) / F-008 (AC-001 浏览 UI, AC-002 模板卡片，AC-004 模板应用) / F-014 (AC-006)
- **对外接口**: 无 HTTP 接口；订阅 M-008 提供的 use case 返回值与诊断流
- **依赖模块**: M-008 (应用层 use case) / M-005 (主题与组件注册中心) / M-012 (schema 契约层) / M-013 (浏览器端持久化)
- **内部关键组件**:
  - `EditorShell.vue` — 三栏布局与状态栏
  - `SourcePane`（基于 CodeMirror 6）— directive 语法高亮、补全
  - `PreviewPane` — iframe 沙箱（`sandbox=""` 空属性 + CSP `default-src 'none'`，零 JS）挂载与视口切换（375 / 768 / desktop）；目录跳转、源码↔预览高亮联动、复制按钮覆盖层等 UI 钩子全部在主线程通过 `iframe.contentDocument` 与 overlay 实现，不向 iframe 内注入脚本
  - `CommandPalette`、`InsertDrawer`、`ContextMenu` — 共享同一 command registry
  - `DiagnosticsPanel` — 兼容性报告分级展示（red / yellow / green）；inbound 数据契约为 M-003 输出的 `DiagnosticReport`（含 `diagnostics: Diagnostic[]`、`nodeChangeRecords: NodeChangeRecord[]`、`nightRiskIssues: NightRiskEntry[]` 三大字段）；面板渲染 `nodeChangeRecords` → 子组件 `CompatibilityDiffView`（C-013.1）双栏对比；`nightRiskIssues` 非空时面板进入 `night-risk-alert` 视觉态（ui-spec C-013）
  - `CompatibilityDiffView` — DiagnosticsPanel 子组件；订阅 `DiagnosticReport.nodeChangeRecords[]` 中匹配 `nodeSelector` 的 `NodeChangeRecord`，按 `before` / `after` outerHTML 与 `attrDiff` 渲染双栏对比；不主动调用渲染管线，所有数据由 M-003 在过滤执行时一次性记录
  - `ThemeSelector`、`PaintDrawer`、`PaletteDerivationDrawer` — 主题选择与单文档配色派生
  - `ThemeMarketGallery` — 主题模板市场（F-008）的 (主题, template) 卡片画廊；订阅 M-005 `listThemes()` × `listThemeTemplates(themeId)` 笛卡尔积，按缩略元数据渲染卡片，选中后调用 M-005 `describeTemplate(themeId, templateId)` 取预填 Markdown 创建新文档
- **context_load**: [prd#§2.F-001, prd#§2.F-002, prd#§2.F-008, prd#§2.F-014, arch#§2.M-008, arch#§2.M-005]

### M-002: 渲染管线核心

- **职责**: 五段管线 `mdast → hast → sanitize-hast → ruleset-hast → inline-styled HTML` 的纯函数 stage 编排；版本三元组透传；确定性渲染保证；framework-agnostic 无 DOM 依赖
- **映射功能**: F-002 / F-003 (AC-002 热切换) / F-004 (AC-003 内联化 / AC-004 模拟前置) / F-007 / F-013 (AC-001 跨运行时一致)
- **对外接口**: 包级 API（非 HTTP）：`renderMarkdown(input, options) → RenderResult`、`renderHast(hast, options) → string`；被 M-008 / M-009 / M-011 调用
- **依赖模块**: M-003 (规则集引擎) / M-004 (粘贴过滤模拟器) / M-007 (plugin-api 类型) / M-012 (schema 契约层 + `extendSanitizeSchema` 共享契约)
- **管线 stage 序列（唯一权威）**:
  | 序号 | stage | 输入 → 输出 | 实现位置 | 备注 |
  |------|-------|-----------|---------|------|
  | 1 | parse | Markdown → mdast | `pipeline/parse.ts` | remark + remark-directive |
  | 2 | transform | mdast → hast | `pipeline/transform.ts` | rehype 适配 + directive 展开 |
  | 3 | sanitize | hast → hast | `pipeline/sanitize.ts` | rehype-sanitize + wechatFlowSanitizeSchema |
  | 4 | ruleset (M-003) | hast → hast | `applyRuleset()` | strip/clamp/transform/patch/lint 五类作用域 |
  | 5 | inline-style + serialize | hast → string | `pipeline/inline-style.ts` + `pipeline/serialize.ts` | juice 内联化 + canonical 序列化 |

  `composeRender` 输出 = stage 5 结束的 inline-styled HTML（`postPaste: false`）。**不在 renderMarkdown 主路径执行 M-004 simulatePaste**。
- **postPaste 字段语义**: `RenderResult` 含 `postPaste: boolean`；renderMarkdown / Preview / MCP `render_markdown` 路径 `postPaste === false`；composeCopy / `export_clipboard_payload` 路径在 stage 5 之后显式调用 M-004，置 `postPaste === true`。三路径产物可通过此字段对账，禁止双跑 simulatePaste。
- **内部关键组件**:
  - `pipeline/parse.ts` — Markdown → mdast (remark + remark-directive)
  - `pipeline/transform.ts` — mdast → hast (rehype 适配 + directive 组件展开)
  - `pipeline/inline-style.ts` — token + 主题样式展开为元素 inline style
  - `pipeline/sanitize.ts` — 调用 `rehype-sanitize` 6.x，使用 `wechatFlowSanitizeSchema`（导出自 `sanitize/schema.ts`，基于 `hast-util-sanitize` 5.x 的 `defaultSchema` deepmerge）；位置：mdast→hast (`transform.ts`) **之后**、过滤规则集（M-003）**之前**；是 hast 进入 stage 链下游的**单一守门点**
  - `pipeline/css-attr-filter.ts` — sanitizer 之后的 CSS 属性二级白名单（解析 `style` 值为 declaration 列表，按 `packages/ruleset` 的 CSS 子集声明放行；拒绝 `expression(` / `javascript:` / `behavior:` / `@import`）
  - `pipeline/serialize.ts` — 稳定排序的 HTML 字符串化；统一调 `utils/canonical-json.ts` + `utils/deterministic.ts` 的辅助函数，禁用任何隐式迭代顺序
  - `sanitize/schema.ts` — 导出 `wechatFlowSanitizeSchema: Schema`（`Schema` 类型来自 `hast-util-sanitize`）；通过 `@wechat-flow/contracts` 提供的 `extendSanitizeSchema` 共享契约把自定义 Block 标签合入白名单，由 M-002 在初始化时消费 Block 注册中心 M-005 注入的 (tagSet, attrMap) 增量
  - `utils/deterministic.ts` — 确定性容器迭代辅助：`sortedKeys` / `sortedEntries` / `sortedSet` / `canonicalStringify`（详见主卷 §5.2 确定性容器迭代规范）
  - `version/triple.ts` — 三元组 `{coreVersion, themeVersion, rulesetVersion}` 计算与透传
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-007, prd#§3.3, arch#§2.M-003, arch#§2.M-004, arch#§5.2, arch#§5.3]

### M-003: 过滤规则集引擎

- **职责**: 微信平台过滤规则的版本化运行时——规则注册、按作用域（strip / clamp / transform / patch / lint）分类执行、规则集版本号管理、规则补丁热加载（F-011 AC-005）；过滤执行时为受影响节点产 `NodeChangeRecord[]`、为低对比度节点产 `NightRiskEntry[]`，统一入 `DiagnosticReport` 供 M-001 消费
- **映射功能**: F-007 (AC-001..AC-004) / F-011 (AC-001 规则级 fixture / AC-005 补丁库 / AC-006 可读性 / AC-007 关键词)
- **对外接口**:
  - 包级 API：`applyRuleset(hast, ruleset) → {hast, report}`，其中 `report: DiagnosticReport`；`getRulesetVersion() → string`；被 M-002 调用
  - **outbound 数据契约**：`DiagnosticReport.nodeChangeRecords[] → M-001 C-013.1 CompatibilityDiffView 消费`；`DiagnosticReport.nightRiskIssues[] → M-001 DiagnosticsPanel `night-risk-alert` 状态消费`
- **依赖模块**: M-012 (schema 契约层 — Rule schema、DiagnosticReport schema)
- **内部关键组件**:
  - `rules/registry.ts` — 规则注册中心
  - `rules/scope/strip.ts`、`clamp.ts`、`transform.ts`、`patch.ts`、`lint.ts` — 五类作用域执行器
  - `rules/builtin/` — ≥ 42 条内置规则；每条规则一个 TS 文件 `rules/builtin/{rule-id}.ts` 导出 `RuleDefinition`（含 id / scope / priority / matcher / transform / fixture 引用）
  - `version/manifest.ts` — 规则集 manifest 与版本号
  - `patch-loader.ts` — 已知 Bug 补丁库热加载（按微信客户端版本号匹配）
  - `shared/paste-strip.ts` — 导出 `pasteStripRuleIds: readonly RuleId[]`，定义 M-004 粘贴模拟所共享的 strip 规则子集（详 §8.2 Q3.13）
  - `lint/readability.ts` — F-011 AC-006 可读性运行时检查（颜色对比度 / 字号下限 / 段长上限），输出 `Diagnostic[]` 汇入渲染管线诊断流；遍历过程中对 `contrastRatio < 4.5`（WCAG AA 文本基准）的节点产 `NightRiskEntry`，按 `nodeSelector` 去重后追加到 `DiagnosticReport.nightRiskIssues`
  - `lint/keywords.ts` — F-011 AC-007 违规关键词检测，词库 `packages/ruleset/src/data/keyword-list.json`，bump 时 rulesetVersion 升 minor
  - `report/node-change-recorder.ts` — 每条 `strip` / `clamp` / `transform` / `patch` 作用域规则触发节点变更前后由执行器调 `recordChange(node, ruleId)`，记录 `before = outerHTML(node)` 与 `after = outerHTML(node')`，对属性集合做 add / remove / modify / keep 四类对账后追加 `AttrDiffEntry[]`；记录写入 `DiagnosticReport.nodeChangeRecords`，按 `nodeSelector` 唯一
  - **DiagnosticReport 数据类型**（schema 单源在 M-012 `diagnostic/structure.ts`）：
    ```ts
    interface DiagnosticReport {
      diagnostics: Diagnostic[];                   // severity / ruleId / nodeRef / message
      nodeChangeRecords: NodeChangeRecord[];       // 粘贴前后逐节点变更（C-013.1 数据源）
      nightRiskIssues: NightRiskEntry[];           // 夜间风险条目（C-013 night-risk-alert 数据源）
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
- **规则文件存放**: 规则定义在 `packages/ruleset/src/rules/{rule-id}.ts`；fixture 在 `packages/ruleset/src/rules/{rule-id}/`，目录结构：
  - `input.html` — 进入规则前的 hast 序列化
  - `expected.html` — 规则应用后的 hast 序列化
  - `metadata.json` — `{ ruleId, scope, priority, description, wechatVersion: { minSupported, knownBuggy[] } }`
  - 多 case 时按 `case-001/`、`case-002/` 子目录组织，每个子目录含同样三件套
- **规则集版本化策略**: `packages/ruleset/package.json` `version` 字段即 `rulesetVersion`；任何规则变更（新增 / 修改 transform / 优先级调整）须 bump version；ruleset version 与 core / theme 一同进入版本三元组
- **PRD 19 条 vs ARCH ≥42 条差距**: PRD F-007 §2 表列 19 条代表性规则作为示例基线。架构目标 ≥42 条由 implementer 在 `packages/ruleset` 包内补充并以 fixture 形式版本化；剩余 23+ 条来自微信客户端平台实测（公众号编辑器粘贴行为对照、客户端渲染兼容性验证）。`[ASSUMPTION]` 截至 dev-plan 阶段规则总数以 42 条为实现门槛；超 42 条视为规则集质量提升，由后续 patch 版本承载。
- **context_load**: [prd#§2.F-007, prd#§2.F-011]

### M-004: 粘贴过滤模拟器

- **职责**: 复现微信公众号编辑器对粘贴 HTML 的过滤行为，作为渲染管线最后一道关卡；输出粘贴前后逐节点的精确变更对照
- **映射功能**: F-002 (AC-005 / AC-006 兼容性报告) / F-004 (AC-004 / AC-005 视觉一致性) / F-011 (AC-002)
- **对外接口**: 包级 API：`simulatePaste(html: string) → {filteredHtml, nodeDiffs, droppedAttrs}`；**由 M-008 `composeCopy` 在 inline-style HTML stage 之后显式调用**；同时被 M-009 `simulate_paste` Tool 直接调用。**不在 M-002 renderMarkdown 主路径自动执行**。
- **依赖模块**: M-003 (规则集引擎 — 通过 `packages/ruleset/src/shared/paste-strip.ts` 共享 `pasteStripRuleIds` 子集；详 §8.2 Q3.13)
- **内部关键组件**:
  - `simulator/strip-tags.ts` — 标签级剥除（style / script / 等）
  - `simulator/strip-attrs.ts` — 属性级剥除（id / class / style 选择性等）
  - `simulator/rewrite-structure.ts` — 结构改写（如 ul/ol → table 布局）
  - `diff/per-node-diff.ts` — 节点级 diff 输出（兼容性详情面板核心数据）
- **context_load**: [prd#§2.F-002, prd#§2.F-004, prd#§2.F-011]

### M-005: 主题与组件注册中心

- **职责**: 内置主题、Block / Mark / Variant / Token、主题装饰资产的注册与查询；主题守护 9 维静态校验（含「内置 template 完整性」维度，F-011 AC-009）；主题热切换；template 作为主题命名空间下的预设变体登记（F-008）；扩展点支持第三方主题与 template pack 注册
- **映射功能**: F-003 (AC-001..AC-012) / F-008 (AC-001 注册, AC-002 白名单覆盖, AC-003 frontmatter 语义, AC-004 describe_theme/describe_template) / F-009 (AC-001 继承 + AC-002 品牌包) / F-011 (AC-003 主题守护 9 维 / AC-009 template 完整性)
- **对外接口**: 包级 API：
  - 主题层：`registerTheme(definition)`、`listThemes()`、`describeTheme(id)`、`listBlocks()`、`describeBlock(id)`、`listBlockVariants(blockId)`、`derivePalette(seed)`、`validateThemeGuard(theme) → GuardResult`
  - **template 层（主题命名空间隔离）**：
    - `defineTemplate({ themeId, templateId, render }) → void` — 独立注册 API；与 `defineTheme.templates` 字段语义等价
    - `listThemeTemplates(themeId: string): TemplateMeta[]` — 返回该主题已注册的全部 template 元数据（轻量，不含 Markdown 正文）
    - `describeTemplate(themeId: string, templateId: string): TemplateDef` — 返回 template 完整定义（含预填 Markdown 与 metadata）；themeId / templateId 任一不存在抛 `E_NOT_FOUND`
    - `validateTemplateCoverage(themeId: string, templateId: string): CoverageReport` — 静态校验 template 是否覆盖 F-003 AC-012 白名单（9 基础元素 + ≥ 6 核心 Block 容器），返回逐项缺失清单
    - `validateThemeTemplates(themeId: string): ThemeTemplateValidationResult` — 9 维守护第 9 维（内置 template 完整性）执行器；遍历该主题全部 template 调 `validateTemplateCoverage`，任一未覆盖即整体 `pass: false`；由 `guard/validate-theme-templates.ts` 实现，于 CI 守护流程阻断发布
  - 被 M-002 / M-008 / M-009 调用
- **依赖模块**: M-006 (调色板派生) / M-007 (plugin-api 类型) / M-012 (schema 契约层 — TemplateDef / CoverageReport schema + `extendSanitizeSchema` 共享契约；M-005 通过此契约把自定义 Block 标签合入 M-002 sanitize 白名单，避免与 M-002 形成模块环)
- **内部关键组件**:
  - `registry/theme.ts`、`block.ts`、`mark.ts`、`variant.ts`、`token.ts` — 五类注册表
  - `registry/template.ts` — template 注册中心；存储结构 `Map<themeId, Map<templateId, TemplateDef>>`；支持 `defineTheme.templates: Record<TemplateId, TemplateDef>` 嵌套与 `defineTemplate({ themeId, templateId, render })` 独立 API 两路注册；同名 templateId 在不同 themeId 下互相隔离
  - `guard/nine-dimensions.ts` — 主题守护 9 维校验；维度清单：基线选择器密度、核心 block 覆盖率、token 覆盖率、跨主题身份 token 防碰撞、元数据完整性、theme.css 属性合规、WCAG 对比度自动校验（阈值 4.5，WCAG AA 文本基准，与 M-003 `lint/readability.ts` 一致；同一 token 在守护通过后运行时不会复现 `nightRiskIssues`）、装饰资产完整性、内置 template 完整性
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
- **template 命名空间隔离语义**: 主题是 template 的命名空间；同名 templateId（如 `tech-review`）可在 `tech` 与 `default` 主题下独立定义且渲染产物不同；frontmatter `theme: tech` + `template: tech-review` 解析为 (themeId=tech, templateId=tech-review) 复合键，运行时仅作为审计标记不参与渲染（PRD F-008 AC-003）
- **内置 template 完整性下限**: 每内置主题（default / magazine / literary / business / tech）须 ≥ 1 预设 template；每 template 须 mdast 覆盖 F-003 AC-012 白名单 9 基础元素 + ≥ 6 核心 Block 容器；不达标由 `guard/nine-dimensions.ts` 在 CI 阻断发布（F-011 AC-009）
- **内置 template 清单**: 每内置主题 `templates/` 目录下提供 ≥ 1 份 Markdown，文件名即 templateId。基线清单（templateId 可跨主题复用，由各主题独立实现）：

  | scenario | 候选 templateId | 推荐适配主题 |
  |----------|----------------|--------------|
  | 科技评测 | `tech-review` | tech / default |
  | 诗歌赏析 | `poetry-essay` | literary |
  | 行业分析报告 | `industry-report` | business |
  | 生活记录 | `life-vlog` | magazine |
  | 教程 / How-to | `tutorial` | tech / default |
  | 书评 / 影评 | `book-review` | literary / default |
  | 数据 / KPI 总结 | `kpi-summary` | business |
  | 生活方式指南 | `lifestyle-guide` | magazine |

  各主题在其 `templates/{templateId}.md` 提供具体实现；同 scenario 在不同主题下视觉差异由主题 token 与 Block variant 驱动，Markdown 源码亦可独立编写（不强制跨主题复用 Markdown）。
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
- **对外接口**: 包级 API：`composeRender(input) → RenderResult`、`composeCopy(input) → ClipboardPayload`、`composeExportHtml(input) → string`、`composeExportLongImage(input) → JobHandle`、`composeExportCover(input) → JobHandle`、`composeUploadImage(input) → JobHandle`、`composeUploadWechatAsset(input) → JobHandle`、`composeApplyZhTypo(markdown) → {fixed, perRule, totalChanges}`
- **依赖模块**: M-002 (渲染管线核心) / M-004 (粘贴过滤模拟器) / M-005 (主题与组件注册中心) / M-010 (中继服务客户端) / `@wechat-flow/zh-typo`
- **内部关键组件**:
  - `composers/render.ts`、`copy.ts`、`export-html.ts`、`export-long-image.ts`、`export-cover.ts`
  - `composers/upload-image.ts`、`upload-wechat-asset.ts`
  - `composers/apply-zh-typo.ts`
  - `clipboard/dual-mime-payload.ts` — F-004 AC-001 html + text 双 MIME 组装
- **`composeCopy` pipeline 约束**：`composeRender → simulatePaste → buildDualMimePayload → navigator.clipboard.write`；剪贴板写入前必经 M-004 `simulatePaste` 节点，禁止跳过；该顺序由 `composers/copy.ts` 内联注释固定（PRD F-004 AC-004）
- **context_load**: [prd#§2.F-001, prd#§2.F-004, prd#§2.F-005, prd#§2.F-006, prd#§2.F-013, prd#§2.F-014, arch#§2.M-002, arch#§2.M-010]

### M-009: MCP server

- **职责**: 对 LLM Agent 暴露 23 个 Tool（19 同步 + 4 异步长任务；含 `get_job` 与 `get_ruleset_version`；含 `describe_template` 提供 F-008 主题预设变体查询）；stdio + HTTP/SSE 双 transport；API key + per-key 配额；Idempotency-Key 去重；版本三元组透传到响应；**鉴权基线**两级（`scope=user` Tool 调用 vs `scope=admin` 管理端点；admin key 只走 M-010 admin 路由，不能调 Tool）
- **映射功能**: F-013 (AC-001..AC-006) / F-008 (AC-004 describe_template Tool)
- **对外接口**: MCP Tool（23 个，19 同步 + 4 异步）— 详见 [`arch-wechat-flow-api.md`](./arch-wechat-flow-api.md) API-001..API-016 + API-033
- **依赖模块**: M-008 (应用层 use case) / M-002 / M-005 / M-006 / M-010 / M-012
- **内部关键组件**:
  - `transport/stdio.ts`、`transport/http-sse.ts` — 双 transport entry
  - `auth/api-key.ts` — API key 鉴权 + per-key 配额；校验 `scope` 字段；user / admin 两级 key 哈希存储于 E-010 ApiKey 表；明文仅在创建时由 admin API 返回一次
  - `auth/scope-guard.ts` — Tool 路由前置守卫：仅 `scope=user` 可达 Tool 路由表；admin scope 直接 403 `E_PERMISSION_DENIED`
  - `idempotency/dedup.ts` — `sha256(input + toolsetVersion)` 去重缓存
  - `tools/router.ts` — 23 个 Tool 的 dispatcher，映射到 M-008 composer 或 M-005 查询（`describe_template` 直达 M-005 `describeTemplate(themeId, templateId)`）；Tool 层为 thin wrapper，禁止持有业务逻辑（业务逻辑统一在 M-008 / M-006 / M-005 / M-004）
  - `version/triple-injection.ts` — 响应注入版本三元组
- **Skill bundle 协同**: `skill/SKILL.md` 引用本模块 23 个 Tool 的调用顺序约定（典型链：`list_themes` → `describe_theme` → `describe_template` → `render_markdown` → `simulate_paste` → `upload_to_wechat_asset`），由 LLM Agent 解析为语义任务；Skill bundle 与 MCP server 共版本号发布
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

- **职责**: 全项目类型与运行时 schema 单一事实来源——MCP Tool 入参出参、Hono RPC 路由契约、组件 schema (attrsSchema)、主题 manifest、pack manifest、Rule schema、Diagnostic 结构、Job 结构；提供 TS 类型 + 运行时校验器 + JSON Schema 导出（喂 LLM）；提供跨模块共享契约接口 `extendSanitizeSchema(tagSet, attrMap)` 作为 M-002 sanitize 白名单扩展点，M-005 等 Block 注册方通过此接口注入自定义标签，断开 M-002 ↔ M-005 模块环
- **映射功能**: F-010 (AC-004 全链路类型推导 + 运行时校验) / F-013 (AC-002 强类型 schema 契约 / AC-005 schema 演进策略)
- **对外接口**:
  - 包级类型导出：`z.infer<typeof XxxSchema>` 直推 TS 类型
  - schema 工厂函数：每个领域对象一个 `z.object({...})` 定义
  - JSON Schema 互转：`toJSON(schema) → JSONSchema`（包装 `z.toJSONSchema()`），供 `describe_block` / `describe_mark` / `describe_theme` 等 MCP Tool 喂 LLM Agent
  - 运行时校验：`schema.parse(input)` / `schema.safeParse(input)`
- **依赖模块**: 无（最底层 contracts 包）；外部依赖 `zod@4.x` + 可选 `@zod/mini`（浏览器 bundle 体积敏感场景）
- **内部关键组件**:
  - `mcp/tool-contracts.ts` — 23 个 Tool 的 request / response Zod schema；如 `renderMarkdownRequestSchema = z.object({ markdown: z.string(), themeId: z.string().optional(), rulesetVersion: z.string().optional(), paint: z.record(z.string()).optional(), baseColor: z.string().optional() })`；长任务 Tool 的 `jobId` 字段统一 `z.string().uuid()`；新增 `describeTemplateRequestSchema` / `describeTemplateResponseSchema`（详 API-033）
  - `relay/route-contracts.ts` — Hono RPC 路由契约（与 Hono 4.x `zValidator` middleware 集成）
  - `component/attrs-schema.ts` — Block / Mark 的 `attrsSchema` 类型工厂；`describe_block` 调用 `toJSON(block.attrsSchema)` 输出 JSON Schema
  - `theme/manifest-schema.ts`、`theme/template-schema.ts`（导出 `TemplateDefSchema` / `TemplateMetaSchema` / `CoverageReportSchema`，详 E-011）、`pack/manifest-schema.ts`、`ruleset/rule-schema.ts`
  - `sanitize/extend-schema.ts` — 导出 `extendSanitizeSchema(tagSet: ReadonlySet<string>, attrMap: ReadonlyMap<string, readonly string[]>) → SanitizeSchemaExtension` 共享契约；返回值结构与 `hast-util-sanitize` `Schema` 的 `tagNames` / `attributes` 字段对齐；包路径 `packages/contracts/src/sanitize/extend-schema.ts`
  - `diagnostic/structure.ts` — 含 `DiagnosticSchema` / `DiagnosticReportSchema` / `NodeChangeRecordSchema` / `AttrDiffEntrySchema` / `NightRiskEntrySchema`（详 M-003 数据类型定义、E-008 字段集）
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
