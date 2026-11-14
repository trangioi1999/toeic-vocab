# Kho Từ TOEIC React UI (Giai đoạn 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ứng dụng React đầy đủ giao diện (đăng nhập, khu học viên, khu cô giáo), dữ liệu/đăng nhập giả lập sau lớp service để giai đoạn 2 thay bằng Firebase.

**Architecture:** Mã nguồn ở `web/` (Vite + React, JS/JSX). Build ra `app/` ở gốc repo và commit, nên GitHub Pages phục vụ tại `/toeic-vocab/app/` mà không cần đổi cài đặt Pages; trang cũ `index.html`, `lo-trinh.html` giữ nguyên. Cùng origin → app mới đọc/ghi đúng các khóa `localStorage` cũ, hai bên luôn đồng bộ. Mọi truy cập dữ liệu đi qua `src/services/auth.js` và `src/services/store.js`.

**Tech Stack:** Node 22, Vite 5.4, React 18.3.1, react-router-dom 6.28 (`HashRouter`), Vitest 2.1 + jsdom, Playwright (có sẵn) để chụp màn hình kiểm tra.

**Spec:** `docs/superpowers/specs/2026-11-14-react-login-teacher-checkin-design.md`

## Global Constraints

- Không dịch vụ trả phí; giai đoạn 1 không gọi mạng ngoài trừ Google Fonts và `../vocab.json`.
- Toàn bộ chữ trên giao diện bằng tiếng Việt.
- Giữ hệ màu/kiểu chữ của `index.html` (biến `--bg --surface --primary --known --learn ...`, font Lexend / Be Vietnam Pro / Charis SIL / JetBrains Mono), sáng/tối theo hệ thống.
- Dùng tốt ở bề rộng 360px: nút ≥ 40px, không cuộn ngang.
- Ngày "hôm nay" tính theo giờ máy (Việt Nam), dạng `YYYY-MM-DD`, không dùng `toISOString()`.
- Khóa `localStorage` cũ giữ nguyên định dạng: `status` (`{"sid:i": 1|2}`), `known` (mảng cũ), `pref`, `toeic700-v3` (`{date: {done, l, r, parts}}`).
- Tài khoản demo: `hocvien@demo.vn` / `123456` (học viên), `co@demo.vn` / `123456` (cô giáo).
- Hoàn thành ngày: ngày lộ trình loại `test|fixr|fixl` cần tick đủ việc; ngày `review|off` hoặc ngoài lộ trình cần ≥ 20 thẻ ôn trong ngày.

## Review Focus

1. Liên kết cũ trong việc lộ trình (`https://trangioi1999.github.io/toeic-vocab/#set-ID`, `#g-ID`) phải mở đúng học phần/nhóm trong app mới → test `legacyHash` (Task 2).
2. Tiến độ cũ (`status`, cả dạng `known` cũ, `toeic700-v3`) phải hiện ngay ở app mới, và thay đổi ở app mới phải hiện ở trang cũ → test store (Task 3).
3. Tài khoản cô giáo không được ghi dữ liệu học viên, kể cả khi gọi thẳng hàm store → test store (Task 3).
4. Qua nửa đêm (00:30 giờ máy) "hôm nay" là ngày mới, không lệch theo UTC → test `todayISO` (Task 2).
5. Bookmarklet study4 của app mới mở `app/#s4=...` và nhập điểm đúng như trang cũ (đề full thắng luyện Part, lần mới thắng lần cũ) → test `mergeStudy4` (Task 2).

---

## File Structure

