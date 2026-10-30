/**
 * controllers/checkout.js
 * تسویه خرید: فرم سفارش، ثبت سفارش، درگاه پرداخت نمایشی و صفحه تأیید.
 */
const crypto = require('crypto');
const { get, all, run, tx, setting } = require('../models/db');
const cartLib = require('../lib/cart');
const { totals } = require('./cart');

const SHIPPING = [
  { id: 'post', name: 'پست پیشتاز', desc: '۲ تا ۴ روز کاری', cost: 85000 },
  { id: 'tipax', name: 'تیپاکس', desc: '۱ تا ۳ روز کاری', cost: 60000 },
  { id: 'courier', name: 'پیک موتوری (تهران)', desc: 'همان روز', cost: 45000 }
];

const clean = (v) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, 200);
const codeGen = () => 'RY' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);

/** مالکیت سفارش: کاربر یا کوکی سفارش مهمان */
function owns(req, order) {
  if (req.session.user && order.user_id === req.session.user.id) return true;
  return (req.session.myOrders || []).includes(order.id);
}

/* ---------------------------- فرم سفارش ---------------------------- */
function form(req, res) {
  const data = cartLib.readCart(req);
  if (!data.items.length) {
    req.session.flash = { type: 'err', text: 'سبد خرید شما خالی است.' };
    return res.redirect('/cart');
  }
  const t = totals(data.subtotal);
  const addresses = req.session.user ? all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', req.session.user.id) : [];
  const user = req.session.user ? get('SELECT name, phone FROM users WHERE id = ?', req.session.user.id) : null;
  res.render('checkout', {
    title: 'تسویه و پرداخت',
    cart: data, totals: t, shipping: SHIPPING, addresses, user, old: {}, error: null
  });
}

/* ---------------------------- ثبت سفارش ---------------------------- */
function place(req, res) {
  const data = cartLib.readCart(req);
  if (!data.items.length) {
    req.session.flash = { type: 'err', text: 'سبد خرید شما خالی است.' };
    return res.redirect('/cart');
  }

  const b = req.body;
  let receiver = clean(b.receiver), phone = clean(b.phone);
  let province = clean(b.province), city = clean(b.city), postal = clean(b.postal), address = clean(b.address);

  // انتخاب یکی از آدرس‌های ذخیره‌شده
  if (b.address_id && req.session.user) {
    const a = get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', b.address_id, req.session.user.id);
    if (a) { receiver = a.receiver; phone = a.phone; province = a.province; city = a.city; postal = a.postal; address = a.address; }
  }

  const fail = (msg) => res.status(400).render('checkout', {
    title: 'تسویه و پرداخت', cart: data, totals: totals(data.subtotal),
    shipping: SHIPPING, addresses: req.session.user ? all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', req.session.user.id) : [],
    user: req.session.user ? get('SELECT name, phone FROM users WHERE id = ?', req.session.user.id) : null,
    old: b, error: msg
  });

  if (receiver.length < 3) return fail('نام گیرنده را وارد کنید.');
  if (!/^09\d{9}$/.test(phone)) return fail('شماره موبایل گیرنده معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷).');
  if (address.length < 12) return fail('نشانی کامل پستی را وارد کنید (حداقل ۱۲ کاراکتر).');
  if (postal && !/^\d{10}$/.test(postal)) return fail('کد پستی باید ۱۰ رقم باشد.');

  const shipOpt = SHIPPING.find((s) => s.id === b.shipping) || SHIPPING[0];
  const t = totals(data.subtotal);
  const shippingCost = t.ship === 0 ? 0 : shipOpt.cost;
  const payment = b.payment === 'online' ? 'online' : 'cod';

  let code = codeGen();
  while (get('SELECT id FROM orders WHERE code = ?', code)) code = codeGen();

  const orderId = tx(() => {
    const id = run(
      `INSERT INTO orders(code, user_id, receiver, phone, province, city, postal, address, note,
         shipping_method, shipping_cost, payment_method, status, subtotal, discount, total)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      code, req.session.user ? req.session.user.id : null, receiver, phone, province, city, postal,
      address, clean(b.note).slice(0, 300), shipOpt.name, shippingCost, payment,
      'pending', data.subtotal, 0, data.subtotal + shippingCost
    ).lastInsertRowid;

    data.items.forEach((it) => {
      run('INSERT INTO order_items(order_id, product_id, name, price, discount, qty, total) VALUES(?,?,?,?,?,?,?)',
        id, it.id, it.name, it.price, it.discount, it.qty, it.line);
      run('UPDATE products SET stock = MAX(0, stock - ?), sold = sold + ? WHERE id = ?', it.qty, it.qty, it.id);
    });
    return id;
  });

  req.session.myOrders = (req.session.myOrders || []).concat(orderId);
  cartLib.clearCart(req);

  if (payment === 'online') return res.redirect('/pay/' + code);
  req.session.flash = { type: 'ok', text: 'سفارش شما ثبت شد. کد رهگیری: ' + code };
  res.redirect('/order/' + code);
}

/* ---------------------------- درگاه نمایشی ---------------------------- */
function payForm(req, res) {
  const order = get('SELECT * FROM orders WHERE code = ?', req.params.code);
  if (!order || !owns(req, order)) return res.status(404).render('error', { code: 404, title: 'سفارش پیدا نشد', message: 'این سفارش برای شما یافت نشد.' });
  if (order.status !== 'pending') return res.redirect('/order/' + order.code);
  res.render('payment', { title: 'پرداخت اینترنتی (نمایشی)', order });
}

function paySubmit(req, res) {
  const order = get('SELECT * FROM orders WHERE code = ?', req.params.code);
  if (!order || !owns(req, order)) return res.status(404).render('error', { code: 404, title: 'سفارش پیدا نشد', message: 'این سفارش برای شما یافت نشد.' });

  if (req.body.action === 'cancel') {
    run('UPDATE orders SET status = ? WHERE id = ?', 'cancelled', order.id);
    req.session.flash = { type: 'err', text: 'پرداخت لغو شد. می‌توانید سفارش را دوباره ثبت کنید.' };
    return res.redirect('/cart');
  }
  // شبیه‌سازی پرداخت موفق — هیچ تراکنش واقعی انجام نمی‌شود
  run('UPDATE orders SET status = ? WHERE id = ?', 'processing', order.id);
  req.session.flash = { type: 'ok', text: 'پرداخت نمایشی با موفقیت انجام شد (بدون تراکنش واقعی).' };
  res.redirect('/order/' + order.code);
}

/* ---------------------------- صفحه تأیید سفارش ---------------------------- */
function orderPage(req, res) {
  const order = get('SELECT * FROM orders WHERE code = ?', req.params.code);
  if (!order || !owns(req, order)) return res.status(404).render('error', { code: 404, title: 'سفارش پیدا نشد', message: 'این سفارش برای شما یافت نشد یا کد رهگیری اشتباه است.' });
  const items = all('SELECT * FROM order_items WHERE order_id = ?', order.id);
  res.render('order', { title: 'تأیید سفارش', order, items });
}

module.exports = { form, place, payForm, paySubmit, orderPage, SHIPPING };
