const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payments/paymentController')

router.post('/order', paymentController.createOrder)
router.post('/verify', paymentController.verifyPayment)
router.post('/webhook', paymentController.webhook)
// router.get('/events', paymentController.events)

module.exports = router;