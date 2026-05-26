---
id: "rn-001-monorepo-toolchain"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow"]
consumers: [architect, tech-lead, devops]
context: "ARCH §1.4 — monorepo 与构建编排工具选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: Monorepo 与构建编排工具选型

## 问题

wechat-flow 包含多形态分发产物：浏览器编辑器（fullstack 主应用）、MCP server、中继服务、CLI、可热加载主题/插件 pack、共享的渲染核心库（需在浏览器主线程 / Web Worker / Node / Edge runtime 四运行时跨执行）。PRD §3.3 要求跨运行时确定性渲染，依赖共享代码包发布同一版本三元组；PRD §1.3 要求 ≥120 variant、≥40 Block、≥5 主题独立打包并热加载。需要一套 monorepo 工具链支持：

- 严格依赖隔离（防止幽灵依赖污染插件沙箱）
- 共享渲染核心包跨 13 个候选模块快速本地链接
- 远程构建缓存以支撑 CI 的 42 条规则 fixture + Playwright 截图矩阵
- 与微信公众号编辑器粘贴过滤模拟所需的 Node + 浏览器双端测试链路兼容

## 调研方法

web-search（2026-05 新鲜度验证）+ 项目特征对比。

## 发现

### 方案 A: pnpm workspaces + Turborepo

- 维度对比：
  - 依赖隔离：pnpm 通过 symlink + content-addressable store 实现严格 phantom-dep 阻断，对插件沙箱 supply-chain 校验更友好
  - 性能：Turborepo 远程缓存（Vercel Remote Cache 或自建 S3 后端）+ 并行任务编排，复用 Rust 实现
  - 生态：Next.js / Vue / Vite 官方推荐链路，社区 recipes 丰富
  - 学习成本：filter 语法直观（`pnpm --filter @wechat-flow/core build`）
  - 版本生命周期：pnpm 9.x 与 Turborepo 2.x 均为 active LTS，主版本演进周期 ≈ 12 个月
- 优势：依赖隔离最强、缓存策略最完善、对 hybrid runtime 包格式（ESM/CJS dual）原生友好
- 劣势：Turborepo 远程缓存自托管需要单独的 S3/对象存储；任务图静态描述需要 `turbo.json` 维护
- 来源：
  - pnpm 官方文档 https://pnpm.io/workspaces （workspace protocol 与 filter 语法）
  - Turborepo 文档 https://turborepo.com/docs （Remote Cache 与 task graph）

### 方案 B: Nx (with pnpm)

- 维度对比：
  - 依赖隔离：依旧依赖 pnpm，能力等价
  - 性能：Nx Cloud 远程缓存 + Affected 检测（git diff 触发的最小重建子图）更细
  - 生态：偏 Angular / React 大型企业栈，Vue 3 + Vite plugin 集成略晚于 Turborepo
  - 学习成本：plugin 体系庞大（project graph、generators、executors）需投入学习
- 优势：affected 检测细颗粒度、generator 体系成熟
- 劣势：plugin 抽象层厚，对小到中型 monorepo 偏重；与 Vue Vapor + Hono 的官方 preset 整合较弱
- 来源：
  - Nx 官方文档 https://nx.dev/concepts/mental-model

### 方案 C: Bun workspaces (单包管理器 + 内建构建)

- 维度对比：
  - 依赖隔离：尚未实现 pnpm 级 strict mode（仍存在 phantom dep 风险）
  - 性能：原生 runtime 速度极快，但 Edge runtime / Cloudflare Workers 等目标对 Bun-only API 兼容性仍在演进
  - 生态：Vue Vapor / Hono 兼容但部分插件（如 Playwright）仍以 Node 为 first-class
  - 跨 runtime：与 PRD §3.3 跨四运行时一致性目标存在 Bun-specific API 误用风险
- 优势：单工具链覆盖包管理 + 测试 + 转译
- 劣势：与 PRD 跨运行时确定性的核心目标存在风险；2026 仍未达到 pnpm 在 supply-chain 治理上的成熟度
- 来源：
  - Bun 官方文档 https://bun.com/docs/install/workspaces

## 用户反馈

用户在 Q1.1 选择方案 A（`pnpm workspaces + Turborepo`），理由：
1. pnpm 严格依赖隔离与插件沙箱 supply-chain 校验诉求对齐
2. Turborepo 远程缓存与并行任务支撑规则集 fixture 矩阵与 Playwright 视觉回归
3. 与 Vue 3.5 + Vite + Hono 链路在 2026-05 时点的社区 recipe 最丰富

## 结论

采用 **pnpm 9.x + Turborepo 2.x** 作为 monorepo 工具链：

- 顶层 workspace 通过 `pnpm-workspace.yaml` 声明 `packages/*` 与 `apps/*`
- `turbo.json` 定义 `build` / `test` / `lint` / `typecheck` / `e2e` 五个核心任务的依赖图
- 共享渲染核心包 `@wechat-flow/core` 以 `workspace:*` 协议在所有 apps 引用
- 远程缓存配置由 devops 阶段在 deploy-spec 中选定具体后端（Vercel Cache / 自托管 S3）

## 何时应重新评估

- Turborepo 出现破坏性 major release（如 3.x），且 `turbo.json` 配置不兼容
- pnpm workspace protocol 行为发生破坏性变化（`workspace:*` 解析规则调整）
- 项目规模超出 30 个 workspace package 且 affected 检测精度成为瓶颈：重新评估 Nx 的 affected 精度
- Vue Vapor / Hono / Cloudflare Workers 任一与 Turborepo 远程缓存出现兼容性断裂
- Bun workspaces 进入 strict-phantom-dep 模式且 Edge runtime 兼容性达到 Node 同档：重新评估 Bun 单工具链路径
