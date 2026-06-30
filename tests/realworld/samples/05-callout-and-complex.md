# 综合结构示范

## Block Directive 调用框

:::callout
**注意事项**：在将 HTML 粘贴至微信编辑器前，请先在预览模式下核对排版效果。

微信编辑器会过滤掉部分 HTML 属性，但 `style` 属性中的内联样式会被保留。
:::

## 复杂嵌套内容

### 技术规格

核心渲染参数说明：

1. **themeId**（必填）：指定渲染主题，可选值为 `default`、`business`、`literary`、`magazine`、`tech`
2. **outDir**（可选）：输出目录，默认为 `tests/realworld/output/`
3. **sampleFilter**（可选）：按样本名过滤，支持精确匹配

### 验证流程

> 实地验证是确保渲染保真度的最终手段。脚本自动化可以覆盖 80% 的场景，剩余 20% 需要人工在真实微信环境中核对。

验证结果将以 `state_change` 事件追加写入 `docs/EVENT-LOG.jsonl`，便于后续追溯与回归分析。

## 结语

本样本覆盖了 block directive、多级标题、有序列表、引用块等公众号写作中最常见的结构元素，配合其他 4 篇样本形成完整的渲染验证矩阵。
