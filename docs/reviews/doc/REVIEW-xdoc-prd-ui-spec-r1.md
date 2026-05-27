---
id: "review-xdoc-prd-ui-spec-r1"
doc_type: review
author: reviewer
status: approved
deps: ["prd-wechat-flow", "prd-wechat-flow-f001-f014", "ui-spec-wechat-flow", "ui-spec-wechat-flow-p001-p005", "ui-spec-wechat-flow-c001-c014", "review-xdoc-prd-arch-dev-plan-r2"]
---
# 跨文档一致性审查：PRD × ui-spec（r1）

**审查范围**: PRD 主卷 + F-001..F-014 分卷 ↔ ui-spec 主卷 + pages 分卷 + components 分卷  
**审查类型**: PRD↔ui-spec 专审（不重复 ARCH/dev-plan 内部问题，除非 PRD↔ui-spec 冲突传导下游）  
**审查方法**: Composer 2.5 Fast 子代理（readonly）+ Grep/Read 复核  
**关联**: `REVIEW-xdoc-prd-arch-dev-plan-r2`（XDOC-013）

---

## 审查结论

**verdict: needs_revision**

ui-spec 主布局与设计系统结构完整，但与 PRD 在 F-001/F-014 输入辅助、F-014 确认流、F-012 发布边界、F-008 模板市场、F-006 图片上传等 P0/P1 能力上存在 **6 条 HIGH** 级冲突或缺口。修订前不宜作为单一 UI 实现门禁。

**Sprint 0 / Penpot**：可并行推进 Token 与设计系统；**F-014 Modal、F-006 上传、F-012 协作 UI** 须在 product 决策后修订 ui-spec 再进入实现验收。

---

## F → P → C 覆盖矩阵

| F-NNN | PRD 优先级 | ui-spec 覆盖（P / C） | 缺口 |
|-------|-----------|----------------------|------|
| F-001 写作体验 | P0 | P-001、P-002、P-004；C-001..C-016 | F-001 AC-007 与 F-014 冲突（P-004 默认开）；AC-008 与 C-009 Q6 冲突；::: 补全/schema 诊断、撤销/查找 UI 未定义；DRAFT 状态栏缺夜间/可读性/违规词 |
| F-002 视觉一致性与预览 | P0 | P-001；C-005、C-013、C-013.1 | 夜间模式风险（AC-003/004）无 UI；DRAFT 顶栏深浅色无规格 |
| F-003 主题与组件系统 | P0 | P-001、P-003（部分）；C-006、C-007、C-008、C-015 | paint/base-color 抽屉（AC-010/011）缺失；Block variant 展开仅角标 |
| F-004 一键复制与 HTML 导出 | P0 | P-001、P-005；C-003、C-005、C-009、C-010、C-011、C-016 | 桌面无 primary「复制到公众号」；复制前粘贴模拟用户感知未描述；剪贴板降级与 AC-007 不一致 |
| F-005 长图、封面与素材库 | P1 | C-009 导出组、C-012、C-014 | 素材库上传（AC-003）无 UI；长图/封面未在 PRD DRAFT「...」菜单体现 |
| F-006 图片处理 | P0 | P-004 图床配置 | 编辑器内上传/占位/重试无组件；C-016 误映射「F-006 (导出)」 |
| F-007 微信平台适配规则集 | P0 | C-013、C-013.1 | 规则引擎无独立 UI（合理）；兼容性经 C-013 覆盖 |
| F-008 模板市场 | P1 | P-003（标注 F-008） | P-003 实为**主题市场**，非场景模板/`template` 选用 |
| F-009 主题继承与品牌包 | P2 | P-004 | P2；品牌包 UI 基本覆盖 |
| F-010 开发者扩展 | P1 | 无 Web UI | CLI 可不出 ui-spec；DRAFT「开发者控制台」无 UI |
| F-011 质量保障 | P0/P1 | P-001；C-013、C-013.1 | 可读性/违规词（AC-006/007）未进状态栏 |
| F-012 协作与同步 | P2 | P-001、P-004；C-001、C-005.1 | PRD 主卷不在发布范围；ui-spec 完整 Yjs/冲突 UI |
| F-013 程序化调用 | P1 | 无 Web UI | 合理 |
| F-014 中文排版修订 | P1 | P-001；C-004、C-016 | diff 预览 + 确认（AC-003）无 Modal；入口与 AC-006 相反 |

