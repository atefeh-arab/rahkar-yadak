/**
 * app.js — سرور فروشگاه اینترنتی قطعات یدکی خودرو «یدک‌یار»
 * Node.js + Express + EJS + SQLite (node:sqlite) — بدون کامپایل و بدون مرحله build
 */
require('./config/env').ensureEnv();
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const methodOverride = require('method-override');

const SQLiteSessionStore = require('./models/session-store');
const { all, setting } = require('./models/db');
const { readCart } = require('./lib/cart');
const fmt = require('./lib/format');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const BASE_PORT = parseInt(process.env.PORT, 10) || 3000;

// پوشه‌های موردنیاز
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

/* ---------------- امنیت پایه ---------------- */
app.set('trust proxy', 1); // پشت تونل/پراکسی HTTPS هم کوکی امن بسازد
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"]
    }
  }
}));

/* ---------------- قالب‌بندی و ورودی‌ها ---------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', index: 'index.html' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(methodOverride('_method'));

/* ---------------- نشست (SQLite) ---------------- */
const store = new SQLiteSessionStore();
app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  resave: false,
  saveUninitialized: false,
  name: 'yadakyar.sid',
  rolling: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
setInterval(() => store.prune(), 60 * 60 * 1000).unref();

/* ---------------- توکن CSRF ---------------- */
app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  next();
});

/* ---------------- متغیرهای مشترک قالب‌ها ---------------- */
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.storeName = setting('store_name') || process.env.STORE_NAME || 'یدک‌یار';
  res.locals.storePhone = setting('store_phone') || process.env.STORE_PHONE || '021-55500000';
  res.locals.storeAddress = setting('store_address') || process.env.STORE_ADDRESS || 'تهران';
  res.locals.money = fmt.money;
  res.locals.fa = fmt.fa;
  res.locals.dateFa = fmt.dateFa;
  res.locals.dateTimeFa = fmt.dateTimeFa;
  res.locals.finalPrice = fmt.finalPrice;
  res.locals.discountPercent = fmt.discountPercent;
  // لوگوی برندهای خودرو: فایل‌های لوگو با نام لاتین ساخته شده‌اند ولی slug برند فارسی است،
  // پس اول نگاشت نام→فایل، بعد فایل هم‌نام slug و در نهایت تصویر پیش‌فرض بررسی می‌شود
  // تا هیچ تصویر شکسته‌ای در سایت نمایش داده نشود. (Brand logo with a safe fallback.)
  const BRAND_LOGO = {
    'پژو': 'peugeot', 'سمند': 'samand', 'پراید': 'pride', 'تویوتا': 'toyota',
    'هیوندای': 'hyundai', 'کیا': 'kia', 'رنو': 'renault', 'تیبا': 'tiba'
  };
  const brandFile = (name) => path.join(__dirname, 'public', 'images', 'brands', name + '.svg');
  res.locals.brandLogo = function (b) {
    if (!b) return '/images/part.svg';
    const mapped = BRAND_LOGO[b.name];
    if (mapped && fs.existsSync(brandFile(mapped))) return '/images/brands/' + mapped + '.svg';
    if (b.slug && fs.existsSync(brandFile(b.slug))) return '/images/brands/' + b.slug + '.svg';
    return '/images/part.svg';
  };
  res.locals.navCategories = all('SELECT c.id, c.name, c.slug, COUNT(p.id) AS n FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.active = 1 GROUP BY c.id ORDER BY c.name');
  res.locals.cart = readCart(req);
  res.locals.cartCount = res.locals.cart.count;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.path = req.path;
  res.locals.query = req.query;
  res.locals.year = new Date().getFullYear();
  next();
});

/* ---------------- پارس درخواست‌های چندبخشی (آپلود تصویر) ---------------- */
const { upload } = require('./controllers/admin');
app.use((req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.startsWith('multipart/form-data')) return next();
  upload.any()(req, res, (err) => {
    if (err) {
      req.session.flash = { type: 'err', text: err.message || 'خطا در آپلود فایل. فقط تصویر تا ۲ مگابایت مجاز است.' };
      return res.redirect(req.get('referer') || '/admin/products');
    }
    next();
  });
});

/* ---------------- بررسی توکن CSRF ---------------- */
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
    if (!token || token !== req.session.csrf) {
      return res.status(403).render('error', {
        code: 403,
        title: 'درخواست نامعتبر',
        message: 'توکن امنیتی معتبر نبود. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.'
      });
    }
  }
  next();
});

/* ---------------- مسیرها ---------------- */
app.use('/', require('./routes/shop'));
app.use('/', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/', require('./routes/checkout'));
app.use('/admin', require('./routes/admin'));

/* ---------------- ۴۰۴ و ۵۰۰ ---------------- */
app.use((req, res) => {
  res.status(404).render('error', { code: 404, title: 'صفحه پیدا نشد', message: 'صفحه‌ای که دنبال آن بودید وجود ندارد یا جابه‌جا شده است.' });
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', {
    code: 500,
    title: 'خطای سرور',
    message: 'متأفانه خطایی رخ داد. چند لحظه دیگر دوباره تلاش کنید.'
  });
});

/* ---------------- آدرس‌های شبکه و اجرای سرور ---------------- */
function lanAddress() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return null;
}

function start(port, attempt = 0) {
  const server = app.listen(port, HOST, () => {
    const lan = lanAddress();
    const actual = server.address().port;
    console.log('');
    console.log('  ✔ فروشگاه «' + (setting('store_name') || process.env.STORE_NAME || 'یدک‌یار') + '» راه‌اندازی شد.');
    console.log('  ─────────────────────────────────────────────');
    console.log('   Local   :  http://localhost:' + actual);
    if (lan) console.log('   Network :  http://' + lan + ':' + actual + '   (برای موبایل در همان شبکه وای‌فای)');
    console.log('   Admin   :  http://localhost:' + actual + '/admin');
    console.log('  ─────────────────────────────────────────────');
    console.log('  Site is running. این پنجره را نبندید تا سایت روشن بماند / Close this window to stop.');
    console.log('SITE_URL=http://localhost:' + actual);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 9) {
      console.log('[port] پورت ' + port + ' اشغال است، پورت ' + (port + 1) + ' امتحان می‌شود... / Port ' + port + ' is busy, trying ' + (port + 1) + '.');
      start(port + 1, attempt + 1);
    } else if (err.code === 'EADDRINUSE') {
      console.error('[port] هیچ پورتی از ' + port + ' تا ' + (port + 9) + ' در دسترس نیست.');
      console.error('[Error] No free port found. Change PORT in .env and try again.');
      process.exit(1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  return server;
}

start(BASE_PORT);

module.exports = app;
