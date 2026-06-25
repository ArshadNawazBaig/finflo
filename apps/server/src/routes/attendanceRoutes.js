const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  bulkMarkAttendance,
  getAttendanceSummary,
} = require('../controllers/attendanceController');
const {
  protect,
  requireFeature,
  authorizePermissions,
} = require('../middleware/authMiddleware');

router.use(protect, requireFeature('payrollEnabled'), authorizePermissions('manage_payroll'));

router.route('/').get(getAttendance).post(markAttendance);
router.post('/bulk', bulkMarkAttendance);
router.get('/summary/:employeeId', getAttendanceSummary);

module.exports = router;
