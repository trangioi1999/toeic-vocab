/*
 * Firebase mode. Loaded with a dynamic import only when /api/config returns a Firebase config, so the
 * mock-mode bundle never carries the SDK. start(cfg) restores the session, then swaps the auth and kv
 * backends; the rest of the app keeps using services/auth.js and services/store.js.
 */
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, signOut, getIdToken as fbIdToken,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, onSnapshot, setDoc, getDoc,
  getDocFromCache, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { setAuthBackend } from './auth.js';
import { setBackend, localBackend } from './kv.js';
import { createCloudKv, firstUpload, toUser, authError, NOT_ALLOWED } from './cloudKv.js';

let auth, db, vapidKey;
let user = null;
let cloud = null;
const listeners = new Set();
const emit = () => listeners.forEach(cb => cb(user));
const profileKey = uid => `profile:${uid}`;

const docs = {
  listen: (path, cb) => onSnapshot(doc(db, path), s => cb(s.exists() && typeof s.data().raw === 'string' ? s.data().raw : null), () => cb(null)),
  write: (path, raw) => setDoc(doc(db, path), { raw, updatedAt: serverTimestamp() }),
};

/** users/{uid}: server first, Firestore offline cache next, last known profile in localStorage last. */
async function loadProfile(fbUser) {
  const ref = doc(db, 'users', fbUser.uid);
  let data;
  try {
    const s = await getDoc(ref);
    data = s.exists() ? s.data() : null;
  } catch (e) {
    try { const s = await getDocFromCache(ref); data = s.exists() ? s.data() : null; } catch (e2) {
      try { data = JSON.parse(localStorage.getItem(profileKey(fbUser.uid))); } catch (e3) { data = null; }
      if (!data) throw new Error('Không có mạng. Kiểm tra kết nối rồi thử lại');
    }
  }
  const u = toUser(fbUser.uid, fbUser.email, data);
  try { localStorage.setItem(profileKey(fbUser.uid), JSON.stringify({ role: u.role, learnerUid: u.learnerUid, name: u.name })); } catch (e) { /* ignore */ }
  return u;
}

async function enter(u) {
  cloud = createCloudKv({ uid: u.uid, learnerUid: u.learnerUid, docs });
  setBackend(cloud);
  await cloud.start();
  if (u.role === 'student') firstUpload(cloud, localStorage, u.uid);
  user = u;
  emit();
}

async function leave() {
  const c = cloud;
  cloud = null;
  user = null;
  setBackend(localBackend);
  emit();
  if (c) await c.stop();
}

const backend = {
  mode: 'firebase',
  currentUser: () => user,
  onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async login(email, password) {
    let cred;
    try { cred = await signInWithEmailAndPassword(auth, String(email || '').trim(), password || ''); } catch (e) { throw new Error(authError(e.code)); }
    let u;
    try { u = await loadProfile(cred.user); } catch (e) { await signOut(auth).catch(() => {}); throw e; }
    await enter(u);
    return u;
  },
  async logout() {
    await leave();
    await signOut(auth).catch(() => {});
  },
  async getIdToken() { return auth.currentUser ? fbIdToken(auth.currentUser) : null; },
  async afterCheckin(date) {
    const t = await this.getIdToken();
    if (!t) return;
    await fetch('/api/notify-done', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
  },
};

export async function start(cfg) {
  const app = initializeApp(cfg.firebase);
  vapidKey = cfg.vapidKey;
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  setAuthBackend(backend);
  const fbUser = await new Promise(resolve => { const off = onAuthStateChanged(auth, u => { off(); resolve(u); }); });
  if (!fbUser) return;
  try {
    await enter(await loadProfile(fbUser));
  } catch (e) {
    // Session exists but the account has no role (or no network and no cached profile): start signed out.
    if (e.message === NOT_ALLOWED) await signOut(auth).catch(() => {});
  }
}

/** Ask for notification permission (caller) then save this device's FCM token. Returns true on success. */
export async function registerPush() {
  if (!user || !vapidKey) return false;
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return false;
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return false;
  await setDoc(doc(db, 'pushTokens', user.uid), { tokens: arrayUnion(token), updatedAt: serverTimestamp() }, { merge: true });
  return true;
}
