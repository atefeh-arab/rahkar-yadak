# راهکار یدک — فروشگاه قطعات خودرو

فروشگاه فارسی و راست‌چین قطعات خودرو با Express، EJS و SQLite.

## اجرا
نیازمند Node.js 18+ و پیش‌نیازهای ساخت native برای `better-sqlite3` است.

```bash
cp .env.example .env
npm install
npm run seed
npm start
```
سایت: http://localhost:3000 — پنل: http://localhost:3000/admin

مدیر پیش‌فرض: `admin` / `Admin12345!` (از `.env` خوانده می‌شود). پیش از استقرار رمز و `SESSION_SECRET` را تغییر دهید.

## امکانات
فهرست و جست‌وجوی کالا، فیلتر برند و مدل خودرو/دسته/قیمت، صفحه کالا، سبد خرید نشست‌محور، ثبت‌نام و ورود با bcrypt، نشانی‌ها، سفارش و پیگیری، پرداخت در محل و درگاه نمایشی (بدون تراکنش واقعی)، پنل مدیریت محصولات/دسته‌ها/خودروها/سفارش‌ها/مشتریان/تنظیمات، آپلود تصویر، CSRF، Helmet، محدودسازی ورود، SQLite و داده‌های نمونه.

## افزودن محصول
از `/admin` وارد شوید، «محصولات» و سپس «افزودن محصول» را انتخاب کنید. قیمت‌ها به تومان هستند. تصاویر در `uploads/` ذخیره می‌شوند؛ در صورت نبود تصویر از SVG محلی استفاده می‌شود.

## تصاویر
جایگاه تصاویر صفحه اصلی، فهرست محصولات و پنل مدیریت.

## ساختار
`app.js` مسیرها | `models/db.js` پایگاه داده | `scripts/seed.js` داده نمونه | `views/` قالب‌ها | `public/css` استایل | `public/js` جست‌وجوی زنده | `public/images` لوگو و تصویر SVG | `uploads/` تصاویر آپلودی | `data/` دیتابیس.

---

# English
A Persian RTL auto-parts store built with Express, EJS, SQLite and vanilla CSS/JS. Includes catalog filters, live search, product pages, session cart, accounts, checkout, demo payment, order tracking and admin CRUD.

Run: `cp .env.example .env && npm install && npm run seed && npm start`, then open `http://localhost:3000`. Default admin is `admin` / `Admin12345!`; change credentials and session secret before deployment. Demo payment does not charge money.

Screenshots: add homepage, product listing and admin screenshots here.
