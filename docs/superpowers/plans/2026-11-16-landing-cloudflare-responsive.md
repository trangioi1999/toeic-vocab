# Landing, auth dialog, clean URLs, responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing page + login/signup dialog, role-from-account routing with clean URLs for Cloudflare Pages, phone/iPad/desktop layouts, and a safe data move off GitHub Pages.

**Architecture:** Same Vite/React app in `web/`. HashRouter → BrowserRouter (`base: '/'`, build to `web/dist`, SPA fallback via `_redirects`). Landing renders at `/`, `/login`, `/signup`; the dialog is a child of Landing driven by the path. Pure helpers (role normalising, legacy URL mapping, data migration) live in `src/lib` with Vitest tests; UI checked with Playwright screenshots at 390, 834, 1280 px.

**Tech Stack:** Vite 5.4.11, React 18.3.1, react-router-dom 6.28.0, Vitest 2.1.8 (jsdom), preinstalled Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-landing-cloudflare-responsive-design.md`

## Global Constraints

- Product name only in `src/brand.js`: `APP_NAME = 'Kho Từ TOEIC'`, `APP_URL = 'https://kho-tu-toeic.pages.dev'`.
- Role values: `student`, `coach`; stored `teacher` is read as `coach`. UI label "Người kèm", never "Cô giáo"/"cô".
- Breakpoints: phone ≤720px, tablet 721–1099px, desktop ≥1100px; content max width 1160px.
- `SIGNUP_OPEN = false` in `src/brand.js`.
- No demo credentials or role buttons rendered anywhere.
- Touch targets ≥44px, visible focus, text contrast ≥4.5:1 (small pink text uses `--guide-strong`).
- Facts on landing: 6.580 thẻ, 12 nhóm chủ đề, 112 ngày lộ trình.

## Review Focus

- Deep link reload (e.g. `/vocab/set/abc` opened fresh) must render the page, not 404 → `_redirects` + router test of route table.
- Logged-in user opening `/`, `/login` → their home; logged-out opening `/today?x` → `/login?next=/today%3Fx` and back after login.
- `next` pointing at the other role's area (student → `/coach`) is ignored.
- Import code that is garbage/truncated → friendly error, no data touched.
- Import merging into a browser that already has progress → nothing already known gets downgraded.

---

### Task 1: Brand, roles and clean routes

**Files:**
- Create: `web/src/brand.js`, `web/src/lib/roles.js`, `web/test/roles.test.js`
- Modify: `web/src/lib/legacyHash.js`, `web/test/legacyHash.test.js`, `web/src/services/auth.js`, `web/src/services/store.js` (settings key `teacher` → `coach`, write guard message "Tài khoản người kèm chỉ được xem"), `web/src/App.jsx`, `web/src/main.jsx`, `web/src/components/AppShell.jsx`, `git mv web/src/pages/teacher web/src/pages/coach` (+ rename `TeacherSettings` → `CoachSettings`, `teacher.css` → `coach.css`, class `.teacher-page` → `.coach-page`), every `'/teacher…'` link → `'/coach…'`, `'/'` student links → `'/today'`.

**Interfaces:**
- Produces: `normalizeRole(r: string) => 'student'|'coach'|null`; `homeOf(role) => '/today'|'/coach'`; `safeNext(next: string|null, role) => string` (returns `next` only if it starts with `/`, is not `/`, `/login`, `/signup`, `/import`, and belongs to the role's area: coach ⇔ starts with `/coach`; else `homeOf(role)`); `legacyToPath(hash: string) => string|null` mapping `#set-ID`→`/vocab/set/ID`, `#g-ID`→`/vocab/g/ID`, `#s4=X`→`/plan?s4=X`, `#/teacher…`→`/coach…`, `#/…`→`/…` (and `#/` → `/today`); `rewritePlanLinks` emits `href="/vocab/set/ID"`.

