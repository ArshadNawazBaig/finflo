const express = require('express');
const router = express.Router();
const {
  getPayrollDashboard,
  runPayroll,
  getPayrollRuns,
  getPayrollRunDetail,
  approvePayrollRun,
  markPayrollPaid,
  getPayslip,
} = require('../controllers/payrollController');
const {
  protect,
  requireFeature,
  authorizePermissions,
} = require('../middleware/authMiddleware');

router.use(protect, requireFeature('payrollEnabled'), authorizePermissions('manage_payroll'));

router.get('/dashboard', getPayrollDashboard);

router.post('/run', runPayroll);
router.get('/runs', getPayrollRuns);
router.get('/runs/:id', getPayrollRunDetail);
router.post('/runs/:id/approve', approvePayrollRun);
router.post('/runs/:id/mark-paid', markPayrollPaid);

// JSON payslip — the client renders the PDF (no server-side PDF capability).
router.get('/payslips/:payslipId', getPayslip);

module.exports = router;
