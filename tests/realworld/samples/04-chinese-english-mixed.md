# 中英文混排与标记指令

## 双语术语场景

现代技术写作中，中英文混排（bilingual typesetting）是常态。例如：使用 React 框架开发的 Single Page Application (SPA) 需要特别注意 SEO 优化策略。

**加粗关键词**：inline-styled HTML、CSS specificity、WeChat Editor API。

_斜体强调_：微信公众平台对 HTML 标签有严格的白名单过滤机制（whitelist filtering mechanism）。

## 行内标记指令

正文中可以使用 :highlight[高亮重点内容] 来标记核心信息，也可以用 :badge[NEW] 表示新特性。

:underline[下划线标注] 用于特别强调，:emphasis[着重符号] 则是中文排版的传统表达方式。

## 混排段落

在 wechat-flow 的设计哲学中，Markdown → AST → HAST → inline-styled HTML 的转换管线（pipeline）确保了最终产物与微信编辑器的高度兼容。每个 ThemeDefinition 包含 tokens、blocks 和 templates 三个维度的样式声明。
