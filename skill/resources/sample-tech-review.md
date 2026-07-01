---
theme: tech
description: 技术评测样例：使用 tech 主题与真实 directive
---

# M4 MacBook Pro 实测：六个月后的真实感受

> 这是一篇使用 `tech` 主题渲染的公众号技术评测文章样例，展示 wechat-flow 常用 directive 的真实写法。

渲染时指定 `themeId: "tech"`：

```
render_markdown({ markdown: "<本文内容>", themeId: "tech" })
```

---

## 性能基准

六个月日常使用后，M4 芯片在以下场景表现突出：

| 测试场景 | M4 MacBook Pro | 对比上代 |
|---------|---------------|---------|
| 编译 TypeScript 大型项目 | 18s | 31s |
| 视频导出（4K 30min） | 4min 20s | 7min 15s |
| Docker 镜像构建 | 45s | 82s |

::: callout{type="tip"}
使用 `pnpm turbo build --filter=@wechat-flow/core` 配合 Turborepo 缓存，冷启动构建可进一步缩短至 8s。
:::

---

## 开发体验

### 代码编辑器响应

VS Code 在 M4 上打开含 200+ TypeScript 文件的 monorepo，IntelliSense 响应延迟从 1.2s 降至
0.3s 以内，日常 diff/commit 几乎无感知停顿。

::: callout{type="warning"}
首次打开 Xcode 模拟器时仍需约 3 分钟完成 Rosetta 翻译，这是 ARM 生态的固有成本。
:::

### 终端性能

```bash
# 跑完整测试套件（含覆盖率）
pnpm vitest run --coverage

# 典型结果
# Tests: 2147 passed
# Duration: 12.4s
```

::: callout{type="info"}
`vitest` 利用 Worker threads 并发，M4 的 P-core 调度在高并发测试场景下优势明显。
:::

---

## 续航实测

**轻度办公场景**（文档编写 + 浏览器 + 邮件）：约 18 小时  
**重度开发场景**（本地 Docker + 多终端 + 视频会议）：约 9 小时

::: callout{type="note"}
测试时屏幕亮度 60%，关闭节能模式，结果与 Apple 官方数据基本吻合。
:::

---

## 总结

对于以 TypeScript/Rust/Go 开发为主的工程师，M4 MacBook Pro 是目前最均衡的生产力工具。
性能溢出明显，日常工作很难跑满，但在 CI 本地预跑、大型编译、视频处理场景有实感差异。
