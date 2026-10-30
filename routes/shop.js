/**
 * routes/shop.js — مسیرهای صفحات عمومی فروشگاه
 */
const router = require('express').Router();
const c = require('../controllers/shop');

router.get('/', c.home);
router.get('/products', c.list);
router.get('/product/:slug', c.detail);
router.get('/api/search', c.suggest);
router.get('/search', (req, res) => { // هدایت جست‌وجو به فهرست کالاها
  res.redirect('/products' + (req.query.q ? '?q=' + encodeURIComponent(String(req.query.q)) : ''));
});
router.get('/page/:key', c.page);
router.get('/track', c.track);

module.exports = router;