```
web/
  package.json, vite.config.js, index.html
  scripts/extract-plan.mjs          # trích DAYS từ lo-trinh.html → src/data/plan-days.json
  src/main.jsx                      # xử lý hash cũ rồi mount <App/>
  src/App.jsx                       # HashRouter + routes theo vai trò
  src/styles/tokens.css, base.css   # biến màu + kiểu dùng chung
  src/data/plan-days.json
  src/lib/dates.js                  # todayISO, addDays, dm, monthGrid
  src/lib/plan.js                   # DAYS đã có title, weeks, dayOf, KIND, DOW, PARTS
  src/lib/progress.js               # streak, canComplete, dayStatus, planStats
  src/lib/legacyHash.js             # #set-/#g-/#s4= → route; rewritePlanLinks
  src/lib/study4.js                 # mergeStudy4, bookmarklet source
  src/lib/vocab.js                  # GROUPS, prepare, counts, sortKey, enVi
  src/lib/speech.js                 # say, sayBoth, voices, VI_HELP
  src/services/auth.js              # giả lập: login/logout/currentUser/onAuthChange
  src/services/store.js             # giả lập: dữ liệu + subscribe + chặn ghi khi là cô
  src/hooks/useStore.js, useAuth.js
  src/components/AppShell.jsx, Toast.jsx, SegBar.jsx, ScoreChart.jsx, MonthCalendar.jsx, PlanTasks.jsx
  src/pages/Login.jsx
  src/pages/student/Today.jsx, Settings.jsx
  src/pages/vocab/VocabHome.jsx, Group.jsx, Study.jsx, modes/{Cards,Quiz,Write,List}.jsx, Search.jsx, VoicePanel.jsx
  src/pages/plan/Plan.jsx, WeekDays.jsx, AnswerSheet.jsx, Study4Sync.jsx
  src/pages/teacher/Overview.jsx, DayDetail.jsx, TeacherSettings.jsx
  test/*.test.js
app/                                # build output (commit)
```

Routes: `/login`; học viên `/` (Hôm nay), `/vocab`, `/vocab/g/:gid`, `/vocab/set/:sid`, `/vocab/search?q=`, `/plan`, `/settings`; cô `/teacher`, `/teacher/day/:date`, `/teacher/settings`. Chưa đăng nhập → `/login?next=<path>`; sai vai trò → về trang chủ của vai trò.

---

### Task 1: Scaffold `web/`, tokens, dữ liệu lộ trình

**Files:** Create `web/package.json`, `web/vite.config.js`, `web/index.html`, `web/src/main.jsx`, `web/src/App.jsx` (tạm một trang), `web/src/styles/tokens.css`, `web/src/styles/base.css`, `web/scripts/extract-plan.mjs`, `web/src/data/plan-days.json`, `web/test/smoke.test.js`; Modify `.gitignore` (thêm `web/node_modules`).

**Interfaces:** Produces: `plan-days.json` = mảng 112 phần tử `{date, dow, phase, kind, hours, tasks[], note?, test?, url?, tid?, week}` y như `DAYS` trong `lo-trinh.html`.

- [ ] Viết `extract-plan.mjs`: regex `const DAYS = (\[.*?\]);\n` trên `../lo-trinh.html`, ghi JSON. Chạy `node scripts/extract-plan.mjs`.
- [ ] `vite.config.js`: `base: './'`, `build.outDir: '../app'`, `emptyOutDir: true`, `test.environment: 'jsdom'`. Scripts: `dev`, `build`, `test` (`vitest run`).
- [ ] `tokens.css` lấy nguyên khối `:root` sáng/tối và `[data-theme]` từ `index.html`; `base.css` lấy reset, `.btn`, `.chip`, `.toast`, `.wrap`.
- [ ] Test `smoke.test.js`: `plan-days.json` có 112 phần tử, phần tử đầu `date === '2026-11-16'`, `kind === 'test'`, `tid === 6853`.
- [ ] `npm install && npm test` → PASS; `npm run build` → có `../app/index.html`.
- [ ] Commit "Scaffold React app in web/".

### Task 2: Thư viện thuần (ngày, lộ trình, tiến độ, hash cũ, study4)

**Files:** Create `web/src/lib/{dates,plan,progress,legacyHash,study4}.js`, `web/test/{dates,progress,legacyHash,study4}.test.js`.

