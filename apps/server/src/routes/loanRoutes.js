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
  memberUploadDocuments,
  getMyLoans,
  approveLoan,
  rejectLoan,
  bulkApproveLoans,
  bulkRejectLoans,
  getLoanSchedule,
  getMemberLoanById,
  getMemberLoanSchedule,
  getGrantorLoans,
  updateGrantorStatus,
  sendPaymentReminder,
  sendBulkPaymentReminders,
} = require('../controllers/loanController');
const {
  protect,
  admin,
  staffOrAdmin,
} = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const loanDocUpload = require('../middleware/loanDocUploadMiddleware');
const { loanValidation } = require('../middleware/validationMiddleware');

router.route('/upcoming').get(protect, getUpcomingRepayments);
router.post('/send-reminder', protect, sendPaymentReminder);
router.post('/send-bulk-reminders', protect, sendBulkPaymentReminders);
router.route('/request').post(protectMember, loanDocUpload.array('documents', 5), requestLoan);
router.route('/my-loans').get(protectMember, getMyLoans);
router.route('/grantor-loans').get(protectMember, getGrantorLoans);
router.patch('/:id/grantor-status', protectMember, updateGrantorStatus);
router.get('/my-loans/:id', protectMember, getMemberLoanById);
router.get('/my-loans/:id/schedule', protectMember, getMemberLoanSchedule);
router.post('/my-loans/:id/documents', protectMember, loanDocUpload.array('documents', 5), memberUploadDocuments);

// Bulk actions
router.post('/bulk-approve', protect, staffOrAdmin, bulkApproveLoans);
router.post('/bulk-reject', protect, staffOrAdmin, bulkRejectLoans);

router.patch('/:id/approve', protect, staffOrAdmin, approveLoan);
router.patch('/:id/reject', protect, staffOrAdmin, rejectLoan);
router.get('/:id/schedule', protect, getLoanSchedule);
router
  .route('/:id/documents')
  .post(protect, upload.single('document'), uploadDocument);
router.route('/:id/documents/:docId').delete(protect, deleteDocument);
router
  .route('/')
  .get(protect, getLoans)
  .post(protect, admin, loanValidation, createLoan);

router
  .route('/:id')
  .get(protect, getLoanById)
  .put(protect, updateLoan)
  .delete(protect, deleteLoan);

module.exports = router;
