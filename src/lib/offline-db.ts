/**
 * Palex Offline DB — IndexedDB wrapper
 *
 * Stores:
 *  - "visitas"       → borradores de formulario guardados localmente
 *  - "sync-queue"    → visitas pendientes de enviar al servidor
 */

const DB_NAME = "palex-offline";
const DB_VERSION = 1;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DraftVisita {
  /** Clave: visitaId (string) */
  id: string;
  hospitalNombre: string;
  datos: Record<string, unknown>;
  updatedAt: number; // timestamp ms
}

export interface SyncItem {
  id: string; // visitaId
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: number;
}

// ─── Open DB ──────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("visitas")) {
        db.createObjectStore("visitas", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("sync-queue")) {
        db.createObjectStore("sync-queue", { keyPath: "id" });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Helpers IDB ──────────────────────────────────────────────────────────────

function tx(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode = "readonly"
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Visitas (borradores) ─────────────────────────────────────────────────────

export async function saveDraft(draft: DraftVisita): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "visitas", "readwrite").put(draft));
}

export async function getDraft(id: string): Promise<DraftVisita | undefined> {
  const db = await openDB();
  return promisify<DraftVisita | undefined>(tx(db, "visitas").get(id));
}

export async function getAllDrafts(): Promise<DraftVisita[]> {
  const db = await openDB();
  return promisify<DraftVisita[]>(tx(db, "visitas").getAll());
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "visitas", "readwrite").delete(id));
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export async function enqueueSync(item: Omit<SyncItem, "attempts" | "createdAt">): Promise<void> {
  const db = await openDB();
  const full: SyncItem = { ...item, attempts: 0, createdAt: Date.now() };
  await promisify(tx(db, "sync-queue", "readwrite").put(full));
}

export async function getSyncQueue(): Promise<SyncItem[]> {
  const db = await openDB();
  return promisify<SyncItem[]>(tx(db, "sync-queue").getAll());
}

export async function incrementSyncAttempt(id: string): Promise<void> {
  const db = await openDB();
  const store = db.transaction("sync-queue", "readwrite").objectStore("sync-queue");
  const item = await promisify<SyncItem | undefined>(store.get(id));
  if (item) {
    item.attempts += 1;
    await promisify(store.put(item));
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "sync-queue", "readwrite").delete(id));
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openDB();
  await promisify(tx(db, "sync-queue", "readwrite").clear());
}
