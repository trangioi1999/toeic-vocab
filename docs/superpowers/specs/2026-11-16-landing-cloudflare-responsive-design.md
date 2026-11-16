# Landing page, login dialog, clean URLs on Cloudflare, responsive layouts

Date: 2026-11-16. Status: approved by the owner ("làm hết mọi thứ đi") after reviewing the canvas sketch
(boards "Mới: trang giới thiệu, đăng nhập, 3 cỡ màn hình").

## Intent

The app (still mock data, phase 1) is used by two people: the learner and their partner, who checks
progress ("người kèm"). Registration may open to others later, so the front door should read like a product:
a landing page that explains the app, with login in a dialog. The owner wants:

- a landing page at `/` instead of landing straight on a login form;
- login/signup in a dialog; the role comes from the account only (no role picker, no demo buttons on screen);
- the role set by hand per account in Firebase later (phase 2);
- clean URLs (no `/toeic-vocab/app/#/login`), hosted on Cloudflare Pages instead of GitHub Pages; all keys
  live in Cloudflare;
- layouts that work on phone, iPad and desktop, including the vocab study screens;
- "Cô giáo" renamed "Người kèm". The product name stays "Kho Từ TOEIC" for now (one constant).

## Goals

1. Landing page (`/`) as sketched: header, hero with Today-card visual, real facts (6.580 thẻ, 12 nhóm, 112 ngày),
   3 features, 3 steps, two roles, FAQ, closing CTA, footer. Logged-in visitors to `/` go to their home.
2. Auth dialog over the landing page at `/login` and `/signup`: tabs Đăng nhập / Đăng ký. Phone: bottom sheet;
   ≥721px: centred modal. Esc, backdrop click and X close it (back to `/`). Focus moves into the dialog and
   returns; Tab stays inside.
3. Signup form is built but locked by `SIGNUP_OPEN = false` (shows "Đăng ký chưa mở").
4. Role from account: `student` → `/today`, `coach` → `/coach`. Old stored value `teacher` is read as `coach`.
5. BrowserRouter with routes: `/`, `/login`, `/signup`, `/today`, `/vocab…`, `/plan`, `/settings`, `/coach`,
   `/coach/day/:date`, `/coach/settings`. Old hash links (`#set-ID`, `#g-ID`, `#s4=`, `#/…`) redirect.
6. Responsive: phone (≤720) tab bar, one column; tablet (721–1099) top nav, two columns where useful;
   desktop (≥1100) top nav, max width 1160, 2–3 columns. Today, Coach overview, Vocab home/group/set,
   study view and Plan all get wider layouts.
7. Cloudflare Pages build from `web/` → `dist`, SPA fallback, vocab.json and icons copied into the build.
8. Moving off GitHub Pages without losing data: progress lives in localStorage per origin, so the old site gets
   a "Chuyển dữ liệu sang app mới" page that hands the data to the new origin (`/import#d=…`), with a
   copy/paste code fallback. GitHub Pages is switched off by the owner only after moving.

## Non-goals

Firebase, real accounts, notifications (phase 2). Renaming the product. Opening signup.

## Anti-goals

Showing demo credentials on the page; losing the learner's existing progress in the move; a role picker.

## Approaches considered

- **A (chosen): Cloudflare Pages Git integration.** Cloudflare builds `web/` on every push to `main`;
  clean URLs via SPA fallback; secrets in Cloudflare env vars. No build output committed.
- B: Cloudflare via GitHub Actions + wrangler: same result, needs an API token in GitHub secrets.
- C: stay on GitHub Pages with a 404.html trick: keeps `/toeic-vocab/`, owner wants off GitHub Pages.

## Decisions (owner)

Cloudflare, not GitHub Pages; keys in Cloudflare; landing + dialog; no demo buttons; "Người kèm";
signup visible but locked; keep the name for now; phone + iPad + desktop.

## Builder's calls (mine)

- Route names above (`/today`, `/coach`); internal role value `coach`.
- `/import` route reads `#d=` (base64url JSON of the legacy localStorage keys), merges, then clears the hash.
  Settings also gets "Nhập dữ liệu từ bản cũ" (paste code). Merge rule: card status keeps the higher
  value (2 known > 1 learning), plan/check-ins/activity: union, existing entries win on conflict.
- Old site: static `chuyen-nha.html` at the repo root + a banner on `index.html` and `lo-trinh.html`;
  `app/` build output replaced by a tiny page that sends people to `chuyen-nha.html`.
  The new app URL is one constant (`https://kho-tu-toeic.pages.dev`), changed if the owner picks another
  Cloudflare project name.
- Demo accounts stay in the mock (credentials given in chat, not on screen); the coach demo name becomes
  "Người kèm".
- `public/_redirects` with `/* /index.html 200`; `web/.nvmrc` = 20.
