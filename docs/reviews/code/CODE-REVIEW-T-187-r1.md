---
id: "code-review-T-187-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-187"]
consumers: ["orchestrator"]
---

# CODE-REVIEW-T-187-r1

任务: T-187 构造守卫（含 Mark）+ 全主题全组合扫描门禁
security_sensitive: true / complexity: large / tdd_mode: standard / tdd_acceptance: all

Layer 1: 门禁已由主线程坐实（`pnpm vitest run` 4445 passed/10 skipped、`pnpm typecheck` 50 tasks 全绿、`pnpm biome check .` 868 files clean）。渲染产物无变更，cross-runtime 免跑成立。本报告聚焦 Layer 2 语义审查。

## 变更概览

- 新增 `packages/core/src/registry/style-guard.ts`：FORBIDDEN 黑名单校验器（`evaluateDeclaration` / `validateForbiddenDeclarations` / `validateThemeBlocksForbidden` / `parseMarkStyleDeclarations` / `validateMarkStyleForbidden` / `buildRejectionError`）
- `block.ts` / `mark.ts` / `theme.ts` 三处 registrar 接入构造期守卫，`variant.ts` 的 `RejectedDeclaration` 接口迁移到 `style-guard.ts`，`variant.ts` 侧改 `import type` + re-export
- 新增 `tests/core/guard/construct-time-forbidden-guard.test.ts`（AC-001/002/003/006/007）
- 升级 `tests/blocks/wechat-paste-safe-output.test.ts`（AC-005：全主题×全块×全变体渲染扫描 + 负向探针 + `-webkit-` 例外白名单）
- `tests/core/frontmatter.test.ts` / `tests/core/guard/cross-theme-identity-token-collision.test.ts`：test-local 主题 fixture 移除 `font-family`（守卫上线后必要 collateral，确认其 fixture 经 `registerTheme` 真实注册路径消费，非无意义改动）

## 问题列表

### [R-001] HIGH: AC-002 遗漏 theme `tokens` 的构造期校验，仅覆盖 `blocks`
- **category**: security
- **root_cause**: self-caused
- **描述**: AC-002 字面要求 `registerTheme` 新增校验 "theme tokens/blocks 中的样式声明"，但 `theme.ts:11-19` 只对 `definition.blocks` 调 `validateThemeBlocksForbidden`，未处理 `definition.tokens`（`Record<string,string>`，即 CSS 自定义属性名→值）。`construct-time-forbidden-guard.test.ts` 的 `buildProbeTheme` 恒传 `tokens: {}`，无一条测试对 tokens 路径做正/负向断言。

  经代码追踪确认此非纯学术缺口：`packages/core/src/pipeline/inline-style.ts::resolveTokenPlaceholder`（L100-105）会把 `var(--token-name)` 占位符替换为 `designTokens[tokenName]` 的**字面值**直接拼入最终渲染的 inline style 字符串——即 token 值会被原样内联进产物 CSS 声明。当前 5 个内置主题的 tokens 值经全仓 grep 核实均不含 `-webkit-`/`@media`/`:hover`/`display:`/`position:` 等禁用片段（故 AC-005 的全主题渲染扫描现状测不出问题、门禁全绿），但 `registerTheme` 是**面向未来 plugin 主题的实际生产注册闸口**（`BlockSource` 已声明 `builtin | plugin` 二元），construct-time 守卫是项目既定的主防线（"构造守卫为主、output 补救为副"），tokens 路径在此防线上留有实质空白：未来一个恶意/失误的 plugin 主题 token 值若含禁用模式，不会在注册期被拒，只会在其恰好被内联进某次渲染扫描时才可能被发现（而扫描是测试态防护，非运行时防护）。

- **建议**: 在 `validateThemeBlocksForbidden` 旁新增等价的 tokens 校验路径（token 值经 `isForbiddenCssValue` 或至少复用 `evaluateDeclaration` 的 value-pattern 分支即可，property-name 类检查对 token key 无意义可跳过），`registerTheme` 对 `definition.tokens` 同步调用；并在 `construct-time-forbidden-guard.test.ts` AC-002 组补至少一条 tokens 正向/负向探针。

