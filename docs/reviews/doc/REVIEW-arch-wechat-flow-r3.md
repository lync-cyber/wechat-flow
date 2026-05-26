---
id: "review-arch-wechat-flow-r3"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data"]
---
# ARCH 文档增量审查报告 — wechat-flow r3

**被审文档**: arch-wechat-flow 0.3.0（主卷）+ arch-wechat-flow-modules 0.3.0 + arch-wechat-flow-api 0.3.0 + arch-wechat-flow-data 0.3.0

**上轮报告**: `docs/reviews/doc/REVIEW-arch-wechat-flow-r2.md`（verdict: needs_revision，R-NEW-001 HIGH + R-NEW-002 MEDIUM）

**审查范围说明**: 增量审查（continuation 模式），仅审查 r2 中 R-NEW-001/R-NEW-002 涉及位置；其余章节标 [previously-approved]，引用 r1/r2 报告。

---

## 历史问题状态回顾

| 报告 | verdict | 问题概况 |
|------|---------|---------|
| r1 | needs_revision | 4 HIGH + 6 MEDIUM + 4 LOW，共 14 个 |
| r2 | needs_revision | r1 全部 14 个已闭环；r2 新发现 R-NEW-001（HIGH）+ R-NEW-002（MEDIUM） |

r1 全部问题在 r2 中已验证闭环，本轮 [previously-approved]，不再重审。

---

## Layer 1 — 自动检查结论

r2 层 1 结论已为 PASS（4 分卷均 exit 0）。本轮修订面极小（仅 §5.3 + §8.2 Q3.8 + M-001 + API §3.5 顶部），无结构变化，Layer 1 结论延续 r2 PASS 判定。版本号验证（参见下方 §4 逐项核查）。

---

## Layer 2 — 增量 AI 语义审查

### 审查焦点 1：R-NEW-001 — §5.3 iframe 沙箱重写 + Q3.8 决策记录

#### 1.1 sandbox="" + CSP 两层一致性

**文档内容（§5.3 "预览 iframe 沙箱"）**：

- 加载方式：`<iframe srcdoc="..." sandbox="">`，opaque origin
- sandbox 标志：空属性，最严格档位，禁用所有特权（scripts / forms / popups 等）
- CSP：`default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:`，无任何 script-src，不允许脚本执行
- 明确描述"sandbox 与 CSP 形成两层一致的'完全禁 JS'边界"

**验证结论**：两层方向一致，原 r2 R-NEW-001 中的矛盾（`sandbox="allow-scripts"` 允许 JS 但 CSP 阻止 JS）已消除。当前方案：sandbox 层和 CSP 层均拒绝 JS，设计意图一致。

**Q3.8 决策记录（§8.2）**：更新为 `sandbox=""`（空属性，完全禁 JS）+ CSP `default-src 'none'`，与微信公众号"产物零 JS"现实对齐，与用户 sign-off 的"完全禁 JS"方向匹配。**已闭环**。

#### 1.2 UI 钩子主线程实现可行性

文档声明："主线程通过 `iframe.contentDocument.scrollTo()` 控制目录跳转"；覆盖层在主线程渲染、定位在 iframe 上方；视口切换由主线程改容器尺寸。

**浏览器规范核查**：

`sandbox=""` 约束的是 iframe 内部脚本的执行环境与特权，不限制外部（父页面主线程）对该 iframe DOM 的访问。`srcdoc` iframe 与父页面同进程加载，父页面持有对 `HTMLIFrameElement.contentDocument` 的读写权。因此 `iframe.contentDocument.scrollTo()` 在父主线程调用是合规操作，不受 sandbox 限制。W3C HTML 规范 Sandboxing 一节明确：sandbox flag set 的作用是约束 iframe browsing context 内代码的能力，而非约束包含方文档对 nested document 的访问。

> `[ASSUMPTION]` 上述分析基于 HTML Living Standard（WHATWG）规范语义。在 Chrome 100+ / Safari 15+ / Edge 100+ 基线浏览器上行为一致；若项目测试阶段验证出特定浏览器存在差异，应在 §5.3 补充浏览器兼容性注记。

M-001 PreviewPane 描述（modules 分卷第 32 行）已对应更新："UI 钩子全部在主线程通过 `iframe.contentDocument` 与 overlay 实现，不向 iframe 内注入脚本"，与主卷一致。

