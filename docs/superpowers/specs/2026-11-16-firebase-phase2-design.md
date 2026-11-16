# Phase 2: Firebase accounts, shared data, notifications (ready before keys exist)

Date: 2026-11-16. Status: approved by the owner ("oke hợp lý rồi đó"; iPhone push only after
"Add to Home Screen" accepted).

## Intent

Today login and data are mock and live in one browser, so the coach ("người kèm") cannot see the learner's
progress from another device. The owner wants everything written now so that tonight they only create a
Firebase project, paste keys into Cloudflare, and the app runs on real accounts. Everything must stay free
(Firebase Spark, Cloudflare Workers free) and keys live in Cloudflare.

## Goals

1. **Two modes, chosen at runtime.** The Worker serves `/api/config`. With Firebase variables set it returns
   the public web config; without them the app keeps today's mock mode. No rebuild is needed after keys are
   added.
2. **Firebase Auth (email/password).** Accounts are created by hand in the Firebase console. The role lives in
   `users/{uid}` (`role: "student" | "coach"`, coach also `learnerUid`, optional `name`), set by hand. A
   missing/invalid profile → sign out with "Tài khoản chưa được cấp quyền…".
3. **Shared data in Firestore.** Learner data (the existing keys `status`, `known`, `pref`, `toeic700-v3`,
   `activity`, `checkins`) live at `learners/{learnerUid}/data/{key}` as `{ raw: <JSON string>, updatedAt }`;
   each user's own settings at `userSettings/{uid}`. The coach sees updates live (snapshot listeners).
   The store's synchronous API stays; a key-value layer caches in memory + localStorage (per uid) for instant
   and offline rendering, and writes through to Firestore (debounced).
4. **First login moves local progress up**, once per uid, using the existing merge rules (nothing downgraded).
   `/import` and the Settings paste box write into the active backend.
5. **Security rules** (file in repo): learner reads/writes own data (only known keys, only `raw`/`updatedAt`);
   coach reads only their `learnerUid`'s data; nobody writes `users/*`; own settings and push tokens only.
6. **Notifications via the Cloudflare Worker**, keys in Cloudflare:
   - learner taps Hoàn thành → app calls `POST /api/notify-done` with the ID token → coach gets a push now;
   - cron every 10 min: reminder to the learner from their reminder time (default 20:00) if today has no
     check-in; at 23:00 tell the coach if today was a plan work day without a check-in. Each at most once a day.
   - Web push through FCM; the app's own service worker shows it; iPhone needs the installed app.
7. **`/vocab.json` requires a valid Firebase ID token** when Firebase is configured (open in mock mode).
8. **Setup guide** for tonight, step by step, in the README.

## Non-goals

Open signup, password reset UI, more than one learner per coach, coach editing data, native apps.

## Anti-goals

Losing local progress on the switch; a coach able to write learner data or anyone able to change their role;
secrets in the repo; anything that needs a paid plan.

## Approaches considered

- **Data:** (A, chosen) Firestore from the client with security rules + live listeners. (B) Worker API over
  D1/KV: more code, no live updates.
- **Notifications:** (A, chosen) Cloudflare Worker cron + API with a Firebase service account secret.
  (B) GitHub Actions cron: keys in GitHub, owner wants Cloudflare. (C) Cloud Functions: needs the paid plan.
- **Client config:** (A, chosen) runtime `/api/config` from Worker variables: paste once, no rebuild.
  (B) Vite build variables: rebuild needed, two places to set.

## Decisions (owner)

Firebase; free only; keys in Cloudflare; roles set by hand in Firebase; iPhone push only when installed.

## Builder's calls

- Cloudflare variables: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`,
  `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_VAPID_KEY` (plain), `FIREBASE_SERVICE_ACCOUNT` (secret, the JSON
  file), `TIMEZONE` (default `Asia/Ho_Chi_Minh`). `keep_vars = true` so deploys keep dashboard variables.
- Firebase SDK loaded with dynamic import only in Firebase mode (mock bundle stays small). Pinned
  `firebase@13.1.0`, `jose@6.2.15`.
- Worker talks to Firestore REST and FCM HTTP v1 with an OAuth token minted from the service account (jose);
  ID tokens verified against Google's JWKS (issuer `https://securetoken.google.com/<project>`).
- Push payload is data-only (`title`, `body`, `url`); `sw.js` shows it and opens `url` on click.
  Dead tokens (FCM 404/UNREGISTERED) are removed.
- Notification log at `notifyLog/{uid}` (`remind`, `missed`: last date sent), written by the Worker only.
