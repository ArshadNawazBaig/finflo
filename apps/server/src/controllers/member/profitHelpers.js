const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const BusinessShare = require('../../models/BusinessShare');
const ProfitDistribution = require('../../models/ProfitDistribution');
const FinancialTransaction = require('../../models/FinancialTransaction');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Repayment = require('../../models/Repayment');
const ActivityLog = require('../../models/ActivityLog');
const loanRepaymentService = require('../../services/loanRepaymentService');
const Loan = require('../../models/Loan');
const Checkbook = require('../../models/Checkbook');
const { canAddMember } = require('../../utils/planLimits');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const {
  deleteCloudinaryFileByUrl,
  uploadSignature,
} = require('../../utils/cloudinaryHelper');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const raastService = require('../../services/raastService');
const {
  transactionEmail,
  memberApprovalEmail,
} = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const Branch = require('../../models/Branch');
const { updateMemberCreditLimit } = require('../../services/creditLimitService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { escapeRegExp } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

/**
 * Helper to calculate the Daily Weighted Average Balance for a member
 * during a specific period.
 */
const calculateWeightedAverageBalance = async (
  memberId,
  startDate,
  endDate,
  type = 'regular',
) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Calculate days in period
  const diffTime = Math.abs(end - start);
  const daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  let currentBalance = 0;
  let events = [];

  if (type === 'regular' || type === 'investment') {
    // 1. Calculate balance at the start of the period
    const [invSum, profitSum] = await Promise.all([
      Investment.aggregate([
        { $match: { member: memberId, date: { $lt: start } } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$type',
                      [
                        'deposit',
                        'transfer_receive',
                        'external_receive',
                        'p2p_receive',
                        'loan_disbursement',
                      ],
                    ],
                  },
                  '$amount',
                  { $multiply: ['$amount', -1] },
                ],
              },
            },
          },
        },
      ]),
      ProfitDistribution.aggregate([
        {
          $match: {
            member: memberId,
            type: { $in: ['regular', null] },
            date: { $lt: start },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    currentBalance = (invSum[0]?.total || 0) + (profitSum[0]?.total || 0);

    // 2. Get all events within the period
    const [investments, profits] = await Promise.all([
      Investment.find({
        member: memberId,
        date: { $gte: start, $lte: end },
      }).sort({ date: 1 }),
      ProfitDistribution.find({
        member: memberId,
        type: { $in: ['regular', null] },
        date: { $gte: start, $lte: end },
      }).sort({ date: 1 }),
    ]);

    events = [
      ...investments.map((i) => ({
        date: i.date,
        amount: [
          'deposit',
          'transfer_receive',
          'external_receive',
          'p2p_receive',
          'loan_disbursement',
        ].includes(i.type)
          ? i.amount
          : -i.amount,
      })),
      ...profits.map((p) => ({ date: p.date, amount: p.amount })),
    ].sort((a, b) => a.date - b.date);
  } else {
    // Share calculation
    const shareSum = await BusinessShare.aggregate([
      { $match: { member: memberId, date: { $lt: start } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $in: ['$type', ['share_deposit', 'share_profit']] },
                '$amount',
                { $multiply: ['$amount', -1] },
              ],
            },
          },
        },
      },
    ]);

    currentBalance = shareSum[0]?.total || 0;

    const shareEvents = await BusinessShare.find({
      member: memberId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    events = shareEvents.map((s) => ({
      date: s.date,
      amount: ['share_deposit', 'share_profit'].includes(s.type)
        ? s.amount
        : -s.amount,
    }));
  }

  // 3. Calculate daily sum
  let totalWeightedBalance = 0;
  let tempDate = new Date(start);
  let eventIndex = 0;

  for (let d = 0; d < daysInPeriod; d++) {
    const dayEnd = new Date(tempDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Apply all events that happened up to today's end
    while (eventIndex < events.length && events[eventIndex].date <= dayEnd) {
      currentBalance += events[eventIndex].amount;
      eventIndex++;
    }

    // Balance shouldn't realistically be negative for profit calc, but we floor it at 0
    totalWeightedBalance += Math.max(0, currentBalance);
    tempDate.setDate(tempDate.getDate() + 1);
  }

  return totalWeightedBalance / daysInPeriod;
};

module.exports = { calculateWeightedAverageBalance };
