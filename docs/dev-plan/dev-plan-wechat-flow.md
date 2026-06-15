---
id: "dev-plan-wechat-flow"
version: "0.5.0"
doc_type: dev-plan
split_policy: no-further-split
author: tech-lead
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data", "ui-spec-wechat-flow", "ui-spec-wechat-flow-c001-c014", "ui-spec-wechat-flow-p001-p005"]
consumers: [developer, qa-engineer]
volume: main
required_sections:
  - "## 1. 迭代规划"
  - "## 2. 依赖图"
  - "## 3. 任务卡详细"
  - "## 6. 集成与E2E测试规划"
---
# Development Plan: wechat-flow

[NAV]
- §1 迭代规划 → Sprint 0..6 总览表
- §2 依赖图 → Mermaid DAG + 关键路径
- §3 任务卡详细 → T-001..T-094 + T-095..T-106 + T-107..T-113 + T-118..T-122（见 Sprint 分卷；T-091/T-092/T-093/T-094/T-105/T-106 在 Sprint 2/4 分卷；T-118..T-122 在 Sprint 4 分卷）
- §4 Penpot 同步任务专章 → DS-001..DS-010
- §5 风险与假设
- §6 集成与E2E测试规划
[/NAV]

---

## 1. 迭代规划

### Sprint 总览

| Sprint | 主题 | 关键里程碑 | 演示路径 | 末尾 Validation |
|--------|------|------------|---------|----------------|
| Sprint 0 | 基础设施 + 设计系统建立 | Monorepo 骨架可跑 CI；Penpot Token 导入 | 无（纯工程） | T-107 |
| Sprint 1 | 三栏 UI 骨架 + 渲染管线核心 | 编辑器可输入 Markdown，右栏出现 HTML 预览 | `localhost:5173` 三栏可见 | T-108 |
| Sprint 2 | 规则集引擎 + 粘贴过滤 + 兼容性报告 + 双向高亮 | 渲染结果经规则集过滤；DiagnosticsPanel 可展开；源码↔预览双向高亮联动 | 输入含 `position:fixed` 的 Markdown，诊断面板变红；点击预览段落源码光标跳转 | T-109 |
| Sprint 3 | 主题系统 + 组件注册中心 + Palette 派生 | 五套主题热切换；P0 必含 25 种内置 Block 可插入（PRD §1.3 终态 ≥40 见 Sprint 5 T-075） | 左侧面板切换主题，预览区即时变色 | T-110 |
| Sprint 4 | 输出能力 + MCP server (24 Tool) + 图片处理 + 主题 template + CSS 内联化 | 一键复制可粘贴到公众号；MCP `render_markdown`（含 customCss 参数）与 `register_variant` Tool 可调（Block 量化指标终态见 Sprint 5 T-075）；Editor → Relay session 鉴权链路打通（T-091）；5 主题 × ≥ 1 预设 template + 9 维 CI 守护（T-092）；容器渲染缝隙补全（T-121） | 复制 HTML 粘贴到公众号编辑器视觉一致 | T-111 |
| Sprint 5 | CLI + 插件系统 + 中文排版 + 长图/封面 + 素材库 + 模板市场 + Tool 包装 + Block Phase 3 | CLI `validate` 可跑；`apply_zh_typo` 可用；长图异步导出可用；素材库上传链路打通；模板市场卡片可用；Block 累计 ≥ 40 种（T-075） | `wechat-flow validate ./my-pack` 产出报告 | T-112 |
| Sprint 6 | 质量门禁 + 视觉回归 + Skill bundle + 性能 benchmark + 装饰渲染 + 收尾 | 规则集 ≥ 42 条 fixture 全绿；Playwright 核心矩阵 + 抽样矩阵双绿；P95 键入 < 50ms / 主题切换 < 200ms benchmark 通过；Skill bundle 可被 Agent 加载 | CI 全绿；万字稿件键入 / 主题切换流畅；Skill bundle 端到端调用 | T-113 |

---

### Sprint 0 任务表（基础设施 + 设计系统）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-001 | Monorepo 骨架初始化 | chore | P0 | medium | — |
| T-002 | TypeScript + Biome + Vitest 配置 | config | P0 | small | T-001 |
| T-003 | Turborepo 任务图配置 | config | P0 | small | T-001 |
| T-004 | packages/contracts schema 契约层骨架（M-012） | feature | P0 | small | T-002 |
| T-095 | [DESIGN] Penpot — Token 导入 + 可读性验证（PS-001..PS-004） | design | P0 | medium | — |
| T-107 | [VALIDATION] Sprint 0 验证：CI 绿 + Penpot Token 可见 | validation | P0 | small | T-001,T-002,T-003,T-095 |

