---
theme: tech
template: starter
---

# 技术文档

## 架构概述

### 核心模块

#### 接口设计

##### 实现细节

###### 版本说明

本文档参考 [RFC 规范](https://example.com)，描述系统设计。

- 模块化架构
- 类型安全
- 可测试性

> 好的代码是最好的文档。

```typescript
interface Pipeline<T, R> {
  process(input: T): Promise<R>;
  pipe<N>(next: Pipeline<R, N>): Pipeline<T, N>;
}
```

---

![架构图](arch-diagram.png)

| 模块 | 职责 | 依赖 |
|------|------|------|
| parser | 解析 Markdown | remark |
| transformer | 转换 AST | unified |

:::callout
注意：升级前请阅读 Breaking Changes。
:::

:::card
**快速开始**

安装依赖后运行 `pnpm dev` 启动开发服务器。
:::

:::steps
1. 安装依赖：`pnpm install`
2. 启动开发：`pnpm dev`
3. 运行测试：`pnpm test`
:::

:::quote
> 简洁的 API 是工程师最好的礼物。
:::

:::pull-quote
类型安全不是约束，而是工程质量的保障。
:::

:::compare
**REST** vs **GraphQL**：灵活性与简单性的权衡。
:::
