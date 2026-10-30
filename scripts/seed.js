/**
 * scripts/seed.js
 * ساخت دیتابیس نمونه: دسته‌بندی‌ها، برندهای خودرو، ۴۰+ کالا با تصاویر SVG،
 * حساب مدیر و مشتری نمونه، چند سفارش آزمایشی و تنظیمات فروشگاه.
 * اجرای دوباره آن امن است (idempotent).
 */
require('../config/env').ensureEnv();
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, get, all, run, setting, setSetting } = require('../models/db');
const fmt = require('../lib/format');

/* ---------------- دسته‌بندی‌ها ---------------- */
const CATEGORIES = [
  ['لنت و سیستم ترمز', 'لنت ترمز جلو و عقب، دیسک و کاسه'],
  ['فیلترها', 'فیلتر روغن، هوا، کابین و بنزین'],
  ['شمع و برق موتور', 'شمع، وایر، دینام، استارتر و باتری'],
  ['جلوبندی و تعلیق', 'کمک‌فنر، طبق، بوش و میل‌فرمان'],
  ['روغن و روانکار', 'روغن موتور، روغن گیربکس و گریس‌ها'],
  ['قطعات موتور', 'واشر، پمپ آب، تسمه و زنجیر تایم'],
  ['بدنه و چراغ', 'چراغ، سپر، آینه و قطعات بدنه'],
  ['لاستیک و چرخ', 'لاستیک و رینگ'],
  ['سیستم خنک‌کننده', 'رادیاتور، ترموستات و شیلنگ‌ها'],
  ['لوازم جانبی', 'بیمه، آفتاب‌گیر، کفپوش و لوازم کاربردی']
];

/* ---------------- برندهای خودرو ---------------- */
const BRANDS = [
  ['پژو', ['206', '207', '405', 'پارس']],
  ['سمند', ['LX', 'EF7', 'سورن']],
  ['پراید', ['131', '132', '111']],
  ['تویوتا', ['کرولا', 'کمری', 'یاریس']],
  ['هیوندای', ['النترا', 'سانتافه', 'اکسنت']],
  ['کیا', ['سراتو', 'اسپورتیج', 'ریو']],
  ['رنو', ['تندر 90', 'ساندرو', 'مگان']],
  ['تیبا', ['تیبا 2', 'ساینا', 'کوییک']]
];

/* ---------------- کالاها ----------------
   [نام، دسته(0..)، برند قطعه، قیمت، تخفیف، موجودی، کد OEM، مشخصه کلیدی] */
