const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Repayment = require('../models/Repayment');
const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const { logActivity } = require('./activityLogController');

// @desc    Get all financial transactions (Unified Ledger)
// @route   GET /api/ledger
// @access  Private
const getLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      startDate,
      endDate,
      type,
      category,
      member,
      customer,
      sortBy = 'date',
      sortOrder: sortOrderQuery,
    } = req.query;
    const sortOrder = sortOrderQuery === 'asc' ? 1 : -1;

    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Force UTC parsing to ensure consistent calendar date matching regardless of server timezone
        const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
        query.date.$lte = end;
      }
    }

    // Branch Segregation: Staff/Managers only see their branch data
    if (req.user.role === 'staff' && !member && !customer) {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (type) query.type = type;
    if (category) query.category = category;
    
    if (member) {
      const memberDoc = await Member.findById(member).select('customer');
      if (memberDoc?.customer) {
        query.$or = [{ member: member }, { customer: memberDoc.customer }];
      } else {
        query.member = member;
      }
    } else if (customer) {
      query.customer = customer;
    }

    // Search logic (complex because of customer/member names)
    if (search) {
      const [matchingCustomers, matchingMembers] = await Promise.all([
        Customer.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
        Member.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
      ]);

      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { customer: { $in: matchingCustomers.map((c) => c._id) } },
        { member: { $in: matchingMembers.map((m) => m._id) } },
      ];
    }

    const totalEntries = await FinancialTransaction.countDocuments(query);
    const transactions = await FinancialTransaction.find(query)
      .populate('customer', 'name email')
      .populate('member', 'name email')
      .populate('loan', 'principal totalAmount Status')
      .populate('referenceId', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Calculate full summary ignoring pagination but respecting search/date filters
    // Also include 'date' so we can sort chronologically for running total computation
    const allMatching =
      await FinancialTransaction.find(query).select('type category amount date');
    
    const isIncome = (t) => {
      const type = (t.type || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return type === 'income' || cat.includes('repayment') || cat.includes('deposit');
    };

    const summary = allMatching.reduce((acc, t) => {
      const type = (t.type || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const amt = t.amount || 0;

      if (type === 'income' || cat.includes('repayment') || cat.includes('deposit')) {
        acc.totalIncome += amt;
      } else if (type === 'expense' || type === 'loan' || cat.includes('withdrawal') || cat.includes('disbursement')) {
        acc.totalExpense += amt;
      }
      return acc;
    }, { totalIncome: 0, totalExpense: 0, totalTransactions: totalEntries });

    // Calculate priorPageBalance: the cumulative running total of all transactions
    // that are chronologically BEFORE this page's transactions.
    // Sort all matching transactions chronologically (ascending by date).
    allMatching.sort((a, b) => new Date(a.date) - new Date(b.date));

    // For descending sort (newest first): older txns are on later pages.
    //   The chronologically-prior count = totalEntries - skip - limit
    // For ascending sort (oldest first): older txns are on earlier pages.
    //   The chronologically-prior count = skip
    const currentPageSize = Math.min(limit, Math.max(0, totalEntries - skip));
    const chronoPriorCount = sortOrder === -1
      ? Math.max(0, totalEntries - skip - currentPageSize)
      : skip;

    let priorPageBalance = 0;
    for (let i = 0; i < chronoPriorCount && i < allMatching.length; i++) {
      const t = allMatching[i];
      const amt = t.amount || 0;
      priorPageBalance += isIncome(t) ? amt : -amt;
    }

    res.json({
      data: transactions,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      summary,
      priorPageBalance,
    });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ message: 'Failed to fetch financial ledger' });
  }
};

const excel = require('exceljs');

