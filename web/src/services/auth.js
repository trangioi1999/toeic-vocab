/*
 * Auth facade. The mock backend (phase 1 accounts in localStorage) runs until main.jsx switches to the
 * Firebase backend (services/firebase.js) when /api/config says Firebase is configured.
 */
import { normalizeRole } from '../lib/roles.js';

const KEY = 'auth-session';
const ACCOUNTS = [
  { email: 'hocvien@demo.vn', password: '123456', user: { uid: 'student-1', email: 'hocvien@demo.vn', name: 'Học viên', role: 'student' } },
  { email: 'co@demo.vn', password: '123456', user: { uid: 'coach-1', email: 'co@demo.vn', name: 'Người kèm', role: 'coach' } },
];

const mockListeners = new Set();
let cached = { raw: undefined, user: null };

function mockCurrent() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  if (raw !== cached.raw) {
    let user = null;
    try { user = raw ? JSON.parse(raw) : null; } catch (e) { user = null; }
    const role = user && normalizeRole(user.role);
    user = role ? { ...user, role } : null;
    cached = { raw, user };
  }
  return cached.user;
}
const mockEmit = () => { const u = mockCurrent(); mockListeners.forEach(cb => cb(u)); };
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) mockEmit(); });

export const mockBackend = {
  mode: 'mock',
  currentUser: mockCurrent,
  onAuthChange(cb) { mockListeners.add(cb); return () => mockListeners.delete(cb); },
  async login(email, password) {
    const e = String(email || '').trim().toLowerCase();
    const acc = ACCOUNTS.find(a => a.email === e && a.password === password);
    if (!acc) throw new Error('Sai email hoặc mật khẩu');
    try { localStorage.setItem(KEY, JSON.stringify(acc.user)); } catch (err) { /* ignore */ }
    mockEmit();
    return acc.user;
  },
  async logout() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    mockEmit();
  },
  async getIdToken() { return null; },
  afterCheckin() {},
};

let backend = mockBackend;
export function setAuthBackend(b) { backend = b; }
export const authMode = () => backend.mode;

export const currentUser = () => backend.currentUser();
export const onAuthChange = cb => backend.onAuthChange(cb);
export const login = (email, password) => backend.login(email, password);
export const logout = () => backend.logout();
/** Firebase ID token for Worker requests, or null in mock mode / signed out. */
export const getIdToken = () => backend.getIdToken();
/** Called after the learner completes a day (Firebase mode tells the coach). Never throws. */
export function afterCheckin(date) { try { Promise.resolve(backend.afterCheckin(date)).catch(() => {}); } catch (e) { /* ignore */ } }
