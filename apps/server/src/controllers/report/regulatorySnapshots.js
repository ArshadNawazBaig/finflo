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
  saveRegulatorySnapshot,
  getRegulatorySavedSnapshots,
};
