# Prompt: 按文章调性推荐主题

## 使用时机

当用户没有明确指定主题，或想根据文章内容风格获得主题建议时加载本 prompt。

## Tool 调用序列

```
list_themes()
  → 返回所有可用主题 [{id, name}]

describe_theme({ id: "<candidate_theme_id>" })
  → 对感兴趣的主题逐一调用，获取 paintable 与 templates 信息
```

## 推荐逻辑

根据文章调性与主题特征匹配：

| 主题 id | 适合调性 | 典型场景 |
|---------|---------|---------|
| `default` | 通用、中性 | 知识分享、日常推文、公告 |
| `business` | 商务、专业 | 企业资讯、行业报告、产品介绍 |
| `literary` | 人文、感性 | 散文、诗歌、文化评论 |
| `magazine` | 时尚、视觉 | 生活方式、创意内容、品牌故事 |
| `tech` | 技术、简洁 | 技术博客、代码教程、评测报告 |

## 输出格式

推荐时说明：
1. **推荐主题**：`id` + 推荐理由（1 句话，结合文章调性）
2. **可用模板**：列出 `describe_theme.templates` 中的模板名称
3. **备选主题**：若调性介于两者之间，给出第二选项

## 示例

用户文章：《深度评测：M4 MacBook Pro 六个月使用体验》

```
list_themes() → [default, business, literary, magazine, tech]
describe_theme({ id: "tech" }) → { paintable: [...], templates: [{id: "starter", ...}] }
```

推荐：**tech** 主题——技术评测内容，`tech` 主题的代码块高亮与简洁排版最契合。
备选：**default** 主题——若想要更通用的读者覆盖面。
