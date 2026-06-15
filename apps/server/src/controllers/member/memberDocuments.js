const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const BusinessShare = require('../../models/BusinessShare');
const ProfitDistribution = require('../../models/ProfitDistribution');
const FinancialTransaction = require('../../models/FinancialTransaction');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Repayment = require('../../models/Repayment');
const ActivityLog = require('../../models/ActivityLog');
const loanRepaymentService = require('../../services/loanRepaymentService');
const Loan = require('../../models/Loan');
const Checkbook = require('../../models/Checkbook');
const { canAddMember } = require('../../utils/planLimits');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const {
  deleteCloudinaryFileByUrl,
  uploadSignature,
} = require('../../utils/cloudinaryHelper');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const raastService = require('../../services/raastService');
const {
  transactionEmail,
  memberApprovalEmail,
} = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const Branch = require('../../models/Branch');
const { updateMemberCreditLimit } = require('../../services/creditLimitService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { escapeRegExp } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

// ── Member Documents (KYC: CNIC / Selfie / Proof of Address / etc.) ─────────
// Multipart upload helper — multer's req.files is already in Cloudinary by
// the time the handler runs (uploadMiddleware uses generalStorage). The
// handler just appends to the member's documents array with the chosen
// type and optional expiry date. Status defaults to Pending so the
// verification queue picks it up.
const uploadMemberDocuments = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const ALLOWED_TYPES = [
      'CNIC',
      'Selfie',
      'Utility Bill',
      'Tax Return',
      'Proof of Residence',
      'Other',
    ];
    const docType = ALLOWED_TYPES.includes(req.body.type)
      ? req.body.type
      : 'Other';
    let expiryDate = null;
    if (req.body.expiryDate) {
      const d = new Date(req.body.expiryDate);
      if (!Number.isNaN(d.getTime())) expiryDate = d;
    }

    const newDocs = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      type: docType,
      expiryDate,
      status: 'Pending',
    }));
    member.documents.push(...newDocs);
    await member.save();

    // Also mirror onto the linked Customer record (Customer is the
    // canonical KYC entity in this codebase; Member.documents is the
    // member-facing view). Existing customerController.uploadDocuments
    // mirrors the opposite direction; we match that pattern.
    if (member.customer) {
      const Customer = require('../../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        customer.documents.push(...newDocs);
        await customer.save();
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_uploaded',
      category: 'member',
      details: `Uploaded ${newDocs.length} ${docType} document(s) for member: ${member.name}`,
      metadata: { memberId: member._id, type: docType, count: newDocs.length },
      req,
    });

    return res.status(201).json({ documents: member.documents });
  } catch (error) {
    console.error('Upload Member Documents Error:', error);
    res.status(500).json({ message: 'Failed to upload documents' });
  }
};

// PATCH status: Verified | Rejected | Pending. Verified stamps verifiedAt;
// Rejected stores an optional `rejectionReason` to relay back to the member.
const updateMemberDocumentStatus = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id, docId } = req.params;
    const { status, rejectionReason } = req.body || {};

    if (!['Pending', 'Verified', 'Rejected', 'Expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const doc = member.documents.id(docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.status = status;
    if (status === 'Verified') {
      doc.verifiedAt = new Date();
      doc.rejectionReason = '';
    }
    if (status === 'Rejected') {
      doc.rejectionReason = (rejectionReason || '').slice(0, 500);
      doc.verifiedAt = undefined;
    }
    await member.save();

    // Keep the Customer record in lockstep — it's the source of truth for
    // KYC and feeds the legacy customer-side verification queue.
    if (member.customer) {
      const Customer = require('../../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        const mirror = customer.documents.id(docId);
        if (mirror) {
          mirror.status = status;
          if (status === 'Verified') mirror.verifiedAt = doc.verifiedAt;
          if (status === 'Rejected') mirror.rejectionReason = doc.rejectionReason;
          await customer.save();
        }
      }
    }

    // Notify the member when a doc is approved or rejected so they don't
    // need to refresh to find out.
    try {
      const { createTransactionNotification } = require('../../utils/notificationHelper');
      if (status === 'Verified' || status === 'Rejected') {
        await createTransactionNotification({
          recipientId: member._id,
          title: status === 'Verified' ? 'Document approved' : 'Document rejected',
          message:
            status === 'Verified'
              ? `Your ${doc.type} document has been approved.`
              : `Your ${doc.type} was rejected${doc.rejectionReason ? `: ${doc.rejectionReason}` : '.'}`,
          type: status === 'Verified' ? 'success' : 'warning',
          branchId: member.branchId,
          action: 'document_status_change',
          metadata: { docId, type: doc.type, status, link: '/member/dashboard' },
        });
      }
    } catch (notifyErr) {
      console.warn('[Documents] Notification failed:', notifyErr.message);
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_status_updated',
      category: 'member',
      details: `Document "${doc.name}" set to ${status} for member: ${member.name}`,
      metadata: { memberId: member._id, docId, status },
      req,
    });

    return res.json({ document: doc });
  } catch (error) {
    console.error('Update Member Doc Status Error:', error);
    res.status(500).json({ message: 'Failed to update document status' });
  }
};