### Sprint 1 任务表（三栏 UI 骨架 + 渲染管线核心）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-096 | [DESIGN] Penpot — P-001 三档响应式线框稿（PS-006） | design | P0 | medium | T-095 |
| T-097 | [DESIGN] Penpot — UC-001/UC-002/UC-004/UC-005 核心组件视觉稿 | design | P0 | medium | T-095 |
| T-005 | apps/editor Vue 3.5 项目骨架 + Vue Router + Pinia | chore | P0 | small | T-002 |
| T-006 | packages/core 渲染管线骨架（parse + transform + serialize） | feature | P0 | medium | T-004 |
| T-007 | packages/core inline-style 阶段实现 | feature | P0 | medium | T-006 |
| T-008 | M-001 EditorShell 三栏布局（UC-001 TopBar + UC-002 Splitter） | feature | P0 | medium | T-005,T-097 |
| T-009 | M-001 SourcePane（CodeMirror 6 + Markdown 高亮） | feature | P0 | medium | T-008 |
| T-010 | M-001 PreviewPane（iframe 沙箱 + 视口切换） | feature | P0 | medium | T-008,T-097 |
| T-011 | M-008 composeRender use case（连接 core → PreviewPane） | feature | P0 | small | T-007,T-010 |
| T-012 | M-013 IndexedDB 本地草稿持久化（存 + 取） | feature | P0 | medium | T-005,T-004 |
| T-098 | [DESIGN] Penpot — Sprint 1 设计稿签字验证 | design | P0 | small | T-096,T-097 |
| T-108 | [VALIDATION] Sprint 1 验证：三栏布局 + 实时预览 | validation | P0 | small | T-008,T-009,T-010,T-011,T-012 |

### Sprint 2 任务表（规则集 + 粘贴过滤 + 诊断）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-099 | [DESIGN] Penpot — UC-013 DiagnosticsPanel + UC-013.1 Diff 视图视觉稿 | design | P0 | medium | T-095 |
| T-013 | packages/ruleset 规则集骨架 + 注册中心（M-003） | feature | P0 | medium | T-004 |
| T-014 | 规则集 strip 类 ≥ 10 条 + fixture（style/script/id/position 等） | feature | P0 | large | T-013 |
| T-015 | 规则集 clamp/transform/patch/lint 类 ≥ 15 条 + fixture | feature | P0 | large | T-013 |
| T-016 | M-002 sanitize 阶段（rehype-sanitize + wechatFlowSanitizeSchema） | feature | P0 | medium | T-006,T-013 |
| T-017 | M-004 粘贴过滤模拟器（simulatePaste + per-node diff） | feature | P0 | medium | T-013 |
| T-018 | M-001 DiagnosticsPanel（UC-013）+ CompatibilityDiffView（UC-013.1） | feature | P0 | medium | T-017,T-099 |
| T-019 | 底部状态栏兼容性摘要接线（M-001 → M-003 诊断流） | feature | P0 | small | T-018 |
| T-094 | 源码 ↔ 预览双向高亮联动（F-001 AC-004） | feature | P0 | medium | T-009,T-010 |
| T-052 | StatusBar 状态机与平板降级（UC-023） | feature | P0 | small | T-019 |
| T-109 | [VALIDATION] Sprint 2 验证：规则集过滤 + 诊断面板 + 双向高亮 | validation | P0 | small | T-014,T-015,T-017,T-018,T-019,T-052,T-094 |

### Sprint 3 任务表（主题系统 + 组件注册 + Palette）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-100 | [DESIGN] Penpot — UC-009 CommandPalette + UC-015 InsertDrawer + UC-016 ContextMenu 视觉稿 | design | P1 | medium | T-095 |
| T-020 | M-005 主题注册中心 + 主题守护 8+1 维校验骨架（第 9 维由 T-092 落地） | feature | P0 | medium | T-004 |
| T-021 | packages/themes default 主题（token + Block CSS） | feature | P0 | medium | T-020 |
| T-022 | packages/themes magazine/literary/business/tech 四套主题 | feature | P0 | large | T-021 |
| T-023 | M-006 调色板派生（LCH + WCAG 对比度校验） | feature | P0 | medium | T-004 |
| T-024 | packages/blocks 内置 Block ≥ 25 个（P0 必含全集，含 variant 注册） | feature | P0 | large | T-020 |
| T-025 | packages/marks 内置 Mark ≥ 11 个 | feature | P0 | medium | T-020 |
| T-026 | M-001 LeftPanelTabs（UC-006）+ ThemeCard（UC-007）+ BlockLibItem（UC-008） | feature | P0 | medium | T-020,T-021 |
| T-027 | M-001 CommandPalette（UC-009）接线 command registry | feature | P1 | medium | T-026,T-100 |
| T-114 | M-001 InsertDrawer（UC-015）+ ContextMenu（UC-016） | feature | P1 | medium | T-026,T-100 |
| T-115 | M-001 DirectiveAutocompletePopover（UC-021，CodeMirror extension 集成） | feature | P1 | medium | T-026,T-009,T-100 |
| T-029 | Frontmatter 解析：theme/paint/base-color 接线渲染管线 | feature | P0 | medium | T-022,T-023 |
| T-101 | [DESIGN] Penpot — Sprint 3 设计稿签字验证 | design | P1 | small | T-100 |
| T-110 | [VALIDATION] Sprint 3 验证：主题热切换 + Block 插入 | validation | P0 | small | T-021,T-022,T-026,T-027,T-114,T-115,T-029 |

