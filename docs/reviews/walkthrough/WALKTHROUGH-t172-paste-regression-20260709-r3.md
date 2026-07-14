---
id: "walkthrough-t172-paste-regression-20260709-r3"
doc_type: walkthrough
author: orchestrator
status: draft
deps: ["T-172", "T-157"]
consumers: ["orchestrator"]
---

# T-172 r3 走查清单 — 微信平台粘贴回归（T-157 复验）

## 本轮定位

T-157（微信粘贴兼容回归，P0）当前处于 `conditional_release`，六类缺陷已由修复批一（T-160..T-171）修掉；T-172 是其复验卡，通过后写 `design_signoff` 事件清空 T-157 `blocking_conditions` → 满足 T-159 AC-004。前两轮（T-157 r1 / T-172 r2）走查清单以主线程内联形式交付，**本 r3 升级为持久文件载体**。

**关键：本轮与 r2 的时序差异。** reviewer 侧 `DESIGN-REVIEW-quote-decorations-r2`（verdict `approved_with_notes`）验证的是 **authoring 域**渲染。此后合并的 T-175（微信安全标签化 div→section）、T-182（双相机制）、T-183（output 相归域开闸）改变了**粘贴（output）域**产物。本清单的全部期望值已按**当前 output 域真实渲染实测**重建（`renderMarkdown().html` 已含 output 相规则，即复制到剪贴板的真实产物），非照搬 r2 authoring 域结论。

## ⚠️ 需你明确裁定的决策后果（sign-off 前先看这条）

**T-183 用户裁定① = 剥除 output 域 font-family。** 直接后果：**dropcap 首字在粘贴产物中不再带标题衬线字体**（`LXGW WenKai / Source Han Serif` 等已被剥离），只保留字号（35.2px）、加粗、品牌色、table-cell 悬挂结构。首字将以微信正文默认字体渲染，仅"大 + 粗 + 变色 + 悬挂"，字形观感 ≠ T-140/r2 样张（样张含衬线字形）。

这是你自己的 T-183 决策的既定结果，非缺陷。但它使 dropcap 的视觉与旧样张有肉眼可辨差异，**需你在走查时明确确认"剥 font-family 后的 dropcap 观感可接受"**——否则应改走 `conditional_release`（把 font-family 归属重新裁定为预览域保留 / profile 语义）。

## 走查前置

```bash
pnpm dev          # 起编辑器（editor app）
```

载入回归源：`tests/core/pipeline/fixtures/t157-directive-regression.md`（含全部 32 个指令块的变体矩阵，粘贴进编辑面板即可）。逐主题切换 default / literary / tech 复核装饰色。

四个核心装饰变体（本轮 render-verify 已实测 output 域产物，下表为**你在预览面板应看到、且复制粘贴后应保留**的权威值）：

### ① pull-quote.decorated（引号进首段行首 + 居中署名）

- root `<section>`：`font-size:20px; margin:24px 0; padding:24px 16px; text-align:center`
- 引号 `「` `<span>`：`display:inline-block; font-size:28px; opacity:0.35; vertical-align:top`，**与正文同行**（inline-block，无 position/无绝对定位）
- 署名 `<section>`：内容 `—— 鲁迅`（前缀 `—— ` 完整）；`font-size:14px; text-align:center; margin-top:10px`
- 装饰色随主题：引号 color = `--color-brand`（default `#2d5a4e` / literary `#7b4f2e` / tech `#58a6ff`）；署名 color = `--color-text-muted`（`#78716c` / `#8a7050` / `#6e7681`）
- 无 `<div>`、无 `font-family`、无 `position`、无 `border-left`

### ② quote.large-quote-mark（大引号同行 + 无边框）

- root `<section>`：`color:#555; margin:16px 0; padding:8px 16px`，**无 `border-left`**
- 大引号 `"` `<span>`：`display:inline-block; font-size:32px; opacity:0.4; margin-right:4px; line-height:0.6`，**与正文同行**
- 引号 color = `--color-brand`（随主题，同上）

### ③ quote.dropcap ＆ ④ paragraph.dropcap（首字下沉 table 双格悬挂）

- 结构：`<section display:table; width:100%>` 内含 [首字 cell `<section>` + 正文 `<p display:table-cell>`]
- 首字 cell：`color = --color-brand`（随主题）；`font-size:35.2px`（源 2.2em，output 相 em→px）；`font-weight:700; line-height:1; display:table-cell; width:1%; white-space:nowrap; padding-right:8px; vertical-align:top`
- **首字 cell 无 `font-family`**（见上「决策后果」，output 域已剥除）
- quote.dropcap root 带 `color:#555`（见残差 R-004）；paragraph.dropcap root 仅 `margin:16px 0`（正文色不受首字装饰影响）
- 无 `<div>`、无 `position`

## 逐项走查（对应 T-172 AC）

- [ ] **AC-001 兼容性报告 `directive-attrs-invalid` = 0**
  实测：全 fixture 渲染 `directive-*-invalid` 诊断 **0 条** ✓（已程序化确认）。走查时确认编辑器兼容性/诊断面板无 `directive-attrs-invalid` 告警。
