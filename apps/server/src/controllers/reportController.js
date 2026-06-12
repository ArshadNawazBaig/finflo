const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
  opexMatchStage,
  EXCLUDED_OPEX_CATEGORIES,
} = require('../utils/reportUtils');

// Fee categories that count as fee income (mirrors the trial-balance / balance-
// sheet inline list). Used by the conditional-sum aggregations below.
const FEE_INCOME_CATEGORIES = [
  'checkbook_fee',
  'late_fee',
  'fee',
  'tier_upgrade_fee',
  'term_deposit_break_fee',
];

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
      value: item.total,
    }));

    const formattedRepayments = monthlyRepayments.map((item) => ({
      name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      value: item.total,
    }));

    // Summary Metrics. Loans are bounded by the date range; `.lean()` skips
    // Mongoose hydration since we only read fields and reduce.
    const totalLoans = await Loan.find(loanQuery).lean();
    const totalVolume = totalLoans.reduce((sum, l) => sum + l.principal, 0);
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
    const prevVolume = prevLoans.reduce((sum, l) => sum + l.principal, 0);
    const volumeChange = calculatePercentageChange(totalVolume, prevVolume);

    // In-range realised collection (excludes reversals), summed in the DB
    // rather than loading every matching repayment into the process.
    const [repaidAgg] = await Repayment.aggregate([
      { $match: { ...query, status: { $ne: 'Reversed' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRepaid = repaidAgg?.total || 0;

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
    const Member = require('../models/Member');
    const Branch = require('../models/Branch');
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

    const activeLoanAmount = activeLoans.reduce((sum, l) => sum + (l.principal || 0), 0);
    const activeOutstanding = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const overdueAmount = overdueLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const defaultedAmount = defaultedLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const completedAmount = completedLoans.reduce((sum, l) => sum + (l.principal || 0), 0);
    const totalOutstanding = allLoansForOverview.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const totalLateFees = allLoansForOverview.reduce((sum, l) => sum + (l.lateFeeAmount || 0), 0);

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
          activeLoanAmount: bActive.reduce((s, l) => s + (l.principal || 0), 0),
          activeOutstanding: bActive.reduce((s, l) => s + (l.remainingAmount || 0), 0),
          overdue: bOverdue.length,
          overdueAmount: bOverdue.reduce((s, l) => s + (l.remainingAmount || 0), 0),
          defaulted: bDefaulted.length,
          defaultedAmount: bDefaulted.reduce((s, l) => s + (l.remainingAmount || 0), 0),
          completed: bCompleted.length,
          completedAmount: bCompleted.reduce((s, l) => s + (l.principal || 0), 0),
          pending: bPending.length,
        },
        financials: {
          totalOutstanding: branchLoans.reduce((s, l) => s + (l.remainingAmount || 0), 0),
          totalLateFees: branchLoans.reduce((s, l) => s + (l.lateFeeAmount || 0), 0),
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
      bb.financials.totalRepaid = branchRepaidMap.get(String(bb.branchId)) || 0;
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

// @desc    Generate IFRS 9 Expected Credit Loss (ECL) Report
// @route   GET /api/reports/ifrs9
// @access  Private (Admin)
const generateIFRS9Report = async (req, res) => {
  try {
    const query = { user: req.user.effectiveOwnerId, status: 'active' };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const loans = await Loan.find(query);

    let totalECL = 0;
    let totalExposure = 0;
    const gradeBreakdown = {};

    // 2. Calculate ECL per loan
    const loanDetails = loans.map((loan) => {
      const grade = loan.riskDetails?.grade || 'N/A';
      const pd = PD_MAPPING[grade] || DEFAULT_PD;
      const exposure = loan.remainingAmount;
      const ecl = exposure * pd * DEFAULT_LGD;

      // Aggregates
      totalECL += ecl;
      totalExposure += exposure;

      if (!gradeBreakdown[grade]) {
        gradeBreakdown[grade] = {
          count: 0,
          exposure: 0,
          ecl: 0,
        };
      }
      gradeBreakdown[grade].count += 1;
      gradeBreakdown[grade].exposure += exposure;
      gradeBreakdown[grade].ecl += ecl;

      return {
        loanId: loan._id,
        grade,
        pd: (pd * 100).toFixed(2) + '%',
        exposure,
        ecl,
      };
    });

    res.json({
      meta: {
        generatedAt: new Date(),
        totalLoans: loans.length,
        totalExposure,
        totalECL,
        averageCoverageRatio:
          totalExposure > 0 ? (totalECL / totalExposure) * 100 : 0,
      },
      gradeBreakdown,
      // loanDetails, // Optional: Include if client needs distinct list, keeping payload light for now
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Basel III Capital Adequacy Report
// @route   GET /api/reports/basel3
// @access  Private (Admin)
const generateBasel3Report = async (req, res) => {
  try {
    const query = { user: req.user.effectiveOwnerId, status: 'active' };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const loans = await Loan.find(query);

    // Mock Capital Data (In a real system, this comes from the General Ledger)
    const TIER_1_CAPITAL = 50000000; // $50M Equity
    const TIER_2_CAPITAL = 10000000; // $10M Subordinated Debt

    let totalRWA = 0; // Risk Weighted Assets

    // Calculate RWA
    // Standard Risk Weight for Unsecured Retail Loans is usually 75% or 100%
    // We'll vary it slightly by Risk Grade for demonstration logic
    loans.forEach((loan) => {
      const grade = loan.riskDetails?.grade || 'N/A';
      let riskWeight = 1.0; // 100% default

      // Apply lower weights for better grades (Internal Ratings-Based approach simulation)
      if (grade === 'A+' || grade === 'A') riskWeight = 0.75;
      if (grade === 'B') riskWeight = 1.0;
      if (grade === 'C' || grade === 'D') riskWeight = 1.5;
      if (grade === 'F') riskWeight = 2.5; // High risk

      const rwa = loan.remainingAmount * riskWeight;
      totalRWA += rwa;
    });

    const capitalAdequacyRatio =
      totalRWA > 0 ? ((TIER_1_CAPITAL + TIER_2_CAPITAL) / totalRWA) * 100 : 0;
    const tier1Ratio = totalRWA > 0 ? (TIER_1_CAPITAL / totalRWA) * 100 : 0;

    res.json({
      meta: {
        generatedAt: new Date(),
        currency: 'PKR',
      },
      capital: {
        tier1: TIER_1_CAPITAL,
        tier2: TIER_2_CAPITAL,
        total: TIER_1_CAPITAL + TIER_2_CAPITAL,
      },
      assets: {
        totalExposure: loans.reduce((sum, l) => sum + l.remainingAmount, 0),
        totalRWA,
      },
      ratios: {
        capitalAdequacyRatio, // Min requirement usually 8% + buffers
        tier1Ratio, // Min usually 6%
        status: capitalAdequacyRatio > 10.5 ? 'Healthy' : 'At Risk', // 10.5% includes conservation buffer
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const FinancialTransaction = require('../models/FinancialTransaction');
const Member = require('../models/Member');

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

    // Share account cash flows
    const totalShareInvested = memberSums.totalShareInvested || 0;

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
      + totalShareInvested
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

    const ProfitDistribution = require('../models/ProfitDistribution');
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
    const ProfitDistribution = require('../models/ProfitDistribution');
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

const getBranchSummary = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res
        .status(403)
        .json({ message: 'Access denied. Global admin only.' });
    }

    const Member = require('../models/Member');
    const Branch = require('../models/Branch');

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
    const FinancialTransaction = require('../models/FinancialTransaction');
    const { EXCLUDED_OPEX_CATEGORIES } = require('../utils/reportUtils');
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

const RegulatorySnapshot = require('../models/RegulatorySnapshot');

const saveRegulatorySnapshot = async (req, res) => {
  try {
    const { title, reportType, snapshotData, periodStart, periodEnd } =
      req.body;

    if (!title || !reportType || !snapshotData) {
      return res
        .status(400)
        .json({ message: 'Missing required snapshot data' });
    }

    const snapshot = await RegulatorySnapshot.create({
      user: req.user.effectiveOwnerId,
      generatedBy: req.user._id,
      title,
      reportType,
      snapshotData,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    });

    res.status(201).json({ message: 'Snapshot saved successfully', snapshot });
  } catch (error) {
    console.error('Error saving regulatory snapshot:', error);
    res.status(500).json({ message: 'Failed to save snapshot' });
  }
};

const getRegulatorySavedSnapshots = async (req, res) => {
  try {
    const { reportType } = req.query;
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };
    if (reportType) query.reportType = reportType;

    const snapshots = await RegulatorySnapshot.find(query)
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ message: 'Failed to fetch saved snapshots' });
  }
};

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
    try { TermDeposit = require('../models/TermDeposit'); } catch (e) { TermDeposit = null; }

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

    // Share account cash flows (Bug Fix #1: these were missing from cashAtHand)
    const totalShareInvested = memberSums.totalShareInvested || 0;

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
      + totalSavingDeposited - totalSavingWithdrawn   // Bug Fix #1
      + totalShareInvested                             // Bug Fix #1
      + totalRepaid - totalDisbursed
      - totalExpenses
      + feeIncome                                      // Bug Fix #2
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

    const ProfitDistribution = require('../models/ProfitDistribution');
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
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const ProfitDistribution = require('../models/ProfitDistribution');

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
  getReportStats,
  generateIFRS9Report,
  generateBasel3Report,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getBranchSummary,
  saveRegulatorySnapshot,
  getRegulatorySavedSnapshots,
  getAumTrend,
};
