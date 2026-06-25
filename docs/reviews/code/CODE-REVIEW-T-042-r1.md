---
id: "code-review-T-042-r1"
doc_type: code-review
author: reviewer
status: approved
deps: ["T-042"]
---

# Code Review: T-042 — P-004 设置页（图床配置 + API 密钥 + 凭据加密存储）

Layer 1 delegated to hook（项目已配置 PostToolUse lint hook，编码阶段实时修复）

---

## 问题列表

### [R-001] HIGH: `EncryptedRecord` 内嵌 `keyBytes` — 单条密文自带解密密钥，隔离性丧失

- **category**: security
- **root_cause**: self-caused
- **描述**: `credentials.ts` 的 `EncryptedRecord` 接口含 `keyBytes: number[]` 字段（第 11 行），且 `encrypt()` 在每条写入记录时将主密钥明文字节嵌入记录体（第 41 行），`decrypt()` 直接读取 `record.keyBytes` 而非集中管理的 `CRED_KEY_STORE_KEY` 条目来重建密钥（第 46 行）。这导致：
  1. **隔离性丧失**：任何能读取一条凭据记录的攻击路径（例如 IndexedDB 原始转储、存储层漏洞）同时得到解密密钥，AES-GCM 加密退化为"数据混淆"而非真正加密隔离。
  2. **密钥双事实源**：主密钥既集中存在 `cred:__master_key__` 条目（由 `getMasterKeyBytes()` 管理），又冗余分散在每条凭据记录内，两个来源理应一致但无任何校验约束，未来若发生密钥轮换只更新集中存储，已有记录内嵌的旧 `keyBytes` 仍存在，形成密钥版本漂移隐患。
  3. **数据膨胀**：每条凭据记录额外携带 32 字节主密钥（数组序列化后约 256 字节 JSON），而主密钥已有独立存储条目，属于无效冗余。
- **建议**: 将 `EncryptedRecord` 精简为 `{ iv: number[]; ciphertext: number[] }`，`decrypt()` 改为调用 `getMasterKeyBytes()` 读取集中存储的主密钥，而非从记录内读取 `keyBytes`。`encrypt()` 返回值同步去掉 `keyBytes` 字段。此变更同时消除隔离性漏洞、双事实源和数据膨胀三个问题。如需支持未来密钥轮换，可在 `EncryptedRecord` 中增加 `keyId: string` 字段标识密钥版本，但密钥本身绝不内嵌于数据记录。

---

### [R-002] HIGH: 主密钥以 `{ keyBytes: number[] }` 明文形式存入 IndexedDB — 加密等效于无

- **category**: security
- **root_cause**: self-caused
- **描述**: `getMasterKeyBytes()` 通过 `crypto.subtle.generateKey(..., true, ...)` 生成主密钥（`extractable: true`），再 `exportKey("raw")` 导出原始字节，以 `Array.from(new Uint8Array(exported))` 的 JSON 数组形式存入 `preferences` store（第 22–24 行）。这意味着主密钥在 IndexedDB 中完全明文存储。任何可以读取 `preferences` store 的攻击路径（扩展程序、XSS 存 IDB 读取、物理访问文件系统等）直接拿到主密钥，即可解密所有凭据记录。整个 AES-GCM 加密层的保护能力在主密钥泄露场景下完全失效，AC-003 "值非明文" 的安全不变量在更广攻击面视角下形同虚设。
- **建议**: 浏览器环境内真正不可导出的密钥应使用 `extractable: false` 并由 Web Crypto API 在 `CryptoKey` 对象层面持久化。推荐做法：使用 `crypto.subtle.generateKey({...}, false, ["encrypt","decrypt"])` + IndexedDB 直接存储 `CryptoKey` 对象（idb 库支持将 `CryptoKey` 原样序列化写入 IDB，浏览器保证私钥不可导出且跨会话存续）。这样主密钥永不以原始字节形式出现在 JS 层或 JSON 序列化路径中。若考虑跨浏览器兼容性边缘情形，可保留当前 "exportable + stored bytes" 路线但需明确风险说明，并在威胁模型中声明受限于 "浏览器同源存储不被物理访问" 假设。

---