- [ ] **AC-002 四装饰变体渲染与样张视觉一致**
  逐项对照上表 ①②③④：引号与正文同行、无残留左边框、dropcap 悬挂 + line-height 正常、署名带 `—— ` 前缀。**注意 dropcap 首字无衬线字体**（决策①后果，见上）。
- [ ] **AC-003 复制到公众号 → 富文本粘贴保留**
  点「复制到公众号」应出 success 提示（非纯文本降级）。粘贴进**真实微信公众号编辑器**，确认为富文本、装饰元素（引号 span / 署名段 / dropcap 双格 table）样式保留。
  实测佐证：`simulatePaste(渲染产物)` 装饰槽位**全部完整存活**，`droppedAttrs = []`（无属性丢失）；预测的 nodeDiffs 经核实为**纯序列化空格差异假阳性**（`; ` vs `;`，无内容/结构变化）。
- [ ] **AC-004 编辑器交互走查**
  左栏收纳/恢复；状态栏三指标段（可读性/违规词/夜间风险）点击展开锚定；夜间风险明细列表逐项。

## 已知非阻塞残差（不阻 sign-off，登记备查）

- **R-002 LOW**：`large-quote-mark`/`pull-quote decorated` 的引号 span 未锁定 `font-family`（T-174 范围外，样张字形差异既存）。
- **R-004 LOW**：quote root 基线色 `#555` 跨主题字节级相同（§10.5 token 映射歧义已上抛 ui-designer 裁定，范围外事项）。
- **R-005 LOW**：literary 主题 `p` 标签字体字面量比 `tokens.ts` 少 `'宋体'`（pre-existing，独立于装饰路径）。
- **【本轮 r3 新发现】readability-line-height-min 假警告 ×4**：dropcap cell（`line-height:1` ×3）+ large-quote-mark span（`line-height:0.6` ×1）触发可读性守卫 warning。根因：`data-lh-exempt` 豁免标记被 `clamp-line-height`（clamp）尊重、但**不被 `readability-line-height-min`（diagnose）尊重**，且标记"消费即清"于 inline-style 阶段、早于 output 相诊断，诊断时标记已不在。装饰槽位紧凑行高是**有意设计**（非正文），此为诊断噪声、`warning` 级、不影响视觉。走查时会在夜间风险/可读性面板看到——非阻塞，建议折入 dev 批二一并修（让 readability 诊断跳过 exempt 语境，或将豁免标记持久到诊断后再清）。

## 主线程 live 复核（editor 5199，已实地坐实）

以隔离端口 5199 起同一份代码，将四装饰源灌入编辑器，实测预览 iframe：

- ✅ 四装饰变体预览渲染**与 output 域 render-verify 逐字节吻合**（`data-block` 产物 + 截图）：`「…」`引号同行 + `—— 鲁迅`居中署名、大引号 `"` 同行无边框、两个 `首`下沉大而粗且品牌色、table 双格悬挂结构完整。
- ✅ **dropcap 首字 font-family 剥除已视觉坐实**：inline `font-family=(none)`，**计算字体 = `"Noto Sans SC"`**（与正文 `<p>` 同一无衬线字体），色 `rgb(45,90,78)=#2d5a4e`、`35.2px`、`700`。截图中 `首` 明显是无衬线字形，非样张衬线。← **这就是你要裁定的观感点**。
- ✅ **AC-001 兼容性报告 `directive-attrs-invalid = 0`**：展开兼容性报告，全部内容**仅** 4 条可读性 line-height 警告，无任何 directive/兼容问题。
- ✅ 4 条 line-height 警告**对用户可见**：状态栏「可读性 4 项」（橙色，非"良好"）+ 报告展开列 `line-height: 1 < min 1.4 ×3`、`line-height: 0.6 < min 1.4 ×1`——即上文 exempt 未被诊断尊重之发现，非阻塞。夜间风险 0 项。
- ✅ 产物无 `<div>`/无 `position`/无 `border-left`。
- ⚠️ **AC-003「复制到公众号」在预览 harness 无法判定**：点击出「复制失败」，但根因是 `NotAllowedError: Document is not focused`（预览页非聚焦态，浏览器拦剪贴板写）——**环境限制、非复制功能缺陷**。**必须由你在真实聚焦会话（5173，真实点击）验证 success + 真机粘贴**。

## Sign-off 指令

- **全部 AC 通过且接受 dropcap 剥字体观感** → 写入 `docs/EVENT-LOG.jsonl`：
  `event=user_decision`，`detail` 含 `design_signoff T-172: 粘贴回归 r2 通过，T-157 blocking_conditions 清空`，`ref=T-172`。→ T-157 blocking_conditions 清空 → T-159 AC-004 满足。
- **有残差不可接受**（尤其 dropcap 字体观感需保留衬线）→ 本卡产出 `conditional_release`，逐条列 `blocking_conditions`，续接后续修复。
