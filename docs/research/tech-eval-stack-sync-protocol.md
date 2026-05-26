---
id: "rn-004-sync-protocol"
doc_type: research
author: architect
status: approved
deps: ["prd-wechat-flow"]
consumers: [architect, tech-lead, devops]
context: "ARCH §1.4 / M-013 / E-009 — F-012 协同与同步协议选型"
required_sections:
  - "## 问题"
  - "## 调研方法"
  - "## 发现"
  - "## 结论"
---
# Research Note: 同步协议选型 (F-012)

## 问题

PRD §2.F-012 列出协作与同步需求（P2 优先级）：

- AC-001: 多文档草稿云端同步
- AC-002: 多客户端实时协同编辑（光标 / 选区可见）
- AC-003: 版本历史与回滚
- AC-004: 冲突解决无需人工介入

PRD §3.2 强调凭据不进浏览器；同步后端必须能与中继服务共享 API key 鉴权。

PRD §3.3 强调跨运行时确定性，但同步协议本身只跑在浏览器 + Node，**不进入** core 渲染管线，因此不受字节级一致约束。

候选协议需评估：

1. **Yjs**（CRDT，13.6.x stable）
2. **Automerge 2**（CRDT，2.x）
3. **推迟决策**（P2 模块，先留接口预留，dev 阶段再定）

## 调研方法

- **web-search**: Yjs / Automerge 2 最新版本 + 生态完整度
- **生态对比**: 与 CodeMirror 6（已选 SourcePane 引擎）的绑定包成熟度
- **服务端集成**: 与 Hono / Redis / Node 容器化部署的契合度
- **user-interview**: 让用户在 Yjs / Automerge 2 / 推迟决策三选一

## 发现

### 维度对比矩阵

| 维度 | Yjs 13.6.x | Automerge 2.x | 推迟决策 |
|------|----|----|----|
| 协议类型 | CRDT (Y-CRDT) | CRDT (Automerge) | — |
| 性能（大文档 op 合并） | 优秀（专为编辑器优化的 ops 压缩） | 良好（v2 后大幅提升，但仍弱于 Yjs 在文本场景） | — |
| CodeMirror 6 绑定 | `y-codemirror.next` 官方维护 + 大量生产用例 | 社区 `@automerge/automerge-codemirror` 维护活跃度低 | — |
| 服务端实现 | `y-websocket` server 官方 + Node 易集成 + Redis pub/sub 模式有现成 reference | `automerge-repo` 节点模型；服务端需自实现 storage adapter | — |
| awareness（光标 / 选区） | 一等公民（Awareness protocol 内建） | 需上层自实现 | — |
| TS 类型 | 完整 | 完整 | — |
| 包体积（浏览器） | yjs ~50KB + y-codemirror.next ~10KB | @automerge/automerge ~120KB（含 wasm）+ 绑定 | — |
| WASM 依赖 | 无（纯 JS） | 有（automerge-wasm） | — |
| 生态成熟度 | 极高（Notion / Linear / Evernote / many editors 在用） | 中（学术起源，工业用例较少） | — |
| 学习曲线 | 中（Y.Doc / Y.XmlFragment / Y.Map 概念） | 中（document / change 模型） | — |
| 与 IndexedDB 集成 | `y-indexeddb` 官方 | 需自实现 storage adapter | — |
| License | MIT | MIT | — |
| 上线时间 | P2 阶段可上线 | P2 阶段可上线，但服务端实现成本高 | P2 阶段实现前再定（推迟到 dev-plan / 实现阶段） |

### 关键事实

- **Yjs 13.6.30** 当前 stable，最近 2 个月内有更新；y-codemirror.next 0.3.x 稳定（开发分支 `@y/codemirror` 即将支持 Yjs v14）
- **Automerge 2.x** 性能比 v1 大幅提升，但 CodeMirror 绑定生态远弱于 Yjs；服务端需要更多自实现工作
- **"推迟决策"** 的风险：M-013 在 P0 阶段就要落地（F-001 多文档持久化），如果不明确同步协议设计，M-013 的存储抽象层会留下"将来如何对接 CRDT"的悬空假设，可能导致 P0 实现后需要重大重构

### Architect 初始推荐与用户决策

**Architect 初始推荐**：推迟决策（理由：F-012 是 P2，先把 P0 多文档落地，避免过早绑定）

**用户决策**：选择 Yjs（覆盖架构师推荐）

用户依据：
1. 即使 F-012 实现在 P2 阶段，M-013 的存储抽象层 / 服务端持久化模型若不按 Yjs 设计，未来引入将需要重构
2. Yjs 生态成熟度足够，y-codemirror.next 与 CodeMirror 6 (M-001 SourcePane) 天然契合
3. y-websocket server 与 Hono / Redis 集成成本可控，可与中继服务共部署

## 结论

**采用 Yjs + y-codemirror.next + y-websocket** 作为 F-012 同步协议栈，并在 P0 阶段就按 Yjs 的 Y.Doc 模型设计 M-013 的浏览器端持久化层与 E-009 YDocSnapshot 服务端持久化层。

### 实现栈

- **浏览器端**: `yjs@13.6.x` + `y-codemirror.next@0.3.x`（绑定 CodeMirror 6 SourcePane）+ `y-indexeddb`（离线优先持久化）+ `y-websocket`（client provider）
- **服务端**: y-websocket server（Hono integration 或独立 Node 进程）；awareness 经 Redis pub/sub channel `yjs:awareness:{docId}` 跨进程广播；周期 snapshot 写 SQLite/Postgres E-009 表
- **schema**: M-012 内 `yjs/sync-message-schema.ts` 定义 sync / awareness 消息 schema（Zod 4）

### Y.Doc 文档结构

```
Y.Doc (per document)
 ├─ XmlFragment "markdown"   ← y-codemirror.next 绑定 CodeMirror 6
 └─ Map         "frontmatter"
     ├─ theme:        string
     ├─ paint:        Map<string, string>
     ├─ base-color:   string
     └─ template:     string
```

### 何时应重新评估

- Yjs v14（@y/y）发布且 y-codemirror.next 完成迁移：评估升级窗口
- 服务端 awareness 中继负载超过 Redis pub/sub 单实例承受：考虑拆分专门的 awareness broker
- 移动端用户占比上升且对包体积敏感：评估 `@zod/mini` 模式 + 仅同步元数据的轻量协议

### 不采用 Automerge 2 的理由

- CodeMirror 6 绑定生态弱：`@automerge/automerge-codemirror` 维护活跃度低，文本协同质量难以与 y-codemirror.next 相比
- 服务端实现成本：awareness / storage adapter 都需自实现
- 包体积：含 wasm 后浏览器侧体积超 Yjs 2x

### 不采用"推迟决策"的理由

- M-013 在 P0 阶段就要落地（F-001 多文档持久化）；存储抽象层若不按 Yjs 设计，未来引入将需要重构
- Yjs 的 Y.Doc 模型即使在不启用同步时也能作为纯本地存储工作（`y-indexeddb` 独立可用），不会增加 P0 阶段实现成本
