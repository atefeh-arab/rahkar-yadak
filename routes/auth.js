/**
 * routes/auth.js — مسیرهای ورود/ثبت‌نام/حساب کاربری
 */
const router = require('express').Router();
const c = require('../controllers/auth');

router.get('/login', c.loginForm);
router.post('/login', c.loginLimiter, c.login);
router.get('/register', c.registerForm);
router.post('/register', c.register);
router.post('/logout', c.logout);

router.use(['/account', '/orders'], c.requireUser);
router.get('/account', c.account);
router.post('/account', c.updateProfile);
router.post('/addresses', c.addAddress);
router.post('/addresses/:id/delete', c.deleteAddress);
router.get('/orders', c.orders);

module.exports = router;
