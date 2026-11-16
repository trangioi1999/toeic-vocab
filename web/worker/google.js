/*
 * Google APIs from the Worker with a Firebase service account (secret FIREBASE_SERVICE_ACCOUNT):
 * an OAuth access token (JWT bearer grant), Firestore REST (bypasses security rules), FCM HTTP v1.
 */
import { SignJWT, importPKCS8 } from 'jose';

const SCOPE = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging';
let tokenCache = null; // { key, token, exp }

export async function accessToken(sa, fetchFn, now = Date.now()) {
  if (tokenCache && tokenCache.key === sa.client_email && tokenCache.exp - 60_000 > now) return tokenCache.token;
  const key = await importPKCS8(sa.private_key, 'RS256');
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) })
    .setIssuer(sa.client_email).setAudience(tokenUri).setIssuedAt().setExpirationTime('1h').sign(key);
  const r = await fetchFn(tokenUri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!r.ok) throw new Error('google token ' + r.status);
  const j = await r.json();
  tokenCache = { key: sa.client_email, token: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}

/* ---------- Firestore value codec ---------- */
export function decodeValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
export const decodeFields = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, decodeValue(v)]));
export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(v) } };
}
export const encodeFields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, encodeValue(v)]));

/* ---------- Firestore REST ---------- */
export function firestore(projectId, getToken, fetchFn) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const call = async (path, init = {}) => fetchFn(`${base}/${path}`, { ...init, headers: { Authorization: 'Bearer ' + await getToken(), 'Content-Type': 'application/json', ...(init.headers || {}) } });
  return {
    async get(path) {
      const r = await call(path);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('firestore get ' + r.status);
      return decodeFields((await r.json()).fields);
    },
    async list(collection) {
      const r = await call(`${collection}?pageSize=300`);
      if (!r.ok) throw new Error('firestore list ' + r.status);
      return ((await r.json()).documents || []).map(d => ({ id: d.name.split('/').pop(), ...decodeFields(d.fields) }));
    },
    /** Set only the given fields (others on the document are kept). */
    async patch(path, obj) {
      const mask = Object.keys(obj).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
      const r = await call(`${path}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: encodeFields(obj) }) });
      if (!r.ok) throw new Error('firestore patch ' + r.status);
    },
  };
}

/* ---------- FCM ---------- */
/** Send a data-only web push; returns 'ok' | 'dead' (token no longer valid) | 'error'. */
export async function sendPush(projectId, getToken, fetchFn, token, { title, body, url }) {
  const r = await fetchFn(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + await getToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, webpush: { headers: { Urgency: 'high', TTL: '86400' }, data: { title, body, url } } } }),
  });
  if (r.ok) return 'ok';
  let j = {};
  try { j = await r.json(); } catch (e) { /* ignore */ }
  const codes = ((j.error && j.error.details) || []).map(d => d.errorCode);
  if (r.status === 404 || codes.includes('UNREGISTERED')) return 'dead'; // INVALID_ARGUMENT may be the message, not the token
  return 'error';
}
