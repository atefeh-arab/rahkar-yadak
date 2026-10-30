<p dir="rtl" align="center">
  <img src="public/images/logo.svg" width="220" alt="یدک‌یار">
</p>

<h1 align="center">یدک‌یار — فروشگاه اینترنتی قطعات یدکی خودرو</h1>

<p dir="rtl" align="center">
  فروشگاه کامل و آماده‌ی فروش با Node.js + Express + SQLite + EJS<br>
  رابط کاملاً فارسی و راست‌چین، طراحی سفید و قرمز، واکنش‌گرا و بدون مرحله build
</p>

<p align="center">
  <a href="#راه‌اندازی-یک‌کلیکی">راه‌اندازی یک‌کلیکی</a> •
  <a href="#امکانات">امکانات</a> •
  <a href="#پنل-مدیریت">پنل مدیریت</a> •
  <a href="#english">English</a>
</p>

---

## 📸 اسکرین‌شات‌ها

> اسکرین‌شات‌های صفحه اصلی، فهرست کالاها و پنل مدیریت را اینجا قرار دهید:

| صفحه اصلی | فهرست کالاها | پنل مدیریت |
|---|---|---|
| `docs/screenshots/home.png` | `docs/screenshots/products.png` | `docs/screenshots/admin.png` |

---

## ⚙️ پشته فناوری (Tech Stack)

| لایه | فناوری |
|---|---|
| سرور | Node.js 22.13+ و Express 4 |
| قالب‌ها | EJS (Server-Side Rendering) |
| پایگاه داده | **`node:sqlite`** — ماژول داخلی Node.js، بدون هیچ کامپایل بومی |
| نشست | express-session + استور SQLite اختصاصی |
| رمز عبور | bcryptjs (خالص جاوااسکریپت) |
| آپلود | multer (فقط تصویر، حداکثر ۲ مگابایت) |
| امنیت | helmet، CSRF، rate-limit روی ورود، پرس‌وجوهای پارامتری |
| استایل | CSS دستی (`public/css/style.css`) + فونت **وزیرمتن** داخل پروژه |

> **چرا `node:sqlite`؟** درایورهایی مثل `better-sqlite3` یا `sqlite3` باید روی هر سیستم از نو کامپایل شوند و روی ویندوز (بدون Visual Studio) و اندروید/Termux معمولاً شکست می‌خورند. ماژول داخلی `node:sqlite` از Node نسخه ۲۲٫۱۳ به بعد وجود دارد، هیچ نصب اضافه‌ای ندارد و روی ویندوز، مک، لینوکس و ترمکس یکسان کار می‌کند. اگر مجبور شدید از `better-sqlite3` استفاده کنید، کافی است `models/db.js` را با رابط `DatabaseSync` آن بازنویسی کنید؛ بقیه کد فقط از `get/all/run` همان فایل استفاده می‌کند.

---

## 🚀 راه‌اندازی یک‌کلیکی (How to run with one click)

### ویندوز 🪟
1. پروژه را unzip کنید.
2. روی **`start-windows.bat`** دابل‌کلیک کنید.
3. اگر Node.js نصب نباشد، پنجره‌ای با لینک دانلود (`https://nodejs.org`) باز می‌شود.
4. لانچر به‌صورت خودکار `npm install`، ساخت دیتابیس نمونه و اجرای سرور را انجام می‌دهد و مرورگر را روی `http://localhost:3000` باز می‌کند.
5. پنجره را باز نگه دارید تا سایت روشن بماند؛ نوشته‌ی *«Site is running. Close this window to stop.»* یعنی همه‌چیز راه است.

### مک و لینوکس 🐧
```bash
chmod +x start-mac-linux.sh   # یک بار
./start-mac-linux.sh
```
کاربران مک می‌توانند **`start-mac.command`** را دابل‌کلیک کنند.

### اندروید (Termux) 📱
1. اپلیکیشن **Termux** را از **F-Droid** نصب کنید (نسخه Play Store قدیمی است).
2. پروژه را داخل حافظه گوشی کپی یا استخراج کنید.
3. در ترمکس:
```bash
cd /sdcard/Download/rahkar-yadak
bash start-android-termux.sh
```
اسکریپت در صورت نیاز Node.js را با `pkg install nodejs -y` نصب می‌کند، دیتابیس را می‌سازد، سرور را **در پس‌زمینه** اجرا می‌کند و مرورگر گوشی را روی `http://localhost:3000` باز می‌کند.

برای توقف سرور:
```bash
kill $(cat data/server.pid)
```

### آیفون / iOS 🍎
iOS اجازه اجرای سرور Node.js را ندارد؛ راه‌حل، انتشار پروژه روی یک میزبان رایگان است (بخش بعدی).

