const express = require('express');
const router = express.Router();
const {
  initiateExternalTransfer,
  recordExternalReceive,
  getMyExternalTransfers,
  resolveExternalAccountTitle,
} = require('../controllers/externalTransferController');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');

router.use(protectMember);

router.post('/', requireTransactionPin, initiateExternalTransfer);
router.post('/receive', requireTransactionPin, recordExternalReceive);
router.post('/resolve-title', resolveExternalAccountTitle);
router.get('/', getMyExternalTransfers);

module.exports = router;
