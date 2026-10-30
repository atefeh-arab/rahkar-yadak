/**
 * routes/checkout.js — مسیرهای تسویه خرید، درگاه نمایشی و صفحه سفارش
 */
const router = require('express').Router();
const c = require('../controllers/checkout');

router.get('/checkout', c.form);
router.post('/checkout', c.place);
router.get('/pay/:code', c.payForm);
router.post('/pay/:code', c.paySubmit);
router.get('/order/:code', c.orderPage);

module.exports = router;
