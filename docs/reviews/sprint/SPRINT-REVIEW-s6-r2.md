---
id: "sprint-review-s6-r2"
doc_type: sprint-review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s6"]
---

# SPRINT-REVIEW s6 r2 — T-060 revision 增量复核

## 范围

按 [`SPRINT-REVIEW-s6-r1.md`](SPRINT-REVIEW-s6-r1.md) 三态判定的既定路径，仅复核 needs_revision 唯一标记卡 **T-060** 的修复（SR-001 HIGH + SR-002 MEDIUM）。其余 27 卡在 r1 已定 done，不重审。

修复改动：`packages/ruleset/src/patch-loader.ts`（`validatePatchEntry` 共享校验：`matcher`/`transform` callable 检查 + `scope` 值域校验 `strip|clamp|transform|patch|lint`；`validateBundle` 收敛为有运行时依据的 `asserts data is PatchBundle`，`as unknown as RuleDefinition[]` 强转移除；`applyPatchBundle` 保持先全量校验后注入的原子性）+ `tests/ruleset/patch-loader.test.ts`（新增 8 测试，25 全过）。

## 复核结论（对抗性）

- **SR-001 判定条件逐条通过**：两个入口共享 `validatePatchEntry`，无遗漏路径；错误消息明确说明 JSON 补丁包不可携带函数；类型窄化由真实运行时校验支撑；原子性经非法项首/中/尾三位置实测均 0 注入。
- **绕过尝试 14+ 种全部守住**：单侧函数缺失、null/数组/sparse-hole 条目、scope 大小写/尾随空格/缺失/装箱 String、priority 字符串、真实 `JSON.stringify→JSON.parse` 往返（双入口）——均拒绝。两处理论 NO-THROW（`Object.create(null)` 自带真函数、原型链继承函数）经论证在 JSON-over-HTTP 威胁模型下不可达（`JSON.parse` 产物恒为 `Object.prototype` 派生且函数必然丢失；进程内可构造此类对象者已具备任意代码执行能力），属可接受剩余理论面。`applyPatchBundle` 不校验 `version` 为既有职责边界（修复前后一致，非回归），不在 SR-001/SR-002 范围。
- **假绿消除**：新增真实序列化往返拒绝测试正是 r1 指出缺失的路径；两个既有 AC-001 测试同步补上函数字段后语义诚实（mock object-identity 路径与真实序列化路径职责分离清晰）。
- **无回归**：`tests/ruleset/` 全目录 12 文件 206 测试全绿；全量套件 196 文件 / 2375 测试全绿；`pnpm typecheck`（turbo 全包 + tests tsconfig）与 `pnpm biome check .`（726 文件）净。
- **无越界**：改动严格限于两文件，公开导出面不变，无 DSL schema 重设计类 gold-plating，无变更说明残留（regex 自检零命中）。

### [R2-001] LOW: `validatePatchEntry` 的 `id` fallback 分支不可达
- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `patch-loader.ts:39` 的 `"<unknown>"` fallback 在 :40-42 立即 throw 后永不被后续消息使用。纯代码简洁性观察，无行为影响。
- **建议**: 可随后续维护顺手简化，不阻塞。

## 三态判定

无 CRITICAL/HIGH/MEDIUM（1×LOW 观察项）→ **approved**。

- SR-001/SR-002 实质性修复确认；SR-003（arch#§2.M-003 fixture 规范落差）与补丁包声明式 DSL schema 重设计（F-011 AC-005 回炉）按 r1 既定处置走 arch backlog / 上游反馈。
- **Sprint 6 判定 DONE**（r1 §三态判定 既定条件达成：r2 approved）。
