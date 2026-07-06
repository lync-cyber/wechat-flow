---
id: "design-review-callout-r1"
doc_type: design-review
author: reviewer
status: approved
deps: ["T-148"]
consumers: ["orchestrator"]
---

# 设计一致性审查 — callout 提示框 4 态形态差异化（T-148 AC-007）

## 审查方式

对照对象：`docs/design/frames/specimens/block-variants-callout.png`（T-140 产出，9 板样张之一，规格源 `ui-spec-wechat-flow-block-variants#§10.1`，各面板底部标注 token 名与实值）。

渲染实证路径：编写最小脚本，直接 `import` `packages/core/src/index.ts` 的 `renderMarkdown`/`getBlockBaseStyle` 与 `packages/blocks/src/index.ts`，用 `npx tsx` 执行；对 `tip`/`warning`/`info`/`danger` 四态分别调用 `getBlockBaseStyle("callout", variantId)` 取解析层实值，并渲染 `:::callout{.<variant>}` container directive markdown（`themeId: "default"`），提取容器 `<div data-block="callout" data-variant="...">` 的 `style` 属性实际计算值。未依赖测试文件断言，独立验证；`tests/core/blocks/callout-variants.test.ts` AC-002~AC-006 断言值仅作交叉参照，结果与本次独立渲染完全一致。

容差判定：hex 完全一致为准（样张标注即设计权威），布局 px 值 ±1px 内视为一致。另对样张关键色块（danger 顶部实条）做像素采样交叉核对色值。

## 结论

**approved** —— 四态渲染结果与 T-140 样张逐项精确吻合，形态结构（不对称圆角/虚实边框组合/全边框+inset高光/顶部实条+零圆角）、色值、尺寸、通用 padding/margin 均无差异。

## 一、tip — 便签角 + 右侧 inset 色条

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-radius | `8px 0 8px 8px 便签角` | `border-radius: 8px 0 8px 8px` | 一致 |
| 右侧 inset 色条 | `inset 右色条 4px: --color-brand #2D5A4E` | `box-shadow: inset -4px 0 0 0 #2D5A4E` | 一致 |
| 背景 | `--color-surface-alt #F3F0EB` | `background: #F3F0EB` | 一致 |
| padding/margin | `padding: 12px 16px · margin: 16px 0` | `padding: 12px 16px; margin: 16px 0` | 一致 |

## 二、warning — 顶虚线 + 底实线

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-top | `2px dashed --color-accent #B94A3E` | `border-top: 2px dashed #B94A3E` | 一致 |
| border-bottom | `2px solid 同色` | `border-bottom: 2px solid #B94A3E` | 一致（同色确认：两声明色值均为 `#B94A3E`） |
| 左右边框 | `无左右边框` | `border`（无独立左右声明）· 仅 top/bottom 声明存在 | 一致 |
| 背景 | `背景透明` | `background: transparent` | 一致 |

## 三、info — 全边框 + 顶部 inset 高光

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border | `1px solid --color-brand #2D5A4E` | `border: 1px solid #2D5A4E` | 一致 |
| 顶部高光 | `inset 顶高光 2px 同色 + 浅阴影 0 1px 3px` | `box-shadow: inset 0 2px 0 0 #2D5A4E, 0 1px 3px rgba(0,0,0,0.06)` | 一致 |
| 背景 | `--color-surface #FAF8F5` | `background: #FAF8F5` | 一致 |

## 四、danger — 顶部 8px 实条 + 零圆角

| 维度 | 样张标注 | 渲染实际值 | 标记 |
|------|---------|-----------|------|
| border-top | `8px solid --color-accent #B94A3E` | `border-top: 8px solid #B94A3E` | 一致（像素采样样张顶部实条色值 `#B94A3E` 交叉确认） |
| border-radius | `0 强化严肃感` | `border-radius: 0` | 一致 |
| 背景 | `--color-accent-light 低饱和浅底（无现成浅底 token 时复用 --color-surface-alt）` | `background: #F3F0EB`（= `--color-surface-alt`，样张自身已标注此为 fallback 路径） | 一致 |

## 五、四态互异性 + AC-001 变体收敛交叉核对

- 四态渲染 `style` 属性各不相同（`tests/core/blocks/callout-variants.test.ts` AC-006 断言的"四态互异"在本次独立渲染中同样成立：四条 `style` 字符串两两不同）。
- AC-001 变体收敛（10 变体收敛为 4：`tip`/`warning`/`info`/`danger`，旧 ID `default`/`filled`/`minimal`/`success`/`error`/`note`/`important` 不再独立注册）与样张底部「收敛映射」标注一致，未做代码层复核（该项为纯注册表结构断言，不涉及视觉渲染，非本次审查重点，`tests/core/blocks/callout-variants.test.ts` AC-001 已覆盖）。

## 判定

verdict: **approved**

无 CRITICAL/HIGH/MEDIUM/LOW 问题。T-148 AC-007 视觉一致性审查通过。
