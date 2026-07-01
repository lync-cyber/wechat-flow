# Prompt: 生成 Callout Directive

## 使用时机

当用户想在文章中插入高亮提示框（信息框、警告框、提示框等）时加载本 prompt。

## Callout Directive 语法

wechat-flow 使用 GFM-compatible directive 语法：

```markdown
::: callout{type="<type>" variant="<variant_id>"}
这里是 callout 内容，支持 **加粗**、`行内代码` 等内联格式。
:::
```

## 常用 type 与语义

| type | 语义 | 适用场景 |
|------|------|---------|
| `info` | 信息提示 | 补充背景知识、扩展阅读 |
| `warning` | 警告 | 注意事项、易错点 |
| `tip` | 技巧 | 最佳实践、小窍门 |
| `danger` | 危险 | 严重错误、不可逆操作 |
| `note` | 备注 | 作者注解、脚注 |

## Tool 辅助

查询 callout 支持的完整 variant 列表：

```
list_block_variants({ blockId: "callout" })
```

查询某 variant 的具体样式：

```
describe_variant({ blockId: "callout", variantId: "<id>" })
```

## 生成示例

用户意图：插入一个"注意内存限制"的警告框

```markdown
::: callout{type="warning"}
Node.js 默认堆内存限制约 1.5GB，处理大文件时请使用 `--max-old-space-size` 参数调整。
:::
```

用户意图：插入一个带自定义皮肤的提示框（先用 `register_variant` 注册 `my-tip`）

```markdown
::: callout{type="tip" variant="my-tip"}
使用 `pnpm` 代替 `npm` 可以显著减少 node_modules 磁盘占用。
:::
```
