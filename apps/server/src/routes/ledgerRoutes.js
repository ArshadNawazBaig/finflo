const express = require('express');
const router = express.Router();
const { getLedger } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getLedger);

module.exports = router;