### انتشار رایگان روی Render 🌥
1. پروژه را در یک مخزن GitHub آپلود کنید.
2. در [render.com](https://render.com) ثبت‌نام کنید و گزینه **New → Web Service** را بزنید.
3. مخزن GitHub را انتخاب کنید و این تنظیمات را وارد کنید:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run seed`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. متغیرهای محیطی (Environment) را اضافه کنید:
   ```
   SESSION_SECRET=یک رشته تصادفی بلند
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=یک رمز قوی
   ```
5. پس از deploy، لینک `https://<نام-سرویس>.onrender.com` آماده است.

> نکته: نمونه Free روی Render پس از ۱۵ دقیقه بی‌کاری به حالت sleep می‌رود و با اولین درخواست برمی‌گردد.

### انتشار روی Railway 🚂
1. در [railway.app](https://railway.app) با GitHub وارد شوید → **New Project → Deploy from GitHub repo**.
2. پروژه را انتخاب کنید؛ Railway خودش `npm install` را اجرا می‌کند.
3. در بخش **Settings → Build Command** بگذارید: `npm install && npm run seed` و در **Start Command**: `npm start`
4. از تب **Settings → Networking** دامنه عمومی (Public Domain) بگیرید.

### 🔌 سایت من روی گوشی/کامپیوتر دیگر باز نمی‌شود؟
- `localhost` یعنی سایت روی **همان دستگاهی** اجرا شده که سرور را روشن کرده است؛ گوشی با `localhost` به کامپیوتر شما وصل نمی‌شود.
- برای دسترسی از گوشی در همان شبکه وای‌فای، سرور روی `0.0.0.0` اجرا می‌شود و هنگام بالا آمدن **آدرس شبکه** را چاپ می‌کند، مثلاً:
  ```
  Network :  http://192.168.1.15:3000
  ```
  همان آدرس را در مرورگر گوشی باز کنید (به شرطی که گوشی و کامپیوتر به یک وای‌فای وصل باشند و فایروال اجازه دهد).
- اگر پورت ۳۰۰۰ اشغال باشد، سرور خودش پورت بعدی را امتحان و پیام «پورت اشغال است» را نمایش می‌دهد.

---

## 🖥 اجرای دستی (Manual install)

```bash
npm install        # نصب وابستگی‌ها (بدون کامپایل بومی)
npm run seed       # ساخت دیتابیس نمونه + ۵۳ کالا
npm start          # اجرای سرور روی http://localhost:3000
```

اسکریپت‌های `package.json`:

| دستور | کار |
|---|---|
| `npm start` | اجرای سرور |
| `npm run dev` | اجرای سرور با nodemon (تغییر خودکار) |
| `npm run seed` | ساخت/کامل‌کردن دیتابیس نمونه |
| `npm run launch` | راه‌اندازی یک‌کلیکی (نصب + seed + اجرا + باز کردن مرورگر) |

اگر فایل `.env` وجود نداشته باشد، برنامه در اولین اجرا آن را از `.env.example` می‌سازد و `SESSION_SECRET` را تصادفی تولید می‌کند.

---

## 🔐 اطلاعات ورود پیش‌فرض

| نقش | نام کاربری | رمز عبور |
|---|---|---|
| مدیر پنل | `admin` | `Admin12345!` |
| مشتری نمونه | `customer@example.com` | `Customer123!` |

> پنل مدیریت: `http://localhost:3000/admin`
> **حتماً قبل از انتشار، رمز مدیر و `SESSION_SECRET` را در `.env` عوض کنید.**

---

## ✨ امکانات

**فروشگاه (مشتری)**
- صفحه اصلی: نوار بالا، لوگو، جست‌وجوی زنده، آیکن سبد و ورود، منوی دسته‌ها، اسلایدر بنر، پرفروش‌ترین‌ها، تازه‌رسیده‌ها، تخفیف‌دارها و ردیف برندهای خودرو
- فیلتر حرفه‌ای قطعات: **برند خودرو، مدل، سال تولید، دسته‌بندی قطعه، محدوده قیمت، موجودی و برند قطعه**
- مرتب‌سازی: جدیدترین، پرفروش‌ترین، ارزان‌ترین، گران‌ترین، بیشترین تخفیف + صفحه‌بندی
- صفحه کالا: گالری تصویر، برند و کد فنی (OEM)، قیمت و تخفیف، موجودی، **فهرست خودروهای سازگار**، جدول مشخصات فنی، توضیحات و کالاهای مرتبط
- جست‌وجوی زنده با پیشنهادهای AJAX (`/api/search`) و صفحه نتایج
- سبد خرید: نشست برای مهمان، ذخیره در دیتابیس برای کاربر، تغییر تعداد و حذف
- حساب کاربری: ثبت‌نام، ورود، پروفایل، مدیریت نشانی‌ها، تاریخچه سفارش‌ها
- تسویه: نشانی، روش ارسال، **پرداخت در محل** یا **درگاه نمایشی (بدون تراکنش واقعی)**، کد رهگیری و پیگیری سفارش
- صفحات ثابت: درباره ما، تماس، پرسش‌های متداول، شرایط استفاده، شرایط بازگشت کالا

**پنل مدیریت (`/admin`)**
- داشبورد: تعداد سفارش‌ها، فروش امروز، تعداد کالاها، هشدار کم‌موجودی و آخرین سفارش‌ها
- مدیریت کالاها: افزودن/ویرایش/حذف، آپلود چند تصویر، قیمت، تخفیف، موجودی، کد OEM، برند، دسته، خودروهای سازگار و مشخصات فنی
- دسته‌بندی‌ها و خودروها (برند/مدل): CRUD کامل
- سفارش‌ها: فهرست، جزئیات و تغییر وضعیت (در انتظار، در حال پردازش، ارسال شده، تحویل شده، لغو شده)
- مشتریان و تنظیمات فروشگاه (نام، تلفن، نشانی، هزینه ارسال)
- همه تاریخ‌ها به **تقویم شمسی** نمایش داده می‌شوند

**داده‌های نمونه**
- ۱۰ دسته‌بندی، ۸ برند خودرو با ۲۵ مدل، **۵۳ کالا** با قیمت، تخفیف، کد فنی و موجودی
- تصاویر SVG قرمز/سفید تولیدشده در `public/images/products/`
- ۴ سفارش نمونه در وضعیت‌های مختلف

---

## 🗂 ساختار پروژه

```
rahkar-yadak/
├── app.js                 # سرور: امنیت، نشست، متغیرهای مشترک، مسیرها، ۴۰۴/۵۰۰
├── package.json           # اسکریپت‌ها: start / dev / seed / launch
├── .env.example           # الگوی تنظیمات (در اولین اجرا کپی می‌شود)
├── start-windows.bat      # لانچر ویندوز
├── start-mac-linux.sh     # لانچر مک/لینوکس
├── start-mac.command      # لانچر دابل‌کلیک مک
├── start-android-termux.sh# لانچر اندروید (ترمکس)
├── config/
│   └── env.js             # ساخت خودکار .env با SESSION_SECRET تصادفی
├── controllers/           # منطق صفحات
│   ├── shop.js            # خانه، فیلترها، صفحه کالا، جست‌وجو، صفحات ثابت
│   ├── auth.js            # ورود/ثبت‌نام/پروفایل/نشانی/سفارش‌ها
│   ├── cart.js            # سبد خرید
│   ├── checkout.js        # تسویه، درگاه نمایشی، تأیید سفارش
│   └── admin.js           # پنل مدیریت
├── routes/                # تعریف مسیرها (shop, auth, cart, checkout, admin)
├── models/
│   ├── db.js              # اتصال node:sqlite + جدول‌ها + کمک‌تابع‌ها
│   └── session-store.js   # استور نشست روی SQLite
├── lib/
│   ├── format.js          # قیمت، ارقام فارسی، تاریخ شمسی، اسلاگ
│   ├── cart.js            # منطق سبد خرید (نشست/دیتابیس)
│   └── content.js         # متن صفحات ثابت
├── scripts/
│   ├── seed.js            # داده‌های نمونه + تصاویر SVG
│   └── launch.js          # راه‌انداز یک‌کلیکی
├── views/                 # قالب‌های EJS
│   ├── partials/          # head, foot, card
│   └── admin/             # قالب‌های پنل مدیریت
├── public/
│   ├── css/               # style.css و admin.css
│   ├── js/                # store.js و admin.js (بدون وابستگی)
│   ├── fonts/             # فونت وزیرمتن (bundled)
│   └── images/            # لوگو، فاوآیکون، برندها، تصاویر محصولات
├── uploads/               # تصاویر آپلودی از پنل مدیریت
└── data/                  # فایل دیتابیس و لاگ سرور (در git نیست)
```

---

## ➕ افزودن محصول از پنل مدیریت

1. به `http://localhost:3000/admin` بروید و با `admin` / `Admin12345!` وارد شوید.
2. از منوی کناری **کالاها → + افزودن کالا** را بزنید.
3. فیلدها را پر کنید:
   - **نام کالا** (الزامی)، **دسته‌بندی**، **برند قطعه**، **کد فنی (OEM)**
   - **قیمت** به تومان، **مبلغ تخفیف** و **موجودی انبار**
   - **توضیحات** و **مشخصات فنی** (با دکمه «+ افزودن مشخصه» چند ردیف بسازید)
   - **خودروهای سازگار**: برند و مدل خودرو و بازه سال شمسی را انتخاب کنید
   - **تصاویر**: تا ۵ تصویر (PNG/JPG/WebP/SVG تا ۲ مگابایت)
4. **افزودن کالا** را بزنید؛ کالا بلافاصله در فروشگاه نمایش داده می‌شود.
5. برای ویرایش، از فهرست کالاها دکمه **ویرایش** و برای حذف، دکمه **حذف** را بزنید.

---

## 📄 لایسنس

MIT — جزئیات در فایل [LICENSE](LICENSE).

---
---

# English

**Yadakyar** is a complete, ready-to-sell **auto parts e-commerce store** built with Node.js, Express, SQLite and EJS. Fully Persian/RTL UI, white + red theme, mobile-first, no build step.

## Quick start (one click)

| Platform | What to do |
|---|---|
| **Windows** | Unzip, double-click `start-windows.bat` |
| **macOS / Linux** | `chmod +x start-mac-linux.sh && ./start-mac-linux.sh` (mac users can double-click `start-mac.command`) |
| **Android** | Install Termux from F-Droid, copy the project, run `bash start-android-termux.sh`, open `http://localhost:3000` |
| **iOS** | Not possible locally — deploy to Render or Railway (below) |

The launcher installs dependencies **only if missing**, seeds the database **only if it does not exist**, starts the server, waits until it is ready, opens your browser, and keeps the window open with: *“Site is running. Close this window to stop.”*

Manual way:

```bash
npm install
npm run seed
npm start          # http://localhost:3000
```

Requires **Node.js 22.13+** (it uses the built-in `node:sqlite`, so nothing is compiled — it works on Windows without Visual Studio and on Termux/Android).

### Access from another device on the same Wi‑Fi

The server listens on `0.0.0.0` and prints a LAN URL on startup, e.g. `Network : http://192.168.1.15:3000`. Open that URL on your phone (same Wi‑Fi, firewall allowing it). `localhost` only works on the machine that started the server. If port 3000 is busy the server prints a clear Persian/English message and tries the next port.

### Deploy for free (Render)

1. Push the project to GitHub.
2. Render → **New → Web Service** → pick the repo.
3. Build: `npm install && npm run seed` · Start: `npm start` · Instance: **Free**.
4. Environment variables: `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
5. Your site will be at `https://<service>.onrender.com`.

### Deploy on Railway

New Project → Deploy from GitHub repo → set Build Command `npm install && npm run seed`, Start Command `npm start`, then add a Public Domain from Settings → Networking.

## Default credentials

- **Admin panel** (`/admin`): `admin` / `Admin12345!`
- **Sample customer**: `customer@example.com` / `Customer123!`

Change them in `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) before going live. If `.env` is missing, the app creates it from `.env.example` with a random `SESSION_SECRET`.

## Features

- Homepage with top bar, search box, cart, login, category menu, static hero slider, best sellers / newest / discounted sections and brand row
- Auto-parts filtering: **car brand, model, production year, part category, price range, stock, part brand**, with sorting and pagination
- Product page: image gallery, part brand, OEM code, price/discount, stock, **compatible vehicles**, spec table, description, related items
- Live search suggestions (`/api/search`) + results page
- Session cart for guests, database cart for logged-in users
- Accounts: register, login, profile, addresses, order history
- Checkout: address, shipping method, cash on delivery **or a clearly labelled demo payment gateway**, order confirmation with tracking code, tracking page
- Static pages: About, Contact, FAQ, Terms, Returns
- Admin: dashboard (orders, today's sales, products, low-stock), full product CRUD with multi-image upload, categories, car brands/models, order statuses, customers, settings — all dates in **Jalali**
- Security: helmet, CSRF on every form, rate-limited logins, parameterized SQL, bcryptjs password hashing, session store in SQLite
- Seeded sample data: 10 categories, 8 car brands with 25 models, **53 products** with generated red/white SVG images, 4 sample orders

## Tech stack

Node.js 22.13+ · Express 4 · EJS · `node:sqlite` (built-in, zero native compilation) · express-session with a custom SQLite store · bcryptjs · multer · helmet · express-rate-limit · plain CSS + bundled Vazirmatn font · vanilla JS.

**Why `node:sqlite`?** Drivers such as `better-sqlite3`/`sqlite3` must be compiled per machine and usually fail on Windows without Visual Studio and on Android/Termux. The built-in module needs no install and behaves identically everywhere. If you must switch to `better-sqlite3`, only `models/db.js` has to change — the rest of the code uses its `get/all/run` helpers.

## Project structure

See the Persian section above; the layout is `app.js`, `controllers/`, `routes/`, `models/`, `lib/`, `scripts/`, `views/`, `public/`, `uploads/`, `data/`.

## License

MIT