**Interfaces (Produces):**
- `todayISO(now = new Date()): string`, `addDays(iso, n): string`, `dm(iso): 'DD/MM'`, `monthGrid(year, month0): string[][]` (tuần bắt đầu thứ 2, ô ngoài tháng là `null`).
- `plan.js`: `DAYS` (thêm `title` như `lo-trinh.html`), `KIND`, `DOW`, `PARTS`, `weeks: {key, days}[]`, `dayOf(iso): Day|undefined`, `testDay(tid)`.
- `progress.js`:
  - `REQUIRED_CARDS = 20`
  - `isWorkDay(day): boolean` (kind ∈ test|fixr|fixl)
  - `canComplete({day, planEntry, cardsToday}): {ok: boolean, reason: string}`; với ngày làm việc: ok khi `planEntry.done` hoặc mọi phần tử `planEntry.tasks` true (độ dài = `day.tasks.length`).
  - `streak(checkins, today): number` — đếm lùi từ hôm nay (nếu hôm nay chưa xong thì từ hôm qua); ngày lộ trình `kind==='off'` không có check-in thì bỏ qua, không làm đứt chuỗi.
  - `dayStatus(iso, {checkins, today}): 'done'|'missed'|'rest'|'pending'|'future'|'none'` (`none` = trước khi lộ trình bắt đầu và không check-in).
  - `planStats(planState): {done, work, tests, testsDone, best, points: {date, v}[]}` như `renderStats`.
- `legacyHash.js`: `legacyToRoute(hash): string|null` (`#set-123`→`/vocab/set/123`, `#g-ets`→`/vocab/g/ets`, `#s4=...`→`/plan?s4=...`, `#/...`→null); `rewritePlanLinks(html): string` đổi `https://trangioi1999.github.io/toeic-vocab/#set-X` → `#/vocab/set/X`, `#g-X` → `#/vocab/g/X`, bỏ `target="_blank"` ở các link nội bộ đó.
- `study4.js`: `decodeS4(payload): object[]|null`; `mergeStudy4(planState, list): {state, ok: string[], skip: number, firstDate: string|null}` (logic `importFromHash` cũ, không mutate đầu vào); `bookmarkletHref(planUrl): string`.

- [ ] Viết test:
  - `todayISO(new Date(2026,10,15,0,30)) === '2026-11-15'`; `addDays('2026-12-31',1) === '2027-01-01'`; `monthGrid(2026,10)[0]` có 7 ô, ô đầu `null` (1/11/2026 là Chủ nhật → hàng đầu 6 ô null + `'2026-11-01'`).
  - `canComplete` ngày `2026-11-16` với `planEntry={}` → `ok:false`; `{tasks:[true,true,true]}` → `ok:true`; `{done:true}` → `ok:true`; ngày `2026-11-22` (review) `cardsToday:19` → false, `20` → true; ngày ngoài lộ trình `2026-11-14` dùng quy tắc 20 thẻ.
  - `streak`: check-in 16,17,18/11, today 18 → 3; today 19 chưa xong → 3; có ngày off ở giữa không check-in → không đứt; thiếu một ngày làm việc → đứt.
  - `dayStatus('2026-11-16', {checkins:{}, today:'2026-11-18'}) === 'missed'`; hôm nay chưa xong → `'pending'`; ngày off đã qua → `'rest'`.
  - `legacyToRoute('#set-516980414') === '/vocab/set/516980414'`; `legacyToRoute('#/plan') === null`; `rewritePlanLinks` trên `DAYS[0].tasks[0]` chứa `href="#/vocab/set/516980414"` và không còn `target="_blank"` ở link đó; link study4 giữ nguyên.
  - `mergeStudy4({}, [{tid:6853,rid:1,full:false,l:300,r:300,parts:{}},{tid:6853,rid:2,full:true,l:400,r:350,parts:{1:[5,6]}}])` → `state['2026-11-16']` = `{done:true,l:'400',r:'350',parts:{1:[5,6]}}`, `ok.length===1`; tid lạ → `skip===1`.
- [ ] `npm test` → FAIL; viết code; `npm test` → PASS.
- [ ] Commit "Pure logic: dates, plan, progress, legacy links, study4".

### Task 3: Service giả lập `auth` + `store`

**Files:** Create `web/src/services/{auth,store}.js`, `web/src/hooks/{useAuth,useStore}.js`, `web/test/{auth,store}.test.js`.