---

## 问题列表

### [UXDOC-001] HIGH — consistency — F-001 自动输入辅助 vs F-014 显式确认 vs P-004

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-001 AC-007、AC-008；F-014 AC-001/003/006；`ui-spec-wechat-flow-p001-p005.md` P-004 编辑器分组
- **description**: F-001 AC-007 要求中英文**自动**加空格、智能引号、破折号；F-014 要求**显式触发**、diff + 确认，备注「**非自动**」；P-004 写「自动加空格（默认开）」「智能引号（默认开）」。
- **impact**: 阻塞输入层、P-004 默认值、F-014 与 E2E；与 XDOC-013 同源。
- **suggestion**: product-manager 二选一三文档同步；（A）收窄 F-001 AC-007，实时辅助默认关；（B）区分实时辅助与 F-014 批量修订。ui-designer 修订 P-004 开关语义。

---

### [UXDOC-002] HIGH — completeness — F-014 diff 预览 Modal 缺失

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-014 AC-003、AC-004；`ui-spec-wechat-flow-c001-c014.md` C-016
- **description**: PRD 要求 diff 预览、逐 rule 计数、确认后写回、纳入 undo。C-016 仅「触发扫描与建议」，无 Modal ID、确认/取消、rule 计数、与 C-004 undo 联动。
- **impact**: F-014 P1 无法 UI/Penpot 验收；dev-plan T-044 期望 form-variant Modal。
- **suggestion**: ui-designer 新增 C-017 ZhTypoReviseDialog（或扩展 C-012）：双栏 diff、rule 计数、确认/取消、Toast。

---

### [UXDOC-003] HIGH — consistency — F-014 入口：命令面板 vs C-009 排除

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-014 AC-006、F-001 AC-008；`ui-spec-wechat-flow-c001-c014.md` C-009 注释
- **description**: PRD 要求命令面板（Ctrl+K）**与**「...」菜单；C-009 声明 F-014 **不进入**命令面板，仅 C-016。
- **impact**: 与 PRD AC 直接冲突。
- **suggestion**: product-manager 确认修订 PRD 或 ui-spec C-009 增加「中文排版修订」动作。

---

### [UXDOC-004] HIGH — consistency — F-012 非目标 vs ui-spec 协作 UI

- **category**: consistency
- **root_cause**: upstream-caused
- **location**: `prd-wechat-flow.md` §4；`ui-spec-wechat-flow-p001-p005.md` P-001、P-004；`ui-spec-wechat-flow-c001-c014.md` C-001、C-005.1
- **description**: PRD 声明不做实时多人协作、F-012 不在发布范围。ui-spec 含协作开关、同步地址、Yjs 七态、conflict Tag。
- **impact**: v1 可能实现不应交付的协作 UI。
- **suggestion**: product-manager 明确 v1 stub/隐藏；ui-designer 标注 `[v1 不交付]` 或删除同步/冲突规格。

---

### [UXDOC-005] HIGH — mapping — F-008 模板市场 vs P-003 主题市场

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-008 AC-001..004；`ui-spec-wechat-flow-p001-p005.md` P-003
- **description**: F-008 要求场景模板与 `template` frontmatter；P-003 为内置/社区**主题**卡片，无模板预览/选用。
- **impact**: F-008 P1 在 ui-spec 中未覆盖；F 映射误导任务归属。
- **suggestion**: product-manager 澄清 v1 是否隐式内置模板；或 ui-designer 新增模板市场页/Tab。

---

### [UXDOC-006] HIGH — completeness — F-006 编辑器内上传 UI 缺失

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-006 AC-001..004；`ui-spec-wechat-flow-p001-p005.md` P-004；`ui-spec-wechat-flow-c001-c014.md` C-016
- **description**: PRD P0 要求多图床、压缩/去 EXIF、占位与重试。ui-spec 仅 P-004 凭据配置；C-016 误写「F-006 (导出)」。
- **impact**: 文中插图路径无 UI 规格。
- **suggestion**: ui-designer 补充上传组件（拖拽/粘贴、进度、重试、占位）；修正 C-016 映射。

---

