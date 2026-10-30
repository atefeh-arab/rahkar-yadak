/**
 * controllers/auth.js
 * ثبت‌نام، ورود، خروج، پروفایل، آدرس‌ها و سفارش‌های کاربر.
 */
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { get, all, run, setting } = require('../models/db');
const { mergeGuestCart, readCart } = require('../lib/cart');
const fmt = require('../lib/format');

/** محدودسازی تلاش‌های ورود (ضد نفوذ) */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).render('auth', {
    mode: 'login',
    title: 'ورود',
    error: 'تعداد تلاش‌های ورود بیش از حد مجاز است؛ ۱۵ دقیقه بعد دوباره تلاش کنید.',
    old: { email: clean(req.body.email) }
  })
});

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
const clean = (v) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, 120);

/* ------------------------- ورود ------------------------- */
function loginForm(req, res) {
  if (req.session.user) return res.redirect('/account');
  res.render('auth', { mode: 'login', title: 'ورود', error: null, old: {} });
}

function login(req, res, next) {
  const email = clean(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  if (!emailOk(email) || !password) {
    return res.status(400).render('auth', { mode: 'login', title: 'ورود', error: 'ایمیل یا رمز عبور نادرست است.', old: { email } });
  }
  const user = get('SELECT * FROM users WHERE email = ?', email);
  if (!user || user.role !== 'customer' || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render('auth', { mode: 'login', title: 'ورود', error: 'ایمیل یا رمز عبور نادرست است.', old: { email } });
  }
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    mergeGuestCart(req, user.id);
    req.session.flash = { type: 'ok', text: 'خوش آمدید ' + user.name + ' عزیز.' };
    res.redirect(req.session.returnTo || '/account');
    delete req.session.returnTo;
  });
}

/* ------------------------- ثبت‌نام ------------------------- */
function registerForm(req, res) {
  if (req.session.user) return res.redirect('/account');
  res.render('auth', { mode: 'register', title: 'ثبت‌نام', error: null, old: {} });
}

function register(req, res, next) {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const phone = clean(req.body.phone);
  const password = String(req.body.password || '');

  const fail = (msg) => res.status(400).render('auth', {
    mode: 'register', title: 'ثبت‌نام', error: msg, old: { name, email, phone }
  });

  if (name.length < 3) return fail('نام و نام خانوادگی باید حداقل ۳ حرف باشد.');
  if (!emailOk(email)) return fail('ایمیل معتبر نیست.');
  if (!/^09\d{9}$/.test(phone)) return fail('شماره موبایل باید با ۰۹ و ۱۰ رقم باشد.');
  if (password.length < 8) return fail('رمز عبور باید حداقل ۸ کاراکتر باشد.');
  if (get('SELECT id FROM users WHERE email = ?', email)) return fail('این ایمیل قبلاً ثبت شده است. وارد شوید.');

  const hash = bcrypt.hashSync(password, 10);
  const id = run("INSERT INTO users(name, email, phone, password_hash, role) VALUES(?,?,?,?,'customer')",
    name, email, phone, hash).lastInsertRowid;

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { id, name, email, role: 'customer' };
    mergeGuestCart(req, id);
    req.session.flash = { type: 'ok', text: 'حساب شما ساخته شد. خوش آمدید!' };
    res.redirect('/account');
  });
}

/* ------------------------- خروج ------------------------- */
function logout(req, res, next) {
  req.session.destroy((err) => (err ? next(err) : res.redirect('/')));
}

/* ------------------------- محافظت مسیرهای کاربری ------------------------- */
function requireUser(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

/* ------------------------- حساب کاربری ------------------------- */
function account(req, res) {
  const user = get('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', req.session.user.id);
  const orders = all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', user.id);
  const addresses = all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', user.id);
  res.render('account', { title: 'حساب کاربری', tab: req.query.tab || 'profile', user, orders, addresses, error: null });
}

function updateProfile(req, res) {
  const name = clean(req.body.name);
  const phone = clean(req.body.phone);
  if (name.length < 3 || !/^09\d{9}$/.test(phone)) {
    req.session.flash = { type: 'err', text: 'نام یا شماره موبایل نامعتبر است.' };
    return res.redirect('/account');
  }
  run('UPDATE users SET name = ?, phone = ? WHERE id = ?', name, phone, req.session.user.id);
  req.session.user.name = name;
  req.session.flash = { type: 'ok', text: 'اطلاعات پروفایل به‌روزرسانی شد.' };
  res.redirect('/account');
}

/* ------------------------- آدرس‌ها ------------------------- */
function addAddress(req, res) {
  const b = req.body;
  const receiver = clean(b.receiver), phone = clean(b.phone), address = clean(b.address);
  if (!receiver || !/^09\d{9}$/.test(phone) || address.length < 10) {
    req.session.flash = { type: 'err', text: 'گیرنده، موبایل و نشانی را کامل وارد کنید.' };
    return res.redirect('/account?tab=addresses');
  }
  const userId = req.session.user.id;
  const count = Number(get('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', userId).n);
  const isDefault = count === 0 || b.is_default === '1' ? 1 : 0;
  if (isDefault) run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', userId);
  run('INSERT INTO addresses(user_id, receiver, phone, province, city, postal, address, is_default) VALUES(?,?,?,?,?,?,?,?)',
    userId, receiver, phone, clean(b.province), clean(b.city), clean(b.postal), address, isDefault);
  req.session.flash = { type: 'ok', text: 'نشانی جدید ذخیره شد.' };
  res.redirect('/account?tab=addresses');
}

function deleteAddress(req, res) {
  run('DELETE FROM addresses WHERE id = ? AND user_id = ?', req.params.id, req.session.user.id);
  req.session.flash = { type: 'ok', text: 'نشانی حذف شد.' };
  res.redirect('/account?tab=addresses');
}

/* ------------------------- سفارش‌های کاربر ------------------------- */
function orders(req, res) {
  const list = all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', req.session.user.id)
    .map((o) => ({ ...o, items: all('SELECT * FROM order_items WHERE order_id = ?', o.id) }));
  res.render('orders', { title: 'سفارش‌های من', orders: list });
}

module.exports = {
  loginLimiter, loginForm, login, registerForm, register, logout,
  requireUser, account, updateProfile, addAddress, deleteAddress, orders
};
