import { deleteBackupsForDoc } from "../backup/auto-backup.ts";
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
    .map(({ id, title, updatedAt, content }) => ({
      id,
      title,
      updatedAt,
      size: new TextEncoder().encode(content).length,
    }));
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await deleteBackupsForDoc(id);
  await db.delete("documents", id);
}

export async function duplicateDocument(id: string): Promise<string> {
  const doc = await loadDocument(id);
  if (doc === undefined) {
    throw new Error(`Document not found: ${id}`);
  }
  const newId = crypto.randomUUID();
  await saveDraft({
    id: newId,
    title: `${doc.title} 副本`,
    content: doc.content,
    updatedAt: Date.now(),
  });
  return newId;
}
