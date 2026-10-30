@echo off
chcp 65001 >nul
title Yadakyar Store - Start
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [خطا] Node.js روي اين كامپيوتر نصب نيست.
  echo  [Error] Node.js is not installed on this computer.
  echo.
  echo  لطفاً Node.js را از آدرس زير نصب کنيد و دوباره اين فايل را اجرا کنيد:
  echo  Please install Node.js from the link below, then run this file again:
  echo.
  echo        https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo.
echo  در حال راه‌اندازي فروشگاه یدک‌یار ...
echo  Starting Yadakyar store ...
echo.

node scripts\launch.js

echo.
echo  براي بستن اين پنجره يک کليد را بزنيد / press any key to close.
pause >nul
