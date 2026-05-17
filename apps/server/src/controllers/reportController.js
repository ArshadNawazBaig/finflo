const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

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

    // Aggregate monthly repayments
    const monthlyRepayments = await Repayment.aggregate([
      { $match: query },
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

    // Summary Metrics
    const totalLoans = await Loan.find(loanQuery);
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

    const allRepayments = await Repayment.find(query);
    const totalRepaid = allRepayments.reduce((sum, r) => sum + r.amount, 0);

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
    const prevRepaid = allRepayments
      .filter((r) => {
        const d = new Date(r.date);
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((sum, r) => sum + r.amount, 0);
    const prevCollectionRate =
      prevDue > 0 ? ((prevRepaid / prevDue) * 100).toFixed(1) : 0;
    const collectionChange = calculatePercentageChange(
      Number(collectionRate),
      Number(prevCollectionRate),
    );

    const prevActiveLoans = prevLoans.filter(
      (l) => l.status === 'active',
    ).length;

    // Revenue Growth Calculation (Current Month vs Previous Month)
    const { start: currMonthStart, end: currMonthEnd } = getMonthDates(0);
    const currMonthRevenue = allRepayments
      .filter((r) => r.date >= currMonthStart && r.date <= currMonthEnd)
      .reduce((sum, r) => sum + r.amount, 0);

    const prevMonthRevenue = allRepayments
      .filter((r) => r.date >= prevStart && r.date <= prevEnd)
      .reduce((sum, r) => sum + r.amount, 0);

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

    const allMembers = await Member.find(memberQuery).select('status branchId');
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.status === 'Active').length;
    const inactiveMembers = allMembers.filter(m => m.status === 'Inactive').length;

    // Loan status breakdown
    const loanOverviewQuery = {
      ...(req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId }),
      ...(req.user.role === 'staff' && req.user.branchId ? { branchId: req.user.branchId } : {}),
      status: { $ne: 'rejected' },
    };
    const allLoansForOverview = await Loan.find(loanOverviewQuery);

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
          // totalRepaid will be added from the overall allRepayments filtered by branch
          totalRepaid: 0, // populated below
        },
      };
    });

    // Populate per-branch repaid amounts
    const allRepaymentsForBranch = await Repayment.find(
      req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId }
    ).select('amount branchId');
    branchBreakdown.forEach((bb) => {
      const branchReps = allRepaymentsForBranch.filter(
        r => r.branchId?.toString() === bb.branchId.toString()
      );
      bb.financials.totalRepaid = branchReps.reduce((s, r) => s + (r.amount || 0), 0);
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

    // 1. Assets
    const loans = await Loan.find({ ...query, status: { $ne: 'rejected' } });
    const members = await Member.find(query);
    const transactions = await FinancialTransaction.find(query);

    const loansReceivable = loans.reduce(
      (sum, loan) => sum + (loan.remainingAmount || 0),
      0,
    );

    // Current account cash flows
    const totalDeposits = members.reduce(
      (sum, m) => sum + (m.totalInvested || 0),
      0,
    );
    const totalWithdrawn = members.reduce(
      (sum, m) => sum + (m.totalWithdrawn || 0),
      0,
    );

    // Saving account cash flows
    const totalSavingDeposited = members.reduce((sum, m) => sum + (m.totalSavingDeposited || 0), 0);
    const totalSavingWithdrawn = members.reduce((sum, m) => sum + (m.totalSavingWithdrawn || 0), 0);

    // Share account cash flows
    const totalShareInvested = members.reduce((sum, m) => sum + (m.totalShareInvested || 0), 0);

    // Loan cash flows
    const totalRepaid = loans.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    const totalDisbursed = loans.reduce(
      (sum, l) => sum + (l.principal || 0),
      0,
    );
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense' && t.category !== 'business_capital' && t.category !== 'profit_distribution')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const businessCapitalInjections = transactions
      .filter((t) => t.category === 'business_capital' && t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const businessCapitalWithdrawals = transactions
      .filter((t) => t.category === 'business_capital' && t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const netBusinessCapital = businessCapitalInjections - businessCapitalWithdrawals;

    // Fee income
    const feeIncome = transactions
      .filter((t) => ['checkbook_fee', 'late_fee', 'fee', 'tier_upgrade_fee', 'term_deposit_break_fee'].includes(t.category) && t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const cashAtHand = totalDeposits - totalWithdrawn
      + totalSavingDeposited - totalSavingWithdrawn
      + totalShareInvested
      + totalRepaid - totalDisbursed
      - totalExpenses
      + feeIncome
      + netBusinessCapital;
    const totalAssets = loansReceivable + cashAtHand;

    // 2. Liabilities
    const memberCurrentBalance = members.reduce(
      (sum, m) => sum + (m.currentBalance || 0),
      0,
    );
    const memberSavingBalance = members.reduce((sum, m) => sum + (m.savingBalance || 0), 0);
    const memberShareBalance = members.reduce((sum, m) => sum + (m.shareBalance || 0), 0);
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

    const populatedRepayments = await Repayment.find(query).populate(
      'loan',
      'principal totalAmount',
    );
    const totalInterestEarned = calculateProfit(populatedRepayments);

    const ProfitDistribution = require('../models/ProfitDistribution');
    const distributions = await ProfitDistribution.find(query);
    const totalDistributed = distributions.reduce(
      (sum, d) => sum + (d.amount || 0),
      0,
    );

    // Saving/share profit distributions
    const totalSavingProfitDistributed = members.reduce((sum, m) => sum + (m.totalSavingProfit || 0), 0);
    const totalShareProfitDistributed = members.reduce((sum, m) => sum + (m.totalShareProfit || 0), 0);

    const retainedEarnings = totalInterestEarned + feeIncome
      - totalDistributed - totalExpenses
      - totalSavingProfitDistributed
      - totalShareProfitDistributed;
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
    const repaymentsQuery = { ...query, date: dateFilter };
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

    // Fee income (checkbook fees, late fees, etc.)
    const feeIncomeAgg = await FinancialTransaction.aggregate([
      { $match: { ...query, date: dateFilter, category: { $in: ['checkbook_fee', 'late_fee', 'fee', 'tier_upgrade_fee', 'term_deposit_break_fee'] }, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const feeIncome = Math.round(feeIncomeAgg[0]?.total || 0);

    const totalRevenue = interestRevenue + feeIncome;

    // 2. Expenses
    const expensesAgg = await FinancialTransaction.aggregate([
      { $match: { ...query, date: dateFilter, type: 'expense', category: { $nin: ['business_capital', 'profit_distribution'] } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);

    let expensesBreakdown = {};
    let totalExpenses = 0;
    expensesAgg.forEach((exp) => {
      const category = exp._id || 'other';
      expensesBreakdown[category] = exp.total;
      totalExpenses += exp.total;
    });

    // 3. Distributions
    const ProfitDistribution = require('../models/ProfitDistribution');
    // ProfitDistribution stores its timestamp on `date`, not `distributionDate`.
    // The previous field name silently matched nothing, so this section always
    // returned an empty breakdown.
    const distributionsQuery = { ...query, date: dateFilter };
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

    // 4. Net Income
    const netIncome = totalRevenue - totalExpenses - totalDistributions;

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
      distributions: {
        breakdown: distributionsBreakdown,
        totalDistributions: totalDistributions,
      },
      netIncome: netIncome,
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

    // Aggregate Member data (total members, total invested grouped by branch)
    const memberStats = await Member.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$branchId',
          totalMembers: { $sum: 1 },
          totalInvested: { $sum: '$totalInvested' }, // cumulative deposits, not net balance
          totalProfit: { $sum: '$totalProfit' },
        },
      },
    ]);

    // Aggregate Loan data (total loans, active volume grouped by branch)
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
        },
      },
    ]);

    // Aggregate Expenses by branch
    const FinancialTransaction = require('../models/FinancialTransaction');
    const expenseStats = await FinancialTransaction.aggregate([
      { $match: { ...query, type: 'expense', category: { $ne: 'business_capital' } } },
      {
        $group: {
          _id: '$branchId',
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    const branchQuery = req.user.isSuperAdmin ? {} : { owner: req.user.effectiveOwnerId };
    const branches = await Branch.find(branchQuery);

    const branchSummaries = branches.map((branch) => {
      const branchIdStr = branch._id.toString();
      const mStats = memberStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || { totalMembers: 0, totalInvested: 0, totalProfit: 0 };
      const lStats = loanStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || {
        totalLoans: 0,
        totalVolume: 0,
        totalOutstanding: 0,
        activeCount: 0,
      };
      const eStats = expenseStats.find(
        (s) => s._id?.toString() === branchIdStr,
      ) || { totalExpenses: 0 };

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

    const loans = await Loan.find({ ...query, status: { $ne: 'rejected' } });
    const members = await Member.find(query);
    const transactions = await FinancialTransaction.find(query);

    // Try to load TermDeposit model
    let TermDeposit;
    try { TermDeposit = require('../models/TermDeposit'); } catch (e) { TermDeposit = null; }

    const activeTermDeposits = TermDeposit
      ? await TermDeposit.find({ ...query, status: 'active' })
      : [];

    // ══════ ASSETS ══════
    const loansReceivable = loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

    // Current account cash flows
    const totalDeposits = members.reduce((sum, m) => sum + (m.totalInvested || 0), 0);
    const totalWithdrawn = members.reduce((sum, m) => sum + (m.totalWithdrawn || 0), 0);

    // Saving account cash flows (Bug Fix #1: these were missing from cashAtHand)
    const totalSavingDeposited = members.reduce((sum, m) => sum + (m.totalSavingDeposited || 0), 0);
    const totalSavingWithdrawn = members.reduce((sum, m) => sum + (m.totalSavingWithdrawn || 0), 0);

    // Share account cash flows (Bug Fix #1: these were missing from cashAtHand)
    const totalShareInvested = members.reduce((sum, m) => sum + (m.totalShareInvested || 0), 0);

    // Loan cash flows
    const totalRepaid = loans.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
    const totalDisbursed = loans.reduce((sum, l) => sum + (l.principal || 0), 0);

    // Operating expenses (exclude business_capital and profit_distribution — distributions handled separately)
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense' && t.category !== 'business_capital' && t.category !== 'profit_distribution')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Business Capital
    const businessCapitalInjections = transactions
      .filter((t) => t.category === 'business_capital' && t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const businessCapitalWithdrawals = transactions
      .filter((t) => t.category === 'business_capital' && t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const netBusinessCapital = businessCapitalInjections - businessCapitalWithdrawals;

    // Fee income (checkbook, late fees, etc.)
    const feeIncome = transactions
      .filter((t) => ['checkbook_fee', 'late_fee', 'fee', 'tier_upgrade_fee', 'term_deposit_break_fee'].includes(t.category) && t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const termDepositAssets = activeTermDeposits.reduce(
      (sum, td) => sum + (td.principal || 0), 0,
    );

    // Complete cash position: all inflows minus all outflows
    const cashAtHand = totalDeposits - totalWithdrawn
      + totalSavingDeposited - totalSavingWithdrawn   // Bug Fix #1
      + totalShareInvested                             // Bug Fix #1
      + totalRepaid - totalDisbursed
      - totalExpenses
      + feeIncome                                      // Bug Fix #2
      + netBusinessCapital;                            // Business capital

    const totalAssets = loansReceivable + cashAtHand + termDepositAssets;

    // ══════ LIABILITIES ══════
    const memberCurrentBalances = members.reduce((sum, m) => sum + (m.currentBalance || 0), 0);
    const memberSavingBalances = members.reduce((sum, m) => sum + (m.savingBalance || 0), 0);
    const memberShareBalances = members.reduce((sum, m) => sum + (m.shareBalance || 0), 0);

    // Term deposit obligations (principal + projected profit owed back)
    const termDepositObligations = activeTermDeposits.reduce(
      (sum, td) => sum + (td.principal || 0) + (td.projectedProfit || 0), 0,
    );

    const totalLiabilities = memberCurrentBalances + memberSavingBalances + memberShareBalances + termDepositObligations;

    // ══════ EQUITY ══════
    const populatedRepayments = await Repayment.find(query).populate('loan', 'principal totalAmount');
    const totalInterestEarned = populatedRepayments.reduce((sum, r) => {
      if (r.interestAmount != null) return sum + r.interestAmount;
      if (!r.loan || !r.loan.totalAmount || r.loan.totalAmount === 0 || !r.loan.principal) return sum;
      const totalInterest = r.loan.totalAmount - r.loan.principal;
      const profitRatio = totalInterest / r.loan.totalAmount;
      return sum + r.amount * profitRatio;
    }, 0);

    const ProfitDistribution = require('../models/ProfitDistribution');
    const distributions = await ProfitDistribution.find(query);
    const totalDistributed = distributions.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Term deposit projected profit is an obligation (liability) that also needs equity offset
    const termDepositProfitObligation = activeTermDeposits.reduce(
      (sum, td) => sum + (td.projectedProfit || 0), 0,
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
};
