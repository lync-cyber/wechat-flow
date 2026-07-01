---
name: wechat-flow
description: >
  把已经写好的 Markdown 排版渲染成微信公众号可直接粘贴的 inline-styled HTML 并发布——
  通过 wechat-flow 的 MCP tool 编排：推荐/切换内置主题、渲染排版、注册 variant 皮肤、
  生成 callout、模拟微信粘贴过滤、导出长图/封面、上传微信素材库。当用户想把 Markdown
  排版成公众号推文、给公众号文章配主题皮肤或 callout/variant、检查粘贴到微信编辑器后会
  掉哪些样式、导出公众号长图或封面、或上传图文到微信素材库时使用本 skill，即使没明说
  "用工具"或"MCP"。本 skill 负责排版与发布编排，不负责代写文章内容，也不用于 Notion /
  邮件模板 / 小程序 / 网页前端等非微信公众号场景。
version: 0.0.0
---

# wechat-flow Skill

## 概述

本 skill 把 wechat-flow 的 24 个 MCP tool 编排成面向公众号写作的语义级任务：写作初稿、
排版渲染、variant 皮肤注册、粘贴模拟过滤、素材库上传。

完整 24 个 tool 签名见 [references/tool-catalog.md](references/tool-catalog.md)（按需加载，
主体只保留编排决策）。

---

## 编排 Workflow

### 1. 发现阶段：选主题与模板

**为什么先跑 `list_themes` + `describe_theme`？**
渲染前必须确认 themeId；`describe_theme` 返回该主题支持的 `templates` 列表（轻量
TemplateMeta[]，无正文），用于引导用户选模板。不先查主题直接渲染会导致回退 default 主题，
失去用户的排版意图。

```
list_themes()
  → 返回 [{id, name}, …]，让用户选择

describe_theme({ id: "<chosen_theme_id>" })
  → 返回 { id, name, paintable, templates: TemplateMeta[] }
```

**推荐主题提示**：见 [prompts/recommend-theme.md](prompts/recommend-theme.md)。

---

### 2. 两阶段取数：加载模板正文

**为什么 `describe_theme.templates` 不够，还要 `describe_template`？**
`describe_theme` 只返回轻量 TemplateMeta（id、名称、摘要），正文 Markdown、覆盖元素清单
（`coveredElements`/`coveredBlocks`）、mdastSummary 等完整信息由 `describe_template` 单独
返回。这是两阶段取数设计——避免 `describe_theme` 一次传输所有模板全文导致上下文膨胀。

```
describe_template({ themeId: "<theme_id>", templateId: "<template_id>" })
  → 返回 { themeId, templateId, markdown, metadata, coveredElements,
           coveredBlocks, mdastSummary, dependencies }
```

当用户想参考模板写作时，读 `markdown` 字段作为起点。

---

### 3. 可选：注册自定义 Variant 皮肤

**为什么在 render 前注册？**
`render_markdown` 遇到文档中引用的 variant（如 `::: callout{variant="my-card"}`）时会
即时解析注册表，若 variant 尚未注册则渲染降级为默认样式。先注册再渲染确保自定义皮肤
生效。

```
register_variant({ blockId, variantId, label, style })
  → 返回 { registered, variantId, rejectedDeclarations }
```

**选 Variant 提示**：见 [prompts/choose-variant.md](prompts/choose-variant.md)；
**生成 Callout 指令**：见 [prompts/build-callout.md](prompts/build-callout.md)。

---

### 4. 渲染：Markdown → inline-styled HTML

```
render_markdown({ markdown, themeId, customCss?, paint?, baseColor? })
  → 返回 { html, diagnostics, rulesetVersion, themeVersion, postPaste }
```

- `diagnostics` 含排版警告（`WARNING` 级别），优先检查后再发布。
- `postPaste` 是 simulate_paste 的预估结果，可作参考但不替代下一步真实过滤。
- 若文章含中文排版问题，先用 `apply_zh_typo` 修正再渲染。

