---
id: "review-ui-spec-wechat-flow-r2"
doc_type: review
author: reviewer
status: approved
deps: ["ui-spec-wechat-flow", "ui-spec-wechat-flow-c001-c014", "ui-spec-wechat-flow-p001-p005"]
---
# REVIEW: ui-spec-wechat-flow r2

**被审文档**: 主卷 `ui-spec-wechat-flow` (v0.1.1) + 分卷 `ui-spec-wechat-flow-c001-c014` (v0.1.1) + 分卷 `ui-spec-wechat-flow-p001-p005`
**审查轮次**: r2（r1 → r2 增量审查；基于修订版本执行）
**Layer 1 结果**: 主卷 PASS（WARN×1）；components 分卷 PASS（WARN×2，原 r1 FAIL 已消除）；pages 分卷 PASS（WARN×1）
**Layer 2**: 已执行增量 AI 语义审查（聚焦 diff 新增内容）

---

## §修订验证：r1 三条 HIGH 闭合状态

### [R-001] HIGH → 已闭合

**原问题**：9 个组件缺少 `variant` 字段，导致 components 分卷 Layer 1 FAIL。

**验证结论**：Layer 1 components 分卷已从 FAIL 变为 PASS。核查修订内容：C-001、C-002、C-004、C-006、C-007、C-008、C-009、C-010、C-013、C-014 均已补充 `**变体 (variant)**: 单一形态组件，无 variant 区分` 声明；C-011 补充了 `**变体 (variant)**：info / success / warning / error`；C-012 补充了 `**变体 (variant)**：confirm / form`；C-015 补充了 `panel / inline`。Layer 1 门禁已通过，此 HIGH 问题正式闭合。

---

### [R-005] HIGH → 已闭合

**原问题**：「+」InsertDrawer 和「...」ContextMenu 缺少 UI 规范，C-001 布局无位置标注。

**验证结论**：

1. **C-015 InsertDrawer** 已新增完整规范，包含：触发方式（点击顶栏「+」按钮）、布局（宽 320px，右侧滑入抽屉）、内部结构（标题行 + 分类 Tab 行 + 组件列表 + 底部参数表单 + 实时预览 iframe）、状态表（5 态：closed/opening/idle/item-selected/closing）、变体（panel/inline）、Props 定义。

2. **C-016 ContextMenu** 已新增完整规范，包含：触发方式（「...」按钮）、布局（继承 C-010 样式）、菜单结构表（8 项含图标/快捷键/语义）、状态表（5 态）、变体声明、Props 定义。

3. **C-001 TopBar 布局**已更新，工具栏按钮组从左到右顺序明确标注：「+」插入按钮（触发 C-015）、视口切换器、「...」次级菜单按钮（触发 C-016）、用户菜单（最右侧），位置标注完整。

此 HIGH 问题正式闭合。

---

### [R-006] HIGH → 已闭合

**原问题**：同步状态指示器置于注释块而非正式规范，C-005 Props 缺 syncState，且状态枚举与 ARCH M-013 不对齐（缺 connecting、idle；conflict 缺定义）。

**验证结论**：

1. **C-005.1 同步状态指示器（SyncStateIndicator）** 已正式化为 C-005 的内嵌子规范，包含完整状态映射表（7 态：idle/connecting/syncing/synced/offline/error/conflict），覆盖每态的色点颜色 Token、pulse 动画参数、是否显示 Tag、语义说明。`connecting` 与 `idle` 的视觉差异（静态灰 vs 浅绿 + 慢速 pulse）有明确描述。`conflict` 态补充了「冲突」Tag 的完整视觉规范（`--color-error-subtle` 背景、`--color-error` 文字、`--font-size-xs`、`--radius-full`）。

2. **C-005 Props** 已新增 `syncState: 'idle' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict'`，与 ARCH M-013 `YDocBinding.sync.status` 枚举（idle/connecting/syncing/synced/error）完全包含，并额外增加了 `offline` 和 `conflict` 状态，覆盖离网和多端冲突场景。

3. **C-001 TopBar Props** 也已更新 `syncState` 枚举，与 C-005 Props 和 C-005.1 状态映射表完全对齐（7 态一致）。

**残余观察（LOW）**：ARCH M-013 `YDocBinding.sync.status` 枚举仅定义 5 态（idle/connecting/syncing/synced/error），不含 `offline` 和 `conflict`。C-005 UI 规范中的 `offline` 对应网络断开场景（非 WebSocket 状态），`conflict` 对应 Yjs 冲突场景，这两个状态需要在 M-013 之外由应用层（M-008）合成推导，目前 UI 规范中未说明推导来源。见 §本轮 diff 新增内容审查 [R-NEW-001]。

