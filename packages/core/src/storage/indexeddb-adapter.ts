import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "wechat-flow-db";
const DB_VERSION = 2;

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
  size: number;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

export interface BackupRecord {
  id: string;
  docId: string;
  title: string;
  content: string;
  createdAt: number;
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
  backups: {
    key: string;
    value: BackupRecord;
    indexes: { by_docId: string };
  };
};

let dbInstance: IDBPDatabase<WechatFlowDb> | null = null;
let openingPromise: Promise<IDBPDatabase<WechatFlowDb>> | null = null;

export async function getDb(): Promise<IDBPDatabase<WechatFlowDb>> {
  if (dbInstance !== null) {
    return dbInstance;
  }
  if (openingPromise !== null) {
    return openingPromise;
  }
  openingPromise = openDB<WechatFlowDb>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const docStore = db.createObjectStore("documents", { keyPath: "id" });
        docStore.createIndex("by_updatedAt", "updatedAt");
        db.createObjectStore("preferences", { keyPath: "key" });
      }
      if (oldVersion < 2) {
        const backupStore = db.createObjectStore("backups", { keyPath: "id" });
        backupStore.createIndex("by_docId", "docId");
      }
    },
  }).then((db) => {
    dbInstance = db;
    openingPromise = null;
    return db;
  });
  return openingPromise;
}

export async function closeDb(): Promise<void> {
  if (openingPromise !== null) {
    await openingPromise;
  }
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
  openingPromise = null;
}
