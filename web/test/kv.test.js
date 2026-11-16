import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { kv, setBackend, localBackend } from '../src/services/kv.js';
import * as store from '../src/services/store.js';
import { mergeInto } from '../src/lib/migrate.js';

function fakeBackend(init = {}) {
  const data = { ...init }; const subs = new Set();
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; subs.forEach(cb => cb()); },
    subscribe: cb => { subs.add(cb); return () => subs.delete(cb); },
    push(k, v) { data[k] = v; subs.forEach(cb => cb()); },
  };
}

beforeEach(() => { localStorage.clear(); setBackend(localBackend); });
afterEach(() => setBackend(localBackend));

describe('kv', () => {
  it('reads and writes localStorage by default', () => {
    kv.setItem('pref', '{"front":"vi"}');
    expect(localStorage.getItem('pref')).toBe('{"front":"vi"}');
    expect(kv.getItem('pref')).toBe('{"front":"vi"}');
  });
  it('routes reads and writes to a swapped backend', () => {
    const b = fakeBackend({ checkins: '{"2026-11-16":{"at":"x"}}' });
    setBackend(b);
    expect(store.getCheckins()).toEqual({ '2026-11-16': { at: 'x' } });
    kv.setItem('pref', '{}');
    expect(b.data.pref).toBe('{}');
    expect(localStorage.getItem('pref')).toBe(null);
  });
  it('tells store subscribers when the backend changes underneath', () => {
    const b = fakeBackend();
    setBackend(b);
    let n = 0;
    const off = store.subscribe(() => n++);
    b.push('checkins', '{}');
    off();
    expect(n).toBeGreaterThan(0);
  });
  it('tells store subscribers when the backend is swapped', () => {
    let n = 0;
    const off = store.subscribe(() => n++);
    setBackend(fakeBackend());
    off();
    expect(n).toBeGreaterThan(0);
  });
  it('lets the migration merge into the active backend', () => {
    const b = fakeBackend({ status: '{"a:1":2}' });
    setBackend(b);
    mergeInto(kv, { status: '{"b:2":1}' });
    expect(JSON.parse(b.data.status)).toEqual({ 'a:1': 2, 'b:2': 1 });
  });
});
