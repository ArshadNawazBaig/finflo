const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

const getReportStats = async (req, res) => {
  try {
    const query = { user: req.user.effectiveOwnerId };

    // Branch Segregation
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    // Aggregate monthly loans
    const monthlyLoans = await Loan.aggregate([
      { $match: query },
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
    const totalLoans = await Loan.find(query);
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

    // Branch Segregation (Optional for regulatory, but usually businesses want it)
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
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
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
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

module.exports = {
  getReportStats,
  generateIFRS9Report,
  generateBasel3Report,
};
