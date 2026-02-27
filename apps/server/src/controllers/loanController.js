const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Member = require('../models/Member');
const Branch = require('../models/Branch');
const { canCreateLoan } = require('../utils/planLimits');
const { calculateRiskScore } = require('../utils/riskService');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../utils/notificationHelper');
const { logActivity } = require('./activityLogController');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');
const loanRepaymentService = require('../services/loanRepaymentService');
const { sendEmail } = require('../utils/email');
const { transactionEmail } = require('../utils/emailTemplates');
const {
  updateMemberCreditLimit,
  calculateCreditLimit,
} = require('../services/creditLimitService');

// EMI Calculation Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
// P = Principal, r = monthly interest rate (annual rate / 12 / 100), n = duration in months
const calculateEMI = (principal, rate, duration) => {
  const r = rate / 12 / 100;
  if (r === 0) return principal / duration;
  const emi =
    (principal * r * Math.pow(1 + r, duration)) /
    (Math.pow(1 + r, duration) - 1);
  return emi;
};

const calculateSimpleInterest = (principal, rate, duration) => {
  const totalInterest = (principal * rate * duration) / 1200;
  const totalAmount = principal + totalInterest;
  const emi = totalAmount / duration;
  return { emi, totalAmount };
};

const createLoan = async (req, res) => {
  const {
    customerId,
    principal: principalInput,
    rate: rateInput,
    duration: durationInput,
    startDate,
    interestType = 'simple',
    grantor1Identifier,
    grantor2Identifier,
    product, // New: Optional LoanProduct ID
  } = req.body;

  const principal = Number(principalInput);
  const rate = Number(rateInput);
  const duration = Number(durationInput);

  try {
    let grantor1Id = null;
    let grantor2Id = null;

    if (grantor1Identifier) {
      const Member = require('../models/Member');
      const grantor1 = await Member.findOne({
        user: req.user.effectiveOwnerId,
        $or: [{ cnic: grantor1Identifier }, { phone: grantor1Identifier }],
      });

      if (!grantor1) {
        return res.status(404).json({
          message:
            'Grantor 1 not found. Please provide a valid Member CNIC or Phone number.',
        });
      }
      grantor1Id = grantor1._id;
    }

    if (grantor2Identifier) {
      const Member = require('../models/Member');
      const grantor2 = await Member.findOne({
        user: req.user.effectiveOwnerId,
        $or: [{ cnic: grantor2Identifier }, { phone: grantor2Identifier }],
      });

      if (!grantor2) {
        return res.status(404).json({
          message:
            'Grantor 2 not found. Please provide a valid Member CNIC or Phone number.',
        });
      }
      grantor2Id = grantor2._id;
    }

    if (
      grantor1Id &&
      grantor2Id &&
      grantor1Id.toString() === grantor2Id.toString()
    ) {
      return res.status(400).json({
        message: 'Grantor 1 and Grantor 2 must be different members.',
      });
    }

    const customer = await Customer.findById(customerId);
    if (
      !customer ||
      customer.user.toString() !== req.user.effectiveOwnerId.toString()
    ) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validation: Grantor cannot be the borrower
    if (
      customer.memberId &&
      ((grantor1Id && grantor1Id.toString() === customer.memberId.toString()) ||
        (grantor2Id && grantor2Id.toString() === customer.memberId.toString()))
    ) {
      return res.status(400).json({
        message: 'A borrower cannot be their own grantor.',
      });
    }

    if (
      !customer.accountNumber &&
      !customer.savingAccountNumber &&
      !customer.currentAccountNumber
    ) {
      return res.status(400).json({
        message:
          'Customer does not have an account number. Please assign a Saving or Current account before issuing a loan.',
      });
    }

    // Check for existing active loan
    const activeLoan = await Loan.findOne({
      customer: customerId,
      status: 'active',
      user: req.user.effectiveOwnerId,
    });

    if (activeLoan) {
      return res.status(400).json({
        message: 'Customer already has an active loan. Please close it first.',
      });
    }

    // Credit Limit Enforcement
    // - If the customer is a member: limit is derived from shareBalance (business share investment).
    // - If the customer is NOT a member: no credit limit is enforced (no investment balance exists).
    if (customer.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        // Dynamically calculate from live shareBalance to avoid stale stored values
        const effectiveCreditLimit = await calculateCreditLimit(member._id);
        if (principal > effectiveCreditLimit) {
          return res.status(400).json({
            message: `Loan amount (${principal.toLocaleString()}) exceeds the member's credit limit of Rs. ${effectiveCreditLimit.toLocaleString()} (based on share balance).`,
          });
        }
        // Keep the stored value in sync
        await Member.findByIdAndUpdate(member._id, {
          creditLimit: effectiveCreditLimit,
        });
      }
    }

    // Check plan limits
    const user = await User.findById(req.user.effectiveOwnerId).select('plan');
    const userPlan = user.plan || 'Free';

    // Count existing loans for this user
    const loanCount = await Loan.countDocuments({
      user: req.user.effectiveOwnerId,
    });

    // Validate against plan limits
    const limitCheck = await canCreateLoan(userPlan, loanCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    let emi, totalAmount;

    if (interestType === 'simple') {
      const result = calculateSimpleInterest(principal, rate, duration);
      emi = Math.round(result.emi);
      totalAmount = Math.round(result.totalAmount);
    } else {
      emi = Math.round(calculateEMI(principal, rate, duration));
      totalAmount = emi * duration;
    }

    // Calculate Risk Score
    const customerHistory = await Loan.find({ customer: customerId });
    const riskDetails = calculateRiskScore(customer, { emi }, customerHistory);

    const loan = new Loan({
      user: req.user.effectiveOwnerId,
      customer: customerId,
      branchId: req.user.branchId || customer.branchId, // Prioritize user's branch, fall back to customer's branch
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate,
      remainingAmount: totalAmount,
      interestType,
      status: 'pending',
      grantor1: grantor1Id,
      grantor1Status: 'pending',
      grantor2: grantor2Id,
      grantor2Status: 'pending',
      riskDetails,
      product: product || undefined,
    });

    const createdLoan = await loan.save();

    // Notify Grantors if assigned
    if (grantor1Id || grantor2Id) {
      try {
        const Notification = require('../models/Notification');
        const notifications = [];

        if (grantor1Id) {
          notifications.push({
            recipient: grantor1Id,
            recipientModel: 'Member',
            title: 'New Grantor Assignment',
            message: `Admin has assigned you as Grantor 1 for a new loan of ${principal} for customer ${customer.name}.`,
            type: 'info',
          });
        }

        if (grantor2Id) {
          notifications.push({
            recipient: grantor2Id,
            recipientModel: 'Member',
            title: 'New Grantor Assignment',
            message: `Admin has assigned you as Grantor 2 for a new loan of ${principal} for customer ${customer.name}.`,
            type: 'info',
          });
        }

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notifError) {
        console.error('Failed to notify grantors:', notifError);
      }
    }

    // Notify Admin if created by staff
    if (req.user.role === 'staff') {
      try {
        const notification = new Notification({
          recipient: req.user.effectiveOwnerId,
          recipientModel: 'User',
          title: 'New Loan Issued',
          message: `Staff member ${req.user.name} has issued a new loan of ${principal} for customer ${customer.name}.`,
          type: 'info',
        });
        await notification.save();
      } catch (notifError) {
        console.error(
          'Failed to notify admin about loan creation:',
          notifError,
        );
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_created',
      category: 'loan',
      details: `Created a new loan of ${principal} for customer ${customer.name}`,
      metadata: {
        loanId: createdLoan._id,
        principal,
        rate,
        duration,
        interestType,
        riskGrade: riskDetails.grade,
      },
      req,
    });

    res.status(201).json(createdLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const requestLoan = async (req, res) => {
  const {
    principal: principalInput,
    rate: rateInput,
    duration: durationInput,
    grantor1Identifier,
    grantor2Identifier,
    notes,
  } = req.body;

  const principal = Number(principalInput);
  const rate = Number(rateInput || 0);
  const duration = Number(durationInput);

  try {
    if (!principal || !duration) {
      return res
        .status(400)
        .json({ message: 'Principal and duration are required.' });
    }

    if (!grantor1Identifier || !grantor2Identifier) {
      return res.status(400).json({
        message: 'Both Grantor 1 and Grantor 2 information is required',
      });
    }

    // Defensive check: Ensure member has a linked customer profile
    if (!req.member.customer) {
      return res.status(400).json({
        message:
          'Your profile is not fully set up. Please contact admin to link your customer record.',
      });
    }

    const customer = await Customer.findById(req.member.customer);
    if (!customer) {
      return res.status(400).json({
        message: 'Linked customer profile not found. Please contact support.',
      });
    }

    if (
      !customer.accountNumber &&
      !customer.savingAccountNumber &&
      !customer.currentAccountNumber
    ) {
      return res.status(400).json({
        message:
          'Cannot request loan: Your profile is missing an account number. Please contact admin to update your profile.',
      });
    }

    // Find grantor (another member)
    const Member = require('../models/Member');

    // Explicit check for own identifier to give better error message
    if (
      req.member.cnic === grantor1Identifier ||
      req.member.phone === grantor1Identifier ||
      req.member.cnic === grantor2Identifier ||
      req.member.phone === grantor2Identifier
    ) {
      return res.status(400).json({
        message: 'You cannot be your own grantor.',
      });
    }

    if (grantor1Identifier === grantor2Identifier) {
      return res.status(400).json({
        message: 'Grantor 1 and Grantor 2 must be different members.',
      });
    }

    const grantor1 = await Member.findOne({
      user: req.member.user,
      $or: [{ cnic: grantor1Identifier }, { phone: grantor1Identifier }],
      _id: { $ne: req.member._id }, // Cannot be own grantor
    });

    if (!grantor1) {
      return res.status(404).json({
        message:
          'Grantor 1 not found. Please provide a valid Member CNIC or Phone number of another member.',
      });
    }

    const grantor2 = await Member.findOne({
      user: req.member.user,
      $or: [{ cnic: grantor2Identifier }, { phone: grantor2Identifier }],
      _id: { $ne: req.member._id }, // Cannot be own grantor
    });

    if (!grantor2) {
      return res.status(404).json({
        message:
          'Grantor 2 not found. Please provide a valid Member CNIC or Phone number of another member.',
      });
    }

    if (grantor1._id.toString() === grantor2._id.toString()) {
      return res.status(400).json({
        message: 'Grantor 1 and Grantor 2 must be different members.',
      });
    }

    const existingLoan = await Loan.findOne({
      customer: req.member.customer,
      status: { $in: ['active', 'pending'] },
    });

    if (existingLoan) {
      return res.status(400).json({
        message: 'You already have an active or pending loan request.',
      });
    }

    // Credit Limit Enforcement
    // Member credit limit is based on shareBalance (business share investment), not currentBalance.
    // The limit is re-calculated live so it always reflects the latest share balance.
    const effectiveCreditLimit = await calculateCreditLimit(req.member._id);
    // Keep the stored value in sync
    await Member.findByIdAndUpdate(req.member._id, {
      creditLimit: effectiveCreditLimit,
    });
    if (principal > effectiveCreditLimit) {
      return res.status(400).json({
        message: `Loan amount (${principal.toLocaleString()}) exceeds your credit limit of Rs. ${effectiveCreditLimit.toLocaleString()} (based on share balance).`,
      });
    }

    // Check plan limits
    const owner = await User.findById(req.member.user).select('plan');
    if (!owner) {
      return res.status(400).json({
        message: 'Organization data not found. Please contact support.',
      });
    }
    const userPlan = owner.plan || 'Free';

    // Count existing loans for this organization
    const loanCount = await Loan.countDocuments({
      user: req.member.user,
    });

    // Validate against plan limits
    const limitCheck = await canCreateLoan(userPlan, loanCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    let emi = 0,
      totalAmount = principal;

    if (rate > 0) {
      const result = calculateSimpleInterest(principal, rate, duration);
      emi = Math.round(result.emi);
      totalAmount = Math.round(result.totalAmount);
    } else {
      // FIX: 0% interest still requires an EMI based on principal
      emi = Math.round(principal / duration);
      totalAmount = principal;
    }

    const customerHistory = await Loan.find({ customer: req.member.customer });
    const riskDetails = calculateRiskScore(customer, { emi }, customerHistory);

    const loan = new Loan({
      user: req.member.user,
      customer: req.member.customer,
      branchId: req.member.branchId || customer.branchId, // Set branchId for proper segregation
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate: new Date(),
      remainingAmount: totalAmount,
      interestType: 'simple',
      status: 'pending',
      grantor1: grantor1._id,
      grantor1Status: 'pending',
      grantor2: grantor2._id,
      grantor2Status: 'pending',
      riskDetails,
      documents: notes
        ? [{ name: 'Request Notes', url: 'N/A', type: 'text' }]
        : [], // Optionally store notes
    });

    const createdLoan = await loan.save();

    // Notify Grantors
    try {
      const Notification = require('../models/Notification');
      const notifications = [
        {
          recipient: grantor1._id,
          recipientModel: 'Member',
          title: 'New Grantor Request',
          message: `${req.member.name} has requested you to be Grantor 1 for a loan of Rs. ${principal.toLocaleString()}.`,
          type: 'info',
          branchId: req.member.branchId || customer.branchId,
          link: '/member/loans', // Grantors can see requests in their loans list
          action: 'grantor_request',
        },
        {
          recipient: grantor2._id,
          recipientModel: 'Member',
          title: 'New Grantor Request',
          message: `${req.member.name} has requested you to be Grantor 2 for a loan of Rs. ${principal.toLocaleString()}.`,
          type: 'info',
          branchId: req.member.branchId || customer.branchId,
          link: '/member/loans', // Grantors can see requests in their loans list
          action: 'grantor_request',
        },
      ];
      await Notification.insertMany(notifications);
    } catch (notifError) {
      console.error('Failed to notify grantors:', notifError);
    }

    // Log activity
    await logActivity({
      userId: req.member.user, // Use the admin User ID if possible, or leave it as the Member's owning user
      action: 'loan_requested',
      category: 'loan',
      details: `Member ${req.member.name} requested a loan of ${principal}`,
      metadata: {
        loanId: createdLoan._id,
        principal,
        memberId: req.member._id,
      },
      req, // ensure req is passed
    });

    res.status(201).json(createdLoan);
  } catch (error) {
    console.error('Member requestLoan Error:', error);
    res.status(400).json({
      message:
        error.message || 'An error occurred while processing your request.',
    });
  }
};

/**
 * @desc    Get loans where the member is a grantor
 * @route   GET /api/loans/grantor-loans
 * @access  Private (Member)
 */
const getGrantorLoans = async (req, res) => {
  try {
    const loans = await Loan.find({
      $or: [{ grantor1: req.member._id }, { grantor2: req.member._id }],
    }).populate('customer', 'name phone cnic');

    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Approve or Reject grantor request
 * @route   PATCH /api/loans/:id/grantor-status
 * @access  Private (Member)
 */
const updateGrantorStatus = async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      $or: [{ grantor1: req.member._id }, { grantor2: req.member._id }],
    });

    if (!loan) {
      return res
        .status(404)
        .json({ message: 'Loan request not found or you are not the grantor' });
    }

    let isGrantor1 =
      loan.grantor1 && loan.grantor1.toString() === req.member._id.toString();

    // Check if member the specific grantor's status is still pending
    if (isGrantor1) {
      if (loan.grantor1Status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'Your grantor request is no longer pending' });
      }
      loan.grantor1Status = status;
      if (status === 'approved') {
        loan.grantor1ApprovedAt = new Date();
      }
    } else {
      if (loan.grantor2Status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'Your grantor request is no longer pending' });
      }
      loan.grantor2Status = status;
      if (status === 'approved') {
        loan.grantor2ApprovedAt = new Date();
      }
    }

    await loan.save();

    // Notify Admin if approved
    if (status === 'approved') {
      const Notification = require('../models/Notification');
      const notification = new Notification({
        recipient: loan.user,
        recipientModel: 'User',
        title: 'Grantor Approved Loan',
        message: `Grantor ${req.member.name} has approved the loan request for ${loan._id}.`,
        type: 'info',
        link: `/loan-requests`, // Admins can check the request
        action: 'grantor_approved',
      });
      await notification.save();
    }

    // Log activity
    await logActivity({
      userId: req.member._id,
      action: 'grantor_status_updated',
      category: 'loan',
      details: `Grantor ${status} loan request #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        status,
      },
      req,
    });

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getLoans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    let query = { user: req.user.effectiveOwnerId };

    // Branch Segregation: Staff only see their own branch data
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    if (req.query.customerId) {
      query.customer = req.query.customerId;
    }

    if (search) {
      // Find customers matching search name
      const matchingCustomers = await Customer.find({
        user: req.user.effectiveOwnerId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { cnic: { $regex: search, $options: 'i' } },
          { savingAccountNumber: { $regex: search, $options: 'i' } },
          { currentAccountNumber: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const customerIds = matchingCustomers.map((c) => c._id);

      // If customerId filter is already present, intersect the results
      // Otherwise just use the search results
      if (query.customer) {
        // If searching with ID, ensure the ID is in the search results
        // This handles edge case where user searches + filters by ID
        const searchIdsStr = customerIds.map((id) => id.toString());
        if (!searchIdsStr.includes(query.customer)) {
          // Invalidate query if ID doesn't match search
          query.customer = null;
        }
      } else {
        query.customer = { $in: customerIds };
      }
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const totalEntries = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
      .populate('customer', 'name email isMember memberId')
      .populate('grantor1', 'name')
      .populate('grantor2', 'name')
      .populate('product', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    res.json({
      data: loans,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyLoans = async (req, res) => {
  try {
    if (!req.member.customer) {
      return res.json({ data: [], totalEntries: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      customer: req.member.customer,
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const search = req.query.search;
      const isNumber = !isNaN(search);

      query.$or = [
        { _id: mongoose.isValidObjectId(search) ? search : undefined },
        { principal: isNumber ? parseFloat(search) : undefined },
        { totalAmount: isNumber ? parseFloat(search) : undefined },
      ].filter((cond) => {
        const value = Object.values(cond)[0];
        return value !== undefined;
      });

      // If no valid mongo ID but looks like a partial hex string, we can't easily search _id with regex
      // without converting it to a string, which is slow. But we can at least try to match what's possible.
      if (query.$or.length === 0) delete query.$or;
    }

    const totalEntries = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
      .populate('grantor1', 'name')
      .populate('grantor2', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: loans,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('customer', 'name email phone trustRating')
      .populate('grantor1', 'name')
      .populate('grantor2', 'name')
      .populate('product', 'name');
    if (
      loan &&
      (loan.user.toString() === req.user.effectiveOwnerId.toString() ||
        (req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()))
    ) {
      res.json(loan);
    } else {
      res.status(404).json({ message: 'Loan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add Repayment
const addRepayment = async (req, res) => {
  const { loanId, amount, date, notes, isSettlement } = req.body;
  try {
    const loan = await Loan.findById(loanId).populate('customer');
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status === 'completed') {
      return res.status(400).json({ message: 'Loan is already completed' });
    }

    // Handle Early Settlement Interest Adjustment
    if (isSettlement) {
      const start = new Date(loan.startDate);
      const now = new Date(date || new Date());

      // Calculate months elapsed (minimum 1 month as per requirement)
      let monthsElapsed =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());

      // If the day of month is past the start day, it's a full month
      if (now.getDate() > start.getDate()) {
        monthsElapsed++;
      }

      monthsElapsed = Math.max(1, monthsElapsed);

      // Only adjust if monthsElapsed is less than original duration
      if (monthsElapsed < loan.duration) {
        let newTotalInterest;
        if (loan.interestType === 'simple') {
          newTotalInterest =
            (loan.principal * loan.rate * monthsElapsed) / 1200;
        } else {
          // For EMI, it's more complex, but we'll follow simple interest logic for settlement for now
          // or we could use the amortization schedule. Given the request "interest charge accordingly",
          // simple interest pro-rata is the most common interpretation.
          newTotalInterest =
            (loan.principal * loan.rate * monthsElapsed) / 1200;
        }

        const newTotalAmount = Math.round(loan.principal + newTotalInterest);

        // Log the adjustment
        await logActivity({
          userId: req.user._id,
          action: 'loan_interest_adjusted',
          category: 'loan',
          details: `Loan interest adjusted for early settlement from ${loan.totalAmount} to ${newTotalAmount} (${monthsElapsed} months)`,
          metadata: {
            loanId: loan._id,
            oldTotalAmount: loan.totalAmount,
            newTotalAmount,
            monthsElapsed,
          },
          req,
        });

        loan.totalAmount = newTotalAmount;
      }
    }

    // Use shared service to process repayment
    const { repayment } = await loanRepaymentService.processRepayment(
      loan,
      amount,
      req,
      {
        date,
      },
    );

    // ── Email Notification ────────────────────────────────────────────────
    try {
      const customer = loan.customer;
      if (customer && customer.isMember && customer.memberId) {
        const member = await Member.findById(customer.memberId);
        if (member && member.email) {
          const branch = await Branch.findById(loan.branchId);
          const branchName =
            branch?.branding?.companyName || branch?.name || 'FinanceFlow';

          await sendEmail({
            to: member.email,
            subject: 'Loan Repayment Confirmation',
            html: transactionEmail({
              memberName: member.name,
              transactionType: 'Loan Repayment',
              amount: amount.toLocaleString(),
              date: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              balance: loan.remainingAmount.toLocaleString(),
              branchName: branchName,
              reference: repayment._id.toString().slice(-8).toUpperCase(),
            }),
          });
        }
      }
    } catch (emailError) {
      console.error('Repayment Email Error:', emailError);
    }

    // If loan is completed and customer is a member, update their credit limit
    if (loan.status === 'completed' && loan.customer.memberId) {
      try {
        await updateMemberCreditLimit(loan.customer.memberId);
      } catch (limitError) {
        console.error(
          'Failed to update credit limit on loan completion:',
          limitError,
        );
      }
    }

    res.status(201).json(repayment);
  } catch (error) {
    console.error('Add Repayment Error:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to add repayment' });
  }
};

const getRepayments = async (req, res) => {
  // Optionally filter by loanId or customerId
  const { loanId, customerId } = req.query;
  const query = { user: req.user.effectiveOwnerId };

  // Branch Segregation
  if (req.user.role === 'staff' && req.user.branchId) {
    query.branchId = req.user.branchId;
  }

  if (loanId) query.loan = loanId;
  if (customerId) query.customer = customerId;

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    if (search) {
      const matchingCustomers = await Customer.find({
        user: req.user.effectiveOwnerId,
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const customerIds = matchingCustomers.map((c) => c._id);
      query.customer = { $in: customerIds };
    }

    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const totalEntries = await Repayment.countDocuments(query);
    const repayments = await Repayment.find(query)
      .populate('loan', 'principal totalAmount')
      .populate('customer', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    res.json({
      data: repayments,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLoan = async (req, res) => {
  const { principal, rate, duration, status, interestType } = req.body;
  try {
    const loan = await Loan.findById(req.params.id);
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Update status if provided and valid
    if (status) {
      const allowedStatuses = ['active', 'completed', 'defaulted'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      loan.status = status;

      // If setting to active, ensure Start Date is set to now (if desired)
      if (status === 'active' && loan.status !== 'active') {
        loan.startDate = new Date();
      }
    }

    // Recalculate EMI and total if principal, rate, duration or interestType changed
    if (principal || rate || duration || interestType) {
      const newPrincipal = principal ? Number(principal) : loan.principal;
      const newRate = rate ? Number(rate) : loan.rate;
      const newDuration = duration ? Number(duration) : loan.duration;
      const newInterestType = interestType || loan.interestType || 'simple';

      let emi, totalAmount;

      if (newInterestType === 'simple') {
        const result = calculateSimpleInterest(
          newPrincipal,
          newRate,
          newDuration,
        );
        emi = Math.round(result.emi);
        totalAmount = Math.round(result.totalAmount);
      } else {
        emi = Math.round(calculateEMI(newPrincipal, newRate, newDuration));
        totalAmount = emi * newDuration;
      }

      loan.principal = newPrincipal;
      loan.rate = newRate;
      loan.duration = newDuration;
      loan.interestType = newInterestType;
      loan.emi = emi;
      loan.totalAmount = totalAmount;
      loan.remainingAmount = Math.round(totalAmount - loan.paidAmount);
      if (loan.remainingAmount <= 0) {
        loan.status = 'completed';
        // Log activity for auto-completion
        await logActivity({
          userId: req.user?._id || loan.user,
          action: 'loan_status_completed',
          category: 'loan',
          details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} automatically marked as completed via update`,
          metadata: { loanId: loan._id },
          req,
        });
      }
    }

    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_updated',
      category: 'loan',
      details: `Updated loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        changes: {
          principal: principal
            ? { old: loan.principal, new: Number(principal) }
            : undefined,
          rate: rate ? { old: loan.rate, new: Number(rate) } : undefined,
          duration: duration
            ? { old: loan.duration, new: Number(duration) }
            : undefined,
          status: status ? { old: loan.status, new: status } : undefined,
          interestType: interestType
            ? { old: loan.interestType, new: interestType }
            : undefined,
        },
      },
      req,
    });

    // Notify Member if status changed
    if (status && (status === 'active' || status === 'rejected')) {
      try {
        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          const notificationTitle =
            status === 'active' ? 'Loan Approved' : 'Loan Rejected';
          const notificationMessage =
            status === 'active'
              ? `Your loan request for ${loan.principal} has been approved.`
              : `Your loan request for ${loan.principal} has been rejected.`;
          const notificationType = status === 'active' ? 'success' : 'error';

          const notification = new Notification({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: '/member/loans',
            action: status === 'active' ? 'loan_approved' : 'loan_rejected',
          });
          await notification.save();
        }

        // Email Notification to Customer/Member
        if (customer && customer.email) {
          const branch = await Branch.findById(loan.branchId);
          const branchName =
            branch?.companyName || branch?.name || 'FinanceFlow';

          await sendEmail({
            email: customer.email,
            subject: `${notificationTitle} - ${branchName}`,
            html: transactionEmail({
              memberName: customer.name,
              transactionType: notificationTitle,
              amount: loan.principal.toLocaleString(),
              date: new Date().toLocaleDateString(),
              referenceId: loan._id.toString().slice(-8).toUpperCase(),
              currentBalance: loan.remainingAmount.toLocaleString(),
              branchName: branchName,
            }),
          });
        }
      } catch (notifError) {
        console.error('Failed to send member notification:', notifError);
      }
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUpcomingRepayments = async (req, res) => {
  try {
    const { loanId } = req.query;
    const query = {
      user: req.user.effectiveOwnerId,
      status: 'active',
    };

    // Branch Segregation
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    if (loanId) {
      query._id = loanId;
    }

    const loans = await Loan.find(query).populate('customer', 'name');

    const upcoming = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of loans) {
      // Calculate how many installments are covered by the total amount paid.
      // Add a small tolerance (0.5) before flooring to avoid floating-point off-by-one:
      // e.g. 3000 / 1000.0001 ≈ 2.9999 which would incorrectly floor to 2.
      const installmentsPaid = Math.floor(
        ((loan.paidAmount || 0) + 0.5) / loan.emi,
      );

      const unpaidInstallments = [];
      for (let i = 1; i <= loan.duration; i++) {
        if (i > installmentsPaid) {
          const dueDate = new Date(loan.startDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          unpaidInstallments.push({
            installment: i,
            dueDate: dueDate,
            isOverdue: dueDate < today,
          });
        }
      }

      const overdue = unpaidInstallments.filter((inst) => inst.isOverdue);
      const remaining = unpaidInstallments.filter((inst) => !inst.isOverdue);

      const overdueAmount = overdue.length * loan.emi;
      const redistributionAmount =
        remaining.length > 0 ? overdueAmount / remaining.length : 0;

      // If we have remaining installments, redistribute overdue amounts to them
      if (remaining.length > 0) {
        remaining.forEach((inst) => {
          upcoming.push({
            _id: `${loan._id}-${inst.installment}`,
            loanId: loan._id,
            customer: loan.customer,
            amount: loan.emi + redistributionAmount,
            dueDate: inst.dueDate,
            installment: inst.installment,
            isOverdue: false,
          });
        });
      } else {
        // If no future installments left, keep overdue as is
        overdue.forEach((inst) => {
          upcoming.push({
            _id: `${loan._id}-${inst.installment}`,
            loanId: loan._id,
            customer: loan.customer,
            amount: loan.emi,
            dueDate: inst.dueDate,
            installment: inst.installment,
            isOverdue: true,
          });
        });
      }
    }

    // Sort by due date
    upcoming.sort((a, b) => a.dueDate - b.dueDate);

    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Delete associated repayments
    await Repayment.deleteMany({ loan: req.params.id });

    // Delete the loan
    await Loan.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_deleted',
      category: 'loan',
      details: `Deleted loan #${loan._id.toString().slice(-6).toUpperCase()} and its repayments`,
      metadata: {
        loanId: req.params.id,
        customerName: loan.customer?.name,
      },
      req,
    });

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan || loan.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = {
      name: req.body.name || req.file.originalname,
      url: req.file.path,
      type: req.file.mimetype,
    };

    loan.documents.push(document);
    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_document_uploaded',
      category: 'loan',
      details: `Uploaded document "${document.name}" for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        documentName: document.name,
      },
      req,
    });

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan || loan.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const document = loan.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    loan.documents.pull(req.params.docId);
    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_document_deleted',
      category: 'loan',
      details: `Deleted document "${document.name}" for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        documentId: req.params.docId,
      },
      req,
    });

    res.json({ message: 'Document deleted', loan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customer');
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const { principal, rate, duration, interestType, startDate } = req.body;

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Loan is not in pending status' });
    }

    // Apply term overrides if provided
    if (principal || rate || duration || interestType) {
      const newPrincipal = principal ? Number(principal) : loan.principal;
      const newRate = rate ? Number(rate) : loan.rate;
      const newDuration = duration ? Number(duration) : loan.duration;
      const newInterestType = interestType || loan.interestType || 'emi';

      let emi, totalAmount;
      if (newInterestType === 'simple') {
        const result = calculateSimpleInterest(
          newPrincipal,
          newRate,
          newDuration,
        );
        emi = Math.round(result.emi);
        totalAmount = Math.round(result.totalAmount);
      } else {
        emi = Math.round(calculateEMI(newPrincipal, newRate, newDuration));
        totalAmount = emi * newDuration;
      }

      loan.principal = newPrincipal;
      loan.rate = newRate;
      loan.duration = newDuration;
      loan.interestType = newInterestType;
      loan.emi = emi;
      loan.totalAmount = totalAmount;
      loan.remainingAmount = Math.round(totalAmount - loan.paidAmount);
      if (loan.remainingAmount <= 0) {
        loan.status = 'completed';
        // Log activity for auto-completion
        await logActivity({
          userId: req.user?._id || loan.user,
          action: 'loan_status_completed',
          category: 'loan',
          details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} automatically marked as completed via approval`,
          metadata: { loanId: loan._id },
          req,
        });
      }
    }

    if (loan.status !== 'completed') {
      loan.status = 'active';
    }
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.startDate = startDate ? new Date(startDate) : new Date();

    await loan.save();

    // Create Financial Transaction for disbursement
    const financialTx = new FinancialTransaction({
      user: req.user.effectiveOwnerId,
      branchId:
        loan.branchId || (await Customer.findById(loan.customer))?.branchId,
      type: 'loan',
      category: 'loan_disbursement',
      amount: loan.principal,
      date: new Date(),
      description: `Loan disbursement for ${loan.customer.name}`,
      customer: loan.customer._id || loan.customer,
      loan: loan._id,
      referenceId: loan._id,
      referenceModel: 'Loan',
    });
    await financialTx.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_approved',
      category: 'loan',
      details: `Approved loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        customerId: loan.customer,
      },
      req,
    });

    // Notify Member if applicable
    try {
      const customerForNotification = await Customer.findById(loan.customer);
      if (
        customerForNotification &&
        customerForNotification.isMember &&
        customerForNotification.memberId
      ) {
        const notification = new Notification({
          recipient: customerForNotification.memberId,
          recipientModel: 'Member',
          title: 'Loan Approved',
          message: `Your loan request for ${loan.principal} has been approved.`,
          type: 'success',
          link: '/member/loans',
          action: 'loan_approved',
        });
        await notification.save();
      }

      // Email Notification to Member if applicable
      if (customerForNotification && customerForNotification.email) {
        const branch = await Branch.findById(loan.branchId);
        const branchName = branch?.companyName || branch?.name || 'FinanceFlow';

        await sendEmail({
          email: customerForNotification.email,
          subject: `Loan Approved - ${branchName}`,
          html: transactionEmail({
            memberName: customerForNotification.name,
            transactionType: 'Loan Approved',
            amount: loan.principal.toLocaleString(),
            date: new Date().toLocaleDateString(),
            referenceId: loan._id.toString().slice(-8).toUpperCase(),
            currentBalance: loan.remainingAmount.toLocaleString(),
            branchName: branchName,
          }),
        });
      }
    } catch (notifError) {
      console.error(
        'Failed to send loan approval notification/email:',
        notifError,
      );
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const rejectLoan = async (req, res) => {
  const { reason } = req.body;
  try {
    const loan = await Loan.findById(req.params.id);
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Loan is not in pending status' });
    }

    loan.status = 'rejected';
    loan.rejectedBy = req.user._id;
    loan.rejectionReason = reason;

    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_rejected',
      category: 'loan',
      details: `Rejected loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        reason,
      },
      req,
    });

    // Notify Member if applicable
    try {
      const customer = await Customer.findById(loan.customer);
      if (customer && customer.isMember && customer.memberId) {
        const notification = new Notification({
          recipient: customer.memberId,
          recipientModel: 'Member',
          title: 'Loan Rejected',
          message: `Your loan request for ${loan.principal} has been rejected. Reason: ${reason || 'Not specified'}`,
          type: 'error',
          link: '/member/loans',
          action: 'loan_rejected',
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Failed to send rejection notification:', notifError);
    }

    // Email Notification to Member if applicable
    try {
      const customer = await Customer.findById(loan.customer);
      if (customer && customer.email) {
        const branch = await Branch.findById(loan.branchId);
        const branchName = branch?.companyName || branch?.name || 'FinanceFlow';

        await sendEmail({
          email: customer.email,
          subject: `Loan Application Update - ${branchName}`,
          html: transactionEmail({
            memberName: customer.name,
            transactionType: 'Loan Rejected',
            amount: loan.principal.toLocaleString(),
            date: new Date().toLocaleDateString(),
            referenceId: loan._id.toString().slice(-8).toUpperCase(),
            currentBalance: '0',
            branchName: branchName,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getLoanSchedule = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Authorization check (same as getLoanById)
    if (
      loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        loan.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const schedule = generateAmortizationSchedule(loan);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMemberLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      customer: req.member.customer,
    }).populate('customer', 'name accountNumber email phone');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Compute next payment date from amortization schedule
    let nextPaymentDate = null;
    if (loan.status === 'active' && loan.emi > 0) {
      const installmentsPaid = Math.floor((loan.paidAmount || 0) / loan.emi);
      const nextInstallment = installmentsPaid + 1;
      if (nextInstallment <= loan.duration) {
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + nextInstallment);
        nextPaymentDate = dueDate;
      }
    }

    res.json({ ...loan.toObject(), nextPaymentDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMemberLoanSchedule = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      customer: req.member.customer,
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const schedule = generateAmortizationSchedule(loan);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const memberRepayLoan = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const memberTokenId = req.member._id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid payment amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await Loan.findById(id).populate('customer').session(session);
    if (!loan) throw new Error('Loan not found');

    if (
      !loan.customer?.memberId ||
      loan.customer.memberId.toString() !== memberTokenId.toString()
    ) {
      throw new Error('Unauthorized: This loan does not belong to you');
    }

    const isSettlementRequest = req.body.isSettlement === true;
    const paymentAmount = Math.round(Number(amount));

    if (loan.status !== 'active' && loan.status !== 'pending') {
      throw new Error('This loan is not active or already completed');
    }

    // Use the central repayment service for all logic
    await loanRepaymentService.processRepayment(
      loan,
      paymentAmount,
      req, // Will use req.member for ownership
      {
        notes: req.body.notes || 'Self-repayment via FinanceFlow',
        isAutoValue: false,
        allowEarlySettlement: isSettlementRequest,
        session,
      },
    );

    await session.commitTransaction();

    // Fetch refreshed member for response and notifications
    const member = await Member.findById(memberTokenId);

    // ── Notifications (Async) ────────────────────────────────────────────────
    try {
      if (member) {
        await createTransactionNotification({
          recipientId: member._id,
          title: 'Loan Repayment Successful',
          message: `Your payment of Rs. ${paymentAmount.toLocaleString()} has been processed for loan #${loan._id.toString().slice(-6).toUpperCase()}.`,
          type: 'success',
          branchId: loan.branchId,
          action: 'loan_repayment_notification',
          metadata: {
            amount: paymentAmount,
            loanId: loan._id,
            link: '/member/loans',
          },
        });

        if (loan.status === 'completed') {
          await createTransactionNotification({
            recipientId: member._id,
            title: 'Loan Fully Paid',
            message: `Congratulations! Your loan #${loan._id.toString().slice(-6).toUpperCase()} has been fully settled.`,
            type: 'success',
            branchId: loan.branchId,
            action: 'loan_completed_notification',
            metadata: { loanId: loan._id, link: '/member/loans' },
          });
        }

        // Notify Admins
        await notifyAdminsOfMemberAction({
          title: 'Member Loan Repayment',
          message: `${member.name} repaid Rs. ${paymentAmount.toLocaleString()} for loan #${loan._id.toString().slice(-6).toUpperCase()}${loan.status === 'completed' ? ' (Loan Completed)' : ''}.`,
          type: 'success',
          branchId: loan.branchId,
          metadata: {
            memberId: member._id,
            loanId: loan._id,
            amount: paymentAmount,
            link: '/loans',
          },
        });
      }
    } catch (notifError) {
      console.error('Member Repayment Notification Error:', notifError);
    }

    res.json({
      message: 'Repayment successful',
      balance: member?.currentBalance || 0,
      loan,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const bulkApproveLoans = async (req, res) => {
  try {
    const { loanIds, notes } = req.body;
    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ message: 'No loans selected' });
    }

    const processed = [];
    const failed = [];

    for (const id of loanIds) {
      try {
        const loan = await Loan.findById(id).populate('customer');
        if (!loan || loan.status !== 'pending') {
          failed.push({ id, reason: 'Not found or not pending' });
          continue;
        }

        if (
          loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
          !(
            req.user.role === 'staff' &&
            loan.branchId?.toString() === req.user.branchId?.toString()
          )
        ) {
          failed.push({ id, reason: 'Not authorized' });
          continue;
        }

        loan.status = 'active';
        loan.approvedBy = req.user._id;
        loan.approvedAt = new Date();
        loan.startDate = new Date();

        await loan.save();

        const financialTx = new FinancialTransaction({
          user: req.user.effectiveOwnerId,
          branchId:
            loan.branchId || (await Customer.findById(loan.customer))?.branchId,
          type: 'loan',
          category: 'loan_disbursement',
          amount: loan.principal,
          date: new Date(),
          description: `Bulk disbursement for ${loan.customer.name}${notes ? ` - ${notes}` : ''}`,
          customer: loan.customer._id || loan.customer,
          loan: loan._id,
          referenceId: loan._id,
          referenceModel: 'Loan',
        });
        await financialTx.save();

        await logActivity({
          userId: req.user._id,
          action: 'loan_approved',
          category: 'loan',
          details: `Approved loan #${loan._id.toString().slice(-6).toUpperCase()} via Bulk Action${notes ? ` (${notes})` : ''}`,
          metadata: { loanId: loan._id, customerId: loan.customer, bulk: true },
          req,
        });

        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          await Notification.create({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: 'Loan Approved',
            message: `Your loan request for ${loan.principal} has been approved.`,
            type: 'success',
            link: '/member/loans',
            action: 'loan_approved',
          }).catch(() => {});

          if (customer.email) {
            const branch = await Branch.findById(loan.branchId);
            const branchName =
              branch?.companyName || branch?.name || 'FinanceFlow';

            await sendEmail({
              email: customer.email,
              subject: `Loan Approved - ${branchName}`,
              html: transactionEmail({
                memberName: customer.name,
                transactionType: 'Loan Approved',
                amount: loan.principal.toLocaleString(),
                date: new Date().toLocaleDateString(),
                referenceId: loan._id.toString().slice(-8).toUpperCase(),
                currentBalance: loan.remainingAmount.toLocaleString(),
                branchName: branchName,
              }),
            });
          }
        }

        processed.push(id);
      } catch (err) {
        failed.push({ id, reason: err.message });
      }
    }

    res.json({
      message: 'Bulk approval complete',
      processedCount: processed.length,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkRejectLoans = async (req, res) => {
  try {
    const { loanIds, reason } = req.body;
    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ message: 'No loans selected' });
    }

    const processed = [];
    const failed = [];

    for (const id of loanIds) {
      try {
        const loan = await Loan.findById(id);
        if (!loan || loan.status !== 'pending') {
          failed.push({ id, reason: 'Not found or not pending' });
          continue;
        }

        if (
          loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
          !(
            req.user.role === 'staff' &&
            loan.branchId?.toString() === req.user.branchId?.toString()
          )
        ) {
          failed.push({ id, reason: 'Not authorized' });
          continue;
        }

        loan.status = 'rejected';
        loan.rejectedBy = req.user._id;
        loan.rejectionReason = reason;

        await loan.save();

        await logActivity({
          userId: req.user._id,
          action: 'loan_rejected',
          category: 'loan',
          details: `Rejected loan #${loan._id.toString().slice(-6).toUpperCase()} via Bulk Action`,
          metadata: { loanId: loan._id, reason, bulk: true },
          req,
        });

        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          await Notification.create({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: 'Loan Rejected',
            message: `Your loan request for ${loan.principal} has been rejected. Reason: ${reason || 'Not specified'}`,
            type: 'error',
            link: '/member/loans',
            action: 'loan_rejected',
          }).catch(() => {});

          if (customer.email) {
            const branch = await Branch.findById(loan.branchId);
            const branchName =
              branch?.companyName || branch?.name || 'FinanceFlow';

            await sendEmail({
              email: customer.email,
              subject: `Loan Application Update - ${branchName}`,
              html: transactionEmail({
                memberName: customer.name,
                transactionType: 'Loan Rejected',
                amount: loan.principal.toLocaleString(),
                date: new Date().toLocaleDateString(),
                referenceId: loan._id.toString().slice(-8).toUpperCase(),
                currentBalance: '0',
                branchName: branchName,
              }),
            });
          }
        }

        processed.push(id);
      } catch (err) {
        failed.push({ id, reason: err.message });
      }
    }

    res.json({
      message: 'Bulk rejection complete',
      processedCount: processed.length,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLoan,
  getLoans,
  getLoanById,
  addRepayment,
  getRepayments,
  getUpcomingRepayments,
  updateLoan,
  deleteLoan,
  uploadDocument,
  deleteDocument,
  requestLoan,
  getMyLoans,
  approveLoan,
  rejectLoan,
  bulkApproveLoans,
  bulkRejectLoans,
  getLoanSchedule,
  getMemberLoanById,
  getMemberLoanSchedule,
  getGrantorLoans,
  updateGrantorStatus,
  memberRepayLoan,
};
