# 质量守卫体系（分层：本地 pre-commit → CI）

从本地提交到 CI 的分层质量守卫。本地只跑增量快检查（数秒级），CI 跑全量深度检查。

## 分层总览

| 层 | 触发 | 范围 | 检查项 | 是否阻断 |
|----|------|------|--------|:---:|
| **pre-commit** | `git commit` | 仅 staged 文件 | 格式化+lint（自动修复）/ 密钥扫描 / 模块边界 | 是 |
| **pre-push** | `git push` | affected 包（typecheck）+ 全图（架构） | affected 类型检查 / 架构依赖守卫 | 是 |
| **CI** | push / PR → main | 全量 + 全 git 历史 | lint / typecheck / 覆盖率测试 / 架构守卫 / 模块边界 / 密钥全历史扫描 | 是 |

本地 hook 由 [lefthook](https://github.com/evilmartians/lefthook) 编排，`pnpm install` 时经 `prepare` 脚本自动安装（`lefthook install`）。

## 工具选型

| 关注点 | 工具 | 说明 |
|--------|------|------|
| pre-commit 编排 | **lefthook** | 单二进制、原生并行、staged glob 过滤，最贴合「数秒内」约束 |
| 格式化 / lint | **biome**（既有） | format + lint + organizeImports 一体；pre-commit 自动修复并重新 stage |
| 类型检查 | **tsc**（既有，turbo） | 不进 pre-commit；pre-push 用 `turbo --affected` 只查变更影响包，CI 跑全量（含 tests/tsconfig） |
| 密钥扫描 | **secretlint**（本地）+ **gitleaks**（CI） | 本地纯 npm 锁定、跨平台、扫 staged；CI 扫全 git 历史，深度兜底 |
| 架构依赖守卫 | **dependency-cruiser** | 图级规则：分层方向 + 禁循环（独立运行，无需 ESLint） |
| 模块边界守卫 | `scripts/check-module-boundaries.mjs` | 禁跨包深引用，覆盖 `.vue`（dependency-cruiser 不解析 `.vue` 的盲区补齐） |

## 守卫规则

### 架构依赖图（dependency-cruiser，`.dependency-cruiser.cjs`）

分层模型：`apps/*`（顶层）→ `blocks`·`marks` → `core` → `palette`·`ruleset`·`zh-typo` → `contracts`（最底层）；`themes/*` → `contracts`。

| 规则 | 拦截 | 级别 |
|------|------|:---:|
| `no-circular` | 任何循环依赖 | error |
| `contracts-is-sink` | contracts 依赖其他 `@wechat-flow/*` 包 | error |
| `no-app-imported-by-pkg` | `packages/*` 反向依赖 `apps/*` | error |
| `pure-pkg-only-contracts` | palette/ruleset/zh-typo 依赖 contracts 之外的工作区包 | error |
| `core-no-upward` | core 依赖 blocks/marks/themes/apps | error |
| `themes-only-contracts` | themes/* 依赖 contracts 之外的工作区包 | error |
| `no-orphans` | 无人引用的孤儿模块（疑似死代码） | warn |

### 模块边界（`scripts/check-module-boundaries.mjs`）

| 违规类型 | 例子 |
|----------|------|
| `alias-deep-import` | `import { x } from "@wechat-flow/core/src/registry/theme.ts"` |
| `relative-cross-package` | 用 `../../core/src/...` 相对路径跨包引用内部文件 |

**修复**：跨包导入一律走包级 barrel —— `import { x } from "@wechat-flow/core"`。若 barrel 未导出该符号，去对应包的 `src/index.ts` 补 re-export，而不是深挖 `/src/`。

## 本地命令

```bash
pnpm guard            # 架构守卫 + 模块边界守卫
pnpm guard:arch       # 仅依赖图守卫
pnpm guard:boundaries # 仅模块边界（不传参=全量；传文件=增量）
pnpm guard:secrets    # 全仓密钥扫描

pnpm exec lefthook install   # 手动重装 git hooks（通常 prepare 已自动装）
pnpm exec lefthook run pre-commit  # 手动跑一遍 pre-commit
```

## 渐进式落地

守卫一次性接入后默认为强制阻断（接入前已清零全部存量违规）。引入**新规则**时按以下顺序避免一上来卡死所有人：

1. **观察期（warn-only）**：依赖守卫设 `DEPCRUISE_WARN_ONLY=1`（所有 error 降为 warn，只报告不阻断）；CI `guards` job 步骤可临时加 `continue-on-error: true`。
2. **冻结存量**：若新规则有历史违规，先用 dependency-cruiser 的 known-violations baseline 冻结（只禁新增）。
3. **转强制**：存量清零、观察期稳定后，去掉 `DEPCRUISE_WARN_ONLY` 与 `continue-on-error`，规则转 error 阻断。

## 应急绕过

仅在确有必要时（紧急修复 / 守卫误报待修）：

```bash
git commit --no-verify   # 跳过 pre-commit / pre-push
LEFTHOOK=0 git commit    # 同上，环境变量方式
```

CI 守卫不可绕过；如为误报，请调整 `.dependency-cruiser.cjs` / `.gitleaks.toml` allowlist 并在 PR 说明。