此 HIGH 问题正式闭合（注：残余的枚举来源问题另立新条目 [R-NEW-001]，严重等级 MEDIUM）。

---

## §本轮 diff 新增内容审查

### [R-NEW-001] MEDIUM: C-005.1 状态映射中 `offline` / `conflict` 来源未说明

- **category**: completeness
- **root_cause**: self-caused
- **描述**: C-005.1 状态映射表引用的 7 态枚举中，`offline` 和 `conflict` 不在 ARCH M-013 `YDocBinding.sync.status` 的 5 态定义内（idle/connecting/syncing/synced/error）。`offline` 通常来自 `navigator.onLine` 事件或 WebSocket 断开推断，`conflict` 来自 Yjs awareness/doc 冲突事件。UI 规范未说明这两个状态由哪个模块、通过什么机制推导并传入 PreviewPane 的 `syncState` prop，开发者实现时可能不知道从哪里取这两个值。
- **建议**: 在 C-005.1 的状态映射表注释处或 C-005 约束段，补充一句："`offline` 由应用层（M-008）监听 WebSocket 断开事件与 `navigator.onLine` 推导；`conflict` 由应用层监听 `YDocBinding.on('sync-status')` 中的 Yjs merge conflict 信号推导并注入"，使前端开发者明确数据来源。

---

### [R-NEW-002] MEDIUM: C-015 InsertDrawer 分类 Tab 内容与 ARCH M-001 描述未明确对齐

- **category**: consistency
- **root_cause**: self-caused
- **描述**: C-015 内部结构中列出分类 Tab 行示例为「行内」/「块级」/「标注」/「封面」四分类，但 ARCH M-001 中对 InsertDrawer 的描述是"directive 分类 tabs + 参数表单 + 实时预览"，未明确分类数量与名称。PRD F-001 AC-002 要求"directive 插入器"但也未详述分类。C-015 的四分类方案（行内/块级/标注/封面）是合理的 directive 类型分组，但"行内"和"封面"与 PRD F-001 [DRAFT_UI_INPUT] 的 block library 分组方式（未明确枚举）可能存在偏差，且这四个分类不在任何上游文档中被权威定义。
- **建议**: 在 C-015 内部结构的分类 Tab 行描述中，明确标注 `[ASSUMPTION]`："分类依据 directive 类型按行内/块级/标注/封面四组，待 dev-plan 阶段与 M-001 BlockRegistry 具体分类对齐"，避免下游实现硬编码此分组后难以调整。

---

### [R-NEW-003] LOW: C-016 菜单项与 PRD F-001 `[DRAFT_UI_INPUT]` 的「发文清单」「导出 Markdown」「清空正文」未覆盖

- **category**: completeness
- **root_cause**: upstream-caused
- **描述**: PRD F-001 [DRAFT_UI_INPUT] 的「...」次级菜单参考项包含：载入示例 / 一键修复中文排版 / 快捷键与帮助 / 发文清单 / 导出 Markdown / 导出长图 / 导出封面（横版/方版）/ 清空正文 / 末尾「更多...」跳命令面板。C-016 当前菜单结构覆盖了：载入示例文档、中文排版修订、复制 HTML、下载 HTML、快捷键手册、新功能说明。缺失：「发文清单」（未在任何 UI 规范中定义）、「导出 Markdown」（F-001 DRAFT_UI_INPUT 提及但 F-004 正文未声明 Markdown 导出为 AC）、「清空正文」（DRAFT_UI_INPUT 提及但 C-016 未包含）、「更多...」跳命令面板（DRAFT_UI_INPUT 提及）。注意：`[DRAFT_UI_INPUT]` 本身标注为"参考输入，非规范性约束"，C-016 作为 ui-designer 最终产出有权裁剪。
- **建议**: 在 C-016 组件定义中补充设计决策说明，明确哪些 DRAFT_UI_INPUT 条目被刻意排除（如「发文清单」为未实现功能、「清空正文」改为在其他路径触发）及排除理由，或标注 `[ASSUMPTION]`，避免开发者和后续设计迭代时困惑为何与参考输入存在差异。root_cause 定性为 upstream-caused（上游 DRAFT_UI_INPUT 与规范性 AC 边界不清晰，导致 ui-designer 裁剪空间模糊）。

---

### [R-009 附带修复验证] CSP 字符串已补全

