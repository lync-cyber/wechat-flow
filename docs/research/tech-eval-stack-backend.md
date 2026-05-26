---
id: "rn-003-backend-framework"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow"]
consumers: [architect, tech-lead, devops]
context: "ARCH §1.4 — 后端框架（中继服务 + MCP HTTP transport）选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: 后端框架选型

## 问题

后端承载三类工作负载：

1. **MCP server**（F-013）：stdio + HTTP/SSE 双 transport，对 LLM Agent 暴露 16 个 Tool，要求 P95 < 800ms 冷启动
2. **凭据中继服务**（F-005 / F-006 / 安全 §3.2）：AppID/AppSecret / 图床 token 服务端持有；图片上传中继、公众号素材库上传中继
3. **长任务编排**（F-005 / F-013 AC-004）：长图 / 封面 Headless 渲染 job 队列与 `get_job` 轮询

PRD §3.3 要求跨运行时一致性：浏览器主线程 / Web Worker / Node / Edge runtime 同输入字节级一致。后端框架需要：

- 同代码支持 Node + Edge runtime（Cloudflare Workers / Vercel Edge）
- SSE 原生支持（MCP HTTP transport 依赖）
- 与共享渲染核心 `@wechat-flow/core` 在 Edge 环境 zero runtime 适配运行
- 低冷启动开销

## 调研方法

web-search（2026-05 新鲜度验证）+ 多 runtime 适配性对比 + MCP transport 兼容性。

## 发现

### 方案 A: Hono

- 维度对比：
  - 性能：基于 Web Standards `Request` / `Response`，冷启动 < 50ms（Edge runtime 实测）
  - 多 runtime：原生支持 Node / Deno / Bun / Cloudflare Workers / Vercel Edge / AWS Lambda 同一份代码
  - SSE：内置 `streamSSE` helper，与 MCP HTTP transport 协议对齐
  - 中间件生态：JWT / CORS / Validator (Zod / Valibot) / OpenAPI 一应俱全
  - 类型推导：RPC 模式 client 端零样板，与 trpc 同档体验
  - 版本生命周期：Hono 4.x active，主版本演进活跃
- 优势：与 PRD 跨运行时一致性目标完全对齐；Web Standards 减少跨 runtime 适配负担；SSE 原生支持
- 劣势：与 Node-only 重量框架相比，部分 Node-specific 中间件（如 multer）需替换为 Web Standards 等价物
- 来源：
  - Hono 官方文档 https://hono.dev
  - Hono Streaming Helper https://hono.dev/docs/helpers/streaming

### 方案 B: Fastify

- 维度对比：
  - 性能：Node runtime 内极快（基于 schema 编译）
  - 多 runtime：仅 Node；Edge runtime 不可用
  - SSE：通过 plugin 实现，非一等公民
  - 中间件生态：插件体系成熟、schema 驱动校验完善
  - 类型推导：通过 TypeBox / Zod plugin 支持，但 RPC client 不内建
- 优势：Node 端性能优秀、插件生态成熟
- 劣势：不支持 Edge runtime，与 PRD §3.3 跨运行时目标冲突；需要为不同部署形态分叉代码
- 来源：
  - Fastify 文档 https://fastify.dev

### 方案 C: Nitro (UnJS / H3)

- 维度对比：
  - 性能：与 Hono 同档，基于 Web Standards
  - 多 runtime：覆盖 Node / Deno / Bun / Cloudflare / Vercel / Netlify
  - SSE：通过 `sendStream` / `createEventStream` 支持
  - 中间件生态：UnJS 生态（h3 / unstorage / unjwt）覆盖广
  - 类型推导：与 Nuxt 深度集成时最佳，独立使用时弱于 Hono RPC
- 优势：多 runtime 与 Hono 同档；UnJS 生态丰富
- 劣势：相对 Hono，独立后端项目（非 Nuxt 套件）的资料与样板偏少；RPC client 体验弱于 Hono
- 来源：
  - Nitro 文档 https://nitro.build
  - H3 文档 https://h3.dev

## 用户反馈

用户在 Q1.3 选择方案 A（`Hono`），理由：
1. Web Standards API 与 PRD §3.3 跨四运行时一致性目标完全对齐
2. 多 runtime 同代码降低部署形态分发的代码维护成本
3. SSE 原生支持，MCP HTTP transport 实现零额外适配
4. 与 PRD §1.2 自动化调用方场景（LLM Agent）的 Tool 契约稳定性诉求匹配

## 结论

采用 **Hono 4.x** 作为后端框架：

- MCP server (`apps/mcp-server`) 使用 Hono `streamSSE` 实现 HTTP/SSE transport；stdio transport 由独立 entry 复用同一 Tool 路由表
- 中继服务 (`apps/relay`) 使用 Hono + Zod validator 实现凭据中继与上传 proxy
- 共享路由契约定义在 `@wechat-flow/contracts` 包，前端通过 Hono RPC 类型推导直连
- 部署目标默认 Node（Docker / Bare Metal），可选 Edge runtime（Cloudflare Workers / Vercel Edge）作为 MCP HTTP transport 的低冷启动形态；具体部署形态由 devops 阶段在 deploy-spec 中规划

## 何时应重新评估

- Hono 出现破坏性 major release（如 5.x）且与 `@wechat-flow/contracts` RPC 推导链路不兼容
- 多 runtime 同代码策略出现裂痕（如 Node 22 与 Cloudflare workerd 在 Web Standards API 实现上分叉，需要为不同 runtime 分叉 entry）
- SSE 在 MCP 协议升级后不再是 transport 选项，HTTP transport 改用 WebSocket / WebTransport
- 长任务负载形态变化导致中继服务从 BFF 演化为微服务集群，需要重新评估 NestJS / tRPC 等更强模块化方案
- Fastify / Nitro 中任一在 Edge runtime 与 Hono 同档且生态成熟度反超
