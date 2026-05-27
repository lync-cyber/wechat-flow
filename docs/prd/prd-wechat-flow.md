---
id: "prd-wechat-flow"
version: "0.5.0"
doc_type: prd
author: product-manager
status: approved
deps: []
consumers: [architect, ui-designer, tech-lead]
volume: main
ac_in_volumes: ["prd-wechat-flow-f001-f014"]
required_sections:
  - "## 1. 概述"
  - "## 2. 功能需求"
  - "## 3. 非功能需求"
  - "## 4. 约束与假设"
  - "## 5. 术语表"
---
# PRD: wechat-flow — 微信公众号写作与排版工具

[NAV]
- §1 概述 → §1.1 背景与动机, §1.2 目标用户, §1.2.2 交付形态, §1.3 成功指标
- §2 功能需求 → F-001 写作体验, F-002 视觉一致性与预览, F-003 主题与组件系统, F-004 输出能力-复制与导出, F-005 输出能力-长图封面素材库, F-006 图片处理, F-007 微信平台适配规则集, F-008 主题预设变体, F-009 主题继承与品牌包, F-010 开发者扩展与插件系统, F-011 质量保障, F-012 协作与同步, F-013 程序化调用, F-014 中文排版修订
- §3 非功能需求 → §3.1 性能, §3.2 安全, §3.3 可靠性与确定性, §3.4 兼容性, §3.5 视觉一致性验收规范
- §4 约束与假设
- §5 术语表
[/NAV]

## 1. 概述

### 1.1 背景与动机

微信公众号编辑器对粘贴 HTML 有严格的过滤行为——剥离 `<style>` 标签、剥离 `id` 属性、不支持 CSS 变量、部分 flex/grid 布局失效——使得写作者无法通过常规 HTML/CSS 手段控制最终排版。现有工具要么要求写作者手动内联样式，要么产出在粘贴后出现视觉偏差。

wechat-flow 把微信平台过滤行为系统化为可版本化、可单元测试的规则集，并在渲染管线末端执行粘贴模拟，确保本地预览与公众号实际展示的视觉一致性。写作者只需输入语义化 Markdown，工具产出经粘贴过滤后仍保持视觉一致的 inline-styled HTML。

### 1.2 目标用户

**三类用户，三条工作流，一份产物契约**：

| 用户类型 | 面对什么 | 典型场景 |
|---------|---------|---------|
| 写作者 | Markdown 语法 + 主题选择 | 写作、排版、一键复制到公众号编辑器 |
| 主题/组件开发者 | schema + token，无需了解微信平台过滤规则细节 | 贡献内置/第三方主题与组件扩展 |
| 自动化调用方（LLM Agent / CI / Headless 任务） | 一份稳定的 Tool 契约，输入 Markdown 与主题，输出可复现的 inline HTML 与结构化诊断 | 自动化写稿、批量排版、程序化上传素材库 |

产物契约固定为：**经过微信编辑器粘贴过滤后仍保持视觉一致的 inline-styled HTML**。

### 1.2.2 交付形态

wechat-flow 通过六种形态向不同用户与调用方分发能力，所有形态共享同一份 `@wechat-flow/core` 渲染核心：

| 形态 | 优先级 | 目标用户 | 最小 AC | 备注 |
|------|--------|---------|---------|------|
| Web 编辑器 SPA | P0 | 写作者 | F-001..F-004 全部 P0 AC | 主入口，静态托管 |
| `@wechat-flow/core` npm 包 | P0 | 主题/组件/插件开发者 / 二次集成方 | F-013 AC-001（跨运行时一致）、AC-002（schema） | 公开发布到 npm registry |
| MCP server (stdio + HTTP/SSE) | P1 | LLM Agent | F-013 AC-001..AC-006，覆盖 23 个 Tool | stdio 本地嵌入 + HTTP/SSE 远程双 transport |
| CLI `wechat-flow` | P1 | 主题/插件开发者 + CI 调度方 | F-010 AC-003（脚手架）+ F-013 AC-003（Tool 壳） | 单一二进制，覆盖 init/dev/validate/publish/render/copy/export |
| Skill bundle | P1 | LLM Agent（语义级任务） | F-013 AC-003（分发形态） | 与 MCP server 共版本号发布 |
| Relay 中继服务 | P0（依赖功能必需）| 服务端凭据托管 | F-005 / F-006 / §3.2 凭据隔离 | 自托管或托管二选一，部署形态由 deploy-spec 终定 |

