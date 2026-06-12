---
id: "rn-006-css-inlining"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow", "arch-wechat-flow"]
consumers: [architect, tech-lead]
context: "ARCH §1.4 / §8.2 Q3.9 / M-002 stage 5 — CSS 内联化与 custom CSS cascade 方案选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: CSS 内联化与 custom CSS cascade 方案选型

## 问题

F-004 AC-003 要求渲染产物为经微信编辑器粘贴过滤后视觉一致的 inline-styled HTML，M-002 五段管线 stage 5（`pipeline/inline-style.ts`）是落地点。内联化输入有两类来源，能力需求不同：

1. **主题样式（token 字典）**: selector → 声明 map（标签名 / block-variant 键索引），无 stylesheet 形态，不需要 CSS 选择器匹配与 specificity 级联
2. **开发者/LLM 提交的原生 CSS**（F-013 `render_markdown.customCss` 入参 + F-010 AC-010 注册式 variant）: 完整 stylesheet 文本，需要选择器匹配 + specificity 级联 + 声明合并——cascade 能力在此有真实落点

共同约束：

- §5.2 跨四运行时（浏览器主线程 / Web Worker / Node / Edge）SHA-256 字节级一致——避免平台特定加载路径
- §5.2 确定性渲染——样式展开顺序、属性序确定性可控
- 内联化结果一律经 `pipeline/css-attr-filter.ts` CSS 属性二级白名单过滤（安全不变量）
- 产物为 inline-styled HTML：伪类 / 伪元素 / media query / keyframes 无法内联化、无法进微信产物——提交 CSS 的有效语义是**静态选择器 + 声明**子集

## 调研方法

四方案矩阵对比 + 两类样式来源的能力匹配度评估 + 依赖链跨运行时审计（npm 发行形态经 web-search 验证）。

## 发现

### 方案 A: 自研确定性 token styleMap 内联器

- **能力匹配度**: token 字典直接展开为 inline style，标签名 / block-variant 键索引；不支持任意 CSS 选择器——对 token 来源自洽，对原生 CSS 来源不可用
- **runtime 兼容**: 零第三方依赖，纯 hast 遍历，Web Standards 兼容，四运行时无加载差异
- **确定性**: 与 §5.2 规范同源（`sortedEntries` 展开 + `css-attr-filter` 白名单复用）；hast in / hast out 无字符串往返

### 方案 B: juice（`juice/client` 入口）

- **能力匹配度**: 完整 CSS 选择器匹配 + specificity 级联后回写 inline style——覆盖原生 CSS 来源的全部静态子集需求
- **runtime 兼容**: 主入口依赖 Node-only 模块（fs / path，承载 `juiceFile` / `juiceResources`），**`juice/client` 入口为纯 JS**（cheerio 1.x + 纯 JS parser），可经 bundler 打入浏览器 / Worker / Edge——四运行时可行，代价是 cheerio + parse5 体系数百 KB 进 bundle
- **AST 模型**: 工作在 HTML 字符串层——hast 须 serialize 为字符串、juice 处理后 re-parse 回 hast；最终 canonical 序列化仍由本管线收口，但往返有性能成本与中间表示不受控段
- **确定性**: cascade 合并顺序由第三方实现决定，跨版本升级是潜在漂移源——须以 CI 黄金 fixture SHA-256 双向守护 + lockfile 锁版本缓解
- **维护**: Automattic 维护，邮件模板工业事实标准；license MIT

### 方案 C: css-inline

- **能力匹配度**: 完整 cascade，性能最高（Rust 实现）
- **runtime 兼容**: JS 生态发行为**双二进制产物**——Node 走 napi native binding（`@css-inline/css-inline`），浏览器/Edge 走 Wasm（`@css-inline/css-inline-wasm`）；同一逻辑两套编译产物，四运行时字节级一致须跨产物持续验证，workerd 的 Wasm 打包是平台特定加载路径，与 §5.2 约束冲突最重

### 方案 D: 自研受控 cascade stage

- **能力匹配度**: `css-tree`（纯 JS CSS parser）+ `hast-util-select`（unified 官方选择器匹配）+ 显式 specificity 排序，覆盖静态子集；hast in / hast out 无往返；确定性自持
- **代价**: cascade 合并逻辑自研需独立测试矩阵；选择器支持以 `hast-util-select` 为上限；相对 B 损失生态成熟度与完整 cascade 边界case 的工业验证

## 结论

**采纳混合架构**（决策记录 arch §8.2 Q3.9）：

1. **token 层（base-style ⊕ theme token override）**: 方案 A 自研确定性 styleMap 内联器——token 字典模型下 cascade 能力无消费方，零依赖、确定性与 §5.2 同源
2. **custom CSS 层**: 方案 B `juice/client` cascade pass——选型理由：完整 cascade 能力的工业级实现与生态成熟度优先（用户覆盖 architect 的方案 D 推荐）；纯 JS 可 bundle 满足四运行时可行性
3. **条件分支**: 无 customCss / 无注册 variant 样式时走纯方案 A 路径，产物字节级不变（既有 CI fixture 基线不受扰动）；custom CSS 存在时在 token 内联后追加 juice cascade pass，输出全树重过 `css-attr-filter` 白名单后 canonical 序列化
4. **否决方案 C**: 双二进制产物与 §5.2 四运行时字节级一致约束冲突
5. **方案 D 为备选记录**: 若 juice 维护停滞、bundle 体积在 Worker/Edge 不可接受、或 CI fixture 实测发现跨版本确定性漂移不可控，切换方案 D（css-tree + hast-util-select 受控 cascade）

**重评条件**: (1) juice 升级引发黄金 fixture SHA-256 漂移且无法经选项收敛；(2) Edge/Worker bundle 体积预算被 cheerio 体系突破；(3) 提交 CSS 的选择器需求超出静态子集（即需要伪类/媒体查询语义时——此时产物契约本身需先重新定义）。
