/**
 * AML Transaction Monitoring Service
 * ───────────────────────────────────
 * Real-time transaction screening engine.
 * Called after every financial transaction to check against active AML rules.
 * Generates alerts and CTRs automatically.
 */
const AmlRule = require('../models/AmlRule');
const AmlAlert = require('../models/AmlAlert');
const CurrencyTransactionReport = require('../models/CurrencyTransactionReport');
const FinancialTransaction = require('../models/FinancialTransaction');
const { logSecurityEvent } = require('../utils/securityLogger');

// Default CTR threshold (PKR 2,000,000) — overridden by SystemSettings
const DEFAULT_CTR_THRESHOLD = 2000000;

/**
 * Screen a transaction against all active AML rules for the business.
 * Called after every financial transaction is created.
 *
 * @param {Object} transaction - The FinancialTransaction document
 * @param {Object} options - { userId, customerId, memberId, branchId }
 */
const screenTransaction = async (transaction, options = {}) => {
  try {
    const { userId, customerId, memberId, branchId } = options;
    if (!userId) return;

    // Get active rules for this business
    const rules = await AmlRule.find({ user: userId, isActive: true }).lean();
    if (!rules || rules.length === 0) return;

    const alerts = [];

    for (const rule of rules) {
      let triggered = false;
      let description = '';

      switch (rule.type) {
        case 'threshold':
          ({ triggered, description } = await checkThreshold(rule, transaction));
          break;
        case 'velocity':
          ({ triggered, description } = await checkVelocity(
            rule,
            transaction,
            userId,
            customerId,
            memberId,
          ));
          break;
        case 'structuring':
          ({ triggered, description } = await checkStructuring(
            rule,
            transaction,
            userId,
            customerId,
            memberId,
          ));
          break;
        case 'pattern':
          ({ triggered, description } = await checkPattern(
            rule,
            transaction,
            userId,
            customerId,
            memberId,
          ));
          break;
      }

      if (triggered) {
        alerts.push({ rule, description });
      }
    }

    // Create alerts for triggered rules
    for (const { rule, description } of alerts) {
      await createAlert({
        userId,
        rule,
        transaction,
        customerId,
        memberId,
        description,
      });
    }

    // Check CTR threshold (cash transactions only)
    if (
      transaction.paymentMethod === 'cash' &&
      transaction.amount >= DEFAULT_CTR_THRESHOLD
    ) {
      await generateCTR(transaction, options);
    }
  } catch (error) {
    // Never let AML screening crash the main transaction flow
    console.error('[AML] screenTransaction error:', error.message);
  }
};

/**
 * Threshold Rule: Flag transactions exceeding a specific amount.
 */
const checkThreshold = async (rule, transaction) => {
  const threshold = rule.conditions?.amount || 0;
  if (threshold <= 0) return { triggered: false };

  if (transaction.amount >= threshold) {
    return {
      triggered: true,
      description: `Transaction of ${transaction.amount.toLocaleString()} exceeds threshold of ${threshold.toLocaleString()}`,
    };
  }
  return { triggered: false };
};

/**
 * Velocity Rule: Flag when transaction count exceeds limit within time window.
 */
const checkVelocity = async (rule, transaction, userId, customerId, memberId) => {
  const maxCount = rule.conditions?.count || 0;
  const periodHours = rule.conditions?.periodHours || 24;
  if (maxCount <= 0) return { triggered: false };

  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);
  const filter = { user: userId, createdAt: { $gte: since } };
  if (customerId) filter.customer = customerId;
  if (memberId) filter.member = memberId;

  const count = await FinancialTransaction.countDocuments(filter);

  if (count >= maxCount) {
    return {
      triggered: true,
      description: `${count} transactions within ${periodHours}h window (limit: ${maxCount})`,
    };
  }
  return { triggered: false };
};

/**
 * Structuring Rule: Flag multiple transactions just below a threshold.
 * Detects attempts to break large amounts into smaller ones to avoid detection.
 */