### [R-002] LOW: AC-001 字面要求"复用 variant.ts 现有 validateStyle"未落地，改为新建黑名单校验器 —— 判定为合理设计分工，非缺陷
- **category**: consistency
- **root_cause**: reviewer-calibration
- **描述**: AC-001 字面文本要求 `registerBlock` "复用 `packages/core/src/registry/variant.ts` 现有 `validateStyle`（非新建平行校验）"，但实现新建了 `style-guard.ts` 的独立黑名单校验器。经代码核实这是**必要**分歧而非偷懒：`variant.ts::validateStyle`（L24-49）= `filterCssAttrs` 通用 XSS 模式黑名单 + `isWhitelistedProperty` 属性名白名单（`css-property-whitelist.ts` 的 `CSS_SAFE_PROPERTIES`）。该白名单**包含 `"display"`**（L82）却不做值级校验——`filterCssAttrs` 只拦截 `javascript:`/`expression()`/`@import`/`behavior:`/`-moz-binding:` 等注入模式，不识别 `flex`/`grid`。也就是说若字面复用现状 `validateStyle`，`display: flex` 会**原样放行**（属性名合法、值未被任何模式命中），无法满足 AC-006"全部内置资产零拒绝"同时又须拦住 T-189 明确要求退出的 `display:flex` 声明类别的双重要求。反之，`position`/`float`/`font-family`/定位族本就不在 `CSS_SAFE_PROPERTIES` 白名单里，会被 `isWhitelistedProperty` 天然拒绝——但这是"因为该属性从未被允许过"的副作用，不是"因为它是 FORBIDDEN"的显式语义，且该白名单服务的是 `registerVariant`（MCP 用户输入路径，最小暴露面原则），套用到 `registerBlock`/`registerTheme`/`registerMark`（代码构造期内置资产路径）会误杀 padding/margin/background 等大量合法内置声明——项目已有裁定"三层按输入分工非按属性分类"（构造期黑名单 vs MCP 输入白名单，各自定位不同威胁模型）支持当前实现路线。
- **建议**: 不要求返工；建议 dev-plan 后续修订轮把 AC-001 措辞从"复用 validateStyle"更新为"新建/复用黑名单校验路径（三层分工原则）"，避免下次审查再纠结字面偏离。

### [R-003] LOW: TDD REFACTOR 未见 EVENT-LOG 记录，任务卡 `tdd_refactor: required` 未留痕
- **category**: convention
- **root_cause**: self-caused
- **描述**: `docs/EVENT-LOG.jsonl` 对 T-187 仅有 RED（`02:01:00`）与 GREEN（`02:14:23`）两条 `tdd_phase` 事件，未见 REFACTOR 事件。任务卡显式标注 `tdd_refactor: required`，按 `TDD_REFACTOR_TRIGGER` 应强制触发 REFACTOR 子代理并留痕（对照 T-185 `"TDD REFACTOR: T-185（required + in→Object.hasOwn 修正）"` 的记录范式）。代码层面确有去重迹象（`validateThemeBlocksForbidden` 复用 `validateForbiddenDeclarations` 而非平行实现），推测 REFACTOR 实际发生但事件未记账，审计链不完整。
- **建议**: 补记 EVENT-LOG REFACTOR 事件（或在下次同类任务确保子代理按流程落盘），不影响本次代码质量判定。

### [R-004] LOW: `parseMarkStyleDeclarations` 导出但仅内部消费，无独立测试
- **category**: dead-code
- **root_cause**: self-caused
- **描述**: `style-guard.ts` 导出 `parseMarkStyleDeclarations`，全仓搜索显示只被同文件内的 `validateMarkStyleForbidden` 调用，无外部消费方或独立单测覆盖其解析边界（如空声明、无冒号片段等）。风险低（`validateMarkStyleForbidden` 间接覆盖了主要路径），但作为公开导出留有 ts-prune 类"未引用导出"信号。
- **建议**: 若无外部消费计划可改为模块内私有函数（去掉 export）；若保留导出则补一条边界测试。不阻塞本次判定。

## Verdict

**needs_revision**

存在 1 条 HIGH（R-001：`registerTheme` 遗漏 theme tokens 的构造期 FORBIDDEN 校验），按 COMMON-RULES §三态判定逻辑 HIGH 存在即 needs_revision，无 CRITICAL/HIGH 例外豁免空间。其余 3 条均为 LOW，不改变判定方向。

### 待修复项（进入 revision 流程，仅此项为 blocking）
- R-001（HIGH）：`registerTheme` 补 `definition.tokens` 的构造期 FORBIDDEN 值校验 + 对应正/负向测试（AC-002 完整落地）

### 备查（非阻塞，建议顺手处理或记入 backlog，不阻塞本轮 revision 收口）
- R-002（LOW/reviewer-calibration）：AC-001 字面"复用 validateStyle"与实际"新建黑名单校验器"的分歧已判定为合理设计分工，非缺陷；建议 dev-plan 后续修订轮更新措辞
- R-003（LOW）：`tdd_refactor: required` 未见对应 EVENT-LOG REFACTOR 事件，补记账
- R-004（LOW）：`parseMarkStyleDeclarations` 仅内部消费无独立测试，考虑收窄导出面或补边界测试