### 1.3 成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|----------|
| 粘贴后视觉一致性 | ≤ 5% 像素差异 | 见 §3.5 视觉一致性验收规范；CI 默认门禁为 simulatePaste 模拟 + Playwright 截图 diff |
| 键入与渲染响应性 | 见 §3.1 性能详表 | 见 §3.1 |
| 过滤规则集覆盖度 | ≥ 42 条规则，100% CI 通过 | 五类作用域（剥除/夹值/转换/规范化/静态诊断）全覆盖 |
| 内置 Block 数 | ≥ 40 | 组件注册表统计 |
| 内置 Mark 数 | ≥ 11 | 组件注册表统计 |
| 内置 Token 数 | ≥ 60 | token 注册表统计 |
| 内置 Variant 皮肤数 | ≥ 120 | variant 注册表统计 |
| 内置主题数 | ≥ 5 | 主题注册表统计 |
| 内置主题模板数 | 每主题 ≥ 1 预设 template 且通过覆盖白名单守护（见 F-003 AC-012 / F-011 AC-009） | 模板注册表统计 |
| 确定性渲染 | 固定版本三元组下相同输入产出 SHA-256 一致的 HTML | 自动化回归测试 |
| Public Tool Schema 稳定性 | 破坏性变更走 semver major + 不少于一个 minor 周期的 deprecation window | semver 发布策略 |

---

## 2. 功能需求

