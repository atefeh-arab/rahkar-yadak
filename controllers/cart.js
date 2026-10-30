/**
 * controllers/cart.js — سبد خرید (نشست برای مهمان، دیتابیس برای کاربر)
 */
const cart = require('../lib/cart');
const { get, setting } = require('../models/db');
const fmt = require('../lib/format');

/** خلاصه هزینه‌ها: جمع کالاها + ارسال + مجموع */
function totals(subtotal) {
  const shipping = Number(setting('shipping_cost') || process.env.SHIPPING_COST || 85000);
  const freeOver = Number(setting('free_shipping_over') || process.env.FREE_SHIPPING_OVER || 500000);
  const ship = subtotal === 0 ? 0 : (subtotal >= freeOver ? 0 : shipping);
  return { shipping, freeOver, ship, total: subtotal + ship };
}

function view(req, res) {
  const data = cart.readCart(req);
  const t = totals(data.subtotal);
  res.render('cart', { title: 'سبد خرید', cart: data, totals: t, fmt });
}

function add(req, res) {
  const id = parseInt(req.body.product_id, 10);
  const result = cart.addToCart(req, id, req.body.qty);
  res.json(result); // پاسخ AJAX (دکمه «افزودن به سبد»)
}

function addForm(req, res) { // نسخه فرم ساده (بدون JS)
  const id = parseInt(req.body.product_id, 10);
  const result = cart.addToCart(req, id, req.body.qty);
  req.session.flash = { type: result.ok ? 'ok' : 'err', text: result.message };
  res.redirect(req.body.return || '/cart');
}

function update(req, res) {
  cart.setQty(req, parseInt(req.body.product_id, 10), req.body.qty);
  res.redirect('/cart');
}

function remove(req, res) {
  cart.removeItem(req, parseInt(req.params.id, 10));
  req.session.flash = { type: 'ok', text: 'کالا از سبد حذف شد.' };
  res.redirect('/cart');
}

module.exports = { view, add, addForm, update, remove, totals };
