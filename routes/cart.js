/**
 * routes/cart.js — مسیرهای سبد خرید
 */
const router = require('express').Router();
const c = require('../controllers/cart');

router.get('/', c.view);
router.post('/add', c.add);
router.post('/add-form', c.addForm);
router.post('/update', c.update);
router.post('/:id/remove', c.remove);

module.exports = router;
