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
} = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/upcoming').get(protect, getUpcomingRepayments);
router.route('/request').post(protectMember, requestLoan);
router.route('/my-loans').get(protectMember, getMyLoans);
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
