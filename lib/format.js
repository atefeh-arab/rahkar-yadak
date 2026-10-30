/**
 * lib/format.js
 * توابع فرمت‌دهی فارسی: قیمت تومان، ارقام فارسی، تاریخ جلالی، اسلاگ.
 */

/** قیمت به تومان با جداکننده هزارگان و ارقام فارسی */
const money = (n) => new Intl.NumberFormat('fa-IR').format(Math.round(Number(n) || 0));

/** تبدیل عدد/رشته به ارقام فارسی */
const fa = (v) => String(v == null ? '' : v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** ارقام انگلیسی (برای مقادیر عددی داخل فرم‌ها) */
const en = (v) => String(v == null ? '' : v).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

const pad = (n) => (n < 10 ? '0' + n : '' + n);

/** تبدیل تاریخ میلادی به جلالی — الگوریتم استاندارد (join) */
function toJalali(date) {
  const d = date instanceof Date ? date : new Date(String(date).replace(' ', 'T'));
  if (isNaN(d)) return { y: 0, m: 0, d: 0 };
  const gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getUTCDate ? d.getUTCDate() : d.getDate();
  const g_days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  const days = 365 * (gy - 1996) + Math.floor((gy2 - 1996 + 3) / 4) - Math.floor((gy - 1996 + 3) / 4) + g_days[gm - 1] + gd - 1;
  let jy = 1375 + Math.floor(days / 365);
  let remainder = days % 365;
  const leap = ((jy + 1) % 4 === 0) ? 366 : 365;
  while (remainder >= leap) { remainder -= leap; jy++; }
  const jm = remainder < 186 ? Math.min(6, Math.ceil(remainder / 31)) : Math.min(6, Math.ceil((remainder - 186) / 30) + 6);
  const jd = jm <= 6 ? ((remainder % 31) || 31) : ((remainder - 186) % 30) || 30;
  return { y: jy, m: jm, d: jd };
}

const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

/** تاریخ جلالی زیبا: ۱۵ آبان ۱۴۰۴ */
function dateFa(value) {
  if (!value) return '—';
  const j = toJalali(value);
  if (!j.y) return '—';
  return fa(j.d) + ' ' + J_MONTHS[j.m - 1] + ' ' + fa(j.y);
}

/** تاریخ و ساعت جلالی: ۱۵ آبان ۱۴۰۴ — ۱۲:۳۰ */
function dateTimeFa(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (isNaN(d)) return dateFa(value);
  return dateFa(d) + ' — ' + fa(pad(d.getHours()) + ':' + pad(d.getMinutes()));
}

/** ساخت اسلاگ فارسی/لاتین یکتا */
function slugify(text, suffix) {
  const base = String(text || '').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return (base || 'item') + '-' + (suffix || Math.random().toString(36).slice(2, 7));
}

/** درصد تخفیف روی یک کالا */
const discountPercent = (p) => (p.discount > 0 && p.price > 0 ? Math.round((p.discount / p.price) * 100) : 0);

/** قیمت نهایی پس از تخفیف */
const finalPrice = (p) => Math.max(0, (Number(p.price) || 0) - (Number(p.discount) || 0));

module.exports = { money, fa, en, dateFa, dateTimeFa, slugify, discountPercent, finalPrice, toJalali };
