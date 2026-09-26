const router = require('express').Router();
const { protectPrincipal } = require('../middleware/protectPrincipal');
const { pollEvents } = require('../services/realtimeService');

router.get('/', protectPrincipal, pollEvents);
module.exports = router;