const checkStructuring = async (rule, transaction, userId, customerId, memberId) => {
  const thresholdAmount = rule.conditions?.amount || DEFAULT_CTR_THRESHOLD;
  const belowPercent = rule.conditions?.belowThresholdPercent || 90;
  const minCount = rule.conditions?.structuringCount || 3;
  const periodHours = rule.conditions?.structuringPeriodHours || 24;

  const lowerBound = thresholdAmount * (belowPercent / 100);
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);

  const filter = {
    user: userId,
    createdAt: { $gte: since },
    amount: { $gte: lowerBound, $lt: thresholdAmount },
  };
  if (customerId) filter.customer = customerId;
  if (memberId) filter.member = memberId;

  const suspiciousTransactions = await FinancialTransaction.find(filter)
    .select('_id amount')
    .lean();

  if (suspiciousTransactions.length >= minCount) {
    const total = suspiciousTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      triggered: true,
      description: `Possible structuring: ${suspiciousTransactions.length} transactions between ${lowerBound.toLocaleString()} and ${thresholdAmount.toLocaleString()} totaling ${total.toLocaleString()} within ${periodHours}h`,
    };
  }
  return { triggered: false };
};

/**
 * Pattern Rule: Detect specific transaction patterns.
 */
const checkPattern = async (rule, transaction, userId, customerId, memberId) => {
  const patternType = rule.conditions?.patternType;
  if (!patternType) return { triggered: false };

  switch (patternType) {
    case 'round_trip': {
      // Deposit followed by immediate withdrawal of similar amount
      const since = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours
      const filter = { user: userId, createdAt: { $gte: since } };
      if (customerId) filter.customer = customerId;
      if (memberId) filter.member = memberId;

      const recentTransactions = await FinancialTransaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const deposits = recentTransactions.filter(
        (t) => t.category === 'deposit' || t.category === 'saving_deposit',
      );
      const withdrawals = recentTransactions.filter(
        (t) => t.category === 'withdrawal' || t.category === 'saving_withdrawal',
      );

      for (const dep of deposits) {
        for (const wth of withdrawals) {
          const amountDiff = Math.abs(dep.amount - wth.amount) / dep.amount;
          if (amountDiff < 0.1) {
            // Within 10% of each other
            return {
              triggered: true,
              description: `Round-trip pattern detected: deposit of ${dep.amount.toLocaleString()} and withdrawal of ${wth.amount.toLocaleString()} within 4 hours`,
            };
          }
        }
      }
      return { triggered: false };
    }

    case 'rapid_movement': {
      // Multiple transfers in quick succession
      const since = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour
      const filter = {
        user: userId,
        createdAt: { $gte: since },
        category: { $in: ['transfer', 'external_transfer'] },
      };
      if (customerId) filter.customer = customerId;
      if (memberId) filter.member = memberId;

      const transfers = await FinancialTransaction.countDocuments(filter);
      if (transfers >= 5) {
        return {
          triggered: true,
          description: `Rapid fund movement: ${transfers} transfers within 1 hour`,
        };
      }
      return { triggered: false };
    }

    default:
      return { triggered: false };
  }
};

/**
 * Create an AML alert from a triggered rule.
 */
