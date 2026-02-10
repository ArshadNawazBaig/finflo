const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  createPortalSession,
  getBillingInfo,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  updateSubscription,
  verifySession,
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-portal-session', protect, createPortalSession);
router.get('/', protect, getBillingInfo);
router.post('/payment-method', protect, addPaymentMethod);
router.put(
  '/payment-method/:paymentMethodId/default',
  protect,
  setDefaultPaymentMethod,
);
router.delete('/payment-method/:paymentMethodId', protect, removePaymentMethod);
router.put('/', protect, updateSubscription);
router.post('/verify-session', protect, verifySession);

module.exports = router;
