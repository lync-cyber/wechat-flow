// 架构依赖图守卫 — 分层方向 + 禁循环。规则与修复指引见 GUARDS.md。
// 跨包「深引用 / 公共 API 边界」由 scripts/check-module-boundaries.mjs 负责（覆盖 .vue），
// 本文件聚焦 dependency-cruiser 独有的图级规则（可达性 / 环检测 / 分层方向）。
//
// 渐进式开关：设环境变量 DEPCRUISE_WARN_ONLY=1 时，所有 error 规则降级为 warn
// （观察期只报告不阻断；存量清零、稳定后去掉该变量即转强制）。

const WARN_ONLY = Boolean(process.env.DEPCRUISE_WARN_ONLY);
const sev = (s) => (WARN_ONLY && s === "error" ? "warn" : s);

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: sev("error"),
      comment:
        "禁止循环依赖。守住架构对 M-002↔M-005 的解环成果（用 contracts.extendSanitizeSchema 共享契约打断环）。修复：把双向共享的类型/契约下沉到 @wechat-flow/contracts，或反转其中一条依赖方向。",
      from: {},
      to: { circular: true },
    },
    {
      name: "contracts-is-sink",
      severity: sev("error"),
      comment:
        "contracts 是最底层 schema 契约包，禁止依赖任何其他 @wechat-flow/* 包。修复：把被引用的内容下沉进 contracts，或把该逻辑移出 contracts。",
      from: { path: "^packages/contracts/src" },
      to: { path: "^(packages/(?!contracts/)|apps/)" },
    },
    {
      name: "no-app-imported-by-pkg",
      severity: sev("error"),
      comment:
        "packages/* 禁止依赖 apps/*（apps 是顶层，禁止反向依赖）。修复：把被复用的逻辑从 app 抽取到合适的 package 再被双方引用。",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "pure-pkg-only-contracts",
      severity: sev("error"),
      comment:
        "palette / ruleset / zh-typo 为底层纯函数包，只能依赖 contracts 与外部库，禁止依赖 core / blocks / marks / themes / apps。",
      from: { path: "^packages/(palette|ruleset|zh-typo)/src" },
      to: { path: "^(packages/(?!(palette|ruleset|zh-typo|contracts)/)|apps/)" },
    },
    {
      name: "core-no-upward",
      severity: sev("error"),
      comment:
        "core 禁止依赖更上层（blocks / marks / themes / apps）。core 只能向下依赖 contracts / palette / ruleset。",
      from: { path: "^packages/core/src" },
      to: { path: "^(packages/(blocks|marks|themes)/|apps/)" },
    },
    {
      name: "themes-only-contracts",
      severity: sev("error"),
      comment: "themes/* 主题包只能依赖 contracts，禁止依赖 core / blocks / marks / apps 等。",
      from: { path: "^packages/themes/" },
      to: { path: "^(packages/(?!themes/)(?!contracts/)|apps/)" },
    },
    {
      name: "no-orphans",
      severity: sev("warn"),
      comment: "孤儿模块：无人引用、且非入口 / 类型声明 / 配置。可能是死代码，确认后删除或接入。",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)index\\.ts$",
          "(^|/)tsconfig\\.[^/]+$",
          "\\.config\\.(ts|js|mjs|cjs|mts|cts)$",
          "\\.(test|spec)\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(node_modules|/dist/|/coverage/|\\.stryker-tmp|/__tests__/|\\.(test|spec)\\.ts$)",
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
  },
};
