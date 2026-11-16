# Kho Từ TOEIC

Trang học từ vựng TOEIC, dữ liệu lấy từ các học phần Quizlet của lớp "Lớp TOEIC Online" (cô Tịnh).

- `vocab.json`: 199 học phần, 6.580 thẻ (`[{id, title, cards: [[thuật ngữ, định nghĩa, phiên âm IPA?], ...]}]`). Phiên âm IPA (giọng Mỹ) được tạo tự động từ từ điển CMU.
- `index.html`: 13 nhóm học phần, thẻ ghi nhớ lật 2 mặt, trắc nghiệm, gõ từ, danh sách, tìm kiếm; trạng thái mỗi thẻ (chưa học / đang học / đã thuộc) lưu trên trình duyệt; đọc tiếng Anh và tiếng Việt.

Chạy cục bộ: `python3 -m http.server` rồi mở http://localhost:8000

## Lộ trình ôn thi

`lo-trinh.html` – lộ trình TOEIC 700 (16/11/2026 → 03/2027): một ngày làm đề full trên study4, một ngày chữa đề, kèm link thẻ từ vựng cho từng ngày. Mở tại https://trangioi1999.github.io/toeic-vocab/lo-trinh.html

## App mới (React, giai đoạn 1: giao diện)

Chạy trên Cloudflare Workers (static assets), link gọn dạng `https://kho-tu-toeic.<tên-tài-khoản>.workers.dev` hoặc tên miền riêng.

- `/` là trang giới thiệu. `/login` và `/signup` mở hộp thoại đăng nhập / đăng ký (đăng ký đang khóa, mở bằng `SIGNUP_OPEN` trong `web/src/brand.js`).
- Vai trò đi theo tài khoản: **người học** vào `/today`, `/vocab`, `/plan`, `/settings`; **người kèm** vào `/coach`, `/coach/day/<ngày>`, `/coach/settings`. Không có nút chọn vai trò.
- Tài khoản dùng thử (không hiện trên trang): `hocvien@demo.vn` và `co@demo.vn`, mật khẩu `123456`.
- Bản này **chưa có máy chủ**: đăng nhập và dữ liệu là giả lập, lưu trong trình duyệt. Giai đoạn 2 nối Firebase (tài khoản thật, ô `role` đặt tay trong Firebase là `student` hoặc `coach`, dữ liệu dùng chung, thông báo).
- Tên sản phẩm và địa chỉ app nằm ở `web/src/brand.js`. Đổi địa chỉ thì sửa cả `APP_URL` trong `chuyen-nha.html` và `NEW_APP` trong `app/index.html`. Nút "Đồng bộ TOEIC" (study4) cũ vẫn chạy nhờ `app/index.html` chuyển tiếp, nhưng nên kéo lại nút mới từ trang Lộ trình.

### Deploy lên Cloudflare Workers

App React build ra file tĩnh trong `web/dist`; một Worker chỉ có static assets phát các file đó.

| File | Việc |
|---|---|
| `web/wrangler.toml` | tên Worker `kho-tu-toeic`, thư mục `./dist`, `not_found_handling = "single-page-application"` để link sâu (`/vocab/set/…`) mở được |
| `web/package.json` | `npm run build` = chạy test rồi build: test hỏng thì không deploy |
| `web/.nvmrc` | Node 22 |
| `web/public/_headers` | cache 1 năm cho file đã băm tên, luôn kiểm tra bản mới của trang/sw.js/vocab.json, header bảo mật |

Tạo project một lần: dash.cloudflare.com → **Workers & Pages → Create → Import a repository** → chọn `toeic-vocab`, rồi điền:

| Ô | Giá trị |
|---|---|
| Project name | `kho-tu-toeic` (phải trùng `name` trong `wrangler.toml`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command (nếu có) | `npx wrangler versions upload` |
| Path / Root directory (trong Advanced settings) | `web` |

Mỗi lần code vào `main` là tự deploy. Link mặc định dạng `kho-tu-toeic.<tên-tài-khoản>.workers.dev`; đổi `APP_URL` trong `web/src/brand.js`, `chuyen-nha.html` và `NEW_APP` trong `app/index.html` cho đúng link thật. Khóa bí mật (giai đoạn 2) thêm ở **Settings → Variables and Secrets**.

Kiểm tra trên máy: `cd web && npm run build && npx wrangler deploy --dry-run` (hoặc `npx wrangler dev` để chạy thử).

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

Mã nguồn ở `web/src`: `services/` (đăng nhập, dữ liệu – chỗ sẽ thay bằng Firebase), `lib/` (logic thuần), `pages/` (màn hình), `brand.js` (tên, địa chỉ, công tắc đăng ký).
