---
id: "skill-improve-test-writer"
doc_type: skill-improvement
status: draft
date: 2026-07-02
author: reflector
target_id: test-writer
target_kind: skill
source_exp: EXP-001
---

# SKILL-IMPROVE: test-writer — 防止"helper 构造理想输入"导致虚假绿色测试

## EXP-001: 测试假绿风险集中在"helper 构造理想输入"路径

### 当前问题

本项目 patch-loader 测试中，17 个测试全部依赖 `makePatchRule()` helper 函数构造**含真实 JS 函数**的补丁对象。这些测试完全绿色，但在实际生产场景（HTTP JSON 反序列化）中，`JSON.parse` 会丢弃所有函数字段，导致 `undefined` 错误。根本原因是 helper 构造的对象与真实外部输入格式完全不同，测试覆盖了理想路径而非真实路径。

### 建议改进

#### 目标文件
`.cataforge/skills/test-writer/SKILL.md` 的"RED 阶段关键检查"或新增"虚假绿色防治"章节

#### 当前文本
假设当前 SKILL.md 中关于外部输入测试的相关段落如下：

```
## RED 阶段关键检查

- 边界条件测试：null/empty/oversized 等边界值必须覆盖
- Mock 隔离：依赖 mock 时需标注"mock 与真实实现的差异"
```

#### 建议修改后的文本

```
## RED 阶段关键检查

- **边界条件测试**：null/empty/oversized 等边界值必须覆盖
- **外部输入反序列化路径必须覆盖真实格式**：所有涉及 external-input（HTTP JSON、配置文件、环境变量）的测试需包含真实格式路径，而非仅使用 helper 构造的理想对象。具体例子：
  - 反例（虚假绿色）：`makePatchRule({matcher: (x) => x, ...})` 构造测试对象（含真实函数），但真实 HTTP 补丁包经 `JSON.parse` 后函数字段丢失 → 测试覆盖不了真实场景
  - 正例：编写两类测试 ① helper 构造路径（unit test，覆盖业务逻辑）② JSON 真实往返路径（integration test，验证格式兼容性），两类测试分别验证"代码逻辑"与"格式协议"的可行性
  - 自检项：该路由是否接收外部数据？外部数据是何格式？该格式是否可表达代码中使用的全部字段？若否，测试中需补充格式限制下的真实路径测试
- **Helper 函数的清晰标注**：所有测试 helper 需在代码注释中显式标注"模拟范围"（即"这个 helper 构造的对象与真实 _____ 格式的哪些字段不同"），防止后续维护者误认为 helper 覆盖了真实路径
- **Mock 隔离与真实集成的分离**：Mock 路径与真实外部输入路径需用不同的测试类名区分（如 `test("when patch contains valid function (unit-mock path)", ...)` vs `test("when patch is deserialized from JSON (integration-real path)", ...)`），使覆盖面一目了然
```

#### 修改理由

从 wechat-flow 的回顾可以看出，T-060 patch-loader 的虚假绿色根因是 helper 与真实格式的差异被忽视。这是跨项目的常见模式（见 MEMORY.md `implementer-skips-tests-typecheck` 同族问题），需在 test-writer 的源头指导中强化。该改进覆盖：
1. 让 RED 阶段的测试从一开始就考虑"格式协议可行性"而非仅"业务逻辑正确性"
2. 通过清晰的命名与注释让代码审查能快速识别"这个测试覆盖的是真实场景还是理想情况"
3. 降低 GREEN 阶段的补测成本（如果 RED 已捕获真实格式缺陷，GREEN 就不需要 revision 补测试）

---

## 预期效果

- RED 阶段自动检查所有 external-input 边界是否有真实格式路径
- 测试代码注释中显式声明"模拟范围"与"真实范围"，支持后续代码审查的快速定位
- 需要 schema 重设计（如 AC 定义不可行）时，该发现在 RED 测试中即被捕获，而非延后到 code-review 或 sprint-review
