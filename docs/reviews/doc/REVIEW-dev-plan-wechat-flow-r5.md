---
id: "review-dev-plan-wechat-flow-r5"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow"]
---

# REVIEW: dev-plan-wechat-flow — r5 (L3 cascade amendment 门禁审查)

> 审查范围：T-118..T-122 五张新增任务卡 + 计数 23→24 全卷同步（主卷 / s4 / s5 / s6）  
> 上游依赖：arch-wechat-flow-api#§3.API-034、arch-wechat-flow#§8.2（Q3.9/Q3.15/Q3.16）、arch-wechat-flow-modules#§2.M-005

---

## Layer 1 结果

| 卷 | 退出码 | 关键输出 | 是否阻塞 amendment 审查 |
|----|--------|---------|----------------------|
| 主卷 | exit 1 | FAIL: status=approved 但脚本此刻找不到已有 r* 文件（时序误报，r1-r4 已存在）；WARN: 行数超阈值；WARN: ID 不连续 | 不阻塞（既有已知问题，非 amendment 引入） |
| s4 | exit 1 | FAIL: 1 任务缺 deliverables（T-111 validation 卡，既有）；WARN: ID 不连续（sprint 分卷预期）；WARN: AC 无可观测动词 | 不阻塞 |
| s5 | exit 1 | FAIL: 1 任务缺 deliverables（既有）；同上 WARN | 不阻塞 |
| s6 | exit 1 | FAIL: 1 任务缺 deliverables（既有）；同上 WARN | 不阻塞 |

全部 Layer 1 失败均为既有问题（amendment 前已存在），不属于本次新增范围的引入缺陷，进入 Layer 2 语义审查。

---

## Layer 2 语义审查

### CRITICAL（无）

### HIGH

---

### [R-001] HIGH: T-085 任务卡 dependencies 与主卷 Sprint 表、依赖图不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: `docs/dev-plan/dev-plan-wechat-flow-s6.md` 的 T-085 任务卡（line 589）`dependencies` 字段为 `[T-079, T-080, T-081, T-082, T-083, T-084, T-122]`，缺少 `T-092`。而主卷（dev-plan-wechat-flow.md line 189）Sprint 6 任务表同行显示 `T-079,...,T-084,T-092,T-122`；主卷依赖图同时有 `T-092 --> T-085` 边。主卷任务表、依赖图、s6 任务卡三处不一致，实现者读到 s6 卡时会漏掉 T-092 依赖，导致 Skill bundle 在主题 template 产出未落地前即可进入实现，后续 AC-005 集成测试（mock 24 个 Tool 含 `describe_template`）实际无法验证 template 内容注册路径。
- **建议**: 将 s6 卷 T-085 任务卡 `dependencies` 改为 `[T-079, T-080, T-081, T-082, T-083, T-084, T-092, T-122]`，与主卷一致。

---

### MEDIUM

---

### [R-002] MEDIUM: T-122 缺少 E_SCHEMA 与 E_SLOT_UNKNOWN 错误路径 AC

- **category**: completeness
- **root_cause**: self-caused
- **描述**: API-034（arch-wechat-flow-api.md line 494-498）定义四个错误码：`E_SCHEMA`（入参校验失败：blockId/variantId/label 为空字符串或 style 结构不合法）、`E_BLOCK_NOT_FOUND`、`E_VARIANT_CONFLICT`、`E_SLOT_UNKNOWN`（style 含该 Block 渲染模板未声明的槽位键）。T-122 的四条 AC 仅覆盖 happy path（AC-001）、白名单拒绝（AC-002）、E_BLOCK_NOT_FOUND（AC-003）、production path wiring（AC-004）。`E_SCHEMA` 与 `E_SLOT_UNKNOWN` 两条错误路径完全缺失。`E_SLOT_UNKNOWN` 属 Tool 层独有的槽位结构校验逻辑（422 语义），在 T-119 M-005 层测试中也未涵盖，整个链路缺乏此路径测试覆盖。
- **建议**: 在 T-122 追加至少两条 AC：(a) 给定 `style` 含该 Block 未声明槽位键（如 `{ footer: { ... } }`），When 调用，Then 返回 `{ code: 'E_SLOT_UNKNOWN' }`；(b) 给定 `label` 为空字符串，When 调用，Then 返回 `{ code: 'E_SCHEMA' }`。

