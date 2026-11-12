# Kho Từ TOEIC

Trang học từ vựng TOEIC, dữ liệu lấy từ các học phần Quizlet của lớp "Lớp TOEIC Online" (cô Tịnh).

- `vocab.json`: 199 học phần, 6.580 thẻ (`[{id, title, cards: [[thuật ngữ, định nghĩa, phiên âm IPA?], ...]}]`). Phiên âm IPA (giọng Mỹ) được tạo tự động từ từ điển CMU.
- `index.html`: 13 nhóm học phần, thẻ ghi nhớ lật 2 mặt, trắc nghiệm, gõ từ, danh sách, tìm kiếm; trạng thái mỗi thẻ (chưa học / đang học / đã thuộc) lưu trên trình duyệt; đọc tiếng Anh và tiếng Việt.

Chạy cục bộ: `python3 -m http.server` rồi mở http://localhost:8000