---

### 5. 粘贴模拟：最后一道关卡

**为什么 `simulate_paste` 必须在 `upload` 前？**
微信编辑器在用户粘贴时会剥离 wechat-flow 不支持的 CSS 属性与 HTML 节点。`simulate_paste`
精确模拟该过滤，`diffNodes` 与 `droppedAttrs` 告知哪些样式被丢弃，让你在发布前有机会
调整主题或自定义 CSS，避免"发布后才发现样式丢失"。

```
simulate_paste({ html: "<render_markdown 返回的 html>" })
  → 返回 { filteredHtml, diffNodes, droppedAttrs }
```

---

### 6. 上传素材库（异步）

**为什么异步 tool 要 `get_job` 轮询？**
图片上传与微信素材 API 均为耗时操作（网络 IO、微信 API 限速），MCP server 以异步 job
模式返回 `{ jobId }`，避免 tool call 长时间阻塞。需主动轮询直到 `status` 为
`"succeeded"` 或 `"failed"`。

```
upload_to_wechat_asset({ imageUrl: "<filteredHtml 中图片 URL>", type: "image" })
  → 返回 { jobId }

# 轮询，建议间隔 2s，最多重试 30 次
get_job({ jobId })
  → 返回 { status: "pending"|"running"|"succeeded"|"failed", result?, error? }
```

其余三个异步 tool（`upload_image` / `export_long_image` / `export_cover`）均遵循相同
`{ jobId } → get_job 轮询` 模式。

---

## 完整编排链概览

```
list_themes → describe_theme → describe_template (两阶段取数)
  → [register_variant]              可选，render 前注册自定义皮肤
  → render_markdown                 Markdown → inline-styled HTML
  → simulate_paste                  粘贴过滤，发布前最后关卡
  → upload_to_wechat_asset          异步上传 → get_job 轮询完成
```

---

## Tool 选择指引

| 场景 | 推荐 Tool |
|------|-----------|
| 查询可用主题列表 | `list_themes` |
| 了解某主题特性与模板 | `describe_theme` |
| 加载模板完整正文 | `describe_template` |
| Markdown 排版渲染 | `render_markdown` |
| 中文标点/空格规范化 | `apply_zh_typo` |
| 生成调色板 | `derive_palette` |
| 查询 block 列表 | `list_blocks` + `describe_block` |
| 查询 block 的 variant 皮肤 | `list_block_variants` + `describe_variant` |
| 注册自定义皮肤 | `register_variant` |
| 查询 mark 列表 | `list_marks` + `describe_mark` |
| 查询 design token | `list_tokens` + `describe_token` |
| 检查排版规则版本 | `get_ruleset_version` |
| 仅检查 Markdown 排版问题（不渲染） | `lint_markdown` |
| 模拟微信粘贴过滤 | `simulate_paste` |
| 导出剪贴板 payload | `export_clipboard_payload` |
| 异步导出长图 | `export_long_image` → `get_job` |
| 异步导出封面 | `export_cover` → `get_job` |
| 异步上传图片到 job | `upload_image` → `get_job` |
| 异步上传微信素材 | `upload_to_wechat_asset` → `get_job` |
| 查询异步 job 状态 | `get_job` |

完整 tool 签名与参数说明：[references/tool-catalog.md](references/tool-catalog.md)

---

## Prompts 路由

| 场景 | 文件 |
|------|------|
| 按文章调性推荐主题 | [prompts/recommend-theme.md](prompts/recommend-theme.md) |
| 选 block variant 皮肤 | [prompts/choose-variant.md](prompts/choose-variant.md) |
| 生成 callout directive | [prompts/build-callout.md](prompts/build-callout.md) |

## Resources 路由

| 场景 | 文件 |
|------|------|
| tech 主题技术评测样例 | [resources/sample-tech-review.md](resources/sample-tech-review.md) |
| literary 主题诗歌散文样例 | [resources/sample-poetry-essay.md](resources/sample-poetry-essay.md) |