- [ ] **Step 1: Tests** — `roles.test.js`: `normalizeRole('teacher')==='coach'`, `normalizeRole('x')===null`; `homeOf('coach')==='/coach'`; `safeNext('/coach/day/2026-12-01','student')==='/today'`; `safeNext('/vocab/set/a','student')==='/vocab/set/a'`; `safeNext('/login','coach')==='/coach'`; `safeNext('//evil.com','student')==='/today'`. Update `legacyHash.test.js` to `legacyToPath` cases above incl. `'#/teacher/day/2026-12-01'`→`'/coach/day/2026-12-01'` and `rewritePlanLinks` → `/vocab/set/ID`.
- [ ] **Step 2:** `npm test` → new tests FAIL.
- [ ] **Step 3: Implement** roles.js, legacyHash.js; auth `login()` stores `role: normalizeRole(...)`, `currentUser()` normalises; demo coach account `{ uid:'coach-1', email:'co@demo.vn', name:'Người kèm', role:'coach' }`; remove `DEMO_ACCOUNTS` export. App.jsx: `BrowserRouter`, routes per spec, `RequireRole` uses `homeOf`, `/` `/login` `/signup` render `<Landing/>` (Task 2; temporarily the old Login), `*` → `/`. main.jsx: if `legacyToPath(location.hash)` → `history.replaceState(null,'', path)` before render (drop the popstate/hashchange listeners); SW path `/sw.js`.
- [ ] **Step 4:** `npm test` → all PASS; `grep -rn "teacher\|Cô giáo\|cô giáo\|nhắn cô" web/src` → only `normalizeRole`'s alias.
- [ ] **Step 5: Commit** `Clean routes, coach role, brand constant`.

### Task 2: Landing page and auth dialog

**Files:**
- Create: `web/src/pages/landing/Landing.jsx`, `landing.css`, `AuthDialog.jsx`
- Delete: `web/src/pages/Login.jsx`, `Login.css` (move `OmrStrip` idea into the hero visual if useful)
- Modify: `web/src/App.jsx`, `web/src/components/AppShell.jsx` (brand from `APP_NAME`; logout → `/`)

**Interfaces:**
- Consumes: `APP_NAME`, `SIGNUP_OPEN`, `homeOf`, `safeNext`, `useAuth().login`.
- Produces: `<Landing />` reads `useLocation().pathname`; dialog open when `/login` or `/signup`; closing navigates to `/` (replace).

- [ ] **Step 1: Build Landing** sections in sketch order (board `LandingDesktop.dc.html`): sticky header (brand, links Tính năng/Cách dùng/Hỏi đáp hidden ≤720, button Đăng nhập → `/login`), hero (chip "Lộ trình TOEIC 700+ trong 16 tuần", h1 "Mỗi ngày tô thêm một ô.", sub copy, CTA Đăng nhập + "Xem cách dùng" anchor, note "Hiện dành cho người được mời. Đăng ký sẽ mở sau.", Today-card + week-strip visual), facts row, features ×3 (mini visuals: flashcard "invoice /ˈɪn.vɔɪs/ hoá đơn", Part bars, bubble calendar; "Thông báo sắp có" tag), steps ×3, roles ×2, FAQ ×3 (`<details>` ≤720, open cards wider), dark CTA "Tối nay tô ô tiếp theo.", footer. Grids use `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`.
- [ ] **Step 2: AuthDialog**: `role="dialog" aria-modal`, labelled by title "Chào bạn quay lại" / "Tạo tài khoản"; tabs are `<Link>`s to `/login` `/signup` with `aria-current`; login form (email `autocomplete=username`, password with show/hide, "Quên mật khẩu?" → toast "Nhắn người quản lý để đặt lại mật khẩu."), error under the form; on success `navigate(safeNext(params.get('next'), u.role), {replace:true})`. Signup: when `!SIGNUP_OPEN` status box "Đăng ký chưa mở" + disabled fields + "Đã có tài khoản? Đăng nhập". Esc/backdrop/X close; focus first field on open, trap Tab, restore focus to the opener; `document.body.style.overflow='hidden'` while open. Phone: bottom sheet slide-up; ≥721: centred 440px card; respect `prefers-reduced-motion`.
- [ ] **Step 3: Verify** `npm run dev` + Playwright: at 390/834/1280 screenshot `/`, `/login`, `/signup`; login with hocvien@demo.vn → URL `/today`; co@demo.vn → `/coach`; Esc on `/login` → `/`; logged-in visit `/` → home. Check console has no errors.
- [ ] **Step 4: Commit** `Landing page and login/signup dialog`.

### Task 3: Move data from the old site

**Files:**
- Create: `web/src/lib/migrate.js`, `web/test/migrate.test.js`, `web/src/pages/ImportPage.jsx`, `chuyen-nha.html` (repo root), replace `app/` contents with `app/index.html` (redirect to `../chuyen-nha.html`)
- Modify: `web/src/App.jsx` (route `/import`, no auth required), `web/src/pages/student/Settings.jsx` (card "Nhập dữ liệu từ bản cũ": textarea + button), `index.html`, `lo-trinh.html` (top banner linking `chuyen-nha.html`)

