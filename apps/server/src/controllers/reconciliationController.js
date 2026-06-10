const Member = require('../models/Member');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');
const BusinessShare = require('../models/BusinessShare');
const CashOpening = require('../models/CashOpening');
const Branch = require('../models/Branch');
const { isOperatingExpense } = require('../utils/reportUtils');

// NOTE: Per-member ledger rebuild is now done in-line inside
// `resolveMemberBalances` (bulk path) and `runMemberBalanceReconcile` (nightly
// cron). Both paths use aggregation + bulkWrite so we don't issue 10k separate
// per-member queries.

// ══════════════════════════════════════════════════════════════════════════════
// @desc    Full-featured Reconciliation Engine
// @route   GET /api/reports/reconciliation
// @access  Private (Admin / Staff with view_reports)
// ══════════════════════════════════════════════════════════════════════════════
const getReconciliation = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    // Branch segregation for staff
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // Date range filtering (optional)
    const { startDate, endDate } = req.query;
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) {
      dateRange.end = new Date(endDate);
      dateRange.end.setHours(23, 59, 59, 999);
    }

    // Run all checks in parallel for performance
    const [
      memberBalanceResult,
      loanLedgerResult,
      cashPositionResult,
      transactionIntegrityResult,
      savingShareResult,
    ] = await Promise.all([
      reconcileMemberBalances(query, dateRange),
      reconcileLoanLedger(query, dateRange),
      reconcileCashPosition(query, req.user, dateRange),
      reconcileTransactionIntegrity(query, dateRange),
      reconcileSavingShareAccounts(query, dateRange),
    ]);

    // Build summary
    const checks = [
      memberBalanceResult,
      loanLedgerResult,
      cashPositionResult,
      transactionIntegrityResult,
      savingShareResult,
    ];

    const passed = checks.filter((c) => c.status === 'pass').length;
    const failed = checks.filter((c) => c.status === 'fail').length;
    const totalDiscrepancies = checks.reduce((sum, c) => sum + (c.discrepancies?.length || 0), 0);
    const totalDiscrepancyAmount = checks.reduce(
      (sum, c) =>
        sum +
        (c.discrepancies || []).reduce((s, d) => s + Math.abs(d.diff || d.amount || 0), 0),
      0,
    );

    res.status(200).json({
      generatedAt: new Date(),
      summary: {
        totalChecks: 5,
        passed,
        failed,
        totalDiscrepancies,
        totalDiscrepancyAmount: Math.round(totalDiscrepancyAmount),
      },
      memberBalance: memberBalanceResult,
      loanLedger: loanLedgerResult,
      cashPosition: cashPositionResult,
      transactionIntegrity: transactionIntegrityResult,
      savingShareAccounts: savingShareResult,
    });
  } catch (error) {
    console.error('Reconciliation Engine Error:', error);
    res.status(500).json({ message: 'Failed to run reconciliation' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// CHECK 1: Member Balance Reconciliation
// Verifies stored currentBalance matches transaction-derived balance
// ──────────────────────────────────────────────────────────────────────────────
async function reconcileMemberBalances(query, dateRange = {}) {
  try {
    const members = await Member.find(query).select(
      'name currentBalance totalInvested totalLoanProceeds totalWithdrawn totalProfit branchId',
    );

    const discrepancies = [];
    let checked = 0;

    for (const member of members) {
      checked++;
      // Expected balance: totalInvested + totalLoanProceeds − totalWithdrawn + totalProfit
      const expected =
        (member.totalInvested || 0) +
        (member.totalLoanProceeds || 0) -
        (member.totalWithdrawn || 0) +
        (member.totalProfit || 0);
      const actual = member.currentBalance || 0;
      const diff = Math.round(expected - actual);

      if (Math.abs(diff) > 1) {
        discrepancies.push({
          memberId: member._id,
          memberName: member.name || 'Unknown',
          expected: Math.round(expected),
          actual: Math.round(actual),
          diff,
          branchId: member.branchId,
        });
      }
    }

    return {
      label: 'Member Balance',
      description: 'Verifies stored balance matches deposit − withdrawal + profit',
      status: discrepancies.length === 0 ? 'pass' : 'fail',
      checked,
      matched: checked - discrepancies.length,
      discrepancies,
    };
  } catch (error) {
    console.error('Member Balance Reconciliation Error:', error);
    return {
      label: 'Member Balance',
      description: 'Verifies stored balance matches deposit − withdrawal + profit',
      status: 'error',
      checked: 0,
      matched: 0,
      discrepancies: [],
      error: error.message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CHECK 2: Loan Ledger Reconciliation
// Verifies loan.paidAmount matches sum of Repayments, and
// paidAmount + remainingAmount ≈ totalAmount
// ──────────────────────────────────────────────────────────────────────────────
async function reconcileLoanLedger(query, dateRange = {}) {
  try {
    const loanQuery = { ...query, status: { $ne: 'rejected' } };
    if (dateRange.start || dateRange.end) {
      loanQuery.createdAt = {};
      if (dateRange.start) loanQuery.createdAt.$gte = dateRange.start;
      if (dateRange.end) loanQuery.createdAt.$lte = dateRange.end;
    }
    const loans = await Loan.find(loanQuery)
      .select('principal totalAmount paidAmount remainingAmount status customer branchId')
      .populate('customer', 'name');

    // Aggregate repayments per loan
    const repaymentAgg = await Repayment.aggregate([
      { $match: { ...query, status: { $ne: 'Reversed' } } },
      { $group: { _id: '$loan', totalRepaid: { $sum: '$amount' } } },
    ]);

    const repaymentMap = {};
    repaymentAgg.forEach((r) => {
      repaymentMap[r._id.toString()] = r.totalRepaid;
    });

    const discrepancies = [];
    let checked = 0;

    for (const loan of loans) {
      checked++;
      const loanId = loan._id.toString();
      const repaidFromRecords = repaymentMap[loanId] || 0;
      const storedPaid = loan.paidAmount || 0;

      // Check 1: Repayment records vs stored paidAmount
      const repaymentDiff = Math.round(repaidFromRecords - storedPaid);
      if (Math.abs(repaymentDiff) > 1) {
        discrepancies.push({
          loanId: loan._id,
          customerName: loan.customer?.name || 'Unknown',
          type: 'repayment_mismatch',
          expected: Math.round(repaidFromRecords),
          actual: Math.round(storedPaid),
          diff: repaymentDiff,
          description: 'Sum of repayment records ≠ stored paidAmount',
          branchId: loan.branchId,
        });
      }

      // Check 2: paidAmount + remainingAmount should ≈ totalAmount (+ lateFees/compound)
      const balanceDiff = Math.round(
        (loan.paidAmount || 0) + (loan.remainingAmount || 0) - (loan.totalAmount || 0),
      );
      if (Math.abs(balanceDiff) > 1 && loan.status !== 'completed') {
        discrepancies.push({
          loanId: loan._id,
          customerName: loan.customer?.name || 'Unknown',
          type: 'balance_equation',
          expected: Math.round(loan.totalAmount || 0),
          actual: Math.round((loan.paidAmount || 0) + (loan.remainingAmount || 0)),
          diff: balanceDiff,
          description: 'paid + remaining ≠ totalAmount',
          branchId: loan.branchId,
        });
      }
    }

    return {
      label: 'Loan Ledger',
      description: 'Cross-checks repayment records against loan balances',
      status: discrepancies.length === 0 ? 'pass' : 'fail',
      checked,
      matched: checked - new Set(discrepancies.map((d) => d.loanId?.toString())).size,
      discrepancies,
    };
  } catch (error) {
    console.error('Loan Ledger Reconciliation Error:', error);
    return {
      label: 'Loan Ledger',
      description: 'Cross-checks repayment records against loan balances',
      status: 'error',
      checked: 0,
      matched: 0,
      discrepancies: [],
      error: error.message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CHECK 3: Cash Position Reconciliation (per branch)
// Compares expected cash position against transaction-derived totals
// ──────────────────────────────────────────────────────────────────────────────
async function reconcileCashPosition(query, user, dateRange = {}) {
  try {
    const branchQuery = user.isSuperAdmin ? {} : { owner: user.effectiveOwnerId };
    const branches = await Branch.find(branchQuery).select('name code');

    if (branches.length === 0) {
      return {
        label: 'Cash Position',
        description: 'Per-branch cash reconciliation against ledger',
        status: 'pass',
        checked: 0,
        matched: 0,
        discrepancies: [],
      };
    }

    const baseQuery = user.isSuperAdmin ? {} : { user: user.effectiveOwnerId };
    const members = await Member.find(baseQuery).select('totalInvested totalLoanProceeds totalWithdrawn branchId totalSavingDeposited totalSavingWithdrawn totalShareInvested');
    const loans = await Loan.find({ ...baseQuery, status: { $ne: 'rejected' } }).select(
      'principal paidAmount branchId',
    );
    // `category`, `status`, and `originalTransaction` are required for the
    // expense and income filters below. The previous select() omitted them,
    // so every `t.category !== '...'` test evaluated `undefined !== '...'`
    // which is always true — every transaction was treated as opex/other,
    // and distribution-shadow rows + reversal counter-entries silently
    // skewed the per-branch cash position.
    const transactions = await FinancialTransaction.find(baseQuery).select(
      'type amount branchId paymentMethod category status originalTransaction',
    );

    const discrepancies = [];
    let checked = 0;

    for (const branch of branches) {
      checked++;
      const bid = branch._id.toString();

      // Per-branch aggregation
      const branchMembers = members.filter((m) => m.branchId?.toString() === bid);
      const branchLoans = loans.filter((l) => l.branchId?.toString() === bid);
      const branchTxns = transactions.filter((t) => t.branchId?.toString() === bid);

      // Loan proceeds back the current-account wallet (they offset totalDisbursed
      // below), so they belong in the cash-side deposit total even though they are
      // not member capital.
      const totalDeposits = branchMembers.reduce((s, m) => s + (m.totalInvested || 0) + (m.totalLoanProceeds || 0) + (m.totalSavingDeposited || 0) + (m.totalShareInvested || 0), 0);
      const totalWithdrawn = branchMembers.reduce((s, m) => s + (m.totalWithdrawn || 0) + (m.totalSavingWithdrawn || 0), 0);
      const totalRepaid = branchLoans.reduce((s, l) => s + (l.paidAmount || 0), 0);
      const totalDisbursed = branchLoans.reduce((s, l) => s + (l.principal || 0), 0);
      // Shared opex filter — drops distribution-shadow categories, business
      // capital flows, reversed originals, and reversal counter-entries.
      const totalExpenses = branchTxns
        .filter(isOperatingExpense)
        .reduce((s, t) => s + (t.amount || 0), 0);

      // Other income = fee income only. Repayments are already captured via
      // `totalRepaid` (from loans) and term_deposit deposits are captured via
      // the member balance flow, so including them here would double-count.
      // Exclude reversed/counter-entries for symmetry with the opex filter.
      const otherIncome = branchTxns
        .filter(
          (t) =>
            t.type === 'income' &&
            t.category !== 'repayment' &&
            t.category !== 'term_deposit' &&
            t.status !== 'Reversed' &&
            !t.originalTransaction,
        )
        .reduce((s, t) => s + (t.amount || 0), 0);

      // Cash-only transactions (physical cash flow)
      const cashInflow = branchTxns
        .filter((t) => t.type === 'income' && t.paymentMethod === 'cash' && t.status !== 'Reversed' && !t.originalTransaction)
        .reduce((s, t) => s + (t.amount || 0), 0);

      const expectedCash = totalDeposits - totalWithdrawn + totalRepaid - totalDisbursed + otherIncome - totalExpenses;

      // Get latest cash opening for cross-reference
      const latestOpening = await CashOpening.findOne({ ...baseQuery, branchId: branch._id })
        .sort({ date: -1 })
        .select('amount date');

      // We track the computed expected cash; flag if it's negative (anomaly)
      if (expectedCash < -100) {
        discrepancies.push({
          branchId: branch._id,
          branchName: branch.name,
          branchCode: branch.code,
          expectedCash: Math.round(expectedCash),
          lastOpeningAmount: latestOpening ? Math.round(latestOpening.amount) : null,
          lastOpeningDate: latestOpening?.date || null,
          diff: Math.round(expectedCash),
          description: 'Negative cash position detected',
        });
      }
    }

    return {
      label: 'Cash Position',
      description: 'Per-branch cash reconciliation against ledger',
      status: discrepancies.length === 0 ? 'pass' : 'fail',
      checked,
      matched: checked - discrepancies.length,
      discrepancies,
    };
  } catch (error) {
    console.error('Cash Position Reconciliation Error:', error);
    return {
      label: 'Cash Position',
      description: 'Per-branch cash reconciliation against ledger',
      status: 'error',
      checked: 0,
      matched: 0,
      discrepancies: [],
      error: error.message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CHECK 4: Transaction Integrity
// Verifies FinancialTransactions with referenceId have matching source records
// and amounts are consistent
// ──────────────────────────────────────────────────────────────────────────────
async function reconcileTransactionIntegrity(query, dateRange = {}) {
  try {
    // Get transactions that have reference links
    const txnQuery = {
      ...query,
      referenceId: { $exists: true, $ne: null },
      status: { $ne: 'Reversed' },
    };
    if (dateRange.start || dateRange.end) {
      txnQuery.date = {};
      if (dateRange.start) txnQuery.date.$gte = dateRange.start;
      if (dateRange.end) txnQuery.date.$lte = dateRange.end;
    }
    const linkedTxns = await FinancialTransaction.find(txnQuery)
      .select('referenceId referenceModel amount type category date');

    const discrepancies = [];
    let checked = 0;
    let orphanCount = 0;
    let mismatchCount = 0;

    // Group by referenceModel for batch lookups
    const grouped = {};
    linkedTxns.forEach((txn) => {
      const model = txn.referenceModel || 'Unknown';
      if (!grouped[model]) grouped[model] = [];
      grouped[model].push(txn);
    });

    // Check Repayment references
    if (grouped.Repayment?.length) {
      const repaymentIds = grouped.Repayment.map((t) => t.referenceId);
      const repayments = await Repayment.find({
        _id: { $in: repaymentIds },
        status: { $ne: 'Reversed' },
      }).select('amount');
      const repMap = {};
      repayments.forEach((r) => (repMap[r._id.toString()] = r.amount));

      for (const txn of grouped.Repayment) {
        checked++;
        const sourceAmount = repMap[txn.referenceId?.toString()];
        if (sourceAmount === undefined) {
          orphanCount++;
          discrepancies.push({
            transactionId: txn._id,
            referenceModel: 'Repayment',
            referenceId: txn.referenceId,
            type: 'orphan',
            amount: txn.amount,
            description: 'Repayment record not found or reversed',
          });
        } else if (Math.abs(txn.amount - sourceAmount) > 1) {
          mismatchCount++;
          discrepancies.push({
            transactionId: txn._id,
            referenceModel: 'Repayment',
            referenceId: txn.referenceId,
            type: 'amount_mismatch',
            expected: Math.round(sourceAmount),
            actual: Math.round(txn.amount),
            diff: Math.round(txn.amount - sourceAmount),
            description: 'Transaction amount ≠ repayment amount',
          });
        }
      }
    }

    // Check Investment references
    if (grouped.Investment?.length) {
      const investmentIds = grouped.Investment.map((t) => t.referenceId);
      const investments = await Investment.find({
        _id: { $in: investmentIds },
        status: { $ne: 'Reversed' },
      }).select('amount');
      const invMap = {};
      investments.forEach((i) => (invMap[i._id.toString()] = i.amount));

      for (const txn of grouped.Investment) {
        checked++;
        const sourceAmount = invMap[txn.referenceId?.toString()];
        if (sourceAmount === undefined) {
          orphanCount++;
          discrepancies.push({
            transactionId: txn._id,
            referenceModel: 'Investment',
            referenceId: txn.referenceId,
            type: 'orphan',
            amount: txn.amount,
            description: 'Investment record not found or reversed',
          });
        } else if (Math.abs(txn.amount - sourceAmount) > 1) {
          mismatchCount++;
          discrepancies.push({
            transactionId: txn._id,
            referenceModel: 'Investment',
            referenceId: txn.referenceId,
            type: 'amount_mismatch',
            expected: Math.round(sourceAmount),
            actual: Math.round(txn.amount),
            diff: Math.round(txn.amount - sourceAmount),
            description: 'Transaction amount ≠ investment amount',
          });
        }
      }
    }

    // Count non-linked transactions for awareness
    const totalTxns = await FinancialTransaction.countDocuments({
      ...query,
      status: { $ne: 'Reversed' },
    });
    const unlinked = totalTxns - linkedTxns.length;

    return {
      label: 'Transaction Integrity',
      description: 'Verifies transaction records match their source documents',
      status: discrepancies.length === 0 ? 'pass' : 'fail',
      checked,
      matched: checked - discrepancies.length,
      orphanCount,
      mismatchCount,
      totalTransactions: totalTxns,
      linkedTransactions: linkedTxns.length,
      unlinkedTransactions: unlinked,
      discrepancies,
    };
  } catch (error) {
    console.error('Transaction Integrity Error:', error);
    return {
      label: 'Transaction Integrity',
      description: 'Verifies transaction records match their source documents',
      status: 'error',
      checked: 0,
      matched: 0,
      discrepancies: [],
      error: error.message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CHECK 5: Saving & Share Account Reconciliation
// Verifies savingBalance and shareBalance against transaction history
// ──────────────────────────────────────────────────────────────────────────────
async function reconcileSavingShareAccounts(query, dateRange = {}) {
  try {
    const members = await Member.find(query).select(
      'name savingBalance totalSavingDeposited totalSavingWithdrawn totalSavingProfit shareBalance totalShareInvested totalShareProfit branchId',
    );

    // Build the source-of-truth share ledger from BusinessShare. The Member
    // doc has `totalShareInvested` + `totalShareProfit` but NO matching
    // `totalShareWithdrawn` field, so the old formula (invested + profit)
    // silently ignored every share liquidation and flagged the entire
    // population as discrepant. Aggregating BusinessShare gives us the true
    // expected balance: deposits + profit − withdrawals.
    const shareAgg = await BusinessShare.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$member',
          deposited: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_deposit'] }, '$amount', 0],
            },
          },
          withdrawn: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_withdrawal'] }, '$amount', 0],
            },
          },
          profit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_profit'] }, '$amount', 0],
            },
          },
        },
      },
    ]);
    const shareLedger = new Map();
    for (const row of shareAgg) {
      shareLedger.set(row._id.toString(), {
        deposited: row.deposited || 0,
        withdrawn: row.withdrawn || 0,
        profit: row.profit || 0,
      });
    }

    const discrepancies = [];
    let checked = 0;

    for (const member of members) {
      // ── Saving Account Check ──
      const hasSavingActivity =
        (member.totalSavingDeposited || 0) > 0 ||
        (member.savingBalance || 0) > 0;

      if (hasSavingActivity) {
        checked++;
        const expectedSaving =
          (member.totalSavingDeposited || 0) -
          (member.totalSavingWithdrawn || 0) +
          (member.totalSavingProfit || 0);
        const actualSaving = member.savingBalance || 0;
        const savingDiff = Math.round(expectedSaving - actualSaving);

        if (Math.abs(savingDiff) > 1) {
          discrepancies.push({
            memberId: member._id,
            memberName: member.name || 'Unknown',
            accountType: 'saving',
            expected: Math.round(expectedSaving),
            actual: Math.round(actualSaving),
            diff: savingDiff,
            branchId: member.branchId,
          });
        }
      }

      // ── Share Account Check ──
      const sourceShare = shareLedger.get(member._id.toString()) || {
        deposited: 0,
        withdrawn: 0,
        profit: 0,
      };
      const hasShareActivity =
        sourceShare.deposited > 0 ||
        (member.totalShareInvested || 0) > 0 ||
        (member.shareBalance || 0) > 0;

      if (hasShareActivity) {
        checked++;
        const expectedShare =
          sourceShare.deposited - sourceShare.withdrawn + sourceShare.profit;
        const actualShare = member.shareBalance || 0;
        const shareDiff = Math.round(expectedShare - actualShare);

        if (Math.abs(shareDiff) > 1) {
          discrepancies.push({
            memberId: member._id,
            memberName: member.name || 'Unknown',
            accountType: 'share',
            expected: Math.round(expectedShare),
            actual: Math.round(actualShare),
            diff: shareDiff,
            branchId: member.branchId,
          });
        }
      }
    }

    return {
      label: 'Saving & Share Accounts',
      description: 'Verifies saving/share balances against cumulative transaction totals',
      status: discrepancies.length === 0 ? 'pass' : 'fail',
      checked,
      matched: checked - discrepancies.length,
      discrepancies,
    };
  } catch (error) {
    console.error('Saving/Share Reconciliation Error:', error);
    return {
      label: 'Saving & Share Accounts',
      description: 'Verifies saving/share balances against cumulative transaction totals',
      status: 'error',
      checked: 0,
      matched: 0,
      discrepancies: [],
      error: error.message,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLVE ENDPOINTS — Fix discrepancies by recalculating from source data
// ══════════════════════════════════════════════════════════════════════════════

// @desc    Resolve Member Balance discrepancies
// @route   POST /api/reports/reconciliation/resolve/member-balance
// Resolves by rebuilding currentBalance and all three current-account
// aggregates (totalInvested, totalWithdrawn, totalProfit) from the ledger.
// This is the authoritative source — if any aggregate drifted, the ledger wins.
//
// Scales to large member sets via cursor + bulkWrite (500 ops per batch). The
// nightly cron (scheduledTasksService.runMemberBalanceReconcile) uses the same
// logic — this endpoint is kept for ad-hoc admin triggering from the UI.
const resolveMemberBalances = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // One aggregation per source (Investment + ProfitDistribution) regardless
    // of member count. Then we cursor through Members and batch updates.
    const invMatch = { accountType: 'current', status: { $ne: 'Reversed' } };
    const profitMatch = { type: 'regular', status: { $ne: 'Failed' } };
    if (!req.user.isSuperAdmin) {
      invMatch.user = req.user.effectiveOwnerId;
      profitMatch.user = req.user.effectiveOwnerId;
    }
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) {
        invMatch.branchId = branchScope;
        profitMatch.branchId = branchScope;
      }
    }

    const invAgg = await Investment.aggregate([
      { $match: invMatch },
      {
        $group: {
          _id: '$member',
          totalInvested: {
            $sum: {
              $cond: [
                { $in: ['$type', ['deposit', 'transfer_receive']] },
                '$amount',
                0,
              ],
            },
          },
          totalWithdrawn: {
            $sum: {
              $cond: [
                { $in: ['$type', ['withdrawal', 'transfer_send']] },
                '$amount',
                0,
              ],
            },
          },
          totalLoanProceeds: {
            $sum: {
              $cond: [{ $eq: ['$type', 'loan_disbursement'] }, '$amount', 0],
            },
          },
        },
      },
    ]);

    const profitAgg = await ProfitDistribution.aggregate([
      { $match: profitMatch },
      { $group: { _id: '$member', totalProfit: { $sum: '$amount' } } },
    ]);

    const ledger = new Map();
    for (const row of invAgg) {
      ledger.set(row._id.toString(), {
        totalInvested: row.totalInvested,
        totalWithdrawn: row.totalWithdrawn,
        totalLoanProceeds: row.totalLoanProceeds,
        totalProfit: 0,
      });
    }
    for (const row of profitAgg) {
      const key = row._id.toString();
      const entry = ledger.get(key) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalLoanProceeds: 0,
        totalProfit: 0,
      };
      entry.totalProfit = row.totalProfit;
      ledger.set(key, entry);
    }

    const BATCH = 500;
    let fixed = 0;
    let ops = [];

    const cursor = Member.find(query)
      .select(
        '_id currentBalance totalInvested totalLoanProceeds totalWithdrawn totalProfit',
      )
      .cursor();

    for await (const member of cursor) {
      const entry = ledger.get(member._id.toString()) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalLoanProceeds: 0,
        totalProfit: 0,
      };
      // Loan proceeds back the wallet too, so they are part of the spendable
      // balance even though they are not member capital.
      const expectedBalance =
        entry.totalInvested +
        entry.totalLoanProceeds -
        entry.totalWithdrawn +
        entry.totalProfit;

      const drift =
        Math.abs(expectedBalance - (member.currentBalance || 0)) > 1 ||
        Math.abs(entry.totalInvested - (member.totalInvested || 0)) > 1 ||
        Math.abs(entry.totalLoanProceeds - (member.totalLoanProceeds || 0)) > 1 ||
        Math.abs(entry.totalWithdrawn - (member.totalWithdrawn || 0)) > 1 ||
        Math.abs(entry.totalProfit - (member.totalProfit || 0)) > 1;

      if (!drift) continue;

      ops.push({
        updateOne: {
          filter: { _id: member._id },
          update: {
            $set: {
              currentBalance: Math.round(expectedBalance),
              totalInvested: Math.round(entry.totalInvested),
              totalLoanProceeds: Math.round(entry.totalLoanProceeds),
              totalWithdrawn: Math.round(entry.totalWithdrawn),
              totalProfit: Math.round(entry.totalProfit),
            },
          },
        },
      });
      fixed++;

      if (ops.length >= BATCH) {
        await Member.bulkWrite(ops, { ordered: false });
        ops = [];
      }
    }

    if (ops.length) {
      await Member.bulkWrite(ops, { ordered: false });
    }

    res.status(200).json({
      message: `Resolved ${fixed} member balance discrepancies`,
      fixed,
    });
  } catch (error) {
    console.error('Resolve Member Balance Error:', error);
    res.status(500).json({ message: 'Failed to resolve member balances' });
  }
};

// @desc    Resolve Loan Ledger discrepancies
// @route   POST /api/reports/reconciliation/resolve/loan-ledger
const resolveLoanLedger = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const loanQuery = { ...query, status: { $ne: 'rejected' } };
    const loans = await Loan.find(loanQuery);

    // Aggregate actual repayments per loan
    const repaymentAgg = await Repayment.aggregate([
      { $match: { ...query, status: { $ne: 'Reversed' } } },
      { $group: { _id: '$loan', totalRepaid: { $sum: '$amount' } } },
    ]);
    const repaymentMap = {};
    repaymentAgg.forEach((r) => (repaymentMap[r._id.toString()] = r.totalRepaid));

    let fixed = 0;
    for (const loan of loans) {
      const loanId = loan._id.toString();
      const actualRepaid = repaymentMap[loanId] || 0;
      let changed = false;

      // Fix paidAmount to match actual repayments
      if (Math.abs(actualRepaid - (loan.paidAmount || 0)) > 1) {
        loan.paidAmount = Math.round(actualRepaid);
        changed = true;
      }

      // Recalculate remainingAmount = totalAmount - paidAmount
      const correctRemaining = Math.max(0, (loan.totalAmount || 0) - loan.paidAmount);
      if (Math.abs(correctRemaining - (loan.remainingAmount || 0)) > 1) {
        loan.remainingAmount = Math.round(correctRemaining);
        changed = true;
      }

      // Auto-complete if fully paid
      if (loan.remainingAmount <= 0 && loan.status === 'active') {
        loan.status = 'completed';
        changed = true;
      }

      if (changed) {
        await loan.save();
        fixed++;
      }
    }

    res.status(200).json({
      message: `Resolved ${fixed} loan ledger discrepancies`,
      fixed,
    });
  } catch (error) {
    console.error('Resolve Loan Ledger Error:', error);
    res.status(500).json({ message: 'Failed to resolve loan ledger' });
  }
};

