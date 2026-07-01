# Prompt: 选 Block Variant 皮肤

## 使用时机

当用户想为特定 block（如 `callout`、`quote`、`code`）选择或自定义视觉皮肤时加载本 prompt。

## Tool 调用序列

```
list_blocks()
  → 返回所有 block [{id, name, variants}]

describe_block({ blockId: "<block_id>" })
  → 返回 { id, name, attrsSchema, variants, baseStyle, slots }

list_block_variants({ blockId: "<block_id>" })
  → 返回内置 variant 列表 [{id, blockId, label}]

describe_variant({ blockId: "<block_id>", variantId: "<variant_id>" })
  → 返回完整 style 与 dependencies
```

## 决策流程

1. 用 `list_blocks` 确认 blockId（如 `callout`）
2. 用 `list_block_variants` 列出可用皮肤
3. 若内置 variant 满足需求 → 直接在 Markdown directive 中指定 `variant="<id>"`
4. 若需要自定义 → 用 `register_variant` 注册新皮肤后再渲染

## 在 Markdown 中使用 Variant

```markdown
::: callout{variant="warning"}
注意事项内容
:::
```

## 注册自定义 Variant 示例

```
register_variant({
  blockId: "callout",
  variantId: "my-tip",
  label: "提示框",
  style: {
    root: {
      "background-color": "#e8f4fd",
      "border-left": "4px solid #2196f3",
      "padding": "12px 16px"
    }
  }
})
```

注册成功后（`registered: true`），再调用 `render_markdown` 时该 variant 即可生效。