### [R-003] MEDIUM: `clearCredential` 中先读取全部 key 再在独立事务中批量删除 — 非原子性

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `clearCredential()` 先 `db.getAllKeys("preferences")` 拿到快照（第 100 行），然后开启新事务批量删除（第 101–108 行）。两步之间若有并发写入（如同时触发两次 `clearCredential` 或者 `save()` 并发），快照与实际存储可能不一致，导致部分新写入的 key 未被清除，或删除了不属于该 namespace 的 key（尽管 prefix 过滤减轻了后者风险）。对于设置页场景，并发概率低，但原子性缺失属于架构隐患。
- **建议**: 将 `getAllKeys` 和后续删除合并到同一个 `readwrite` 事务中（即先 `tx = db.transaction("preferences","readwrite"); store = tx.objectStore("preferences"); keys = await store.getAllKeys(); for(k) store.delete(k)`），确保快照和删除在同一 IDB 事务内执行，消除竞态窗口。

---

### [R-004] MEDIUM: `ImageHostConfig` 的 `clear()` 缺少错误处理 — 失败无反馈

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `ImageHostConfig.vue` 的 `clear(id)` 函数（第 71–79 行）直接 `await clearCredential(id)` 而无 try/catch。若 IndexedDB 操作失败（如存储配额超出、版本锁定等），函数抛出未处理异常，UI 无错误反馈，用户不知道清除操作是否成功，且异常可能冒泡到 Vue 的全局 error handler 而非被局部处理。对比 `save()` 已有 try/catch + Toast 反馈（第 59–68 行），`clear()` 缺乏同等防护属于一致性缺失。
- **建议**: 与 `save()` 保持一致，在 `clear()` 内加 try/catch，失败时 `pushToast({ type: "error", message: "清除失败，请重试" })`。

---

### [R-005] MEDIUM: `loadCredentialGroup` 未在 `clearCredential` 完成前等待 — `clear()` 中存在顺序隐患

- **category**: error-handling
- **root_cause**: self-caused
- **描述**: `ImageHostConfig.vue` 的 `clear(id)` 在调用 `clearCredential(id)` 后立即执行内存字段清空（第 73–78 行），不存在问题。但更深层的问题是 `clearCredential` 不返回操作成功的语义保证（不等同于注意事项 R-003），当 `clearCredential` 因 IDB 事务失败而 reject 时，`clear()` 缺失 try/catch 会导致后面的内存字段清空 `group[k] = ""` 执行不到，UI 和实际存储状态不一致（存储未清但 UI 看起来已清）。此问题与 R-004 同根，均由缺少错误处理导致。
- **建议**: 同 R-004，加 try/catch。仅在 `clearCredential` 成功后才清空内存 `fields`；失败时 Toast 告知用户。

---

### [R-006] MEDIUM: 测试中 `@wechat-flow/core` 全量 mock 替换实际 credentials 逻辑 — AC-003 加密不变量未经真实路径验证

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `ImageHostConfig.test.ts` 和 `ApiKeyConfig.test.ts` 均通过 `vi.mock("@wechat-flow/core", async (importOriginal) => { ...actual, saveCredential: vi.fn() })` 替换了 `saveCredential` / `loadCredentialGroup` / `clearCredential`（第 6–20 行）。这意味着组件测试验证的是"组件调用了 saveCredential"，但完全没有验证该调用最终触发加密写入非明文的行为。AC-003 的安全不变量（"存储值非明文"）仅由 `credentials.test.ts` 覆盖，但这两个文件之间的集成链路（Vue 组件 → `@wechat-flow/core` → IDB）未有任何测试验证。如果 `credentials.ts` 的加密实现回退为明文存储，组件测试不会感知。
- **建议**: 可接受现状（组件测试 = UI 行为，单元测试 = 加密逻辑，各自职责）并在 sprint-review 归入已知 gap；或在 `ImageHostConfig.test.ts` 补充一个不 mock `saveCredential` 的集成测试（使用 `fake-indexeddb` + 真实 credentials），断言写入 IDB 后原始 record 不含明文。注意：组件套件整体使用 module-level mock 替换被测包，如需补集成测试建议开新 describe 块并局部覆盖 mock。

---

### [R-007] LOW: `credentials.test.ts` 中 `closeDb → load` 测试依赖 `fake-indexeddb` 的全局单例行为 — 跨实现不稳定

- **category**: test-quality
- **root_cause**: self-caused
- **描述**: `credentials.test.ts` 第 44–51 行测试 "closeDb 重开后 loadCredential 仍可解密"，其行为依赖 `fake-indexeddb/auto` 在同一进程内的单例持久化语义（关闭 DB 不清除数据）。这与真实浏览器行为一致，但若测试环境切换（如升级 `fake-indexeddb` 版本，或迁移到 happy-dom + native IDB shim），持久化行为可能不同，导致测试假绿或假红，排查成本高。
- **建议**: 在测试注释中（或 describe 块名称中）说明该测试依赖 `fake-indexeddb` 的同进程持久化语义，便于维护者快速定位。低优先级，不阻塞。

