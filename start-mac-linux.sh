#!/usr/bin/env bash
# ---------------------------------------------------------------
# یدک‌یار — لانچر مک و لینوکس / One-click launcher for macOS & Linux
# اجرا:  bash start-mac-linux.sh      (یا ابتدا chmod +x start-mac-linux.sh)
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  [خطا] Node.js روی این سیستم نصب نیست."
  echo "  [Error] Node.js is not installed on this computer."
  echo ""
  echo "  لطفاً Node.js (نسخه 22.13 یا جدیدتر) را از آدرس زیر نصب کنید:"
  echo "  Please install Node.js 22.13 or newer from:"
  echo ""
  echo "        https://nodejs.org"
  echo ""
  exit 1
fi

echo ""
echo "  در حال راه‌اندازی فروشگاه یدک‌یار ..."
echo "  Starting Yadakyar store ..."
echo ""

exec node scripts/launch.js
