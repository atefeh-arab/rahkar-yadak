/**
 * models/db.js
 * لایه پایگاه داده با «node:sqlite» ماژول داخلی Node.js
 * بدون هیچ وابستگی بومی (native) — روی ویندوز، مک، لینوکس و ترمکس بدون کامپایل نصب می‌شود.
 * نیازمند Node.js 22.13 یا جدیدتر.
 */
const fs = require('fs');
const path = require('path');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.error('\n[خطا] ماژول داخلی node:sqlite در این نسخه از Node.js در دسترس نیست.');
  console.error('[Error] The built-in node:sqlite module is not available in this Node.js version.');
  console.error('لطفاً Node.js نسخه ۲۲٫۱۳ یا جدیدتر نصب کنید: https://nodejs.org');
  console.error('Please install Node.js 22.13 or newer: https://nodejs.org\n');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'store.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 3000');

/** ساخت جدول‌ها در صورت نبودن (idempotent) */
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS addresses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal TEXT DEFAULT '',
  address TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS car_brands(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS car_models(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(brand_id, name)
);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  part_brand TEXT DEFAULT '',
  part_number TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  specs TEXT DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS product_images(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product_vehicles(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES car_brands(id) ON DELETE CASCADE,
  model_id INTEGER REFERENCES car_models(id) ON DELETE SET NULL,
  year_from INTEGER,
  year_to INTEGER
);
CREATE TABLE IF NOT EXISTS carts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cart_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  UNIQUE(cart_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  receiver TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal TEXT DEFAULT '',
  address TEXT NOT NULL,
  note TEXT DEFAULT '',
  shipping_method TEXT DEFAULT 'پست پیشتاز',
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'پرداخت در محل',
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  total INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings(
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS sessions(
  sid TEXT PRIMARY KEY,
  expiry INTEGER NOT NULL,
  data TEXT NOT NULL
);
`);

/* ---------- کمک‌تابعت‌های کوتاه برای پرس‌وجوی پارامتری ---------- */
const get = (sql, ...params) => db.prepare(sql).get(...params);
const all = (sql, ...params) => db.prepare(sql).all(...params);
const run = (sql, ...params) => {
  const r = db.prepare(sql).run(...params);
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
};

/** خواندن یک تنظیم از جدول settings */
const setting = (key) => get('SELECT value FROM settings WHERE key = ?', key)?.value;

/** نوشتن/به‌روزرسانی یک تنظیم */
const setSetting = (key, value) =>
  run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));

/** اجرای چند عملیات در یک تراکنش */
function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, get, all, run, setting, setSetting, tx };
