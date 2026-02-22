---
Date: 2026-02-10
Projects:
  - Build
---

## 1. BỐI CẢNH & MỤC TIÊU

Công ty vận hành trên nền tảng Google Workspace, quản lý dữ liệu từ đối tác qua Google Drive.

- **Nguồn (Source):** Folder đối tác share link.
- **Đích (Destination):** Folder nội bộ công ty.
- **Mục tiêu:** Tự động hóa việc copy file mới dựa trên thời gian cập nhật, quản lý tập trung qua UI và thông báo qua Google Chat.

## 2. CHI TIẾT TECH STACK

### 2.1. Frontend (Management UI)

- **Framework:** React.js (phiên bản mới nhất)
- **UI Library:** [shadcn/ui](https://ui.shadcn.com/ "null") (Dựa trên Radix UI và Tailwind CSS cho các thành phần accessible, tái sử dụng cao).
- **Styling:** Tailwind CSS (đảm bảo Mobile Responsive & Dark mode ready).
- **Icons:** Lucide React.
- **Charts:** Recharts (vẽ biểu đồ hiệu suất phiên chạy và dung lượng).
- **State Management:** React Hooks (UseContext hoặc UseReducer cho global settings).
- **Communication:** `google.script.run` (để gọi hàm server-side từ UI)
- **View Modes:** Hỗ trợ chuyển đổi linh hoạt giữa dạng lưới (Card Grid) và dạng bảng (Detail List) cho danh sách dự án.
### 2.2. Backend & Engine (Execution Layer)

- **Runtime:** Google Apps Script (GAS).
- **Drive API:** Advanced Drive Service v3 (hiệu suất cao hơn DriveApp mặc định).
- **Auth:** OAuth2 (tận dụng quyền của user đang vận hành Web App).

### 2.3. Database & Storage (Persistence Layer)

- **Database:** Firebase Firestore.
- **Cấu hình:** Lưu trữ tại `/artifacts/{appId}/public/data/`.
- **Đặc điểm:** NoSQL, hỗ trợ Real-time listeners, hiệu năng truy vấn cao.
- **Cache & Heartbeat:** Google Apps Script `PropertiesService`.
- **Mục tiêu:** Lưu trữ trạng thái "Heartbeat" (tình trạng sức khỏe) của hệ thống mà không tiêu tốn quota ghi của Firestore.
- **Dữ liệu:** Lưu mốc thời gian cuối cùng hệ thống thực hiện kiểm tra (Check-in) cho từng dự án.

## 3. TIÊU CHUẨN KIẾN TRÚC (CLEAN ARCHITECTURE)

Yêu cầu mã nguồn phải tuân thủ việc tách biệt các lớp (Separation of Concerns):
### 3.1. Đối với Google Apps Script (Server-side)

Mặc dù môi trường GAS là các tệp phẳng, code phải được tổ chức theo module:

- **Repository Layer:** Chuyên trách giao tiếp với Firestore (CRUD cho Projects, Settings, Sessions).
- **Service Layer (Core Logic):** Chứa thuật toán Sync, xử lý đệ quy, logic kiểm tra thời gian (Cutoff) và xử lý lỗi.
- **API/Controller Layer:** Các hàm `doGet()` và các hàm public được gọi từ UI qua `google.script.run`.
- **Infrastructure Layer:** Các hàm tiện ích gửi Webhook Google Chat, xử lý Drive API.

### 3.2. Đối với React (Client-side)

- **Component-based:** Tách biệt UI thành các component nhỏ (ProjectCard, SettingForm, LogTable) sử dụng hệ thống shadcn/ui.
- **Service Pattern:** Tách các lệnh gọi `google.script.run` vào các file service riêng, không viết trực tiếp trong Component.

## 4. CƠ CHẾ & THUẬT TOÁN SYNC

### 4.0. Các thuộc tính của một dự án

Các thuộc tính người dùng thiết lập

- name: tên dự án, như hiện tại
- description: mô tả: như hiện tại
- status: trạng thái active hay không, như hiện tại
- syncStartDate: ngày bắt đầu đồng bộ, như hiện tại
- sourceFolderId và sourceFolderLink: link và Id của folder gốc, như hiện tại
- destFolderId và destFolderLink: link và Id của folder đích, như hiện tại

Những thuộc tính do hệ thống cập nhật như metadata trong quá trình sync

- isDeleted và deletedAt: như hiện tại
- createdAt và updatedAt: như hiện tại
- lastSyncTimestamp, lastSyncStatus: như hiện tại

### 4.1 Cơ chế ngừng tự động

Trong Settings, chúng ta setup thời gian run tối đa của một sync run. Nếu một sync run đi hết thời gian này, nó tự động ngắt.

**Cutoff logic:** Kiểm tra thời gian sau mỗi lần xử lý 1 file. Nếu `currentTime - startTime > sync_cutoff_seconds`, thực hiện ngắt an toàn (Safe Exit).
### 4.2. Sync Start Date (Ngày bắt đầu đồng bộ)

- Mỗi dự án có thuộc tính `syncStartDate`.
- **Mặc định:** Nếu `syncStartDate` không được thiết lập, coi như sync toàn bộ lịch sử.
### 4.3. Những cách khởi tạo tác vụ sync

Người dùng có thể chọn sync 1 dự án cụ thể bằng cách bấm nút Sync ở ngay dự án đó
Người dùng có thể chọn sync all bằng cách bấm bút Sync All ở trang dự án, ở trên cùng

Bên cạnh đó, tác vụ sync all này cũng có thể được cài đặt để tự động chạy.

### 4.4. Khái niệm sync run, sync session

Một lần sync được gọi là một sync run, có runid. 
Trong một sync run, có thể sync nhiều dự án.
Một lần sync dự án được gọi là một sync session.
Như vậy, mỗi sync run sẽ có nhiều sync session.

### 4.5. Các thuộc tính của một sync session

Một sync session sẽ có những thuộc tính sau, chúng ta sẽ cần ghi lại sau mỗi session

- projectId: như hiện tại
- projectName: như hiện tại
- runId: như hiện tại
- timestamp: như hiện tại, chính là thời gian bắt đầu sync session này
- filesCount: như hiện tại, tổng số file sync
- totalSizeSynced: như hiện tại, tổng dung lượng sync
- triggeredBy: như hiện tại, manually, hoặc nếu là tự động chạy thì là automatic
- executionDurationSeconds: như hiện tại, tổng thời lượng chạy

 Những thuộc tính cần thay đổi/bổ sung

- status: chúng ta cần có success, interrupted, và error (hoặc có một phần nhẹ hơn là warning như hiện tại)
- current: là status cập nhật cho hiện tại, current luôn bằng status lúc đầu. Nếu status (kết quả của lần chạy đầu tiên là interrupted hoặc error) thì theo thiết kế dưới đây, sync session này sẽ được cập nhật tiếp ở những lần sau. Chúng ta sẽ giữ status như ban đầu để biết rằng lúc đầu nó chạy bị error hoặc interrupted, nhưng current sẽ thay đổi.
- retryID: phần này chúng ta sẽ cần implement lại, đổi tên thành continueId
- lastSuccessSyncTimestamp: timestamp của sync session thành công gần nhất

success là khi sync session của dự án chạy hoàn tất và không có file nào bị lỗi
interrupted là khi sync session của dự án không bị lỗi nhưng được safe exit do time-out
error (hoặc warning khi có lỗi nhẹ hơn) là khi sync session của dự án gặp lỗi

Nếu người dùng bấm sync all, hoặc tác vụ sync all được tự động chạy, hệ thống sẽ chạy sync từng dự án.
###  4.6. Cơ chế sync một dự án

Dưới đây, chúng ta mô tả các bước sync một dự án
#### Bước 1: Tìm sync session gần nhất của dự án này và kiểm tra status của nó.

Thông tin sync session lần cuối, bao gồm timestamp và status của nó, có sẵn trong metadata của dự án, không cần query lại lịch sử. Tùy theo status của sync session cuối của dự án, chúng ta sẽ có cách xử lý khác nhau
#### Bước 2.1 Sync session cuối có status là success hoặc warning

Nếu là success thì chúng ta bắt đầu một sync session mới cho dự án này
- Lấy timestamp của lần sync session thành công cuối từ metadata của dự án (lastSuccessSyncTimestamp)
- Kiểm tra các file mới trong folder gốc đáp ứng tiêu chí query: `(modifiedTime > max(timestamp, syncStartDate) OR createdTime > max(timestamp, syncStartDate) AND 'source_id' in parents`.
- copy sang folder đích
- **Recursive Scan:** Duyệt từng tầng thư mục. Nếu thư mục con có file thay đổi, hệ thống tạo thư mục tương ứng tại Đích trước khi copy.
- Trong trường hợp trùng tên Không ghi đè (Overwrite) và Không xóa (Delete) file cũ. File mới sẽ được đổi tên kèm timestamp suffix để bảo tồn lịch sử. Định dạng đổi tên: `OriginalName_vYYMMDD_HHmm.ext` (Ví dụ: `BaoCao_v260214_1358.pdf`).

#### Bước 2.2 Sync session cuối có status là error, interrupted

Trong trường hợp này, sync session hiện tại cần phải là tiếp nối của những sync session bị lỗi hoặc bị ngắt.

Rất có thể, trước đó đã có vài sync session cho dự án này bị error hoặc interrupted.

- Đầu tiên, chúng ta sẽ tìm tất cả những sync session bị error hoặc interrupted trước đó mà current status của nó vẫn chưa là success (gọi là nhóm sync sessions cần hoàn tất)
- Lấy danh sách gồm những files đã sync thành công từ những sync sessions này. Chúng ta cần lấy thông tin, tên file, modifiedDate, createdDate và những thông tin khác có trong document của fileLogs hiện tại
- Lấy timestamp của lần sync session thành công cuối từ metadata của dự án (lastSuccessSyncTimestamp)
- Kiểm tra những files trong folder gốc, mà có `modifiedDate > max(timestamp, syncStartDate) OR  createdDate > max(timestamp, syncStartDate)`
- Kiểm tra xem file này có trong danh sách những files đã sync thành công hay không
- Nếu không có, thì copy file mới này
- Nếu có, chúng ta cần kiểm tra tiếp, modifiedDate của file này có >  modifiedDate mà chúng ta ghi trong fileLogs của file này.
	- Nếu >, có nghĩa là file này tuy đã được copy về folder gốc, nhưng đã được modified sau đó, do đó chúng ta vẫn cần copy, nhưng theo cơ chế trùng tên như mô tả ở phần trên.
	- Nếu <= có nghĩa là file này đã được copy thành công, chúng ta bỏ qua file này
- Sau khi hoàn tất, chúng ta sẽ cần cập nhật field continueId của session bị error/interrupted gần nhất, cái runId của session mới. Chúng ta chỉ cập nhật continuedId của session bị error/interrupted gần nhất, vì những session error/interrupted trước đó(nếu có) đã có continuedId rồi.
- Chúng ta sẽ cần cập nhật status của sync session hiện tại vào cột current nhóm sync sesions cần hoàn tất.
- Như vậy, nếu status của sync session hiện tại là success, thì current của nó là success và current của tất cả các sync sessions trong nhóm cần hoàn tất cũng là success.

#### Bước 3: Cập nhật dự án

Sau mỗi sync session, chúng ta cần cập nhật meta data của dự án.

Như hiện tại là OK, chỉ có duy nhất cái lastSyncTimestamp phải lấy cái timestamp của sync session, không phải như hiện tại là thời điểm kết thúc tác vụ sync.

### 4.7. Cơ chế Continue

Cơ chế retry hiện tại chúng ta sẽ thay đổi tên cho đúng bản chất và mở rộng một chút về cơ chế

Thứ nhất, đổi tên thành continueSync, vì chúng ta sẽ xử lý như nhau với cả 2 trường hợp error và interrupted, theo cách thức như trên. Nút Retry ở ngoài UI đổi tên thành Continue. Về bản chất, tác vụ continueSync này chính là tác vụ sync trong trường hợp error hoặc interrupted đã mô tả ở trên.

Thứ hai, tác vụ continueSync này sẽ được thực hiện trong những trường hợp sau

- Người dùng bấm nút Continue trong bảng Sync Log, tương tự như retry hiện tại.
- Người dùng bấm nút Sync ở dự án
- Người dùng bấm Sync All, thì đến sesion của dự án mà session gần nhất bị error hoặc interrupted.

### 4.8. Cơ chế logging

Chúng ta cần ghi lại log mỗi sync session với các thuộc tính như được mô tả
Cơ chế syncSessions trong hệ thống hiện tại là OK

Bên cạnh đó, chúng ta cần lưu lại fileLogs như hiện tại là OK

### 4.9. Cơ chế sync nhiều dự án

Bổ sung nút Sync All trên màn hình dự án..

Khi user bấm Sync All chúng ta sẽ cần sync nhiều dự án. Thực hiện như sau

Bắt đầu từ những dự án mà lastSyncStatus là interrupted, và trong số đó, bắt đầu từ những dự án mà có lastSyncTimestamp sớm nhất

Sau đó, đợt 2, mới đến những dự án mà lastSyncStatus là success hoặc warning, và trong số đó, bắt đầu từ những dự án có lastSyncTimestamp sớm nhất.

### 4.10. Sync định kỳ

Trong phần settings chúng ta đã có thời gian định kỳ. 

Cái này bằng phút, mà hãy ép buộc nó phải ít nhất là 5 phút

Định kỳ này, chúng ta sẽ chạy sync all theo cơ chế được mô tả ở phần trước

### 4.11. Sync All vs. Scheduled Sync

Trong settings, chúng ta có thiết lập lịch định kỳ chạy sync tất cả các dự án. Đồng thời chúng ta cũng có một thiết lập, có enable việc sync định kỳ hay không.

Tuy nhiên, việc Sync All cũng có thể được bắt đầu từ chính user. Ở màn hình các dự án, user có thể nhấn nút Sync All để chạy sync tất cả các dự án.

Để đảm bảo không bị conflict giữa sync định kỳ và sync từ user, bất kể khi user bấm Sync All, hoặc Sync một dự án, thì việc settings sync định kỳ phải được disable. 

Khi user bấm nút sync một dự án hoặc Sync All, hệ thống phải bật lên cửa sổ thông báo "Khi chủ động sync ở đây, lịch sync định kỳ sẽ tắt. Nếu bạn muốn bật lại sync định kỳ, hãy bật lại trong Settings. Nhấn OK để tiếp tục"

User có thể bấm OK để tiếp tục sync hoặc Cancel để hủy việc sync.

Nếu user bấm OK

- Đầu tiên, tắt option sync định kỳ (và do đó, sẽ là xóa các trigger)
- Tiến hành tác vụ sync theo dự án hoặc sync all


## 5. Những cơ chế theo dõi

### 5.1. Sync Session (Firestore - Meaningful Events)  

Lưu vết khi có sự thay đổi thực tế: `id`, `project_id`, `run_id`, `timestamp`, `execution_duration_seconds`, `status` (Success/Interrupted/Error), `files_count`.

### 5.2. Heartbeat (PropertiesService - Health Check)

- Lưu vết mọi lần chạy kể cả không có file: `last_check_timestamp`, `last_status`.
- **Mục đích:** Đảm bảo UI hiển thị trạng thái "Vừa kiểm tra" mà không tốn Quota Write Firestore.

### 5.3. File Log (Child)

- `file_name`, `source_link`, `dest_link`, `source_path`, `created_date`, `modified_date`.

## 6. CÁC YÊU CẦU KỸ THUẬT KHÁC (TECHNICAL REQUIREMENTS)

### 6.1. Độ tin cậy (Resilience)

- **Error Handling:** Sử dụng `try-catch` bọc ngoài mỗi dự án. Lỗi của một dự án không được làm chết toàn bộ tiến trình chạy của các dự án khác trong hàng đợi.
- **Retry Logic:**
- Áp dụng cho các lệnh gọi Drive API nếu gặp lỗi 429 (Too many requests).
- Áp dụng `exponentialBackoff` cho `firestoreRequest_` để xử lý giới hạn băng thông và lỗi tạm thời của Firebase REST API

### 6.2. Hiệu năng (Performance)

- **Batching:** Hạn chế ghi vào Firestore từng dòng một. Gom log file vào mảng và ghi theo Batch sau khi hoàn thành mỗi dự án.
- **Tối ưu:** Sử dụng `BATCH_SIZE` lên đến 450-500 items/request để tối ưu hóa quota `UrlFetchApp`.
- **Query Optimization:** Chỉ lấy các trường (fields) cần thiết từ Drive API để giảm payload (ví dụ: `id, name, mimeType, modifiedTime`).
- **REST API Correction:** Đảm bảo các lệnh `:runQuery` và `:batchWrite` sử dụng phương thức `POST` theo chuẩn Firestore REST API.
### 6.3. Bảo mật (Security)

- **Principle of Least Privilege:** Script chỉ yêu cầu các Scope cần thiết (`drive.file`, `forms`, `script.external_request`).
- **Data Validation:** UI phải validate định dạng Link/ID folder trước khi lưu xuống Database.
### 6.4. Quản lý xóa dự án (Soft Delete)

**Cơ chế:**
- Sử dụng field `isDeleted` (boolean) riêng biệt, tách biệt với `status`.
- `deleteProject` API thực hiện chuyển `isDeleted` = `true` và lưu `deletedAt`.
- `getAllProjects` mặc định lọc bỏ các dự án có `isDeleted` = `true`

**Mục đích:**
- Tránh lỗi Timeout của Google Apps Script khi phải xóa lượng lớn Sync Logs liên quan (Hard Delete).
- Bảo toàn lịch sử đồng bộ (Audit Trail) để đối soát sau này.
- Dễ dàng khôi phục dự án nếu xóa nhầm (chỉ cần set `isDeleted` = `false`).

### 6.5. Khả năng bảo trì (Maintainability)

- **Code Style:** Đặt tên biến/hàm theo kiểu camelCase, có comment giải thích cho các logic phức tạp.
- **Documentation:** Luôn cập nhật SSoT (Single Source of Truth) này khi có thay đổi về logic.

## 7. BÁO CÁO & THÔNG BÁO

- **Webhook Integration:** Gửi thông báo JSON tới Google Chat Webhook.
- **Executive Dashboard:** Tích hợp trực tiếp vào UI React, lấy dữ liệu từ Firestore để vẽ biểu đồ thống kê.
- 
## 8. DASHBOARD

Chi tiết trong [Dashboard Trae](./dashboard_trae.md)
Dashboard mang lại một overview để kiểm soát quá trình.

Để đảm bảo tính scaling, cần thiết kế để dashboard được lắp ghép từ nhiều component tính toán, thống kê. Trong phần này sẽ liệt kê ra một số component quan trọng đầu tiên. Trong tương lai, chúng ta có thể bổ sung

### Tổng số dự án

Card này thể hiện tổng số dự án, và bao nhiêu dự án đang bật sync
### Tiến độ sync

Card này thể hiện

- Số file và dung lượng được sync hôm nay
- Số file và dung lượng được sync trong 7 ngày qua
- Số dự án được sync trong hôm nay
- Số dự án được sync trong 7 ngày qua
- Tổng thời lượng sync hôm nay
- Tổng thời lượng sync trong 7 ngày qua
- Số phiên sync hôm nay
- Số phiên sync trong 7 ngày qua
### Biểu đồ sync

Card này vẽ một cái biểu đồ line, thể hiện timeline trong 10 ngày vừa qua, biểu diễn mỗi ngày sync bao nhiêu file và bao nhiêu thời gian
### Dự án sync gần đây

Card này thể hiện từng dòng, mỗi dòng là một dự án được đồng bộ gần đây, với tên dự án, thời gian, và status thành công hay thất bại hay lỗi.
Lưu ý rằng, một phiên đồng bộ có thể sync nhiều dự án. Chúng ta biểu diễn một dự án một dòng.
## 9. Sync Logs

Giao diện này thể hiện danh sách các dự án được sync.
Lưu ý rằng, một sync session sẽ có thể cover nhiều dự án. Nhưng khi thể hiện, chúng ta thể hiện theo các dự án

Chúng ta sắp xếp theo thời gian chạy, cái gần nhất để trên cùng

Ở thanh ngang đầu tiên chúng ta cho phép tìm kiếm nhanh theo tên dự án hoặc runid
Item thứ hai là theo trạng thái (như hiện tại đang implement)

Phần thứ ba là một dãy các ô chọn 1 ngày, 3 ngày, 7 ngày, 10 ngày, tất cả (để thể hiện những session chạy trong khoảng thời gian 1, 3, 7, 10 ngày gần nhất hoặc tất cả). mặc định là 1 ngày, và mặc định là chỉ load cái 1 ngày. User sẽ có thể chọn cái khác

Mỗi lần thay đổi các filter này, các số thống kê ở trên (số phiên, số lượng file đã sync, tổng dung lượng đã sync, thời gian tủng bình phải được cập nhật tương ứng)
Bảng log sẽ gồm 2 phần (như hiện tại đang implement): phần trên là theo các dự án, phần dưới là chi tiết, khi bấm vào một dự án sẽ thể hiện chi tiết log của dự án đó trong session đó

- Tên dự án
- Run ID - đây chính là sync session
- Thời gian chạy
- **Files Synced** - (Cập nhật) Số file sync thành công.
- **Errors** - (Mới) Số file sync thất bại.
- Dung lượng được copy
- Tổng thời gian
- Trạng thái

Khi chúng ta bấm vào mỗi dự án, ở bảng bên dưới sẽ thể hiện chi tiết từng file được sync của dự án đó, trong session đó với các thông tin sau

- Tên file
- Dung lượng
- Folder gốc
- Trạng thái (Success/Error)


## 10. TO-DO

// TODO

Xem xét lại vấn đề heartbeat của project khi lưu vào PropertiesService
Chuẩn hóa thông báo notification vào Webhook