---

### [R-003] MEDIUM: 主卷任务总数声明未随 T-118..T-122 更新

- **category**: consistency
- **root_cause**: self-caused
- **描述**: 主卷（dev-plan-wechat-flow.md line 403）§3 标题仍写 `共 **101 任务卡**（82 code + 12 design + 7 validation）`。新增 T-118..T-122 五张任务卡（均为 feature 类型）后，正确计数应为 `106 任务卡（87 code + 12 design + 7 validation）`。数字不对会让读者/工具误判任务覆盖率。
- **建议**: 将主卷 §3 开头任务卡计数更新为 `共 **106 任务卡**（87 code + 12 design + 7 validation）`。

---

### [R-004] MEDIUM: T-122 field 名称拼写错误（modular 应为 module）

- **category**: convention
- **root_cause**: self-caused
- **描述**: T-122 任务卡（s4 line 772）字段名为 `- **modular**: M-009 (MCP server)`，但所有其他任务卡均使用 `- **模块**: M-xxx (...)` 或 `- **module**: M-xxx`。`modular` 是非法字段名，doc-review Layer 1 的 deliverables 结构化解析会跳过此字段。实际上这是既有任务卡使用中文 `- **模块**:` 格式，T-122 用了英文变体且写错了单词，导致字段识别失败。
- **建议**: 将 T-122 的 `- **modular**: M-009 (MCP server)` 改为 `- **模块**: M-009 (MCP server)` 与其他任务卡格式一致。

---

### LOW

---

### [R-005] LOW: T-119 未验证 M-005 `default` 键必含守护逻辑

- **category**: completeness
- **root_cause**: self-caused
- **描述**: arch Q3.15 明确「M-012 `theme/theme-definition.ts` 的 `blocks` 槽位 `default` variant 键必含」，但 T-118 AC-004 注明「`default` 键无特殊校验（由 guard 逻辑在 M-005 处执行）」。然而 T-119 的 5 条 AC 中没有一条测试当 `themeBlocksSchema` 条目缺少 `default` 键时 M-005 guard 是否正确拒绝或发出警告。该守护逻辑在实现层有明确归属（M-005），但在任务卡验收条件中没有可观测的测试锚点。
- **建议**: 在 T-119 追加一条 AC 或 note，明确 M-005 `validateThemeGuard` 在 blocks 条目缺少 `default` variant 键时的行为（报 warning 或 error），使实现者有明确的行为规范可循。

---

### [R-006] LOW: s6 卷 T-058 dependencies 新增 T-121 后，s6 本地依赖说明段落未同步

- **category**: consistency
- **root_cause**: self-caused
- **描述**: s6 卷 T-058 任务卡 `dependencies` 已追加 `T-121`（line 144），主卷依赖图也有 `T-121 --> T-058` 边（line 363）。但 s6 卷无本地依赖图，读者阅读 s6 时需要跳到主卷才能理解跨 Sprint 依赖（T-121 在 Sprint 4，T-058 在 Sprint 6）的原因。目前主卷关键路径段落（line 389）已正确说明此链路，但 s6 T-058 任务卡本身没有 context_load 或 note 解释为何跨 Sprint 依赖 T-121。
- **建议**: 在 s6 T-058 `context_load` 中追加 `arch-wechat-flow-modules#§2.M-002`（容器渲染缝隙背景），或在任务卡 `notes` 字段简短说明「依赖 T-121 以确保容器 directive 展开逻辑就绪后再跑视觉回归」，便于读者理解跨 Sprint 依赖的动机。

---

## 三态判定

存在 1 个 HIGH（R-001: T-085 依赖不一致）：**needs_revision**

| 等级 | 数量 | 问题编号 |
|------|------|---------|
| CRITICAL | 0 | — |
| HIGH | 1 | R-001 |
| MEDIUM | 3 | R-002, R-003, R-004 |
| LOW | 2 | R-005, R-006 |

**verdict: needs_revision**

修复必须项：R-001（s6 T-085 dependencies 补 T-092）。  
建议同步修复：R-002（T-122 补 E_SCHEMA/E_SLOT_UNKNOWN AC）、R-003（主卷任务计数 101→106）、R-004（T-122 字段名 modular→模块）。
