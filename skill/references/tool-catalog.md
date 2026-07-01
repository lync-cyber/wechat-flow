# Tool Catalog

完整 24 个 MCP tool 签名。本文件由 SKILL.md 主体按需引用，避免主体因枚举签名而膨胀。

---

## 同步 Tool（20 个）

### render_markdown
```
render_markdown({
  markdown: string,
  themeId?: string,
  customCss?: string,
  paint?: Record<string, string>,
  baseColor?: string,
  rulesetVersion?: string
}) → {
  html: string,
  diagnostics: Diagnostic[],
  rulesetVersion: string,
  themeVersion: string,
  postPaste: string
}
```

### lint_markdown
```
lint_markdown({
  markdown?: string,
  themeId?: string,
  customCss?: string
}) → { diagnostics: Diagnostic[] }
```

### list_themes
```
list_themes() → [{ id: string, name: string }]
```

### describe_theme
```
describe_theme({ id: string }) → {
  id: string,
  name: string,
  paintable: string[] | Record<string, string>,
  templates: TemplateMeta[]
}
```

### list_blocks
```
list_blocks() → [{ id: string, name: string, variants: string[] }]
```

### describe_block
```
describe_block({ blockId: string }) → {
  id: string,
  name: string,
  attrsSchema: Record<string, unknown>,
  variants: string[],
  baseStyle: Record<string, Record<string, string>>,
  slots: string[]
}
```

### list_marks
```
list_marks() → [{ id: string, name: string }]
```

### describe_mark
```
describe_mark({ markId: string }) → {
  id: string,
  name: string,
  style: Record<string, string>,
  attrsSchema: Record<string, unknown>
}
```

### list_tokens
```
list_tokens() → {
  tokens: [{ id: string, category: string, value: string, themeOverrides?: Record<string, string> }]
}
```

### describe_token
```
describe_token({ id: string }) → {
  id: string,
  category: string,
  value: string
}
```

### list_block_variants
```
list_block_variants({ blockId: string }) → [{ id: string, blockId: string, label: string }]
```

### describe_variant
```
describe_variant({ blockId: string, variantId: string }) → {
  id: string,
  blockId: string,
  label: string,
  attrsSchema: Record<string, unknown>,
  style: Record<string, Record<string, string>>,
  dependencies: string[]
}
```

### derive_palette
```
derive_palette({
  primary: string,
  secondary?: string,
  accent?: string,
  dark?: boolean
}) → Record<string, string>
```

### apply_zh_typo
```
apply_zh_typo({
  markdown: string,
  rules?: string[]
}) → {
  fixed: string,
  perRule: Record<string, number>,
  totalChanges: number,
  diff: string
}
```

### simulate_paste
```
simulate_paste({ html: string }) → {
  filteredHtml: string,
  diffNodes: unknown[],
  droppedAttrs: Record<string, string[]>
}
```

### export_clipboard_payload
```
export_clipboard_payload({
  markdown: string,
  themeId?: string
}) → { html: string, text: string }
```

### get_ruleset_version
```
get_ruleset_version({ themeId?: string }) → {
  coreVersion: string,
  themeVersion: string,
  rulesetVersion: string
}
```

### describe_template
```
describe_template({ themeId: string, templateId: string }) → {
  themeId: string,
  templateId: string,
  markdown: string,
  metadata: Record<string, unknown>,
  coveredElements: string[],
  coveredBlocks: string[],
  mdastSummary: unknown,
  dependencies: string[]
}
```

### register_variant
```
register_variant({
  blockId: string,
  variantId: string,
  label: string,
  style: Record<string, Record<string, string>>
}) → {
  registered: boolean,
  variantId: string,
  rejectedDeclarations: unknown[]
}
```

### get_ruleset_version (alias)
见上方同名条目。

---

## 异步 Tool（4 个）

所有异步 tool 返回 `{ jobId: string }`，需用 `get_job` 轮询。

### upload_image
```
upload_image({
  url?: string,
  base64?: string,
  mimeType?: string,
  idempotencyKey?: string
}) → { jobId: string }
```

### upload_to_wechat_asset
```
upload_to_wechat_asset({
  imageUrl: string,
  type: "image" | "voice" | "video" | "thumb"
}) → { jobId: string }
```

### export_long_image
```
export_long_image({
  markdown: string,
  themeId?: string,
  idempotencyKey?: string
}) → { jobId: string }
```

### export_cover
```
export_cover({
  markdown: string,
  themeId?: string,
  coverStyle?: Record<string, unknown>,
  idempotencyKey?: string
}) → { jobId: string }
```

### get_job（轮询）
```
get_job({ jobId: string }) → {
  status: "pending" | "running" | "succeeded" | "failed",
  result?: { url: string },
  code?: string,
  message?: string
}
```
