const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Customer = require('../models/Customer');
const FinancialTransaction = require('../models/FinancialTransaction');
const Notification = require('../models/Notification');
const { logActivity } = require('./activityLogController');
const { createTransactionNotification } = require('../utils/notificationHelper');

const HARD_CAP = 500;

const buildTenantScope = (req) => {
  const scope = { user: req.user.effectiveOwnerId };
  if (req.user.role === 'staff') {
    const branchScope = req.user.managedBranchId || req.user.branchId;
    if (branchScope) scope.branchId = branchScope;
  }
  return scope;
};

/**
 * @desc    Preview a bulk operation before committing — counts, totals, sample rows.
 * @route   POST /api/bulk-ops/preview
 * @access  Private (Admin)
 *
 * Body: { operation, filter }
 *   operation: 'approve_loans' | 'notify_members'
 *   filter: operation-specific (see handlers below)
 *
 * Returns: { count, sample, totals, capExceeded }
 */
const previewBulkOperation = async (req, res) => {
  try {
    const { operation, filter = {} } = req.body || {};
    const scope = buildTenantScope(req);

    if (operation === 'approve_loans') {
      const q = { ...scope, status: 'pending' };
      if (filter.branchId) q.branchId = filter.branchId;
      if (filter.maxPrincipal) q.principal = { $lte: Number(filter.maxPrincipal) };
      if (Array.isArray(filter.loanIds) && filter.loanIds.length > 0) {
        q._id = { $in: filter.loanIds };
      }

      const loans = await Loan.find(q)
        .select('principal customer createdAt rate duration')
        .populate('customer', 'name accountNumber')
        .sort({ createdAt: -1 })
        .limit(HARD_CAP)
        .lean();

      const totalCount = await Loan.countDocuments(q);
      const totalPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);

      return res.json({
        operation,
        count: loans.length,
        totalCount,
        capExceeded: totalCount > HARD_CAP,
        totals: { disbursement: totalPrincipal },
        sample: loans.slice(0, 10).map((l) => ({
          _id: l._id,
          customerName: l.customer?.name || 'Unknown',
          accountNumber: l.customer?.accountNumber || '',
          principal: l.principal,
          rate: l.rate,
          duration: l.duration,
          createdAt: l.createdAt,
        })),
      });
    }

    if (operation === 'notify_members') {
      const q = { ...scope };
      if (filter.scope === 'active') q.status = 'Active';
      if (filter.scope === 'branch' && filter.branchId) q.branchId = filter.branchId;
      if (filter.scope === 'ids' && Array.isArray(filter.memberIds)) {
        q._id = { $in: filter.memberIds };
      }

      const totalCount = await Member.countDocuments(q);
      const sample = await Member.find(q)
        .select('name email accountNumber')
        .limit(10)
        .lean();

      return res.json({
        operation,
        count: Math.min(totalCount, HARD_CAP),
        totalCount,
        capExceeded: totalCount > HARD_CAP,
        totals: {},
        sample,
      });
    }

    return res.status(400).json({ message: 'Unknown operation' });
  } catch (error) {
    console.error('Bulk Preview Error:', error);
    res.status(500).json({ message: 'Preview failed' });
  }
};

/**
 * @desc    Bulk-approve pending loans. Disburses each loan's principal and
 *          notifies the borrower. Loans with missing terms are skipped (not
 *          failed) so the operator can fix them individually.
 * @route   POST /api/bulk-ops/approve-loans
 * @access  Private (Admin)
 */
