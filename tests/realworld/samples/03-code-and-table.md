# 代码与表格示范

## 内联代码

在配置文件中设置 `theme: "tech"` 即可启用科技主题，`renderMarkdown()` 函数接受 Markdown 字符串并返回 inline-styled HTML。

## 代码块

```typescript
import { renderMarkdown, registerTheme } from "@wechat-flow/core";
import techTheme from "@wechat-flow/themes-tech";

registerTheme(techTheme);

const { html } = await renderMarkdown("# Hello World", { themeId: "tech" });
console.log(html);
```

## GFM 表格对比

| 特性         | 传统排版 | wechat-flow |
|--------------|----------|-------------|
| 上手难度     | 高       | 低          |
| 主题切换     | 不支持   | 一键切换    |
| 微信兼容性   | 手动调整 | 自动适配    |
| 批量处理     | 不支持   | 脚本驱动    |

表格数据来源于内部评测，仅供参考。