**验证结论**：C-005 约束段已将 CSP 更新为完整字符串 `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;`，与 ARCH §5.3 完全一致。r1 R-009 MEDIUM 问题通过附带修复已实质性解决（该问题在 carried-over 清单中保留编号，但标注已实质闭合）。

---

## §carried-over 清单（MEDIUM/LOW，来自 r1）

以下条目来自 r1 报告，本轮未纳入修订范围，保留供 Approved-with-Notes Protocol 用户决策。

| 原编号 | 严重等级 | category | 标题摘要 | 备注 |
|--------|---------|---------|---------|------|
| R-002 | MEDIUM | convention | 主卷/components 分卷行数超 300 行阈值 | [carried-over from r1] |
| R-003 | MEDIUM | ambiguity | 组件状态视觉差异描述不足，C-004 缺 focus/blur 态 | [carried-over from r1] |
| R-004 | MEDIUM | ambiguity | 4 个页面缺少空间构成说明 | [carried-over from r1] |
| R-007 | MEDIUM | completeness | C-004 缺 CodeMirror 语法高亮色彩 Token 规范 | [carried-over from r1] |
| R-008 | MEDIUM | completeness | P-003 主题市场缺平板/移动端响应式布局描述 | [carried-over from r1] |
| R-009 | MEDIUM | consistency | C-005 CSP 简写与 ARCH §5.3 不一致 | [carried-over from r1]（已由本轮修订附带闭合，可标记为已解决） |
| R-010 | MEDIUM | completeness | F-002 AC-006 兼容性报告 diff 视图缺 UI 规范 | [carried-over from r1] |
| R-011 | MEDIUM | consistency | A-001"无账号"假设与 P-004 凭据配置存在语义张力 | [carried-over from r1] |
| R-012 | MEDIUM | consistency | C-009 动作列表缺"跳转文档"和"中文排版修订"入口 | [carried-over from r1]（注：中文排版修订入口已通过 C-016 覆盖，R-012 部分闭合；跳转文档仍缺失） |
| R-013 | LOW | completeness | Q1/Q3/Q4/Q5/Q6 决策编号无集中记录节 | [carried-over from r1] |
| R-014 | LOW | feasibility | --z-mobile-bar:500 高于 Modal:300，层叠冲突风险 | [carried-over from r1] |
| R-015 | LOW | completeness | C-001 TopBar 状态表缺 conflict 同步冲突态视觉描述 | [carried-over from r1]（注：本轮 C-005.1 已定义 conflict 色点，但 C-001 TopBar 状态表仍未补充 conflict 态，R-015 未闭合） |
| R-016 | LOW | completeness | P-004 图床配置分组 UI 细节缺失 | [carried-over from r1] |

---

## §previously-approved 维度

以下维度在 r1 审查中已通过，本轮 diff 未触及，不重复审查：

1. **§0 设计方向与 Token 体系一致性** [previously-approved, r1]：暖白 `#FAF8F5` 基底、墨绿主题色、赤陶强调色贯穿 Token 体系，设计方向与组件风格一致。
2. **§1.1 色彩 Token 完备性** [previously-approved, r1]：7 个子组 28 个 Token，层级完整，无纯灰使用。
3. **字体栈规范** [previously-approved, r1]：三套完整字体字符串（衬线/无衬线/等宽），西文优先、中文补全、fallback 完备。
4. **iframe 沙箱基线一致性** [previously-approved, r1]：`sandbox=""` 空属性 + 主线程 overlay 机制与 ARCH M-001/§5.3 对齐。（注：CSP 字符串本轮已补全，r1 R-009 实质闭合。）
5. **§6 假设清单四要素** [previously-approved, r1]：12 条 [ASSUMPTION] 均有（假设内容 + 默认值 + 影响范围 + 验证途径）。
6. **§5 响应式三档完整性** [previously-approved, r1]：三档各有 ASCII 图 + 功能矩阵表。
7. **C-003 ToolbarButton 变体规范** [previously-approved, r1]：ghost/primary/destructive 三变体完整。
8. **C-011 Toast / C-012 Modal 变体规范** [previously-approved, r1]：info/success/warning/error 四变体；confirm/form 两变体，状态表完备。

---

## §汇总