### Sprint 4 任务表（输出能力 + MCP + 图片处理）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-102 | [DESIGN] Penpot — UC-014 JobProgressBar + P-003 主题市场 + P-004 设置页视觉稿 | design | P1 | medium | T-095 |
| T-030 | M-008 composeCopy（dual-MIME clipboard payload） | feature | P0 | small | T-011, T-017 |
| T-031 | M-008 composeExportHtml（standalone HTML 导出） | feature | P0 | small | T-011 |
| T-032 | apps/relay Hono 服务器骨架 + 健康检查端点 | chore | P1 | small | T-004 |
| T-033 | M-010 图片上传 proxy（6 类图床适配器）+ sharp 预处理 | feature | P0 | large | T-032, T-091 |
| T-034 | M-010 BullMQ job 队列 + Redis 接线 + SSE 进度推送（API-020） | feature | P1 | large | T-032 |
| T-035 | M-010 Playwright headless 渲染池（长图 + 封面） | feature | P1 | large | T-034 |
| T-036 | M-009 MCP server stdio transport + 鉴权骨架（API key scope=user） | feature | P1 | medium | T-004 |
| T-037 | M-009 render_markdown / lint_markdown / get_ruleset_version Tool 实现 | feature | P1 | medium | T-036,T-011 |
| T-038 | M-009 list_themes / describe_theme / list_blocks / describe_block Tool | feature | P1 | medium | T-036,T-020 |
| T-039 | M-009 export_long_image / export_cover / get_job / upload_image Tool | feature | P0 | medium | T-036,T-034,T-035 |
| T-040 | M-001 UC-014 JobProgressBar + Toast（UC-011）接线 SSE 进度 | feature | P0 | medium | T-034,T-102 |
| T-041 | P-003 主题市场页面（/themes 路由） | feature | P0 | medium | T-022,T-005,T-092,T-102 |
| T-042 | P-004 设置页（/settings 路由）— 图床配置 + API 密钥分组 | feature | P0 | medium | T-005,T-033,T-102 |
| T-093 | UC-018 编辑器内上传 UI 接线（拖拽/粘贴/进度/重试） | feature | P0 | medium | T-033,T-091,T-106 |
| T-091 | M-010 Editor Session JWT 颁发与续期端点（API-032） | feature | P0 | medium | T-032 |
| T-092 | 主题预设 template 内容产出 + 9 维守护实现 | feature | P0 | large | T-022, T-024 |
| T-105 | [DESIGN] P-003 主题模板市场 Penpot 设计（含 ≥ 5 张 (主题, template) 组合卡片缩略图） | design | P1 | medium | T-095 |
| T-106 | [DESIGN] 6 个新组件 Penpot 设计（UC-017 ~ UC-022） | design | P1 | medium | T-095 |
| T-111 | [VALIDATION] Sprint 4 验证：复制 HTML + 长图导出 + MCP render_markdown + template 市场缩略图 + 上传 UI | validation | P0 | small | T-030,T-031,T-035,T-037,T-042,T-091,T-092,T-093 |
| T-118 | M-012 contracts schema 演进（customCss + registerVariant + themeBlocks variant 维度） | feature | P0 | medium | T-004 |
| T-119 | M-005 registerVariant / getBlockBaseStyle + blocks defineBlock base-style 携带 | feature | P0 | medium | T-118,T-020 |
| T-120 | pipeline/inline-style.ts 分层合成 + pipeline/custom-css.ts juice pass | feature | P0 | large | T-118,T-119,T-007 |
| T-121 | pipeline/transform.ts containerDirective/leafDirective 展开（容器渲染缝隙） | feature | P0 | medium | T-119,T-120 |
| T-122 | M-009 register_variant Tool 实现 + router 注册（API-034） | feature | P0 | small | T-118,T-119,T-036 |

### Sprint 5 任务表（CLI + 插件系统 + 中文排版 + 素材库 + 模板市场 + MCP Tool 包装）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-103 | [DESIGN] Penpot — P-005 移动端只读预览视觉稿（PS-009） | design | P2 | small | T-095 |
| T-043 | packages/zh-typo 中文排版 4 类规则（M-008 依赖包） | feature | P1 | medium | T-006 |
| T-044 | M-008 composeApplyZhTypo use case + diff 预览 | feature | P1 | medium | T-043 |
| T-045 | M-009 apply_zh_typo Tool 实现 | feature | P1 | small | T-036,T-044 |
| T-046 | M-001 中文排版修订 UI（diff 预览 Modal + ContextMenu 接线） | feature | P1 | medium | T-044,T-027 |
| T-047 | M-007 插件沙箱 Worker 骨架（Comlink RPC + 网络门禁 + `assertNetIsolation`） | feature | P1 | large | T-004 |
| T-048 | M-007 plugin-api surface（defineBlock/defineVariant/defineRule/defineTheme） | feature | P1 | medium | T-047,T-020 |
| T-049 | M-005 品牌包锁定（delta-merge + brand-pack lock） | feature | P2 | medium | T-020 |
| T-116 | apps/cli 核心命令 init + validate（M-011） | feature | P1 | medium | T-047,T-048 |
| T-117 | apps/cli 渲染壳命令 dev/publish/render/copy/export（M-011，thin wrapper） | feature | P2 | medium | T-116,T-011,T-031,T-030 |
| T-051 | M-009 HTTP/SSE transport + admin API key 管理端点（API-028..API-031） | feature | P1 | medium | T-036 |
| T-055 | P-005 移动端只读预览（/preview/:docId + 底部固定栏 + Clipboard 降级） | feature | P2 | medium | T-005,T-010,T-103 |
| T-073 | /themes 模板市场增强（卡片筛选 + seed 扩展，不新增路由） | feature | P1 | medium | T-041,T-092 |
| T-074 | packages/blocks Block 补全 Phase 2（P1 必含 5 种：作者卡/刊物骨架/KPI 数据卡/问答/脚注） | feature | P1 | medium | T-024 |
| T-077 | M-010 wechat-asset uploader.ts + BullMQ kind `wechat-asset-upload` | feature | P1 | medium | T-033,T-042,T-091 |
| T-078 | M-008 composeUploadWechatAsset use case | feature | P1 | small | T-031,T-077 |
| T-079 | M-009 upload_to_wechat_asset Tool（thin wrapper → T-078） | feature | P1 | small | T-077,T-036 |
| T-080 | M-009 list_tokens / describe_token Tool（thin wrapper → M-005） | feature | P1 | small | T-020,T-036 |
| T-081 | M-009 list_block_variants / describe_variant Tool（thin wrapper → M-005） | feature | P1 | small | T-024,T-036 |
| T-082 | M-009 derive_palette Tool（thin wrapper → M-006） | feature | P1 | small | T-023,T-036 |
| T-083 | M-009 simulate_paste Tool（thin wrapper → M-004） | feature | P1 | small | T-017,T-036 |
| T-084 | M-009 export_clipboard_payload Tool（thin wrapper → M-008 composeCopy） | feature | P1 | small | T-030,T-036 |
| T-075 | packages/blocks Block 补全 Phase 3（P1 增量 10 种） | feature | P1 | medium | T-074 |
| T-112 | [VALIDATION] Sprint 5 验证：CLI validate + apply_zh_typo + 插件沙箱 + 素材库上传 + 模板市场 + Tool 全集 | validation | P1 | small | T-044,T-046,T-116,T-117,T-051,T-073,T-074,T-075,T-077,T-079,T-080,T-081,T-082,T-083,T-084 |

