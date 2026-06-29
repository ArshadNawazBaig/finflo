const Loan = require('../../models/Loan');
const Repayment = require('../../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
  opexMatchStage,
  EXCLUDED_OPEX_CATEGORIES,
} = require('../../utils/reportUtils');
// Aggregated sums of stored doubles drift sub-paisa (e.g. 56789.119999999995);
// round every money figure to 2 dp at the response boundary so the API never
// emits a drifted value. Counts and percentages are left untouched.
const { roundMoney } = require('../../utils/money');

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
const getReportStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // Apply date filter to the primary query
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Exclude rejected loans from financial metrics
    const loanQuery = { ...query, status: { $ne: 'rejected' } };
    
    // For loans, the date field is usually startDate or createdAt
    if (startDate && endDate) {
      delete loanQuery.date; // Use specific loan date field
      loanQuery.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Aggregate monthly loans — group by year+month so January 2025 and
    // January 2026 don't get summed together when the date range spans years.
    const monthlyLoans = await Loan.aggregate([
      { $match: loanQuery },
      {
        $group: {
          _id: {
            year: { $year: '$startDate' },
            month: { $month: '$startDate' },
          },
          total: { $sum: '$principal' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Aggregate monthly repayments — exclude reversed ones so the chart
    // reflects realised cash flow, not gross-of-reversal noise.
    const monthlyRepayments = await Repayment.aggregate([
      { $match: { ...query, status: { $ne: 'Reversed' } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format for frontend (transform month number to name)
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const formattedLoans = monthlyLoans.map((item) => ({
      name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      value: roundMoney(item.total || 0),
    }));

    const formattedRepayments = monthlyRepayments.map((item) => ({
      name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      value: roundMoney(item.total || 0),
    }));

    // Summary Metrics. Loans are bounded by the date range; `.lean()` skips
    // Mongoose hydration since we only read fields and reduce.
    const totalLoans = await Loan.find(loanQuery).lean();
    const totalVolume = roundMoney(totalLoans.reduce((sum, l) => sum + l.principal, 0));
    const activeLoansCount = totalLoans.filter(
      (l) => l.status === 'active',
    ).length;

    const { start: prevStart, end: prevEnd } = getMonthDates(1);
    // Previous-period loans = loans created strictly inside the previous month.
    // Previously this only had `<= prevEnd` which captured ALL historical loans.
    const prevLoans = totalLoans.filter((l) => {
      const created = new Date(l.createdAt);
      return created >= prevStart && created <= prevEnd;
    });
    const prevVolume = roundMoney(prevLoans.reduce((sum, l) => sum + l.principal, 0));
    const volumeChange = calculatePercentageChange(totalVolume, prevVolume);

    // In-range realised collection (excludes reversals), summed in the DB
    // rather than loading every matching repayment into the process.
    const [repaidAgg] = await Repayment.aggregate([
      { $match: { ...query, status: { $ne: 'Reversed' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRepaid = roundMoney(repaidAgg?.total || 0);

    // MoM growth metrics look at fixed calendar months (current + previous)
    // regardless of the user-selected range, so they use a tenant-scoped query
    // WITHOUT the range filter. Previously this loaded EVERY repayment the
    // tenant ever recorded; now it sums the two month buckets in one DB pass
    // bounded to [prevMonthStart, currMonthEnd].
    const tenantOnlyQuery = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) tenantOnlyQuery.branchId = branchScope;
    }
    const { start: currMonthStart, end: currMonthEnd } = getMonthDates(0);
    const [momAgg] = await Repayment.aggregate([
      {
        $match: {
          ...tenantOnlyQuery,
          status: { $ne: 'Reversed' },
          date: { $gte: prevStart, $lte: currMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          currMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', currMonthStart] },
                    { $lte: ['$date', currMonthEnd] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          prevMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', prevStart] },
                    { $lte: ['$date', prevEnd] },
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
    const currMonthRevenue = momAgg?.currMonth || 0;
    const prevMonthRevenue = momAgg?.prevMonth || 0;
    // The previous-month collection used for the prev-period collection rate is
    // exactly the previous calendar-month revenue bucket.
    const prevRepaid = prevMonthRevenue;

    // Average Interest (weighted by principal)
    const avgInterest =
      totalLoans.length > 0
        ? (
            totalLoans.reduce((sum, l) => sum + l.rate * l.principal, 0) /
            totalVolume
          ).toFixed(1)
        : 0;

    const prevAvgInterest =
      prevLoans.length > 0
        ? (
            prevLoans.reduce((sum, l) => sum + l.rate * l.principal, 0) /
            prevVolume
          ).toFixed(1)
        : 0;
    const interestChange = calculatePercentageChange(
      Number(avgInterest),
      Number(prevAvgInterest),
    );

    // Collection Rate
    const totalDue = totalLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const collectionRate =
      totalDue > 0 ? ((totalRepaid / totalDue) * 100).toFixed(1) : 0;

    const prevDue = prevLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const prevCollectionRate =
      prevDue > 0 ? ((prevRepaid / prevDue) * 100).toFixed(1) : 0;
    const collectionChange = calculatePercentageChange(
      Number(collectionRate),
      Number(prevCollectionRate),
    );

    const prevActiveLoans = prevLoans.filter(
      (l) => l.status === 'active',
    ).length;

    // MoM revenue growth (current vs previous calendar month) — both buckets
    // were summed in the DB above (momAgg).
    const revenueGrowth = calculatePercentageChange(
      currMonthRevenue,
      prevMonthRevenue,
    );

    // ── Portfolio Overview Metrics ──────────────────────────────
    const Branch = require('../../models/Branch');
    const memberQuery = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) memberQuery.branchId = branchScope;
    }

    const allMembers = await Member.find(memberQuery)
      .select('status branchId')
      .lean();
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.status === 'Active').length;
    const inactiveMembers = allMembers.filter(m => m.status === 'Inactive').length;

    // Loan status breakdown — use managedBranchId for branch managers so the
    // portfolio overview reflects the branch they administer, not their home
    // branch. This matches the priority used in the primary `query` above.
    const overviewBranchScope =
      req.user.role === 'staff'
        ? req.user.managedBranchId || req.user.branchId
        : null;
    const loanOverviewQuery = {
      ...(req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId }),
      ...(overviewBranchScope ? { branchId: overviewBranchScope } : {}),
      status: { $ne: 'rejected' },
    };
    const allLoansForOverview = await Loan.find(loanOverviewQuery).lean();

    const activeLoans = allLoansForOverview.filter(l => l.status === 'active');
    const overdueLoans = allLoansForOverview.filter(l => l.status === 'overdue');
    const defaultedLoans = allLoansForOverview.filter(l => l.status === 'defaulted');
    const completedLoans = allLoansForOverview.filter(l => l.status === 'completed');
    const pendingLoans = allLoansForOverview.filter(l => l.status === 'pending');

    const activeLoanAmount = roundMoney(activeLoans.reduce((sum, l) => sum + (l.principal || 0), 0));
    const activeOutstanding = roundMoney(activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0));
    const overdueAmount = roundMoney(overdueLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0));
    const defaultedAmount = roundMoney(defaultedLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0));
    const completedAmount = roundMoney(completedLoans.reduce((sum, l) => sum + (l.principal || 0), 0));
    const totalOutstanding = roundMoney(allLoansForOverview.reduce((sum, l) => sum + (l.remainingAmount || 0), 0));
    const totalLateFees = roundMoney(allLoansForOverview.reduce((sum, l) => sum + (l.lateFeeAmount || 0), 0));

    // Defaulter members: unique customers with defaulted loans
    const defaultedCustomerIds = new Set(
      defaultedLoans.map(l => l.customer?.toString()).filter(Boolean)
    );

    // ── Per-Branch Breakdown ──────────────────────────────
    const branchQuery = req.user.isSuperAdmin ? {} : { owner: req.user.effectiveOwnerId };
    const branches = await Branch.find(branchQuery).select('name');

    const branchBreakdown = branches.map((branch) => {
      const branchIdStr = branch._id.toString();
      const branchMembers = allMembers.filter(m => m.branchId?.toString() === branchIdStr);
      const branchLoans = allLoansForOverview.filter(l => l.branchId?.toString() === branchIdStr);

      const bActive = branchLoans.filter(l => l.status === 'active');
      const bOverdue = branchLoans.filter(l => l.status === 'overdue');
      const bDefaulted = branchLoans.filter(l => l.status === 'defaulted');
      const bCompleted = branchLoans.filter(l => l.status === 'completed');
      const bPending = branchLoans.filter(l => l.status === 'pending');

      const bDefaulterIds = new Set(
        bDefaulted.map(l => l.customer?.toString()).filter(Boolean)
      );

      return {
        branchId: branch._id,
        branchName: branch.name,
        members: {
          total: branchMembers.length,
          active: branchMembers.filter(m => m.status === 'Active').length,
          inactive: branchMembers.filter(m => m.status === 'Inactive').length,
          defaulters: bDefaulterIds.size,
        },
        loans: {
          total: branchLoans.length,
          active: bActive.length,
          activeLoanAmount: roundMoney(bActive.reduce((s, l) => s + (l.principal || 0), 0)),
          activeOutstanding: roundMoney(bActive.reduce((s, l) => s + (l.remainingAmount || 0), 0)),
          overdue: bOverdue.length,
          overdueAmount: roundMoney(bOverdue.reduce((s, l) => s + (l.remainingAmount || 0), 0)),
          defaulted: bDefaulted.length,
          defaultedAmount: roundMoney(bDefaulted.reduce((s, l) => s + (l.remainingAmount || 0), 0)),
          completed: bCompleted.length,
          completedAmount: roundMoney(bCompleted.reduce((s, l) => s + (l.principal || 0), 0)),
          pending: bPending.length,
        },
        financials: {
          totalOutstanding: roundMoney(branchLoans.reduce((s, l) => s + (l.remainingAmount || 0), 0)),
          totalLateFees: roundMoney(branchLoans.reduce((s, l) => s + (l.lateFeeAmount || 0), 0)),
          // totalRepaid is populated below from a per-branch $group aggregation.
          totalRepaid: 0, // populated below
        },
      };
    });

    // Populate per-branch repaid amounts. The branch breakdown is a portfolio
    // health view, not a period statement, so we intentionally use all-time
    // figures regardless of the date range filter. Exclude reversed
    // repayments so reversed amounts don't inflate the branch total.
    const branchRepaidAgg = await Repayment.aggregate([
      {
        $match: {
          ...(req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId }),
          status: { $ne: 'Reversed' },
        },
      },
      { $group: { _id: '$branchId', total: { $sum: '$amount' } } },
    ]);
    const branchRepaidMap = new Map(
      branchRepaidAgg.map((r) => [String(r._id), r.total]),
    );
    branchBreakdown.forEach((bb) => {
      bb.financials.totalRepaid = roundMoney(branchRepaidMap.get(String(bb.branchId)) || 0);
    });

    res.json({
      summary: {
        totalVolume,
        totalVolumeChange: volumeChange,
        avgInterest,
        avgInterestChange: interestChange,
        collectionRate,
        collectionRateChange: collectionChange,
        growth: `${revenueGrowth}%`,
        growthChange: revenueGrowth,
      },
      portfolioOverview: {
        members: {
          total: totalMembers,
          active: activeMembers,
          inactive: inactiveMembers,
          defaulters: defaultedCustomerIds.size,
        },
        loans: {
          total: allLoansForOverview.length,
          active: activeLoans.length,
          activeLoanAmount,
          activeOutstanding,
          overdue: overdueLoans.length,
          overdueAmount,
          defaulted: defaultedLoans.length,
          defaultedAmount,
          completed: completedLoans.length,
          completedAmount,
          pending: pendingLoans.length,
        },
        financials: {
          totalOutstanding,
          totalLateFees,
          totalRepaid,
        },
        branchBreakdown,
      },
      charts: {
        monthlyLoans:
          formattedLoans.length > 0
            ? formattedLoans
            : [{ name: 'None', value: 0 }],
        monthlyRepayments:
          formattedRepayments.length > 0
            ? formattedRepayments
            : [{ name: 'None', value: 0 }],
      },
    });
  } catch (error) {
    console.error('Report Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch report stats' });
  }
};

// Probability of Default (PD) Mapping based on Risk Grade
const PD_MAPPING = {
  'A+': 0.0005, // 0.05%
  A: 0.001, // 0.10%
  B: 0.005, // 0.50%
  C: 0.02, // 2.0%
  D: 0.1, // 10.0%
  F: 0.5, // 50.0%
};

const DEFAULT_PD = 0.05; // 5% fallback
const DEFAULT_LGD = 0.45; // 45% Loss Given Default (Standard Foundation IRB)

module.exports = {
  getReportStats,
};
