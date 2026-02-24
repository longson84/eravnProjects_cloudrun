#!/bin/bash

# Kiểm tra nếu người dùng không nhập message
if [ -z "$1" ]
then
  echo "Lỗi: Bạn phải nhập commit message!"
  echo "Sử dụng: ./publish.sh \"tin nhắn của bạn\""
  exit 1
fi

MESSAGE=$1

echo "🚀 Bắt đầu quá trình publish..."

# 1. Add và Commit ở nhánh hiện tại (giả sử là build)
git add .
git commit -m "$MESSAGE"

# 2. Push nhánh build lên origin
git push origin build

# 3. Chuyển sang master, merge và push
echo "🔄 Đang chuyển sang master để merge..."
git checkout master
git merge build
git push origin master

# 4. Quay lại nhánh build để làm tiếp
echo "🔙 Quay lại nhánh build..."
git checkout build

echo "✅ Đã xong! Mọi thứ đã được đẩy lên cả build và master."
