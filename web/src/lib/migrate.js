/*
 * Moving progress between sites. Progress lives in localStorage, which belongs to one origin, so the old
 * GitHub Pages site hands its keys to the new one as a code (in the URL hash or pasted by hand).
 * The old site's chuyen-nha.html builds the same code with inline JS: keep the format in sync.
 */
export const MIGRATE_KEYS = ['status', 'known', 'pref', 'toeic700-v3', 'activity', 'checkins', 'settings'];
const BAD = 'Mã dữ liệu không hợp lệ';

const toB64url = bytes => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = s => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

/** {key: rawString} → URL-safe code. */
export function encodeData(data) {
  return toB64url(new TextEncoder().encode(JSON.stringify({ v: 1, data })));
}

/** Code (optionally with a pasted "#d=" prefix) → {key: rawString}. Throws BAD on anything else. */
export function decodeData(code) {
  const s = String(code || '').trim().replace(/^#?d=/, '');
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) throw 0;
    const o = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fromB64url(s)));
    if (!o || o.v !== 1 || !o.data || typeof o.data !== 'object' || Array.isArray(o.data)) throw 0;
    const out = {};
    for (const k of MIGRATE_KEYS) if (typeof o.data[k] === 'string') out[k] = o.data[k];
    return out;
  } catch (e) {
    throw new Error(BAD);
  }
}

/** The progress keys present in a storage. */
export function collect(storage) {
  const out = {};
  for (const k of MIGRATE_KEYS) {
    const v = storage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

const parse = raw => { try { return JSON.parse(raw); } catch (e) { return undefined; } };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Merge incoming progress without losing anything already here:
 * card status keeps the higher value, day records keep the existing entry, same-day card lists are unioned,
 * the legacy known list is unioned, prefs/settings are only filled when missing. Returns entries added.
 */
export function mergeInto(storage, data) {
  let added = 0;
  for (const k of MIGRATE_KEYS) {
    if (!(k in data)) continue;
    const inc = parse(data[k]);
    if (inc === undefined) continue;
    const cur = parse(storage.getItem(k));
    let next;
    if (k === 'pref' || k === 'settings') {
      if (storage.getItem(k) != null || !isObj(inc)) continue;
      next = inc; added++;
    } else if (k === 'known') {
      if (!Array.isArray(inc)) continue;
      const base = Array.isArray(cur) ? cur : [];
      next = [...base];
      for (const x of inc) if (!next.includes(x)) { next.push(x); added++; }
    } else {
      if (!isObj(inc)) continue;
      next = isObj(cur) ? { ...cur } : {};
      for (const [key, val] of Object.entries(inc)) {
        if (!(key in next)) { next[key] = val; added++; continue; }
        if (k === 'status' && typeof val === 'number' && val > next[key]) next[key] = val;
        else if ((k === 'toeic700-v3' || k === 'checkins') && isObj(val) && isObj(next[key])) next[key] = { ...val, ...next[key] };
        else if (k === 'activity' && Array.isArray(val) && Array.isArray(next[key])) {
          const merged = [...next[key]];
          for (const x of val) if (!merged.includes(x)) merged.push(x);
          next[key] = merged;
        }
      }
    }
    storage.setItem(k, JSON.stringify(next));
  }
  // The app reads the legacy known list only while there is no status map; once status exists, fold it in.
  const status = parse(storage.getItem('status'));
  const known = parse(storage.getItem('known'));
  if ('known' in data && isObj(status) && Array.isArray(known)) {
    for (const key of known) if (status[key] !== 2) status[key] = 2;
    storage.setItem('status', JSON.stringify(status));
  }
  return { added };
}
