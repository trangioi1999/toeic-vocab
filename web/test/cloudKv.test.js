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
    localStorage.setItem('toeic700-v3', '{"2026-11-23":{"done":true}}');
    expect(firstUpload(kv, localStorage, 'u1')).toBeGreaterThan(0);
    expect(JSON.parse(kv.getItem('status'))).toEqual({ 'a:1': 2, 'b:2': 1 });
    expect(kv.getItem('toeic700-v3')).toBe('{"2026-11-23":{"done":true}}');
    localStorage.setItem('checkins', '{"2026-11-24":{"at":"x"}}');
    expect(firstUpload(kv, localStorage, 'u1')).toBe(0);
    expect(kv.getItem('checkins')).toBe(null);
  });
});

describe('review fixes: sync safety', () => {
  function docs2() {
    const listeners = new Map(); const writes = [];
    return {
      writes, listeners,
      listen(path, cb) { listeners.set(path, cb); return () => listeners.delete(path); },
      write(path, raw) { writes.push([path, raw]); return Promise.resolve(); },
      server(path, raw) { listeners.get(path)(raw, { fromCache: false }); },
      cache(path, raw) { listeners.get(path)(raw, { fromCache: true }); },
    };
  }
  it('merges a write made before the first server answer instead of replacing cloud data', async () => {
    vi.useFakeTimers();
    const docs = docs2();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    kv.setItem('status', '{"b:2":1}');                       // fresh browser, nothing known yet
    docs.server('learners/u1/data/status', '{"a:1":2}');      // phone's progress arrives late
    expect(JSON.parse(kv.getItem('status'))).toEqual({ 'a:1': 2, 'b:2': 1 });
    await vi.advanceTimersByTimeAsync(350);
    expect(JSON.parse(docs.writes.at(-1)[1])).toEqual({ 'a:1': 2, 'b:2': 1 });
  });
  it('runs the first upload only after every key had a server answer', async () => {
    const docs = docs2();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    let synced = false;
    kv.whenSynced().then(() => { synced = true; });
    const paths = [...docs.listeners.keys()];
    paths.slice(1).forEach(p => docs.server(p, null));
    docs.cache(paths[0], null);
    await Promise.resolve();
    expect(synced).toBe(false);
    docs.server(paths[0], null);
    await Promise.resolve(); await Promise.resolve();
    expect(synced).toBe(true);
  });
  it('ignores a cached "missing" snapshot instead of wiping the offline copy', () => {
    localStorage.setItem('cloud:u1:checkins', '{"d":1}');
    const docs = docs2();
    const kv = createCloudKv({ ...ids, docs });
    kv.start();
    docs.cache('learners/u1/data/checkins', null);
    expect(kv.getItem('checkins')).toBe('{"d":1}');
  });
  it('flush(key) writes at once and resolves when the write is done', async () => {
    vi.useFakeTimers();
    let release; const docs = docs2();
    docs.write = (path, raw) => { docs.writes.push([path, raw]); return new Promise(r => { release = r; }); };
    const kv = createCloudKv({ ...ids, docs });
    kv.setItem('checkins', '{"2026-11-23":{}}');
    let done = false;
    kv.flush('checkins').then(() => { done = true; });
    expect(docs.writes).toEqual([['learners/u1/data/checkins', '{"2026-11-23":{}}']]);
    await Promise.resolve();
    expect(done).toBe(false);
    release(); await Promise.resolve(); await Promise.resolve();
    expect(done).toBe(true);
  });
  it('flushAll sends every pending key (used when the app is hidden)', async () => {
    const docs = docs2();
    const kv = createCloudKv({ ...ids, docs });
    kv.setItem('pref', '{}'); kv.setItem('status', '{}');
    kv.flushAll();
    expect(docs.writes.map(w => w[0]).sort()).toEqual(['learners/u1/data/pref', 'learners/u1/data/status']);
  });
});

describe('afterWrite', () => {
  it('runs the follow-up only after the write is acknowledged', async () => {
    const { afterWrite } = await import('../src/services/cloudKv.js');
    let release; const order = [];
    const w = new Promise(r => { release = r; }).then(() => order.push('write'));
    const p = afterWrite(w, async () => order.push('notify'), 5000);
    await Promise.resolve();
    expect(order).toEqual([]);
    release(); await p;
    expect(order).toEqual(['write', 'notify']);
  });
  it('still runs the follow-up when the write never acknowledges (offline)', async () => {
    vi.useFakeTimers();
    const { afterWrite } = await import('../src/services/cloudKv.js');
    let ran = false;
    const p = afterWrite(new Promise(() => {}), async () => { ran = true; }, 8000);
    await vi.advanceTimersByTimeAsync(8100);
    await p;
    expect(ran).toBe(true);
  });
});
