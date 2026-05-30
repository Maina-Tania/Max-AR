const DB_NAME = 'maxar_offline';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('wo_queue')) {
        const store = db.createObjectStore('wo_queue', { keyPath: 'local_id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function withStore(storeName, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function queueAdd(item) {
  return withStore('wo_queue', 'readwrite', (store) => reqToPromise(store.put(item)));
}

export async function queueGetAll() {
  return withStore('wo_queue', 'readonly', async (store) => {
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  });
}

export async function queueUpdate(local_id, patch) {
  return withStore('wo_queue', 'readwrite', async (store) => {
    const existing = await reqToPromise(store.get(local_id));
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    await reqToPromise(store.put(updated));
    return updated;
  });
}

export async function queueRemove(local_id) {
  return withStore('wo_queue', 'readwrite', (store) => reqToPromise(store.delete(local_id)));
}

export async function cacheSet(key, value) {
  return withStore('cache', 'readwrite', (store) =>
    reqToPromise(store.put({ key, value, updated_at: new Date().toISOString() }))
  );
}

export async function cacheGet(key) {
  return withStore('cache', 'readonly', async (store) => {
    const row = await reqToPromise(store.get(key));
    return row ? row.value : null;
  });
}

