/*
 * Cloudflare Worker in front of the static app (wrangler.toml: run_worker_first for /api/* and /vocab.json).
 *  GET  /api/config       public Firebase web config from variables, or null → the app runs in mock mode
 *  GET  /vocab.json       needs a Firebase ID token once Firebase is configured
 *  POST /api/notify-done  learner finished today → push to their coach
 *  cron (every 10 min)    20:00 reminder to the learner, 23:00 missed-day alert to the coach
 * Without the Firebase variables every route degrades to phase-1 behaviour.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { accessToken, firestore, sendPush } from './google.js';
import { decide } from './decide.js';
import { normalizeRole } from '../src/lib/roles.js';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

const configured = env => !!(env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_APP_ID && env.FIREBASE_MESSAGING_SENDER_ID);
function serviceAccount(env) {
  try { const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || ''); return sa.client_email && sa.private_key ? sa : null; } catch (e) { return null; }
}
/** Push payloads must stay under 4 KB; Vietnamese is ~3 bytes per character. */
const clip = (t, n = 180) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
const parse = raw => { try { return JSON.parse(raw); } catch (e) { return null; } };

/** Firebase ID token → uid. Throws when invalid, expired or for another project. */
export async function verifyIdToken(token, projectId, jwks = GOOGLE_JWKS) {
  const { payload } = await jwtVerify(token, jwks, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId, algorithms: ['RS256'] });
  if (!payload.sub) throw new Error('no subject');
  return payload.sub;
}
async function uidFrom(request, env, deps) {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return null;
  try { return await verifyIdToken(m[1], env.FIREBASE_PROJECT_ID, deps.jwks); } catch (e) { return null; }
}

function google(env, deps) {
  const sa = serviceAccount(env);
  if (!sa) return null;
  const pid = env.FIREBASE_PROJECT_ID;
  const getToken = () => accessToken(sa, deps.fetch);
  return { db: firestore(pid, getToken, deps.fetch), push: (token, msg) => sendPush(pid, getToken, deps.fetch, token, msg) };
}

/** Push to every device of a user; dead tokens are removed. Returns pushes delivered. */
async function pushTo(g, uid, msg) {
  const doc = await g.db.get(`pushTokens/${uid}`);
  const tokens = (doc && Array.isArray(doc.tokens) ? doc.tokens : []).filter(t => typeof t === 'string');
  let sent = 0;
  const alive = [];
  for (const t of tokens) {
    const r = await g.push(t, msg);
    if (r === 'ok') sent++;
    if (r !== 'dead') alive.push(t);
  }
  if (alive.length !== tokens.length) await g.db.patch(`pushTokens/${uid}`, { tokens: alive });
  return sent;
}
const settingsOf = async (g, uid) => parse(((await g.db.get(`userSettings/${uid}`)) || {}).raw) || {};

async function notifyDone(request, env, deps) {
  if (!configured(env)) return json({ error: 'not configured' }, 503);
  const g = google(env, deps);
  if (!g) return json({ error: 'service account missing' }, 503);
  const uid = await uidFrom(request, env, deps);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  let body = {};
  try { body = await request.json(); } catch (e) { /* empty */ }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return json({ error: 'bad date' }, 400);
  const me = await g.db.get(`users/${uid}`);
  if (!me || normalizeRole(me.role) !== 'student') return json({ error: 'forbidden' }, 403);
  const checkins = parse(((await g.db.get(`learners/${uid}/data/checkins`)) || {}).raw) || {};
  const c = checkins[body.date];
  if (!c) return json({ error: 'no check-in' }, 409);
  const coaches = (await g.db.list('users')).filter(u => normalizeRole(u.role) === 'coach' && u.learnerUid === uid);
  const name = me.name || 'Người học';
  let sent = 0;
  for (const coach of coaches) {
    if (((await settingsOf(g, coach.id)).coach || {}).notifyDone === false) continue;
    sent += await pushTo(g, coach.id, {
      title: `${name} đã học xong hôm nay`,
      body: clip(c.note ? `“${c.note}”` : `${c.planTitle || 'Ôn từ vựng'} · ôn ${c.cards || 0} thẻ`),
      url: `/coach/day/${body.date}`,
    });
  }
  return json({ sent });
}

export async function handle(request, env, deps) {
  const url = new URL(request.url);
  if (url.pathname === '/api/config' && request.method === 'GET') {
    if (!configured(env)) return json({ firebase: null, vapidKey: null });
    const pid = env.FIREBASE_PROJECT_ID;
    return json({
      firebase: { apiKey: env.FIREBASE_API_KEY, authDomain: env.FIREBASE_AUTH_DOMAIN || `${pid}.firebaseapp.com`, projectId: pid, appId: env.FIREBASE_APP_ID, messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID },
      vapidKey: env.FIREBASE_VAPID_KEY || null,
    });
  }
  if (url.pathname === '/vocab.json') {
    if (configured(env)) {
      const uid = await uidFrom(request, env, deps);
      if (!uid) return json({ error: 'unauthorized' }, 401);
      // A valid token is not enough (anyone can sign up with the public API key): the account needs a role.
      const g = google(env, deps);
      if (g) {
        const me = await g.db.get(`users/${uid}`).catch(() => undefined);
        if (me !== undefined && !(me && normalizeRole(me.role))) return json({ error: 'forbidden' }, 403);
      }
    }
    return env.ASSETS.fetch(request);
  }
  if (url.pathname === '/api/notify-done' && request.method === 'POST') return notifyDone(request, env, deps);
  if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
  return env.ASSETS.fetch(request);
}

export async function runCron(env, deps) {
  if (!configured(env)) return;
  const g = google(env, deps);
  if (!g) return;
  const users = (await g.db.list('users')).map(u => ({ uid: u.id, role: u.role, learnerUid: u.learnerUid, name: u.name }));
  const data = {}, settings = {}, logs = {};
  for (const u of users) {
    settings[u.uid] = await settingsOf(g, u.uid);
    logs[u.uid] = (await g.db.get(`notifyLog/${u.uid}`)) || {};
    if (normalizeRole(u.role) === 'student') data[u.uid] = { checkins: parse(((await g.db.get(`learners/${u.uid}/data/checkins`)) || {}).raw) || {} };
  }
  const tz = env.TIMEZONE || 'Asia/Ho_Chi_Minh';
  const now = deps.now();
  for (const m of decide({ now, tz, users, data, settings, logs })) {
    await pushTo(g, m.to, m);
    await g.db.patch(`notifyLog/${m.to}`, { [m.kind]: new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now) });
  }
}

const realDeps = { fetch: (...a) => fetch(...a), jwks: GOOGLE_JWKS, now: () => new Date() };

export default {
  fetch: (request, env) => handle(request, env, realDeps),
  scheduled: (event, env, ctx) => ctx.waitUntil(runCron(env, realDeps)),
};
