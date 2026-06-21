const express = require('express');
const multer = require('multer');
const router = express.Router();

// In-memory upload — CSV is parsed inline and discarded. 5MB cap is generous
// for member rosters (≈ 50k rows of typical width).
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (ok) cb(null, true);
    else cb(new Error('Only CSV files are allowed'), false);
  },
});

const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberInvestments,
  addInvestment,
  withdrawInvestment,
  getMemberProfits,
  distributeProfit,
  convertCustomerToMember,
  getMemberActivity,
  transferFunds,
  adminTransferFunds,
  lookupMember,
  recalculateBalance,
  getAllDistributions,
  // Business Share
  getMemberShares,
  addShareInvestment,
  withdrawShareInvestment,
  transferShareBetweenMembers,
  distributeShareProfit,
  getPortalShares,
  selfRegister,
  updateApprovalStatus,
  initiateRaastDeposit,
  getAccountStatement,
  bulkImportMembers,
  getMemberAuditLog,
  uploadMemberDocuments,
  updateMemberDocumentStatus,
  deleteMemberDocument,
  // Member invites
  inviteMembers,
  listInvites,
  resendInvite,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
  getRegistrationStatus,
} = require('../controllers/memberController');
const upload = require('../middleware/uploadMiddleware');
const {
  setTransactionPin,
  verifyTransactionPin,
  requestPinResetOtp,
  verifyPinResetOtp,
  getPinStatus,
} = require('../controllers/transactionPinController');
const {
  getMemberCalendarEvents,
} = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');
const { requireRecentAuth } = require('../middleware/stepUpMiddleware');
const { memberValidation } = require('../middleware/validationMiddleware');
const { idempotency } = require('../middleware/idempotency');

// Public routes
router.post('/self-register', memberValidation, selfRegister);

// Public self-registration status check (polling fallback for the /join screen).
router.get('/registration-status/:memberId', getRegistrationStatus);

// Public invite lookup + acceptance (tokenized link, no auth). Mounted before
// the global `protect` so prospective members can complete onboarding.
router.get('/invite/:token', getInviteByToken);
router.post('/invite/:token/accept', acceptInvite);

// Member Portal Specific Routes (Self-access) - Defined BEFORE global staff protection
router.get('/portal/activity', protectMember, getMemberActivity);
router.get('/portal/shares', protectMember, getPortalShares);
router.post('/portal/transfer', protectMember, idempotency, requireTransactionPin, transferFunds);
router.post('/portal/raast-deposit', protectMember, idempotency, requireTransactionPin, initiateRaastDeposit);
router.get('/portal/lookup', protectMember, lookupMember); // Member can lookup peers
router.get('/portal/calendar', protectMember, getMemberCalendarEvents);
router.get('/portal/account-statement', protectMember, getAccountStatement);

// Transaction PIN routes
router.get('/portal/pin-status', protectMember, getPinStatus);
router.post('/portal/set-pin', protectMember, setTransactionPin);
router.post('/portal/verify-pin', protectMember, verifyTransactionPin);
router.post('/portal/pin-reset-otp', protectMember, requestPinResetOtp);
router.post('/portal/pin-reset-verify', protectMember, verifyPinResetOtp);

router.get('/lookup', protect, lookupMember); // Admin can lookup members

// All subsequent routes require staff/admin authentication
router.use(protect);

// Bulk import members from CSV (Admin/Staff)
router.post('/bulk-import', csvUpload.single('file'), bulkImportMembers);

// Member invites (Admin/Staff). Custom-action routes registered BEFORE `/:id`
// so the literal segments aren't swallowed by the id matcher.
router.post('/invite', inviteMembers);
router.get('/invites', listInvites);
router.post('/invites/:id/resend', resendInvite);
router.delete('/invites/:id', revokeInvite);

// Member CRUD (Admin/Staff only)
router.get('/', getMembers);
router.put('/:id/approval', updateApprovalStatus);
router.get('/distributions', getAllDistributions); // Move above :id
router.get('/:id', getMemberById);
router.post('/', memberValidation, createMember);
router.post('/convert', convertCustomerToMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);
router.post('/admin/transfer', requireRecentAuth(), idempotency, adminTransferFunds);
router.post('/admin/transfer-share', requireRecentAuth(), idempotency, transferShareBetweenMembers);
router.post('/recalculate-balance', recalculateBalance); // Fix stale balances

// Account statement (current/saving) — monthly PDF source data
router.get('/:id/account-statement', getAccountStatement);

// Per-member audit timeline (who did what, when)
router.get('/:id/audit-log', getMemberAuditLog);

// KYC documents — upload, verify/reject, delete
router.post(
  '/:id/documents',
  upload.array('documents', 5),
  uploadMemberDocuments,
);
router.patch('/:id/documents/:docId', updateMemberDocumentStatus);
router.delete('/:id/documents/:docId', deleteMemberDocument);

// Investment management (main balance — auto loan deduction applies on deposit)
router.get('/:id/investments', getMemberInvestments);
router.post('/:id/invest', idempotency, addInvestment);
router.post('/:id/withdraw', requireRecentAuth(), idempotency, withdrawInvestment);

// Profit management
router.get('/:id/profits', getMemberProfits);
router.post('/distribute-profit', requireRecentAuth(), idempotency, distributeProfit);

// Business Share management (separate from main balance — no auto loan deduction)
router.get('/:id/shares', getMemberShares);
router.post('/:id/share-invest', idempotency, addShareInvestment);
router.post('/:id/share-withdraw', requireRecentAuth(), idempotency, withdrawShareInvestment);
router.post('/distribute-share-profit', requireRecentAuth(), idempotency, distributeShareProfit);

module.exports = router;
