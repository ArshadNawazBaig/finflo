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
const getTrialBalance = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // 1. Assets. Each of these was an unbounded full-collection load reduced in
    // JS; now every roll-up is summed in the DB and only scalars cross the wire.
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

    // Operating expenses, business-capital flows, and fee income in one pass —
    // the conditions mirror isOperatingExpense / the inline fee + capital filters.
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

    // Current account cash flows
    const totalDeposits = memberSums.totalInvested || 0;
    // Loan proceeds back the wallet and offset totalDisbursed; included in cash,
    // excluded from the (capital-only) deposit base.
    const totalLoanProceeds = memberSums.totalLoanProceeds || 0;
    const totalWithdrawn = memberSums.totalWithdrawn || 0;

    // Saving account cash flows
    const totalSavingDeposited = memberSums.totalSavingDeposited || 0;
    const totalSavingWithdrawn = memberSums.totalSavingWithdrawn || 0;

    // Share account cash flows. Cash contributed by shares = net share balance
    // minus profit credited to it (share profit is a non-cash book entry that
    // also reduces retained earnings via totalDistributed). This equals
    // shareDeposits − shareWithdrawals. The previous `totalShareInvested` was
    // GROSS and ignored share withdrawals (there is no totalShareWithdrawn
    // field), so any share withdrawal overstated cash — and the A = L + E
    // discrepancy — by exactly the amount withdrawn.
    const netShareCash =
      (memberSums.shareBalance || 0) - (memberSums.totalShareProfit || 0);

    // Loan cash flows
    const totalRepaid = loanSums.totalRepaid || 0;
    const totalDisbursed = loanSums.totalDisbursed || 0;

    const totalExpenses = txSums.totalExpenses || 0;
    const businessCapitalInjections = txSums.businessCapitalInjections || 0;
    const businessCapitalWithdrawals = txSums.businessCapitalWithdrawals || 0;
    const netBusinessCapital =
      businessCapitalInjections - businessCapitalWithdrawals;

    // Fee income — excludes reversed/refunded fees so cash isn't overstated.
    const feeIncome = txSums.feeIncome || 0;

    const cashAtHand = totalDeposits + totalLoanProceeds - totalWithdrawn
      + totalSavingDeposited - totalSavingWithdrawn
      + netShareCash
      + totalRepaid - totalDisbursed
      - totalExpenses
      + feeIncome
      + netBusinessCapital;

    // 2. Liabilities
    const memberCurrentBalance = memberSums.currentBalance || 0;
    const memberSavingBalance = memberSums.savingBalance || 0;
    const memberShareBalance = memberSums.shareBalance || 0;
    const totalLiabilities = memberCurrentBalance + memberSavingBalance + memberShareBalance;

    // 3. Equity / Retained Earnings
    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        // Prefer the precise stored interestAmount; fall back to ratio for legacy records
        if (r.interestAmount != null) return sum + r.interestAmount;
        if (
          !r.loan ||
          !r.loan.totalAmount ||
          r.loan.totalAmount === 0 ||
          !r.loan.principal
        )
          return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };

    // Exclude reversed repayments — the reversal restored the loan balance,
    // so the interest should not flow into retained earnings.
    const populatedRepayments = await Repayment.find({
      ...query,
      status: { $ne: 'Reversed' },
    })
      .populate('loan', 'principal totalAmount')
      .lean();
    const totalInterestEarned = calculateProfit(populatedRepayments);

    // Loans Receivable = outstanding PRINCIPAL only. A loan's remainingAmount
    // includes its unearned interest (totalAmount = principal + interest), but
    // that interest is not a recognized asset until it's actually collected and
    // booked into retained earnings. Counting gross remainingAmount inflates
    // assets by the uncollected interest and breaks the accounting equation
    // (A = L + E). Principal repaid = total repaid − interest earned, so
    // outstanding principal = disbursed − (repaid − interest earned).
    const loansReceivable = Math.max(
      0,
      totalDisbursed - (totalRepaid - totalInterestEarned),
    );
    const totalAssets = loansReceivable + cashAtHand;

    const ProfitDistribution = require('../../models/ProfitDistribution');
    // `totalDistributed` covers ALL distribution types (regular + share +
    // saving + term_deposit). Subtracting it from retained earnings once is
    // correct. Adding `totalSavingProfit` + `totalShareProfit` from member
    // aggregates on top of it (as the old code did) would double-subtract
    // those payouts and understate equity. Filter out failed distributions
    // so a bookkeeping error upstream doesn't decimate equity.
    const [distAgg = {}] = await ProfitDistribution.aggregate([
      { $match: { ...query, status: { $ne: 'Failed' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDistributed = distAgg.total || 0;

    const retainedEarnings = totalInterestEarned + feeIncome
      - totalDistributed - totalExpenses;
    const totalEquity = retainedEarnings + netBusinessCapital;

    const discrepancy = totalAssets - (totalLiabilities + totalEquity);

    res.status(200).json({
      assets: {
        loansReceivable: Math.round(loansReceivable),
        cashAtHand: Math.round(cashAtHand),
        totalAssets: Math.round(totalAssets),
      },
      liabilities: {
        memberCapital: Math.round(memberCurrentBalance),
        memberSavingAccounts: Math.round(memberSavingBalance),
        memberShareCapital: Math.round(memberShareBalance),
        totalLiabilities: Math.round(totalLiabilities),
      },
      equity: {
        retainedEarnings: Math.round(retainedEarnings),
        businessCapital: Math.round(netBusinessCapital),
        totalEquity: Math.round(totalEquity),
      },
      discrepancy: Math.round(discrepancy),
    });
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ message: 'Failed to fetch trial balance' });
  }
};

const getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const now = new Date();
      dateFilter = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }

    // 1. Revenue
    // Exclude reversed repayments — the ledgerController reversal flips the
    // Repayment.status to 'Reversed' and writes a counter-entry, so the
    // economic effect should be zero, not double-counted on the revenue side.
    const repaymentsQuery = {
      ...query,
      date: dateFilter,
      status: { $ne: 'Reversed' },
    };
    const repayments = await Repayment.find(repaymentsQuery).populate(
      'loan',
      'principal totalAmount',
    );

    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        // Prefer the precise stored interestAmount; fall back to ratio for legacy records
        if (r.interestAmount != null) return sum + r.interestAmount;
        if (
          !r.loan ||
          !r.loan.totalAmount ||
          r.loan.totalAmount === 0 ||
          !r.loan.principal
        )
          return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };

    const interestRevenue = Math.round(calculateProfit(repayments));

    // Fee income (checkbook fees, late fees, etc.) — exclude reversed/counter
    // so a refunded fee doesn't inflate gross revenue.
    const feeIncomeAgg = await FinancialTransaction.aggregate([
      {
        $match: {
          ...query,
          date: dateFilter,
          category: { $in: ['checkbook_fee', 'late_fee', 'fee', 'tier_upgrade_fee', 'term_deposit_break_fee'] },
          type: 'income',
          status: { $ne: 'Reversed' },
          originalTransaction: { $in: [null, undefined] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const feeIncome = Math.round(feeIncomeAgg[0]?.total || 0);

    const totalRevenue = interestRevenue + feeIncome;

    // 2. Expenses — opex only. The helper excludes distribution-shadow
    // categories (saving_profit, share_profit, profit_distribution), business
    // capital flows, reversed originals, and reversal counter-entries.
    const expensesAgg = await FinancialTransaction.aggregate([
      { $match: { ...query, date: dateFilter, ...opexMatchStage() } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);

    let expensesBreakdown = {};
    let totalExpenses = 0;
    expensesAgg.forEach((exp) => {
      const category = exp._id || 'other';
      expensesBreakdown[category] = exp.total;
      totalExpenses += exp.total;
    });

    // 3. Distributions — exclude Failed distributions so a bookkeeping error
    // upstream doesn't show up as a phantom payout.
    const ProfitDistribution = require('../../models/ProfitDistribution');
    const distributionsQuery = {
      ...query,
      date: dateFilter,
      status: { $ne: 'Failed' },
    };
    const distributionsAgg = await ProfitDistribution.aggregate([
      { $match: distributionsQuery },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    let distributionsBreakdown = {};
    let totalDistributions = 0;
    distributionsAgg.forEach((dist) => {
      const type = dist._id || 'regular';
      distributionsBreakdown[type] = dist.total;
      totalDistributions += dist.total;
    });

    // 4. Net Income = operating income only (revenue − operating expenses).
    // Profit distributions to members/shareholders are an APPROPRIATION OF EQUITY,
    // not a P&L expense, so they are reported BELOW net income. Subtracting them
    // from net income (the previous behaviour) double-counted them against the
    // balance sheet, which already reduces retained earnings by distributions —
    // so P&L net income never reconciled to the change in retained earnings.
    const netIncome = totalRevenue - totalExpenses;
    // This movement ties out to the balance sheet's retained-earnings contribution.
    const retainedEarningsMovement = netIncome - totalDistributions;

    res.status(200).json({
      period: { startDate: dateFilter.$gte, endDate: dateFilter.$lte },
      revenue: {
        interestEarned: interestRevenue,
        feeIncome: feeIncome,
        totalRevenue: totalRevenue,
      },
      expenses: {
        breakdown: expensesBreakdown,
        totalExpenses: totalExpenses,
      },
      netIncome: netIncome,
      // Equity appropriation, presented below net income (not an expense).
      distributions: {
        breakdown: distributionsBreakdown,
        totalDistributions: totalDistributions,
      },
      retainedEarningsMovement: retainedEarningsMovement,
    });
  } catch (error) {
    console.error('Error fetching profit and loss:', error);
    res.status(500).json({ message: 'Failed to fetch P&L report' });
  }
};

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
};
