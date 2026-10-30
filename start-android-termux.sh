#!/data/data/com.termux/files/usr/bin/bash
# ---------------------------------------------------------------
# یدک‌یار — لانچر اندروید (Termux) / Android (Termux) launcher
#
# نصب: ابتدا Termux را از F-Droid نصب کنید، سپس پروژه را داخل گوشی
# کپی/استخراج کنید و اجرا کنید:
#   bash start-android-termux.sh
# ---------------------------------------------------------------
cd "$(dirname "$0")"

echo ""
echo "  بررسی Node.js ..."
echo "  Checking Node.js ..."

if ! command -v node >/dev/null 2>&1; then
  echo "  … Node.js نصب نیست، در حال نصب (pkg install nodejs -y)"
  pkg update -y >/dev/null 2>&1 || true
  pkg install nodejs -y
fi

if ! command -v node >/dev/null 2>&1; then
  echo "  [خطا] نصب Node.js انجام نشد. دستور زیر را دستی اجرا کنید:"
  echo "        pkg install nodejs -y"
  echo "  [Error] Node.js installation failed. Please run: pkg install nodejs -y"
  exit 1
fi

echo "  Node.js: $(node -v)"
echo ""
echo "  در حال راه‌اندازی فروشگاه یدک‌یار در پس‌زمینه ..."
echo "  Starting Yadakyar store in the background ..."
echo ""

# همه مراحل (نصب، ساخت دیتابیس، اجرا، باز کردن مرورگر) در launch.js انجام می‌شود
node scripts/launch.js --background

echo "  ─────────────────────────────────────────────"
echo "  برای توقف سرور:"
echo "      kill \$(cat data/server.pid)"
echo ""
echo "  To stop the server: kill \$(cat data/server.pid)"
echo "  ─────────────────────────────────────────────"
