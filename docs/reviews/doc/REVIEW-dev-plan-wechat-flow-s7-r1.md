---
id: "review-dev-plan-wechat-flow-s7-r1"
doc_type: review
author: reviewer
status: approved
deps: ["dev-plan-wechat-flow-s7", "amendment-platform-fidelity-r1"]
consumers: ["orchestrator", "tech-lead", "architect"]
---

# 对抗性审查：T-184..T-189 平台保真重构计划（红队 architect）

> 审查对象：dev-plan-wechat-flow-s7 的 T-184..T-189 拆卡 + 批二余卡（T-176/T-177/T-178/T-179/T-180）**本身的正确性/完整性/时序/保真充分性**。
> 分工：**不查忠实度**（是否照抄 amendment，另有 reviewer）——查计划即便完全忠实照搬 amendment，仍可能有的缺陷。
> 方法：主动证伪，每条 finding 落到具体卡/AC + 具体失败场景 + 严重度 + 处置建议。

## 审查范围与已核实锚点

对抗覆盖八向量：output patch 层正确性/幂等性、删模拟器能力等价、保真门禁充分性（命题4）、T-186 原子性、时序 DAG、既有红队发现闭合、批二一致性、breaking 版本化。已读源码核实（非纸面）：

- `packages/core/src/render.ts`：两相执行确认——L93 `applyRuleset(afterCustomCss, rules, "output")`、L112 `postPaste: false`、L114 `report{nodeChangeRecords,nightRiskIssues}` 已在（T-185/T-186 锚点属实）。
- `packages/contracts/src/platform/wechat-paste.ts`：`WECHAT_PASTE_UNSAFE_TAGS = Set(["div"])`；`WECHAT_PASTE_STRIPPED_STYLE_PROPS` 含 float 但仅为常量。
- `packages/ruleset/src/rules/builtin/`：全 45 文件枚举——**无 `strip-float`**；`strip-position` `PROPS=["position"]`（仅剥 position，不剥 top/right/bottom/left/z-index/float）、`stage:"output"`；`lint-grid-layout`/`lint-position-fixed`/`lint-filter-backdrop` 为 lint（诊断不改写）；`patch-flex-to-block` 存在但无 patch-grid；clamp/readability/em→px/uppercase-hex-lower 均 output 相。
- `packages/blocks/src/blocks/author-card.ts:16`：静态 baseStyle `root.display:"flex"`（非 decorate 动态注入）；`packages/blocks/src/index.ts:69` 确认 authorCard 在 builtin 注册集。
- `packages/core/src/registry/{block,variant}.ts`：builtin 经 `registerBlock(definition)` 注册；`validateStyle` 现为**属性级**（`isWhitelistedProperty`），不校验值；`css-property-whitelist.ts` L83 `display` 在白名单（`flex` 值不被拦）。
- `packages/ruleset/src/rules/readability/readability-font-size-min.ts:6`：`MIN_FONT_SIZE_PX = 14`（D8 已闭合，无需再开卡）。

**既有红队发现闭合核实**：D4（per-node-diff 下标错位）→ T-186 AC-001 删 `diff/per-node-diff.ts`，闭合。D8（font-size 12 vs 14）→ 源码已 14，闭合。D6（strip-data-attr camel/kebab）→ T-184..T-189 均不触碰 `strip-data-attr.ts`，无冲突（另会话处理）。S2（authoring 相 vestigial）→ 保留两相可辩护，accept。S1（双编码同步断言）→ 落在 T-184 AC-004，但**该 AC 本身有缺陷**（见 R-002）。

## Findings

