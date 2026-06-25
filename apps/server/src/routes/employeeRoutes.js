const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  terminateEmployee,
  getEmployeePayslips,
  linkCustomer,
  unlinkCustomer,
} = require('../controllers/employeeController');
const {
  protect,
  requireFeature,
  authorizePermissions,
} = require('../middleware/authMiddleware');

// Every employee route requires an authenticated user, a payroll-enabled tenant,
// and the manage_payroll permission.
router.use(protect, requireFeature('payrollEnabled'), authorizePermissions('manage_payroll'));

router.route('/').get(getEmployees).post(createEmployee);

router.post('/:id/link-customer', linkCustomer);
router.delete('/:id/unlink-customer', unlinkCustomer);
router.get('/:id/payslips', getEmployeePayslips);

router
  .route('/:id')
  .get(getEmployee)
  .put(updateEmployee)
  .delete(terminateEmployee);

module.exports = router;
