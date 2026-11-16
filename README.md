# Kho Từ TOEIC

Trang học từ vựng TOEIC, dữ liệu lấy từ các học phần Quizlet của lớp "Lớp TOEIC Online" (cô Tịnh).

- `vocab.json`: 199 học phần, 6.580 thẻ (`[{id, title, cards: [[thuật ngữ, định nghĩa, phiên âm IPA?], ...]}]`). Phiên âm IPA (giọng Mỹ) được tạo tự động từ từ điển CMU.
- `index.html`: 13 nhóm học phần, thẻ ghi nhớ lật 2 mặt, trắc nghiệm, gõ từ, danh sách, tìm kiếm; trạng thái mỗi thẻ (chưa học / đang học / đã thuộc) lưu trên trình duyệt; đọc tiếng Anh và tiếng Việt.

Chạy cục bộ: `python3 -m http.server` rồi mở http://localhost:8000

## Lộ trình ôn thi

`lo-trinh.html` – lộ trình TOEIC 700 (16/11/2026 → 03/2027): một ngày làm đề full trên study4, một ngày chữa đề, kèm link thẻ từ vựng cho từng ngày. Mở tại https://trangioi1999.github.io/toeic-vocab/lo-trinh.html

## App mới (React)

Chạy trên Cloudflare Workers (static assets), link gọn dạng `https://toeic-vocab.gioitv-dev.workers.dev` (Worker tên `toeic-vocab`) hoặc tên miền riêng.

- `/` là trang giới thiệu. `/login` và `/signup` mở hộp thoại đăng nhập / đăng ký (đăng ký đang khóa, mở bằng `SIGNUP_OPEN` trong `web/src/brand.js`).
- Vai trò đi theo tài khoản: **người học** vào `/today`, `/vocab`, `/plan`, `/settings`; **người kèm** vào `/coach`, `/coach/day/<ngày>`, `/coach/settings`. Không có nút chọn vai trò.
- Tài khoản dùng thử (không hiện trên trang): `hocvien@demo.vn` và `co@demo.vn`, mật khẩu `123456`.
- Hai chế độ, tự chọn lúc mở app: **chưa có khóa Firebase** trên Cloudflare thì dùng tài khoản giả lập, dữ liệu trong trình duyệt; **có khóa** thì dùng tài khoản Firebase thật, dữ liệu chung trên Firestore, có thông báo. Không cần sửa code hay build lại. Cách bật: mục *Bật Firebase* bên dưới.
- Tên sản phẩm và địa chỉ app nằm ở `web/src/brand.js`. Đổi địa chỉ thì sửa cả `APP_URL` trong `chuyen-nha.html` và `NEW_APP` trong `app/index.html`. Nút "Đồng bộ TOEIC" (study4) cũ vẫn chạy nhờ `app/index.html` chuyển tiếp, nhưng nên kéo lại nút mới từ trang Lộ trình.

### Deploy lên Cloudflare Workers

App React build ra file tĩnh trong `web/dist`; một Worker chỉ có static assets phát các file đó.

| File | Việc |
|---|---|
| `web/wrangler.toml` | tên Worker `toeic-vocab`, thư mục `./dist`, `not_found_handling = "single-page-application"` để link sâu (`/vocab/set/…`) mở được |
| `web/package.json` | `npm run build` = chạy test rồi build: test hỏng thì không deploy |
| `web/.nvmrc` | Node 22 |
| `web/public/_headers` | cache 1 năm cho file đã băm tên, luôn kiểm tra bản mới của trang/sw.js/vocab.json, header bảo mật |

Tạo project một lần: dash.cloudflare.com → **Workers & Pages → Create → Import a repository** → chọn `toeic-vocab`, rồi điền:

| Ô | Giá trị |
|---|---|
| Project name | `toeic-vocab` (phải trùng `name` trong `wrangler.toml`) |
| Build command | `npm ci` (chỉ cài thư viện; test + build do `wrangler deploy` tự chạy qua `[build]` trong `wrangler.toml`) |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command (nếu có) | `npx wrangler versions upload` |
| Path / Root directory (trong Advanced settings) | `web` |

Mỗi lần code vào `main` là tự deploy. Link mặc định dạng `toeic-vocab.gioitv-dev.workers.dev`; đổi `APP_URL` trong `web/src/brand.js`, `chuyen-nha.html` và `NEW_APP` trong `app/index.html` cho đúng link thật. Khóa bí mật (giai đoạn 2) thêm ở **Settings → Variables and Secrets**.

Kiểm tra trên máy: `cd web && npm run build && npx wrangler deploy --dry-run` (hoặc `npx wrangler dev` để chạy thử).

### Bật Firebase (tài khoản thật, dữ liệu chung, thông báo) — khoảng 20 phút, miễn phí

Không cần thẻ: gói Spark của Firebase và gói Free của Cloudflare là đủ.

**A. Tạo project Firebase** (console.firebase.google.com)

1. **Add project**, đặt tên (ví dụ `kho-tu-toeic`). Google Analytics: tắt cũng được.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
   Rồi **Authentication → Settings → User actions → bỏ chọn "Enable create (sign-up)" → Save**, để người lạ không tự tạo được tài khoản.