### [R-001] HIGH: T-187 构造守卫会拒掉内置块 author-card（display:flex），清理只排了 font-family，未排 flex/position/float
- **category**: consistency
- **root_cause**: self-caused
- **描述**: 计划把「清理声明先于上守卫」的时序**只**用在 font-family 上（T-189 清理 → T-187 守卫 font-family），但同一失败模式对 `FORBIDDEN_DISPLAY_VALUES`（flex/grid）与 `FORBIDDEN_CSS_PROPS`（position/float）同样成立，却无对应清理卡。已核实反例：`packages/blocks/src/blocks/author-card.ts:16` 在静态 baseStyle `root` 中声明 `display:"flex"`，且 `packages/blocks/src/index.ts:69` 确认 authorCard 在 builtin 注册集，经 `registerBlock(definition)` 注册。T-187 AC-001 给 `registerBlock` 加「遇 `FORBIDDEN_CSS_PROPS ∪ FORBIDDEN_DISPLAY_VALUES` 命中即 `throw({rejectedDeclarations})`」。**失败场景**：T-187 落地后进程启动注册内置块时，author-card 的 `display:flex` 命中禁区 → registerBlock 抛异常 → 内置块注册中断 → 全仓测试无法加载块注册表 → 整个 suite 红 → T-187 永远 green 不了（硬阻塞）。这与 font-family 的处置逻辑完全对称，但 T-187 依赖只列 `[T-184, T-189]`，T-189 仅清理 font-family（其 AC-001/AC-002 明列 font-family），不碰 author-card 的 flex。设计层面还有更深张力：`patch-flex-to-block`（output 相）的存在本就意味着「块可声明 flex、由 output 相转 block」是合法 authoring 便利；构造期直接 reject flex 与该便利冲突——是把 flex 当「源头禁声明」还是「可 patch 声明」，计划未裁定。
- **建议**: fix now。三选一并在卡上写明：(a) 扩 T-189（或新增清理卡）范围，把 author-card 及任何静态声明 flex/position/float 的内置块在守卫上线前改写为 table/block 布局，作为 T-187 硬前置（对齐 font-family 的处置）；(b) T-187 守卫对「有 output 相 patch 兜底的可 patch 值」（如 flex→block）降级为 warn 而非 reject，仅对「无运行期规则」的真禁区（float/position/grid）reject；(c) 先全仓 grep `display:(flex|grid)`/`position:`/`float:` 静态声明，产出待清理清单挂进 T-189 AC。无论哪种，T-187 AC-001 须补「内置块全量注册回归绿」作为守卫不误杀的坐实点。

### [R-002] HIGH: T-184 AC-004 的 S1 同步断言自相矛盾——常量集含 float/定位族/grid，但 output 相无对应规则，「相等」不可满足
- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-184 AC-004 断言 `FORBIDDEN_CSS_PROPS ∪ FORBIDDEN_DISPLAY_VALUES ∪ FORBIDDEN_POSITION_PROPS` 与「output 域平台相关规则实际覆盖的属性/值集合」**相等**，任一方漂移即测试失败。但已核实 output 相规则集只有 `strip-position`（`PROPS=["position"]`，只剥 position）、`strip-font-family`（font-family）、`patch-flex-to-block`（flex）。而常量侧：`FORBIDDEN_CSS_PROPS` 含 **float**（无 `strip-float` 规则，amendment §4 明言「float 常量含无规则」）、`FORBIDDEN_POSITION_PROPS` 含 top/right/bottom/left/z-index（`strip-position` 均不剥）、`FORBIDDEN_DISPLAY_VALUES` 含 grid/inline-grid（`lint-grid-layout` 只诊断不改写，无 patch-grid-to-block）。**失败场景**：按字面实现 AC-004，覆盖集 = {position, font-family, flex}，常量集 ⊋ 之（多出 float/top/right/bottom/left/z-index/grid/inline-grid + `FORBIDDEN_VALUE_PATTERNS`）→ 断言 `相等` 恒红，T-184 无法 green。若为了让测试过而把「覆盖集」定义成人工维护的清单去凑常量集，则退化为「硬编码清单 == 硬编码清单」的空断言，恰恰对没有运行期规则的属性（float/定位族/grid）失去漂移检测意义——而这些正是最需要门禁盯防的（它们靠构造守卫+扫描而非运行剥）。S1 裁定「常量集==平台规则覆盖集」在 wechat-typeset 模型里本就不成立：部分平台事实是构造期+扫描防御、非运行期规则。
- **建议**: fix now，改写 T-184 AC-004。把常量按防御层切分：`runtime-enforced` 子集（position/font-family/flex）对 output 规则做真同步断言；`construct+scan-only` 子集（float/定位族/grid/inline-grid/`FORBIDDEN_VALUE_PATTERNS`/div）不与 output 规则比对，改为在 T-187 落地后对**构造守卫覆盖集 + 扫描覆盖集**做同步断言。注意 T-187 晚于 T-184，故 construct-only 子集的同步断言应挂在 T-187 而非 T-184（T-184 只能断言 runtime 子集）。同时明确记录「strip-position 仅剥 position 属性、不剥 top/left/z-index/float」这一既有运行期缺口是否 accept（靠构造+扫描兜）还是补规则。

