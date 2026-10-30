/**
 * lib/cart.js
 * سبد خرید: برای کاربر مهمان در نشست (session) و برای کاربر واردشده در پایگاه داده.
 * هنگام ورود، سبد مهمان با سبد کاربر ادغام می‌شود.
 */
const { db, get, all, run } = require('../models/db');

/** ردیف‌های سبد خرید + جمع کل — خروجی یکسان برای مهمان و کاربر */
function readCart(req) {
  const user = req.session.user;
  let rows = [];
  if (user) {
    rows = all(
      `SELECT ci.product_id AS id, ci.qty, p.name, p.slug, p.image, p.price, p.discount, p.stock
         FROM carts c
         JOIN cart_items ci ON ci.cart_id = c.id
         JOIN products p ON p.id = ci.product_id
        WHERE c.user_id = ?`, user.id);
  } else {
    const items = req.session.cart || [];
    rows = items.map((it) => {
      const p = get('SELECT id, name, slug, image, price, discount, stock FROM products WHERE id = ? AND active = 1', it.id);
      return p ? Object.assign({}, p, { qty: it.qty }) : null;
    }).filter(Boolean);
  }
  const items = rows.map((r) => ({
    ...r,
    qty: Number(r.qty),
    unit: Math.max(0, Number(r.price) - Number(r.discount)),
    line: Math.max(0, Number(r.price) - Number(r.discount)) * Number(r.qty)
  }));
  const count = items.reduce((a, x) => a + x.qty, 0);
  const subtotal = items.reduce((a, x) => a + x.line, 0);
  return { items, count, subtotal };
}

/** افزودن کالا به سبد */
function addToCart(req, productId, qty = 1) {
  qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
  const product = get('SELECT id, stock FROM products WHERE id = ? AND active = 1', productId);
  if (!product) return { ok: false, message: 'کالا یافت نشد.' };
  const user = req.session.user;
  if (user) {
    let cart = get('SELECT id FROM carts WHERE user_id = ?', user.id);
    if (!cart) cart = { id: run('INSERT INTO carts(user_id) VALUES(?)', user.id).lastInsertRowid };
    const existing = get('SELECT qty FROM cart_items WHERE cart_id = ? AND product_id = ?', cart.id, product.id);
    const nextQty = Math.min(99, (existing ? existing.qty : 0) + qty);
    if (existing) {
      run('UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?', nextQty, cart.id, product.id);
    } else {
      run('INSERT INTO cart_items(cart_id, product_id, qty) VALUES(?, ?, ?)', cart.id, product.id, nextQty);
    }
  } else {
    const items = req.session.cart || [];
    const found = items.find((i) => i.id === product.id);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else items.push({ id: product.id, qty });
    req.session.cart = items;
  }
  return { ok: true, message: 'کالا به سبد خرید اضافه شد.' };
}

/** تغییر تعداد */
function setQty(req, productId, qty) {
  qty = parseInt(qty, 10) || 0;
  const user = req.session.user;
  if (user) {
    const cart = get('SELECT id FROM carts WHERE user_id = ?', user.id);
    if (cart) {
      if (qty <= 0) run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', cart.id, productId);
      else run('UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?', Math.min(99, qty), cart.id, productId);
    }
  } else {
    let items = req.session.cart || [];
    if (qty <= 0) items = items.filter((i) => i.id !== productId);
    else items = items.map((i) => (i.id === productId ? { ...i, qty: Math.min(99, qty) } : i));
    req.session.cart = items;
  }
}

/** حذف یک کالا */
function removeItem(req, productId) { setQty(req, productId, 0); }

/** خالی کردن سبد */
function clearCart(req) {
  const user = req.session.user;
  if (user) run('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)', user.id);
  else req.session.cart = [];
}

/** ادغام سبد مهمان با سبد کاربر هنگام ورود */
function mergeGuestCart(req, userId) {
  const guest = req.session.cart || [];
  if (!guest.length) return;
  let cart = get('SELECT id FROM carts WHERE user_id = ?', userId);
  if (!cart) cart = { id: run('INSERT INTO carts(user_id) VALUES(?)', userId).lastInsertRowid };
  guest.forEach((it) => {
    const existing = get('SELECT qty FROM cart_items WHERE cart_id = ? AND product_id = ?', cart.id, it.id);
    if (existing) run('UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?', Math.min(99, existing.qty + it.qty), cart.id, it.id);
    else run('INSERT INTO cart_items(cart_id, product_id, qty) VALUES(?, ?, ?)', cart.id, it.id, it.qty);
  });
  req.session.cart = [];
}

module.exports = { readCart, addToCart, setQty, removeItem, clearCart, mergeGuestCart };