### Sprint 6 任务表（质量门禁 + 视觉回归 + Skill bundle + 性能 benchmark + 装饰渲染 + 收尾）

| 任务 ID | 任务名 | task_kind | 优先级 | 复杂度 | 依赖 |
|---------|--------|-----------|--------|--------|------|
| T-104 | [DESIGN] Penpot — UC-013 诊断密度测试（PS-007） + 移动端拇指热区（PS-009） | design | P2 | small | T-095 |
| T-056 | 规则集补全至 ≥ 42 条（补 strip+clamp+transform 分类空缺） | feature | P0 | large | T-015 |
| T-057 | E2E fixture：典型 Markdown → 最终 HTML 端到端验证（F-011 AC-001） | feature | P0 | medium | T-056 |
| T-058 | Playwright 视觉回归核心矩阵 + 全量 variant 抽样（动态枚举 + pixelmatch ≤ 0.05） | feature | P0 | large | T-022,T-024,T-025,T-074,T-075,T-121 |
| T-059 | WCAG 对比度自动校验 + 主题守护 9 维完整实现（F-011 AC-003 + AC-009） | feature | P0 | medium | T-020,T-092 |
| T-060 | 已知 Bug 补丁库热加载（F-011 AC-005，patch-loader） | feature | P1 | medium | T-013 |
| T-061 | 可读性检查（颜色对比度 + 字号下限 + 段长，F-011 AC-006） | feature | P1 | medium | T-018 |
| T-062 | CI 任务图完整配置（lint → typecheck → unit-test → ruleset-fixture → cross-runtime → theme-guard → visual-regression） | chore | P0 | medium | T-057,T-058,T-059 |
| T-063 | cross-runtime 一致性测试（Node/Worker/Edge/Browser-main SHA-256 字节级一致 — 四 target） | feature | P0 | medium | T-006,T-007,T-058 |
| T-064 | 多文档管理 + 自动备份完善（UC-006 Tab 3 + P-002 文档列表） | feature | P0 | medium | T-012,T-026 |
| T-066 | 撤销/重做 + 查找/替换 + 字数统计（F-001 AC-006） | feature | P0 | medium | T-009 |
| T-067 | 输入辅助：中英文自动加空格 + 智能引号（F-001 AC-007） | feature | P1 | small | T-009 |
| T-068 | 夜间模式风险预警（F-002 AC-003/AC-004） | feature | P1 | medium | T-018 |
| T-069 | P-004 设置页 — 编辑器偏好分组（字体/行高/辅助开关） | feature | P1 | small | T-042 |
| T-070 | 版本三元组透传 + 确定性渲染验证（F-013 AC-001） | feature | P0 | small | T-007,T-037 |
| T-071 | MCP server 冷启动性能优化（P95 < 800ms，F-013 AC-006） | feature | P1 | medium | T-037 |
| T-072 | Public Tool Schema deprecation window 工具（F-013 AC-005） | feature | P1 | small | T-004 |
| T-085 | `skill/` Skill bundle（SKILL.md + prompts + resources，编排 24 个 Tool 调用顺序） | feature | P1 | medium | T-079,T-080,T-081,T-082,T-083,T-084,T-092,T-122 |
| T-086 | 编辑器性能 benchmark（万字键入 P95 < 50ms / 主题切换 P95 < 200ms） | feature | P0 | medium | T-009,T-026,T-029 |
| T-087 | 主题装饰资产 + `{{tokenId}}` SVG 注入 + 上下文敏感渲染（F-003 AC-008/AC-009） | feature | P1 | medium | T-021,T-022 |
| T-088 | 编辑器 paint drawer + color picker 双向绑定 frontmatter（F-003 AC-010） | feature | P1 | medium | T-029,T-042 |
| T-089 | packages/ruleset 关键词 lint 规则 + 可热更新词库（F-011 AC-007） | feature | P1 | medium | T-013 |
| T-090 | 实地验证辅助脚本 + EVENT-LOG 回写（F-011 AC-008） | feature | P1 | small | T-057 |
| T-113 | [VALIDATION] Sprint 6 验证：CI 全绿 + 视觉回归矩阵 + 性能基线 + Skill bundle 端到端 | validation | P0 | small | T-056,T-057,T-058,T-059,T-062,T-063,T-075,T-085,T-086,T-087,T-088 |

