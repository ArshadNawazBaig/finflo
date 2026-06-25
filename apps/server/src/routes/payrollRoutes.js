const express = require('express');
const router = express.Router();
const {
  getPayrollDashboard,
  runPayroll,
  getPayrollRuns,
  getPayrollRunDetail,
  approvePayrollRun,
  markPayrollPaid,
  reopenPayrollRun,
  deletePayrollRun,
  setPayslipAmount,
  setPayslipDeductions,
  getPayrollReport,
  getPayslip,
} = require('../controllers/payrollController');
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const {
  protect,
  requireFeature,
  authorizePermissions,
} = require('../middleware/authMiddleware');

router.use(protect, requireFeature('payrollEnabled'), authorizePermissions('manage_payroll'));

router.get('/dashboard', getPayrollDashboard);
router.get('/report', getPayrollReport);

// Departments — managed pick-list behind the employee `department` field.
router.route('/departments').get(getDepartments).post(createDepartment);
router.route('/departments/:id').put(updateDepartment).delete(deleteDepartment);

router.post('/run', runPayroll);
router.get('/runs', getPayrollRuns);
router.get('/runs/:id', getPayrollRunDetail);
router.delete('/runs/:id', deletePayrollRun);
router.post('/runs/:id/approve', approvePayrollRun);
router.post('/runs/:id/mark-paid', markPayrollPaid);
router.post('/runs/:id/reopen', reopenPayrollRun);
router.put('/runs/:id/payslips/:payslipId', setPayslipAmount);
router.put('/runs/:id/payslips/:payslipId/deductions', setPayslipDeductions);

// JSON payslip — the client renders the PDF (no server-side PDF capability).
router.get('/payslips/:payslipId', getPayslip);

module.exports = router;
