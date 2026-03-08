const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');
const { handleRaastWebhook } = require('../controllers/raastWebhookController');

router.post('/', handleWebhook);
router.post('/raast', handleRaastWebhook);

module.exports = router;