**Interfaces (Produces):**
- `auth.js`: `login(email, password): Promise<User>` (sai → throw `Error('Sai email hoặc mật khẩu')`), `logout(): Promise<void>`, `currentUser(): User|null`, `onAuthChange(cb): unsubscribe`. `User = {uid, email, name, role: 'student'|'teacher'}` (`uid` học viên `'student-1'`, tên "Học viên"; cô `'teacher-1'`, tên "Cô Tịnh"). Phiên lưu ở khóa `auth-session`.
- `store.js` (mọi hàm ghi throw `Error('Tài khoản cô giáo chỉ được xem')` nếu `currentUser().role==='teacher'`; mọi thay đổi gọi listener):
  - Thẻ: `getCardStatus(): Record<string,1|2>` (đọc `status`, nếu chưa có thì dựng từ `known`), `setCardStatus(key, v)` (cũng ghi `activity[today]` vào tập khóa thẻ đã ôn).
  - `getPrefs()/setPrefs(patch)` (khóa `pref`).
  - Lộ trình: `getPlanState()` (khóa `toeic700-v3`), `setPlanEntry(date, patch)`, `setPlanTask(date, idx, bool)` (đủ task → `done=true`; bỏ một task → `done=false`), `replacePlanState(state)`.
  - `cardsReviewed(date): number` (khóa `activity`: `{date: string[]}`).
  - Check-in (khóa `checkins`): `getCheckins(): Record<date,{at, cards, note, planTitle}>`, `completeDay(date, {note}): Checkin` (gọi `canComplete`, không đủ → throw `reason`), `undoCheckin(date)`.
  - Cài đặt theo vai trò (khóa `settings`): `getSettings(role)`, `setSettings(role, patch)`; mặc định học viên `{reminder:true, reminderTime:'20:00'}`, cô `{notifyDone:true, notifyMissed:true}`. Cô được ghi cài đặt của chính mình.
  - `subscribe(cb): unsubscribe` (lắng nghe cả sự kiện `storage` để trang cũ ở tab khác cũng cập nhật).
- Hooks: `useAuth(): {user, login, logout}`; `useStore(selector)` dùng `useSyncExternalStore`.

- [ ] Viết test: đăng nhập đúng/sai; `known=["1:0"]` không có `status` → `getCardStatus()['1:0']===2`; `setCardStatus('5:3',1)` ghi `localStorage.status` đúng định dạng cũ và `cardsReviewed(today)===1`, ghi lại cùng thẻ vẫn 1; đăng nhập cô rồi `setCardStatus` → throw; cô `setSettings('teacher',{notifyMissed:false})` → được; `setPlanTask` tick đủ 3 task ngày 16/11 → `getPlanState()['2026-11-16'].done===true`; `completeDay` khi chưa đủ → throw.
- [ ] FAIL → code → PASS. Commit "Mock auth and store services".

### Task 4: Khung app, đăng nhập, phân quyền

**Files:** Create `src/pages/Login.jsx`, `src/components/{AppShell,Toast}.jsx`; Modify `src/App.jsx`, `src/main.jsx`.

- [ ] `main.jsx`: nếu `legacyToRoute(location.hash)` có giá trị thì `location.replace('#'+route)` trước khi mount.
- [ ] `App.jsx`: routes như mục File Structure; `RequireRole({role})` chuyển hướng như mô tả; `Toast` qua context `useToast(): (msg) => void`.
- [ ] `Login.jsx`: logo, tiêu đề "Kho Từ TOEIC", email, mật khẩu (hiện/ẩn), nút "Đăng nhập", lỗi hiển thị dưới form, hộp "Tài khoản dùng thử" có 2 nút điền nhanh. Không có link đăng ký. Sau đăng nhập tới `next` hoặc trang chủ vai trò.
- [ ] `AppShell.jsx`: thanh trên (logo, tên vai trò, menu tài khoản có "Đăng xuất"); điều hướng học viên: Hôm nay / Kho từ / Lộ trình / Cài đặt; cô: Tổng quan / Cài đặt. Màn hình ≤ 720px: thanh tab cố định dưới đáy (có `safe-area-inset-bottom`); rộng hơn: tab trên thanh đầu.
- [ ] Kiểm tra: `npm run dev`, Playwright mở `/#/plan` khi chưa đăng nhập → về `/#/login?next=%2Fplan`; đăng nhập cô → vào `/#/teacher`; mở `/#/vocab` khi là cô → về `/#/teacher`; đăng xuất → về login.
- [ ] Commit "App shell, login, role routing".

