// Light / dark choice for this device. 'system' follows the OS (tokens.css media query);
// 'light' / 'dark' set <html data-theme>, which tokens.css honours over the OS setting.
// index.html applies the saved choice before the first paint, so there is no flash.
export const THEMES = ['system', 'light', 'dark'];
export const THEME_LABEL = { system: 'Theo máy', light: 'Sáng', dark: 'Tối' };
const KEY = 'theme';
const BAR = { light: '#F3F5F1', dark: '#121715' };
const listeners = new Set();

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : 'system';
  } catch (e) { return 'system'; }
}

export function applyTheme(t, doc = document) {
  const root = doc.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  else root.removeAttribute('data-theme');
  // Browser/phone status bar colour: forced themes override both media-specific metas.
  doc.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const own = (m.getAttribute('media') || '').includes('dark') ? 'dark' : 'light';
    m.setAttribute('content', BAR[t === 'system' ? own : t]);
  });
}

export function setTheme(t) {
  const next = THEMES.includes(t) ? t : 'system';
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch (e) { /* private mode: still applies for this visit */ }
  applyTheme(next);
  listeners.forEach(fn => fn(next));
}

export function nextTheme(t) { return THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]; }

export function onTheme(fn) { listeners.add(fn); return () => listeners.delete(fn); }
