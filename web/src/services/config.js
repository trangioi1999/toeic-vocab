/*
 * Which backend to run. The Cloudflare Worker answers /api/config from its variables: with Firebase variables
 * set it returns the public web config, otherwise null (mock mode). Cached for offline starts.
 */
export const MOCK = Object.freeze({ firebase: null, vapidKey: null });
const KEY = 'app-config';
const NEEDED = ['apiKey', 'authDomain', 'projectId', 'appId', 'messagingSenderId'];

function clean(c) {
  const fb = c && c.firebase;
  if (!fb || !NEEDED.every(k => typeof fb[k] === 'string' && fb[k])) return MOCK;
  return { firebase: Object.fromEntries(NEEDED.map(k => [k, fb[k]])), vapidKey: typeof c.vapidKey === 'string' && c.vapidKey ? c.vapidKey : null };
}

function cached(storage) {
  try { return clean(JSON.parse(storage.getItem(KEY))); } catch (e) { return MOCK; }
}

export async function loadConfig(fetchFn = (...a) => fetch(...a), storage = localStorage) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
  try {
    const r = await Promise.race([fetchFn('/api/config', { cache: 'no-store' }), timeout]);
    if (!r.ok) throw new Error('http ' + r.status);
    const c = clean(await Promise.race([r.json(), timeout]));
    try { storage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* ignore */ }
    return c;
  } catch (e) {
    if (e instanceof SyntaxError) return MOCK; // no Worker in front (dev server answered with index.html)
    return cached(storage);
  }
}
