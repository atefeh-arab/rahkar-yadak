#!/usr/bin/env bash
# ---------------------------------------------------------------
# یدک‌یار — لانچر دابل‌کلیک مک / Double-click launcher for macOS
# کافی است این فایل را دابل‌کلیک کنید (در صورت نیاز: chmod +x start-mac.command)
# ---------------------------------------------------------------
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  [خطا] Node.js نصب نیست. لطفاً از https://nodejs.org نصب کنید."
  echo "  [Error] Node.js is not installed. Please install it from https://nodejs.org"
  echo ""
  read -r -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "  در حال راه‌اندازی فروشگاه یدک‌یار ..."
echo "  Starting Yadakyar store ..."
echo ""

node scripts/launch.js

echo ""
read -r -p "Press Enter to close..."
