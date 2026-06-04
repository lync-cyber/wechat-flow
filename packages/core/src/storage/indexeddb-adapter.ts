import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "wechat-flow-db";
const DB_VERSION = 1;

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

type WechatFlowDb = {
  documents: {
    key: string;
    value: DocumentRecord;
    indexes: { by_updatedAt: number };
  };
  preferences: {
    key: string;
    value: PreferenceRecord;
  };
};

let dbInstance: IDBPDatabase<WechatFlowDb> | null = null;

export async function getDb(): Promise<IDBPDatabase<WechatFlowDb>> {
  if (dbInstance === null) {
    dbInstance = await openDB<WechatFlowDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const docStore = db.createObjectStore("documents", { keyPath: "id" });
        docStore.createIndex("by_updatedAt", "updatedAt");
        db.createObjectStore("preferences", { keyPath: "key" });
      },
    });
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
}