### [R-003] MEDIUM: inspect 与 patch 的规则集身份未钉死——「output 相规则」与「平台规则」混用，clamp/readability/hex 会污染 inspect 对外部 HTML 的报告
- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: T-185 定义 `patch(hast)` = `render.ts:93` 的 `applyRuleset(afterCustomCss, rules, "output")` 具名封装——即**全部 output 相规则**（37 条，含 clamp-font-size/readability-font-size-min/transform-em-to-px/clamp-rgba-alpha/transform-uppercase-hex-lower 等产品归一化规则）。amendment §2.4 又称 `inspect` 与 `patch`「共用同一平台规则子集」。但 amendment §9 R5 明确 clamp/readability 是「产品诊断/归一（**不进平台判定**）」。三者冲突：① 若 inspect 用**全 output 规则**（与 patch 同集），则 `inspect(外部HTML)` 会把「font-size 10→14 夹取、em→px、hex 转小写、rgba alpha 夹 0.15」当作平台行为报告给 LLM——但微信真机**不做**这些，且 R5 说这些非平台判定 → inspect 过报、语义不诚实（违反 §2.4「报的是我方平台模型」里对「平台」的界定）。② 若 inspect 只用禁区强制子集（position/font-family/flex，符合 R5），则 `patch`（全 output）≠ `inspect`（子集），「共用同一子集」的绑定（§2.4）失真，且 T-185 AC-004「inspect 对自家产物返回 []」对被 patch 应用过、却不在 inspect 子集内的 clamp/readability 类变更失去意义。T-185 AC-003（inspect 负向探针）与 AC-004（自家产物空）均未钉死 inspect 到底跑哪个规则集。**失败场景**：LLM 调 `simulate_paste`(=inspect) 体检一段含 `font-size:12px` 的外部 HTML，若 inspect=全 output，返回「已夹至 14px」的 change——LLM 据此以为微信会改字号（错误信息），或反过来据此认为自己该改；实为 wechat-flow 产品归一非微信行为。
- **建议**: fix now。T-185 显式定义 inspect 的规则集边界：推荐 inspect 只跑「平台强制子集」（禁区 strip/patch：position/font-family/flex/div-schema-strip），排除 clamp/readability/hex/em-px 等产品归一规则；并在 AC 中把 `patch`=全 output 与 `inspect`=平台子集的关系说清（二者不是同一集，patch 是「渲染管线归一+平台」，inspect 是「纯平台体检」），撤销 §2.4「共用同一子集」的措辞或改为「inspect 规则集 ⊆ patch 规则集」。相应地 T-185 AC-004「自家产物返回 []」应改为「inspect 平台子集对自家产物返回 []」。

