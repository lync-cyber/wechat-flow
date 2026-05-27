---
id: "review-arch-wechat-flow-r4"
doc_type: review
author: reviewer
status: approved
deps: ["arch-wechat-flow", "arch-wechat-flow-modules", "arch-wechat-flow-api", "arch-wechat-flow-data"]
---
# ARCH 文档 Layer 2 语义审查报告 — wechat-flow r4

**被审文档**: arch-wechat-flow 0.3.0（主卷）+ arch-wechat-flow-modules 0.3.0 + arch-wechat-flow-api 0.3.0 + arch-wechat-flow-data 0.3.0

**上游依赖**: `docs/prd/prd-wechat-flow.md`、`docs/prd/prd-wechat-flow-f001-f014.md`

**审查模式**: 全量 Layer 2（用户指定重点 4 项）；Layer 1 沿用 r3 结论（4 分卷 exit 0），本轮未重跑脚本。

**历史基线**: r1/r2/r3 已闭环 iframe 沙箱、admin API、ScopeSchema、确定性迭代规范、sanitizer 选型等；本轮对 [previously-approved] 区域仅做回归抽检，不重复开项。

---

## 审查焦点摘要

| 焦点 | 结论 |
|------|------|
| F→M 覆盖 / 模块边界 / 选型可落地 | F-001..F-014 主卷 §8.1 全覆盖；边界总体清晰；F-008 扩展点与 M-001/F-008 AC 拆解不足 |
| API 清单 vs PRD F-013 Tool | 22 个 tool 名与 API 分卷逐条对齐；**「16 个 Tool」全局计数与 PRD 矛盾** |
| M-001..M-013 vs dev-plan M-014 | ARCH 仅 M-001..M-013；`@wechat-flow/zh-typo` 挂 M-008，dev-plan T-043 称 M-014 |
| 安全 / 确定性 / iframe | §5.2/§5.3 设计完整可执行；iframe 与 r3 一致；Worker 网络隔离与跨 runtime 测试矩阵仍有缺口 |

---

## 问题列表

### [ARCH-001] HIGH: 全局「16 个 Tool」计数与 PRD F-013 AC-002 枚举的 22 个 tool 名不一致

- **category**: consistency
- **root_cause**: self-caused
- **描述**: PRD F-013 AC-002 逐条列出 22 个 MCP tool（含 `list_tokens`/`describe_token` 各一，以及 4 个长任务 + `get_job` + `get_ruleset_version`）。API 分卷 API-001..API-015 正文已覆盖 16 个同步 tool，API-016 合并条目再定义 6 个异步 tool，**实际合计 22**。但 M-009 职责、`tools/router.ts`、`mcp/tool-contracts.ts`、主卷 §5.3 MCP 鉴权、API §3.5 admin 说明、API-016 脚注「保持 16 Tool 计数一致」均写「16 个 Tool」。下游会误判 scope-guard / 契约测试 / OpenAPI 生成范围，与 PRD AC-002 门禁不对齐。
- **建议**: 统一改为「22 个 Tool（16 同步 + 6 异步）」；API-016 脚注改为「合并文档条目，不减少 tool 计数」；`tool-contracts.ts` 与 MCP 能力发现清单按 22 名维护。

---

### [ARCH-002] HIGH: F-013 AC-003「Skill bundle」分发形态在 ARCH 中无部署单元与交付路径

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-013 AC-003 要求分发形态覆盖 MCP、**Skill bundle（SKILL.md + 资源目录）**、CLI 三形态；PRD 主卷亦定义 Skill 为语义编排层。ARCH §6.1 分发形态表仅有 Editor / MCP stdio|HTTP / CLI / Relay，§7.2 目录无 `apps/skill-bundle/` 或等价包；F→M 表 F-013 仅映射 M-009/M-011/M-008/M-012，无 Skill 产物负责人。tech-lead 无法从 ARCH 拆分 Skill 打包、发布与版本策略任务。
- **建议**: §6.1 增「Skill bundle」行（npm 包或 `skills/wechat-flow/` 目录 + 版本与 Public Tool Schema 绑定）；§7.2 补路径；在 M-009 或独立交付说明中声明 Skill 如何引用 22 个 Tool（编排示例 / 依赖 MCP transport）。

