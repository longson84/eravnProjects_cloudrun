# Quá trình triển khai Dashboard

Tài liệu này mô tả các bước đã thực hiện để triển khai tính năng Dashboard, thay thế dữ liệu giả lập (mock data) bằng dữ liệu thật từ backend Google Apps Script (GAS).

## 1. Phân tích yêu cầu & Thảo luận Concept

- **Yêu cầu ban đầu**: Xây dựng 4 thành phần chính cho Dashboard:
    1.  **Total Projects**: Thống kê tổng số dự án và số dự án đang hoạt động.
    2.  **Sync Progress**: Thống kê số lượng files, dung lượng, và số phiên đồng bộ trong ngày và trong 7 ngày gần nhất.
    3.  **Sync Chart**: Biểu đồ thể hiện hiệu suất đồng bộ (số files và thời gian xử lý) trong 10 ngày gần nhất.
    4.  **Recent Sync Projects**: Danh sách các phiên đồng bộ gần đây nhất.
- **Concept đã thống nhất**:
    - **Backend**: Tạo một service riêng (`DashboardService.gs`) trên GAS để tổng hợp và tính toán sẵn dữ liệu, giảm tải cho frontend.
    - **Frontend**: Sử dụng React Query (`@tanstack/react-query`) để lấy dữ liệu, quản lý trạng thái loading/error và tự động cập nhật dữ liệu.
    - **Cấu trúc dữ liệu**: Bổ sung các trường `totalSize` (cho Project) và `totalSizeSynced` (cho SyncSession) để theo dõi dung lượng dữ liệu.

## 2. Nâng cấp Backend (Google Apps Script)

### a. Bổ sung trường dữ liệu

- **`gas/FirestoreRepository.gs`**:
    - Cập nhật các hàm `docToProject_`, `projectToDoc_`, `docToSession_`, `sessionToDoc_` để bao gồm các trường `totalSize` và `totalSizeSynced`.
    - Trong hàm `createProjectInDb`, khởi tạo `totalSize` với giá trị `0`.
- **`gas/SyncService.gs`**:
    - Trong hàm `syncSingleProject_`, tính toán và ghi nhận `totalSizeSynced` cho mỗi phiên.
    - Cập nhật `project.totalSize` sau mỗi lần đồng bộ thành công.
    - Thêm các hàm `createProject`, `updateProject` để xử lý `Partial<Project>` từ frontend, đảm bảo dữ liệu luôn hợp lệ trước khi lưu vào DB.

### b. Tạo `DashboardService.gs`

- Tạo file mới `gas/DashboardService.gs` để chứa logic tổng hợp dữ liệu cho Dashboard.
- Implement 4 hàm private tương ứng với 4 thành phần của Dashboard:
    - `getDashboardProjectSummary_()`
    - `getDashboardSyncProgress_()`
    - `getDashboardSyncChart_()`
    - `getDashboardRecentSyncs_()`
- Tạo một hàm public `getDashboardData()` để gom tất cả dữ liệu lại và trả về cho frontend trong một lần gọi duy nhất, giúp tối ưu hiệu suất.

## 3. Chuẩn hóa cấu trúc dữ liệu (Types)

- **`src/types/types.ts`**:
    - **Hợp nhất các kiểu**: Loại bỏ các kiểu dữ liệu cũ, không còn sử dụng (`DashboardStats`, `StorageChartData`) và định nghĩa một cấu trúc chuẩn, duy nhất cho Dashboard:
        - `SyncProgressStats`: Dùng chung cho thống kê "hôm nay" và "7 ngày".
        - `SyncChartData`: Dữ liệu cho biểu đồ.
        - `DashboardData`: Kiểu dữ liệu gốc, bao gồm tất cả dữ liệu cho trang Dashboard.
    - **Cập nhật Interface**: Thêm `totalSize` vào `Project` và `totalSizeSynced` vào `SyncSession`.

## 4. Cài đặt Dependencies & Cấu hình Frontend

- **Cài đặt thư viện**:
    - `npm install @tanstack/react-query`: Thêm thư viện React Query để quản lý việc lấy dữ liệu.
- **Thêm UI Components**:
    - Do dự án chưa được cấu hình `shadcn`, đã tiến hành:
        1.  Tạo file `components.json`.
        2.  Chạy lệnh `npx shadcn@latest add` để thêm các component cần thiết: `alert`, `skeleton`, `card`, `badge`.
- **Cập nhật Services**:
    - **`src/services/gasService.ts`**: Cập nhật lại dữ liệu mock cho hàm `getDashboardData` để khớp với cấu trúc `DashboardData` mới, đảm bảo môi trường dev local hoạt động chính xác.

## 5. Tích hợp Frontend (`DashboardPage.tsx`)

- **Thay thế Mock Data**:
    - Sử dụng hook `useQuery` từ React Query để gọi `gasService.getDashboardData`.
    - Thiết lập `staleTime` và `refetchInterval` để dữ liệu được cache và tự động làm mới sau mỗi 5 phút.
- **Xử lý trạng thái**:
    - Thêm component `DashboardSkeleton` để hiển thị khi dữ liệu đang được tải (`isLoading`).
    - Thêm component `Alert` để hiển thị thông báo lỗi chi tiết khi có vấn đề xảy ra (`isError`).
    - Hiển thị thông báo "Không có dữ liệu" khi API trả về rỗng.
- **Hiển thị dữ liệu**:
    - Cập nhật các `StatCard` để hiển thị dữ liệu từ `data.projectSummary` và `data.syncProgress`.
    - Sử dụng các hàm tiện ích `formatBytes` và `formatDuration` để định dạng lại dữ liệu cho dễ đọc.
    - Cấu hình `AreaChart` (từ `recharts`) để vẽ biểu đồ hiệu suất từ `data.syncChart`.
    - Hiển thị danh sách các phiên đồng bộ gần đây từ `data.recentSyncs`.

Sau khi hoàn thành các bước trên, trang Dashboard đã hoạt động hoàn chỉnh với dữ liệu thật, có khả năng xử lý các trạng thái tải, lỗi và tự động cập nhật.