const PRODUCTS = [
  ['لنت ترمز جلو پراید (دیسکی)', 0, 'ایراکی', 480000, 40000, 24, 'PR-1101', 'جنس: نیمه‌فلزی'],
  ['لنت ترمز عقب پژو 206', 0, 'والئو', 620000, 60000, 18, '206-2204', 'جنس: سرامیکی'],
  ['لنت ترمز جلو سمند LX', 0, 'ایراکی', 540000, 0, 15, 'SL-3312', 'جنس: نیمه‌فلزی'],
  ['لنت ترمز عقب تویوتا کرولا', 0, 'منتور', 980000, 80000, 7, 'TY-4409', 'جنس: سرامیکی'],
  ['لنت ترمز جلو پژو 405 (دیسکی)', 0, 'والئو', 510000, 45000, 21, '405-1107', 'جنس: نیمه‌فلزی'],
  ['کاسه‌لنت عقب پراید 131', 0, 'ایراکی', 320000, 20000, 30, 'PR-1144', 'جنس: ارگانیک'],

  ['فیلتر روغن پژو 206', 1, 'منتور', 195000, 15000, 45, '206-5102', 'نوع: کارتریجی'],
  ['فیلتر روغن پراید 131', 1, 'بوش', 165000, 0, 52, 'PR-5108', 'نوع: فلزی'],
  ['فیلتر هوا پژو 405', 1, 'بوش', 310000, 30000, 26, '405-6201', 'نوع: کاغذی'],
  ['فیلتر هوا سمند EF7', 1, 'منتور', 335000, 25000, 19, 'SL-6210', 'نوع: کاغذی'],
  ['فیلتر کابین پژو پارس', 1, 'بوش', 275000, 20000, 23, 'PR-6304', 'نوع: تیغه‌ای (کربن‌دار)'],
  ['فیلتر بنزین پراید 132', 1, 'یانگ‌سان', 240000, 0, 14, 'PR-6402', 'نوع: توری‌ای'],
  ['فیلتر هوا هیوندای سانتافه', 1, 'منتور', 420000, 35000, 9, 'HY-6222', 'نوع: کاغذی'],

  ['شمع موتور ایریدیوم بوش (۴ عددی)', 2, 'بوش', 890000, 90000, 22, 'BOS-IR-44', 'جنس: ایریدیوم'],
  ['شمع موتور مسی (۴ عددی)', 2, 'NGK', 460000, 40000, 31, 'NGK-BP5ES', 'جنس: مس'],
  ['وایر شمع پژو 206', 2, 'یانگ‌سان', 540000, 50000, 16, '206-7702', 'طول: استاندارد'],
  ['دینام پژو 405 (۷۰ آمپر)', 2, 'ایسیو', 2450000, 150000, 5, '405-4102', 'ولتاژ: ۱۲ ولت'],
  ['استارتر پراید 131', 2, 'ایسیو', 1980000, 120000, 6, 'PR-4110', 'ولتاژ: ۱۲ ولت'],
  ['باتری ۶۰ آمپر اوربیتال', 2, 'اوربیتال', 2350000, 100000, 12, 'ORB-60', 'ظرفیت: ۶۰ آمپرساعت'],
  ['باتری ۵۵ آمپر یواس‌تی', 2, 'یواس‌تی', 2100000, 0, 10, 'UST-55', 'ظرفیت: ۵۵ آمپرساعت'],
  ['لامپ هالوژن H4 (۲ عددی)', 2, 'بوش', 320000, 30000, 40, 'H4-12V55W', 'توان: ۵۵ وات'],
  ['چراغ جلو سمت راست پژو 206', 6, 'یانگ‌سان', 3250000, 200000, 3, '206-6301', 'سمت: راست'],
  ['مه‌شکن عقب پراید 131', 6, 'یانگ‌سان', 470000, 40000, 17, 'PR-6310', 'رنگ: قرمز'],

  ['کمک‌فنر جلو سمند LX', 3, 'کایابا', 1750000, 150000, 8, 'SL-2201', 'نوع: گازی'],
  ['کمک‌فنر عقب پراید', 3, 'کایابا', 1150000, 80000, 11, 'PR-2208', 'نوع: روغنی'],
  ['طبق جلو پژو 405 (چپ و راست)', 3, 'ایراکی', 1420000, 100000, 9, '405-2310', 'جنس: فولاد'],
  ['میل فرمان پژو پارس', 3, 'ایراکی', 2680000, 180000, 4, 'PR-2410', 'جنس: فولاد'],
  ['بوش فنر صندوق عقب پژو 206', 3, 'منتور', 380000, 30000, 25, '206-2503', 'جنس: پلی‌اورتان'],
  ['تیل‌پیس فرمان پراید', 3, 'یانگ‌سان', 690000, 50000, 13, 'PR-2440', 'جنس: فولاد'],

  ['روغن موتور 5W-30 تمام‌سینتتیک (۴ لیتری)', 4, 'کاسترول', 1650000, 120000, 35, 'CST-5W30', 'نوع: تمام‌سینتتیک'],
  ['روغن موتور 10W-40 نیمه‌سینتتیک (۴ لیتری)', 4, 'بهران', 980000, 60000, 42, 'BRN-10W40', 'نوع: نیمه‌سینتتیک'],
  ['روغن موتور 5W-40 آلمانی (۴ لیتری)', 4, 'موبیل', 2150000, 150000, 16, 'MOB-5W40', 'نوع: تمام‌سینتتیک'],
  ['روغن گیربکس 75W-90 (۱ لیتری)', 4, 'کاسترول', 890000, 0, 18, 'CST-75W90', 'نوع: دستی'],

  ['تسمه دینام پژو 206', 5, 'بوش', 390000, 35000, 27, '206-5301', 'جنس: ابریشمی'],
  ['تسمه تایم پراید 131', 5, 'یانگ‌سان', 720000, 60000, 20, 'PR-5310', 'جنس: ۱۲۲ دندانه'],
  ['زنجیر تایم سمند EF7', 5, 'منتور', 1650000, 120000, 7, 'SL-5320', 'جنس: فولادی'],
  ['واشر سرسیلندر پژو 405', 5, 'ایراکی', 640000, 50000, 14, '405-5401', 'جنس: کامپوزیت'],
  ['پمپ آب پژو 206', 5, 'منتور', 1280000, 90000, 10, '206-5502', 'جنس: فلزی'],
  ['واترپمپ سمند LX', 5, 'منتور', 1350000, 0, 6, 'SL-5510', 'جنس: فلزی'],

  ['رادیاتور آب پراید 131', 8, 'یانگ‌سان', 1890000, 140000, 6, 'PR-5601', 'جنس: آلومینیوم'],
  ['ترموستات سمند LX', 8, 'بوش', 430000, 30000, 19, 'SL-5620', 'دمای بازشدن: ۸۷ درجه'],
  ['شیلنگ رادیاتور پژو 206', 8, 'منتور', 355000, 25000, 22, '206-5630', 'جنس: لاستیکی'],

  ['تیغه برف‌پاک‌کن جلو پژو 206', 6, 'والئو', 480000, 45000, 33, '206-5701', 'طول: ۶۰۰ میلی‌متر'],
  ['تیغه برف‌پاک‌کن پراید', 6, 'یانگ‌سان', 340000, 30000, 38, 'PR-5710', 'طول: ۵۵۰ میلی‌متر'],
  ['آینه بغل برقی پژو 207 (راست)', 6, 'یانگ‌سان', 1450000, 100000, 5, '207-5802', 'نوع: برقی'],
  ['سپر جلو پراید 131', 6, 'ایران‌خودرو', 2250000, 150000, 4, 'PR-5810', 'جنس: پلی‌کربنات'],
  ['کاپوت سمند LX', 6, 'ایران‌خودرو', 4350000, 250000, 2, 'SL-5820', 'جنس: فولاد'],

  ['لاستیک ۱۸۵/۶۵ R15 (عددی)', 7, 'بریجستون', 2680000, 150000, 12, 'BRI-185-65-15', 'سایز: ۱۸۵/۶۵R15'],
  ['رینگ آلومینیومی ۱۵ اینچ (عددی)', 7, 'ایران‌رینگ', 1750000, 100000, 8, 'IRN-R15', 'جنس: آلومینیوم'],
  ['لاستیک ۱۷۵/۷۰ R13 (عددی)', 7, 'کومه‌تایر', 1980000, 0, 15, 'KUM-175-70-13', 'سایز: ۱۷۵/۷۰R13'],

  ['کولر و بخاری پراید (کمپرسور)', 9, 'یانگ‌سان', 3450000, 200000, 3, 'PR-5901', 'نوع: برقي'],
  ['کفپوش سه‌بعدی پژو 206', 9, 'ایرانی', 780000, 60000, 28, 'ACC-206-MAT', 'جنس: PVC'],
  ['آفتاب‌گیر شیشه جلو پراید', 9, 'ایرانی', 320000, 20000, 34, 'ACC-PR-SUN', 'نوع: پارچه‌ای']
];