### Task 5: Kho từ (chuyển `index.html`)

**Files:** Create `src/lib/{vocab,speech}.js`, `src/components/SegBar.jsx`, `src/pages/vocab/*`, `test/vocab.test.js`.

**Interfaces:** Consumes `getCardStatus/setCardStatus/getPrefs/setPrefs`. Produces `loadVocab(): Promise<Set[]>` (fetch `../vocab.json`, cache trong module), `GROUPS`, `prepare`, `counts(items, status)`.

- [ ] Test: `prepare` trên dữ liệu mẫu xếp `'Thẻ 2'` vào nhóm `tu-vung-toeic`, `'ETS 2020 TEST 1'` vào `ets` với sub `'ETS 2020'`; `sortKey` xếp "Thẻ 2" trước "Thẻ 10"; `enVi` đảo cặp khi thuật ngữ là tiếng Việt.
- [ ] Chuyển đủ: trang chủ kho từ (tổng thẻ đã thuộc, "Ôn 30 thẻ đang học", "Học 20 thẻ mới", lưới nhóm), nhóm (theo sub, "Học cả nhóm", "Ôn thẻ đang học"), học phần với 4 chế độ (Thẻ ghi nhớ lật/vuốt/phím tắt, Trắc nghiệm, Gõ từ, Danh sách), lọc trạng thái, đổi mặt trước, tự đọc, trộn, bảng giọng đọc, tìm kiếm ở thanh trên trang kho từ, đọc EN/VI với hướng dẫn cài giọng Việt. Hành vi và chữ giống `index.html`; CSS chuyển theo component.
- [ ] `npm test` PASS; Playwright: mở một học phần, lật thẻ, bấm "Đã thuộc" → `localStorage.status` đổi; mở `index.html` cũ thấy cùng trạng thái.
- [ ] Commit "Port vocabulary study to React".

### Task 6: Lộ trình (chuyển `lo-trinh.html`)

**Files:** Create `src/components/{ScoreChart,PlanTasks}.jsx`, `src/pages/plan/*`.

**Interfaces:** Consumes `getPlanState/setPlanEntry/setPlanTask/replacePlanState`, `planStats`, `mergeStudy4`, `rewritePlanLinks`. Produces `<ScoreChart points/>` (SVG như `drawChart`, vạch 700), `<PlanTasks day entry onToggle? readOnly/>` (danh sách việc có ô tick từng việc, HTML đã qua `rewritePlanLinks`).

- [ ] Chuyển đủ: phần đầu + 3 số tổng, "Hôm nay", biểu đồ, phiếu tô 112 ngày (bấm ô → nhảy tới tuần), danh sách ngày theo tuần (trước/này/sau), tick Xong và tick từng việc, nhập điểm Nghe/Đọc, thanh Part, panel đồng bộ study4 với bookmarklet trỏ `https://trangioi1999.github.io/toeic-vocab/app/` ; khi route có `?s4=` thì `mergeStudy4` → `replacePlanState` → toast → cuộn tới ngày.
- [ ] Playwright: tick 3 việc ngày 16/11 → ô phiếu tô được tô; mở `/#/plan?s4=<payload mẫu>` → điểm hiện ở ngày 16/11.
- [ ] Commit "Port study plan to React".

### Task 7: Học viên: Hôm nay + Cài đặt

**Files:** Create `src/pages/student/{Today,Settings}.jsx`.

