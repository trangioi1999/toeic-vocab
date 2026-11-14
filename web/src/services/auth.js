/*
 * Mock authentication (phase 1). Phase 2 replaces the body of these functions with Firebase Auth;
 * the exported API stays the same.
 */
const KEY = 'auth-session';
const ACCOUNTS = [
  { email: 'hocvien@demo.vn', password: '123456', user: { uid: 'student-1', email: 'hocvien@demo.vn', name: 'Học viên', role: 'student' } },
  { email: 'co@demo.vn', password: '123456', user: { uid: 'teacher-1', email: 'co@demo.vn', name: 'Cô giáo', role: 'teacher' } },
];
export const DEMO_ACCOUNTS = ACCOUNTS.map(a => ({ email: a.email, password: a.password, role: a.user.role }));

const listeners = new Set();
let cached = { raw: undefined, user: null };

export function currentUser() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  if (raw !== cached.raw) {
    let user = null;
    try { user = raw ? JSON.parse(raw) : null; } catch (e) { user = null; }
    cached = { raw, user };
  }
  return cached.user;
}

function emit() { const u = currentUser(); listeners.forEach(cb => cb(u)); }

export async function login(email, password) {
  const e = String(email || '').trim().toLowerCase();
  const acc = ACCOUNTS.find(a => a.email === e && a.password === password);
  if (!acc) throw new Error('Sai email hoặc mật khẩu');
  try { localStorage.setItem(KEY, JSON.stringify(acc.user)); } catch (err) { /* ignore */ }
  emit();
  return acc.user;
}

export async function logout() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  emit();
}

export function onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) emit(); });