### [R-004] MEDIUM: T-185 AC-004「inspect 对已渲染产物返回 []」非普遍成立——render 合法产出 div、inspect 却剥 div
- **category**: consistency
- **root_cause**: self-caused
- **描述**: T-185 AC-003/AC-004 与 amendment §2.4 要求 inspect 专用 schema = `defaultSchema.tagNames − (WECHAT_PASTE_UNSAFE_TAGS ∪ HARD_REMOVE_TAGS)`，已核实 `WECHAT_PASTE_UNSAFE_TAGS = Set(["div"])` → **inspect 剥 div**。而渲染管线 `wechatFlowSanitizeSchema` 保留 div（amendment N-1 自述「渲染管线故意留 div」；且 markdown 内联裸 `<div>` 经 sanitize 存活、output 相无 strip-div）。故 render 产物**可以**含 div（裸 HTML 透传、或任何仍用 div 容器的块/decorate 注入）。**失败场景**：T-185 AC-004 断言 `inspect(render(x)).changes === []` 作为「稳定态证明」；若 AC-004 的测试夹具（或任意真实文档）含 div，inspect 剥 div → changes ≠ [] → AC-004 失败。更本质：render 留 div、微信剥 div，对任何含 div 的内容 **preview（render）≠ paste（微信）**，inspect 恰当地报出这一背离——即「inspect 对自家产物返回空」当且仅当 render 产物 div-free；而 render 的 div-free 无任何门禁保证（output 相无 strip-div，§9 R3 已承认此缝）。所以「返回空=已达平台稳定态」是过度声明：它只对 div-free 子集成立，对含 div 产物会静默失败或（若夹具刻意 div-free）给出虚假稳定信心。
- **建议**: fix now（措辞+夹具）。T-185 AC-004 限定为「div-free 已渲染产物」并显式记录 div 缺口，或把断言改为「inspect 对自家产物只报告 §9 R3/R4 已登记的 div/customCss 残留、无其他 change」；AC-004 夹具须显式 div-free 并注释原因。同时在计划层承认：删收敛不变量后的「诚实稳定态证明」在 div 这一微信头号剥离目标上有洞，补偿控制（T-187 标签扫描）只覆盖内置块、不覆盖用户裸 HTML div，故 preview≡paste 对 div 内容不闭合（这与 §9 R3/R4 的诚实标注一致，但 AC-004 的普遍化措辞与之矛盾，须对齐）。

### [R-005] MEDIUM: 多张卡改变 render 产物，但只有 T-186 明列 cross-runtime golden SHA 重生成——T-176/T-178/T-188/T-189 会致 CI cross-runtime job 红
- **category**: completeness
- **root_cause**: self-caused
- **描述**: cross-runtime golden SHA 门禁（独立 vitest config + `tests/cross-runtime/fixtures.ts`，`pnpm test:cross-runtime` / `pnpm gen:cross-runtime-hashes`）不在四门禁（vitest/typecheck/biome/tests-tsc）覆盖内——这是已登记盲区。amendment §7 破裂测试面明列 golden SHA 须重生成，但 dev-plan 中只有 **T-186 AC-006** 显式写了「`fixtures.ts` golden SHA 经 `pnpm gen:cross-runtime-hashes` 重生成」。而 T-178（删 strip-width-height-inline，width/height 存活改变产物）、T-188（dropcap/dialog px 化改变 width 声明）、T-189（font-family 清理 + 六块 token 化改变产物字节）、T-176（slot typography 下推改变产物）**均改变 render 产物**，其 AC 只写通用的「基线更新逐条列依据」+「全仓四门禁绿」。**失败场景**：T-178/T-189 合并后四门禁绿（因四门禁不含 cross-runtime），但 CI 的 cross-runtime job 因 golden SHA 未重生成而红——延迟到独立 CI 阶段才暴露，且各卡实现者不知需重生成（AC 未点名）。
- **建议**: fix now。给每张改变 render 产物的卡（T-176/T-178/T-188/T-189）的 AC 显式补「`pnpm gen:cross-runtime-hashes` 重生成 + cross-runtime job 绿」，不能靠「四门禁绿」兜（四门禁不含该 job）。或在批级说明中统一声明「本批所有改产物卡收口必跑 cross-runtime SHA 重生成」。

