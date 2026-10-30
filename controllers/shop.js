/**
 * controllers/shop.js
 * صفحات عمومی فروشگاه: صفحه اصلی، فهرست کالاها با فیلتر، صفحه کالا،
 * جست‌وجوی زنده، صفحات ثابت و پیگیری سفارش.
 */
const { get, all } = require('../models/db');
const fmt = require('../lib/format');
const content = require('../lib/content');

const PER_PAGE = 12;

/** افزودن برچسب قیمت فارسی به هر کالا */
const decorate = (p) => ({
  ...p,
  final: fmt.finalPrice(p),
  off: fmt.discountPercent(p),
  price_label: fmt.money(fmt.finalPrice(p))
});

/* ------------------------------------------------------------------ */
/* صفحه اصلی                                                          */
/* ------------------------------------------------------------------ */
function home(req, res) {
  const best = all(`SELECT * FROM products WHERE active = 1 AND sold > 0 ORDER BY sold DESC, id DESC LIMIT 8`).map(decorate);
  const newest = all(`SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC, id DESC LIMIT 8`).map(decorate);
  const deals = all(`SELECT * FROM products WHERE active = 1 AND discount > 0 ORDER BY (discount * 1.0 / price) DESC LIMIT 8`).map(decorate);
  const brands = all('SELECT * FROM car_brands ORDER BY id');
  res.render('home', { title: 'فروشگاه قطعات یدکی خودرو', best, newest, deals, brands });
}

/* ------------------------------------------------------------------ */
/* فهرست کالاها + فیلتر + مرتب‌سازی + صفحه‌بندی                       */
/* ------------------------------------------------------------------ */
function list(req, res) {
  const q = req.query;
  const where = ['p.active = 1'];
  const params = [];

  if (q.cat) { where.push('c.slug = ?'); params.push(q.cat); }
  if (q.q) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.part_number LIKE ? OR p.part_brand LIKE ?)');
    const like = '%' + q.q + '%';
    params.push(like, like, like, like);
  }
  if (q.brand) { where.push('EXISTS (SELECT 1 FROM product_vehicles v WHERE v.product_id = p.id AND v.brand_id = ?)'); params.push(q.brand); }
  if (q.model) { where.push('EXISTS (SELECT 1 FROM product_vehicles v WHERE v.product_id = p.id AND v.model_id = ?)'); params.push(q.model); }
  if (q.year && /^\d{4}$/.test(q.year)) {
    where.push('EXISTS (SELECT 1 FROM product_vehicles v WHERE v.product_id = p.id AND (v.year_from IS NULL OR v.year_from <= ?) AND (v.year_to IS NULL OR v.year_to >= ?))');
    params.push(q.year, q.year);
  }
  if (q.min && !isNaN(q.min)) { where.push('(p.price - p.discount) >= ?'); params.push(Number(q.min)); }
  if (q.max && !isNaN(q.max)) { where.push('(p.price - p.discount) <= ?'); params.push(Number(q.max)); }
  if (q.instock === '1') { where.push('p.stock > 0'); }
  if (q.pbrand) { where.push('p.part_brand = ?'); params.push(q.pbrand); }

  const order = {
    newest: 'p.created_at DESC, p.id DESC',
    cheapest: '(p.price - p.discount) ASC',
    expensive: '(p.price - p.discount) DESC',
    bestselling: 'p.sold DESC, p.id DESC',
    discount: '(p.discount * 1.0 / NULLIF(p.price,0)) DESC'
  }[q.sort] || 'p.created_at DESC, p.id DESC';

  const from = 'FROM products p LEFT JOIN categories c ON c.id = p.category_id';
  const whereSql = ' WHERE ' + where.join(' AND ');
  const total = Number(get('SELECT COUNT(*) AS n ' + from + whereSql, ...params).n);

  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const offset = (Math.min(page, pages) - 1) * PER_PAGE;

  const products = all(
    'SELECT p.*, c.name AS category_name, c.slug AS category_slug ' + from + whereSql +
    ' ORDER BY ' + order + ' LIMIT ? OFFSET ?', ...params, PER_PAGE, offset
  ).map(decorate);

  // داده‌های کمکی فیلتر
  const categories = all('SELECT c.id, c.name, c.slug, COUNT(p.id) AS n FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.active = 1 GROUP BY c.id ORDER BY c.name');
  const brands = all('SELECT * FROM car_brands ORDER BY name');
  const models = q.brand ? all('SELECT * FROM car_models WHERE brand_id = ? ORDER BY name', q.brand) : all('SELECT m.*, b.name AS brand_name FROM car_models m JOIN car_brands b ON b.id = m.brand_id ORDER BY b.name, m.name');
  const partBrands = all("SELECT DISTINCT part_brand FROM products WHERE active = 1 AND part_brand != '' ORDER BY part_brand");

  res.render('products', {
    title: q.q ? 'نتایج جست‌وجو برای «' + q.q + '»' : 'فروشگاه قطعات یدکی',
    products, total, page, pages, categories, brands, models, partBrands, q, decorate
  });
}

