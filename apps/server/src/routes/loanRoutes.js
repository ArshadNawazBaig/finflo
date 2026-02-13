const express = require('express');
const router = express.Router();
const {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  getUpcomingRepayments,
  uploadDocument,
  deleteDocument,
  requestLoan,
  getMyLoans,
  approveLoan,
  rejectLoan,
  getLoanSchedule,
} = require('../controllers/loanController');
const {
  protect,
  admin,
  staffOrAdmin,
} = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/upcoming').get(protect, getUpcomingRepayments);
router.route('/request').post(protectMember, requestLoan);
router.route('/my-loans').get(protectMember, getMyLoans);
router.patch('/:id/approve', protect, admin, approveLoan);
router.patch('/:id/reject', protect, admin, rejectLoan);
router.get('/:id/schedule', protect, getLoanSchedule);
router
  .route('/:id/documents')
  .post(protect, upload.single('document'), uploadDocument);
router.route('/:id/documents/:docId').delete(protect, deleteDocument);
router.route('/').get(protect, getLoans).post(protect, createLoan);

router
  .route('/:id')
  .get(protect, getLoanById)
  .put(protect, updateLoan)
  .delete(protect, deleteLoan);

module.exports = router;
