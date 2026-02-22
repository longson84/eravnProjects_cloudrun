
**Context:**
Tôi có một dự án tên là **eravnProjects** hiện đang chạy theo kiến trúc Monolith trên Google Apps Script (GAS). Toàn bộ Frontend (React), Backend (.gs scripts) và tầng DB (Firestore REST API) đang nằm chung một repo.
Mục tiêu của tôi là tách dự án này ra thành một kiến trúc hiện đại hơn:

1. **Frontend:** Giữ nguyên UI (React, Tailwind, Shadcn), chỉ đổi tầng giao tiếp từ `google.script.run` sang REST API.
2. **Backend:** Chuyển từ GAS (.gs) sang Node.js chạy trên Google Cloud Run.
3. **Database:** Tiếp tục sử dụng **Firestore** nhưng chuyển từ gọi REST API sang dùng **Google Cloud Firestore SDK** chính chủ cho Node.js.

**Yêu cầu chi tiết:**

**1. Phân tích Repo hiện tại:**

* Đọc folder `gas/` để hiểu logic của `SyncService.gs`, `DriveService.gs`, `ProjectService.gs`, và `FirestoreRepository.gs`.
* Đọc `src/types/types.ts` để nắm vững cấu trúc dữ liệu của hệ thống.

**2. Khởi tạo cấu trúc Backend mới (Node.js + Express + TypeScript):**
Hãy tạo một thư mục mới (hoặc repo mới) có tên `eravn-backend` với cấu trúc:

* `src/controllers/`: Xử lý Route cho Sync, Projects, Settings, và Webhooks.
* `src/services/`: Chuyển đổi logic từ các file `.gs` sang class/function Node.js. Sử dụng thư viện `googleapis` thay cho `DriveApp`.
* `src/repositories/`: Sử dụng `@google-cloud/firestore` để thay thế cho `FirestoreRepository.gs`.
* `src/app.ts`: Cấu hình Server Express, Middleware (CORS, JSON).
* `Dockerfile`: Để deploy lên Cloud Run.

**3. Chuyển đổi Logic đồng bộ (Core Task):**

* Tối ưu hàm `syncAllProjects`: Sử dụng `Promise.all` để quét và sync nhiều folder cùng lúc (Parallel processing) thay vì vòng lặp tuần tự.
* Xử lý Webhook: Chuyển logic từ `WebhookService.gs` sang một Endpoint POST trong Express để hứng Push Notifications từ Google Drive.

**4. Cập nhật Frontend (React):**

* Trong file `src/services/gasService.ts`, hãy thay thế toàn bộ logic `google.script.run` bằng một `apiClient` sử dụng `Axios`.
* Đảm bảo các Hooks (`useProjects`, `useSyncLogs`, `useSettinsg`) vẫn hoạt động bình thường nhưng lấy dữ liệu từ URL Backend mới (sử dụng biến môi trường `VITE_API_URL`).
* Loại bỏ `vite-plugin-singlefile` trong `vite.config.ts` để build ra bộ file tĩnh chuẩn.

**5. Bảo toàn tính năng:**

* Đảm bảo logic đồng bộ file từ folder đối tác sang folder của tôi dựa trên `modifiedTime` vẫn hoạt động chính xác.
* Giữ nguyên cơ chế ghi log vào Firestore sau mỗi phiên sync.

**Action:**
Hãy bắt đầu bằng việc phác thảo file `src/app.ts` cho Backend và file `src/services/apiClient.ts` cho Frontend. Sau đó lần lượt chuyển đổi từng Service một.
