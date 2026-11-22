import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, MOCK } from '../src/services/config.js';

const FB = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a', messagingSenderId: '1' };
const ok = body => async () => ({ ok: true, json: async () => body });

beforeEach(() => localStorage.clear());

describe('loadConfig', () => {
  it('uses Firebase when the Worker returns a config, and caches it', async () => {
    const c = await loadConfig(ok({ firebase: FB, vapidKey: 'v' }));
    expect(c).toEqual({ firebase: FB, vapidKey: 'v' });
    expect(JSON.parse(localStorage.getItem('app-config'))).toEqual(c);
  });
  it('stays in mock mode when the Worker has no Firebase variables', async () => {
    expect(await loadConfig(ok({ firebase: null, vapidKey: null }))).toEqual(MOCK);
  });
  it('treats an incomplete Firebase config as mock', async () => {
    expect(await loadConfig(ok({ firebase: { apiKey: 'k' } }))).toEqual(MOCK);
  });
  it('falls back to the cached config when offline', async () => {
    localStorage.setItem('app-config', JSON.stringify({ firebase: FB, vapidKey: null }));
    const c = await loadConfig(async () => { throw new TypeError('Failed to fetch'); });
    expect(c.firebase).toEqual(FB);
  });
  it('uses mock mode when there is no Worker (dev server returns HTML)', async () => {
    const c = await loadConfig(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
    expect(c).toEqual(MOCK);
  });
  it('gives up after a timeout and uses the cache', async () => {
    vi.useFakeTimers();
    localStorage.setItem('app-config', JSON.stringify({ firebase: FB, vapidKey: null }));
    const p = loadConfig(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(3100);
    expect((await p).firebase).toEqual(FB);
    vi.useRealTimers();
  });
});

describe('word list request', () => {
  it('sends the ID token when signed in with Firebase', async () => {
    vi.resetModules();
    const auth = await import('../src/services/auth.js');
    auth.setAuthBackend({ ...auth.mockBackend, getIdToken: async () => 'tok' });
    const calls = [];
    vi.stubGlobal('fetch', async (url, init) => { calls.push([url, init]); return { ok: true, json: async () => [] }; });
    const { loadVocab } = await import('../src/lib/vocab.js');
    await loadVocab();
    expect(calls.map(c => c[0]).sort()).toEqual(['/examples.json', '/vocab.json']);
    expect(calls.every(c => c[1].headers.Authorization === 'Bearer tok')).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('word list request offline', () => {
  it('still requests the list (served from the offline cache) when the token cannot refresh', async () => {
    vi.resetModules();
    const auth = await import('../src/services/auth.js');
    auth.setAuthBackend({ ...auth.mockBackend, getIdToken: async () => { throw new Error('auth/network-request-failed'); } });
    const calls = [];
    vi.stubGlobal('fetch', async (url, init) => { calls.push([url, init]); return { ok: true, json: async () => [] }; });
    const { loadVocab } = await import('../src/lib/vocab.js');
    await loadVocab();
    expect(calls.map(c => c[0])).toContain('/vocab.json');
    expect(calls.every(c => !c[1])).toBe(true);
    vi.unstubAllGlobals();
  });
});
