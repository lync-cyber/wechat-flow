import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCredential,
  loadCredential,
  loadCredentialGroup,
  saveCredential,
} from "./credentials.ts";
import { closeDb, getDb } from "./indexeddb-adapter.ts";

async function clearAllPreferences(): Promise<void> {
  const db = await getDb();
  await db.clear("preferences");
}

beforeEach(async () => {
  await clearAllPreferences();
});

afterEach(async () => {
  await closeDb();
});

describe("AC-003 security: 主密钥为非可导出 CryptoKey", () => {
  it("首次 saveCredential 后 preferences 中主密钥记录 value 是 CryptoKey 且 extractable===false", async () => {
    await saveCredential("qiniu", "accessKey", "any-value");
    const db = await getDb();
    const record = await db.get("preferences", "cred:__master_key__");
    expect(record).toBeDefined();
    const stored = record?.value;
    expect(stored).toBeInstanceOf(CryptoKey);
    expect((stored as CryptoKey).extractable).toBe(false);
  });

  it("主密钥记录 value 不是 number[] 或原始字节", async () => {
    await saveCredential("qiniu", "accessKey", "any-value");
    const db = await getDb();
    const record = await db.get("preferences", "cred:__master_key__");
    const stored = record?.value;
    expect(Array.isArray(stored)).toBe(false);
    // not a plain object with keyBytes
    expect(typeof stored === "object" && stored !== null && "keyBytes" in stored).toBe(false);
  });
});

describe("AC-003 security: 凭据记录不含 keyBytes，仅含 iv+ciphertext", () => {
  it("saveCredential 写入的凭据记录仅有 iv 和 ciphertext 字段，不含 keyBytes", async () => {
    await saveCredential("qiniu", "accessKey", "my-secret");
    const db = await getDb();
    const record = await db.get("preferences", "cred:qiniu:accessKey");
    expect(record).toBeDefined();
    const value = record?.value as Record<string, unknown>;
    expect(value).toHaveProperty("iv");
    expect(value).toHaveProperty("ciphertext");
    expect(value).not.toHaveProperty("keyBytes");
  });
});

describe("AC-003 security: 凭据非明文持久化", () => {
  it("saveCredential 后 preferences 中存储的 value 不包含明文", async () => {
    const plaintext = "my-super-secret-key-12345";
    await saveCredential("qiniu", "accessKey", plaintext);

    const db = await getDb();
    const record = await db.get("preferences", "cred:qiniu:accessKey");
    expect(record).toBeDefined();
    const stored = JSON.stringify(record?.value);
    expect(stored).not.toContain(plaintext);
  });

  it("saveCredential 后 loadCredential 往返解密还原原文", async () => {
    const plaintext = "secret-token-abc";
    await saveCredential("smms", "token", plaintext);
    const loaded = await loadCredential("smms", "token");
    expect(loaded).toBe(plaintext);
  });

  it("closeDb 重开后 loadCredential 仍可解密（fake-indexeddb 同进程持久化语义）", async () => {
    const plaintext = "refresh-survive-secret";
    await saveCredential("oss", "secretKey", plaintext);
    await closeDb();
    // re-open simulates page refresh within same process
    const loaded = await loadCredential("oss", "secretKey");
    expect(loaded).toBe(plaintext);
  });

  it("存储 value 不含明文（回归检查 AES-GCM 加密，非 base64 编码的明文）", async () => {
    await saveCredential("cos", "secretId", "CosPlaintextValue");
    const db = await getDb();
    const record = await db.get("preferences", "cred:cos:secretId");
    const raw = record?.value as unknown;
    expect(typeof raw === "string" ? raw : JSON.stringify(raw)).not.toContain("CosPlaintextValue");
  });
});

describe("AC-003: credentials namespace 隔离与分组读取", () => {
  it("loadCredential 读未设置的 key 返回 undefined", async () => {
    const val = await loadCredential("qiniu", "nonexistent");
    expect(val).toBeUndefined();
  });

  it("loadCredentialGroup 返回 namespace 下所有已保存 key 的解密值", async () => {
    await saveCredential("qiniu", "accessKey", "ak-value");
    await saveCredential("qiniu", "secretKey", "sk-value");
    const group = await loadCredentialGroup("qiniu");
    expect(group).toEqual({ accessKey: "ak-value", secretKey: "sk-value" });
  });

  it("不同 namespace 的凭据互不干扰", async () => {
    await saveCredential("qiniu", "accessKey", "qiniu-ak");
    await saveCredential("oss", "accessKey", "oss-ak");
    const qiniuAk = await loadCredential("qiniu", "accessKey");
    const ossAk = await loadCredential("oss", "accessKey");
    expect(qiniuAk).toBe("qiniu-ak");
    expect(ossAk).toBe("oss-ak");
  });

  it("loadCredentialGroup 只返回目标 namespace 的 key，不含其他 namespace", async () => {
    await saveCredential("qiniu", "accessKey", "qiniu-ak");
    await saveCredential("smms", "token", "smms-tok");
    const qiniuGroup = await loadCredentialGroup("qiniu");
    expect(Object.keys(qiniuGroup)).toEqual(["accessKey"]);
    expect(qiniuGroup).not.toHaveProperty("token");
  });
});

describe("AC-003: clearCredential", () => {
  it("clearCredential 后 loadCredentialGroup 返回空对象", async () => {
    await saveCredential("qiniu", "accessKey", "ak");
    await saveCredential("qiniu", "secretKey", "sk");
    await clearCredential("qiniu");
    const group = await loadCredentialGroup("qiniu");
    expect(group).toEqual({});
  });

  it("clearCredential 只清除指定 namespace", async () => {
    await saveCredential("qiniu", "accessKey", "ak");
    await saveCredential("oss", "accessKey", "oss-ak");
    await clearCredential("qiniu");
    const ossAk = await loadCredential("oss", "accessKey");
    expect(ossAk).toBe("oss-ak");
  });

  it("clearCredential 不影响主密钥记录", async () => {
    await saveCredential("qiniu", "accessKey", "ak");
    await clearCredential("qiniu");
    const db = await getDb();
    const masterRecord = await db.get("preferences", "cred:__master_key__");
    expect(masterRecord).toBeDefined();
    expect(masterRecord?.value).toBeInstanceOf(CryptoKey);
  });
});

describe("AC-003: 加密密钥跨 DB 关闭后持久化（密钥也存 IDB）", () => {
  it("save → closeDb → load 得到相同明文", async () => {
    await saveCredential("custom", "authHeaderValue", "Bearer tok-xyz");
    await closeDb();
    const loaded = await loadCredential("custom", "authHeaderValue");
    expect(loaded).toBe("Bearer tok-xyz");
  });
});
