import { type BackupRecord, getDb } from "../storage/indexeddb-adapter.ts";

export const MAX_BACKUPS_PER_DOC = 5;

let _backupSeq = 0;

export async function createBackup(docId: string): Promise<string> {
  const db = await getDb();
  const doc = await db.get("documents", docId);
  if (doc === undefined) {
    throw new Error(`Document not found: ${docId}`);
  }

  const id = crypto.randomUUID();
  // Use a monotonically increasing sequence to break ties when Date.now() has ms-level resolution
  const createdAt = Date.now() * 1000 + (_backupSeq++ % 1000);
  const record: BackupRecord = {
    id,
    docId,
    title: doc.title,
    content: doc.content,
    createdAt,
  };
  await db.put("backups", record);

  const all = await db.getAllFromIndex("backups", "by_docId", docId);
  all.sort((a, b) => a.createdAt - b.createdAt);
  if (all.length > MAX_BACKUPS_PER_DOC) {
    const toDelete = all.slice(0, all.length - MAX_BACKUPS_PER_DOC);
    for (const old of toDelete) {
      await db.delete("backups", old.id);
    }
  }

  return id;
}

export async function listBackups(docId: string): Promise<BackupRecord[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("backups", "by_docId", docId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteBackupsForDoc(docId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex("backups", "by_docId", docId);
  for (const record of all) {
    await db.delete("backups", record.id);
  }
}
