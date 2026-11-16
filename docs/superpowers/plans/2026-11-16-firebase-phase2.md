# Firebase phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real accounts, shared Firestore data, push notifications and a gated word list — all dormant until Firebase variables are set in Cloudflare.

**Architecture:** Client store keeps its synchronous API on top of a swappable key-value layer (`kv`): localStorage in mock mode, an in-memory + localStorage cache synced with Firestore in Firebase mode. Startup asks the Worker for `/api/config` to pick the mode. A Worker (`web/worker/index.js`) serves config, gates `/vocab.json`, sends pushes (`/api/notify-done`, cron) through FCM using a service-account token.

**Tech Stack:** React 18, Vite 5, Vitest 2, firebase@13.1.0 (client, lazy), jose@6.2.15 (Worker), Cloudflare Workers static assets + cron.

**Spec:** `docs/superpowers/specs/2026-11-16-firebase-phase2-design.md`

## Global Constraints

- Firestore paths: `users/{uid}` {role, learnerUid?, name?}; `learners/{learnerUid}/data/{key}` {raw, updatedAt}; `userSettings/{uid}` {raw, updatedAt}; `pushTokens/{uid}` {tokens: string[]}; `notifyLog/{uid}` {remind?, missed?}.
- Learner keys: `status`, `known`, `pref`, `toeic700-v3`, `activity`, `checkins`. Settings key: `settings`.
- Cloudflare vars: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_VAPID_KEY`, secret `FIREBASE_SERVICE_ACCOUNT`, `TIMEZONE` (default `Asia/Ho_Chi_Minh`).
- Copy: "Tài khoản chưa được cấp quyền. Nhờ người quản lý thêm vai trò trong Firebase." / "Sai email hoặc mật khẩu" / "Không có mạng. Kiểm tra kết nối rồi thử lại".
- Mock mode must behave exactly as today (all existing tests stay green).

## Review Focus

- Firebase mode offline start (cached profile + cached data) renders instead of hanging.
- Coach writes are refused client-side and by rules.
- First-login upload never downgrades cloud data and runs once per uid.
- Worker with no Firebase vars: config null, `/vocab.json` open, cron no-op, no crash.
- Duplicate cron ticks (every 10 min) never send the same reminder twice a day.

---

### Task 1: Key-value layer under the store
**Files:** Create `web/src/services/kv.js`, `web/test/kv.test.js`; modify `web/src/services/store.js`, `web/src/pages/ImportPage.jsx`, `web/src/pages/student/Settings.jsx`.
**Interfaces — Produces:** `kv.getItem(key): string|null`, `kv.setItem(key, raw: string)`, `kv.subscribe(cb): unsubscribe`, `setBackend(backend)`, `localBackend`; backend shape `{ getItem, setItem, subscribe }`.
- [ ] Tests: local backend round trip; `setBackend(fake)` routes reads/writes and notifies store subscribers; store getters read through kv (set fake backend, `getCheckins()` reflects it); `mergeInto(kv, …)` works.
- [ ] RED → implement (store `readRaw`/`write` use kv; `subscribe` chains kv.subscribe) → GREEN, full suite green → commit.

### Task 2: Runtime config and async auth facade
**Files:** Create `web/src/services/config.js`, `web/test/config.test.js`, `web/src/components/Splash.jsx`; modify `web/src/services/auth.js`, `web/src/hooks/useAuth.js`, `web/src/main.jsx`, `web/src/lib/vocab.js`.
**Interfaces — Produces:** `loadConfig(fetchFn=fetch, storage=localStorage): Promise<{ firebase: {apiKey, authDomain, projectId, appId, messagingSenderId}|null, vapidKey: string|null }>` (cache key `app-config`, 3 s timeout, cached fallback, mock on failure); auth facade `setAuthBackend(b)`, `authReady(): boolean`, `getIdToken(): Promise<string|null>`, existing `login/logout/currentUser/onAuthChange`; `afterCheckin(date)` hook in auth facade called by store `completeDay`.
- [ ] Tests: config parse from `/api/config` JSON; null firebase → mock; fetch failure → cached; no cache → mock; `vocab` fetch sends `Authorization` when a token exists.
- [ ] Implement; `main.jsx` boots `init()` (load config → if firebase, `import('./services/firebase.js').then(m => m.start(cfg))`) then renders; RequireRole shows `<Splash/>` until `authReady()`.

### Task 3: Firebase client backend
**Files:** Create `web/src/services/firebase.js`, `web/src/services/cloudKv.js`, `web/test/cloudKv.test.js`, `web/test/firebaseUser.test.js`.
**Interfaces — Produces:** `toUser(uid, email, profile) => user|throws`; `authError(code) => message`; `createCloudKv({ uid, learnerUid, docs, cache }) => backend & { start(): Promise, stop() }` where `docs` = `{ listen(path, cb), write(path, raw) }` (Firestore adapter injected so tests use a fake); `firstUpload(kv, legacyStorage, uid, flagStorage)`.
- [ ] Tests (fake docs): learner keys map to `learners/{learnerUid}/data/{key}`, `settings` to `userSettings/{uid}`; snapshot updates cache + emit; writes debounced (300 ms) and coalesced; offline cache seeds first read; first upload merges legacy keys once (flag `uploaded:{uid}`); `toUser` errors for missing profile, bad role, coach without learnerUid.
- [ ] Implement `firebase.js` with firebase@13.1.0 (initializeApp, auth persistence, Firestore persistent cache, profile cache `profile:{uid}`), push token registration, `afterCheckin` → POST `/api/notify-done`.

### Task 4: Worker
**Files:** Create `web/worker/index.js`, `web/worker/google.js` (service-account token, Firestore REST, FCM), `web/worker/decide.js`, `web/test/worker.test.js`, `web/test/decide.test.js`; modify `web/wrangler.toml` (`main`, `[assets] binding = "ASSETS"`, `run_worker_first = ["/api/*", "/vocab.json"]`, `[triggers] crons = ["*/10 * * * *"]`, `keep_vars = true`, `[vars] TIMEZONE`).
**Interfaces — Produces:** `decide({ now: Date, tz, users, data, settings, logs }) => [{ to: uid, kind: 'remind'|'missed', title, body, url }]`; `verifyIdToken(token, projectId, jwks)`.
- [ ] Tests: decide — reminder after reminderTime only, not when checked in, once per day, disabled when `reminder:false`; missed at ≥23:00 only on work days, once per day, respects `notifyMissed`; worker — `/api/config` null without vars and filled with vars; `/vocab.json` 401 without token when configured, passes through when not; notify-done rejects non-student and sends to coach tokens (fetch mocked); ID token verify accepts a token signed by a local JWKS and rejects wrong audience/expired.
- [ ] `npx wrangler deploy --dry-run` succeeds.

### Task 5: Push on the device, rules, emulator check
**Files:** modify `web/public/sw.js` (push + notificationclick), `web/src/components/NotifyCard.jsx`; create `firebase/firestore.rules`, `firebase/firebase.json`, `web/test/rules.test.js` (runs only when the emulator is reachable).
- [ ] sw.js shows data payload `{title, body, url}`; click focuses/opens `url`.
- [ ] NotifyCard in Firebase mode registers the FCM token; mock mode unchanged.
- [ ] Rules per spec; if the Firestore emulator can be downloaded here, run rule tests (learner own rw, coach read-only assigned learner, no role writes); otherwise ledger it.

### Task 6: Guide, review, merge
- [ ] README "Bật Firebase" checklist (console steps, Cloudflare variables, authorized domain, rules publish, users docs).
- [ ] Final whole-branch review; fix Critical/Important; merge to `main`.
