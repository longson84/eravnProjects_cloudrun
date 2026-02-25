#!/bin/bash

# 1. Kiểm tra branch hiện tại
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "build" ]; then
  echo "❌ Lỗi: Bạn đang ở nhánh '$CURRENT_BRANCH'. Script này chỉ được chạy trên nhánh 'build'!"
  exit 1
fi

# 2. Kiểm tra commit message
if [ -z "$1" ]
then
  echo "❌ Lỗi: Bạn phải nhập commit message!"
  echo "Sử dụng: ./stage.sh \"tin nhắn của bạn\""
  exit 1
fi

MESSAGE=$1

echo "🚀 Bắt đầu quá trình đẩy code lên STAGING (build)..."

# 3. Add và Commit
git add .
# Kiểm tra xem có gì để commit không trước khi ra lệnh commit
if git diff-index --quiet HEAD --; then
    echo "📝 Không có thay đổi nào mới để commit."
else
    git commit -m "$MESSAGE"
fi

# 4. Push lên origin build
echo "📤 Đang push lên nhánh build..."
git push origin build

echo "✅ Đã xong! Code đã được đẩy lên nhánh build."
echo ""
echo "--------------------------------------------------"
echo "🚀 CHI TIẾT LINK STAGING"
echo ""
echo "🔹 Backend (Staging): https://eravn-backend-staging-166671254430.asia-southeast1.run.app"

# Tự động lấy URL từ Firebase Hosting
echo "🔍 Đang lấy link Frontend Staging..."

# Thử lấy link (bỏ --project để dùng mặc định từ .firebaserc, bỏ npx nếu chậm)
# Tìm channel có name là 'staging' trong JSON output
PREVIEW_URL=$(npx firebase hosting:channel:list --json 2>/dev/null | grep -A 5 '"staging"' | grep '"url":' | cut -d'"' -f4 | head -n 1)

if [ -z "$PREVIEW_URL" ]; then
    echo "🔹 Frontend (Staging): Không tự động lấy được link."
    echo "👉 Bạn có thể chạy lệnh này để xem link: npx firebase hosting:channel:list"
else
    echo "🔹 Frontend (Staging): $PREVIEW_URL"
fi
echo "--------------------------------------------------"
echo "Lưu ý: Sau khi push, bộ CI/CD sẽ mất khoảng 1-2 phút để cập nhật code mới."