---

### [R-008] LOW: `ImageHostConfig.vue` 在 `clear()` 后未给「本地」图床（无凭据）额外保护 — 行为一致性

- **category**: convention
- **root_cause**: self-caused
- **描述**: `hosts` 数组中 `local` 的 `fields.local` 为空对象 `{}`（第 31 行），`clear("local")` 会调用 `clearCredential("local")`，该操作因 `local` namespace 下没有任何已存 key 而无副作用，但从调用语义上看属于冗余调用（`local` 对应 "本地存储无需额外凭据"，UI 上也不显示保存/清除按钮 `v-if="host.id !== 'local'"`，故 `clear("local")` 实际不可被用户触发）。无实际 bug 但存在隐式逻辑耦合。
- **建议**: 在 `clear()` 函数头部或 `save()` 函数中增加对 `id === "local"` 的 early return，将语义显式化，防止日后重构意外引入 `local` namespace 的写入。

---

### [R-009] LOW: `SettingsPage.vue` 的「编辑器」「主题与品牌」「同步与协作」「关于」四个 section 仅有占位 `<p>` — wiring 不完整但有 placeholder 标记

- **category**: completeness
- **root_cause**: self-caused
- **描述**: T-042 范围聚焦图床配置和 API 密钥，`SettingsPage.vue` 中的其他四个 section（editor / theme / sync / about）仅有 `<p class="settings-content__placeholder">...` 占位，无实际功能组件挂载。代码中无 `[ASSUMPTION]` / `[TODO]` 等追踪标记（违反 COMMON-RULES §通用 Anti-Patterns — "遗留未标注的 TODO"）。由于 T-042 AC 仅覆盖图床与 API 密钥两项，这四个占位 section 属于合理 scope（依赖项 T-040/T-041 等），但缺少标注仍违反约定。
- **建议**: 在每个占位 `<p>` 上方添加内联注释说明依赖任务（如 `<!-- [ASSUMPTION]: 待 T-040 实现编辑器配置组件 -->`），或以 `[ASSUMPTION]` 注记占位意图。LOW 级别，不阻塞任务通过。

---

## 安全不变量核验结论（orchestrator 指定疑点）

**R-001 已定级 HIGH**。确认：`EncryptedRecord.keyBytes` 导致每条密文记录自带解密密钥，单条记录即可自解密（隔离性丧失），且形成密钥双事实源（集中存储 `cred:__master_key__` + 每记录内嵌）。应改为 `{iv, ciphertext}` 仅结构，`decrypt` 读集中 key。

**R-002 已定级 HIGH**。独立于 R-001：即使修复 R-001，主密钥本身仍以 `Array.from(new Uint8Array(exported))` 明文字节 JSON 存入 IDB，AES-GCM 的安全基础依赖主密钥不泄露，而该密钥完全可读。

---

## Verdict

**needs_revision**

存在 2 个 HIGH 级别安全问题（R-001: 每条凭据记录内嵌主密钥导致隔离性丧失；R-002: 主密钥以明文字节 JSON 存入 IndexedDB）。这两个问题直接违反 AC-003 安全不变量（"IndexedDB 中绝不明文" 的精神目标）及 security_sensitive 任务的隔离性要求，需修复后重审。

| ID | 严重等级 | category | 摘要 |
|----|---------|----------|------|
| R-001 | HIGH | security | EncryptedRecord 内嵌 keyBytes，单记录自带解密密钥 |
| R-002 | HIGH | security | 主密钥以明文字节 JSON 存入 IndexedDB |
| R-003 | MEDIUM | error-handling | clearCredential 非原子性（两步事务） |
| R-004 | MEDIUM | error-handling | clear() 缺少 try/catch，失败无 Toast 反馈 |
| R-005 | MEDIUM | error-handling | clear() 失败时内存字段与 IDB 状态不一致 |
| R-006 | MEDIUM | test-quality | 组件测试全量 mock credentials，AC-003 加密链路未端到端覆盖 |
| R-007 | LOW | test-quality | fake-indexeddb 跨版本稳定性依赖未标注 |
| R-008 | LOW | convention | clear("local") 可被隐式触发，语义未显式守卫 |
| R-009 | LOW | completeness | 四个占位 section 缺少 [ASSUMPTION] 追踪标记 |
