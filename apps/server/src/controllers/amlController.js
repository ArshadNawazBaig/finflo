/**
 * AML Compliance Controller
 * ─────────────────────────
 * Handles all AML/CFT operations: rules, alerts, SARs, CTRs, and dashboard.
 */
const AmlRule = require('../models/AmlRule');
const AmlAlert = require('../models/AmlAlert');
const SuspiciousActivityReport = require('../models/SuspiciousActivityReport');
const CurrencyTransactionReport = require('../models/CurrencyTransactionReport');
const { seedDefaultRules, getDashboardStats } = require('../services/amlService');
const { logSecurityEvent } = require('../utils/securityLogger');

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const getAmlDashboard = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user.effectiveOwnerId);
    res.json(stats);
  } catch (error) {
    console.error('[AML] Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load AML dashboard' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RULES
// ═══════════════════════════════════════════════════════════════════════════════

const getRules = async (req, res) => {
  try {
    const rules = await AmlRule.find({ user: req.user.effectiveOwnerId }).sort({
      createdAt: -1,
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch AML rules' });
  }
};

const createRule = async (req, res) => {
  try {
    const { name, description, type, conditions, severity } = req.body;
    const rule = await AmlRule.create({
      user: req.user.effectiveOwnerId,
      name,
      description,
      type,
      conditions,
      severity,
    });

    logSecurityEvent({
      action: `AML Rule created: ${name}`,
      category: 'compliance',
      severity: 'info',
      userId: req.user._id,
      ip: req.ip,
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create AML rule' });
  }
};

const updateRule = async (req, res) => {
  try {
    const ALLOWED = ['name', 'description', 'threshold', 'severity', 'isActive', 'conditions', 'action'];
    const update = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }
    const rule = await AmlRule.findOneAndUpdate(
      { _id: req.params.id, user: req.user.effectiveOwnerId },
      update,
      { new: true },
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    logSecurityEvent({
      action: `AML Rule updated: ${rule.name}`,
      category: 'compliance',
      severity: 'info',
      userId: req.user._id,
      ip: req.ip,
    });

    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update AML rule' });
  }
};

const deleteRule = async (req, res) => {
  try {
    const rule = await AmlRule.findOneAndDelete({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    logSecurityEvent({
      action: `AML Rule deleted: ${rule.name}`,
      category: 'compliance',
      severity: 'warning',
      userId: req.user._id,
      ip: req.ip,
    });

    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete AML rule' });
  }
};

const seedRules = async (req, res) => {
  try {
    await seedDefaultRules(req.user.effectiveOwnerId);
    const rules = await AmlRule.find({ user: req.user.effectiveOwnerId });
    res.json({ message: 'Default rules seeded', rules });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed rules' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

const getAlerts = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user.effectiveOwnerId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const [alerts, total] = await Promise.all([
      AmlAlert.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('rule', 'name type severity')
        .populate('customer', 'name cnic')
        .populate('member', 'name cnic')
        .populate('assignedTo', 'name email'),
      AmlAlert.countDocuments(filter),
    ]);

    res.json({
      alerts,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
};

const getAlertById = async (req, res) => {
  try {
    const alert = await AmlAlert.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    })
      .populate('rule')
      .populate('customer', 'name email cnic phone')
      .populate('member', 'name email cnic phone')
      .populate('assignedTo', 'name email')
      .populate('transactions')
      .populate('reviewNotes.by', 'name email');

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch alert' });
  }
};

const updateAlertStatus = async (req, res) => {
  try {
    const { status, note, assignedTo, resolutionType, resolutionNotes } = req.body;
    const alert = await AmlAlert.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    const oldStatus = alert.status;

    if (status) alert.status = status;
    if (assignedTo) alert.assignedTo = assignedTo;

    // Add review note
    if (note || status !== oldStatus) {
      alert.reviewNotes.push({
        note: note || `Status changed from ${oldStatus} to ${status}`,
        by: req.user._id,
        action: status !== oldStatus ? 'status_change' : 'note',
      });
    }

    // Resolution
    if (status === 'resolved' || status === 'false_positive') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.user._id;
      if (resolutionType) alert.resolutionType = resolutionType;
      if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    }

    await alert.save();

    logSecurityEvent({
      action: `AML Alert ${alert.alertNumber} status: ${oldStatus} → ${status}`,
      category: 'compliance',
      severity: status === 'escalated' ? 'critical' : 'info',
      userId: req.user._id,
      ip: req.ip,
      metadata: { alertId: alert._id, oldStatus, newStatus: status },
    });

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update alert' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SUSPICIOUS ACTIVITY REPORTS (SAR)
// ═══════════════════════════════════════════════════════════════════════════════

const getSARs = async (req, res) => {
  try {
    const { filingStatus, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user.effectiveOwnerId };
    if (filingStatus) filter.filingStatus = filingStatus;

    const [reports, total] = await Promise.all([
      SuspiciousActivityReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('alert', 'alertNumber severity')
        .populate('customer', 'name')
        .populate('member', 'name')
        .populate('preparedBy', 'name')
        .populate('reviewedBy', 'name'),
      SuspiciousActivityReport.countDocuments(filter),
    ]);

    res.json({ reports, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch SARs' });
  }
};

const createSAR = async (req, res) => {
  try {
    const ALLOWED_SAR_FIELDS = [
      'reportNumber',
      'subject',
      'subjectModel',
      'suspicionType',
      'transactions',
      'amount',
      'narrative',
      'evidence',
      'priority',
      'filingStatus',
      'dueDate',
    ];
    const payload = { user: req.user.effectiveOwnerId, preparedBy: req.user._id };
    for (const f of ALLOWED_SAR_FIELDS) {
      if (req.body[f] !== undefined) payload[f] = req.body[f];
    }
    const sar = await SuspiciousActivityReport.create(payload);

    logSecurityEvent({
      action: `SAR created: ${sar.reportNumber}`,
      category: 'compliance',
      severity: 'warning',
      userId: req.user._id,
      ip: req.ip,
    });

    res.status(201).json(sar);
  } catch (error) {
    console.error('[AML] Create SAR error:', error);
    res.status(500).json({ message: 'Failed to create SAR' });
  }
};

const updateSAR = async (req, res) => {
  try {
    const ALLOWED_SAR_UPDATE = [
      'subject',
      'subjectModel',
      'suspicionType',
      'transactions',
      'amount',
      'narrative',
      'evidence',
      'priority',
      'filingStatus',
      'dueDate',
      'reviewNotes',
    ];
    const update = {};
    for (const f of ALLOWED_SAR_UPDATE) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }
    const sar = await SuspiciousActivityReport.findOneAndUpdate(
      { _id: req.params.id, user: req.user.effectiveOwnerId },
      update,
      { new: true },
    );
    if (!sar) return res.status(404).json({ message: 'SAR not found' });

    if (req.body.filingStatus === 'submitted') {
      sar.submittedAt = new Date();
      sar.submittedBy = req.user._id;
      await sar.save();

      logSecurityEvent({
        action: `SAR submitted to FMU: ${sar.reportNumber}`,
        category: 'compliance',
        severity: 'critical',
        userId: req.user._id,
        ip: req.ip,
      });
    }

    res.json(sar);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update SAR' });
  }
};

const getSARById = async (req, res) => {
  try {
    const sar = await SuspiciousActivityReport.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    })
      .populate('alert')
      .populate('customer', 'name email cnic phone')
      .populate('member', 'name email cnic phone')
      .populate('preparedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('submittedBy', 'name email')
      .populate('transactionDetails.transactionId');

    if (!sar) return res.status(404).json({ message: 'SAR not found' });
    res.json(sar);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch SAR' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CURRENCY TRANSACTION REPORTS (CTR)
// ═══════════════════════════════════════════════════════════════════════════════

const getCTRs = async (req, res) => {
  try {
    const { filingStatus, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user.effectiveOwnerId };
    if (filingStatus) filter.filingStatus = filingStatus;

    const [reports, total] = await Promise.all([
      CurrencyTransactionReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('customer', 'name cnic')
        .populate('member', 'name cnic')
        .populate('transaction', 'amount category date')
        .populate('branchId', 'name'),
      CurrencyTransactionReport.countDocuments(filter),
    ]);

    res.json({ reports, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch CTRs' });
  }
};

const reviewCTR = async (req, res) => {
  try {
    const { filingStatus, notes } = req.body;
    const ctr = await CurrencyTransactionReport.findOneAndUpdate(
      { _id: req.params.id, user: req.user.effectiveOwnerId },
      {
        filingStatus,
        notes,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        ...(filingStatus === 'submitted' ? { submittedAt: new Date() } : {}),
      },
      { new: true },
    );
    if (!ctr) return res.status(404).json({ message: 'CTR not found' });
    res.json(ctr);
  } catch (error) {
    res.status(500).json({ message: 'Failed to review CTR' });
  }
};

module.exports = {
  getAmlDashboard,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  seedRules,
  getAlerts,
  getAlertById,
  updateAlertStatus,
  getSARs,
  createSAR,
  updateSAR,
  getSARById,
  getCTRs,
  reviewCTR,
};
