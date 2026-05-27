---
id: "rn-005-sanitizer"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow", "arch-wechat-flow"]
consumers: [architect, tech-lead]
context: "ARCH §5.3 / M-002 — XSS 防护 sanitizer 选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: XSS 防护 sanitizer 选型

## 问题

PRD §3.2 安全要求："禁止将用户输入直接以未过滤方式注入 DOM；任何等价于 `dangerouslySetInnerHTML` 的逃逸路径须由 sanitizer 守门"。架构 §5.3 安全基线要在 `hast → pre-paste` stage 强制执行白名单标签 / 属性，M-002 `pipeline/sanitize.ts` 是落地点。需要选定具体 sanitizer 库，其约束：

- 工作对象是 hast AST（unified/rehype 生态），不是 DOM 字符串
- 须在 Node + Edge runtime 跑（与 §5.2 跨四运行时一致性目标兼容，**不依赖 DOM API**）
- 白名单 schema 须可程序化配置（directive 引入的自定义元素需放入白名单）
- 维护活跃、license 友好（MIT / Apache）
- 与 §5.2 确定性渲染兼容：sanitizer 自身不能引入非确定性（如随机 nonce / 时间戳）

## 调研方法

web-search（2026-05 新鲜度验证）+ 三方案矩阵对比 + 生态契合度评估。

## 发现

### 方案 A: rehype-sanitize 6.x（基于 hast-util-sanitize 5.x）

- 维度对比：
  - **生态契合度**: unified / rehype 生态官方插件，输入输出均为 hast；与 M-002 五段管线 `hast → pre-paste-hast` stage 直接对接，零适配
  - **runtime 兼容**: 纯 JS，不依赖 DOM API，浏览器主线程 / Web Worker / Node / Edge runtime 全部可跑
  - **白名单 schema**: `defaultSchema` 模仿 GitHub 的清洗规则；可通过 deepmerge 扩展 `tagNames` / `attributes` / `clobberPrefix` / `ancestors`；schema 类型 `import { Schema } from 'hast-util-sanitize'` 完整 TS 定义
  - **属性白名单粒度**: 支持按标签名声明允许的属性、属性值正则（如 `href: [/^(?:https?|mailto):/]`）、`required` 默认值；对 `on*` 事件属性默认全部移除
  - **bundle 体积**: rehype-sanitize ~10KB minified + hast-util-sanitize ~30KB
  - **维护状态**: rehype-sanitize 6.0.0（2023-08）+ hast-util-sanitize 5.0.2 — 行业惯例为成熟稳定不需要频繁迭代；GitHub 仓库无未解决安全 issue
  - **license**: MIT
- 优势：生态原生集成成本最低；hast 级别白名单避免序列化-反序列化往返；schema 可在 dev-plan 演进过程版本化
- 劣势：默认 schema 偏 GitHub 风格，自定义 directive 引入的 Block 标签（如 `<wf-callout>`）需显式加白名单；schema 自身较大，需要在 §7.2 单独维护

### 方案 B: DOMPurify 3.4.5

- 维度对比：
  - **生态契合度**: 工作在 DOM / 字符串层，输入是 string 或 DOM Node；接入 hast 管线需 `hast → string → DOMPurify → parse → hast` 多次序列化往返
  - **runtime 兼容**: 浏览器原生 DOM，Node 端需 `jsdom` polyfill（包 `isomorphic-dompurify`）；与 §5.2 跨运行时一致性目标冲突（jsdom 在 Edge runtime 不可用）
  - **白名单 schema**: `ALLOWED_TAGS` / `ALLOWED_ATTR` / hook 系统；行业事实标准
  - **属性白名单粒度**: 与方案 A 同级
  - **bundle 体积**: dompurify ~21KB minified；服务端含 jsdom 后 ~3MB
  - **维护状态**: 3.4.5（2026-05），主动维护，频繁安全修复
  - **license**: Apache 2.0 / MPL 2.0 双许可
- 优势：浏览器端事实标准、安全研究投入最多
- 劣势：与五段管线 hast 模型不匹配，必须做格式转换；Node/Edge runtime 依赖 jsdom 与跨运行时一致性目标冲突；服务端 bundle 体积陡增

### 方案 C: sanitize-html 2.17.4

- 维度对比：
  - **生态契合度**: 工作在字符串层，输入是 HTML 字符串；接入 hast 管线需序列化-反序列化往返
  - **runtime 兼容**: Node first-class；浏览器端可跑但官方不推荐；Edge runtime 兼容性需测试
  - **白名单 schema**: `allowedTags` / `allowedAttributes` / `transformTags`
  - **bundle 体积**: ~120KB minified
  - **维护状态**: 2.17.4（2026-05），活跃维护
  - **license**: MIT
