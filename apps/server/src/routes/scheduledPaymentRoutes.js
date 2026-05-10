const express = require('express');
const router = express.Router();
const {
  createScheduledPayment,
  getMyScheduledPayments,
  updateScheduledPayment,
  deleteScheduledPayment,
} = require('../controllers/scheduledPaymentController');
const { protectMember } = require('../middleware/memberAuthMiddleware');

router.use(protectMember);

router.post('/', createScheduledPayment);
router.get('/', getMyScheduledPayments);
router.put('/:id', updateScheduledPayment);
router.delete('/:id', deleteScheduledPayment);

module.exports = router;