---

## 2. 依赖图

```mermaid
graph LR
    T-001 --> T-002
    T-001 --> T-003
    T-002 --> T-004
    T-002 --> T-005
    T-004 --> T-006
    T-006 --> T-007
    T-007 --> T-011
    T-005 --> T-008
    T-008 --> T-009
    T-008 --> T-010
    T-010 --> T-011
    T-011 --> T-030
    T-017 --> T-030
    T-011 --> T-031
    T-005 --> T-012
    T-004 --> T-012
    T-004 --> T-013
    T-013 --> T-014
    T-013 --> T-015
    T-006 --> T-016
    T-013 --> T-016
    T-013 --> T-017
    T-017 --> T-018
    T-018 --> T-019
    T-004 --> T-020
    T-020 --> T-021
    T-021 --> T-022
    T-004 --> T-023
    T-020 --> T-024
    T-020 --> T-025
    T-020 --> T-026
    T-021 --> T-026
    T-026 --> T-027
    T-026 --> T-114
    T-026 --> T-115
    T-009 --> T-115
    T-022 --> T-029
    T-023 --> T-029
    T-004 --> T-032
    T-032 --> T-033
    T-032 --> T-034
    T-032 --> T-091
    T-091 --> T-033
    T-091 --> T-077
    T-034 --> T-035
    T-004 --> T-036
    T-036 --> T-037
    T-011 --> T-037
    T-036 --> T-038
    T-020 --> T-038
    T-036 --> T-039
    T-034 --> T-039
    T-035 --> T-039
    T-034 --> T-040
    T-022 --> T-041
    T-022 --> T-092
    T-024 --> T-092
    T-092 --> T-041
    T-005 --> T-041
    T-033 --> T-093
    T-091 --> T-093
    T-106 --> T-093
    T-005 --> T-042
    T-033 --> T-042
    T-006 --> T-043
    T-043 --> T-044
    T-036 --> T-045
    T-044 --> T-045
    T-044 --> T-046
    T-027 --> T-046
    T-004 --> T-047
    T-047 --> T-048
    T-020 --> T-048
    T-020 --> T-049
    T-047 --> T-116
    T-048 --> T-116
    T-116 --> T-117
    T-011 --> T-117
    T-031 --> T-117
    T-030 --> T-117
    T-036 --> T-051
    T-005 --> T-055
    T-010 --> T-055
    T-015 --> T-056
    T-056 --> T-057
    T-009 --> T-094
    T-010 --> T-094
    T-019 --> T-052
    T-024 --> T-074
    T-074 --> T-075
    T-033 --> T-077
    T-042 --> T-077
    T-031 --> T-078
    T-077 --> T-078
    T-077 --> T-079
    T-036 --> T-079
    T-020 --> T-080
    T-036 --> T-080
    T-024 --> T-081
    T-036 --> T-081
    T-023 --> T-082
    T-036 --> T-082
    T-017 --> T-083
    T-036 --> T-083
    T-030 --> T-084
    T-036 --> T-084
    T-041 --> T-073
    T-092 --> T-073
    T-093 --> T-111
    T-022 --> T-058
    T-024 --> T-058
    T-025 --> T-058
    T-074 --> T-058
    T-075 --> T-058
    T-020 --> T-059
    T-013 --> T-060
    T-018 --> T-061
    T-057 --> T-062
    T-058 --> T-062
    T-059 --> T-062
    T-006 --> T-063
    T-007 --> T-063
    T-058 --> T-063
    T-012 --> T-064
    T-026 --> T-064
    T-009 --> T-066
    T-009 --> T-067
    T-018 --> T-068
    T-042 --> T-069
    T-007 --> T-070
    T-037 --> T-070
    T-037 --> T-071
    T-004 --> T-072
    T-079 --> T-085
    T-080 --> T-085
    T-081 --> T-085
    T-082 --> T-085
    T-083 --> T-085
    T-084 --> T-085
    T-009 --> T-086
    T-026 --> T-086
    T-029 --> T-086
    T-021 --> T-087
    T-022 --> T-087
    T-029 --> T-088
    T-042 --> T-088
    T-013 --> T-089
    T-057 --> T-090
    T-004 --> T-118
    T-118 --> T-119
    T-020 --> T-119
    T-118 --> T-120
    T-119 --> T-120
    T-007 --> T-120
    T-119 --> T-121
    T-120 --> T-121
    T-118 --> T-122
    T-119 --> T-122
    T-036 --> T-122
    T-122 --> T-085
    T-121 --> T-058

    style T-001 fill:#f96,stroke:#333,stroke-width:2px
    style T-004 fill:#f96,stroke:#333,stroke-width:2px
    style T-006 fill:#f96,stroke:#333,stroke-width:2px
    style T-007 fill:#f96,stroke:#333,stroke-width:2px
    style T-011 fill:#f96,stroke:#333,stroke-width:2px
    style T-013 fill:#f96,stroke:#333,stroke-width:2px
    style T-020 fill:#f96,stroke:#333,stroke-width:2px
    style T-056 fill:#f96,stroke:#333,stroke-width:2px
    style T-057 fill:#f96,stroke:#333,stroke-width:2px
    style T-062 fill:#f96,stroke:#333,stroke-width:2px
```

