/*
 * Mock data store (phase 1): everything lives in this browser's localStorage, using the same keys
 * as the old pages (status, known, pref, toeic700-v3) so old and new stay in sync.
 * Phase 2 swaps the internals for Firestore; the exported API stays the same.
 */
import { currentUser } from './auth.js';
import { todayISO, nowLocalISO } from '../lib/dates.js';
import { dayOf } from '../lib/plan.js';
import { canComplete } from '../lib/progress.js';

const K = { status: 'status', known: 'known', pref: 'pref', plan: 'toeic700-v3', activity: 'activity', checkins: 'checkins', settings: 'settings' };
const READ_ONLY = 'Tài khoản cô giáo chỉ được xem';
const DEFAULT_SETTINGS = {
  student: { reminder: true, reminderTime: '20:00' },
  teacher: { notifyDone: true, notifyMissed: true },
};
const DEFAULT_PREFS = { front: 'en', auto: false };

const listeners = new Set();
const cache = new Map();

function readRaw(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
/** Parsed value of a key; the same object is returned until the stored string changes. */
function read(key, fallback) {
  const raw = readRaw(key);
  const c = cache.get(key);
  if (c && c.raw === raw) return c.value;
  let value = fallback;
  try { if (raw) value = JSON.parse(raw); } catch (e) { value = fallback; }
  cache.set(key, { raw, value });
  return value;
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  emit();
}
function emit() { listeners.forEach(cb => cb()); }
function assertStudent() {
  const u = currentUser();
  if (!u || u.role !== 'student') throw new Error(READ_ONLY);
}

export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
if (typeof window !== 'undefined') window.addEventListener('storage', () => emit());

/* ---------- cards ---------- */
const EMPTY = Object.freeze({});
let legacyCache = { raw: undefined, value: EMPTY };
export function getCardStatus() {
  if (readRaw(K.status) !== null) return read(K.status, EMPTY);
  const raw = readRaw(K.known);
  if (raw !== legacyCache.raw) {
    const v = {};
    try { for (const k of JSON.parse(raw) || []) v[k] = 2; } catch (e) { /* ignore */ }
    legacyCache = { raw, value: v };
  }
  return legacyCache.value;
}
export function setCardStatus(key, v) {
  assertStudent();
  const next = { ...getCardStatus() };
  if (v) next[key] = v; else delete next[key];
  const today = todayISO();
  const act = read(K.activity, {});
  const seen = act[today] || [];
  if (!seen.includes(key)) write(K.activity, { ...act, [today]: [...seen, key] });
  write(K.status, next);
}
export const cardsReviewed = date => (read(K.activity, {})[date] || []).length;
export const getActivity = () => read(K.activity, EMPTY);

/* ---------- prefs ---------- */
export const getPrefs = () => read(K.pref, DEFAULT_PREFS);
export function setPrefs(patch) { write(K.pref, { ...getPrefs(), ...patch }); }

/* ---------- plan ---------- */
export const getPlanState = () => read(K.plan, EMPTY);
export function setPlanEntry(date, patch) {
  assertStudent();
  const state = getPlanState();
  const entry = { ...(state[date] || {}), ...patch };
  const day = dayOf(date);
  if (day && 'done' in patch) entry.tasks = day.tasks.map(() => !!patch.done);
  write(K.plan, { ...state, [date]: entry });
}
export function setPlanTask(date, idx, value) {
  assertStudent();
  const day = dayOf(date);
  if (!day) return;
  const state = getPlanState();
  const cur = state[date] || {};
  const tasks = day.tasks.map((_, i) => (cur.tasks ? !!cur.tasks[i] : !!cur.done));
  tasks[idx] = !!value;
  write(K.plan, { ...state, [date]: { ...cur, tasks, done: tasks.every(Boolean) } });
}
export function replacePlanState(state) { assertStudent(); write(K.plan, state); }

/* ---------- check-ins ---------- */
export const getCheckins = () => read(K.checkins, EMPTY);
export function completeDay(date, { note } = {}) {
  assertStudent();
  const day = dayOf(date);
  const cards = cardsReviewed(date);
  const r = canComplete({ day, planEntry: getPlanState()[date], cardsToday: cards });
  if (!r.ok) throw new Error(r.reason);
  const c = { at: nowLocalISO(), cards, note: String(note || '').trim(), planTitle: day ? day.title : '' };
  write(K.checkins, { ...getCheckins(), [date]: c });
  return c;
}
export function undoCheckin(date) {
  assertStudent();
  const next = { ...getCheckins() };
  delete next[date];
  write(K.checkins, next);
}

/* ---------- settings ---------- */
const settingsCache = {};
export const getSettings = role => {
  const all = read(K.settings, EMPTY);
  const c = settingsCache[role];
  if (c && c.src === all) return c.value;
  const value = { ...DEFAULT_SETTINGS[role], ...(all[role] || {}) };
  settingsCache[role] = { src: all, value };
  return value;
};
export function setSettings(role, patch) {
  const u = currentUser();
  if (!u || u.role !== role) throw new Error('Chỉ chủ tài khoản được đổi cài đặt này');
  const all = read(K.settings, {});
  write(K.settings, { ...all, [role]: { ...getSettings(role), ...patch } });
}