**Interfaces:**
- Produces: `MIGRATE_KEYS = ['status','known','pref','toeic700-v3','activity','checkins','settings']`; `encodeData(obj) => string` (base64url of UTF-8 JSON `{v:1, data:{key: rawString}}`); `decodeData(code: string) => {key: rawString}` throws `Error('Mã dữ liệu không hợp lệ')`; `mergeInto(storage, data) => {added: number}` (rules from spec: `status` max per key, objects union with existing winning, `known` array union, `pref`/`settings` only if absent).

- [ ] **Step 1: Tests** — round trip with Vietnamese text; `decodeData('abc')` throws the message; truncated code throws; merge: existing `status {"a:1":2}` + incoming `{"a:1":1,"b:2":1}` → `{"a:1":2,"b:2":1}`; plan `toeic700-v3` existing day kept, new day added; `known` arrays unioned; `pref` kept when present.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: ImportPage** reads `#d=`, shows "Đang chuyển dữ liệu…" → success "Đã chuyển xong N mục" + button "Vào app" (→ `/login` or home) / error with paste fallback; clears the hash. `chuyen-nha.html`: self-contained page in the same style; builds the code from its own localStorage (same format, inline JS), button "Chuyển sang app mới" → `APP_URL + '/import#d=' + code`, plus "Sao chép mã" for manual paste. Verify with Playwright: seed localStorage on a static server for the repo root, open `chuyen-nha.html`, take the generated link's hash, open `/import#d=…` on the dev server, check `status` merged.
- [ ] **Step 6: Commit** `Data move from the old site`.

### Task 4: Responsive layouts

**Files:** `web/src/styles/base.css` (`.wrap` max-width 1160, tablet/desktop paddings), `web/src/components/AppShell.css`, `web/src/pages/student/Today.jsx` + `student.css`, `web/src/pages/coach/Overview.jsx` + `coach.css`, `web/src/pages/vocab/*.jsx` + `vocab.css`, `web/src/pages/plan/plan.css`.

- [ ] **Step 1: Today** — wrap content in `.today-grid`: phone one column; ≥721 two columns (main: hero + tasks + finish; side: week, cards, latest score); ≥1100 three columns as board `TodayDesktop.dc.html` (tasks | note+finish+score | week+cards+next day). Remove `max-width: 640px`.
- [ ] **Step 2: Coach overview** — ≥1100: status card + 4 stats in one row, calendar | recent feed side by side (board `CoachDesktop.dc.html`); 721–1099 two columns.
- [ ] **Step 3: Vocab** — home: group tiles `auto-fill minmax(240px,1fr)`; group/set lists two columns ≥900; study view: card centred max 560px with mode tabs, ≥1100 side panel (progress + voice) beside the card; quiz/write max 640px centred; list mode table full width.
- [ ] **Step 4: Plan + Settings + DayDetail** — plan week grid uses the width (two columns ≥1100: week tasks | score chart + parts); settings max 720 centred; day detail max 760.
- [ ] **Step 5: Verify** Playwright screenshots of `/today`, `/vocab`, `/vocab/g/<first>`, `/vocab/set/<first>`, study session, `/plan`, `/coach`, `/coach/day/<d>`, `/settings` at 390, 834, 1280; no horizontal scroll (`scrollWidth <= innerWidth`) at each.
- [ ] **Step 6: Commit** `Tablet and desktop layouts`.

### Task 5: Cloudflare build and docs

**Files:** `web/vite.config.js` (`base:'/'`, `outDir:'dist'`, plugin copying `../vocab.json` and `../icon-*.png` into dist on `closeBundle`, keep dev middleware), `web/public/_redirects` (`/* /index.html 200`), `web/.nvmrc` (`20`), `web/public/sw.js` (VERSION `app-v2`, CORE `['/','/index.html','/manifest.webmanifest','/icon-192.png','/vocab.json']`, navigations fall back to cached `/index.html`), `web/public/manifest.webmanifest` (`start_url:'/'`, `scope:'/'`), `web/src/lib/vocab.js` (fetch `/vocab.json`), `.gitignore` (`web/dist`), `README.md` (Cloudflare setup steps, demo accounts, moving data, switching off GitHub Pages afterwards).

- [ ] **Step 1:** implement; **Step 2:** `npm test` PASS, `npm run build` → `dist/index.html`, `dist/vocab.json`, `dist/_redirects` exist; `npx vite preview` + Playwright: open `/vocab` directly (preview has SPA fallback) renders.
- [ ] **Step 3: Commit** `Build for Cloudflare Pages`.

### Task 6: Review, merge, push

- [ ] Fresh code review of the branch diff; fix Critical/Important.
- [ ] `npm test`, `npm run build` green; merge to `main`, push both branches.
