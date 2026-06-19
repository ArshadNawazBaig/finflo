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

module.exports = {
  generateIFRS9Report,
  generateBasel3Report,
};
