/**
 * A video picked on the home page before signing in, kept in this browser (IndexedDB) so it survives the sign-up,
 * Google's redirect included, and the app picks it up. Nothing is sent anywhere until the user generates.
 */
const DB = "vs-pending", STORE = "video", KEY = "next", DAY = 24 * 3600e3;

export type Pending = { file: File; language: string; style: string; at: number };

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((ok, fail) => {
      const tx = db.transaction(STORE, mode), q = f(tx.objectStore(STORE));
      tx.oncomplete = () => ok(q.result as T);
      tx.onerror = tx.onabort = () => fail(tx.error);
    });
  } finally { db.close(); }
}

/** Keep the picked video for after sign-in. False if this browser can't (private mode, no room). */
export async function savePending(p: Omit<Pending, "at">) {
  try { await run("readwrite", (s) => s.put({ ...p, at: Date.now() }, KEY)); return true; } catch { return false; }
}

/** The video waiting from the home page, if any (a day old at most). */
export async function peekPending(): Promise<Pending | null> {
  try {
    const p = await run<Pending | undefined>("readonly", (s) => s.get(KEY));
    if (!p?.file || Date.now() - p.at > DAY) { if (p) await clearPending(); return null; }
    return p;
  } catch { return null; }
}

export async function clearPending() {
  try { await run("readwrite", (s) => s.delete(KEY)); } catch { /* nothing kept */ }
}