**关键路径**（权重最重链路）：

`T-001 → T-002 → T-004 → T-006 → T-007 → T-011 → T-037 → T-070`（渲染核心 + MCP 确定性链路）

`T-013 → T-014 → T-015 → T-056 → T-057 → T-062`（规则集 + 质量门禁链路）

`T-020 → T-021 → T-022 → T-058 → T-062`（主题系统 + 视觉回归链路）

`T-013 → T-017 → T-030`（粘贴模拟必经复制链路；XDOC-017）

`T-022 → T-092 → T-041`（主题 template 市场依赖链路：template 内容 + 守护先于市场页面可用）

`T-004 → T-118 → T-119 → T-120 → T-121 → T-058`（CSS 内联化 + 容器渲染缝隙链路：contracts 契约咽喉→variant 注册→分层合成→容器展开→视觉回归）

**Block 终态分段编排**：内置 Block 库分三段交付，门禁与 P0/P1 分级一致，避免 P1 任务阻塞 P0 出口：

- 第一段 `T-024 (S3, P0)`：≥ 25 个 P0 必含 Block + variant 注册，作为 P0 视觉回归基线（T-058 依赖此段）；S3 出口门禁锁定 P0 全集
- 第二段 `T-074 (S5, P1)`：P1 必含 5 种 Block 增量，与 P0 链路解耦，不进入 S3 出口门禁
- 第三段 `T-075 (S5, P1)`：P1 增量 10 种 Block，前移至 S5 与第二段并行，共同纳入 S5 出口门禁

依赖链 `T-024 → T-074 → T-075` 仅声明数据增量顺序（共享同一 Block 注册中心 schema），不构成 P0→P1 的关键路径反向阻塞；T-058 视觉回归矩阵在 S6 才统一覆盖三段全集。

---

## 3. 任务卡详细

本 dev-plan 共 **106 任务卡**（87 code + 12 design + 7 validation）。任务编号 `T-053` / `T-054` / `T-065` / `T-076` 为预留编号（当前未占用）。

任务卡体量超过 `DOC_SPLIT_THRESHOLD_LINES`，按 Sprint 拆分为独立分卷存放：

| 分卷文件 | 覆盖任务 |
|---------|---------|
| `dev-plan-wechat-flow-s0.md` | Sprint 0: T-001..T-004, T-095, T-107 |
| `dev-plan-wechat-flow-s1.md` | Sprint 1: T-005..T-012, T-096..T-098, T-108 |
| `dev-plan-wechat-flow-s2.md` | Sprint 2: T-013..T-019, T-052, T-094, T-099, T-109 |
| `dev-plan-wechat-flow-s3.md` | Sprint 3: T-020..T-027, T-114, T-115, T-029, T-100..T-101, T-110 |
| `dev-plan-wechat-flow-s4.md` | Sprint 4: T-030..T-042, T-091, T-092, T-093, T-102, T-105, T-106, T-111, T-118..T-122 |
| `dev-plan-wechat-flow-s5.md` | Sprint 5: T-043..T-049, T-116, T-117, T-051, T-055, T-073, T-074, T-075, T-077..T-084, T-103, T-112 |
| `dev-plan-wechat-flow-s6.md` | Sprint 6: T-056..T-064, T-066..T-072, T-085..T-090, T-104, T-113 |

---

## 4. Penpot 同步任务专章

本章将 `ui-spec-wechat-flow#§7` PS-001..PS-010 转化为具体 design 任务卡，与 §3 任务卡编号对应，便于设计 sign-off 跟踪。

| design 任务 | 对应 PS 编号 | 优先级 | 交付物 | Sprint |
|-------------|-------------|--------|--------|--------|
| T-095 | PS-001 + PS-002 + PS-003 + PS-004 | P0 | Penpot 色彩可读性验证截图 + 全部 CSS Token 迁入 Penpot 变量组 | Sprint 0 |
| T-096 | PS-006 | P0 | P-001 三档响应式线框稿（桌面/平板/移动对比图）| Sprint 1 |
| T-097 | — | P0 | UC-001 TopBar / UC-002 Splitter / UC-004 SourcePane / UC-005 PreviewPane 视觉稿 + 状态变体 | Sprint 1 |
| T-098 | — | P0 | Sprint 1 设计稿签字：开发者目视检查 + Penpot MCP `find_shape` 可检索 | Sprint 1 |
| T-099 | — | P0 | UC-013 DiagnosticsPanel + UC-013.1 CompatibilityDiffView 视觉稿（含 3 色级别展示）| Sprint 2 |
| T-100 | PS-005 | P1 | UC-009 CommandPalette（6 状态原型）+ UC-015 InsertDrawer + UC-016 ContextMenu 视觉稿 | Sprint 3 |
| T-101 | — | P1 | Sprint 3 设计稿签字 | Sprint 3 |
| T-102 | — | P1 | UC-014 JobProgressBar + P-003 主题市场初版网格布局 + P-004 设置页视觉稿（P-003 完整三档由 T-105 交付） | Sprint 4 |
| T-103 | PS-009 | P2 | P-005 移动端只读预览视觉稿 + 拇指热区可达性验证 | Sprint 5 |
| T-104 | PS-007 + PS-008 | P2 | UC-013 诊断密度视觉测试 + 暗色主题 Token 映射草稿 | Sprint 6 |
| T-105 | — | P1 | P-003 主题模板市场三档响应式视觉稿 + ≥ 5 张 (主题, template) 组合卡片缩略图 | Sprint 4 |
| T-106 | — | P1 | UC-017 ~ UC-022 共 6 个新组件视觉规格（含状态变体 + Token 接线） | Sprint 4 |

