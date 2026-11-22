// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, exportJWK, exportPKCS8, SignJWT, createLocalJWKSet } from 'jose';
import { handle, runCron, verifyIdToken } from '../worker/index.js';
import { encodeFields } from '../worker/google.js';

const PID = 'demo-x';
let idKey, jwks, sa;
beforeAll(async () => {
  const k = await generateKeyPair('RS256', { extractable: true });
  idKey = k.privateKey;
  const pub = { ...(await exportJWK(k.publicKey)), kid: 'k1', alg: 'RS256' };
  jwks = createLocalJWKSet({ keys: [pub] });
  const s = await generateKeyPair('RS256', { extractable: true });
  sa = { client_email: 'svc@demo-x.iam.gserviceaccount.com', private_key: await exportPKCS8(s.privateKey), private_key_id: 's1', token_uri: 'https://oauth2.googleapis.com/token', project_id: PID };
});
const idToken = (uid, over = {}) => new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
  .setIssuer(over.iss || `https://securetoken.google.com/${PID}`).setAudience(over.aud || PID).setSubject(uid)
  .setIssuedAt().setExpirationTime(over.exp || '1h').sign(idKey);

const ENV = { FIREBASE_API_KEY: 'k', FIREBASE_PROJECT_ID: PID, FIREBASE_APP_ID: 'a', FIREBASE_MESSAGING_SENDER_ID: '1', FIREBASE_VAPID_KEY: 'v', TIMEZONE: 'Asia/Ho_Chi_Minh' };
const assets = { fetch: async req => new Response('asset:' + new URL(req.url).pathname) };

/** Fake Google: OAuth token endpoint, Firestore REST over an in-memory db, FCM. */
function google(db) {
  const sent = [], patched = [];
  const docName = p => `projects/${PID}/databases/(default)/documents/${p}`;
  const fetchFn = async (url, init = {}) => {
    const u = new URL(url);
    if (u.host === 'oauth2.googleapis.com') return Response.json({ access_token: 'at', expires_in: 3600 });
    if (u.host === 'fcm.googleapis.com') {
      const m = JSON.parse(init.body).message;
      if (m.token === 'dead') return Response.json({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }, { status: 404 });
      sent.push(m); return Response.json({ name: 'ok' });
    }
    if (u.host === 'firestore.googleapis.com') {
      const path = decodeURIComponent(u.pathname.split('/documents/')[1] || '');
      if (init.method === 'PATCH') { patched.push([path, JSON.parse(init.body)]); return Response.json({}); }
      if (path === 'users') return Response.json({ documents: Object.entries(db).filter(([p]) => p.startsWith('users/')).map(([p, v]) => ({ name: docName(p), fields: encodeFields(v) })) });
      if (!(path in db)) return Response.json({ error: { status: 'NOT_FOUND' } }, { status: 404 });
      return Response.json({ name: docName(path), fields: encodeFields(db[path]) });
    }
    throw new Error('unexpected ' + url);
  };
  return { fetchFn, sent, patched };
}
const deps = (g, now) => ({ fetch: g.fetchFn, jwks, now: () => now || new Date() });
const req = (path, init) => new Request('https://app.test' + path, init);

