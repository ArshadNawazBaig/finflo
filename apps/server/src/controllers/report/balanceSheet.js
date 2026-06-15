const Loan = require('../../models/Loan');
const Repayment = require('../../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
  opexMatchStage,
  EXCLUDED_OPEX_CATEGORIES,
} = require('../../utils/reportUtils');

// Fee categories that count as fee income (mirrors the trial-balance / balance-
// sheet inline list). Used by the conditional-sum aggregations below.
const FEE_INCOME_CATEGORIES = [
  'checkbook_fee',
  'late_fee',
  'fee',
  'tier_upgrade_fee',
  'term_deposit_break_fee',
];
const FinancialTransaction = require('../../models/FinancialTransaction');
const Member = require('../../models/Member');
const RegulatorySnapshot = require('../../models/RegulatorySnapshot');
const getBalanceSheet = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // Roll-ups summed in the DB (was three unbounded full-collection loads
    // reduced in JS — the FinancialTransaction load had no date bound at all).
    const [loanSums = {}] = await Loan.aggregate([
      { $match: { ...query, status: { $ne: 'rejected' } } },
      {
        $group: {
          _id: null,
          totalRepaid: { $sum: '$paidAmount' },
          totalDisbursed: { $sum: '$principal' },
        },
      },
    ]);
    const [memberSums = {}] = await Member.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$totalInvested' },
          totalLoanProceeds: { $sum: '$totalLoanProceeds' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalSavingDeposited: { $sum: '$totalSavingDeposited' },
          totalSavingWithdrawn: { $sum: '$totalSavingWithdrawn' },
          totalShareInvested: { $sum: '$totalShareInvested' },
          totalShareProfit: { $sum: '$totalShareProfit' },
          currentBalance: { $sum: '$currentBalance' },
          savingBalance: { $sum: '$savingBalance' },
          shareBalance: { $sum: '$shareBalance' },
        },
      },
    ]);
    const [txSums = {}] = await FinancialTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalExpenses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'expense'] },
                    { $ne: ['$status', 'Reversed'] },
                    { $not: ['$originalTransaction'] },
                    { $not: [{ $in: ['$category', EXCLUDED_OPEX_CATEGORIES] }] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          businessCapitalInjections: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$category', 'business_capital'] },
                    { $eq: ['$type', 'income'] },
                    { $ne: ['$status', 'Reversed'] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          businessCapitalWithdrawals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$category', 'business_capital'] },
                    { $eq: ['$type', 'expense'] },
                    { $ne: ['$status', 'Reversed'] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          feeIncome: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$category', FEE_INCOME_CATEGORIES] },
                    { $eq: ['$type', 'income'] },
                    { $ne: ['$status', 'Reversed'] },
                    { $not: ['$originalTransaction'] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Try to load TermDeposit model
    let TermDeposit;
    try { TermDeposit = require('../../models/TermDeposit'); } catch (e) { TermDeposit = null; }

    // Active term deposits drive a per-doc accrued-profit calc (time-based), so
    // they stay a find — but lean since we only read fields.
    const activeTermDeposits = TermDeposit
      ? await TermDeposit.find({ ...query, status: 'active' }).lean()
      : [];

    // ══════ ASSETS ══════
    // Current account cash flows
    const totalDeposits = memberSums.totalInvested || 0;
    // Loan proceeds sit in member wallets (backed by the cash pool) and offset
    // totalDisbursed below — include them in cash so the sheet still foots, while
    // keeping totalDeposits as genuine member capital only.
    const totalLoanProceeds = memberSums.totalLoanProceeds || 0;
    const totalWithdrawn = memberSums.totalWithdrawn || 0;

    // Saving account cash flows (Bug Fix #1: these were missing from cashAtHand)
    const totalSavingDeposited = memberSums.totalSavingDeposited || 0;
    const totalSavingWithdrawn = memberSums.totalSavingWithdrawn || 0;

    // Share account cash flows. Cash from shares = net share balance minus
    // profit credited to it (share profit is non-cash and also reduces retained
    // earnings via totalDistributed); this equals shareDeposits −
    // shareWithdrawals. Gross `totalShareInvested` ignored share withdrawals
    // (no totalShareWithdrawn field exists), overstating cash by the amount
    // withdrawn and breaking A = L + E whenever a member redeemed shares.
    const netShareCash =
      (memberSums.shareBalance || 0) - (memberSums.totalShareProfit || 0);

    // Loan cash flows
    const totalRepaid = loanSums.totalRepaid || 0;
    const totalDisbursed = loanSums.totalDisbursed || 0;

    // Operating expenses — the aggregation's conditions mirror isOperatingExpense
    // so the exclusion list stays in lockstep with the P&L (distribution-shadow
    // categories, business capital flows, reversed originals, reversal entries).
    const totalExpenses = txSums.totalExpenses || 0;

    // Business Capital
    const businessCapitalInjections = txSums.businessCapitalInjections || 0;
    const businessCapitalWithdrawals = txSums.businessCapitalWithdrawals || 0;
    const netBusinessCapital = businessCapitalInjections - businessCapitalWithdrawals;

    // Fee income (checkbook, late fees, etc.) — excludes reversed/refunded.
    const feeIncome = txSums.feeIncome || 0;

    const termDepositAssets = activeTermDeposits.reduce(
      (sum, td) => sum + (td.principal || 0), 0,
    );

    // Complete cash position: all inflows minus all outflows
    const cashAtHand = totalDeposits + totalLoanProceeds - totalWithdrawn
      + totalSavingDeposited - totalSavingWithdrawn
      + netShareCash                                   // net of share withdrawals + non-cash profit
      + totalRepaid - totalDisbursed
      - totalExpenses
      + feeIncome
      + netBusinessCapital;                            // Business capital

    // ══════ LIABILITIES ══════
    const memberCurrentBalances = memberSums.currentBalance || 0;
    const memberSavingBalances = memberSums.savingBalance || 0;
    const memberShareBalances = memberSums.shareBalance || 0;

    // Profit ACCRUED TO DATE on a term deposit (straight-line over the term),
    // not the full projected profit. Recognizing 100% of future TD profit on day 1
    // overstated the liability and understated equity by the unaccrued portion.
    // Applied symmetrically to the liability and the equity offset below so the
    // balance sheet still foots.
    const tdAccruedProfit = (td) => {
      const projected = td.projectedProfit || 0;
      const start = td.startDate ? new Date(td.startDate).getTime() : null;
      const end = td.maturityDate ? new Date(td.maturityDate).getTime() : null;
      if (!start || !end || end <= start) return projected;
      const frac = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
      return Math.round(projected * frac);
    };

    // Term deposit obligations (principal + profit accrued to date owed back)
    const termDepositObligations = activeTermDeposits.reduce(
      (sum, td) => sum + (td.principal || 0) + tdAccruedProfit(td), 0,
    );

    const totalLiabilities = memberCurrentBalances + memberSavingBalances + memberShareBalances + termDepositObligations;

    // ══════ EQUITY ══════
    // Exclude reversed repayments from interest earned — reversal already
    // restored the loan balance, so the interest should not flow into equity.
    const populatedRepayments = await Repayment.find({
      ...query,
      status: { $ne: 'Reversed' },
    })
      .populate('loan', 'principal totalAmount')
      .lean();
    const totalInterestEarned = populatedRepayments.reduce((sum, r) => {
      if (r.interestAmount != null) return sum + r.interestAmount;
      if (!r.loan || !r.loan.totalAmount || r.loan.totalAmount === 0 || !r.loan.principal) return sum;
      const totalInterest = r.loan.totalAmount - r.loan.principal;
      const profitRatio = totalInterest / r.loan.totalAmount;
      return sum + r.amount * profitRatio;
    }, 0);

    // Loans Receivable = outstanding PRINCIPAL only. remainingAmount includes
    // the loan's unearned interest, which is not a recognized asset until it's
    // collected and booked into retained earnings. Counting it gross inflates
    // assets and breaks A = L + E. Outstanding principal = disbursed −
    // (repaid − interest earned).
    const loansReceivable = Math.max(
      0,
      totalDisbursed - (totalRepaid - totalInterestEarned),
    );
    const totalAssets = loansReceivable + cashAtHand + termDepositAssets;

    const ProfitDistribution = require('../../models/ProfitDistribution');
    // Exclude Failed distributions so phantom payouts don't decimate equity.
    const [distAgg = {}] = await ProfitDistribution.aggregate([
      { $match: { ...query, status: { $ne: 'Failed' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDistributed = distAgg.total || 0;

    // Term deposit profit accrued to date is an obligation (liability) that also
    // needs an equity offset. Uses the SAME accrued-to-date figure as the liability
    // above so assets, liabilities and equity stay in balance.
    const termDepositProfitObligation = activeTermDeposits.reduce(
      (sum, td) => sum + tdAccruedProfit(td), 0,
    );

    // Retained Earnings: revenue minus operating costs minus all profit distributions
    // totalDistributed (from ProfitDistribution model) covers regular, saving, and share distributions
    const retainedEarnings = totalInterestEarned + feeIncome
      - totalExpenses                  // operating expenses only (no profit_distribution)
      - totalDistributed               // all profit distributions (regular + saving + share)
      - termDepositProfitObligation;   // term deposit profit owed
    const totalEquity = retainedEarnings + netBusinessCapital;

    const discrepancy = totalAssets - (totalLiabilities + totalEquity);

    res.status(200).json({
      generatedAt: new Date(),
      assets: {
        cashAtHand: Math.round(cashAtHand),
        loansReceivable: Math.round(loansReceivable),
        termDepositsHeld: Math.round(termDepositAssets),
        totalAssets: Math.round(totalAssets),
      },
      liabilities: {
        memberCurrentAccounts: Math.round(memberCurrentBalances),
        memberSavingAccounts: Math.round(memberSavingBalances),
        memberShareCapital: Math.round(memberShareBalances),
        termDepositObligations: Math.round(termDepositObligations),
        totalLiabilities: Math.round(totalLiabilities),
      },
      equity: {
        interestEarned: Math.round(totalInterestEarned),
        feeIncome: Math.round(feeIncome),
        profitDistributed: Math.round(totalDistributed),
        operatingExpenses: Math.round(totalExpenses),
        retainedEarnings: Math.round(retainedEarnings),
        businessCapital: Math.round(netBusinessCapital),
        totalEquity: Math.round(totalEquity),
      },
      balanceCheck: {
        totalAssets: Math.round(totalAssets),
        totalLiabilitiesPlusEquity: Math.round(totalLiabilities + totalEquity),
        discrepancy: Math.round(discrepancy),
        isBalanced: Math.abs(discrepancy) < 1,
      },
    });
  } catch (error) {
    console.error('Balance Sheet Error:', error);
    res.status(500).json({ message: 'Failed to generate balance sheet' });
  }
};

// @desc    AUM (Assets Under Management) trend over the last N months.
// @route   GET /api/reports/aum-trend?months=12&branchId=
// @access  Private (view_reports)
//
// AUM isn't snapshotted historically anywhere — we have current balances on
// Member and the per-event Investment/ProfitDistribution ledger. So we
// compute backwards: start from today's AUM, then for each month boundary
// subtract that month's net additions (deposits + profit credits −
// withdrawals/transfers-out). Cheap (two aggregations regardless of month
// count) and accurate as long as the ledger is the source of truth.
const getAumTrend = async (req, res) => {
  try {
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const ProfitDistribution = require('../../models/ProfitDistribution');

    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 36);
    const branchId = req.query.branchId || null;

    const baseQuery = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) baseQuery.branchId = scope;
    } else if (branchId) {
      baseQuery.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // 1. Current AUM (sum of currentBalance + savingBalance for in-scope members).
    const aumAgg = await Member.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          aum: {
            $sum: {
              $add: [
                { $ifNull: ['$currentBalance', 0] },
                { $ifNull: ['$savingBalance', 0] },
              ],
            },
          },
        },
      },
    ]);
    let runningAum = Math.round(aumAgg[0]?.aum || 0);

    // 2. Per-month net Investment movement (deposit + transfer_receive +
    //    profit − withdrawal − transfer_send). Reversed records are skipped.
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
      0,
      0,
      0,
      0,
    );

    const invMatch = { ...baseQuery, status: { $ne: 'Reversed' } };
    const invFlow = await Investment.aggregate([
      { $match: { ...invMatch, date: { $gte: windowStart } } },
      {
        $project: {
          y: { $year: '$date' },
          m: { $month: '$date' },
          signed: {
            // Loan proceeds credit the wallet (currentBalance), so they must count
            // as an AUM inflow here too — otherwise the reconstructed trend drifts
            // from the current AUM by the disbursed amount. (Pre-reclassification
            // these were type 'deposit'; keep them counted under the new type.)
            $cond: [
              {
                $in: [
                  '$type',
                  ['deposit', 'transfer_receive', 'profit', 'loan_disbursement'],
                ],
              },
              '$amount',
              { $multiply: ['$amount', -1] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { y: '$y', m: '$m' },
          net: { $sum: '$signed' },
        },
      },
    ]);

    // 3. Per-month profit distributions that hit currentBalance or
    //    savingBalance — these are the components of AUM. Share profit goes
    //    to shareBalance (NOT part of AUM as defined on line ~1206) so we
    //    explicitly exclude type='share'. Failed distributions are also
    //    excluded so a bookkeeping error doesn't show as a phantom inflow.
    const profitMatch = {
      ...baseQuery,
      type: { $in: ['regular', 'saving', 'term_deposit'] },
      status: { $ne: 'Failed' },
    };
    const profitFlow = await ProfitDistribution.aggregate([
      { $match: { ...profitMatch, date: { $gte: windowStart } } },
      {
        $project: {
          y: { $year: '$date' },
          m: { $month: '$date' },
          amount: 1,
        },
      },
      {
        $group: {
          _id: { y: '$y', m: '$m' },
          net: { $sum: '$amount' },
        },
      },
    ]);

    // Combine into a single lookup keyed by YYYY-MM.
    const flowByMonth = new Map();
    for (const row of invFlow) {
      const key = `${row._id.y}-${row._id.m}`;
      flowByMonth.set(key, (flowByMonth.get(key) || 0) + row.net);
    }
    for (const row of profitFlow) {
      const key = `${row._id.y}-${row._id.m}`;
      flowByMonth.set(key, (flowByMonth.get(key) || 0) + row.net);
    }

    // Walk backwards from current month, peeling off each month's net to
    // reveal the opening balance, then advance forward to build the series.
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const series = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const net = flowByMonth.get(key) || 0;
      series.unshift({
        name: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        aum: runningAum,
        net: Math.round(net),
        ts: d.toISOString(),
      });
      runningAum = Math.round(runningAum - net);
    }

    return res.json({ months, branchId, currentAum: series.at(-1)?.aum || 0, series });
  } catch (error) {
    console.error('AUM Trend Error:', error);
    res.status(500).json({ message: 'Failed to compute AUM trend' });
  }
};

module.exports = {
  getBalanceSheet,
  getAumTrend,
};
