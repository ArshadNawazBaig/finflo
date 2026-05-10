const Loan = require('../models/Loan');
const ScheduledPayment = require('../models/ScheduledPayment');
const Member = require('../models/Member');

/**
 * @desc    Get calendar events for a member
 * @route   GET /api/members/portal/calendar?month=YYYY-MM
 * @access  Private (Member)
 */
const getMemberCalendarEvents = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const memberId = req.member._id;
    const userId = req.member.user;

    let startDate, endDate;
    if (month) {
      startDate = new Date(`${month}-01T00:00:00.000Z`);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const events = [];

    // 1. Active loan EMI dates
    const activeLoans = await Loan.find({
      customer: req.member.customer,
      user: userId,
      status: { $in: ['active', 'pending'] },
    }).select('principal emi duration startDate status remainingAmount');

    for (const loan of activeLoans) {
      if (!loan.startDate || !loan.duration) continue;
      const loanStart = new Date(loan.startDate);

      for (let i = 1; i <= loan.duration; i++) {
        const dueDate = new Date(loanStart);
        dueDate.setMonth(dueDate.getMonth() + i);

        if (dueDate >= startDate && dueDate < endDate) {
          events.push({
            id: `loan-${loan._id}-${i}`,
            date: dueDate.toISOString().split('T')[0],
            title: `Loan EMI #${i}`,
            type: 'emi',
            amount: loan.emi,
            status: loan.status,
            meta: { loanId: loan._id, installment: i, total: loan.duration },
          });
        }
      }
    }

    // 2. Scheduled payments
    const scheduledPayments = await ScheduledPayment.find({
      member: memberId,
      user: userId,
      status: 'active',
    }).select('type amount dayOfMonth nextExecutionDate description');

    for (const sp of scheduledPayments) {
      // Show the next execution date if it falls in the requested month
      if (sp.nextExecutionDate >= startDate && sp.nextExecutionDate < endDate) {
        events.push({
          id: `sp-${sp._id}`,
          date: sp.nextExecutionDate.toISOString().split('T')[0],
          title: sp.type === 'saving_deposit' ? 'Scheduled Saving Deposit' : 'Scheduled Loan Payment',
          type: 'scheduled',
          amount: sp.amount,
          status: 'active',
          meta: { paymentType: sp.type, description: sp.description },
        });
      }
    }

    // 3. Term deposits maturity (check if TermDeposit model exists)
    try {
      const TermDeposit = require('../models/TermDeposit');
      const termDeposits = await TermDeposit.find({
        member: memberId,
        user: userId,
        status: 'active',
      }).select('amount maturityDate termMonths interestRate');

      for (const td of termDeposits) {
        if (td.maturityDate && td.maturityDate >= startDate && td.maturityDate < endDate) {
          events.push({
            id: `td-${td._id}`,
            date: td.maturityDate.toISOString().split('T')[0],
            title: 'Term Deposit Maturity',
            type: 'maturity',
            amount: td.amount,
            status: 'active',
            meta: { termMonths: td.termMonths, interestRate: td.interestRate },
          });
        }
      }
    } catch (e) {
      // TermDeposit model may not exist yet
    }

    res.json(events);
  } catch (error) {
    console.error('getMemberCalendarEvents Error:', error);
    res.status(500).json({ message: 'Failed to load calendar events.' });
  }
};

/**
 * @desc    Get calendar events for admin (org-wide, branch filterable)
 * @route   GET /api/calendar?month=YYYY-MM&branchId=xxx
 * @access  Private (Admin/Staff)
 */
const getAdminCalendarEvents = async (req, res) => {
  try {
    const { month, branchId } = req.query;
    const userId = req.user.effectiveOwnerId;

    let startDate, endDate;
    if (month) {
      startDate = new Date(`${month}-01T00:00:00.000Z`);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const events = [];
    const loanQuery = { user: userId, status: { $in: ['active'] } };
    if (branchId) loanQuery.branchId = branchId;

    // 1. All active loan EMIs
    const activeLoans = await Loan.find(loanQuery)
      .select('principal emi duration startDate status customer')
      .populate('customer', 'name')
      .limit(200);

    for (const loan of activeLoans) {
      if (!loan.startDate || !loan.duration) continue;
      const loanStart = new Date(loan.startDate);

      for (let i = 1; i <= loan.duration; i++) {
        const dueDate = new Date(loanStart);
        dueDate.setMonth(dueDate.getMonth() + i);

        if (dueDate >= startDate && dueDate < endDate) {
          events.push({
            id: `loan-${loan._id}-${i}`,
            date: dueDate.toISOString().split('T')[0],
            title: `EMI - ${loan.customer?.name || 'Member'}`,
            type: 'emi',
            amount: loan.emi,
            status: loan.status,
          });
        }
      }
    }

    // 2. Scheduled payments
    const spQuery = { user: userId, status: 'active' };
    if (branchId) {
      const memberIds = await Member.find({ user: userId, branchId }).distinct('_id');
      spQuery.member = { $in: memberIds };
    }

    const scheduledPayments = await ScheduledPayment.find(spQuery)
      .select('type amount nextExecutionDate member')
      .populate('member', 'name')
      .limit(200);

    for (const sp of scheduledPayments) {
      if (sp.nextExecutionDate >= startDate && sp.nextExecutionDate < endDate) {
        events.push({
          id: `sp-${sp._id}`,
          date: sp.nextExecutionDate.toISOString().split('T')[0],
          title: `${sp.type === 'saving_deposit' ? 'Saving' : 'Repayment'} - ${sp.member?.name || 'Member'}`,
          type: 'scheduled',
          amount: sp.amount,
          status: 'active',
        });
      }
    }

    res.json(events);
  } catch (error) {
    console.error('getAdminCalendarEvents Error:', error);
    res.status(500).json({ message: 'Failed to load calendar events.' });
  }
};

module.exports = {
  getMemberCalendarEvents,
  getAdminCalendarEvents,
};