### [R-006] MEDIUM: T-188 真机确认为硬前置但无自动 oracle、失败分支（真 &lt;table&gt; 返工）无卡承接，且是全保真模型依赖的同一手工 oracle
- **category**: feasibility
- **root_cause**: input-caused
- **描述**: T-188 AC-001 把「≤6 份真机确认 `display:table` 存活」设为硬前置（非本卡代码交付门槛，前置未过则范围升级为真 `<table>` 改造）。但 CLAUDE.md 命题4 / 上游 #473 已指出**无外部微信真机 oracle**——这 ≤6 份确认是纯手工（用户粘贴进微信肉眼确认，写 EVENT-LOG user_decision），也正是删收敛不变量后整个保真模型（§8「真机 oracle 收窄至 ≤6 份」）赖以成立的同一手工兜底。**失败场景**：① 若用户无法/不便执行真机确认，T-188 停在 AC-001 前置，其代码交付（dropcap/dialog px 化）无法验收；若 T-172 r3 走查依赖 dropcap 修复闭环，则连带阻塞 T-172→design_signoff→T-157/T-159 链。② 若真机确认结果为 `display:table` **不存活**，范围升级为「装饰布局改真 `<table>`」——amendment §9 R2 明言这是「更大返工」，但计划里**没有这张返工卡**，也无 AC 描述其范围，等于把一个可能的大返工留白。
- **建议**: fix now（补前置与应急）。(a) 明确 T-188 AC-001 owner=user 并在批级前置清单里前置调度这 ≤6 份真机确认（与 T-172 r2 走查合并采集，避免多次让用户切微信）；(b) 为「display:table 不存活 → 真 `<table>` 改造」预置一张应急卡（或在 T-188 notes 里给出 `<table>` 改造的范围与影响面草案），使失败分支不留白；(c) 核对并在 dev-plan 里写明 T-172 r3 是否硬依赖 T-188——若是，则 T-188 的手工前置即 T-172 闭环的关键路径瓶颈，须显式标注。

### [R-007] MEDIUM: ui-spec §10.5 font-family amendment（owner=ui-designer）无卡承接，仅散在 T-189 notes 与 amendment §11
- **category**: completeness
- **root_cause**: self-caused
- **描述**: amendment §11 与 §6 批二校准均列「ui-spec §10.5 font-family（无差别剥 + themes/marks 禁声明，owner=ui-designer）」为下游 amendment。但 dev-plan 中：T-189（owner=implementer 的 fix 卡）notes 写「ui-spec §10.5 font-family amendment（owner=ui-designer）与本卡同步落地」，其 AC-001..006 **无一条**承接 ui-spec §10.5 的编辑；T-180 处理 ui-spec §10.4/10.7/10.9 但不含 §10.5；T-183 已落 ui-spec §1.2.5 全局分治总则，但 §10.5 是另一节。**失败场景**：T-189 实现者按 AC 只改源码（themes/blocks/marks），不碰 ui-spec；ui-spec §10.5 保留「主题字体身份」旧措辞，与「font-family 无差别剥、themes/marks 禁声明」的新事实矛盾——ui-spec 与实现漂移，下游（走查/新主题作者）据 §10.5 旧文声明 font-family，被 T-187 守卫拒绝，困惑归因。owner 是 ui-designer 但无卡指派 → 落空风险高。
- **建议**: fix now。给 T-189 补一条 AC「ui-spec §10.5 font-family amendment 经 context authoring 落图并 finalize（owner=ui-designer），措辞对齐无差别剥 + themes/marks 禁声明」，或新增一张 ui-designer 拥有的伴随文档卡显式承接 §10.5，避免仅靠 notes 措辞漂移。

### [R-008] LOW: T-187 全组合扫描（AC-005）未规定驱动各块 render 的内容输入——decorate 条件注入的 div/float 可能逃逸固定夹具
- **category**: test-quality
- **root_cause**: self-caused
- **描述**: T-187 AC-005 要求遍历 `listThemes() × listBlocks() × 全变体` 渲染产物做 CSS 模式 + 标签双扫描，作为删收敛不变量后的等效保真门禁。但它**未规定每个块 render 时喂入的 body/attrs 内容**。多个块的 `decorate` 是**内容条件分支**（如 gallery 按图片数选布局、dialog 按 turn 方向选 cell），若扫描夹具用平凡/空内容，条件注入 div/float 的路径不触发 → 扫描零命中假绿。而 div/float 无运行期 strip（R-002/R-004），标签扫描是其**唯一**捕获点（§9 R3），一旦夹具不激活注入路径，这唯一防线失效。**失败场景**：某块仅在「≥3 子项」时 decorate 注入 float 布局；扫描夹具喂 1 子项 → 扫描过 → float 布局在真实多子项文档进微信 → 塌陷，门禁全程绿。
- **建议**: fix now 或 defer（视 decorate 分支面）。T-187 AC-005 补「每块使用能激活其 decorate 主要分支的代表性内容（或直接对 decorate 输出断言），而非平凡夹具」；至少对已知含条件布局注入的块（gallery/dialog/steps/compare 等）点名覆盖。若评估 decorate 注入面小且无 float/div 分支，可 defer 并在卡上记录该判断依据。