const createAlert = async ({ userId, rule, transaction, customerId, memberId, description }) => {
  try {
    // Check if a similar alert already exists (prevent duplicates within 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await AmlAlert.findOne({
      user: userId,
      rule: rule._id,
      customer: customerId || undefined,
      member: memberId || undefined,
      status: { $in: ['new', 'under_review'] },
      createdAt: { $gte: since },
    });

    if (existing) {
      // Add transaction to existing alert
      if (!existing.transactions.includes(transaction._id)) {
        existing.transactions.push(transaction._id);
        existing.totalAmount += transaction.amount;
        existing.transactionCount += 1;
        await existing.save();
      }
      return existing;
    }

    // Calculate risk score
    const severityScores = { low: 25, medium: 50, high: 75, critical: 100 };
    const riskScore = severityScores[rule.severity] || 50;

    const alert = await AmlAlert.create({
      user: userId,
      rule: rule._id,
      customer: customerId || undefined,
      member: memberId || undefined,
      transactions: [transaction._id],
      title: `${rule.name} — ${rule.type.charAt(0).toUpperCase() + rule.type.slice(1)} Alert`,
      description,
      severity: rule.severity,
      totalAmount: transaction.amount,
      transactionCount: 1,
      riskScore,
    });

    // Update rule trigger count
    await AmlRule.findByIdAndUpdate(rule._id, {
      $inc: { totalTriggered: 1 },
      lastTriggeredAt: new Date(),
    });

    // Log security event
    logSecurityEvent({
      action: `AML Alert generated: ${rule.name}`,
      category: 'compliance',
      severity: rule.severity === 'critical' ? 'critical' : 'warning',
      userId,
      details: description,
      metadata: {
        alertId: alert._id,
        ruleId: rule._id,
        transactionId: transaction._id,
        amount: transaction.amount,
        severity: rule.severity,
      },
    });

    return alert;
  } catch (error) {
    console.error('[AML] createAlert error:', error.message);
  }
};

/**
 * Auto-generate a Currency Transaction Report for large cash transactions.
 */
const generateCTR = async (transaction, options = {}) => {
  try {
    const { userId, customerId, memberId, branchId } = options;

    // Get customer/member name
    let subjectName = 'Unknown';
    let subjectCNIC = '';
    if (customerId) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(customerId).select('name cnic').lean();
      if (customer) {
        subjectName = customer.name;
        subjectCNIC = customer.cnic || '';
      }
    } else if (memberId) {
      const Member = require('../models/Member');
      const member = await Member.findById(memberId).select('name cnic').lean();
      if (member) {
        subjectName = member.name;
        subjectCNIC = member.cnic || '';
      }
    }

    await CurrencyTransactionReport.create({
      user: userId,
      transaction: transaction._id,
      customer: customerId || undefined,
      member: memberId || undefined,
      subjectName,
      subjectCNIC,
      amount: transaction.amount,
      transactionType: transaction.category,
      transactionDate: transaction.date || new Date(),
      paymentMethod: transaction.paymentMethod || 'cash',
      branchId: branchId || transaction.branchId || undefined,
    });

    logSecurityEvent({
      action: `CTR auto-generated for cash transaction of ${transaction.amount.toLocaleString()}`,
      category: 'compliance',
      severity: 'warning',
      userId,
      details: `Subject: ${subjectName}, Amount: ${transaction.amount}`,
      metadata: {
        transactionId: transaction._id,
        amount: transaction.amount,
      },
    });
  } catch (error) {
    console.error('[AML] generateCTR error:', error.message);
  }
};

/**
 * Seed default AML rules for a new business.
 * Called when a business first enables AML compliance.
 */
