# Kho Từ TOEIC

Trang học từ vựng TOEIC, dữ liệu lấy từ các học phần Quizlet của lớp "Lớp TOEIC Online" (cô Tịnh).

- `vocab.json`: 199 học phần, 6.580 thẻ (`[{id, title, cards: [[thuật ngữ, định nghĩa, phiên âm IPA?], ...]}]`). Phiên âm IPA (giọng Mỹ) được tạo tự động từ từ điển CMU.
- `index.html`: 13 nhóm học phần, thẻ ghi nhớ lật 2 mặt, trắc nghiệm, gõ từ, danh sách, tìm kiếm; trạng thái mỗi thẻ (chưa học / đang học / đã thuộc) lưu trên trình duyệt; đọc tiếng Anh và tiếng Việt.

Chạy cục bộ: `python3 -m http.server` rồi mở http://localhost:8000

## Lộ trình ôn thi

`lo-trinh.html` – lộ trình TOEIC 700 (16/11/2026 → 03/2027): một ngày làm đề full trên study4, một ngày chữa đề, kèm link thẻ từ vựng cho từng ngày. Mở tại https://trangioi1999.github.io/toeic-vocab/lo-trinh.html

## App mới (React, giai đoạn 1: giao diện)

Mở tại https://trangioi1999.github.io/toeic-vocab/app/

- Đăng nhập, đăng xuất, hai vai trò: **học viên** (Hôm nay, Kho từ, Lộ trình, Cài đặt) và **cô giáo** (Tổng quan, chi tiết từng ngày, Cài đặt).
- Tài khoản dùng thử: `hocvien@demo.vn` và `co@demo.vn`, mật khẩu `123456`.
- Bản này **chưa có máy chủ**: đăng nhập và dữ liệu là giả lập, lưu trong trình duyệt. Cô chỉ thấy tiến độ khi đăng nhập trên cùng trình duyệt với học viên. Giai đoạn 2 sẽ nối Firebase (đăng nhập thật, dữ liệu dùng chung, thông báo nhắc học và báo cho cô).
- App mới dùng chung dữ liệu với `index.html` và `lo-trinh.html` (cùng khóa `localStorage`), nên tiến độ cũ hiện ngay trong app. Trang cũ chỉ đọc dữ liệu lúc mở: nếu đang mở trang cũ ở tab khác, hãy tải lại nó sau khi dùng app để không ghi đè. Thẻ ôn ở trang cũ không được tính vào mục "thẻ đã ôn hôm nay".

Phát triển:

```
cd web
npm install
npm run dev     # http://localhost:5173
npm test        # kiểm thử logic
npm run build   # ghi bản build ra ../app (commit thư mục app/)
```

Mã nguồn ở `web/src`: `services/` (đăng nhập, dữ liệu – chỗ sẽ thay bằng Firebase), `lib/` (logic thuần), `pages/` (màn hình).
