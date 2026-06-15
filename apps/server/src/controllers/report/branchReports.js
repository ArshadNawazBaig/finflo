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
const getBranchSummary = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res
        .status(403)
        .json({ message: 'Access denied. Global admin only.' });
    }

    const Member = require('../../models/Member');
    const Branch = require('../../models/Branch');

    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    // Rolling 30-day window for inflow/outflow KPIs. Anchored to "now" so the
    // numbers represent recent trading momentum, not lifetime aggregates.
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);

    // Aggregate Member data — adds `aum` (current + saving balance) so the
    // analytics tab can show live Assets Under Management per branch.
    const memberStats = await Member.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$branchId',
          totalMembers: { $sum: 1 },
          totalInvested: { $sum: '$totalInvested' }, // cumulative deposits, not net balance
          totalProfit: { $sum: '$totalProfit' },
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

    // Aggregate Loan data — adds NPL aggregates (outstanding on overdue +
    // defaulted loans) so the ratio can be derived per branch.
    const loanStats = await Loan.aggregate([
      { $match: { ...query, status: { $ne: 'rejected' } } },
      {
        $group: {
          _id: '$branchId',
          totalLoans: { $sum: 1 },
          totalVolume: { $sum: '$principal' },
          totalOutstanding: { $sum: '$remainingAmount' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          nplCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['overdue', 'defaulted']] },
                1,
                0,
              ],
            },
          },
          nplOutstanding: {
            $sum: {
              $cond: [
                { $in: ['$status', ['overdue', 'defaulted']] },
                '$remainingAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Aggregate FinancialTransaction data — three derived metrics per branch:
    //  • totalExpenses (lifetime)            — for the existing tile
    //  • inflow30d / outflow30d              — rolling 30-day cash flow
    // Signed via $facet so we only scan the FT collection once.
    //
    // The expense filter uses the same blacklist as `opexMatchStage()` from
    // reportUtils — distribution-shadow categories (profit_distribution,
    // saving_profit, share_profit, regular_profit) and business capital are
    // excluded, and reversal counter-entries are filtered out so the per-
    // branch totalExpenses isn't inflated by phantom payouts. (We don't call
    // the helper directly because it's defined synchronously and we need the
    // values inlined into the aggregation pipeline.)
    const FinancialTransaction = require('../../models/FinancialTransaction');
    const { EXCLUDED_OPEX_CATEGORIES } = require('../../utils/reportUtils');
    const ftAgg = await FinancialTransaction.aggregate([
      { $match: query },
      {
        $facet: {
          expenses: [
            {
              $match: {
                type: 'expense',
                category: { $nin: EXCLUDED_OPEX_CATEGORIES },
                status: { $ne: 'Reversed' },
                originalTransaction: { $in: [null, undefined] },
              },
            },
            { $group: { _id: '$branchId', totalExpenses: { $sum: '$amount' } } },
          ],
          flow30d: [
            // Symmetric reversal handling: drop both the original Reversed
            // rows AND their counter-entries. Including only one side made
            // outflow look 1× larger and inflow look 1× smaller than reality.
            {
              $match: {
                date: { $gte: since30d },
                status: { $ne: 'Reversed' },
                originalTransaction: { $in: [null, undefined] },
              },
            },
            {
              $group: {
                _id: '$branchId',
                inflow: {
                  $sum: {
                    $cond: [
                      { $in: ['$type', ['income', 'credit']] },
                      '$amount',
                      0,
                    ],
                  },
                },
                outflow: {
                  $sum: {
                    $cond: [
                      { $in: ['$type', ['expense', 'debit', 'loan']] },
                      '$amount',
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);
    const expenseStats = ftAgg[0]?.expenses || [];
    const flowStats = ftAgg[0]?.flow30d || [];

    const branchQuery = req.user.isSuperAdmin ? {} : { owner: req.user.effectiveOwnerId };
    const branches = await Branch.find(branchQuery);

    const branchSummaries = branches.map((branch) => {
      const branchIdStr = branch._id.toString();
      const mStats = memberStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || { totalMembers: 0, totalInvested: 0, totalProfit: 0, aum: 0 };
      const lStats = loanStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || {
        totalLoans: 0,
        totalVolume: 0,
        totalOutstanding: 0,
        activeCount: 0,
        nplCount: 0,
        nplOutstanding: 0,
      };
      const eStats = expenseStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || { totalExpenses: 0 };
      const fStats = flowStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || { inflow: 0, outflow: 0 };

      const nplRatio =
        lStats.totalOutstanding > 0
          ? lStats.nplOutstanding / lStats.totalOutstanding
          : 0;

      return {
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        status: branch.status,
        stats: {
          totalMembers: mStats.totalMembers,
          totalInvested: mStats.totalInvested,
          totalProfit: mStats.totalProfit,
          totalLoans: lStats.totalLoans,
          totalVolume: lStats.totalVolume,
          totalOutstanding: lStats.totalOutstanding,
          activeLoans: lStats.activeCount,
          totalExpenses: eStats.totalExpenses,
          aum: Math.round(mStats.aum || 0),
          nplCount: lStats.nplCount,
          nplOutstanding: Math.round(lStats.nplOutstanding || 0),
          nplRatio: Number(nplRatio.toFixed(4)),
          inflow30d: Math.round(fStats.inflow || 0),
          outflow30d: Math.round(fStats.outflow || 0),
        },
      };
    });

    res.status(200).json(branchSummaries);
  } catch (error) {
    console.error('Error fetching branch summary:', error);
    res.status(500).json({ message: 'Failed to fetch branch summary' });
  }
};

module.exports = {
  getBranchSummary,
};
