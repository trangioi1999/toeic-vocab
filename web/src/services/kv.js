/*
 * Key-value layer under the store. Mock mode: this browser's localStorage (same keys as the old pages).
 * Firebase mode: services/cloudKv.js, a cache synced with Firestore. Same interface as Storage.
 */
const subs = new Set();
const emit = () => subs.forEach(cb => cb());

export const localBackend = {
  getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage full or blocked */ } emit(); },
  subscribe(cb) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  },
};

let backend = localBackend;
let unhook = backend.subscribe(emit);

export function setBackend(b) {
  unhook();
  backend = b;
  unhook = backend.subscribe(emit);
  emit();
}

export const kv = {
  getItem: k => backend.getItem(k),
  setItem: (k, v) => backend.setItem(k, v),
  subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
};
