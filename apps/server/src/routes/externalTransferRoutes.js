const express = require('express');
const router = express.Router();
const {
  initiateExternalTransfer,
  recordExternalReceive,
  getMyExternalTransfers,
} = require('../controllers/externalTransferController');
const { protectMember } = require('../middleware/memberAuthMiddleware');

router.use(protectMember);

router.post('/', initiateExternalTransfer);
router.post('/receive', recordExternalReceive);
router.get('/', getMyExternalTransfers);

module.exports = router;