验收标准 (AC-NNN) 定义见分卷 [prd-wechat-flow-f001-f014#§2](./prd-wechat-flow-f001-f014.md)。

功能需求详细定义见分卷文档 `prd-wechat-flow-f001-f014.md`（id: `prd-wechat-flow-f001-f014`）。

功能列表概览（F-001..F-014）：

| 编号 | 功能名称 | 优先级 | 备注 |
|------|---------|--------|------|
| F-001 | 写作体验 | P0 | |
| F-002 | 视觉一致性与预览 | P0 | |
| F-003 | 主题与组件系统 | P0 | |
| F-004 | 输出能力 — 一键复制与 HTML 导出 | P0 | |
| F-005 | 输出能力 — 长图、封面与素材库上传 | P1 | |
| F-006 | 图片处理 | P0 | |
| F-007 | 微信平台适配规则集 | P0 | |
| F-008 | 主题预设变体（template，与 F-003 协同） | P1 | |
| F-009 | 主题继承与品牌包 | P2 | |
| F-010 | 开发者扩展与插件系统 | P1 | |
| F-011 | 质量保障 | P0 | AC 级细分见分卷 (AC-001~004 + AC-009 P0 / AC-005~008 P1) |
| F-012 | 协作与同步 | P2 | 不在当前发布范围；AC-004 仅作 ARCH 预留路径 |
| F-013 | 程序化调用 — MCP / CLI / Skill | P1 | |
| F-014 | 中文排版修订 | P1 | |

---

## 3. 非功能需求

### 3.1 性能

| 场景 | 指标 | 目标值 |
|------|------|--------|
| 万字文档键入延迟 | P95 端到端响应时间 | < 50ms |
| 万字文档主题切换耗时 | 主题切换到预览更新完成时间 | < 200ms |
| MCP `render_markdown` 冷启动 | P95 响应时间（万字稿件） | < 800ms |
| 图片上传（本地→图床） | 单张 5MB 图片上传完成时间 | [ASSUMPTION] < 10s（受网络条件影响，architect 阶段确认） |

### 3.2 安全

以下为安全非功能基线，具体加密算法、密钥轮换策略、CSP 头部细则交 architect 阶段决策。

**用户凭据存储与传输隔离**：AppID/AppSecret（微信公众号开发者凭证）、API key（MCP server 鉴权）、图床 token 必须由服务端持有，不进浏览器；凭据相关的请求通过服务端中继转发，传输强制 TLS。微信公众号素材库上传链路同样通过 relay 转发，AppSecret 不在任何客户端形态中出现。

**第三方插件沙箱代码执行隔离**：第三方插件代码在沙箱内执行，沙箱内代码不得访问主线程 DOM、凭据存储及 architect 阶段在沙箱架构设计中定义的网络访问白名单以外的资源（PRD 仅声明沙箱代码不应能任意访问外部网络，白名单具体范围由 architect 阶段定义）；沙箱边界由 architect 阶段选型（Web Worker + Comlink RPC 为架构候选），但隔离能力是不可妥协的非功能基线。未通过校验或运行时违规的插件降级为占位符（见 F-010 AC-008）。

**MCP server 鉴权机制基线**：MCP server 对外暴露的 Tool 接口须鉴权；基线要求 API key + per-key 配额（见 F-013 AC-004）；具体 key 生命周期管理与吊销机制由 architect 阶段规划。

**XSS 防护边界**：用户提交的 Markdown 在渲染为 HTML 的过程中，必须经过白名单过滤（sanitize），禁止将用户输入直接以未过滤方式注入 DOM；任何等价于 `dangerouslySetInnerHTML` 的逃逸路径须由 sanitizer 守门，不得绕过。

### 3.3 可靠性与确定性

- **确定性渲染**：固定 `coreVersion + themeVersion + rulesetVersion` 下，相同 Markdown 输入必须产出 SHA-256 一致的 HTML 字节序列，不受运行时环境（浏览器主线程 / Web Worker / Node / Edge runtime）影响。
- **跨运行时一致性**：浏览器主线程 / Web Worker / Node / Edge runtime 四运行时同输入产出字节级一致（逐字符 SHA-256 相同）。
- **规则集回归零容忍**：过滤规则集 CI 必须 100% 通过，任何回归阻断发布。
- **主题守护零容忍**：内置主题必须通过 9 维静态校验，任何维度不通过阻断发布。

### 3.4 兼容性

| 平台/场景 | 要求 |
|---------|------|
| 桌面浏览器 | Chrome 100+ / Safari 15+ / Edge 100+ |
| 移动端浏览器 | 不要求完整功能，Firefox 移动端纯前端剪贴板降级 |
| 公众号编辑器粘贴兼容 | 产物在微信公众号编辑器粘贴后视觉差异 ≤ 5% |
| 微信客户端渲染 | 以过滤规则集（≥ 42 条）为对齐标准，规则集随平台行为更新持续演进 |

### 3.5 视觉一致性验收规范

视觉一致性 ≤ 5% 的验收口径在三个层级统一定义，避免 CI 门禁与发布前人工验证边界混淆。

| 层级 | 验收路径 | 频次 | 通过条件 |
|------|---------|------|---------|
| CI 默认门禁 | 本地 Playwright + 渲染管线 `simulatePaste` 模拟（不调用真实公众号） | 每 PR | pixelmatch ratio ≤ 0.05；详见 F-011 AC-004a |
| 发布前周期验证 | 真实公众号编辑器粘贴 → 截图回归 | 每 minor release 前 | 5 主题 × 1 篇典型样本视觉差异 ≤ 5%；结果回写 `docs/EVENT-LOG.jsonl` |
| 紧急回归排查 | 实地验证辅助脚本生成对照页 | 按需触发 | 见 F-011 AC-008 |

共享参数（与 §4 [ASSUMPTION] 一致）：算法 `pixelmatch` (threshold 0.2, includeAA: false)；视口 1280×800 (desktop) + 375×667 (mobile)；5 篇典型样本固定在 `tests/visual/samples/{theme}/article.md`（5 主题 × 1 篇）；计算口径 `mismatched_pixels / total_pixels ≤ 0.05`。

---

## 4. 约束与假设

**明确不做（非目标）**：

- 不做通用富文本所见即所得编辑器——保持 Markdown 源码为单一真相。
- 不做多平台输出——聚焦微信公众号一条路；知乎、掘金、小红书等平台保留为架构扩展点，由社区驱动。
- 不做实时多人协作（个人写作优先）。F-012 整族（云端同步 / 版本历史 / 多人协作）不在当前发布范围，仅作为架构预留路径保留在 ARCH §6.2 可选拓扑。
- 不做 PDF 导出——公众号写作者的最终交付物是 inline-styled HTML，PDF 既不是发布通道也不是高频导出场景。

**假设**：

- [ASSUMPTION] 微信公众号编辑器的过滤规则以实测为准，规则集需持续维护；现有 42 条规则基于已知平台行为归纳，不代表全集。
- [ASSUMPTION] 图片压缩策略（阈值、格式）以公众号平台实测上限为准，architect 阶段确认具体参数。
- [ASSUMPTION] 云端功能（素材库上传、Headless 渲染）需要后端服务，部署形态由 architect 阶段规划。依赖服务端的功能范围包括 F-005（长图/封面 Headless 渲染 + 素材库上传中继）、F-006（多图床 relay，凭据中继）、F-013（MCP server / API 中继）、F-012（**v2 可选拓扑**：y-websocket 协作服务 + YDocSnapshot 持久化，当前发布不部署，详 arch-wechat-flow §6.2），architect 阶段需统一规划这些后端服务的部署形态与共享边界。
- [ASSUMPTION] 视觉一致性 ≤ 5% 验收规范：算法 `pixelmatch`，threshold 0.2，`includeAA: false`；视口 1280×800（desktop）+ 375×667（mobile）；5 篇典型样本固定在 `tests/visual/samples/{theme}/article.md`（5 主题 × 1 篇）；计算口径 `mismatched_pixels / total_pixels ≤ 0.05`。

---

## 5. 术语表

| 术语 | 定义 |
|------|------|
| template | 主题内置预设变体，主题命名空间下的预填 Markdown 内容，作为市场卡片起点与该主题能力的活样本；不同主题下可重定义同名 template |
| template namespace | 主题为 template 的命名空间，不同主题下同名 template 可独立定义而不冲突 |
| mdast | Markdown Abstract Syntax Tree，Markdown 解析后的抽象语法树，由 remark 生态使用 |
| hast | Hypertext Abstract Syntax Tree，HTML 的抽象语法树，由 rehype 生态使用 |
| directive | 基于约定的 Markdown 扩展语法，用于声明块级容器（`::: card{...} ... :::`）和行内组件（`:badge[text]{...}`），非 CommonMark 标准 |
| variant | 同一 Block 或 Mark 组件的不同视觉皮肤，写作者在 directive 属性中通过 `variant=xxx` 切换 |
| token | 设计系统中的原子变量（颜色、间距、字号、字体栈、装饰资源），主题通过 token 字典定义视觉风格 |
| paint | 单文档级 token 覆盖机制，写作者在 YAML frontmatter 的 `paint` 字段中覆盖主题声明的 `paintable` 子集 |
| paintable | 主题在 `defineTheme` 内显式声明可被写作者覆盖的 token 路径集合（`readonly TokenPath[]` 或 `'all-colors'`） |
| base-color | 单文档调色板派生机制，写作者在 frontmatter 声明一个主色，工具在 LCH 色彩空间自动派生完整 token 字典 |
| pack | 插件包单元，将组件、主题、规则补丁、variant 皮肤统一打包的发布形态 |
| ruleset | 微信平台过滤规则集，每条规则覆盖剥除/夹值/转换/规范化/静态诊断五类作用域之一，版本化管理 |
| standalone | 独立可分享的 HTML 文件，所有样式已内联，无外部依赖 |
| inline-styled HTML | 所有 CSS 样式写进每个元素 `style` 属性的 HTML，无 class 依赖，可在任意环境直接渲染 |
| Headless 渲染 | 在无显示器的服务端环境运行浏览器渲染引擎（如 Playwright）进行截图/导出 |
| MCP server | Model Context Protocol server，供 LLM Agent 原生工具发现与调用的服务接口，支持 stdio + HTTP/SSE 双 transport |
| Skill bundle | 含 SKILL.md 与资源目录的语义级任务编排单元，其工具调用落到 MCP tools |
| wechat-flow CLI | 单一命令行二进制，覆盖插件脚手架（`init`/`dev`/`validate`/`publish`）与渲染 Tool 壳（`render`/`copy`/`export`）；F-010 与 F-013 共享同一进程入口 |
| job_id | 长任务异步模型中的任务唯一标识符，调用方通过 `get_job(job_id)` 轮询获取状态/结果 |
| Idempotency-Key | 幂等键，约定为 `sha256(canonical_json(input) + toolsetVersion)`，用于长任务去重，防止重复提交 |
| LCH | Lightness-Chroma-Hue，感知均匀色彩空间，用于调色板派生以保证色彩感知一致性 |
| CRDT | Conflict-free Replicated Data Type，无冲突复制数据类型，用于多人协作场景的数据同步 |
| GFM | GitHub Flavored Markdown，GitHub 扩展的 Markdown 规范，包含表格、删除线、任务列表等扩展 |
| WCAG | Web Content Accessibility Guidelines，网页内容无障碍指南，用于颜色对比度校验标准 |
| hast→hast | 过滤规则集在 hast 层的作用范围，输入 hast 树经规则处理后输出符合微信平台约束的 hast 树 |
| rulesetVersion | 规则集版本号，与 coreVersion、themeVersion 共同构成产物可复现性元数据三元组 |
| opt-out | 主题作者针对特定元素显式声明不应用某条全局降级规则（如 flex→block 降级） |
| Zod | TypeScript 优先的 schema 校验库，提供运行时校验与类型推导一体能力 |
| AppID / AppSecret | 微信公众号开发者账号凭证，AppSecret 必须服务端持有，不进浏览器 |
| EXIF | Exchangeable Image File Format，图片元数据格式，含拍摄时间、地理位置等敏感字段 |
| SHA-256 | 256-bit 安全哈希算法，用于产物字节级一致性验证 |
| CommonMark | Markdown 规范化标准，工具的基础 Markdown 语法对齐 CommonMark + GFM 扩展 |
| mdast→hast | 渲染管线中的语法树转换阶段（Markdown AST → HTML AST） |