| 编号 | 严重等级 | category | 来源 | 标题摘要 |
|------|---------|---------|------|---------|
| R-001 | ~~HIGH~~ | completeness | r1 | 9 个组件缺 variant 定义 — **已闭合** |
| R-005 | ~~HIGH~~ | completeness | r1 | 「+」/「...」组件缺 UI 规范 — **已闭合** |
| R-006 | ~~HIGH~~ | completeness | r1 | 同步状态指示器非正式规范 — **已闭合** |
| R-NEW-001 | MEDIUM | completeness | diff | C-005.1 offline/conflict 状态来源未说明 |
| R-NEW-002 | MEDIUM | consistency | diff | C-015 分类 Tab 缺 ASSUMPTION 标注 |
| R-NEW-003 | LOW | completeness | diff | C-016 菜单项与 DRAFT_UI_INPUT 差异未说明 |
| R-002 | MEDIUM | convention | r1 | 文档行数超阈值 [carried-over] |
| R-003 | MEDIUM | ambiguity | r1 | 状态视觉差异描述不足 [carried-over] |
| R-004 | MEDIUM | ambiguity | 页面缺空间构成说明 [carried-over] |
| R-007 | MEDIUM | completeness | r1 | C-004 缺语法高亮色彩 Token [carried-over] |
| R-008 | MEDIUM | completeness | r1 | P-003 缺平板/移动端响应式 [carried-over] |
| R-009 | MEDIUM | consistency | r1 | CSP 简写 — **本轮附带闭合** [carried-over] |
| R-010 | MEDIUM | completeness | r1 | diff 视图缺 UI 规范 [carried-over] |
| R-011 | MEDIUM | consistency | r1 | A-001 无账号与 P-004 凭据张力 [carried-over] |
| R-012 | MEDIUM | consistency | r1 | C-009 动作列表不完整（部分闭合）[carried-over] |
| R-013 | LOW | completeness | r1 | 决策编号无集中记录 [carried-over] |
| R-014 | LOW | feasibility | r1 | z-index 层叠冲突风险 [carried-over] |
| R-015 | LOW | completeness | r1 | C-001 缺 conflict 态 [carried-over] |
| R-016 | LOW | completeness | r1 | P-004 图床配置 UI 细节缺失 [carried-over] |

---

## §verdict

- r1 三条 HIGH 问题（R-001 / R-005 / R-006）全部闭合
- Layer 1 components 分卷从 FAIL 变为 PASS，所有卷均通过门禁
- 本轮 diff 引入新问题 2 条 MEDIUM（R-NEW-001 / R-NEW-002）+ 1 条 LOW（R-NEW-003），无新 CRITICAL/HIGH
- carried-over 问题共 12 条（MEDIUM×7 + LOW×4，其中 R-009 实质已闭合，R-012 部分闭合）

**verdict**: **approved_with_notes**

`notes_summary`: 三条 HIGH 全部闭合，Layer 1 全卷通过，文档可进入开发阶段。本轮 diff 新增 2 MEDIUM（C-005.1 状态来源说明缺失、C-015 Tab 分类需 ASSUMPTION 标注）和 1 LOW（C-016 菜单项裁剪说明），建议在下一轮迭代或 dev-plan 阶段补充说明，不阻塞推进。carried-over 的 7 MEDIUM 包含 C-004 语法高亮规范（R-007）、P-003 响应式（R-008）、diff 视图 UI 规范（R-010）等，建议用户确认是否在 dev-plan 前处理。

---

## §Inline-Fix 闭环记录

用户在 Approved-with-Notes Protocol 决策点显式选择 option 4「Inline 全修 8M+4L」，由 orchestrator 主线程直接修订所有残留 MEDIUM/LOW，文档 status `draft → approved`，version `0.1.1 → 0.1.2`。逐条闭环记录如下：