const bulkApproveLoans = async (req, res) => {
  try {
    const { filter = {}, confirm } = req.body || {};
    if (!confirm) {
      return res.status(400).json({ message: 'confirm=true is required' });
    }

    const scope = buildTenantScope(req);
    const q = { ...scope, status: 'pending' };
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.maxPrincipal) q.principal = { $lte: Number(filter.maxPrincipal) };
    if (Array.isArray(filter.loanIds) && filter.loanIds.length > 0) {
      q._id = { $in: filter.loanIds };
    }

    const loans = await Loan.find(q)
      .populate('customer', 'name memberId branchId')
      .limit(HARD_CAP);

    const results = { approved: 0, skipped: 0, failed: 0, errors: [] };
    const now = new Date();

    for (const loan of loans) {
      try {
        if (!loan.rate || !loan.duration || !loan.emi || loan.emi <= 0) {
          results.skipped += 1;
          continue;
        }

        loan.status = 'active';
        loan.approvedBy = req.user._id;
        loan.approvedAt = now;
        if (!loan.startDate) loan.startDate = now;
        await loan.save();

        await FinancialTransaction.create({
          user: req.user.effectiveOwnerId,
          branchId: loan.branchId || loan.customer?.branchId,
          type: 'loan',
          category: 'loan_disbursement',
          amount: loan.principal,
          date: now,
          description: `Bulk-approved loan for ${loan.customer?.name || 'customer'}`,
          customer: loan.customer?._id,
          member: loan.customer?.memberId || null,
          referenceId: loan._id,
          referenceModel: 'Loan',
          paymentMethod: 'online',
        });

        // Notify borrower (if linked to a Member account)
        if (loan.customer?.memberId) {
          try {
            await createTransactionNotification({
              recipientId: loan.customer.memberId,
              title: 'Loan Approved',
              message: `Your loan of ${loan.principal.toLocaleString()} has been approved and disbursed.`,
              type: 'success',
              branchId: loan.branchId,
              action: 'loan_approved',
            });
          } catch (e) {
            console.error('[BulkApprove] notify error:', e.message);
          }
        }

        results.approved += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ loanId: loan._id, message: err.message });
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'bulk_loan_approval',
      category: 'loan',
      details: `Bulk-approved ${results.approved} loan(s); ${results.skipped} skipped, ${results.failed} failed`,
      metadata: results,
      req,
    });

    res.json(results);
  } catch (error) {
    console.error('Bulk Approve Loans Error:', error);
    res.status(500).json({ message: 'Bulk approval failed' });
  }
};

/**
 * @desc    Bulk in-app notification blast to a member segment. The existing
 *          /communication/bulk-email-members handles email; this is the
 *          push-notification counterpart (faster, free, no SMTP quota).
 * @route   POST /api/bulk-ops/notify-members
 * @access  Private (Admin)
 */
const bulkNotifyMembers = async (req, res) => {
  try {
    const { filter = {}, title, message, type = 'info', confirm } = req.body || {};
    if (!confirm) {
      return res.status(400).json({ message: 'confirm=true is required' });
    }
    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }
    if (title.length > 200 || message.length > 2000) {
      return res.status(400).json({ message: 'title or message exceeds length limit' });
    }

    const scope = buildTenantScope(req);
    const q = { ...scope };
    if (filter.scope === 'active') q.status = 'Active';
    if (filter.scope === 'branch' && filter.branchId) q.branchId = filter.branchId;
    if (filter.scope === 'ids' && Array.isArray(filter.memberIds)) {
      q._id = { $in: filter.memberIds };
    }

    const members = await Member.find(q).select('_id branchId').limit(HARD_CAP).lean();

    if (members.length === 0) {
      return res.json({ sent: 0, total: 0 });
    }

    const docs = members.map((m) => ({
      recipient: m._id,
      recipientModel: 'Member',
      title,
      message,
      type,
      action: 'admin_announcement',
      branchId: m.branchId,
    }));

    await Notification.insertMany(docs, { ordered: false });

    await logActivity({
      userId: req.user._id,
      action: 'bulk_member_notification',
      category: 'system',
      details: `Bulk notification "${title}" sent to ${members.length} member(s)`,
      metadata: { count: members.length, type },
      req,
    });

    res.json({ sent: members.length, total: members.length });
  } catch (error) {
    console.error('Bulk Notify Members Error:', error);
    res.status(500).json({ message: 'Bulk notification failed' });
  }
};

module.exports = {
  previewBulkOperation,
  bulkApproveLoans,
  bulkNotifyMembers,
};
