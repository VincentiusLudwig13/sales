"use client";

const DB_NAME = "SalesmanToolsOfflineDB";
const DB_VERSION = 1;

export interface OfflineDraft {
  outletId: string;
  outletName: string;
  date: string;
  stockChecks: { productId: string; qty: number }[];
  posmChecks: { posmId: string; qty: number }[];
  order: {
    items: { productId: string; qty: number; grossSales: number; discount: number; nettSales: number }[];
    returns: { productId: string; qty: number; value: number }[];
    collectionAmount: number;
    returnDeduction: number;
    grossSales: number;
    discount: number;
    nettSales: number;
    topTerm: string;
    photoUrl: string | null;
  } | null;
  status: "DRAFT" | "SYNCING" | "FAILED";
  errorMessage?: string;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "outletId" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Cache store helper functions
export async function setCache(key: string, data: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cache", "readwrite");
    const store = transaction.objectStore("cache");
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cache", "readonly");
    const store = transaction.objectStore("cache");
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCache(key: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cache", "readwrite");
    const store = transaction.objectStore("cache");
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Drafts store helper functions
export async function saveDraft(draft: OfflineDraft): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDraft(outletId: string): Promise<OfflineDraft | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readonly");
    const store = transaction.objectStore("drafts");
    const request = store.get(outletId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDrafts(): Promise<OfflineDraft[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readonly");
    const store = transaction.objectStore("drafts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDraft(outletId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    const request = store.delete(outletId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllDrafts(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