---

### [ARCH-003] MEDIUM: dev-plan「M-014 附属模块」与 ARCH 模块编号体系不一致

- **category**: consistency
- **root_cause**: upstream-caused
- **描述**: `dev-plan-wechat-flow.md` T-043 标注「M-014 附属模块」，实现落点 `packages/zh-typo/`。ARCH 模块分卷仅定义 M-001..M-013；中文排版能力由 M-008 `composers/apply-zh-typo.ts` 编排，依赖 `@wechat-flow/zh-typo` 包（§7.2），**无 M-014 条目**。`cataforge docs load arch#§2.M-014` 与任务卡 `relates_to` 交叉引用将失败。
- **建议**: 二选一并在 ARCH/dev-plan 同步：(A) 在 modules 分卷增补 **M-014: 中文排版规则包**（职责=纯函数 mdast 变换，映射 F-014），或 (B) dev-plan 改为「`packages/zh-typo`（M-008 依赖包，非架构模块）」并统一任务 `context_load` 指向 M-008。

---

### [ARCH-004] MEDIUM: F-008 PRD 要求的「模板市场插件化扩展点」在 ARCH 中未落地

- **category**: completeness
- **root_cause**: self-caused
- **描述**: PRD F-008 备注明确「模板市场的架构扩展点（插件化接入）由 architect 阶段规划」。ARCH 仅在 M-005 有 `template/registry.ts`（F-008 AC-003）与 describe_theme 的 `templates` 字段，未说明第三方模板 pack 如何注册、版本化、与主题 pack 关系及与 M-007 沙箱边界。F→M 表将 F-008 分给 M-005/M-001 但未覆盖 AC-001 八类场景清单的注册约定。
- **建议**: M-005 增「模板扩展点」小节：pack manifest 字段、注册 API、与 `frontmatter.template` 解析链路；或 §8.2 决策记录 + `[ASSUMPTION]` 声明 v1 仅内置模板、插件化延至 post-MVP 并回写 PRD。

---

### [ARCH-005] MEDIUM: MCP 异步 Tool（API-016）`jobId` schema 弱于 Relay REST（无 uuid 约束）

- **category**: convention
- **root_cause**: self-caused
- **描述**: API-017..API-019 的 202 响应已用 `z.string().uuid()`；API-016 中 `upload_image` 等 4 个长任务及 `get_job` 的 `jobId` 仍为裸 `{ type: string }`。同一 job 模型双入口（MCP Tool vs REST）schema 不一致，implementer 可能在 MCP 路径生成非 UUID jobId，破坏 API-020 路由与 E-008 主键假设。
- **建议**: API-016 全部 `jobId` 改为 `z.string().uuid()`，与 API-017 及 data 分卷 E-008 对齐。

---

### [ARCH-006] MEDIUM: §5.2 声明四运行时一致性，§7.3 仅三 target + e2e 间接覆盖主线程

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: §5.2 要求浏览器主线程 / Web Worker / Node / Edge 四运行时 SHA-256 一致；§7.3 写明 `tests/cross-runtime/` 仅 `node` / `worker` / `edge-runtime`，「浏览器主线程由 Playwright e2e 验证」。e2e 通常断言 DOM/交互，未必对 stage 输出做与 cross-runtime 同 fixture 的字节级 SHA-256 对比，存在 F-013 AC-001 / PRD §3.3 验证空洞。
- **建议**: §7.3 明确主线程参与方式：例如在 Vitest `environment: 'happy-dom'` 或 Playwright component test 中 import `@wechat-flow/core` 跑与 `tests/cross-runtime/` 相同 fixture 的 SHA-256 断言，并写入 CI 矩阵表。

---

### [ARCH-007] MEDIUM: M-007 Worker「delete fetch」隔离策略缺少 bundler/runtime 兜底说明

- **category**: security
- **root_cause**: self-caused
- **描述**: M-007 `worker/runtime.ts` 启动时 `delete globalThis.fetch/XMLHttpRequest/WebSocket/EventSource`。Vite Worker bundle 可能重新注入 polyfill；Comlink 内部通信也可能依赖 fetch（视版本而定）。ARCH 未声明检测手段（启动后断言 `typeof fetch === 'undefined'`）或 CSP/静态分析兜底，F-010 AC-008「仅事件通道」存在实现漂移风险。
- **建议**: §5.3 沙箱隔离行或 M-007 补充：Worker 入口集成测试断言全局网络 API 不可用；禁止在 Worker 依赖图引入带 fetch 的库；Comlink 版本锁定与兼容性注记。