/* ------------------------------------------------------------------ */
/* صفحه تک‌کالا                                                       */
/* ------------------------------------------------------------------ */
function detail(req, res) {
  const p = get(
    'SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p ' +
    'LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.active = 1', req.params.slug);
  if (!p) return res.status(404).render('error', { code: 404, title: 'کالا پیدا نشد', message: 'این کالا موجود نیست یا حذف شده است.' });

  const images = all('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort, id', p.id).map((r) => r.path);
  if (p.image && !images.includes(p.image)) images.unshift(p.image);

  const vehicles = all(
    `SELECT b.name AS brand, m.name AS model, v.year_from, v.year_to
       FROM product_vehicles v
       LEFT JOIN car_brands b ON b.id = v.brand_id
       LEFT JOIN car_models m ON m.id = v.model_id
      WHERE v.product_id = ? ORDER BY b.name, m.name`, p.id);

  let specs = {};
  try { specs = JSON.parse(p.specs || '{}'); } catch (e) { specs = {}; }

  const related = all(
    'SELECT p.* FROM products p WHERE p.active = 1 AND p.id != ? AND (p.category_id = ? OR p.part_brand = ?) ORDER BY p.sold DESC LIMIT 4',
    p.id, p.category_id, p.part_brand).map(decorate);

  res.render('product', { title: p.name, product: decorate(p), images, vehicles, specs, related });
}

/* ------------------------------------------------------------------ */
/* پیشنهادهای جست‌وجوی زنده (AJAX)                                     */
/* ------------------------------------------------------------------ */
function suggest(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ items: [] });
  const like = '%' + q + '%';
  const items = all(
    `SELECT name, slug, image, price, discount FROM products
      WHERE active = 1 AND (name LIKE ? OR part_number LIKE ? OR part_brand LIKE ?)
      ORDER BY sold DESC LIMIT 6`, like, like, like).map(decorate)
    .map((p) => ({ name: p.name, slug: p.slug, image: p.image || '/images/part.svg', price_label: p.price_label }));
  res.json({ items });
}

/* ------------------------------------------------------------------ */
/* صفحات ثابت                                                         */
/* ------------------------------------------------------------------ */
function page(req, res) {
  const key = req.params.key;
  const data = content[key];
  if (!data) return res.status(404).render('error', { code: 404, title: 'صفحه پیدا نشد', message: 'این صفحه وجود ندارد.' });
  res.render('page', { title: data.title, page: data });
}

/* ------------------------------------------------------------------ */
/* پیگیری سفارش با کد رهگیری                                          */
/* ------------------------------------------------------------------ */
function track(req, res) {
  let order = null;
  const code = String(req.query.code || '').trim();
  if (code) {
    order = get('SELECT * FROM orders WHERE code = ?', code.toUpperCase());
    if (order) order.items = all('SELECT * FROM order_items WHERE order_id = ?', order.id);
  }
  res.render('track', { title: 'پیگیری سفارش', code, order });
}

module.exports = { home, list, detail, suggest, page, track };
