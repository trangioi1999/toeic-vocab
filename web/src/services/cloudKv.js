/*
 * Firebase-mode pieces that need no Firebase SDK, so they are unit-tested with a fake document API.
 * createCloudKv: the kv backend in Firebase mode. Memory first (synchronous getters), cached per uid in
 * localStorage for offline starts, synced with Firestore through an injected `docs` adapter:
 *   docs.listen(path, cb(raw|null)) → unsubscribe;  docs.write(path, raw) → Promise
 */
import { normalizeRole } from '../lib/roles.js';
import { collect, mergeInto } from '../lib/migrate.js';

export const LEARNER_KEYS = ['status', 'known', 'pref', 'toeic700-v3', 'activity', 'checkins'];
export const NOT_ALLOWED = 'Tài khoản chưa được cấp quyền. Nhờ người quản lý thêm vai trò trong Firebase.';

export function pathOf(key, { uid, learnerUid }) {
  if (LEARNER_KEYS.includes(key)) return `learners/${learnerUid}/data/${key}`;
  if (key === 'settings') return `userSettings/${uid}`;
  return null;
}

/** Merge one key's local value into the remote one with the import rules (never downgrade, existing wins). */
function mergeRaw(key, remote, local) {
  if (remote == null) return local;
  const tmp = new Map([[key, remote]]);
  mergeInto({ getItem: k => (tmp.has(k) ? tmp.get(k) : null), setItem: (k, v) => tmp.set(k, v) }, { [key]: local });
  return tmp.get(key);
}

export function createCloudKv({ uid, learnerUid, docs, cache = localStorage, debounceMs = 300, startTimeoutMs = 4000 }) {
  const ids = { uid, learnerUid };
  const keys = [...LEARNER_KEYS, 'settings'];
  const cacheKey = k => `cloud:${uid}:${k}`;
  const mem = new Map();
  const subs = new Set();
  const pending = new Map(); // key → timer
  const confirmed = new Set(); // keys the server has answered at least once
  const offs = [];
  const emit = () => subs.forEach(cb => cb());
  let syncedResolve;
  const synced = new Promise(r => { syncedResolve = r; });

  for (const k of keys) {
    try { const v = cache.getItem(cacheKey(k)); if (v != null) mem.set(k, v); } catch (e) { /* ignore */ }
  }
  const remember = (k, v) => {
    if (v == null) mem.delete(k); else mem.set(k, v);
    try { if (v == null) cache.removeItem(cacheKey(k)); else cache.setItem(cacheKey(k), v); } catch (e) { /* ignore */ }
  };
  const send = k => {
    clearTimeout(pending.get(k));
    pending.delete(k);
    return docs.write(pathOf(k, ids), mem.get(k)).catch(() => {});
  };
  const schedule = k => {
    clearTimeout(pending.get(k));
    pending.set(k, setTimeout(() => send(k), debounceMs));
  };
  const current = k => (mem.has(k) ? mem.get(k) : null);

  /** A snapshot for key k. Before the server's first answer, local edits are merged into it, not replacing it. */
  function onSnapshot(k, raw, meta = {}) {
    const fromServer = !meta.fromCache;
    if (pending.has(k)) {
      if (fromServer && !confirmed.has(k)) {
        const merged = mergeRaw(k, raw, current(k));
        if (merged !== current(k)) { remember(k, merged); emit(); }
        schedule(k);
      }
    } else if (!(raw == null && !fromServer) && raw !== current(k)) {
      remember(k, raw);
      emit();
    }
    if (fromServer && !confirmed.has(k)) {
      confirmed.add(k);
      if (confirmed.size === keys.length) syncedResolve();
    }
  }

  return {
    getItem: current,
    setItem(k, v) {
      const path = pathOf(k, ids);
      if (!path) { mem.set(k, v); emit(); return; }
      remember(k, v);
      emit();
      schedule(k);
    },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    /** Listen to every document; resolves once each has answered (cache or server) or after a timeout offline. */
    start() {
      return new Promise(resolve => {
        const waiting = new Set(keys);
        const timer = setTimeout(resolve, startTimeoutMs);
        for (const k of keys) {
          offs.push(docs.listen(pathOf(k, ids), (raw, meta) => {
            onSnapshot(k, raw, meta);
            waiting.delete(k);
            if (!waiting.size) { clearTimeout(timer); resolve(); }
          }));
        }
      });
    },
    /** Resolves once the server has answered for every key (never on a timeout). */
    whenSynced: () => synced,
    /** Write a key now; resolves when the write is acknowledged. */
    flush: k => (pending.has(k) ? send(k) : Promise.resolve()),
    flushAll() { return Promise.all([...pending.keys()].map(send)); },
    async stop() {
      offs.splice(0).forEach(off => off());
      await Promise.all([...pending.keys()].map(send));
    },
  };
}

/** Once per account: merge the progress kept in this browser (mock mode / old pages) into the cloud. */
export function firstUpload(kv, legacy, uid, flags = legacy) {
  const flag = `uploaded:${uid}`;
  try { if (flags.getItem(flag)) return 0; } catch (e) { return 0; }
  const { added } = mergeInto(kv, collect(legacy));
  try { flags.setItem(flag, new Date().toISOString()); } catch (e) { /* ignore */ }
  return added;
}

/** users/{uid} profile → app user. Throws NOT_ALLOWED when the account has no usable role. */
export function toUser(uid, email, profile) {
  const role = profile ? normalizeRole(profile.role) : null;
  if (!role) throw new Error(NOT_ALLOWED);
  if (role === 'coach' && !(typeof profile.learnerUid === 'string' && profile.learnerUid)) throw new Error(NOT_ALLOWED);
  return {
    uid,
    email: email || '',
    name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : role === 'coach' ? 'Người kèm' : 'Người học',
    role,
    learnerUid: role === 'coach' ? profile.learnerUid : uid,
  };
}

export function authError(code) {
  switch (code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': case 'auth/invalid-email': case 'auth/missing-password':
      return 'Sai email hoặc mật khẩu';
    case 'auth/too-many-requests': return 'Đăng nhập sai nhiều lần. Thử lại sau ít phút';
    case 'auth/network-request-failed': return 'Không có mạng. Kiểm tra kết nối rồi thử lại';
    case 'auth/user-disabled': return 'Tài khoản này đã bị khoá';
    default: return 'Không đăng nhập được. Thử lại sau';
  }
}

/** Run fn after `write` settles, or after `ms` if it never does (offline), so a follow-up sees the data. */
export async function afterWrite(write, fn, ms) {
  await Promise.race([Promise.resolve(write).catch(() => {}), new Promise(r => setTimeout(r, ms))]);
  return fn();
}