- 优势：Node 端老牌方案、配置灵活
- 劣势：bundle 体积大；与 hast 模型不匹配；浏览器端非一等公民

### 维度矩阵

| 维度 | rehype-sanitize 6.x | DOMPurify 3.4.x | sanitize-html 2.17.x |
|------|---------------------|------------------|----------------------|
| 输入模型 | hast 节点 | string / DOM | string |
| 与五段管线契合度 | 原生 | 多次序列化往返 | 多次序列化往返 |
| 跨四 runtime 兼容 | 是（纯 JS） | 否（Node 端需 jsdom，Edge 不可用） | 部分（Edge 需验证） |
| Bundle 体积 (min) | ~40KB | ~21KB（浏览器）/ ~3MB（含 jsdom） | ~120KB |
| Schema 类型完整度 | TS 完整定义 | TS 完整定义 | TS @types |
| License | MIT | Apache 2.0 / MPL 2.0 | MIT |
| 维护状态 | Stable | Active | Active |
| 最近发布 | hast-util-sanitize 5.0.2 / rehype-sanitize 6.0.0 (2023-08) | 3.4.5 (2026-05) | 2.17.4 (2026-05) |

## 结论

采用 **rehype-sanitize 6.x（基于 hast-util-sanitize 5.x）** 作为 XSS 防护 sanitizer：

### 实现栈

- M-002 `pipeline/sanitize.ts` 在 `hast → pre-paste-hast` stage 调用 `rehypeSanitize(schema)`，输入输出均为 hast
- 白名单 schema 定义在 `packages/core/src/sanitize/schema.ts`，类型 `Schema` 由 `hast-util-sanitize` 导出；导出常量 `wechatFlowSanitizeSchema`
- schema 基于 `defaultSchema` deepmerge：
  - **新增** Block 注册中心透出的自定义标签白名单（运行时通过 `M-005 registry` 汇总）
  - **新增** `style` 属性白名单（inline-styled HTML 是产物形态必备）+ CSS 属性二级白名单（在 sanitizer 之后由独立 CSS 属性过滤器把关）
  - **保留** `defaultSchema` 对 `on*` 事件属性的全量移除策略
  - **保留** `defaultSchema` 对 `href` / `src` 协议白名单（http / https / mailto）
- 在 M-002 内部，sanitizer 是 mdast → hast（remark-rehype）之后、过滤规则集（M-003）之前的强制 stage；任何绕过路径（如插件直接构造 hast 注入）都必须重新进入 sanitizer，确保 sanitizer 是单一守门点

### CSS 属性二级白名单

inline-styled HTML 必须放行 `style` 属性，但 `style` 内部仍可能注入 `expression()` / `url(javascript:...)` 等 vector。M-002 在 sanitizer 后追加 `pipeline/css-attr-filter.ts`：

- 解析每个 `style` 值为 CSS declaration 列表
- 仅放行符合微信公众号渲染兼容子集的 CSS 属性（白名单见 `packages/ruleset` 的 CSS 子集声明）
- 拒绝任何含 `expression(` / `javascript:` / `behavior:` / `@import` 的值

### 何时应重新评估

- hast-util-sanitize 5.x 发现未修复的 CVE（监控 npm advisory）
- rehype-sanitize 与 unified 19+ 出现兼容性断裂
- microfrontends / iframe sandbox 模型重大调整导致 sanitizer 责任边界外移
- 切换 SourcePane 引擎或渲染管线（替换 unified 生态）时一并重评

### 不采用 DOMPurify 的理由

- 与五段管线的 hast 模型不匹配，需多次序列化往返，破坏 stage 纯函数边界
- Node / Edge runtime 依赖 jsdom，与 §5.2 跨四运行时一致性目标冲突
- 服务端 bundle 体积超 50x

### 不采用 sanitize-html 的理由

- 工作在字符串层与五段管线 hast 模型不匹配
- bundle 体积是 rehype-sanitize 的 3x
- Edge runtime 兼容性未验证，与 PRD §3.3 跨运行时目标冲突

### 来源

- rehype-sanitize npm: https://www.npmjs.com/package/rehype-sanitize
- rehype-sanitize GitHub: https://github.com/rehypejs/rehype-sanitize
- hast-util-sanitize GitHub: https://github.com/syntax-tree/hast-util-sanitize
- hast-util-sanitize default schema: https://github.com/syntax-tree/hast-util-sanitize/blob/main/lib/schema.js
- DOMPurify npm: https://www.npmjs.com/package/dompurify
- sanitize-html npm: https://www.npmjs.com/package/sanitize-html
