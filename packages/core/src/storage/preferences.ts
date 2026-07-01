import { getDb } from "./indexeddb-adapter.ts";

export async function saveSplitterWidth(panelId: string, width: number): Promise<void> {
  const db = await getDb();
  await db.put("preferences", { key: `splitter:${panelId}`, value: width });
}

export async function loadSplitterWidth(panelId: string): Promise<number | undefined> {
  const db = await getDb();
  const record = await db.get("preferences", `splitter:${panelId}`);
  if (record === undefined) return undefined;
  return record.value as number;
}

export interface EditorPreferences {
  inputAssist: boolean;
  fontSize: number;
  lineHeight: number;
}

export async function saveEditorPreferences(prefs: EditorPreferences): Promise<void> {
  const db = await getDb();
  await db.put("preferences", { key: "editor", value: prefs });
}

export async function loadEditorPreferences(): Promise<Partial<EditorPreferences> | undefined> {
  const db = await getDb();
  const record = await db.get("preferences", "editor");
  return record?.value as Partial<EditorPreferences> | undefined;
}
