---
theme: tech
template: tutorial
---

# 从零搭建：实战教程

## 环境准备

跟随本教程，参考 [官方文档](https://example.com) 完成完整项目搭建。

## 前置要求

- Node.js ≥ 22
- pnpm ≥ 9
- Git

## 实现步骤

```bash
# 初始化项目
pnpm create vite my-app --template vue-ts
cd my-app
pnpm install
```

> 每一步都有产出物，确认后再继续，避免积累错误。

---

![项目结构](project-tree.png)

| 目录 | 说明 |
|------|------|
| `src/` | 业务代码 |
| `tests/` | 测试文件 |
| `scripts/` | 工程脚本 |

:::callout
注意：请确保 Node.js 版本符合要求，否则部分依赖可能无法正确安装。
:::

:::steps
1. 安装依赖：`pnpm install`
2. 编写核心逻辑并补充测试
3. 构建并验证：`pnpm build && pnpm test`
:::

:::compare
**Vite** vs **Webpack**：开发体验与生态成熟度的权衡，新项目推荐 Vite。
:::
