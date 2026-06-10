---
id: "code-review-T-016-r2"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-016"]
---

# CODE-REVIEW T-016 — sanitize 阶段 r2（revision 后复审）

Layer 1 delegated to hook（项目配置了 PostToolUse lint hook，编码阶段已通过 biome 实时修复）

增量审查模式：聚焦 r1 verdict needs_revision 的 HIGH 问题（R-002）及配套测试（R-005）的修复结果；R-001/R-003/R-004 维持 [previously-approved r1] 状态，不重复审查。

vitest 取证：`pnpm vitest run tests/core/sanitize.test.ts` → **12/12 通过**（含新增 4 个锚定测试）。

---

## R-002 闭环裁决：css-attr-filter CSS 转义绕过防御

### 实现路径

`normalizeCssValue`（css-attr-filter.ts line 16–29）执行四步归一化，顺序如下：

1. **剥 CSS 注释**（`/\/\*[\s\S]*?\*\//g`）— 防御 `java/**/script:` 注释拆分绕过
2. **解码反斜杠 hex 转义**（`/\\([0-9a-fA-F]{1,6})\s?/g`）— 防御 `j\61vascript:` 向量；正则使用 1–6 位 hex 匹配符合 CSS 规范最大宽度，贪婪模式保证 `\000061` 等六位编码被完整消费
3. **剥非 hex 反斜杠转义**（`/\\(.)/g → "$1"`）— 防御 `\j` 等非数字转义残留
4. **剥 C0 控制字符**（`/[\x00-\x1F]/g`）— 防御 null byte 等控制字符填充绕过

归一化后的字符串进入 `BLOCK_WHOLE_VALUE_PATTERNS` 和逐 declaration 的 `BLOCK_DECLARATION_PATTERNS` 匹配。

### 向量逐一核查

| 攻击向量 | 归一化后 | 是否被拦截 |
|--------|---------|----------|
| `j\61vascript:void(0)` | `javascript:void(0)` | `/\bjavascript\s*:/i` 命中，声明被滤除 |
| `java/**/script:alert(1)` | `javascript:alert(1)` | `/\bjavascript\s*:/i` 命中，整个 value 被滤除（whole-value 测试路径）|
| `color:red; -moz-binding:url(evil)` | 同 | `/-moz-binding\s*:/i` 命中，`-moz-binding` 声明被滤除，`color:red` 保留 |
| `\000000avascript:` | null-stripped → `avascript:` | 不匹配 `javascript:`，无误报 |
| `color:red`（合法） | `color:red` | 不命中任何 pattern，原样通过 |

**顺序正确性**：注释先于 hex 解码执行，`java/**/script:` 不会因注释内含转义而二次膨胀。non-hex 反斜杠在 hex 解码之后处理，避免 `\\61` 被误当反斜杠字面量跳过（`\\61` 在 JS string 层面已是 `\61`，hex 解码正常消费）。

**`-moz-binding` 已补入** `BLOCK_DECLARATION_PATTERNS`（line 7），模式为 `/-moz-binding\s*:/i`，可捕获有无空格的变体。

### 裁决

**R-002 已闭环。** 归一化顺序正确，主要 CSS 转义绕过向量（hex 编码、注释拆分、backslash 字面量）和 `-moz-binding` 均被有效拦截，合法值无误杀。

---

## R-005 闭环裁决：CSS 转义绕过测试锚定

新增 `describe("R-002/R-005: css-attr-filter CSS 转义绕过防御")`（sanitize.test.ts line 105–135），含四个测试：

| 测试 | 输入向量 | 断言 |
|-----|--------|------|
| hex 转义向量 | `j\\61vascript:void(0)` | 输出不含 `javascript:` 且不含 `j\\61vascript:` |
| 注释拆分向量 | `java/**/script:alert(1)` | 输出不含 `javascript:` 且不含 `java/**/script:` |
| `-moz-binding` 向量 | `color:red; -moz-binding:url(evil)` | 输出不含 `-moz-binding`，`color:red` 保留 |
| 合法值无误杀 | `color:red` | 输出含 `color:red` 且不为空字符串 |

全部 4 个新测试通过（vitest 12/12 绿）。断言有效性：均绑定被测函数的真实返回值，无 mock 替换被测模块，断言强度符合 security_sensitive 任务要求。

**R-005 已闭环。**

---

## 维持 r1 结论的问题（[previously-approved r1]）

以下问题在 r1 中无 CRITICAL/HIGH，r2 增量审查未触碰其涉及代码，维持 r1 结论：

| 编号 | 严重等级 | 状态 | 说明 |
|------|---------|------|------|
| R-001 | MEDIUM | [previously-approved r1] | postPaste schema default(false) 静默截断风险；T-030 前补测试锚定 |
| R-003 | LOW | [previously-approved r1] | applySanitizeExtension 类型强转可破坏元组 allowlist；当前内置 schema 不触发 |
| R-004 | MEDIUM | [previously-approved r1] | AC-005 schema 测试未覆盖 postPaste: true 穿透路径；T-030 实现前补锚定 |

---

## 问题汇总（r2 增量新增：无）

r2 未发现新增问题。R-002（HIGH）和 R-005（MEDIUM）已闭环，R-001/R-003/R-004 维持 r1 notes 状态。

---

## 判定结论

**verdict: approved_with_notes**

r1 中唯一的 HIGH 问题 R-002 已闭环；全部残留问题为 MEDIUM/LOW。

| 编号 | 严重等级 | category | 状态 |
|------|---------|----------|------|
| R-001 | MEDIUM | security | notes — T-030 前补 postPaste: true 穿透测试 |
| R-002 | HIGH | security | **已闭环**（归一化 + 模式补全 + 测试锚定） |
| R-003 | LOW | error-handling | notes — 元组 allowlist 类型强转，当前内置 schema 不触发 |
| R-004 | MEDIUM | test-quality | notes — AC-005 缺 postPaste: true 穿透测试，T-030 前补锚定 |
| R-005 | MEDIUM | test-quality | **已闭环**（4 个转义绕过测试全绿） |

**notes_summary**: R-001/R-004 需在 T-030（composeCopy postPaste: true 路径）实现前补充测试锚定，防止 schema `.default(false)` 静默截断真值；R-003 类型强转属 LOW 技术债，当前不触发，可在 schema API 稳定后修正。