### design 任务通用验收标准

所有 design 任务的 `acceptance_criteria` 包含以下 4 条共同要求（各任务可追加特定条目）：

1. Penpot 项目内已建立对应组件/页面的设计稿，命名遵循 `C-{NNN}` / `P-{NNN}` / `Token-{group}` 模式
2. 通过 Penpot MCP `find_shape` 工具从代码侧可检索到该设计稿
3. 开发者目视检查通过：视觉调性、Token 应用、状态变体均符合 `ui-spec-wechat-flow#§对应章节`
4. 签字记录写入 Penpot 页面注释或 `docs/EVENT-LOG.jsonl`（`phase=development, event=design_signoff`）

---

## 5. 风险与假设

### 5.1 技术风险

| 风险编号 | 风险描述 | 影响 Sprint | 影响等级 | 缓解措施 |
|---------|---------|------------|---------|---------|
| R-001 | Vue 3.5 Vapor Mode 与 CodeMirror 6 集成兼容性未经实测 | Sprint 1 | HIGH | T-009 前用 PoC 验证 `@codemirror/view` 与 Vapor 模式的 DOM 操作兼容性；若不兼容退回标准 Vue 渲染模式，Vapor 为可选优化 |
| R-002 | 微信公众号编辑器粘贴过滤行为具有客户端版本差异，fixture 难以穷举 | Sprint 2 + Sprint 6 | HIGH | 优先建立 42 条基线；T-090 实地验证辅助脚本周期性扩充 fixture，结果回写 EVENT-LOG |
| R-003 | BullMQ + Redis 在自托管场景下增加运维复杂度 | Sprint 4 | MEDIUM | deploy-spec 阶段提供 Docker Compose 单键启动方案；长图导出与素材库上传共用同一队列 |
| R-004 | Playwright 视觉回归矩阵在 CI 环境的执行成本（5 主题 × 40 Block × 平均 variant）| Sprint 6 | MEDIUM | 核心矩阵每 PR 必跑（pixelmatch ≤ 0.05）；variant 全量矩阵在 PR 抽样、夜间 scheduled job 跑全量；Turborepo 远程缓存跳过未变更包的截图 |
| R-005 | `@zod/mini` 在浏览器 bundle 与 Node 端 Zod 4.x 完整版并存可能导致类型版本不一致 | Sprint 0 | MEDIUM | T-004 阶段统一 contracts 包仅导出 Zod 4.x 完整版 schema；`@zod/mini` 仅在构建时按目标包按需切换，不在 contracts 包内混用 |
| R-006 | Penpot MCP 工具在 Windows 开发环境下的可用性未经验证 | Sprint 0 | LOW | T-095 开始前运行 Penpot MCP `high_level_overview` 验证工具链；如不可用改用 Penpot SaaS Web UI 手动操作 |
| R-007 | MCP Tool thin wrapper 与 use case 业务逻辑可能在 implementer 阶段产生 duplicate 实现（参 XDOC-010）| Sprint 5 | MEDIUM | T-079/T-080..T-084 任务卡显式标注「Tool 层 thin wrapper，禁止持有业务逻辑」；code-review duplication 维度命中即 REFACTOR |
| R-008 | F-012 整族（云端同步 / 版本历史 / 多人协作）AC 全部 `[ARCH 预留 / v1 不验收]`，API-026/027 接口存在但 dev-plan 无 `listSnapshots` / `restoreVersion` UI 与 CLI 任务 | （N/A，v1 不交付）| LOW | F-012 全族 deferred 到 v2；激活时由 tech-lead 在 Sprint 7+ 新增「F-012 协作能力」子计划（含历史面板 UI、Tool 包装、CLI rollback 命令），与 API-026/027 接口对齐 |
| R-009 | 主题预设 template 内容产出工作量风险：5 主题 × ≥ 1 template，每份须覆盖 9 基础元素 + ≥ 6 核心 Block 容器，内容产出依赖主题作者协助；若延期阻塞 Sprint 4 主题市场落地 | Sprint 4 | MEDIUM | T-092 与 T-022 / T-024 解耦推进；先用占位 template 跑通守护链路（AC-004/AC-005），正式内容由主题作者后补；`validateThemeTemplates` 缺失元素报告可精准定位缺口 |

### 5.2 ui-spec 残留假设处理策略

`ui-spec-wechat-flow#§6` 记录了 12 条 `[ASSUMPTION]`，本 dev-plan 阶段对各条的处理如下：

