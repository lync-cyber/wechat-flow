---
id: "rn-002-frontend-framework"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow"]
consumers: [architect, ui-designer, tech-lead]
context: "ARCH §1.4 — 编辑器前端框架与渲染层选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: 编辑器前端框架选型

## 问题

PRD §3.1 要求万字文档键入延迟 P95 < 50ms、主题切换 < 200ms；F-001 编辑器为三栏复杂 UI（左侧导航 + 中间源码 + 右侧 iframe 预览），含命令面板、抽屉、对话框、可视化兼容性报告；F-003 主题热切换要求源码不变仅重跑后段管线；F-010 全链路类型推导要求 schema 与 props 类型在 TS 层自动推导。需要一套前端框架：

- 在大规模响应式状态下保持 < 50ms 键入延迟
- 类型推导友好以支撑 schema 驱动的插件 props 自动推导
- 与 Vite + Hono BFF 集成顺畅
- 中文社区生态丰富（贡献者门槛低）

## 调研方法

web-search（2026-05 新鲜度验证）+ 性能基准对比 + 与 PRD 性能预算交叉。

## 发现

### 方案 A: Vue 3.5 (Vapor Mode)

- 维度对比：
  - 性能：Vapor Mode 抛弃 Virtual DOM，编译到命令式 DOM 操作；官方基准在长列表 / 频繁更新场景接近 Svelte 5；万字 Markdown 实时预览的 DOM 更新成本低
  - 类型推导：Volar 在 3.5 时点对 `defineProps<T>()`、defineSlots、generic component 的推导能力达到与 React + TS 同级别
  - 生态：Vite 一等公民、Pinia / VueUse / Naive UI 等组件库成熟；中文文档与社区资源丰富
  - 学习成本：模板 + composition API 双范式，对从 Vue 2 迁移的开发者过渡平滑
  - 版本生命周期：Vue 3.5 为 2026 active major，Vapor Mode 在 3.5 正式进入 stable channel
- 优势：性能与类型推导达到 React + Svelte 同档；中文生态最强
- 劣势：Vapor Mode 与传统 Virtual DOM 模式互操作有少量边界（在同组件树混用时需注意）；社区第三方组件库尚未全面适配 Vapor
- 来源：
  - Vue 官方文档 https://vuejs.org/guide/extras/vapor-mode.html
  - Vue 3.5 release notes https://blog.vuejs.org/posts/vue-3-5

### 方案 B: React 19 + React Compiler

- 维度对比：
  - 性能：React Compiler 自动 memoization 大幅减少手动优化；并发渲染对长任务切片友好
  - 类型推导：TS 生态最成熟，schema → props 推导有 Zod + tRPC 等深度集成
  - 生态：组件库与 LLM Agent 调用工具（langchain-react 等）最丰富
  - 学习成本：Hooks 心智成本仍高（依赖数组、闭包陷阱）
  - 版本生命周期：React 19 active，Compiler 在 2026 进入 stable
- 优势：TS 生态与 LLM 集成工具最丰富
- 劣势：相对 Vapor Mode 的命令式渲染仍多一层 Virtual DOM 对账；中文一手资料相对较少；F-010 全链路类型推导 + 用户偏好"中文社区资源"对齐度低于 Vue
- 来源：
  - React 19 docs https://react.dev/blog/2024/12/05/react-19
  - React Compiler https://react.dev/learn/react-compiler

### 方案 C: Svelte 5 (Runes)

- 维度对比：
  - 性能：编译时优化最彻底，bundle 最小
  - 类型推导：Runes 改善了 TS 推导，但 generic component 仍弱于 Vue 3.5 Volar
  - 生态：组件库与中文社区资源相对偏少
  - 学习成本：Runes 改写了响应式心智模型，老 Svelte 开发者需重学
- 优势：性能极致、bundle 体积最小
- 劣势：中文生态薄弱；schema 驱动的 props 推导链路工具不如 Vue / React
- 来源：
  - Svelte 5 docs https://svelte.com/docs/svelte/overview

## 用户反馈

用户在 Q1.2 选择方案 A（`Vue 3.5 (Vapor Mode)`），理由：
1. Volar 在 3.5 的 TS 推导优势契合 F-010 全链路类型推导诉求
2. Vapor Mode 性能接近 Svelte 5，可满足 P95 < 50ms 键入延迟预算
3. 中文社区资源最丰富，降低主题/插件开发者贡献门槛

## 结论

采用 **Vue 3.5 (Vapor Mode)** 作为编辑器前端框架：

- 编辑器主应用 `apps/editor` 全量启用 Vapor 模式
- 共享渲染核心 `@wechat-flow/core` 保持 framework-agnostic（纯 TS，无 Vue 依赖），便于 MCP server / CLI 在 Node 端复用
- iframe 预览沙箱内的渲染产物为静态 inline-styled HTML，不依赖任何前端框架运行时
- 命令面板 / 抽屉等通用组件优先采用已支持 Vapor 的组件库；未支持组件以传统 Vue 模式实现并通过编译器互操作能力混用

## 何时应重新评估

- Vue Vapor 在生态组件覆盖率上长期停滞（>12 个月主流 Vue 组件库未适配），影响命令面板 / 抽屉 / 对话框 UI 选型
- React Compiler 进入 stable 且实测自动 memoization 在万字键入场景达到 Vapor 同档性能
- Svelte 5 的 Volar 等价类型推导工具链成熟且 schema 驱动 props 推导能力对齐 Vue
- F-010 全链路类型推导诉求出现 Vue + Volar 难以覆盖的边界（如复杂 generic component 推导失败）
- 编辑器主应用迁移到桌面端（Tauri / Electron），与 React Native / Flutter 等跨端栈共享 UI 层的诉求出现
