---
id: "review-arch-wechat-flow-r6"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "prd-wechat-flow", "prd-wechat-flow-f001-f014"]
---
# REVIEW: arch-wechat-flow r6（amendment 增量审查）

**被审文档**: `docs/arch/arch-wechat-flow.md`（主卷）、`docs/arch/arch-wechat-flow-modules.md`（modules 分卷）、`docs/arch/arch-wechat-flow-api.md`（api 分卷）、`docs/research/tech-eval-css-inlining.md`（rn-006）
**审查范围**: amendment 增量（Q3.9 重写 / Q3.15 / Q3.16 新增；API-034；customCss；Tool 计数 23→24；§5.3 安全表扩展；rn-006 新建）
**上轮报告**: `docs/reviews/doc/REVIEW-arch-wechat-flow-r5.md`

---

## Layer 1 结论

| 文件 | 结果 | 说明 |
|------|------|------|
| arch-wechat-flow.md（主卷） | exit 1 | FAIL: status=approved 但 Layer 1 未匹配历史审查报告（同主卷 Layer 1 假阳性，r5 已存在）；WARN 3 条（行数超阈值、API/E 编号不连续因分卷分布，历史既存） |
| arch-wechat-flow-modules.md | exit 0 + WARN | WARN 3 条：行数超阈值、API/E 编号跨卷不连续，历史既存 |
| arch-wechat-flow-api.md | exit 0 + WARN | WARN 2 条：行数严重超阈值（1076 行）、M-NNN 编号不连续（因 modules/api 拆分），历史既存 |
| tech-eval-css-inlining.md（rn-006） | exit 1 | FAIL: status=approved 但无历史 review 报告（新文件，真实 FAIL）；FAIL: 缺少 [NAV] 块（research-note 文档类型要求通用 NAV，但 research-note 在 Layer 1 检查中为"未知类型"降级处理，此 FAIL 为框架对 research-note 文件类型的 NAV 检查判定，实际 research-note 格式通常不强制 NAV） |

**Layer 1 评估**：主卷与 rn-006 的 FAIL 分析：
- 主卷 FAIL（无审查报告）：历史假阳性，r5 已存在，不作为新增问题。
- rn-006 FAIL（无历史审查报告 + 无 NAV）：rn-006 为本次 amendment 新建文件，首次接受审查。`research-note` doc_type 在 Layer 1 被识别为"未知模板"并仅做通用检查；NAV 块对 research-note 的必要性存疑（`changelog` 亦豁免 NAV 检查）。依 SKILL.md 规约：Layer 1 降级异常进入 Layer 2。

所有分卷进入 Layer 2。

---

## Layer 2 语义审查

### 维度一：一致性（consistency）—— Tool 计数 24 五处字面对账

| 位置 | 内容 | 是否一致 |
|------|------|---------|
| prd#§1.2.2 | "覆盖 24 个 Tool（20 同步 + 4 异步）" | 是 |
| arch 主卷 §3 MCP Tool 总数对账段 | "§3.1 共 24 个 Tool（20 同步 + 4 异步）" | 是 |
| arch api 分卷 API-016 说明段 | "Tool 总数为 24（20 同步 + 4 异步）" | 是 |
| arch modules M-009 职责行 | "对 LLM Agent 暴露 24 个 Tool（20 同步 + 4 异步长任务）" | 是 |
| arch modules M-009 对外接口行 | "MCP Tool（24 个，20 同步 + 4 异步）" | 是 |

**五处字面一致**，计数对账通过。

**F-013 行（§8.1 功能映射表）旧值遗留**：arch 主卷第 406 行 F-013 映射行仍为：
> `M-009 (MCP server, 23 Tool — 含 API-033 describe_template)`

这是 amendment 的遗漏点——§8.1 F-013 行未随 Tool 计数 23→24 一并更新，与同文档 §3 对账段（24）、§8.2 Q3.16 结尾（"MCP Tool 总数 23 → 24"）相矛盾。

### 维度二：一致性（consistency）—— API-034 与 PRD F-010 AC-010 契约对齐

| PRD F-010 AC-010 要求 | arch API-034 落地 | 对齐状态 |
|---------------------|------------------|---------|
| 向已有 Block 注册自定义样式容器 variant | `blockId` + `variantId` + `label` + `style` 四字段 request，注册到 M-005 registry | 对齐 |
| 与 AC-006 共享同一注册语义与自动校验链路（白名单标签/CSS/variant 申报一致性，见 AC-005） | 注册路径走 M-005 `registry/variant.ts` + F-010 AC-005 校验链路 | 对齐 |
| 注册成功后立即可被 `list_block_variants` / `describe_variant` 发现并在 Markdown 中引用 | API-034 response 含 `registered: boolean` + `variantId`；`list_block_variants` 直达 M-005 存储（进程内） | 对齐 |
| 生命周期与持久化语义由 architect 阶段决策 | Q3.16 明确"进程内生命周期，重启即失，不持久化" | 对齐，arch 已决策 |