**实现可行性：可落地，无高风险问题。**

#### 1.3 设计意图与 PRD 一致性

§5.3 设计意图一节明确引用 PRD §1.1 视觉一致性承诺，说明"预览引入 JS 会产生'本地能跑、公众号不能跑'的视觉偏差"。设计动机充分，与产品意图对齐。

---

### 审查焦点 2：R-NEW-002 — API §3.5 ScopeSchema + API-028/029 scope 字段

#### 2.1 ScopeSchema 定义正确性

```
/^(?:admin|user(?:,(?:render|upload|wechat-asset|sync))*)$/
```

regex 语义解析：
- `admin` — 精确匹配字符串 `'admin'`
- `user(?:,(?:render|upload|wechat-asset|sync))*` — `user` 后跟零或多个 `,X`，X 为四个细粒度之一

E-010 示例覆盖验证：

| 示例值 | regex 匹配 |
|--------|-----------|
| `'admin'` | 匹配（第一分支） |
| `'user'` | 匹配（第二分支，零个细粒度） |
| `'user,render'` | 匹配（一个细粒度） |
| `'user,render,upload'` | 匹配（两个细粒度） |
| `'user,render,upload,wechat-asset'` | 匹配（三个细粒度） |
| `'user,render,upload,wechat-asset,sync'` | 匹配（四个细粒度） |

所有 E-010 文档（data 分卷第 350 行）提到的示例均可匹配。注释中也列出了合法示例验证说明，与 regex 一致。

#### 2.2 API-028 request/response scope 引用

API-028 `request.body.schema` 中 `scope: ScopeSchema` — 正确引用共享定义，替代原 `z.enum(['user','admin'])`，现支持细粒度复合值。

API-028 `response.201.schema` 中 `scope: ScopeSchema` — 正确引用，与创建时入参一致。

#### 2.3 API-029 response scope 引用

API-029 `response.200.schema.keys[].scope: ScopeSchema` — 正确引用，返回的 key 列表 scope 字段使用统一 schema，与 E-010 存储格式一致。

**注意**：API-029 query 参数 `scope: { type: "'user'|'admin'" }` 仍为粗粒度枚举，但此处是**过滤查询参数**（按粗粒度分类筛选 key），不是 key 自身的 scope 值，语义合理，无需使用 ScopeSchema。不计为问题。

#### 2.4 E-010 ↔ API schema 一致性确认

E-010（data 分卷第 350 行）scope 字段描述与 ScopeSchema 定义及注释完全一致，细粒度能力词列表（render / upload / wechat-asset / sync）四项完整对应。**已闭环**。

---

### 审查焦点 3：Version Bump 验证

| 文档 | 实测 version |
|------|------------|
| arch-wechat-flow.md（主卷） | 0.3.0 |
| arch-wechat-flow-modules.md | 0.3.0 |
| arch-wechat-flow-api.md | 0.3.0 |
| arch-wechat-flow-data.md | 0.3.0 |

所有 4 个 ARCH 文档均已升至 0.3.0。**已完成**。

---

### 文档纪律扫描（增量范围）

对 r3 修订涉及的区域（§5.3、§8.2 Q3.8、M-001、API §3.5）快速过滤：
- 过程标签 regex：无命中
- 溯源引用（issue/PR 编号）：无命中
- 版本里程碑叙事（"v0.x 起"等）：无命中
- 时间估算：无命中

---

## 三态判定

| 严重等级 | 数量 | 说明 |
|---------|------|------|
| CRITICAL | 0 | — |
| HIGH | 0 | R-NEW-001 已闭环 |
| MEDIUM | 0 | R-NEW-002 已闭环 |
| LOW | 0 | — |

### r2 问题闭环情况

| 编号 | 严重等级 | 状态 |
|------|---------|------|
| R-NEW-001 | HIGH | 已闭环（sandbox="" + CSP 两层一致禁 JS，Q3.8 决策记录同步更新） |
| R-NEW-002 | MEDIUM | 已闭环（ScopeSchema 共享定义，API-028/029 均引用，覆盖 E-010 所有示例） |

**verdict: approved**

所有 r1/r2 问题全部闭环，r3 修订无引入新设计缺陷，4 个 ARCH 文档均升至 version 0.3.0。ARCH 文档可作为 dev-plan 阶段的上游输入。
