import { type DocumentMeta, type DocumentRecord, getDb } from "../storage/indexeddb-adapter.ts";

export async function saveDraft(doc: DocumentRecord): Promise<void> {
  const db = await getDb();
  await db.put("documents", doc);
}

export async function loadDocument(id: string): Promise<DocumentRecord | undefined> {
  const db = await getDb();
  return db.get("documents", id);
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("documents", "by_updatedAt");
  return all
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("documents", id);
}
