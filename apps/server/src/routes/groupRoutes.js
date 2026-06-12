const express = require('express');
const router = express.Router();

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');
const {
  createGroupLoan,
  getGroupLoans,
  getGroupLoanById,
  approveGroupLoan,
  addGroupRepayment,
  renewGroupLoan,
} = require('../controllers/groupLoanController');
const {
  protect,
  staffOrAdmin,
  authorizePermissions,
} = require('../middleware/authMiddleware');

// ── Group-loan (cycle) endpoints ─────────────────────────────────────────────
// These are registered BEFORE the `/:id` group routes so `/loans` is never
// swallowed by the `:id` param.
router.route('/loans').get(protect, getGroupLoans);
router
  .route('/loans/:groupLoanId')
  .get(protect, getGroupLoanById);
router
  .route('/loans/:groupLoanId/approve')
  .post(protect, staffOrAdmin, approveGroupLoan);
router
  .route('/loans/:groupLoanId/repayment')
  .post(protect, staffOrAdmin, addGroupRepayment);
router
  .route('/loans/:groupLoanId/renew')
  .post(protect, staffOrAdmin, renewGroupLoan);

// Create a loan cycle for a group.
router
  .route('/:id/loans')
  .post(protect, authorizePermissions('manage_loans'), createGroupLoan);

// ── Group (membership) CRUD ──────────────────────────────────────────────────
router
  .route('/')
  .get(protect, getGroups)
  .post(protect, authorizePermissions('manage_loans'), createGroup);

router
  .route('/:id')
  .get(protect, getGroupById)
  .put(protect, authorizePermissions('manage_loans'), updateGroup)
  .delete(protect, authorizePermissions('manage_loans'), deleteGroup);

module.exports = router;
