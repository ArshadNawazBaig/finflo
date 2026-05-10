const Member = require('../models/Member');
const Loan = require('../models/Loan');
const FinancialTransaction = require('../models/FinancialTransaction');

/**
 * Rule-based insights engine.
 * Runs lightweight queries to detect anomalies and patterns.
 */

/**
 * 1. Members with significant saving rate drop (>30% decline vs 3-month avg)
 */
const detectSavingRateDrops = async (userId) => {
  const insights = [];
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get top depositors by recent 3-month avg
    const pipeline = [
      {
        $match: {
          user: userId,
          type: 'deposit',
          createdAt: { $gte: threeMonthsAgo },
        },
      },
      {
        $group: {
          _id: '$member',
          totalDeposits: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 3 } } }, // only members with enough data
      { $sort: { totalDeposits: -1 } },
      { $limit: 50 },
    ];

    const depositors = await FinancialTransaction.aggregate(pipeline);

    for (const dep of depositors) {
      // Get this month's deposits
      const recentDeposits = await FinancialTransaction.aggregate([
        {
          $match: {
            user: userId,
            member: dep._id,
            type: 'deposit',
            createdAt: { $gte: oneMonthAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const monthlyAvg = dep.totalDeposits / 3;
      const thisMonth = recentDeposits[0]?.total || 0;
      const dropPct = monthlyAvg > 0 ? ((monthlyAvg - thisMonth) / monthlyAvg) * 100 : 0;

      if (dropPct > 30) {
        const member = await Member.findById(dep._id).select('name');
        insights.push({
          type: 'saving_rate_drop',
          severity: dropPct > 60 ? 'critical' : 'warning',
          title: `Saving rate dropped ${Math.round(dropPct)}%`,
          description: `${member?.name || 'A member'}'s deposits this month are significantly below their 3-month average.`,
          memberId: dep._id,
          memberName: member?.name,
          metric: `-${Math.round(dropPct)}%`,
          recommendation: 'Reach out to check if they need assistance or are facing financial difficulty.',
        });
      }
    }
  } catch (e) {
    console.error('[Insights] savingRateDrops error:', e.message);
  }
  return insights;
};

/**
 * 2. Loan default risk — overdue loans + low balance
 */
const detectLoanDefaultRisk = async (userId) => {
  const insights = [];
  try {
    const overdueLoans = await Loan.find({
      user: userId,
      status: 'active',
      isOverdue: true,
    })
      .select('customer remainingAmount emi')
      .populate('customer', 'name currentBalance savingBalance')
      .limit(20);

    for (const loan of overdueLoans) {
      const member = loan.customer;
      if (!member) continue;
      const totalBalance = (member.currentBalance || 0) + (member.savingBalance || 0);

      if (totalBalance < loan.emi * 0.5) {
        insights.push({
          type: 'loan_default_risk',
          severity: 'critical',
          title: 'High default risk',
          description: `${member.name} has an overdue loan with only ${Math.round((totalBalance / loan.emi) * 100)}% of EMI available in balance.`,
          memberId: member._id,
          memberName: member.name,
          metric: `${Math.round(totalBalance)} / ${Math.round(loan.emi)} EMI`,
          recommendation: 'Consider restructuring the loan or initiating recovery process.',
        });
      }
    }
  } catch (e) {
    console.error('[Insights] loanDefaultRisk error:', e.message);
  }
  return insights;
};

/**
 * 3. Inactive members with balances (no activity in 60+ days)
 */
const detectInactiveMembers = async (userId) => {
  const insights = [];
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Members with balance but no recent transactions
    const activeMembers = await FinancialTransaction.distinct('member', {
      user: userId,
      createdAt: { $gte: sixtyDaysAgo },
    });

    const inactiveWithBalance = await Member.find({
      user: userId,
      _id: { $nin: activeMembers },
      $or: [
        { currentBalance: { $gt: 100 } },
        { savingBalance: { $gt: 100 } },
      ],
      approvalStatus: 'approved',
    })
      .select('name currentBalance savingBalance lastLogin')
      .limit(10);

    if (inactiveWithBalance.length > 0) {
      insights.push({
        type: 'inactive_members',
        severity: 'info',
        title: `${inactiveWithBalance.length} inactive member${inactiveWithBalance.length > 1 ? 's' : ''} with balances`,
        description: `These members haven't transacted in 60+ days but still hold funds: ${inactiveWithBalance.slice(0, 3).map((m) => m.name).join(', ')}${inactiveWithBalance.length > 3 ? ` and ${inactiveWithBalance.length - 3} more` : ''}.`,
        memberIds: inactiveWithBalance.map((m) => m._id),
        metric: `${inactiveWithBalance.length} members`,
        recommendation: 'Send a re-engagement notification or check if these accounts need attention.',
      });
    }
  } catch (e) {
    console.error('[Insights] inactiveMembers error:', e.message);
  }
  return insights;
};

/**
 * 4. Credit utilization warning (>80%)
 */
const detectHighCreditUtilization = async (userId) => {
  const insights = [];
  try {
    const members = await Member.find({
      user: userId,
      creditLimit: { $gt: 0 },
      approvalStatus: 'approved',
    }).select('name currentBalance creditLimit');

    for (const member of members) {
      if (member.currentBalance < 0) {
        const utilization = Math.abs(member.currentBalance) / member.creditLimit;
        if (utilization > 0.8) {
          insights.push({
            type: 'credit_utilization',
            severity: utilization > 0.95 ? 'critical' : 'warning',
            title: `${Math.round(utilization * 100)}% credit utilization`,
            description: `${member.name} is using ${Math.round(utilization * 100)}% of their credit limit (${member.creditLimit}).`,
            memberId: member._id,
            memberName: member.name,
            metric: `${Math.round(utilization * 100)}%`,
            recommendation: 'Monitor closely. Consider adjusting the credit limit or flagging for review.',
          });
        }
      }
    }
  } catch (e) {
    console.error('[Insights] creditUtilization error:', e.message);
  }
  return insights;
};

/**
 * 5. Unusual transaction volume (>3x average)
 */
const detectUnusualVolume = async (userId) => {
  const insights = [];
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 3-month avg per member
    const avgPipeline = [
      { $match: { user: userId, createdAt: { $gte: ninetyDaysAgo } } },
      { $group: { _id: '$member', count: { $sum: 1 } } },
      { $match: { count: { $gte: 6 } } }, // needs enough history
    ];

    const avgCounts = await FinancialTransaction.aggregate(avgPipeline);

    for (const avg of avgCounts) {
      const monthlyAvg = avg.count / 3;

      const recentCount = await FinancialTransaction.countDocuments({
        user: userId,
        member: avg._id,
        createdAt: { $gte: thirtyDaysAgo },
      });

      if (recentCount > monthlyAvg * 3 && recentCount > 10) {
        const member = await Member.findById(avg._id).select('name');
        insights.push({
          type: 'unusual_volume',
          severity: 'warning',
          title: 'Unusual transaction volume',
          description: `${member?.name || 'A member'} has ${recentCount} transactions this month vs. an average of ${Math.round(monthlyAvg)}.`,
          memberId: avg._id,
          memberName: member?.name,
          metric: `${recentCount} / avg ${Math.round(monthlyAvg)}`,
          recommendation: 'Review for potential fraud or AML concerns.',
        });
      }
    }
  } catch (e) {
    console.error('[Insights] unusualVolume error:', e.message);
  }
  return insights;
};

// Simple in-memory cache
let insightsCache = { data: null, expiresAt: 0, userId: null };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const runAllInsights = async (userId) => {
  const now = Date.now();
  const userStr = userId.toString();

  if (insightsCache.data && insightsCache.expiresAt > now && insightsCache.userId === userStr) {
    return insightsCache.data;
  }

  const results = await Promise.allSettled([
    detectSavingRateDrops(userId),
    detectLoanDefaultRisk(userId),
    detectInactiveMembers(userId),
    detectHighCreditUtilization(userId),
    detectUnusualVolume(userId),
  ]);

  const insights = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  insightsCache = { data: insights, expiresAt: now + CACHE_TTL, userId: userStr };
  return insights;
};

module.exports = { runAllInsights };