## 已对抗但判 accept / 无 finding 的向量

- **T-186 原子性（向量4）**：accept。宽而浅单卡的裁定站得住——拆多卡确会制造「部分消费方改指向、部分仍 import 已删模块」的不可构建中间态；notes 已声明 skeleton-first 增量落盘（`MID_PROGRESS_LOC`）。唯一提醒（非 finding）：T-186 是纯破坏性迁移，`tdd_mode: standard` 的 RED 相在删除型卡上价值有限，实现可用「先补新契约测试（inspect 形/无 postPaste）→ 删除 → 修复破裂面」的次序；SemVer 0.x 破坏走 minor（0.0.0→0.1.0）符合惯例。
- **output patch 幂等性（向量1）**：无独立 finding。output 规则以 strip/clamp/transform 为主，em→px/hex-lower/clamp 天然幂等；T-185 AC-004（inspect 自家产物空）实际就是幂等性坐实点——若某 output 规则非幂等，AC-004 会抓到。真正的问题不在幂等而在 AC-004 被 div 问题污染（见 R-004）。render 与 adapter 共用同一执行点的绑定由 T-185 AC-002（grep 验证无第二处 output-stage `applyRuleset` 调用）约束，防漂移到位。
- **删模拟器能力等价（向量2）**：inspect 用专用 schema 剥 div 后，对任意外部 HTML 实际**强于**旧模拟器（旧 strip-tags 只剥 style/script 不建模 div）。负向探针 T-185 AC-003 覆盖 `<div style=position:absolute>`。剩余语义问题归入 R-003（规则集身份）。
- **既有红队发现闭合（向量6）**：D4 删除闭合、D8 已 14、D6 无冲突、S2 保留两相可辩护——均 accept，见 scope 节。S1 落点 T-184 AC-004 但该 AC 有缺陷（R-002）。
- **T-176 line-height vs em→px（向量7）**：无 finding。T-176 AC-002 断言 slot line-height 与正文一致、font-size 受 readability-14 夹取，两者都经同一 output 相，一致性成立；已正确移除 font-family 断言（对齐新模型）。T-177/T-180 无平台耦合，一致。T-179 并入 T-189 的合并裁定（同文件改动面避冲突）合理。

## 总评

**verdict: needs_revision**。计划整体方向正确、复用 output ruleset 为 patch 层的核心裁定站得住、ripple 与破裂测试面盘点扎实、既有红队发现（D4/D8）确有闭合——但**不能直接进 T-184 实现**，有 **2 处 HIGH blocker 必须先修**：

- **blocker 数（CRITICAL/HIGH）= 2**：
  - **R-001（HIGH）**：T-187 构造守卫会拒掉内置块 author-card（静态 `display:flex`）致注册中断/全 suite 红，清理时序只排了 font-family、漏排 flex/position/float——T-187 会硬阻塞在 green。
  - **R-002（HIGH）**：T-184 AC-004 的 S1 同步断言「常量集==output 规则覆盖集」自相矛盾（float/定位族/grid 无 output 规则），字面实现恒红、凑合实现变空断言——S1 裁定在 wechat-typeset 模型下须按防御层切分重写。
- **MEDIUM（应修，多为措辞/AC 补全，不必阻塞全部但建议随修）= 4**：R-003（inspect 规则集身份未钉死）、R-004（AC-004 对 div 过度声明）、R-005（cross-runtime SHA 只在 T-186 承接）、R-006（T-188 真机前置无 oracle + 失败分支无卡）、R-007（ui-spec §10.5 无卡承接）。（注：R-006/R-007 亦偏 completeness/feasibility 关键，实操上建议与两 HIGH 一并修。）
- **LOW = 1**：R-008（T-187 扫描夹具内容未规定，decorate 条件注入可逃逸）。

