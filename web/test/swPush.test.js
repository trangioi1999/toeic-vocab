// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

/** Run public/sw.js against a fake service-worker global and return its listeners + calls. */
function loadSw() {
  const listeners = {}; const shown = []; const opened = []; const focused = [];
  const clientsList = [];
  const self = {
    addEventListener: (t, f) => { listeners[t] = f; },
    registration: { showNotification: (title, opts) => { shown.push([title, opts]); return Promise.resolve(); } },
    clients: { matchAll: async () => clientsList, openWindow: async u => { opened.push(u); }, claim: async () => {} },
    location: { origin: 'https://app.test' },
    skipWaiting: () => {},
  };
  const src = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  new Function('self', 'caches', 'location', 'fetch', src)(self, {}, self.location, () => {});
  return { listeners, shown, opened, focused, clientsList };
}
const event = extra => { let p; return { ...extra, waitUntil: x => { p = x; }, get done() { return p; } }; };

describe('service worker push', () => {
  it('shows the data-only FCM payload', async () => {
    const sw = loadSw();
    const e = event({ data: { json: () => ({ data: { title: 'Đến giờ học rồi', body: 'Hôm nay: Làm đề', url: '/today' } }) } });
    sw.listeners.push(e);
    await e.done;
    expect(sw.shown[0][0]).toBe('Đến giờ học rồi');
    expect(sw.shown[0][1]).toMatchObject({ body: 'Hôm nay: Làm đề', data: { url: '/today' } });
  });
  it('still shows something for an unreadable payload', async () => {
    const sw = loadSw();
    const e = event({ data: { json: () => { throw new Error('x'); } } });
    sw.listeners.push(e);
    await e.done;
    expect(sw.shown[0][0]).toBe('Kho Từ TOEIC');
  });
  it('opens the page from the notification', async () => {
    const sw = loadSw();
    const e = event({ notification: { data: { url: '/coach/day/2026-11-16' }, close() {} } });
    sw.listeners.notificationclick(e);
    await e.done;
    expect(sw.opened).toEqual(['/coach/day/2026-11-16']);
  });
  it('focuses an open app window instead of opening another', async () => {
    const sw = loadSw();
    let nav = null; let focused = false;
    sw.clientsList.push({ url: 'https://app.test/today', focus: async () => { focused = true; }, navigate: async u => { nav = u; } });
    const e = event({ notification: { data: { url: '/coach' }, close() {} } });
    sw.listeners.notificationclick(e);
    await e.done;
    expect(focused).toBe(true);
    expect(nav).toBe('/coach');
    expect(sw.opened).toEqual([]);
  });
});