**AC-010 与 API-034 契约语义完整对齐**。

### 维度三：完整性（completeness）—— API-034 request/response 完整性

API-034 定义包含：
- request body：`blockId`（required）、`variantId`（required）、`label`（required）、`style`（required，`Record<string, Record<string, string>>`，槽位键 → 声明 map）
- response schema：`registered`（boolean）、`variantId`（string）、`rejectedDeclarations`（含 `slot/property/value/reason`）
- errors：`E_BLOCK_NOT_FOUND`（404）、`E_VARIANT_CONFLICT`（409）、`E_SLOT_UNKNOWN`（422）
- Zod schema：完整 `RegisterVariantRequestSchema` 与 `RegisterVariantResponseSchema`

**API-034 request/response 完整**，符合 arch 规范（每个 API 含完整 request/response）。

注：`E_SCHEMA`（400，入参校验失败）在其他 API（如 API-017）均有定义，但 API-034 未列出。当 `style` 字段为空 map 或 `blockId`/`variantId` 为空字符串时，缺少明确的 400 处理路径。

### 维度四：一致性（consistency）—— Q3.9/Q3.15/Q3.16 与 §1.4 技术栈表、M-002/M-005 无矛盾

**Q3.9（混合架构）** 与 §1.4 技术栈表：
- §1.4 拆两行（token 层自研 + cascade 层 juice），与 Q3.9 描述完整对应，无矛盾。

**Q3.15（三层合成）** 与 M-002 stage 5 / M-005 / M-012：
- M-002 stage 5 描述（`pipeline/inline-style.ts` + `pipeline/custom-css.ts`）、M-005 `getBlockBaseStyle` 暴露接口、M-012 `theme-definition.ts` 的 `blocks` 槽位语义为 token override——三层模型（L1 base-style / L2 token override / L3 custom CSS）在各模块文档中完整且一致。

**Q3.16（双轨接口）** 与 M-009 / M-005 / API-001 / API-034：
- M-009 router.ts 注释"`register_variant` 直达 M-005 `registerVariant(...)`，注册条目进程内生命周期见 §8.2 Q3.16"
- M-005 对外接口段含 `registerVariant({ blockId, id, label, style })` 与 `getBlockBaseStyle(blockId, variantId)`
- API-001 request 新增 `customCss` 参数
- API-034 完整定义

Q3.9/Q3.15/Q3.16 三条决策与 §1.4/M-002/M-005/M-012/API 全链路一致，**无矛盾**。

### 维度五：安全（security）—— 自定义样式提交过滤闭环

§5.3 安全表"自定义样式提交"行描述过滤链：
1. `css-attr-filter` 白名单逐声明过滤（拒绝 `expression(`/`javascript:`/`behavior:`/`@import`/`url(` 非 https）
2. 选择器仅静态子集（伪类/媒体查询/keyframes 不参与内联）
3. 被拒绝项结构化诊断回传，不静默
4. juice cascade pass 输出全树重过白名单后才进 canonical 序列化

M-002 `pipeline/custom-css.ts` 描述与 §5.3 完全对应，过滤顺序（juice cascade → 全树重过 `css-attr-filter`）闭环。API-034 `style` 字段"逐声明经 css-attr-filter 白名单校验"也有明确声明，安全闭环完整。

### 维度六：可行性（feasibility）—— juice 条件分支与 CI fixture 兼容性论证

Q3.9 明确："**条件分支**：无 custom CSS 时不进入 juice pass，token 路径产物字节级不变"。此设计确保既有 CI SHA-256 fixture 基线不受扰动——无 customCss 调用的渲染路径与未引入 juice 前完全等价，现有测试无需改动。

rn-006 结论第 3 条也明确了条件分支语义，论证完整。

### 维度七：完整性（completeness）—— rn-006 含选项对比与重评条件

rn-006 包含：
- 四方案矩阵（A/B/C/D）对比
- 两类样式来源的能力匹配度评估
- 依赖链跨运行时审计
- 混合架构结论（A + B 条件分支）
- 重评条件（三条：juice 漂移不可控 / bundle 体积突破 / 选择器需求超静态子集）

结构完整。

**rn-006 一个潜在问题**：rn-006 的 `doc_type: research` 与 Layer 1 要求的 `doc_type: research-note` 不匹配。根据 SKILL.md Layer 1 检查项，`research-note` 文档类型是合法枚举值。rn-006 frontmatter 使用 `doc_type: research` 而非 `doc_type: research-note`，这将导致 Layer 1 校验器无法识别类型、降级处理，且后续 `cataforge docs index` 按 `doc_type: research` 入索引而非 `research-note`，可能影响按类型查询。