3. **Authentication → Users → Add user**: tạo tài khoản cho bạn và cho người kèm (email + mật khẩu). Chép lại **User UID** của từng người.
4. **Build → Firestore Database → Create database**, vị trí `asia-southeast1` (Singapore), chọn **Production mode**.
5. **Firestore → Rules**: xóa hết, dán nội dung file `firebase/firestore.rules` trong repo, bấm **Publish**.
6. **Firestore → Data → Start collection** tên `users`, tạo 2 document (Document ID = UID ở bước 3):

   | Document ID | Trường (kiểu string) |
   |---|---|
   | UID của bạn | `role` = `student`, `name` = tên bạn |
   | UID người kèm | `role` = `coach`, `learnerUid` = UID của bạn, `name` = tên người kèm |

   Vai trò chỉ đổi được ở đây; app không cho ai tự sửa.
7. **Project settings (bánh răng) → General → Your apps → biểu tượng Web `</>`** → đặt tên, không cần Hosting → **Register app**. Chép 4 giá trị trong `firebaseConfig`: `apiKey`, `projectId`, `appId`, `messagingSenderId`.
8. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair**. Chép chuỗi khóa (VAPID key).
9. **Project settings → Service accounts → Generate new private key** → tải về một file `.json`. Giữ kín file này.
10. **Authentication → Settings → Authorized domains → Add domain**: tên miền của app trên Cloudflare (`toeic-vocab.gioitv-dev.workers.dev`).

**B. Dán khóa vào Cloudflare** (Workers & Pages → `toeic-vocab` → **Settings → Variables and Secrets → Add**)

| Tên | Kiểu | Giá trị |
|---|---|---|
| `FIREBASE_API_KEY` | Text | `apiKey` |
| `FIREBASE_PROJECT_ID` | Text | `projectId` |
| `FIREBASE_APP_ID` | Text | `appId` |
| `FIREBASE_MESSAGING_SENDER_ID` | Text | `messagingSenderId` |
| `FIREBASE_VAPID_KEY` | Text | khóa ở bước A8 |
| `FIREBASE_SERVICE_ACCOUNT` | **Secret** | toàn bộ nội dung file `.json` ở bước A9 |

Bấm **Deploy** để áp dụng. `wrangler.toml` có `keep_vars = true` nên các lần deploy sau không xóa những biến này.

**C. Dùng thử**

1. Mở app, đăng nhập bằng email của bạn. Tiến độ đang có trong trình duyệt đó tự được đưa lên Firebase (một lần, không ghi đè gì).
2. **Cài đặt → Bật thông báo** trên từng máy muốn nhận. iPhone: mở bằng Safari → Chia sẻ → **Thêm vào MH chính**, mở app từ màn hình chính rồi mới bật.
3. Người kèm đăng nhập trên máy của họ, bật thông báo. Khi bạn bấm **Hoàn thành hôm nay**, họ nhận thông báo ngay.
4. Kiểm tra: Firestore → Data có `learners/<UID của bạn>/data/...`.

Thông báo tự động (máy chủ Cloudflare kiểm tra 10 phút một lần, theo giờ Việt Nam): nhắc người học từ giờ đã đặt (mặc định 20:00) nếu hôm đó chưa xong; 23:00 báo người kèm nếu hôm có bài trong lộ trình mà chưa học. Mỗi loại tối đa một lần một ngày.

Sự cố hay gặp:
- **"Tài khoản chưa được cấp quyền"**: thiếu document `users/<UID>` hoặc sai `role` / `learnerUid` (bước A6).
- **Đăng nhập báo lỗi tên miền**: chưa thêm tên miền ở bước A10.
- **Không nhận thông báo**: chưa bật ở Cài đặt trên máy đó, hoặc thiếu `FIREBASE_VAPID_KEY` / `FIREBASE_SERVICE_ACCOUNT`. Trên máy tính, mở DevTools → Application → Service Workers: phải thấy `sw.js` ở trạng thái *activated*.
- Muốn quay lại chế độ giả lập: xóa các biến `FIREBASE_*` rồi deploy lại.

### Chuyển dữ liệu từ GitHub Pages

Tiến độ cũ nằm trong trình duyệt theo từng địa chỉ web, nên phải chuyển một lần trên mỗi máy:

1. Mở trang cũ `https://trangioi1999.github.io/toeic-vocab/` (có dải thông báo ở đầu) hoặc thẳng `.../chuyen-nha.html`.
2. Bấm **Chuyển sang app mới**. App mới mở trang `/import`, gộp dữ liệu (không ghi đè thứ đã có) rồi báo đã chuyển xong.
3. Nếu nút không mở được: bấm **Sao chép mã**, mở app mới → Cài đặt → **Nhập dữ liệu từ bản cũ**, dán vào.
4. iPhone/iPad: app đã thêm vào màn hình chính có dữ liệu riêng, tách khỏi Safari. Hãy mở trang chuyển dữ liệu từ đúng nơi bạn đã học (icon trên màn hình chính hay Safari). Nếu cài app mới lên màn hình chính, vào Cài đặt → Nhập dữ liệu từ bản cũ trong chính app đó.
5. Chuyển xong trên mọi máy thì tắt GitHub Pages: repo → Settings → Pages → Source: **None**.

### Phát triển

```
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # kiểm thử logic
npm run build    # test + build ra web/dist (Cloudflare chạy đúng lệnh này)
npm run build:only  # build không chạy test
npm run preview  # xem bản build ở http://localhost:4173
```

Mã nguồn: `web/src/services/` (đăng nhập và dữ liệu: `auth.js`, `store.js`, `kv.js`; chế độ Firebase ở `firebase.js`, `cloudKv.js`, `config.js`), `web/src/lib/` (logic thuần), `web/src/pages/` (màn hình), `web/worker/` (máy chủ Cloudflare: cấu hình, khóa từ vựng, thông báo), `firebase/firestore.rules` (quy tắc bảo mật), `web/src/brand.js` (tên, địa chỉ, công tắc đăng ký).
