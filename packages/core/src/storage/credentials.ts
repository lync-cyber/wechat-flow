import { closeDb, getDb } from "./indexeddb-adapter.ts";

const CRED_KEY_STORE_KEY = "cred:__master_key__";
const CRED_KEY_NAMESPACE_PREFIX = "cred:";
const MASTER_KEY_ALGO = { name: "AES-GCM", length: 256 } as const;
const IV_BYTE_LENGTH = 12;

interface EncryptedRecord {
  iv: number[];
  ciphertext: number[];
}

async function getMasterKey(): Promise<CryptoKey> {
  const db = await getDb();
  const record = await db.get("preferences", CRED_KEY_STORE_KEY);
  if (record !== undefined) {
    return record.value as CryptoKey;
  }
  // extractable: false ensures key bytes never leave the CryptoKey object
  const key = await crypto.subtle.generateKey(MASTER_KEY_ALGO, false, ["encrypt", "decrypt"]);
  await db.put("preferences", { key: CRED_KEY_STORE_KEY, value: key });
  return key;
}

async function encrypt(plaintext: string): Promise<EncryptedRecord> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(cipherBuf)),
  };
}

async function decrypt(record: EncryptedRecord): Promise<string> {
  const key = await getMasterKey();
  const iv: Uint8Array<ArrayBuffer> = new Uint8Array(record.iv);
  const cipherBuf: ArrayBuffer = new Uint8Array(record.ciphertext).buffer;
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}

function credKey(namespace: string, field: string): string {
  return `${CRED_KEY_NAMESPACE_PREFIX}${namespace}:${field}`;
}

export async function saveCredential(
  namespace: string,
  field: string,
  plaintext: string
): Promise<void> {
  const encrypted = await encrypt(plaintext);
  const db = await getDb();
  await db.put("preferences", { key: credKey(namespace, field), value: encrypted });
}

export async function loadCredential(
  namespace: string,
  field: string
): Promise<string | undefined> {
  const db = await getDb();
  const record = await db.get("preferences", credKey(namespace, field));
  if (record === undefined) return undefined;
  return decrypt(record.value as EncryptedRecord);
}

export async function loadCredentialGroup(namespace: string): Promise<Record<string, string>> {
  const db = await getDb();
  const prefix = `${CRED_KEY_NAMESPACE_PREFIX}${namespace}:`;
  const allKeys = await db.getAllKeys("preferences");
  const result: Record<string, string> = {};
  for (const k of allKeys) {
    if (typeof k === "string" && k.startsWith(prefix) && k !== CRED_KEY_STORE_KEY) {
      const field = k.slice(prefix.length);
      if (field.length > 0) {
        const rec = await db.get("preferences", k);
        if (rec !== undefined) {
          result[field] = await decrypt(rec.value as EncryptedRecord);
        }
      }
    }
  }
  return result;
}

export async function clearCredential(namespace: string): Promise<void> {
  const db = await getDb();
  const prefix = `${CRED_KEY_NAMESPACE_PREFIX}${namespace}:`;
  // Single readwrite transaction: enumerate and delete atomically
  const tx = db.transaction("preferences", "readwrite");
  const store = tx.objectStore("preferences");
  const allKeys = await store.getAllKeys();
  for (const k of allKeys) {
    if (typeof k === "string" && k.startsWith(prefix)) {
      store.delete(k);
    }
  }
  await tx.done;
}

export { closeDb };
