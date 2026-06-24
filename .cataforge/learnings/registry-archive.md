# Learnings Registry — Archive

CLAUDE.md §项目状态 的 Learnings Registry 仅保留最近/最高频条目（上限见 `framework.json#claude_md_limits.learnings_registry_max_entries`）；溢出条目归档于此，全量留存。

## 运行学习

1. 接线类 AC 须行为级测试（仅断言"组件/函数存在"会假绿）。
2. standard 模式跨包子代理易 truncation → GREEN 限定单包可规避 / 主线程接管。
3. 不轻信子代理自报告，主线程取地面真值复核（stale IDE 诊断、stale §项目状态 屡现；以 git / tsc / biome / 全量 vitest 为准）。
4. CSS 属性白名单 SSOT = `packages/core/src/registry/css-property-whitelist.ts`，校验勿旁路。
5. `cataforge deploy --rebuild` 在 <0.13.1 会删 CLAUDE.md（已修，0.14.0 实测安全）。
6. app 私有第三方依赖被集中式 `tests/` 引用时，须同时提至 root devDeps。
7. 改 core 注册契约会回溯波及 reset 型测试。
8. 0.13.1 deploy 从 `framework.json#project.design_tool` 盖入设计工具行。
9. security_sensitive 任务的 per-task code-review 会查出 AC 未覆盖但 ARCH 契约要求的安全路径 → 记 upstream-gap。
10. wiring 类缺陷（route 未挂载 app 树）若测试直接构造子应用会假绿 → code-review 须查 createApp / main 接线终点。
11. CI 门禁强于本地：gitleaks 须 `.gitleaks.toml` allowlist；新代码三元 / 错误路径多会拖低 branch 覆盖 < 90% → PR 前 local `pnpm test:coverage` 预跑补分支测试。
12. Playwright headless-shell TLS 不可下载 → 全量 chromium + `channel:'chromium'` 跑新 headless。
13. 浏览器 / Redis-only 文件 coverage-exclude + 真实 infra 可达性 gate 双层测试（纯逻辑 DI 永跑 / 集成 gate），CI 无 infra 不跌覆盖。
14. feature 切片 squash-merge 后 §项目状态 / EVENT-LOG 须做合并后对账（merge commit 自身带入的状态文字仍是合并前快照，会内部矛盾）。
15. themes 包仅可依赖 `@wechat-flow/contracts`（depcruise `themes-only-contracts`），由 pre-PUSH arch-guard 强制而 pre-commit module-boundaries 不查（类 ⑪）→ 主题侧扩展须导出数据 + 由 registerTheme / 消费者注册，禁主题 import core。
16. 子代理只跑 scoped vitest 会漏 biome 格式 + 跨包 typecheck + 跨包测试断言（vitest 经 esbuild 不做类型检查，残留重命名 / 删除引用、格式问题、跨包遗漏断言不报错）→ 主线程批量修复后须全量 `typecheck` + `vitest` + `biome` 坐实 GREEN。
17. 动态模板字符串 `import(\`...\`)` 可绕过 depcruise module-boundaries 静态分析（"骗过"守卫非尊重边界，不是干净解）→ `packages/*/src/` 内测试需他包内容时应 fs 读数据文件（读文件非包依赖、不触发边界守卫）而非 import 他包；`tests/` 目录豁免 module-boundaries，root 集成测试可走 `@wechat-flow/<pkg>` alias 导入真实包。
