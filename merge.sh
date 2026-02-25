#!/bin/bash

# 1. Kiểm tra branch hiện tại
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "build" ]; then
  echo "❌ Lỗi: Bạn phải đang ở nhánh 'build' để thực hiện merge sang master!"
  exit 1
fi

# 2. Kiểm tra trạng thái file (có thay đổi chưa commit không)
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Lỗi: Bạn có thay đổi chưa commit trong nhánh build."
  echo "Vui lòng chạy ./stage.sh để commit và push trước khi merge sang master."
  exit 1
fi

# 3. Kiểm tra xem đã push hết commit lên origin/build chưa
# Lệnh này kiểm tra sự khác biệt giữa local build và origin/build
UNPUSHED=$(git log origin/build..build)
if [ -n "$UNPUSHED" ]; then
  echo "❌ Lỗi: Bạn có commit ở local chưa push lên origin/build."
  echo "Hãy chạy ./stage.sh trước để đảm bảo Staging đã nhận code mới nhất và chạy ổn định."
  exit 1
fi

echo "✅ Nhánh build đã sẵn sàng để merge sang master."
echo "🔄 Bắt đầu quá trình merge sang PRODUCTION..."

# 4. Chuyển sang master và merge
git checkout master
git pull origin master  # Đảm bảo master ở local là mới nhất

echo "🔀 Đang merge build vào master..."
git merge build

# 5. Push lên production
echo "📤 Đang đẩy code lên nhánh master (Production)..."
git push origin master

# 6. Quay lại nhánh build
echo "🔙 Quay lại nhánh build..."
git checkout build

echo "✨ Chúc mừng! Code đã được đẩy lên Production thành công."
