/**
 * controllers/admin.js
 * پنل مدیریت: ورود جداگانه، داشبورد، مدیریت کالاها (با آپلود چند تصویر)،
 * دسته‌بندی‌ها، خودروها، سفارش‌ها، کاربران و تنظیمات فروشگاه.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { get, all, run, tx, setting, setSetting } = require('../models/db');
const fmt = require('../lib/format');

const clean = (v) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, 300);
const num = (v, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

/* ---------------- آپلود تصاویر ---------------- */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('فقط تصویر PNG، JPG، WebP یا SVG مجاز است.'), ok);
  }
});

/* ---------------- محافظت پنل ---------------- */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).render('admin/login', {
    title: 'ورود مدیر', error: 'تعداد تلاش‌های ورود بیش از حد مجاز است؛ ۱۵ دقیقه بعد دوباره تلاش کنید.'
  })
});

function guard(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  // شمارنده‌های منوی کناری پنل
  res.locals.counts = {
    products: Number(get('SELECT COUNT(*) AS n FROM products').n),
    categories: Number(get('SELECT COUNT(*) AS n FROM categories').n),
    brands: Number(get('SELECT COUNT(*) AS n FROM car_brands').n),
    orders: Number(get("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'").n),
    users: Number(get("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").n)
  };
  next();
}

/* ---------------- ورود/خروج مدیر ---------------- */
function loginForm(req, res) {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'ورود مدیر', error: null });
}

function login(req, res, next) {
  const u = clean(req.body.username);
  const p = String(req.body.password || '');
  const envU = process.env.ADMIN_USERNAME || 'admin';
  const envP = process.env.ADMIN_PASSWORD || 'Admin12345!';

  let ok = u === envU && p === envP;
  if (!ok) {
    const row = get("SELECT * FROM users WHERE role = 'admin' AND (email = ? OR name = ?)", u, u);
    if (row && bcrypt.compareSync(p, row.password_hash)) ok = true;
  }
  if (!ok) return res.status(401).render('admin/login', { title: 'ورود مدیر', error: 'نام کاربری یا رمز عبور اشتباه است.' });

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.admin = { name: u };
    res.redirect('/admin');
  });
}

function logout(req, res, next) {
  req.session.destroy((err) => (err ? next(err) : res.redirect('/admin/login')));
}

/* ---------------- داشبورد ---------------- */
function dashboard(req, res) {
  const stats = {
    orders: Number(get('SELECT COUNT(*) AS n FROM orders').n),
    todaySales: Number(get("SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'").n),
    products: Number(get('SELECT COUNT(*) AS n FROM products').n),
    customers: Number(get("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").n),
    lowStock: Number(get('SELECT COUNT(*) AS n FROM products WHERE stock <= 5').n),
    pending: Number(get("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'").n)
  };
  const latest = all('SELECT * FROM orders ORDER BY id DESC LIMIT 8');
  const low = all('SELECT id, name, slug, stock FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 8');
  res.render('admin/dashboard', { title: 'داشبورد', stats, latest, low, statuses: STATUSES });
}

