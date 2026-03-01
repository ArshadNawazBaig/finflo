const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

const getReportStats = async (req, res) => {
  try {
    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = req.user.branchId;
    }

    // Exclude rejected loans from financial metrics
    const loanQuery = { ...query, status: { $ne: 'rejected' } };

    // Aggregate monthly loans
    const monthlyLoans = await Loan.aggregate([
      { $match: loanQuery },
      {
        $group: {
          _id: { $month: '$startDate' },
          total: { $sum: '$principal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate monthly repayments
    const monthlyRepayments = await Repayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
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
      name: monthNames[item._id - 1],
      value: item.total,
    }));

    const formattedRepayments = monthlyRepayments.map((item) => ({
      name: monthNames[item._id - 1],
      value: item.total,
    }));

    // Summary Metrics
    const totalLoans = await Loan.find(loanQuery);
    const totalVolume = totalLoans.reduce((sum, l) => sum + l.principal, 0);
    const activeLoansCount = totalLoans.filter(
      (l) => l.status === 'active',
    ).length;

    const { start: prevStart, end: prevEnd } = getMonthDates(1);
    const prevLoans = totalLoans.filter(
      (l) => new Date(l.createdAt) <= prevEnd,
    );
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
      .filter((r) => r.date <= prevEnd)
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
      if (branchScope) query.branchId = req.user.branchId;
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
    const repayments = await Repayment.find(query);

    const loansReceivable = loans.reduce(
      (sum, loan) => sum + (loan.remainingAmount || 0),
      0,
    );

    const totalDeposits = members.reduce(
      (sum, m) => sum + (m.totalInvested || 0),
      0,
    );
    const totalWithdrawn = members.reduce(
      (sum, m) => sum + (m.totalWithdrawn || 0),
      0,
    );
    const totalRepaid = loans.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    const totalDisbursed = loans.reduce(
      (sum, l) => sum + (l.principal || 0),
      0,
    );
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const cashAtHand =
      totalDeposits -
      totalWithdrawn +
      totalRepaid -
      totalDisbursed -
      totalExpenses;
    const totalAssets = loansReceivable + cashAtHand;

    // 2. Liabilities
    const memberCapital = members.reduce(
      (sum, m) => sum + (m.currentBalance || 0),
      0,
    );
    const totalLiabilities = memberCapital;

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

    const retainedEarnings =
      totalInterestEarned - totalDistributed - totalExpenses;
    const totalEquity = retainedEarnings;

    const discrepancy = totalAssets - (totalLiabilities + totalEquity);

    res.status(200).json({
      assets: {
        loansReceivable: Math.round(loansReceivable),
        cashAtHand: Math.round(cashAtHand),
        totalAssets: Math.round(totalAssets),
      },
      liabilities: {
        memberCapital: Math.round(memberCapital),
        totalLiabilities: Math.round(totalLiabilities),
      },
      equity: {
        retainedEarnings: Math.round(retainedEarnings),
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
    const totalRevenue = interestRevenue;

    // 2. Expenses
    const expensesAgg = await FinancialTransaction.aggregate([
      { $match: { ...query, date: dateFilter, type: 'expense' } },
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
    const distributionsQuery = { ...query, distributionDate: dateFilter };
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
      { $match: { ...query, type: 'expense' } },
      {
        $group: {
          _id: '$branchId',
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    const branches = await Branch.find(query);

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

module.exports = {
  getReportStats,
  generateIFRS9Report,
  generateBasel3Report,
  getTrialBalance,
  getProfitAndLoss,
  getBranchSummary,
  saveRegulatorySnapshot,
  getRegulatorySavedSnapshots,
};
