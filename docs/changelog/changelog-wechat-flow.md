---
id: "changelog-wechat-flow"
doc_type: changelog
author: devops
status: draft
deps: []
consumers: [all]
---
# Changelog: wechat-flow

## [Unreleased]
### Changed
- `@wechat-flow/core` 与 `@wechat-flow/mcp-server` 版本 `0.0.0` → `0.1.0`（SemVer 0.x 破坏性变更走 minor）
- MCP `simulate_paste` 语义由「模拟粘贴过滤」改为「诊断平台输出规则命中」：响应体由 `{ filteredHtml, diffNodes, droppedAttrs }` 改为 `{ patchedHtml, changes, filteredHtml }`（`filteredHtml` 为 `patchedHtml` 的过渡别名）
- MCP `render_markdown` 响应删除 `postPaste` 字段，改带 `report: { nodeChangeRecords, nightRiskIssues }`；被输出规则剥除的声明（含 customCss `font-family`）以 warn 诊断在 `diagnostics` 中对调用方可见
- 复制三路（editor `composeCopy` / CLI `copy` / MCP `export_clipboard_payload`）改指向 `render()` 产物，不再经模拟器过滤——渲染期输出规则已保证产物平台安全
- `metrics` 指标 `paste_simulation_diff_ratio` 重定为 `fallback_platform_patch_hits`（输出规则命中数/次调用）
- MCP 全 24 工具补齐 `description`

### Removed
- **Breaking（`@wechat-flow/core` 对外 API）**：删除导出 `simulatePaste` / `SimulatePasteResult` / `NodeDiff` / `DroppedAttr`
- `RenderResult.postPaste` 字段删除
- 独立模拟器实现（`simulate-paste.ts` / `simulator/*` / `diff/per-node-diff.ts`）——平台过滤统一复用 output 域 ruleset 作为幂等 patch 层

## [0.1.0] - 2026-07-02
### Added
- Editor SPA（Vue 3.5 三栏布局、CodeMirror 6 源码面板、iframe 沙箱预览）[F-001]
- 渲染管线核心：parse → transform → inline-style → sanitize → serialize 五段管线，确定性字节级一致输出（Node / Web Worker / Edge / 浏览器主线程四运行时一致）[F-004][F-010]
- 过滤规则集引擎，≥ 42 条微信公众号编辑器兼容规则 + fixture 回归 [F-002]
- 5 套内置主题（default / magazine / literary / business / tech），9 维静态守护 [F-011]
- ≥ 25 个内置 Block 组件 + ≥ 11 个内置 Mark 组件
- 主题市场页面（/themes）、设置页（/settings）、移动端只读预览（/preview/:docId）
- 中文排版修订（zh-typo，4 类规则）、调色板派生（LCH + WCAG 对比度校验）[F-014][F-006]
- 第三方插件沙箱（Web Worker + Comlink RPC，网络访问白名单隔离）[F-010]
- Relay 中继服务：图片上传（本地 / 七牛 / OSS / COS / SM.MS / 自定义六类图床适配器）、微信素材库上传代理、长图与封面 Headless 渲染（BullMQ + Playwright Chromium）、Editor Session JWT 鉴权（API-032）、Admin API key 管理端点
- MCP server：stdio + HTTP/SSE 双 transport，16+ Tool（render_markdown / lint_markdown / list_themes / describe_theme / list_blocks / describe_block / list_marks / describe_mark / list_tokens / describe_token / list_block_variants / describe_variant / derive_palette / apply_zh_typo / simulate_paste / export_clipboard_payload / export_long_image / export_cover / get_job / get_ruleset_version / upload_to_wechat_asset / upload_image / describe_template / register_variant）[F-013]
- CLI（`wechat-flow init/dev/validate/publish` + 渲染壳命令）
- Skill bundle（`skill/SKILL.md` + prompts + resources，供 LLM Agent 框架加载）
- Playwright 视觉回归矩阵（核心 + 全量 variant 抽样动态枚举，跨浏览器像素差异 ≤ 5% 门禁）[F-011]
- 跨运行时一致性测试矩阵（node / worker / edge / browser-main 四 target SHA-256 字节级比对）
- CI 六 job（quality-gate / cross-runtime / guards / visual-core / visual-sampled / perf）+ 密钥扫描（gitleaks 全历史 + secretlint 增量）

### Changed
- 无（首个版本）

### Fixed
- 图床上传预处理压缩目标 ≤ 2.5MB（quality-ladder 降级 + 宽度阶梯降级，best-effort 触底不 throw）[F-006 AC-002b]
- 桌面 / 移动文档列表面板补齐 error 态（加载失败 + 重试文字链接闭环）[P-002]

### Known Gaps（非本版本阻塞项，见 deploy-spec §7）
- MCP HTTP/SSE 容器化部署下，`startHttpTransport()` 默认使用占位 `JobsClient`，`export_long_image` / `export_cover` / `upload_to_wechat_asset` 等异步任务类 Tool 返回 `E_NOT_IMPLEMENTED`，需注入生产 `JobsClient` 实现后启用
- `@wechat-flow/mcp-server` 尚无 `bin` 入口，`npx @wechat-flow/mcp-server`（stdio 本地嵌入分发路径）暂不可用；HTTP/SSE 容器化路径不受影响
- npm 包（`@wechat-flow/core` 等 13 个 workspace 包）当前以 TypeScript 源码形式发布（无预编译 `dist/`），消费方需自行 transpile
- SQLite/libsql 服务端持久化尚未接线（Admin API key 等实体现为进程内 `Map` 占位），随后续 sprint 激活
- 真实公众号编辑器粘贴回归（PRD §3.5 发布前周期验证层级）尚未针对本版本执行，release tag 推送前需人工完成