### [UXDOC-007] MEDIUM — completeness — F-002 夜间模式风险 UI

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-002 AC-003、AC-004；F-001 DRAFT 顶栏
- **description**: PRD 要求夜间风险预警与预览深底；ui-spec 无切换、night-risk 态、状态栏指标。
- **suggestion**: ui-designer 在 C-003/C-005 或顶栏补充 night-risk 模式。

---

### [UXDOC-008] MEDIUM — completeness — F-003 paint/base-color 抽屉

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-003 AC-010、AC-011
- **description**: PRD 要求 paint 双向绑定与 base-color 派生预览；ui-spec 无 Drawer/Modal。
- **suggestion**: ui-designer 新增配色抽屉并挂接 C-007 或左栏主题 Tab。

---

### [UXDOC-009] MEDIUM — clarity — F-001 AC-004 双向高亮规格不足

- **category**: ambiguity
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-001 AC-004；`ui-spec-wechat-flow-c001-c014.md` C-005 约束
- **description**: ui-spec 仅一句「高亮联动」，无点击行为、outline、scroll-into-view、双向 cursor 表。
- **suggestion**: ui-designer 在 C-004/C-005 补充联动行为与 highlight Token。

---

### [UXDOC-010] MEDIUM — completeness — ::: 内联补全与 schema 诊断

- **category**: completeness
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-001 AC-002、DRAFT；C-004、C-015
- **description**: 无 CodeMirror AutocompletePopover、variant 二级选择、diagnostic gutter。
- **suggestion**: ui-designer 扩展 C-004 子节或引用 C-010 变体。

---

### [UXDOC-011] MEDIUM — completeness — 状态栏可读性/违规词

- **category**: completeness
- **root_cause**: upstream-caused
- **location**: F-001 DRAFT 状态栏；F-011 AC-006、AC-007；P-001；ui-spec §5.1
- **description**: PRD 规划夜间/可读性/违规词；ui-spec 仅字数/阅读时长/兼容性摘要。
- **suggestion**: product-manager 确认是否并入 C-013；ui-designer 扩展 StatusBar。

---

### [UXDOC-012] MEDIUM — consistency — 「复制到公众号」主 CTA

- **category**: consistency
- **root_cause**: self-caused
- **location**: `prd-wechat-flow-f001-f014.md` F-004；C-005、C-016、C-009、P-005
- **description**: PRD 强调 primary「复制到公众号」；ui-spec 复制分散，无桌面 primary CTA；simulate 用户感知未定义。
- **suggestion**: ui-designer 在 C-001/C-005 固定 primary 按钮与 copy-pipeline 状态。

---

### [UXDOC-013] MEDIUM — consistency — 剪贴板降级 vs PRD AC-007

- **category**: consistency
- **root_cause**: self-caused
- **location**: F-004 AC-007；ui-spec A-005、P-005 copy-fallback
- **description**: PRD 要求 `execCommand('copy')` + 快捷键提示；ui-spec 为全选 +「长按手动复制」。
- **suggestion**: product-manager 选定策略；ui-designer 对齐 A-005/P-005/C-011。

---

### [UXDOC-014] MEDIUM — clarity — 撤销/查找/字数 UI

- **category**: ambiguity
- **root_cause**: self-caused
- **location**: F-001 AC-006；C-003、C-001、C-009
- **description**: C-003 映射撤销/重做但顶栏未列按钮；查找/替换无 UI；字数仅状态栏。
- **suggestion**: ui-designer 明确快捷键 vs 顶栏 vs 命令面板。

---

### [UXDOC-015] MEDIUM — consistency — 命令面板 Q6 vs PRD registry 超集

- **category**: consistency
- **root_cause**: self-caused
- **location**: ui-spec Q6；F-001 DRAFT、AC-008
- **description**: PRD DRAFT 称命令面板为动作超集含 directive；Q6 仅 UI 动作，directive 仅 C-015。
- **suggestion**: product-manager 将 Q6 回写 PRD 或修订 AC-008。

---

### [UXDOC-016] MEDIUM — completeness — C-008 Block variant 展开

- **category**: completeness
- **root_cause**: self-caused
- **location**: F-001 DRAFT 左栏；C-008
- **description**: PRD DRAFT 要求展开 variant 列表；C-008 仅数量角标。
- **suggestion**: ui-designer 增加 expandable 态；或 product-manager 修订 DRAFT。

---

### [UXDOC-017] MEDIUM — mapping — C-016 误映射 F-006

