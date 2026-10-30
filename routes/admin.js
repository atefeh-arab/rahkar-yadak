/**
 * routes/admin.js — مسیرهای پنل مدیریت (محافظت‌شده با نشست جداگانه)
 */
const router = require('express').Router();
const c = require('../controllers/admin');

router.get('/login', c.loginForm);
router.post('/login', c.adminLimiter, c.login);
router.post('/logout', c.logout);

router.use(c.guard);

router.get('/', c.dashboard);

router.get('/products', c.products);
router.get('/products/new', c.productForm);
router.post('/products', c.createProduct);
router.get('/products/:id/edit', c.productForm);
router.post('/products/:id', c.updateProduct);
router.post('/products/:id/delete', c.deleteProduct);
router.post('/products/:id/images/:imageId/delete', c.deleteProductImage);

router.get('/categories', c.categories);
router.post('/categories', c.categoryCreate);
router.post('/categories/:id', c.categoryUpdate);
router.post('/categories/:id/delete', c.categoryDelete);

router.get('/brands', c.brands);
router.post('/brands', c.brandCreate);
router.post('/brands/:id/delete', c.brandDelete);
router.post('/brands/models', c.modelCreate);
router.post('/brands/models/:id/delete', c.modelDelete);

router.get('/orders', c.orders);
router.get('/orders/:id', c.orderDetail);
router.post('/orders/:id/status', c.orderStatus);

router.get('/users', c.users);

router.get('/settings', c.settingsForm);
router.post('/settings', c.settingsSave);

module.exports = router;
