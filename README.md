# eravnProjects - Sync Manager

**eravnProjects** là hệ thống quản lý đồng bộ dữ liệu đa dự án và giám sát thông minh, được xây dựng trên nền tảng Google Apps Script (Backend) và React + shadcn/ui (Frontend).

## 🚀 Tính năng chính

- **Quản lý dự án**: Tạo, sửa, xóa cấu hình đồng bộ (Source -> Destination folder).
- **Dashboard thông minh**: Biểu đồ trực quan về hiệu suất đồng bộ, dung lượng lưu trữ, và tỷ lệ lỗi.
- **Sync Engine**:
  - Time-Snapshot Sync algorithm (chỉ sync file mới/thay đổi).
  - Tự động ngắt (Safe Exit) khi hết thời gian chạy cho phép.
  - Hàng đợi (Queue) thông minh ưu tiên dự án lâu chưa sync.
  - Tự động retry khi gặp lỗi Drive API 429.
- **Giám sát & Logs**:co
  - Lưu lịch sử sync chi tiết từng file vào Firestore.
  - Gửi thông báo báo cáo qua Google Chat Webhook.
  - Giao diện tra cứu log chi tiết.

---
Developed by **eravnProjects Team**.