---

### [ARCH-008] MEDIUM: F-004 CSS 内联化库「implementer 择优」影响跨 runtime 确定性承诺

- **category**: feasibility
- **root_cause**: self-caused
- **描述**: §1.4 技术栈对 juice 11.x / css-inline 0.15 标注「implementer 阶段择优」。两者输出 HTML 字节级未必一致（选择器展开、空白、属性序）。在 §5.2 已承诺 canonical 序列化与定点数学的前提下，内联化库若未在 ARCH 锁定，四 runtime 一致性测试可能在 GREEN 前才发现分叉。
- **建议**: §8.2 增 Qx 决策锁定其一，或规定 CI 黄金 fixture 双向门禁 + 禁止运行时切换库。

---

### [ARCH-009] MEDIUM: M-001 对 F-008 仅列功能 ID，未映射 AC-001..004，模板市场 UI 边界模糊

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: M-001 映射行写「F-008 / F-014 (AC-006)」，未区分 F-008 的浏览/安装/登记 AC；M-005 承担 registry，但 P-003 模板市场页（ui-spec）与 ARCH 无对应组件/路由约定。模块边界上「展示层在 M-001、登记在 M-005」可被 implementer 不同解读。
- **建议**: M-001 映射改为 `F-008 (AC-001 浏览 UI, AC-002 安装流程)`；M-005 写 `F-008 (AC-003 登记, AC-004 预编排模型)`；可选引用 ui-spec P-003 路由。

---

### [ARCH-010] LOW: `get_ruleset_version` 响应含 `builtAt` 时间戳

- **category**: completeness
- **root_cause**: self-caused
- **描述**: API-016 `get_ruleset_version` 含 `builtAt: z.string().datetime()`。不参与渲染 HTML 确定性，但若 CI/Agent 对 tool 响应做快照回归，会因构建时间漂移失败。
- **建议**: 文档注明该字段不参与 AC-001 字节级一致断言；或改为 manifest 内固定 `rulesetVersion` 派生的确定性字符串。

---

### [ARCH-011] LOW: F-008 AC-001 八类场景模板无 ARCH 级清单或门槛

- **category**: ambiguity
- **root_cause**: self-caused
- **描述**: PRD 列举科技评测、诗歌赏析等 8 类场景；ARCH 未在 M-005 或 §7.2 给出内置模板 ID 表或「每主题 ≥2 模板」验收映射，仅 dev-plan T-073 占位实现。
- **建议**: M-005 `template/registry.ts` 条目列出 v1 内置 templateId ↔ 场景映射表，或 `[ASSUMPTION]` 链接 themes 包内 manifest。

---

## 已闭环项（本轮抽检，不重开）

- §5.3 iframe：`sandbox=""` + CSP 禁 JS + 主线程 UI 钩子（r3 R-NEW-001）
- API-028..031 admin key 生命周期 + ScopeSchema（r2/r3）
- §5.2 确定性容器迭代规范 + `utils/deterministic.ts`（r2）
- rehype-sanitize 6.x 选型（r2）
- §6.3 部署约束基线表（r2 R-006）
- 主卷 §2/§3/§4 分卷占位（r2 R-001）

---

## 三态判定

| 严重等级 | 数量 |
|---------|------|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 7 |
| LOW | 2 |
| **合计** | **11** |

**verdict: needs_revision**

存在 2 项 HIGH（ARCH-001 Tool 计数、ARCH-002 Skill bundle 交付缺失），阻塞下游将 ARCH 视为「F-013 已完整架构化」的判断。修订后建议 r5 增量复审 ARCH-001/002 及 dev-plan M-014 对齐项。

---

## Tool 清单对账（审查记录）

PRD F-013 AC-002 22 tool 与 API 分卷映射一致：`render_markdown`→API-001 … `get_ruleset_version`→API-016。不一致处仅为文档级「16」计数（见 ARCH-001），非 tool 名遗漏。