const seedDefaultRules = async (userId) => {
  const existingCount = await AmlRule.countDocuments({ user: userId });
  if (existingCount > 0) return; // Already seeded

  const defaultRules = [
    {
      user: userId,
      name: 'High Value Cash Transaction',
      description: 'Flag cash transactions exceeding PKR 2,000,000',
      type: 'threshold',
      conditions: { amount: 2000000, paymentMethods: ['cash'] },
      severity: 'high',
    },
    {
      user: userId,
      name: 'Large Online Transfer',
      description: 'Flag online transactions exceeding PKR 5,000,000',
      type: 'threshold',
      conditions: { amount: 5000000, paymentMethods: ['online'] },
      severity: 'high',
    },
    {
      user: userId,
      name: 'Rapid Transaction Velocity',
      description: 'Flag accounts with more than 15 transactions in 24 hours',
      type: 'velocity',
      conditions: { count: 15, periodHours: 24 },
      severity: 'medium',
    },
    {
      user: userId,
      name: 'Cash Structuring Detection',
      description: 'Flag multiple cash transactions just below reporting threshold',
      type: 'structuring',
      conditions: {
        amount: 2000000,
        belowThresholdPercent: 80,
        structuringCount: 3,
        structuringPeriodHours: 48,
      },
      severity: 'critical',
    },
    {
      user: userId,
      name: 'Round-Trip Fund Movement',
      description: 'Detect deposit-then-withdrawal of similar amounts within hours',
      type: 'pattern',
      conditions: { patternType: 'round_trip' },
      severity: 'high',
    },
    {
      user: userId,
      name: 'Rapid Fund Transfers',
      description: 'Flag 5+ transfers within a single hour',
      type: 'pattern',
      conditions: { patternType: 'rapid_movement' },
      severity: 'medium',
    },
  ];

  await AmlRule.insertMany(defaultRules);
  console.log(`[AML] Seeded ${defaultRules.length} default rules for user ${userId}`);
};

/**
 * Get AML dashboard statistics for a business.
 */
const getDashboardStats = async (userId) => {
  const [
    totalAlerts,
    newAlerts,
    underReview,
    escalated,
    resolvedThisMonth,
    alertsBySeverity,
    recentAlerts,
    pendingSARs,
    pendingCTRs,
  ] = await Promise.all([
    AmlAlert.countDocuments({ user: userId }),
    AmlAlert.countDocuments({ user: userId, status: 'new' }),
    AmlAlert.countDocuments({ user: userId, status: 'under_review' }),
    AmlAlert.countDocuments({ user: userId, status: 'escalated' }),
    AmlAlert.countDocuments({
      user: userId,
      status: { $in: ['resolved', 'false_positive'] },
      resolvedAt: { $gte: new Date(new Date().setDate(1)) },
    }),
    AmlAlert.aggregate([
      { $match: { user: userId, status: { $in: ['new', 'under_review', 'escalated'] } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    AmlAlert.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('rule', 'name type')
      .populate('customer', 'name')
      .populate('member', 'name')
      .lean(),
    require('../models/SuspiciousActivityReport').countDocuments({
      user: userId,
      filingStatus: { $in: ['draft', 'pending_review'] },
    }),
    CurrencyTransactionReport.countDocuments({
      user: userId,
      filingStatus: 'auto_generated',
    }),
  ]);

  const severityMap = {};
  alertsBySeverity.forEach((s) => (severityMap[s._id] = s.count));

  return {
    totalAlerts,
    openAlerts: newAlerts + underReview + escalated,
    newAlerts,
    underReview,
    escalated,
    resolvedThisMonth,
    severity: {
      critical: severityMap.critical || 0,
      high: severityMap.high || 0,
      medium: severityMap.medium || 0,
      low: severityMap.low || 0,
    },
    recentAlerts,
    pendingSARs,
    pendingCTRs,
    complianceScore: calculateComplianceScore({
      newAlerts,
      underReview,
      escalated,
      pendingSARs,
      pendingCTRs,
    }),
  };
};

/**
 * Calculate a compliance health score (0-100).
 */
const calculateComplianceScore = ({ newAlerts, underReview, escalated, pendingSARs, pendingCTRs }) => {
  let score = 100;
  score -= newAlerts * 5; // -5 per unreviewed alert
  score -= underReview * 2; // -2 per alert under review (being handled)
  score -= escalated * 8; // -8 per escalated alert
  score -= pendingSARs * 10; // -10 per unfiled SAR
  score -= pendingCTRs * 3; // -3 per unreviewed CTR
  return Math.max(0, Math.min(100, score));
};

module.exports = {
  screenTransaction,
  seedDefaultRules,
  getDashboardStats,
  generateCTR,
  DEFAULT_CTR_THRESHOLD,
};