- **category**: convention
- **root_cause**: self-caused
- **location**: `ui-spec-wechat-flow-c001-c014.md` C-016 映射行
- **description**: C-016 写「F-006 (导出)」；F-006 为图片处理。
- **suggestion**: 修正为 F-004/F-001/F-014；F-006 映射上传组件。

---

### [UXDOC-018] MEDIUM — completeness — F-005 素材库上传 UI

- **category**: completeness
- **root_cause**: self-caused
- **location**: F-005 AC-003；ui-spec 全卷
- **description**: 无「上传到素材库」入口与 C-014 Job 接线。
- **suggestion**: ui-designer 在导出/设置流补充动作；product-manager 确认 v1 P1 范围。

---

### [UXDOC-019] LOW — redundancy — PRD DRAFT「...」菜单 vs C-016

- **category**: completeness
- **root_cause**: self-caused
- **location**: F-001 DRAFT；C-016 设计决策
- **description**: PRD DRAFT 列全量菜单；ui-spec 合理省略；易误导 v1 范围。
- **suggestion**: product-manager 清理 DRAFT 或脚注「v1 以 C-016/C-009 为准」。

---

### [UXDOC-020] LOW — convention — PRD draft vs ui-spec approved

- **category**: convention
- **root_cause**: self-caused
- **location**: 各卷 frontmatter；CLAUDE.md PROJECT-STATE
- **description**: ui-spec approved，PRD draft，与 PROJECT-STATE 分裂（同 XDOC-028）。
- **suggestion**: orchestrator 统一 status。

---

### [UXDOC-021] LOW — redundancy — P-004 与 F-014 规则重叠

- **category**: completeness
- **root_cause**: self-caused
- **location**: P-004；F-014
- **description**: P-004 开关与 F-014 四类规则重叠且默认开冲突。
- **suggestion**: 随 UXDOC-001 决策合并为单一能力描述。

---

### [UXDOC-022] LOW — clarity — C-013.1 nodeChangeRecords ASSUMPTION

- **category**: ambiguity
- **root_cause**: upstream-caused
- **location**: C-013.1
- **description**: 依赖 ARCH 未明确字段。
- **suggestion**: product-manager 在 F-002/F-011 补数据结构；或维持 ASSUMPTION 至 ARCH 更新。

---

### [UXDOC-023] LOW — clarity — C-015 Tab 分类 ASSUMPTION

- **category**: ambiguity
- **root_cause**: self-caused
- **location**: C-015
- **description**: Tab 轴为 ASSUMPTION，可能与 BlockRegistry 偏差。
- **suggestion**: BlockRegistry 冻结后修订或改为动态分组。

---

## 与 REVIEW-xdoc-prd-arch-dev-plan-r2 / XDOC-013 的关系

1. **UXDOC-001 与 XDOC-013 同源**：F-001 AC-007 与 F-014「非自动」冲突；本专审**确认并细化**落点为 **P-004**（XDOC-013 曾写 P-001 状态栏，实际「默认开」在 P-004 编辑器分组）。
2. **本报告不重复** XDOC-014~020 等 ARCH/dev-plan 项，除非 PRD↔ui-spec 陈述冲突（如 UXDOC-012 复制流程用户感知）。
3. **处理顺序**：先 product-manager 闭合 XDOC-013/UXDOC-001 → ui-designer 修 UXDOC-002/004/006 → 再同步 ARCH/dev-plan。
4. **verdict 对齐**：r2 对 XDOC-013 为 open HIGH；本专审 **needs_revision** 一致。

---

## 责任分工

| 责任方 | 优先 UXDOC ID |
|--------|----------------|
| product-manager | UXDOC-001, 003, 004, 005, 011, 015, 018, 019, 020, 021 |
| ui-designer | UXDOC-002, 006, 007, 008, 009, 010, 012, 013, 016, 017, 022, 023 |
| orchestrator | UXDOC-020（关联 XDOC-028） |

---

## 统计

| 严重等级 | 数量 | ID |
|----------|------|-----|
| CRITICAL | 0 | — |
| HIGH | 6 | UXDOC-001..006 |
| MEDIUM | 12 | UXDOC-007..018 |
| LOW | 5 | UXDOC-019..023 |
| **合计** | **23** | |

**建议优先修复**：UXDOC-001 → UXDOC-003 → UXDOC-002 → UXDOC-004 → UXDOC-006 → UXDOC-005
