const express = require('express');
const router = express.Router();
const { getLandingStats } = require('../controllers/publicController');

router.get('/stats', getLandingStats);

module.exports = router;