// @desc    Resolve Saving & Share Account discrepancies
// @route   POST /api/reports/reconciliation/resolve/saving-share
const resolveSavingShare = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const members = await Member.find(query).select(
      'savingBalance totalSavingDeposited totalSavingWithdrawn totalSavingProfit shareBalance totalShareInvested totalShareProfit',
    );

    // Build the share ledger from BusinessShare so the resolve path uses the
    // same source-of-truth as the detection path. Without this, the resolve
    // step would rewrite shareBalance to (invested + profit), restoring shares
    // the member had already withdrawn — silent data corruption.
    const shareAgg = await BusinessShare.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$member',
          deposited: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_deposit'] }, '$amount', 0],
            },
          },
          withdrawn: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_withdrawal'] }, '$amount', 0],
            },
          },
          profit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'share_profit'] }, '$amount', 0],
            },
          },
        },
      },
    ]);
    const shareLedger = new Map();
    for (const row of shareAgg) {
      shareLedger.set(row._id.toString(), {
        deposited: row.deposited || 0,
        withdrawn: row.withdrawn || 0,
        profit: row.profit || 0,
      });
    }

    let fixed = 0;
    for (const member of members) {
      let changed = false;

      // Fix saving balance
      const hasSaving = (member.totalSavingDeposited || 0) > 0 || (member.savingBalance || 0) > 0;
      if (hasSaving) {
        const expectedSaving =
          (member.totalSavingDeposited || 0) -
          (member.totalSavingWithdrawn || 0) +
          (member.totalSavingProfit || 0);
        if (Math.abs(expectedSaving - (member.savingBalance || 0)) > 1) {
          member.savingBalance = Math.round(expectedSaving);
          changed = true;
        }
      }

      // Fix share balance from BusinessShare ledger (subtracts withdrawals).
      const sourceShare = shareLedger.get(member._id.toString()) || {
        deposited: 0,
        withdrawn: 0,
        profit: 0,
      };
      const hasShare =
        sourceShare.deposited > 0 ||
        (member.totalShareInvested || 0) > 0 ||
        (member.shareBalance || 0) > 0;
      if (hasShare) {
        const expectedShare =
          sourceShare.deposited - sourceShare.withdrawn + sourceShare.profit;
        if (Math.abs(expectedShare - (member.shareBalance || 0)) > 1) {
          member.shareBalance = Math.round(expectedShare);
          changed = true;
        }
      }

      if (changed) {
        await member.save();
        fixed++;
      }
    }

    res.status(200).json({
      message: `Resolved ${fixed} saving/share account discrepancies`,
      fixed,
    });
  } catch (error) {
    console.error('Resolve Saving/Share Error:', error);
    res.status(500).json({ message: 'Failed to resolve saving/share accounts' });
  }
};

module.exports = {
  getReconciliation,
  resolveMemberBalances,
  resolveLoanLedger,
  resolveSavingShare,
};