**一句话总评**：方向对、骨架稳，但 T-187 构造守卫的清理时序（R-001）与 T-184 S1 同步断言的可满足性（R-002）两处必须先修，否则 T-187/T-184 会在实现期硬撞墙；修掉这 2 个 HIGH（并顺带处理 R-003..R-007 的 AC 措辞/承接）后可 go。

---

## 修订处置（r1 → 已收口，dev-plan 0.3.0 → 0.3.2）

| finding | 严重度 | resolver | 落点 |
|---------|--------|----------|------|
| R-001 author-card flex 清理时序漏排 | HIGH | tech-lead | T-189 扩为「全 FORBIDDEN 内置声明退出」（清理范围 = `FORBIDDEN_CSS_PROPS ∪ FORBIDDEN_DISPLAY_VALUES ∪ FORBIDDEN_POSITION_PROPS`），新增 AC-003（author-card `display:flex`→`table`/`inline-block` 迁移 + 视觉等价）、AC-004（全仓 grep 审计 display/position/float/定位族清零）；T-187 新增 AC-006「内置资产全量注册回归绿」坐实守卫不误杀。**清理先于守卫**（T-187 deps `[T-184, T-189]`），与「构造守卫为主、内置违规源头迁移」裁定一致——非 output 蒙混 |
| R-002 T-184 AC-004 S1 双向等式自相矛盾 | HIGH | tech-lead | T-184 AC-004 重写为三条**单向**断言（①禁集单一源派生·仓内无第二份 ②output 补救靶属性/值 ⊆ 平台常量集 ③float/grid/定位族无运行期规则·排除出同步范围·T-187 兜底），与 amendment §2.1 可满足形式对齐 |
| R-003 inspect 规则集身份未钉死 | MEDIUM | orchestrator (inline) | T-185 AC-003 钉死 inspect = **平台过滤子集**（strip/patch 族，排除 clamp/readability/hex/em-px 产品归一）+ 负向探针（font-size:12px 外部 HTML 不报「夹 14」）；notes 改 `inspect ⊆ patch`（非「共用同一子集」），据 amendment §2.4 |
| R-004 AC-004「inspect 自家产物空」对 div 过度声明 | MEDIUM | orchestrator (inline) | T-185 AC-004 接上 render 产物 **div-free 构造保证**（amendment §2.4 三条：remarkRehype allowDangerousHtml:false 丢裸 div ＋零 div 创建·section 原语 ＋customCss re-parse 保持），夹具须显式坐实 div-free 前提，命题成立·非裸声明 |
| R-005 cross-runtime golden SHA 只在 T-186 承接 | MEDIUM | tech-lead | T-176/T-178/T-188/T-189 deliverables 各补 `pnpm gen:cross-runtime-hashes` 重生成 |
| R-006 T-188 真机前置无 oracle·失败分支无卡 | MEDIUM | tech-lead | T-188 AC-001 重写为「无自动 oracle、owner=user、手工肉眼确认」+ 写清失败分支范围（改真 `<table><tr><td>` 结构）；notes 补与 T-172 r3 合并采集 |
| R-007 ui-spec §10.5 无卡承接 | MEDIUM | tech-lead | T-189 deliverables 补 tracked 交付物「ui-spec §10.5 font-family amendment（owner=ui-designer）」 |
| R-008 T-187 扫描夹具内容未规定 | LOW | tech-lead | T-187 AC-005 补：每块用能激活 decorate 主分支的代表性内容（gallery/dialog/steps/compare）+ 违规/合法各 ≥1 负向探针 |

**收口判定**：2 HIGH + 5 MED + 1 LOW 全部 disposition。两个 HIGH 跨 arch↔dev-plan 一致性经 orchestrator 复核坐实（S1 三条单向断言 ↔ amendment §2.1；DAG `T-189-->T-187` + deps 方向 ↔ amendment §6）。R-003/R-004 由 orchestrator inline 落 T-185（纯措辞对齐 amendment §2.4 权威裁定，不涉设计取舍）。设计取舍无过度设计引入——守卫为主、三层防御按输入来源分工（构造守卫管已注册资产、output 补救管运行期 customCss、扫描门禁管全组合），非按属性建两级分类法。最终合并门由用户 PR 审阅承担。
