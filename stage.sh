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

echo "✅ Đã xong! Code đã được đẩy lên nhánh build. Bộ CI/CD sẽ tự động deploy lên Staging."
