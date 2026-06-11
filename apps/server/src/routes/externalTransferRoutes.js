const express = require('express');
const router = express.Router();
const {
  initiateExternalTransfer,
  getMyExternalTransfers,
  resolveExternalAccountTitle,
} = require('../controllers/externalTransferController');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');
const { idempotency } = require('../middleware/idempotency');

router.use(protectMember);

router.post('/', idempotency, requireTransactionPin, initiateExternalTransfer);
// SECURITY: /receive route removed — it allowed a logged-in member to credit
// their own balance by simply posting an amount, with no bank-side proof of
// funds. Incoming deposits must come through a verified webhook (Raast, etc.)
// or an admin-recorded reconciliation flow.
router.post('/resolve-title', resolveExternalAccountTitle);
router.get('/', getMyExternalTransfers);

module.exports = router;
