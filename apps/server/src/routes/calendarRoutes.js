const express = require('express');
const router = express.Router();
const { getAdminCalendarEvents } = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAdminCalendarEvents);

module.exports = router;
