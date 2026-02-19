# eravnProjects - Sync Manager

**eravnProjects** là hệ thống quản lý đồng bộ dữ liệu đa dự án và giám sát thông minh, được xây dựng trên nền tảng Google Apps Script (Backend) và React + shadcn/ui (Frontend).

## 🚀 Tính năng chính

- **Quản lý dự án**: Tạo, sửa, xóa cấu hình đồng bộ (Source -> Destination folder).
- **Dashboard thông minh**: Biểu đồ trực quan về hiệu suất đồng bộ, dung lượng lưu trữ, và tỷ lệ lỗi.
- **Sync Engine mạnh mẽ**:
  - Time-Snapshot Sync algorithm (chỉ sync file mới/thay đổi).
  - Tự động ngắt (Safe Exit) khi hết thời gian chạy cho phép.
  - Hàng đợi (Queue) thông minh ưu tiên dự án lâu chưa sync.
  - Tự động retry khi gặp lỗi Drive API 429.
- **Giám sát & Logs**:co
  - Lưu lịch sử sync chi tiết từng file vào Firestore.
  - Gửi thông báo báo cáo qua Google Chat Webhook.
  - Giao diện tra cứu log chi tiết.
- **UI hiện đại**: Dark mode, Responsive, trải nghiệm người dùng mượt mà.

## 🛠 Công nghệ sử dụng

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Lucide React.
- **Backend**: Google Apps Script (GAS), Drive API v3.
- **Database**: Firestore (lưu metadata, logs), Google Drive (lưu file).
- **Tools**: VS Code, clasp (để deploy).

## 📦 Cấu trúc dự án

```
.
├── src/                  # React Frontend Source
│   ├── components/       # UI Components (shadcn/ui + feature components)
│   ├── context/          # Global State (AppContext)
│   ├── data/             # Mock Data (cho local dev)
│   ├── pages/            # Application Pages (Dashboard, Projects, Logs, Settings)
│   ├── services/         # API Services (GAS wrapper, Firestore)
│   └── types/            # TypeScript Definitions
├── gas/                  # Google Apps Script Backend
│   ├── Code.gs           # Controller / API Endpoints
│   ├── SyncService.gs    # Core Sync Logic
│   ├── DriveService.gs   # Drive API Wrapper
│   ├── FirestoreRepository.gs # Database Layer
│   ├── WebhookService.gs # Notification Service
│   └── Utils.gs          # Helpers
└── ...
```

## 🔧 Cài đặt & Phát triển

### 1. Local Development (Frontend only)

Để chạy giao diện React trên máy local với mock data:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Truy cập `http://localhost:5180`.

### 2. Build for Production

Build React app thành file static (single html/js/css) để nhúng vào GAS:

```bash
npm run build
```

Output sẽ nằm trong thư mục `dist/`.

## ☁️ Deployment lên Google Apps Script

Sử dụng tool `clasp` để quản lý và deploy code lên GAS.

### Prerequisites

1.  Cài đặt clasp: `npm install -g @google/clasp`
2.  Login: `clasp login`
3.  Bật Google Apps Script API trong phần cài đặt của account: https://script.google.com/home/usersettings

### Setup (Lần đầu)

1.  Trong thư mục gốc, tạo file `.clasp.json` trỏ đến Script ID của bạn:
    ```json
    {
      "scriptId": "YOUR_SCRIPT_ID",
      "rootDir": "./gas"
    }
    ```
2.  Copy file output build của React vào thư mục `gas/` (bạn cần viết script để inline JS/CSS vào file HTML nếu cần, hoặc host JS/CSS riêng).
    *Note: Template này hiện tại build ra file độc lập. Để chạy trên GAS, bạn cần copy nội dung `dist/index.html` vào `gas/index.html` và đảm bảo các assets được load đúng cách (hoặc inline chúng).*

### Deploy Command

```bash
# Push code lên GAS
clasp push

# Deploy version mới
clasp deploy
```

## ⚙️ Cấu hình Firestore

1.  Tạo project Firebase và bật Firestore Database.
2.  Lấy `Project ID`.
3.  Vào phần **Cài đặt** trên ứng dụng eravnProjects, nhập `Firebase Project ID`.
4.  Đảm bảo script của bạn có quyền truy cập Firestore (cần setup Service Account hoặc dùng OAuth token của user nếu set rules mở - *lưu ý bảo mật*).

---
Developed by **eravnProjects Team**.