---

## 问题列表

### [R-001] HIGH: arch 主卷 §8.1 F-013 映射行 Tool 计数遗留旧值 "23"
- **category**: consistency
- **root_cause**: self-caused
- **描述**: `docs/arch/arch-wechat-flow.md` 第 406 行 F-013 功能映射行描述为"M-009 (MCP server, 23 Tool — 含 API-033 describe_template)"，与同文档 §3 MCP Tool 总数对账段（24）、§8.2 Q3.16 结尾（"MCP Tool 总数 23 → 24"）、PRD §1.2.2（24）、M-009 职责行（24）、API-016 说明（24）相矛盾。此遗留旧值形成文档内部自相矛盾，且 F-013 映射行是 tech-lead 和 dev-plan 的直接参考点，会误导 Sprint 4 任务卡生成。
- **建议**: 将 F-013 行"23 Tool"改为"24 Tool"，并将描述更新为"M-009 (MCP server, 24 Tool — 含 API-033 describe_template + API-034 register_variant)"，与 §3 对账行保持一致。

### [R-002] MEDIUM: API-034 缺少 E_SCHEMA（400）错误定义
- **category**: completeness
- **root_cause**: self-caused
- **描述**: API-034 定义了 `E_BLOCK_NOT_FOUND`（404）、`E_VARIANT_CONFLICT`（409）、`E_SLOT_UNKNOWN`（422）三个错误码，但缺少 `E_SCHEMA`（400）——当 `blockId`/`variantId`/`label` 为空字符串或 `style` 为空 map 时，Zod schema 校验失败应走 400 路径。其他 API（API-017 等）均显式定义 `E_SCHEMA: 400`，API-034 遗漏造成契约不完整，实现方可能忽略 schema 校验异常处理。
- **建议**: 在 API-034 response.errors 段补充：`ValidationError: { code: "E_SCHEMA", http: 400, desc: "入参校验失败（blockId/variantId/label 为空，或 style 格式不符合 Record<string, Record<string, string>>）" }`。

### [R-003] MEDIUM: rn-006 frontmatter doc_type 值为 "research" 而非 "research-note"
- **category**: convention
- **root_cause**: self-caused
- **描述**: `docs/research/tech-eval-css-inlining.md` frontmatter 中 `doc_type: research`，但 SKILL.md 定义 doc-review 的合法 doc_type 枚举为 `research-note`（而非 `research`）。此不一致导致：(1) Layer 1 将 rn-006 识别为"未知文档类型"并回退通用检查；(2) `cataforge docs index` 将以 `doc_type: research` 入索引，与其他 research note（如 `tech-eval-stack-sanitizer.md`）类型一致性存疑（需确认其他 rn-* 文件的 doc_type 值）。
- **建议**: 统一修改 rn-006 的 `doc_type` 为 `research-note`，与 SKILL.md 枚举定义保持一致；同时确认其他 rn-* 文件的 doc_type 值是否也需统一（若项目约定使用 `research` 而非 `research-note`，则应相应修订 SKILL.md 枚举）。

### [R-004] LOW: arch 主卷 §8.2 Q3.15 详细决策记录段未在 §8.2 决策表中体现 Q3.15 "为什么选 (B)" 对比叙事
- **category**: completeness
- **root_cause**: self-caused
- **描述**: §8.2 末尾"Q3.15 详细决策记录"段（第 461 行附近）包含"为什么选 (B)"的方案 A/B 对比叙事，提到"(B) 的合成层复杂度被三层模型统一吸收"，但并未列出方案 A（"内置主题直接携带合成后副本"）的重评条件（何种情况下退回方案 A）。Q3.9/Q3.15 的重评条件仅在 rn-006 中声明，arch 主卷 Q3.15 决策记录缺少对应的重评触发条件描述，使决策记录不完整（参考 Q3.8 与 Q3.9 均有明确重评条件）。
- **建议**: 在 Q3.15 详细决策记录末尾补充重评条件，例如："重评条件：(1) L1 base-style 跨主题 variant 数量爆炸式增长，M-005 registry 持有的静态 base-style 集合超过可接受内存边界；(2) T-058 视觉回归实测发现三层合成有主题-token-custom 优先级冲突无法在现有模型内解决"。

---

## 判定结论

**verdict: needs_revision**

存在 1 条 HIGH 问题（R-001：F-013 行 Tool 计数旧值遗留，文档内部自相矛盾）。需修复后重审。

MEDIUM 2 条（R-002：API-034 缺 E_SCHEMA 400；R-003：rn-006 doc_type 枚举不符），LOW 1 条（R-004：Q3.15 决策记录缺重评条件）。