const deleteMemberDocument = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id, docId } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const doc = member.documents.id(docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try {
      if (doc.url) await deleteCloudinaryFileByUrl(doc.url, 'file');
    } catch (cleanupErr) {
      console.warn('[Documents] Cloudinary cleanup failed:', cleanupErr.message);
    }

    member.documents = member.documents.filter(
      (d) => d._id.toString() !== docId,
    );
    await member.save();

    if (member.customer) {
      const Customer = require('../../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        customer.documents = customer.documents.filter(
          (d) => d._id.toString() !== docId,
        );
        await customer.save();
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_deleted',
      category: 'member',
      details: `Deleted document "${doc.name}" for member: ${member.name}`,
      metadata: { memberId: member._id, docId, type: doc.type },
      req,
    });

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete Member Doc Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// ── Audit Log (Per-Member Activity Timeline) ────────────────────────────────
// Returns the ActivityLog records that explicitly reference this member via
// `metadata.memberId`. Different controllers stamp memberId as either a raw
// ObjectId or a stringified one (see e.g. termDepositController.js:539),
// so we match both forms.
const getMemberAuditLog = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const member = await Member.findOne({ _id: id, user: userId }).select('_id');
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const skip = (page - 1) * limit;

    let memberOid;
    try {
      memberOid = new mongoose.Types.ObjectId(id);
    } catch {
      memberOid = null;
    }

    const ActivityLog = require('../../models/ActivityLog');
    const query = {
      $or: [
        { 'metadata.memberId': id },
        ...(memberOid ? [{ 'metadata.memberId': memberOid }] : []),
      ],
    };

    // Staff are confined to their own branch — actions on this member from
    // outside that branch shouldn't appear in their view.
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) query.branchId = scope;
    }

    const [total, logs] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.find(query)
        .populate('user', 'name email role profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Member Audit Log Error:', error);
    res.status(500).json({ message: 'Failed to load audit log' });
  }
};

// ── Account Statement (Current / Saving) ────────────────────────────────────
// Returns opening balance, period transactions with running balance, and
// closing balance for a single account (current or saving). Period defaults
// to the previous calendar month if from/to are omitted — matching the
// "monthly statement" mental model.
//
// Works for both staff/admin (uses req.params.id + req.user.effectiveOwnerId)
// and the member portal (no :id param — uses req.member).
const getAccountStatement = async (req, res) => {
  try {
    const isPortal = !!req.member;
    const memberId = isPortal ? req.member._id : req.params.id;
    const ownerId = isPortal ? req.member.user : req.user.effectiveOwnerId;

    const accountType = (req.query.accountType || 'current').toLowerCase();
    if (!['current', 'saving'].includes(accountType)) {
      return res.status(400).json({ message: 'Invalid accountType' });
    }

    // Default period = previous calendar month
    let fromDate;
    let toDate;
    if (req.query.from && req.query.to) {
      fromDate = new Date(req.query.from);
      toDate = new Date(req.query.to);
      // Make `to` inclusive — push to end of day if a bare date was sent
      if (req.query.to.length === 10) toDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: 'Invalid from/to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ message: '`from` must be before `to`' });
    }

    const member = await Member.findOne({ _id: memberId, user: ownerId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Sign convention for each Investment type
    const signFor = (t) =>
      t === 'deposit' ||
      t === 'transfer_receive' ||
      t === 'profit' ||
      t === 'loan_disbursement'
        ? 1
        : -1;

    const baseQuery = {
      member: member._id,
      user: ownerId,
      accountType,
      status: { $ne: 'Reversed' },
    };

    const [priorTxns, periodTxns] = await Promise.all([
      Investment.find({ ...baseQuery, date: { $lt: fromDate } })
        .select('type amount date')
        .lean(),
      Investment.find({ ...baseQuery, date: { $gte: fromDate, $lte: toDate } })
        .sort({ date: 1, createdAt: 1 })
        .lean(),
    ]);

    const opening = priorTxns.reduce(
      (sum, t) => sum + signFor(t.type) * t.amount,
      0,
    );

    let running = opening;
    let totalCredits = 0;
    let totalDebits = 0;
    const transactions = periodTxns.map((t) => {
      const direction = signFor(t.type);
      const signed = direction * t.amount;
      running += signed;
      if (direction > 0) totalCredits += t.amount;
      else totalDebits += t.amount;
      return {
        _id: t._id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        direction: direction > 0 ? 'credit' : 'debit',
        description: t.description || '',
        balanceAfter: running,
      };
    });

    const accountNumber =
      accountType === 'current'
        ? member.currentAccountNumber
        : member.savingAccountNumber;
    const currentBalance =
      accountType === 'current' ? member.currentBalance : member.savingBalance;

    return res.json({
      account: {
        type: accountType,
        number: accountNumber || null,
        holderName: member.name,
        memberId: member._id,
        currentBalance,
      },
      period: { from: fromDate, to: toDate },
      opening,
      closing: running,
      totals: {
        credits: totalCredits,
        debits: totalDebits,
        net: totalCredits - totalDebits,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (error) {
    console.error('Account Statement Error:', error);
    res.status(500).json({ message: 'Failed to generate account statement' });
  }
};

module.exports = {
  uploadMemberDocuments,
  updateMemberDocumentStatus,
  deleteMemberDocument,
  getMemberAuditLog,
  getAccountStatement,
};