- [ ] `Today.jsx`: lời chào + ngày; thẻ "Việc hôm nay" (`PlanTasks` có tick; trước 16/11 hiện "Còn N ngày nữa là bắt đầu lộ trình" và quy tắc 20 thẻ); số thẻ ôn hôm nay với vòng tiến độ tới 20 và nút "Ôn thẻ ngay" (`/vocab`); chuỗi ngày học + 7 ngày gần nhất dạng chấm (`dayStatus`); ô "Ghi chú gửi cô" và nút **Hoàn thành hôm nay** (vô hiệu + hiện `reason` khi `canComplete` chưa ok). Sau khi bấm: trạng thái "Đã hoàn thành lúc HH:MM · cô sẽ nhận thông báo", nút "Hoàn tác".
- [ ] `Settings.jsx`: công tắc "Nhắc học mỗi ngày" + chọn giờ (mặc định 20:00); khối "Thông báo trên thiết bị này" với trạng thái quyền và nút "Bật thông báo" (`Notification.requestPermission()`, được thì hiện thông báo thử "Đã bật thông báo nhắc học"); hướng dẫn iPhone (Safari → Chia sẻ → Thêm vào MH chính); ghi chú "Gửi thông báo tự động sẽ có ở bản sau"; thông tin tài khoản + "Đăng xuất".
- [ ] Playwright (360×780): trước khi tick, nút Hoàn thành bị khóa với lý do; ôn 20 thẻ (đặt sẵn `activity` hôm nay) → bấm được → trạng thái đã hoàn thành.
- [ ] Commit "Student Today and Settings".

### Task 8: Cô giáo: Tổng quan, Chi tiết ngày, Cài đặt

**Files:** Create `src/components/MonthCalendar.jsx`, `src/pages/teacher/{Overview,DayDetail,TeacherSettings}.jsx`.

**Interfaces:** `<MonthCalendar month={year,month0} statusOf={(iso)=>status} onPick={(iso)=>void}/>` dùng `monthGrid`; màu: done=`--known`, missed=`--bad`, rest=`--new`, pending=viền `--primary`, future=mờ.

- [ ] `Overview.jsx`: thẻ học viên (tên, hôm nay: đã/chưa hoàn thành + giờ); 4 số: chuỗi ngày, tỉ lệ hoàn thành các ngày làm việc đã qua, thẻ đã thuộc, điểm gần nhất; lịch tháng có chuyển tháng (mặc định tháng hiện tại; từ 11/2026 tới 03/2027) + chú thích; biểu đồ điểm (`ScoreChart`); danh sách 7 hoạt động gần nhất (check-in kèm ghi chú). Không có control ghi.
- [ ] `DayDetail.jsx` (`/teacher/day/:date`): tiêu đề ngày + trạng thái; việc lộ trình (`PlanTasks readOnly`), số thẻ ôn, giờ hoàn thành, ghi chú học viên, điểm + thanh Part nếu là ngày đề.
- [ ] `TeacherSettings.jsx`: 2 công tắc "Báo khi học viên hoàn thành", "Báo lúc 23:00 nếu hôm nay chưa học"; nút "Bật thông báo"; "Đăng xuất".
- [ ] Playwright: học viên hoàn thành hôm nay → đăng xuất → đăng nhập cô → ô hôm nay màu xanh, bấm vào thấy ghi chú.
- [ ] Commit "Teacher overview and day detail".

### Task 9: PWA, README, build, kiểm tra cuối

**Files:** Create `web/public/{manifest.webmanifest,sw.js}` (scope `./`, cache app shell của `app/` + `../vocab.json`), copy icon; Modify `README.md`; build `app/`.

- [ ] Đăng ký SW trong `main.jsx` chỉ khi `import.meta.env.PROD`.
- [ ] README: mục "App mới (giai đoạn 1)": link `https://trangioi1999.github.io/toeic-vocab/app/`, tài khoản demo, `cd web && npm i && npm run dev`, `npm run build` ghi ra `app/`, ghi rõ dữ liệu đang giả lập trong trình duyệt.
- [ ] `npm test` PASS; `npm run build`; `python3 -m http.server` ở gốc repo, Playwright chụp 360px và 1280px các màn: Login, Hôm nay, Kho từ, Học phần, Lộ trình, Cài đặt, Tổng quan cô, Chi tiết ngày — cả sáng và tối; không lỗi console, không cuộn ngang.
- [ ] Commit "Build app/, PWA, README" và push lên `claude/elegant-clarke-002cqr`.