/* ---------------- کالاها ---------------- */
function products(req, res) {
  const q = clean(req.query.q);
  const page = Math.max(1, num(req.query.page, 1));
  const per = 20;
  const where = q ? 'WHERE p.name LIKE ? OR p.part_number LIKE ? OR p.part_brand LIKE ?' : '';
  const params = q ? ['%' + q + '%', '%' + q + '%', '%' + q + '%'] : [];
  const total = Number(get('SELECT COUNT(*) AS n FROM products p ' + where, ...params).n);
  const rows = all(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id ` + where +
    ' ORDER BY p.id DESC LIMIT ? OFFSET ?', ...params, per, (page - 1) * per);
  res.render('admin/products', {
    title: 'مدیریت کالاها', rows, q, page, pages: Math.max(1, Math.ceil(total / per)), total
  });
}

function productForm(req, res) {
  const id = req.params.id ? num(req.params.id) : 0;
  const product = id ? get('SELECT * FROM products WHERE id = ?', id) : null;
  if (id && !product) return res.status(404).render('error', { code: 404, title: 'کالا پیدا نشد', message: 'این کالا وجود ندارد.' });
  const specs = product ? (() => { try { return Object.entries(JSON.parse(product.specs || '{}')); } catch (e) { return []; } })() : [];
  const vehicles = id ? all('SELECT * FROM product_vehicles WHERE product_id = ?', id) : [];
  const images = id ? all('SELECT id, path FROM product_images WHERE product_id = ? ORDER BY sort, id', id) : [];
  res.render('admin/product-form', {
    title: id ? 'ویرایش کالا' : 'افزودن کالا',
    product, specs, vehicles, images,
    categories: all('SELECT * FROM categories ORDER BY name'),
    brands: all('SELECT * FROM car_brands ORDER BY name'),
    models: all('SELECT m.*, b.name AS brand_name FROM car_models m JOIN car_brands b ON b.id = m.brand_id ORDER BY b.name, m.name'),
    error: null
  });
}

/** پردازش فرم کالا (ایجاد/ویرایش) */
function saveProduct(req, res, isEdit) {
  const b = req.body;
  const name = clean(b.name);
  const fail = (msg) => {
    const id = isEdit ? num(req.params.id) : 0;
    res.status(400).render('admin/product-form', {
      title: isEdit ? 'ویرایش کالا' : 'افزودن کالا',
      product: isEdit ? get('SELECT * FROM products WHERE id = ?', id) : Object.assign({}, b, { id }),
      specs: [], vehicles: [], images: [],
      categories: all('SELECT * FROM categories ORDER BY name'),
      brands: all('SELECT * FROM car_brands ORDER BY name'),
      models: all('SELECT m.*, b.name AS brand_name FROM car_models m JOIN car_brands b ON b.id = m.brand_id ORDER BY b.name, m.name'),
      error: msg
    });
  };

  if (name.length < 3) return fail('نام کالا باید حداقل ۳ حرف باشد.');
  const price = num(b.price, 0), discount = Math.min(num(b.discount, 0), price), stock = num(b.stock, 0);
  if (price <= 0) return fail('قیمت باید بزرگ‌تر از صفر باشد.');

  // مشخصات فنی
  const specs = {};
  (b.spec_k || []).forEach((k, i) => { const v = (b.spec_v || [])[i]; if (clean(k) && v != null) specs[clean(k)] = clean(v); });

  // تصاویر آپلودشده
  const uploaded = (req.files || []).map((f) => '/uploads/' + f.filename);

  const finish = (id) => {
    if (uploaded.length) {
      uploaded.forEach((p, i) => run('INSERT INTO product_images(product_id, path, sort) VALUES(?,?,?)', id, p, i + 1));
    }
    // خودروهای سازگار
    const brandsArr = [].concat(b.v_brand || []);
    const modelsArr = [].concat(b.v_model || []);
    const fromArr = [].concat(b.v_from || []);
    const toArr = [].concat(b.v_to || []);
    const rows = [];
    for (let i = 0; i < brandsArr.length; i++) {
      const bid = num(brandsArr[i], 0);
      const mid = num(modelsArr[i], 0);
      if (!bid) continue;
      rows.push({ bid: bid || null, mid: mid || null, from: num(fromArr[i], 0) || null, to: num(toArr[i], 0) || null });
    }
    if (rows.length || isEdit) {
      run('DELETE FROM product_vehicles WHERE product_id = ?', id);
      rows.forEach((r) => run('INSERT INTO product_vehicles(product_id, brand_id, model_id, year_from, year_to) VALUES(?,?,?,?,?)',
        id, r.bid, r.mid, r.from, r.to));
    }
    const firstImage = uploaded[0] || get('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort, id LIMIT 1', id)?.path || '';
    run('UPDATE products SET image = ? WHERE id = ?', firstImage, id);
    req.session.flash = { type: 'ok', text: isEdit ? 'کالا به‌روزرسانی شد و بلافاصله در سایت نمایش داده می‌شود.' : 'کالا جدید اضافه شد.' };
    res.redirect('/admin/products');
  };

  if (isEdit) {
    const id = num(req.params.id);
    run(`UPDATE products SET name=?, slug=?, description=?, category_id=?, part_brand=?, part_number=?,
         price=?, discount=?, stock=?, specs=?, active=? WHERE id=?`,
      name, clean(b.slug) || get('SELECT slug FROM products WHERE id = ?', id).slug, clean(b.description).slice(0, 2000),
      num(b.category_id, 0) || null, clean(b.part_brand), clean(b.part_number),
      price, discount, stock, JSON.stringify(specs), b.active === '0' ? 0 : 1, id);
    return finish(id);
  }

  const slugBase = fmt.slugify(name);
  const id = run(
    `INSERT INTO products(name, slug, description, category_id, part_brand, part_number,
      price, discount, stock, specs, image, active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    name, slugBase, clean(b.description).slice(0, 2000), num(b.category_id, 0) || null,
    clean(b.part_brand), clean(b.part_number), price, discount, stock,
    JSON.stringify(specs), uploaded[0] || '', b.active === '0' ? 0 : 1
  ).lastInsertRowid;
  finish(id);
}

function createProduct(req, res) {
  try { saveProduct(req, res, false); }
  catch (err) { console.error(err); req.session.flash = { type: 'err', text: 'خطا در ذخیره کالا.' }; res.redirect('/admin/products/new'); }
}

function updateProduct(req, res) {
  try { saveProduct(req, res, true); }
  catch (err) { console.error(err); req.session.flash = { type: 'err', text: 'خطا در ذخیره کالا.' }; res.redirect('/admin/products/' + req.params.id + '/edit'); }
}

function deleteProduct(req, res) {
  const id = num(req.params.id);
  const imgs = all('SELECT path FROM product_images WHERE product_id = ?', id);
  run('DELETE FROM products WHERE id = ?', id);
  imgs.forEach((i) => {
    const file = path.join(UPLOAD_DIR, path.basename(i.path));
    if (i.path.startsWith('/uploads/') && fs.existsSync(file)) { try { fs.unlinkSync(file); } catch (e) { /* ignore */ } }
  });
  req.session.flash = { type: 'ok', text: 'کالا حذف شد.' };
  res.redirect('/admin/products');
}

function deleteProductImage(req, res) {
  const id = num(req.params.id);
  const img = get('SELECT * FROM product_images WHERE id = ? AND product_id = ?', req.params.imageId, id);
  if (img) {
    run('DELETE FROM product_images WHERE id = ?', img.id);
    const file = path.join(UPLOAD_DIR, path.basename(img.path));
    if (fs.existsSync(file)) { try { fs.unlinkSync(file); } catch (e) { /* ignore */ } }
  }
  res.redirect('/admin/products/' + id + '/edit');
}

/* ---------------- دسته‌بندی‌ها ---------------- */
function categories(req, res) {
  const rows = all('SELECT c.*, COUNT(p.id) AS n FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.name');
  res.render('admin/categories', { title: 'دسته‌بندی‌ها', rows, error: null });
}

function categoryCreate(req, res) {
  const name = clean(req.body.name);
  if (name.length < 2) { req.session.flash = { type: 'err', text: 'نام دسته‌بندی را وارد کنید.' }; return res.redirect('/admin/categories'); }
  try {
    run('INSERT INTO categories(name, slug) VALUES(?,?)', name, fmt.slugify(name));
    req.session.flash = { type: 'ok', text: 'دسته‌بندی ساخته شد.' };
  } catch (e) { req.session.flash = { type: 'err', text: 'این دسته‌بندی قبلاً وجود دارد.' }; }
  res.redirect('/admin/categories');
}

function categoryUpdate(req, res) {
  const id = num(req.params.id);
  run('UPDATE categories SET name = ? WHERE id = ?', clean(req.body.name), id);
  req.session.flash = { type: 'ok', text: 'دسته‌بندی ویرایش شد.' };
  res.redirect('/admin/categories');
}

function categoryDelete(req, res) {
  run('DELETE FROM categories WHERE id = ?', num(req.params.id));
  req.session.flash = { type: 'ok', text: 'دسته‌بندی حذف شد (کالاها بدون دسته می‌مانند).' };
  res.redirect('/admin/categories');
}

/* ---------------- خودروها (برند و مدل) ---------------- */
function brands(req, res) {
  const brands = all('SELECT b.*, COUNT(m.id) AS n FROM car_brands b LEFT JOIN car_models m ON m.brand_id = b.id GROUP BY b.id ORDER BY b.name');
  const models = all('SELECT m.*, b.name AS brand_name FROM car_models m JOIN car_brands b ON b.id = m.brand_id ORDER BY b.name, m.name');
  res.render('admin/brands', { title: 'خودروها', brands, models, error: null });
}

function brandCreate(req, res) {
  const name = clean(req.body.name);
  if (name.length < 2) { req.session.flash = { type: 'err', text: 'نام برند خودرو را وارد کنید.' }; return res.redirect('/admin/brands'); }
  try { run('INSERT INTO car_brands(name, slug) VALUES(?,?)', name, fmt.slugify(name)); req.session.flash = { type: 'ok', text: 'برند اضافه شد.' }; }
  catch (e) { req.session.flash = { type: 'err', text: 'این برند قبلاً وجود دارد.' }; }
  res.redirect('/admin/brands');
}

function brandDelete(req, res) {
  run('DELETE FROM car_brands WHERE id = ?', num(req.params.id));
  req.session.flash = { type: 'ok', text: 'برند و مدل‌های آن حذف شد.' };
  res.redirect('/admin/brands');
}

function modelCreate(req, res) {
  const name = clean(req.body.name), brandId = num(req.body.brand_id, 0);
  if (!name || !brandId) { req.session.flash = { type: 'err', text: 'برند و نام مدل را انتخاب کنید.' }; return res.redirect('/admin/brands'); }
  try { run('INSERT INTO car_models(brand_id, name) VALUES(?,?)', brandId, name); req.session.flash = { type: 'ok', text: 'مدل اضافه شد.' }; }
  catch (e) { req.session.flash = { type: 'err', text: 'این مدل برای این برند قبلاً وجود دارد.' }; }
  res.redirect('/admin/brands');
}

function modelDelete(req, res) {
  run('DELETE FROM car_models WHERE id = ?', num(req.params.id));
  req.session.flash = { type: 'ok', text: 'مدل حذف شد.' };
  res.redirect('/admin/brands');
}

/* ---------------- سفارش‌ها ---------------- */
const STATUSES = {
  pending: 'در انتظار پرداخت', processing: 'در حال پردازش', shipped: 'ارسال شده',
  delivered: 'تحویل شده', cancelled: 'لغو شده'
};

function orders(req, res) {
  const status = STATUSES[req.query.status] ? req.query.status : '';
  const page = Math.max(1, num(req.query.page, 1));
  const per = 20;
  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const total = Number(get('SELECT COUNT(*) AS n FROM orders ' + where, ...params).n);
  const rows = all('SELECT * FROM orders ' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?', ...params, per, (page - 1) * per);
  res.render('admin/orders', {
    title: 'سفارش‌ها', rows, status, statuses: STATUSES,
    page, pages: Math.max(1, Math.ceil(total / per)), total
  });
}

function orderDetail(req, res) {
  const order = get('SELECT * FROM orders WHERE id = ?', num(req.params.id));
  if (!order) return res.status(404).render('error', { code: 404, title: 'سفارش پیدا نشد', message: 'این سفارش وجود ندارد.' });
  const items = all('SELECT * FROM order_items WHERE order_id = ?', order.id);
  res.render('admin/order-detail', { title: 'سفارش ' + order.code, order, items, statuses: STATUSES });
}

function orderStatus(req, res) {
  const id = num(req.params.id);
  const status = STATUSES[req.body.status] ? req.body.status : 'pending';
  run('UPDATE orders SET status = ? WHERE id = ?', status, id);
  req.session.flash = { type: 'ok', text: 'وضعیت سفارش به «' + STATUSES[status] + '» تغییر کرد.' };
  res.redirect('/admin/orders/' + id);
}

/* ---------------- کاربران ---------------- */
function users(req, res) {
  const rows = all(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
            (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.user_id = u.id) AS spent
       FROM users u WHERE u.role = 'customer' ORDER BY u.id DESC`);
  res.render('admin/users', { title: 'مشتریان', rows });
}

/* ---------------- تنظیمات ---------------- */
function settingsForm(req, res) {
  res.render('admin/settings', {
    title: 'تنظیمات',
    s: {
      store_name: setting('store_name') || process.env.STORE_NAME || '',
      store_phone: setting('store_phone') || process.env.STORE_PHONE || '',
      store_address: setting('store_address') || process.env.STORE_ADDRESS || '',
      shipping_cost: setting('shipping_cost') || process.env.SHIPPING_COST || '85000',
      free_shipping_over: setting('free_shipping_over') || process.env.FREE_SHIPPING_OVER || '500000'
    }
  });
}

function settingsSave(req, res) {
  ['store_name', 'store_phone', 'store_address'].forEach((k) => setSetting(k, clean(req.body[k])));
  setSetting('shipping_cost', String(num(req.body.shipping_cost, 85000)));
  setSetting('free_shipping_over', String(num(req.body.free_shipping_over, 500000)));
  req.session.flash = { type: 'ok', text: 'تنظیمات ذخیره شد.' };
  res.redirect('/admin/settings');
}

module.exports = {
  upload, adminLimiter, guard, loginForm, login, logout, dashboard,
  products, productForm, createProduct, updateProduct, deleteProduct, deleteProductImage,
  categories, categoryCreate, categoryUpdate, categoryDelete,
  brands, brandCreate, brandDelete, modelCreate, modelDelete,
  orders, orderDetail, orderStatus, users, settingsForm, settingsSave, STATUSES
};