describe('/api/config', () => {
  it('returns null Firebase without variables (mock mode)', async () => {
    const r = await handle(req('/api/config'), { ASSETS: assets }, deps(google({})));
    expect(await r.json()).toEqual({ firebase: null, vapidKey: null });
  });
  it('returns the public web config from the variables', async () => {
    const r = await handle(req('/api/config'), { ...ENV, ASSETS: assets }, deps(google({})));
    expect(await r.json()).toEqual({ firebase: { apiKey: 'k', authDomain: `${PID}.firebaseapp.com`, projectId: PID, appId: 'a', messagingSenderId: '1' }, vapidKey: 'v' });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
});

describe('/vocab.json', () => {
  it('is open in mock mode', async () => {
    const r = await handle(req('/vocab.json'), { ASSETS: assets }, deps(google({})));
    expect(await r.text()).toBe('asset:/vocab.json');
  });
  it('needs a valid ID token when Firebase is configured', async () => {
    const env = { ...ENV, ASSETS: assets };
    expect((await handle(req('/vocab.json'), env, deps(google({})))).status).toBe(401);
    const bad = await idToken('u1', { aud: 'other' });
    expect((await handle(req('/vocab.json', { headers: { Authorization: 'Bearer ' + bad } }), env, deps(google({})))).status).toBe(401);
    const ok = await idToken('u1');
    const r = await handle(req('/vocab.json', { headers: { Authorization: 'Bearer ' + ok } }), env, deps(google({})));
    expect(await r.text()).toBe('asset:/vocab.json');
  });
});

describe('review fixes', () => {
  const saEnv = () => ({ ...ENV, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa), ASSETS: assets });
  it('/vocab.json refuses a signed-in account that has no role (self-signup)', async () => {
    const g = google({ 'users/u1': { role: 'student' } });
    const stranger = await handle(req('/vocab.json', { headers: { Authorization: 'Bearer ' + await idToken('x9') } }), saEnv(), deps(g));
    expect(stranger.status).toBe(403);
    const learner = await handle(req('/vocab.json', { headers: { Authorization: 'Bearer ' + await idToken('u1') } }), saEnv(), deps(g));
    expect(await learner.text()).toBe('asset:/vocab.json');
  });
  it('shortens a long note so the push stays under the FCM size limit', async () => {
    const note = 'Hôm nay khó quá '.repeat(400);
    const g = google({
      'users/u1': { role: 'student', name: 'Giỏi' }, 'users/c1': { role: 'coach', learnerUid: 'u1' },
      'learners/u1/data/checkins': { raw: JSON.stringify({ '2026-11-23': { at: 'x', note } }) }, 'pushTokens/c1': { tokens: ['t1'] },
    });
    const r = await handle(req('/api/notify-done', { method: 'POST', headers: { Authorization: 'Bearer ' + await idToken('u1') }, body: '{"date":"2026-11-23"}' }), saEnv(), deps(g));
    expect(await r.json()).toEqual({ sent: 1 });
    expect(g.sent[0].webpush.data.body.length).toBeLessThanOrEqual(200);
  });
  it('keeps tokens when FCM rejects the message itself (INVALID_ARGUMENT)', async () => {
    const { sendPush } = await import('../worker/google.js');
    const bad = async () => Response.json({ error: { status: 'INVALID_ARGUMENT', details: [{ errorCode: 'INVALID_ARGUMENT' }] } }, { status: 400 });
    expect(await sendPush(PID, async () => 'at', bad, 't1', { title: 'a', body: 'b', url: '/' })).toBe('error');
  });
});

describe('verifyIdToken', () => {
  it('accepts a token for this project and rejects expired or foreign ones', async () => {
    expect(await verifyIdToken(await idToken('u1'), PID, jwks)).toBe('u1');
    await expect(verifyIdToken(await idToken('u1', { iss: 'https://securetoken.google.com/other' }), PID, jwks)).rejects.toThrow();
    await expect(verifyIdToken(await idToken('u1', { exp: Math.floor(Date.now() / 1000) - 10 }), PID, jwks)).rejects.toThrow();
  });
});

describe('/api/notify-done', () => {
  const db = () => ({
    'users/u1': { role: 'student', name: 'Giỏi' },
    'users/c1': { role: 'coach', learnerUid: 'u1' },
    'learners/u1/data/checkins': { raw: JSON.stringify({ '2026-11-23': { at: '2026-11-23T21:47', cards: 24, note: 'Part 6 khó', planTitle: 'Chữa Reading' } }) },
    'pushTokens/c1': { tokens: ['t1', 'dead'] },
  });
  const env = () => ({ ...ENV, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa), ASSETS: assets });
  const post = async (uid, body = { date: '2026-11-23' }) => req('/api/notify-done', { method: 'POST', headers: { Authorization: 'Bearer ' + await idToken(uid) }, body: JSON.stringify(body) });

  it('pushes the check-in to the coach and drops dead tokens', async () => {
    const g = google(db());
    const r = await handle(await post('u1'), env(), deps(g));
    expect(await r.json()).toEqual({ sent: 1 });
    expect(g.sent[0]).toMatchObject({ token: 't1', webpush: { data: { url: '/coach/day/2026-11-23' } } });
    expect(g.sent[0].webpush.data.title).toContain('Giỏi');
    expect(g.sent[0].webpush.data.body).toContain('Part 6 khó');
    expect(g.patched).toEqual([['pushTokens/c1', expect.objectContaining({ fields: expect.anything() })]]);
  });
  it('refuses a coach, a missing check-in, and a bad date', async () => {
    const g = google(db());
    expect((await handle(await post('c1'), env(), deps(g))).status).toBe(403);
    expect((await handle(await post('u1', { date: '2026-11-24' }), env(), deps(g))).status).toBe(409);
    expect((await handle(await post('u1', { date: 'x' }), env(), deps(g))).status).toBe(400);
    expect(g.sent).toEqual([]);
  });
  it('respects the coach turning completion alerts off', async () => {
    const g = google({ ...db(), 'userSettings/c1': { raw: JSON.stringify({ coach: { notifyDone: false } }) } });
    expect(await (await handle(await post('u1'), env(), deps(g))).json()).toEqual({ sent: 0 });
  });
  it('is unavailable without the service account', async () => {
    const r = await handle(await post('u1'), { ...ENV, ASSETS: assets }, deps(google(db())));
    expect(r.status).toBe(503);
  });
});

describe('cron', () => {
  it('does nothing without Firebase variables', async () => {
    const g = google({});
    await runCron({ ASSETS: assets }, deps(g));
    expect(g.sent).toEqual([]);
  });
  it('sends the 20:00 reminder once and records it', async () => {
    const g = google({
      'users/u1': { role: 'student', name: 'Giỏi' },
      'learners/u1/data/checkins': { raw: '{}' },
      'pushTokens/u1': { tokens: ['t9'] },
    });
    await runCron({ ...ENV, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa) }, deps(g, new Date('2026-11-23T13:05:00Z')));
    expect(g.sent.map(m => m.token)).toEqual(['t9']);
    expect(g.patched.find(([p]) => p === 'notifyLog/u1')).toBeTruthy();
  });
});