const exportLedgerExcel = async (req, res) => {
  try {
    const {
      search,
      startDate,
      endDate,
      type,
      category,
      sortBy = 'date',
      sortOrder: sortOrderQuery,
    } = req.query;
    const sortOrder = sortOrderQuery === 'asc' ? 1 : -1;

    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (type) query.type = type;
    if (category) query.category = category;

    if (search) {
      const { Customer, Member } = require('../models');
      const [matchingCustomers, matchingMembers] = await Promise.all([
        Customer.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
        Member.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
      ]);

      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { customer: { $in: matchingCustomers.map((c) => c._id) } },
        { member: { $in: matchingMembers.map((m) => m._id) } },
      ];
    }

    const transactions = await FinancialTransaction.find(query)
      .populate('customer', 'name email')
      .populate('member', 'name email')
      .populate('loan', 'principal totalAmount status')
      .sort({ [sortBy]: sortOrder });

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (PKR)', key: 'amount', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Entity (Customer/Member)', key: 'entity', width: 30 },
      { header: 'Reference ID', key: 'reference', width: 25 },
    ];

    // Add rows
    transactions.forEach((t) => {
      worksheet.addRow({
        date: new Date(t.date).toLocaleDateString(),
        type: t.type ? t.type.toUpperCase() : 'N/A',
        category: t.category || 'N/A',
        amount: t.amount || 0,
        description: t.description || 'N/A',
        entity: t.customer?.name || t.member?.name || 'N/A',
        reference: t.reference || 'N/A',
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Ledger Export Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to export financial ledger to Excel' });
  }
};

// @desc    Reverse a financial transaction
// @route   POST /api/ledger/:id/reverse
// @access  Private (Admin/Manager only)
const reverseTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ message: 'A reason for reversal is required (min 3 characters)' });
    }

    // 1. Find the original transaction
    const originalTx = await FinancialTransaction.findById(id)
      .populate('customer', 'name memberId')
      .populate('member', 'name');

    if (!originalTx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Authorization check
    if (
      !req.user.isSuperAdmin &&
      originalTx.user.toString() !== req.user.effectiveOwnerId.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to reverse this transaction' });
    }

    // 2. Check if already reversed
    if (originalTx.status === 'Reversed') {
      return res.status(400).json({ message: 'This transaction has already been reversed' });
    }

    if (originalTx.status !== 'Completed') {
      return res.status(400).json({ message: 'Only completed transactions can be reversed' });
    }

    // 3. Block reversal for loan disbursements and profit distributions
    const nonReversibleCategories = ['loan_disbursement', 'profit_distribution'];
    if (nonReversibleCategories.includes(originalTx.category)) {
      return res.status(400).json({
        message: `${originalTx.category.replace('_', ' ')} transactions cannot be reversed as they involve complex lifecycle changes.`,
      });
    }

    const amount = originalTx.amount;

    // 4. Undo side effects based on category
    // ── REPAYMENT ──
    if (originalTx.category === 'repayment' && originalTx.loan) {
      // Restore loan balances
      const loan = await Loan.findById(originalTx.loan);
      if (loan) {
        const wasCompleted = loan.status === 'completed';
        await Loan.findByIdAndUpdate(loan._id, {
          $inc: {
            paidAmount: -amount,
            remainingAmount: amount,
          },
          ...(wasCompleted ? { status: 'active' } : {}),
        });
      }

      // Mark the Repayment record as Reversed
      if (originalTx.referenceId) {
        await Repayment.findByIdAndUpdate(originalTx.referenceId, {
          status: 'Reversed',
        });
      }

      // Restore member balance (repayments deduct from member balance)
      if (originalTx.customer?.memberId) {
        await Member.findByIdAndUpdate(originalTx.customer.memberId, {
          $inc: {
            currentBalance: amount,
            totalWithdrawn: -amount,
          },
        });

        // Mark the withdrawal Investment record as Reversed
        if (originalTx.referenceId) {
          await Investment.findOneAndUpdate(
            {
              member: originalTx.customer.memberId,
              type: 'withdrawal',
              amount: amount,
              description: { $regex: originalTx.loan.toString().slice(-6), $options: 'i' },
            },
            { status: 'Reversed' },
            { sort: { createdAt: -1 } },
          );
        }
      }
    }

    // ── INVESTMENT / SAVING DEPOSIT ──
    if (['investment', 'saving_deposit'].includes(originalTx.category) && originalTx.member) {
      const isSaving = originalTx.category === 'saving_deposit';
      const decFields = isSaving
        ? { savingBalance: -amount, totalSavingDeposited: -amount }
        : { currentBalance: -amount, totalInvested: -amount };

      await Member.findByIdAndUpdate(originalTx.member, { $inc: decFields });

      // Mark the Investment record as Reversed
      if (originalTx.referenceId) {
        await Investment.findByIdAndUpdate(originalTx.referenceId, {
          status: 'Reversed',
        });
      }
    }

    // ── WITHDRAWAL / SAVING WITHDRAWAL ──
    if (['withdrawal', 'saving_withdrawal'].includes(originalTx.category) && originalTx.member) {
      const isSaving = originalTx.category === 'saving_withdrawal';
      const restoreFields = isSaving
        ? { savingBalance: amount, totalSavingWithdrawn: -amount }
        : { currentBalance: amount, totalWithdrawn: -amount };

      await Member.findByIdAndUpdate(originalTx.member, { $inc: restoreFields });

      // Mark the Investment record as Reversed
      if (originalTx.referenceId) {
        await Investment.findByIdAndUpdate(originalTx.referenceId, {
          status: 'Reversed',
        });
      }
    }

    // 5. Create counter-entry (reversal transaction)
    const reversalTx = await FinancialTransaction.create({
      user: originalTx.user,
      branchId: originalTx.branchId,
      type: originalTx.type === 'income' ? 'expense' : 'income',
      category: originalTx.category,
      amount: amount,
      date: new Date(),
      status: 'Completed',
      description: `[REVERSAL] ${originalTx.description || originalTx.category} — Reason: ${reason}`,
      customer: originalTx.customer?._id || originalTx.customer,
      member: originalTx.member?._id || originalTx.member,
      loan: originalTx.loan,
      originalTransaction: originalTx._id,
    });

    // 6. Mark original as Reversed
    originalTx.status = 'Reversed';
    originalTx.reversedAt = new Date();
    originalTx.reversedBy = req.user._id;
    originalTx.reversalReason = reason;
    originalTx.reversalTransaction = reversalTx._id;
    await originalTx.save();

    // 7. Log activity
    await logActivity({
      userId: req.user._id,
      action: 'transaction_reversed',
      category: 'transaction',
      details: `Reversed ${originalTx.category} transaction of ${amount} — Reason: ${reason}`,
      metadata: {
        originalTransactionId: originalTx._id,
        reversalTransactionId: reversalTx._id,
        amount,
        category: originalTx.category,
        reason,
      },
      req,
    });

    res.json({
      message: 'Transaction reversed successfully',
      originalTransaction: originalTx,
      reversalTransaction: reversalTx,
    });
  } catch (error) {
    console.error('Reverse Transaction Error:', error);
    res.status(500).json({ message: 'Failed to reverse transaction' });
  }
};

module.exports = {
  getLedger,
  exportLedgerExcel,
  reverseTransaction,
};