/* ---------------- تولید تصویر SVG ---------------- */
function makeSvg(name, outPath) {
  const words = String(name).split(' ');
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length > 22) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lines.push(cur);
  const texts = lines.slice(0, 3).map((t, i) =>
    `<text x="300" y="${360 + i * 54}" text-anchor="middle" font-family="Vazirmatn, Vazir, Tahoma, sans-serif" font-size="34" font-weight="700" fill="#1f1f1f">${t.replace(/[<>&]/g, '')}</text>`
  ).join('\n  ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <rect width="600" height="600" fill="#ffffff"/>
  <rect x="0" y="0" width="600" height="14" fill="#E53935"/>
  <rect x="0" y="586" width="600" height="14" fill="#E53935"/>
  <rect x="40" y="40" width="520" height="180" rx="18" fill="#FFEBEE"/>
  <circle cx="300" cy="130" r="62" fill="none" stroke="#E53935" stroke-width="14"/>
  <circle cx="300" cy="130" r="22" fill="#E53935"/>
  <g stroke="#E53935" stroke-width="14" stroke-linecap="round">
    <path d="M300 46 v-18"/><path d="M300 232 v18"/><path d="M216 130 h-18"/><path d="M384 130 h18"/>
    <path d="M241 71 l-13 -13"/><path d="M359 189 l13 13"/><path d="M359 71 l13 -13"/><path d="M241 189 l-13 13"/>
  </g>
  ${texts}
  <text x="300" y="556" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif" font-size="22" fill="#9e9e9e">یدک‌یار — قطعات یدکی خودرو</text>
</svg>
`;
  fs.writeFileSync(outPath, svg, 'utf8');
}

/* ---------------- اجرای seed ---------------- */
console.log('▶ در حال ساخت داده‌های نمونه فروشگاه...');

// ۱) دسته‌بندی‌ها
CATEGORIES.forEach(([name, desc]) => {
  run('INSERT OR IGNORE INTO categories(name, slug, description) VALUES(?,?,?)', name, fmt.slugify(name), desc);
});
console.log('✔ دسته‌بندی‌ها: ' + all('SELECT id FROM categories').length);

// ۲) برندها و مدل‌های خودرو
BRANDS.forEach(([brand, models]) => {
  run('INSERT OR IGNORE INTO car_brands(name, slug) VALUES(?,?)', brand, fmt.slugify(brand));
  const bid = get('SELECT id FROM car_brands WHERE name = ?', brand).id;
  models.forEach((m) => run('INSERT OR IGNORE INTO car_models(brand_id, name) VALUES(?,?)', bid, m));
});
console.log('✔ خودروها: ' + all('SELECT id FROM car_brands').length + ' برند');

// ۳) کالاها + تصاویر SVG + خودروهای سازگار
const imgDir = path.join(__dirname, '..', 'public', 'images', 'products');
fs.mkdirSync(imgDir, { recursive: true });

if (Number(get('SELECT COUNT(*) AS n FROM products').n) === 0) {
  // پاک‌سازی تصاویر قدیمی تولیدشده تا فقط تصاویر همین اجرا باقی بماند
  fs.readdirSync(imgDir).forEach((f) => {
    if (f.endsWith('.svg')) { try { fs.unlinkSync(path.join(imgDir, f)); } catch (e) { /* ignore */ } }
  });
  const cats = all('SELECT id FROM categories ORDER BY id');
  const brandRows = all('SELECT id FROM car_brands ORDER BY id');
  const modelRows = all('SELECT id, brand_id FROM car_models ORDER BY id');

  PRODUCTS.forEach((p, i) => {
    const [name, catIdx, partBrand, price, discount, stock, oem, keySpec] = p;
    const slug = fmt.slugify('item ' + (i + 1) + ' ' + name);
    const image = '/images/products/' + slug + '.svg';
    const description = `${name} — با کد فنی ${oem} و برند ${partBrand}. مناسب برای سرویس دوره‌ای و نگهداری خودرو؛ دارای گارانتی اصالت کالا و ارسال به سراسر کشور.`;
    const specs = JSON.stringify({
      'برند قطعه': partBrand,
      'کد فنی (OEM)': oem,
      'مشخصه': keySpec.replace(/^\S+:\s*/, ''),
      'گارانتی': 'اصالت کالا — ۷ روز مهلت بازگشت',
      'کشور سازنده': i % 3 === 0 ? 'ایران' : (i % 3 === 1 ? 'چین' : 'آلمان')
    });

    const id = run(
      `INSERT INTO products(name, slug, description, category_id, part_brand, part_number,
        price, discount, stock, sold, image, specs, active, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1, datetime('now', ?))`,
      name, slug, description, cats[catIdx].id, partBrand, oem,
      price, discount, stock, (i * 7) % 40, image, specs,
      '-' + (i * 3) + ' hours'
    ).lastInsertRowid;

    run('INSERT INTO product_images(product_id, path, sort) VALUES(?, ?, 0)', id, image);
    makeSvg(name, path.join(imgDir, slug + '.svg'));

    // ۲ تا ۳ خودروی سازگار با بازه سال شمسی
    const picks = [i % brandRows.length, (i + 3) % brandRows.length, (i + 5) % brandRows.length];
    [...new Set(picks)].forEach((bIdx, k) => {
      const bId = brandRows[bIdx].id;
      const modelsOfBrand = modelRows.filter((m) => m.brand_id === bId);
      const mId = k === 0 ? null : (modelsOfBrand[i % modelsOfBrand.length] || {}).id || null;
      run('INSERT INTO product_vehicles(product_id, brand_id, model_id, year_from, year_to) VALUES(?,?,?,?,?)',
        id, bId, mId, 1380 + ((i + k) % 6), 1403);
    });
  });
  console.log('✔ کالاها: ' + PRODUCTS.length + ' قلم + تصاویر SVG');
} else {
  console.log('ℹ کالاها از قبل موجود است؛ درج نمونه‌ها رد شد.');
}

// ۴) تنظیمات فروشگاه
[
  ['store_name', process.env.STORE_NAME || 'یدک‌یار'],
  ['store_phone', process.env.STORE_PHONE || '021-55500000'],
  ['store_address', process.env.STORE_ADDRESS || 'تهران، خیابان نمونه، پلاک ۱۲'],
  ['shipping_cost', process.env.SHIPPING_COST || '85000'],
  ['free_shipping_over', process.env.FREE_SHIPPING_OVER || '500000']
].forEach(([k, v]) => { if (!setting(k)) setSetting(k, v); });
console.log('✔ تنظیمات فروشگاه');

// ۵) حساب مدیر و مشتری نمونه
const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPass = process.env.ADMIN_PASSWORD || 'Admin12345!';
const adminEmail = adminUser.includes('@') ? adminUser : adminUser + '@rahkar.local';
if (!get('SELECT id FROM users WHERE email = ?', adminEmail)) {
  run('INSERT INTO users(name, email, phone, password_hash, role) VALUES(?,?,?,?,?)',
    'مدیر فروشگاه', adminEmail, '02155500000', bcrypt.hashSync(adminPass, 10), 'admin');
  console.log('✔ حساب مدیر: ' + adminUser);
}

if (!get("SELECT id FROM users WHERE email = 'customer@example.com'")) {
  run('INSERT INTO users(name, email, phone, password_hash, role) VALUES(?,?,?,?,?)',
    'مشتری نمونه', 'customer@example.com', '09121111111', bcrypt.hashSync('Customer123!', 10), 'customer');
}
const customer = get("SELECT id FROM users WHERE email = 'customer@example.com'");
if (Number(get('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', customer.id).n) === 0) {
  run('INSERT INTO addresses(user_id, receiver, phone, province, city, postal, address, is_default) VALUES(?,?,?,?,?,?,?,1)',
    customer.id, 'مشتری نمونه', '09121111111', 'تهران', 'تهران', '1234567890', 'تهران، خیابان آزادی، کوچه نمونه، پلاک ۵');
}
console.log('✔ حساب مشتری نمونه');

// ۶) چند سفارش آزمایشی
if (Number(get('SELECT COUNT(*) AS n FROM orders').n) === 0) {
  const sample = all('SELECT id, name, price, discount FROM products ORDER BY id LIMIT 4');
  let seq = 0;
  const makeOrder = (idx, status, shipMethod) => {
    const items = sample.slice(idx, idx + 2);
    const subtotal = items.reduce((a, x) => a + (x.price - x.discount), 0);
    const shipping = idx === 0 ? 0 : 85000;
    const code = 'RY' + (seq++ * 137 + 41001).toString(16).toUpperCase();
    const orderId = run(
      `INSERT INTO orders(code, user_id, receiver, phone, province, city, postal, address,
        shipping_method, shipping_cost, payment_method, status, subtotal, discount, total, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now', ?))`,
      code, customer.id, 'مشتری نمونه', '09121111111', 'تهران', 'تهران', '1234567890',
      'تهران، خیابان آزادی، کوچه نمونه، پلاک ۵',
      shipMethod, shipping, idx % 2 ? 'online' : 'cod', status,
      subtotal, 0, subtotal + shipping, '-' + (idx * 20 + 4) + ' hours'
    ).lastInsertRowid;
    items.forEach((it) => run(
      'INSERT INTO order_items(order_id, product_id, name, price, discount, qty, total) VALUES(?,?,?,?,?,?,?)',
      orderId, it.id, it.name, it.price, it.discount, 1, it.price - it.discount));
  };
  makeOrder(0, 'delivered', 'پست پیشتاز');
  makeOrder(1, 'shipped', 'تیپاکس');
  makeOrder(2, 'processing', 'پست پیشتاز');
  makeOrder(1, 'pending', 'پیک موتوری');
  console.log('✔ ۴ سفارش نمونه');
}

console.log('');
console.log('  دیتابیس آماده است ✔');
console.log('  ورود مدیر  : ' + adminUser + ' / ' + adminPass);
console.log('  مشتری نمونه: customer@example.com / Customer123!');
console.log('');
