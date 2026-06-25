const express = require('express');
const router = express.Router();
const {
  createLeaveRequest,
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
} = require('../controllers/leaveController');
const {
  protect,
  requireFeature,
  authorizePermissions,
} = require('../middleware/authMiddleware');

router.use(protect, requireFeature('payrollEnabled'), authorizePermissions('manage_payroll'));

router.route('/').get(getLeaveRequests).post(createLeaveRequest);

// Custom-action routes before the bare /:id pattern.
router.get('/balance/:employeeId', getLeaveBalance);
router.put('/:id/approve', approveLeave);
router.put('/:id/reject', rejectLeave);

module.exports = router;
