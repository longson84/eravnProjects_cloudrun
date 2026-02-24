#!/bin/sh
# ==========================================
# Unified Entrypoint cho Service và Job
# ==========================================
# Điều khiển bởi biến RUN_MODE:
#   - RUN_MODE=job  → chạy sync rồi thoát
#   - Mặc định      → chạy Express server
# ==========================================

if [ "$RUN_MODE" = "job" ]; then
  echo "🔧 Starting in JOB mode..."
  exec node dist/job.js
else
  echo "🌐 Starting in SERVICE mode..."
  exec node dist/app.js
fi
