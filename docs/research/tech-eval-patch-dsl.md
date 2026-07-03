---
id: "rn-007-patch-dsl"
doc_type: research
author: architect
status: approved
deps: ["arch-wechat-flow", "prd-wechat-flow"]
consumers: [architect, tech-lead, developer]
context: "F-011 AC-005 补丁包传输格式回炉 — SPRINT-REVIEW-s6-r1 SR-001 登记的 arch 层重设计（JSON 不可携带函数）"
required_sections:
  - "## 问题"
  - "## 方案对比"
  - "## 决策"
  - "## 重新评估条件"
---

# 补丁包声明式 DSL 传输格式选型

## 问题

M-003 `patch-loader.ts` 的 `PatchBundle.patches: RuleDefinition[]` 契约要求条目携带
`matcher`/`transform` 函数字段，而 F-011 AC-005 的主场景是经 HTTP 拉取 JSON 补丁包——
JSON 序列化协议无法表达函数，任何真实远程补丁包反序列化后函数字段必为 `undefined`，
被执行器触达即抛 `TypeError`。守卫性修复（显式拒绝无函数条目）消除了崩溃面，但同时
把 JSON 热加载这条主场景封死。需要一种可 JSON 传输、可校验、无任意代码执行面的补丁
表达。

## 方案对比

| 维度 | ① 声明式 matcher DSL + 预注册 transform-id 白名单（选定） | ② CSS selector 字符串 + transform-id | ③ 表达式解释器（jsonata / 自研沙箱） |
|------|----------------------------------------------------------|--------------------------------------|--------------------------------------|
| JSON 可传输 | 是 | 是 | 是 |
| 新增依赖 | 零（复用包内 css-helpers） | hast-util-select（选择器引擎） | 解释器依赖或自研成本 |
| 表达能力 | 覆盖既有 42 条 builtin 规则的匹配形状（style-prop / tag / attr + and/or 组合） | 更强（任意 CSS 选择器） | 最强 |
| 安全面 | 无代码执行：matcher 由白名单工厂编译，transform 仅可引用预注册 id | 同左（选择器为声明式） | 解释器逃逸风险需持续审计 |
| 校验可行性 | 判别联合逐字段校验，fail-closed | 选择器语法校验依赖引擎报错 | 难以静态校验 |
| 演进成本 | `registerPatchMatcher`/`registerPatchTransform` 注册面可增量扩展；`formatVersion` 护栏 | 同左 | 高 |

微信已知 Bug 补丁的实际形状（对照 42 条 builtin 规则）几乎全部是"命中某类元素/某 CSS
属性 → 删属性/钳值/改属性/删节点"，方案①的表达能力足够；选择器引擎（方案②）在需要
结构性选择（如 `section > p:first-child`）时再引入，作为 DSL 的新 matcher type 增量
接入而非推倒重来。

## 决策

**方案①**。落地为 `packages/ruleset/src/patch-dsl.ts`：

- **传输格式**（`formatVersion: 1`，缺省视为 1，其余值 fail-closed 拒绝）：

  ```json
  {
    "version": "1.2.0",
    "formatVersion": 1,
    "patches": [{
      "id": "hotfix-strip-gap-wx8",
      "scope": "strip",
      "priority": 85,
      "match": { "type": "style-prop", "props": ["gap"] },
      "apply": { "transform": "remove-css-declarations", "params": { "props": ["gap"] } }
    }]
  }
  ```

- **matcher DSL**：判别联合 `style-prop | tag | attr | and | or`，编译为 `(node) => boolean`；
  非 element 节点恒不匹配。
- **transform 白名单**：初始注册 `remove-css-declarations` / `clamp-px` / `set-style-property` /
  `remove-attributes` / `drop-node`（全部落在 css-helpers 既有能力上）；消费方可经
  `registerPatchTransform(id, factory)` 在代码侧预注册后由 JSON 引用。params 由各工厂
  fail-closed 校验。
- **scope 约束**：声明式条目仅接受 `strip | clamp | transform | patch`；`lint` 需要
  `diagnose` 函数，无法 JSON 传输，显式拒绝并提示。
- **兼容性**：`PatchBundle.patches` 为 `RuleDefinition | DeclarativePatchEntry` 联合——
  程序内注入（携真实函数）路径保持不变；`applyPatchBundle` 先全量编译校验再原子 upsert。
- **安全性质**：远程 JSON 无法注入任意可执行代码；可执行面固定为预注册工厂集合。

## 重新评估条件

- 出现白名单工厂无法表达的补丁需求（如结构性重排、跨节点上下文匹配）→ 评估引入
  hast-util-select 作为新 matcher type，或扩注册面。
- 补丁包需要按微信客户端版本条件生效（M-003 叙述的"按版本号匹配"）→ 在 entry 增加
  `wechatVersions` 声明字段并在 loader 侧过滤，属 formatVersion 2 演进。
- arch#§2.M-003 与 arch API 卷中 `PatchBundle` 契约文字需按本决策修订（登记于
  CLAUDE.md §待办，待 CataForge 框架对齐后走 amendment 流程）。
