const ScheduledPayment = require('../models/ScheduledPayment');
const Member = require('../models/Member');

/**
 * Calculate the next execution date based on day of month.
 * If today's day >= dayOfMonth, schedule for next month.
 */
const getNextExecutionDate = (dayOfMonth) => {
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (next <= now) {
    next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  }
  return next;
};

// @desc    Create a scheduled payment
// @route   POST /api/scheduled-payments
// @access  Private (Member)
const createScheduledPayment = async (req, res) => {
  try {
    const memberId = req.member._id;
    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const { type, amount, sourceAccount, dayOfMonth, maxExecutions, loanId, description } = req.body;

    if (!type || !amount || !dayOfMonth) {
      return res.status(400).json({ message: 'Type, amount, and day of month are required' });
    }

    if (dayOfMonth < 1 || dayOfMonth > 28) {
      return res.status(400).json({ message: 'Day of month must be between 1 and 28' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Validate loan exists for loan_repayment type
    if (type === 'loan_repayment' && !loanId) {
      return res.status(400).json({ message: 'Loan ID is required for loan repayment schedules' });
    }

    const nextExecutionDate = getNextExecutionDate(dayOfMonth);

    const scheduled = await ScheduledPayment.create({
      member: memberId,
      user: member.user,
      type,
      amount,
      sourceAccount: sourceAccount || 'current',
      dayOfMonth,
      nextExecutionDate,
      maxExecutions: maxExecutions || null,
      loanId: loanId || null,
      description: description || `Scheduled ${type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'}`,
    });

    res.status(201).json(scheduled);
  } catch (error) {
    console.error('Create Scheduled Payment Error:', error);
    res.status(500).json({ message: 'Failed to create scheduled payment' });
  }
};

// @desc    Get my scheduled payments
// @route   GET /api/scheduled-payments
// @access  Private (Member)
const getMyScheduledPayments = async (req, res) => {
  try {
    const payments = await ScheduledPayment.find({
      member: req.member._id,
    })
      .sort({ createdAt: -1 })
      .populate('loanId', 'principal status emi');

    res.json(payments);
  } catch (error) {
    console.error('Get Scheduled Payments Error:', error);
    res.status(500).json({ message: 'Failed to fetch scheduled payments' });
  }
};

// @desc    Update a scheduled payment (pause/resume/modify)
// @route   PUT /api/scheduled-payments/:id
// @access  Private (Member)
const updateScheduledPayment = async (req, res) => {
  try {
    const payment = await ScheduledPayment.findOne({
      _id: req.params.id,
      member: req.member._id,
    });

    if (!payment) {
      return res.status(404).json({ message: 'Scheduled payment not found' });
    }

    const { status, amount, dayOfMonth } = req.body;

    if (status) {
      if (!['active', 'paused'].includes(status)) {
        return res.status(400).json({ message: 'Status can only be set to active or paused' });
      }
      payment.status = status;
      if (status === 'active' && payment.failureReason) {
        payment.failureReason = undefined;
        payment.nextExecutionDate = getNextExecutionDate(payment.dayOfMonth);
      }
    }

    if (amount && amount > 0) {
      payment.amount = amount;
    }

    if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 28) {
      payment.dayOfMonth = dayOfMonth;
      payment.nextExecutionDate = getNextExecutionDate(dayOfMonth);
    }

    await payment.save();
    res.json(payment);
  } catch (error) {
    console.error('Update Scheduled Payment Error:', error);
    res.status(500).json({ message: 'Failed to update scheduled payment' });
  }
};

// @desc    Delete a scheduled payment
// @route   DELETE /api/scheduled-payments/:id
// @access  Private (Member)
const deleteScheduledPayment = async (req, res) => {
  try {
    const payment = await ScheduledPayment.findOneAndDelete({
      _id: req.params.id,
      member: req.member._id,
    });

    if (!payment) {
      return res.status(404).json({ message: 'Scheduled payment not found' });
    }

    res.json({ message: 'Scheduled payment cancelled' });
  } catch (error) {
    console.error('Delete Scheduled Payment Error:', error);
    res.status(500).json({ message: 'Failed to delete scheduled payment' });
  }
};

module.exports = {
  createScheduledPayment,
  getMyScheduledPayments,
  updateScheduledPayment,
  deleteScheduledPayment,
};