| 假设编号 | 假设内容摘要 | dev-plan 处理 |
|---------|------------|--------------|
| A-001 | 无用户登录账号体系，API 密钥本地加密存储 | 纳入 T-042（P-004 设置页 API 密钥分组）实现范围；本地加密存储由 M-013 IndexedDB 实现 |
| A-002 | 左侧面板宽度持久化到 IndexedDB | 纳入 T-012（IndexedDB 持久化）AC 中明确 Splitter 宽度持久化 |
| A-003 | macOS 下 Cmd+K，Windows/Linux 下 Ctrl+K | T-027 CommandPalette 实现时通过 `navigator.platform` 检测，不需要额外任务 |
| A-004 | 平板抽屉打开时半透明 Overlay | 纳入 T-008 EditorShell 布局实现范围，按 `rgba(28,25,23,0.3)` 实现 |
| A-005 | 移动端 Clipboard API 不支持时降级为选中全文 | 纳入 T-055 P-005 实现范围，配套 UC-011 Toast 提示 |
| A-006 | 底部状态栏兼容性颜色策略 | 纳入 T-019（底部状态栏接线）AC 中明确三色阈值 |
| A-007 | 专注模式 F11 隐藏左右栏，顶栏保留最小版 | 纳入 T-008 EditorShell 实现范围 |
| A-008 | 主题切换 250ms 渐变 | 纳入 T-026 LeftPanelTabs 接线 T-029 Frontmatter 时确认 CSS transition |
| A-009 | 右侧预览默认 375px 视口 | T-010 PreviewPane 默认 `viewport='375'` |
| A-010 | DiagnosticsPanel 默认折叠，有 error 时自动展开 | 纳入 T-018 DiagnosticsPanel AC |
| A-011 | LXGW WenKai 字体通过 Web Font CDN 加载 | 纳入 T-005 Vue 骨架初始化的 `index.html` font-face 配置 |
| A-012 | 同步状态指示器位于预览面板右下角 | 纳入 T-010 PreviewPane 实现范围 |

### 5.3 架构残留假设

| 假设 | 来源 | dev-plan 处置 |
|------|------|--------------|
| 规则集总数最终以 42 条为门槛（可超过） | arch-wechat-flow-modules#§2.M-003 | T-014 + T-015 + T-056 分三 Sprint 实现 |
| SQLite 作为服务端首选，Postgres 为横扩备选 | arch-wechat-flow#§1.4 | deploy-spec 阶段终定；T-032 relay 骨架用 libsql，接口保持 adapter 形式 |
| 浏览器主线程纳入跨运行时矩阵 | arch-wechat-flow#§5.2 / §7.3 | T-063 增第四 target（Vitest browser mode 或 Playwright `page.evaluate`）跑与 node/worker/edge 同 fixture 的 SHA-256 一致性 |

---

## 6. 集成与E2E测试规划

| Sprint | 测试类型 | 覆盖场景 | 依赖任务 | 测试范围描述 |
|--------|----------|----------|---------|-------------|
| Sprint 1 | Integration | M-008 use case → M-002 管线 → PreviewPane 渲染 | T-011 | 输入 Markdown 字符串，断言 PreviewPane iframe 内 HTML 含预期结构 |
| Sprint 2 | Integration | M-003 规则集 → M-004 粘贴模拟 → M-001 DiagnosticsPanel | T-017, T-018 | 含 `position:fixed` 的 HTML 经过滤后 DiagnosticsPanel 显示 error 级别诊断 |
| Sprint 2 | Ruleset Fixture | 每条规则 input.html / expected.html CI 验证 | T-014, T-015 | hast → hast 规则级 fixture 100% 通过 |
| Sprint 3 | Integration | 主题热切换 → M-002 重跑后段管线 → PreviewPane 视觉更新 | T-029 | 切换 default → magazine，断言 PreviewPane 内颜色 token 值变化 |
| Sprint 4 | Integration | M-008 composeCopy → Clipboard API → dual-MIME payload | T-030 | 模拟用户手势，调用 composeCopy，断言 clipboard 含 `text/html` + `text/plain` |
| Sprint 4 | Integration | M-009 MCP render_markdown → M-008 → M-002 → 版本三元组 | T-037, T-070 | stdio transport 发送 render_markdown，断言响应含 `html` + `rulesetVersion` + `themeVersion` |
| Sprint 5 | Integration | CLI validate → M-007 manifest 校验 → M-005 主题守护 | T-116 | 对合规 pack 跑 validate，退出码 0；对缺 manifest 的 pack，退出码非 0 + 错误描述 |
| Sprint 6 | E2E | 写作者完整流程：新建文档 → 输入 Markdown → 主题切换 → 复制 HTML | T-030, T-064, T-094 | Playwright 脚本模拟用户操作，断言复制后 clipboard HTML 经 simulatePaste 后视觉与本地预览 pixelmatch 比对 ≤ 0.05 |
| Sprint 6 | Visual Regression — 核心矩阵 | 5 套内置主题 × 8 类 P0 场景 + ≥ 8 综合场景 | T-058 | 每个 PR 必跑；pixelmatch ratio ≤ 0.05 |
| Sprint 6 | Visual Regression — 全量 variant | 5 主题 × `listBlocks()` × `describeBlock(b).variants` 动态枚举 | T-058 | PR 抽样比例由 ruleset 配置；夜间 scheduled job 跑全量 |
| Sprint 6 | Cross-Runtime | 浏览器主线程 / Node / Worker / Edge 四 target 同输入 SHA-256 一致 | T-063 | `tests/cross-runtime/` 在四 target 各运行渲染 pipeline，比对 `sha256(html)` 相同 |
| Sprint 6 | Performance Benchmark | 万字键入 P95 < 50ms / 主题切换 P95 < 200ms / MCP 冷启动 < 800ms | T-086, T-071 | `tests/perf/` 输入 10000 字 Markdown 跑 benchmark；CI 超阈值 fail |
| Sprint 6 | Skill Bundle E2E | Agent 加载 SKILL.md 后端到端调用 list_themes → describe_block → render_markdown → simulate_paste → upload_to_wechat_asset | T-085 | mock 微信开放平台 API，断言完整链路无异常并返回 inline HTML |
