# Kho Từ TOEIC → React + đăng nhập + cô giáo theo dõi

## Mục đích

Học viên (chủ repo) học TOEIC hằng ngày theo lộ trình 700. Cô giáo cần một tài khoản để vào xem học viên có học mỗi ngày không. Học viên được nhắc học mỗi ngày; khi học xong thì cô được báo. Mục tiêu là giữ kỷ luật học đều đến kỳ thi (03/2027).

## Hiện trạng

- `index.html` (kho từ: nhóm, học phần, thẻ lật, trắc nghiệm, gõ từ, danh sách, tìm kiếm, đọc EN/VI) và `lo-trinh.html` (lộ trình 112 ngày, phiếu tô, điểm study4, bookmarklet đồng bộ) là HTML/JS thuần, chạy trên GitHub Pages.
- Mọi tiến độ nằm trong `localStorage`: `status`, `pref`, `toeic700-v3`.

## Ràng buộc

- Không có tiền: chỉ dùng dịch vụ miễn phí, không gắn thẻ. Firebase gói Spark + GitHub Actions (repo công khai).
- Gói Spark không có Cloud Functions → thông báo chạy bằng cron của GitHub Actions, chấp nhận trễ 5–15 phút.
- Web push trên iPhone chỉ chạy khi trang được "Thêm vào màn hình chính".

## Cách làm (Approaches)

1. **Vite + React, deploy GitHub Pages qua Actions** — chọn. Có build, chia component, dễ lắp Firebase SDK.
2. React qua CDN không build — bỏ: không có JSX/module, khó bảo trì khi app lớn.
3. Backend: Supabase (miễn phí, có cron) vs Firebase — học viên chọn **Firebase**.
4. Thông báo: Cloud Functions (Blaze, cần thẻ) vs GitHub Actions cron (miễn phí) — học viên chọn **GitHub Actions**.

## Chia giai đoạn (học viên quyết định)

### Giai đoạn 1 — Giao diện (làm bây giờ)

Toàn bộ UI/UX bằng React, chạy được thật, nhưng đăng nhập và dữ liệu là bản giả lập trong trình duyệt, đặt sau một lớp service để giai đoạn 2 chỉ thay phần ruột.

- **Đăng nhập / đăng xuất**: màn hình đăng nhập email + mật khẩu, không có đăng ký. Bản giả lập có 2 tài khoản demo (học viên, cô giáo), hiển thị gợi ý trên màn hình đăng nhập.
- **Định tuyến theo vai trò**: học viên vào khu học; cô giáo vào khu theo dõi. Cô không sửa được tiến độ.
- **Học viên**
  - *Hôm nay*: việc của ngày trong lộ trình (tick từng việc), số thẻ đã ôn hôm nay, chuỗi ngày học, nút **Hoàn thành hôm nay** (chỉ bấm được khi đã tick xong việc của ngày; ngày nghỉ/ngoài lộ trình thì cần ôn ít nhất 20 thẻ — *mình chọn*). Có ô ghi chú gửi cô.
  - *Kho từ*: chuyển đầy đủ chức năng của `index.html` sang React, giữ nguyên hệ màu/kiểu chữ.
  - *Lộ trình*: chuyển đầy đủ `lo-trinh.html` (phiếu tô, tuần, biểu đồ điểm, nhập điểm, bookmarklet study4).
  - *Cài đặt*: giờ nhắc học (mặc định 20:00), bật/tắt thông báo, nút xin quyền thông báo, hướng dẫn thêm vào màn hình chính trên iPhone, đăng xuất.
- **Cô giáo**
  - *Tổng quan*: lịch tháng (ngày học / bỏ / nghỉ theo lộ trình / tương lai), chuỗi ngày, tỉ lệ hoàn thành, điểm gần nhất, biểu đồ điểm.
  - *Chi tiết ngày*: việc lộ trình đã làm, số thẻ ôn, giờ bấm hoàn thành, ghi chú của học viên, điểm đề (nếu có).
  - *Cài đặt*: bật/tắt nhận tin "học xong", "hôm nay nghỉ" (23:00), đăng xuất.
- **Dữ liệu giả lập**: mỗi lần học viên đánh dấu thẻ, tick lộ trình, bấm hoàn thành → ghi vào kho cục bộ; cô (đăng nhập trên cùng trình duyệt) thấy ngay. Đọc lại khóa `localStorage` cũ để không mất tiến độ.
- Sáng/tối theo hệ thống, dùng tốt trên điện thoại, PWA (manifest + service worker) giữ như cũ.

### Giai đoạn 2 — Tính năng thật (sau)

- Firebase Auth (email/mật khẩu, tài khoản tạo tay trên Console), vai trò trong `users/{uid}.role`.
- Firestore: tiến độ thẻ, lộ trình, điểm, `checkins/{uid}/days/{date}`; security rules: học viên ghi dữ liệu của mình, cô chỉ đọc.
- FCM: lưu token thiết bị. GitHub Actions cron: 20:00 nhắc học viên nếu chưa xong; mỗi ~10 phút báo cô các lần hoàn thành mới; 23:00 báo cô nếu hôm nay nghỉ.
- Chuyển dữ liệu `localStorage` lên Firestore ở lần đăng nhập đầu.

## Không làm (non-goals)

- Không có đăng ký công khai, không nhiều học viên/nhiều lớp.
- Không chat; cô chưa nhận xét được trong giai đoạn 1.
- Không tốn tiền dưới mọi hình thức.

## Anti-goals

- Mất tiến độ học cũ khi chuyển sang app mới.
- App mới kém hơn trang cũ trên điện thoại (chậm, nút nhỏ, mất tính năng đọc).

## Để người làm tự quyết

Cấu trúc thư mục, thư viện router (HashRouter cho GitHub Pages), cách chia component, chi tiết hình ảnh trong khuôn khổ hệ màu hiện có.