| 编号 | 严重 | 原问题摘要 | 修复位置 | 闭环说明 |
|------|------|-----------|---------|---------|
| R-002 | MEDIUM | 主卷/components 分卷行数超 300 行阈值 | 全部 3 卷 frontmatter | 添加 `split_policy: no-further-split`，声明 ui-spec 三卷已按 token / components / pages 语义切分，行数差异由各分卷职责复杂度决定，不进一步拆 |
| R-003 | MEDIUM | C-004 缺 focus/blur 态视觉差异描述 | components §C-004 状态表 | 新增 focus / blur 两态，描述光标可见性、当前行高亮、行号区颜色加深的视觉差异；Props 追加 onFocus / onBlur 回调 |
| R-004 | MEDIUM | 4 个页面缺空间构成说明 | pages P-002 / P-003 / P-004 | 各页面布局描述前补一段「空间构成」说明视觉重心、留白节奏、关键间距 Token |
| R-007 | MEDIUM | C-004 缺 CodeMirror 语法高亮色彩 Token 规范 | components §C-004.1 新增子节 | 定义 11 个 Markdown 语法元素的高亮 Token 映射（标题/粗体/斜体/行内代码/代码块/链接/列表/引用/分隔/directive/frontmatter/HTML/转义），全部引用 §1.1 主题 Token 派生；语言级高亮（如 Python 关键字）v1 不实现，标 [ASSUMPTION] |
| R-008 | MEDIUM | P-003 主题市场缺平板/移动端响应式描述 | pages P-003 §响应式策略 | 补三档列数策略（桌面 4 列 / 平板 2 列 / 移动 1 列水平列表），gap 也分档降级；标题区在移动档收缩至 56px |
| R-009 | MEDIUM | C-005 CSP 简写与 ARCH §5.3 不一致 | （已由 r2 上轮修订附带闭合） | components §C-005 约束段 CSP 已补全为完整字符串 |
| R-010 | MEDIUM | F-002 AC-006 兼容性 diff 视图无 UI 规范 | components §C-013.1 新增子节 | 定义 CompatibilityDiffView 子组件：复用 Modal `lg` 尺寸 + 左右双栏对比 + 属性 diff 子列表 + 命中规则行；含 4 态、Props、ASCII 布局；before/after 数据来源标 [ASSUMPTION] 待 dev-plan 对齐 |
| R-011 | MEDIUM | A-001「无账号」假设与 P-004 凭据配置语义张力 | 主卷 §6 假设清单 A-001 | 重述假设：v1 无登录/注册流程，凭据以本地加密存储管理（非账号化），消除"无账号 vs 含凭据配置"歧义 |
| R-012 | MEDIUM | C-009 命令面板缺「跳转文档」/「中文排版修订」入口 | components §C-009 动作分组 | 新增「文档」分组（跳转/新建/删除），中文排版修订改在 C-016 ContextMenu 作为一级入口（避免双入口），并加注解释 Q6 决策的"仅 UI 动作"边界仍成立 |
| R-013 | LOW | Q1-Q6 决策编号无集中记录 | 主卷 §0.4 新增决策记录子节 | 表格汇总 6 个决策点（问题 / 选项 / 决策 / 依据），可追溯至 EVENT-LOG.jsonl 的 user_decision 事件 |
| R-014 | LOW | --z-mobile-bar:500 高于 Modal:300 层叠风险 | 主卷 §1.4 z-index 表 | 重排 z-index：`--z-mobile-bar` 下调至 150（在 toolbar 与 dropdown 之间），原 200 的 `--z-toast` 提升至 500（始终最顶），让 Modal/BottomSheet 可正常覆盖固定栏 |
| R-015 | LOW | C-001 TopBar 状态表缺 conflict 态 | components §C-001 状态表 | 新增 conflict 态：底部边框红色 + 「冲突」Tag（赤陶色系），点击 Tag 跳 P-002 进入合并流程 |
| R-016 | LOW | P-004 图床配置子表单 UI 细节缺失 | pages §P-004 图床配置 | 定义可折叠卡片形态（折叠态高 48px / 展开后字段表单 + 测试连接按钮 + 状态行），6 种图床的字段集合表格 [ASSUMPTION] |
| R-NEW-001 | MEDIUM | C-005.1 offline/conflict 状态来源未说明 | components §C-005.1 末尾追加「状态来源」 | 注明 5 态来自 M-013 直传；offline 由 M-008 监听 navigator.onLine 合成；conflict 由 M-008 监听 Yjs merge-conflict 信号合成；优先级 conflict > error > offline > 底层 5 态 |
| R-NEW-002 | MEDIUM | C-015 分类 Tab 缺 ASSUMPTION 标注 | components §C-015 内部结构 | 在分类 Tab 行描述前标 [ASSUMPTION]，明确「行内/块级/标注/封面」四组待 BlockRegistry 类型枚举对齐后修订 |
| R-NEW-003 | LOW | C-016 菜单项与 DRAFT_UI_INPUT 差异未说明 | components §C-016 Props 后追加「设计决策说明」 | 逐项解释「发文清单/导出 Markdown/清空正文/更多」四项为何未纳入：v1 范围裁剪 / 已有原生替代 / 高破坏性 / 入口冗余 |

**verdict 更新**：approved_with_notes（实质等价 approved；文档 status `draft → approved` 已落盘）

**版本变化**：主卷 v0.1.1 → v0.1.2；components 分卷 v0.1.1 → v0.1.2；pages 分卷 v0.1.0 → v0.1.2

**closed-by**: orchestrator (主线程 inline-fix)；不通过 ui-designer 子代理派发，由 orchestrator 在用户显式 override option-4 precondition 后直接编辑文件落盘
