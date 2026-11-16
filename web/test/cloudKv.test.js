import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCloudKv, pathOf, firstUpload } from '../src/services/cloudKv.js';

function fakeDocs() {
  const listeners = new Map(); const writes = [];
  return {
    writes, listeners,
    listen(path, cb) { listeners.set(path, cb); return () => listeners.delete(path); },
    write(path, raw) { writes.push([path, raw]); return Promise.resolve(); },
    remote(path, raw) { listeners.get(path)(raw); },
  };
}
const ids = { uid: 'u1', learnerUid: 'u1' };

beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });

describe('pathOf', () => {
  it('puts learner data under the learner and settings under the user', () => {
    expect(pathOf('checkins', { uid: 'c1', learnerUid: 'u1' })).toBe('learners/u1/data/checkins');
    expect(pathOf('toeic700-v3', ids)).toBe('learners/u1/data/toeic700-v3');
    expect(pathOf('settings', { uid: 'c1', learnerUid: 'u1' })).toBe('userSettings/c1');
    expect(pathOf('auth-session', ids)).toBe(null);
  });
});

describe('createCloudKv', () => {
  it('serves the offline cache before the first snapshot', () => {
    localStorage.setItem('cloud:u1:checkins', '{"d":1}');
    const kv = createCloudKv({ ...ids, docs: fakeDocs() });
    expect(kv.getItem('checkins')).toBe('{"d":1}');
  });
  it('applies remote snapshots, caches them and notifies', async () => {
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    const p = kv.start();
    let n = 0; kv.subscribe(() => n++);
    for (const path of docs.listeners.keys()) docs.remote(path, null);
    await p;
    docs.remote('learners/u1/data/status', '{"a:1":2}');
    expect(kv.getItem('status')).toBe('{"a:1":2}');
    expect(localStorage.getItem('cloud:u1:status')).toBe('{"a:1":2}');
    expect(n).toBeGreaterThan(0);
  });
  it('resolves start after a timeout when offline', async () => {
    vi.useFakeTimers();
    const kv = createCloudKv({ ...ids, docs: fakeDocs() });
    const p = kv.start();
    await vi.advanceTimersByTimeAsync(4100);
    await expect(p).resolves.toBeUndefined();
  });
  it('writes locally at once and to Firestore debounced, last value wins', async () => {
    vi.useFakeTimers();
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    kv.setItem('pref', '{"front":"en"}');
    kv.setItem('pref', '{"front":"vi"}');
    expect(kv.getItem('pref')).toBe('{"front":"vi"}');
    expect(docs.writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(350);
    expect(docs.writes).toEqual([['learners/u1/data/pref', '{"front":"vi"}']]);
  });
  it('keeps a pending local write when an older snapshot arrives', async () => {
    vi.useFakeTimers();
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    kv.setItem('status', '{"a:1":2}');
    docs.remote('learners/u1/data/status', '{"a:1":1}');
    expect(kv.getItem('status')).toBe('{"a:1":2}');
  });
  it('flushes pending writes on stop and stops listening', async () => {
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    kv.setItem('checkins', '{}');
    await kv.stop();
    expect(docs.writes).toEqual([['learners/u1/data/checkins', '{}']]);
    expect(docs.listeners.size).toBe(0);
  });
  it('keeps unknown keys in memory only', () => {
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    kv.setItem('other', 'x');
    expect(kv.getItem('other')).toBe('x');
  });
});

describe('firstUpload', () => {
  it('merges the browser progress into the cloud once per account', async () => {
    const docs = fakeDocs();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    for (const path of docs.listeners.keys()) docs.remote(path, null);
    docs.remote('learners/u1/data/status', '{"a:1":2}');
    localStorage.setItem('status', '{"a:1":1,"b:2":1}');
    localStorage.setItem('toeic700-v3', '{"2026-11-16":{"done":true}}');
    expect(firstUpload(kv, localStorage, 'u1')).toBeGreaterThan(0);
    expect(JSON.parse(kv.getItem('status'))).toEqual({ 'a:1': 2, 'b:2': 1 });
    expect(kv.getItem('toeic700-v3')).toBe('{"2026-11-16":{"done":true}}');
    localStorage.setItem('checkins', '{"2026-11-17":{"at":"x"}}');
    expect(firstUpload(kv, localStorage, 'u1')).toBe(0);
    expect(kv.getItem('checkins')).toBe(null);
  });
});
