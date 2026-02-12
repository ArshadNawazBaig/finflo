const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { canCreateLoan } = require('../utils/planLimits');
const { calculateRiskScore } = require('../utils/riskService');
const { logActivity } = require('./activityLogController');

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
  } = req.body;

  const principal = Number(principalInput);
  const rate = Number(rateInput);
  const duration = Number(durationInput);

  try {
    const customer = await Customer.findById(customerId);
    if (
      !customer ||
      customer.user.toString() !== req.user.effectiveOwnerId.toString()
    ) {
      return res.status(404).json({ message: 'Customer not found' });
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

    // Check plan limits
    const user = await User.findById(req.user.effectiveOwnerId).select('plan');
    const userPlan = user.plan || 'Free';

    // Count existing loans for this user
    const loanCount = await Loan.countDocuments({
      user: req.user.effectiveOwnerId,
    });

    // Validate against plan limits
    const limitCheck = canCreateLoan(userPlan, loanCount);
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
      emi = result.emi;
      totalAmount = result.totalAmount;
    } else {
      emi = calculateEMI(principal, rate, duration);
      totalAmount = emi * duration;
    }

    // Calculate Risk Score
    const customerHistory = await Loan.find({ customer: customerId });
    const riskDetails = calculateRiskScore(customer, { emi }, customerHistory);

    const loan = new Loan({
      user: req.user.effectiveOwnerId,
      customer: customerId,
      branchId: req.user.branchId, // Automatically assign to branch
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate,
      remainingAmount: totalAmount,
      interestType,
      status: 'pending',
      riskDetails,
    });

    const createdLoan = await loan.save();

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
    notes, // Purpose/Notes
  } = req.body;

  const principal = Number(principalInput);
  const rate = Number(rateInput || 0); // Members might not know rate, or it's fixed. Let's assume request contains desired/estimated rate or 0.
  const duration = Number(durationInput);

  try {
    const customer = await Customer.findById(req.member.customer);
    // Member must have a linked customer profile and an account number
    if (
      !customer ||
      (!customer.accountNumber &&
        !customer.savingAccountNumber &&
        !customer.currentAccountNumber)
    ) {
      return res.status(400).json({
        message:
          'Cannot request loan: Your profile is missing an account number (Saving or Current). Please contact support.',
      });
    }

    // Check for existing pending/active loan
    const existingLoan = await Loan.findOne({
      customer: req.member.customer,
      status: { $in: ['active', 'pending'] },
    });

    if (existingLoan) {
      return res.status(400).json({
        message: 'You already have an active or pending loan request.',
      });
    }

    // Default calculations (can be updated by Admin upon approval)
    // If rate is not provided, use 0 for now (Admin sets it)
    let emi = 0,
      totalAmount = principal;
    if (rate > 0) {
      const result = calculateSimpleInterest(principal, rate, duration);
      emi = result.emi;
      totalAmount = result.totalAmount;
    }

    // Calculate Risk Score
    const customerHistory = await Loan.find({ customer: req.member.customer });
    const riskDetails = calculateRiskScore(customer, { emi }, customerHistory);

    const loan = new Loan({
      user: req.member.user, // The business owner
      customer: req.member.customer,
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate: new Date(), // Provisional start date
      remainingAmount: totalAmount,
      interestType: 'simple',
      status: 'pending',
      documents: [], // Can add docs later
      riskDetails,
    });

    const createdLoan = await loan.save();

    // Notify Admin (Business Owner)
    try {
      const notification = new Notification({
        recipient: req.member.user, // Notify the admin
        recipientModel: 'User',
        title: 'New Loan Request',
        message: `Member ${req.member.name} has requested a loan of ${principal}.`,
        type: 'info',
      });
      await notification.save();
    } catch (notifError) {
      console.error(
        'Failed to create notification for loan request:',
        notifError,
      );
      // Proceed without failing the request
    }

    res.status(201).json(createdLoan);
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

    const totalEntries = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
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
    const loan = await Loan.findById(req.params.id).populate(
      'customer',
      'name email phone trustRating',
    );
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
  const { loanId, amount, date, notes } = req.body;
  try {
    const loan = await Loan.findById(loanId);
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

    const repayment = new Repayment({
      user: req.user.effectiveOwnerId,
      loan: loanId,
      customer: loan.customer,
      branchId: loan.branchId, // Tag repayment with loan's branch
      amount,
      date,
      notes,
    });

    await repayment.save();

    // Update loan stats
    const repaymentsCount = await Repayment.countDocuments({ loan: loanId });
    loan.paidAmount += Number(amount);
    loan.remainingAmount = Math.max(0, loan.totalAmount - loan.paidAmount);

    if (loan.remainingAmount <= 0) {
      loan.status = 'completed';
    }

    await loan.save();

    // Update Customer Trust Rating
    try {
      const customer = await Customer.findById(loan.customer);
      if (customer) {
        // Calculate how many installments this payment covers
        const installmentsCovered = Math.floor(Number(amount) / loan.emi);
        const previouslyPaidInstallments = Math.floor(
          (loan.paidAmount - Number(amount)) / loan.emi,
        );

        // Apply rating adjustment for each installment covered
        let totalRatingAdjustment = 0;
        const paymentDate = new Date(date || new Date());

        for (let i = 0; i < installmentsCovered; i++) {
          const installmentNumber = previouslyPaidInstallments + i + 1;
          const dueDate = new Date(loan.startDate);
          dueDate.setMonth(dueDate.getMonth() + installmentNumber);

          const isOnTime = paymentDate <= dueDate;
          totalRatingAdjustment += isOnTime ? 0.2 : -0.5;
        }

        customer.trustRating = Math.min(
          10,
          Math.max(0, (customer.trustRating || 5) + totalRatingAdjustment),
        );

        await customer.save();
      }
    } catch (ratingError) {
      console.error('Error updating trust rating:', ratingError);
      // Don't fail the repayment if rating update fails
    }

    res.status(201).json(repayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
        emi = result.emi;
        totalAmount = result.totalAmount;
      } else {
        emi = calculateEMI(newPrincipal, newRate, newDuration);
        totalAmount = emi * newDuration;
      }

      loan.principal = newPrincipal;
      loan.rate = newRate;
      loan.duration = newDuration;
      loan.interestType = newInterestType;
      loan.emi = emi;
      loan.totalAmount = totalAmount;
      loan.remainingAmount = totalAmount - loan.paidAmount;
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
          });
          await notification.save();
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

    // Look ahead 90 days and back 30 days (for overdue)
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(today.getDate() + 90);

    for (const loan of loans) {
      const repaymentsCount = await Repayment.countDocuments({
        loan: loan._id,
      });

      const unpaidInstallments = [];
      for (let i = 1; i <= loan.duration; i++) {
        if (i > repaymentsCount) {
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
          if (inst.dueDate <= ninetyDaysAhead) {
            upcoming.push({
              _id: `${loan._id}-${inst.installment}`,
              loanId: loan._id,
              customer: loan.customer,
              amount: loan.emi + redistributionAmount,
              dueDate: inst.dueDate,
              installment: inst.installment,
              isOverdue: false,
            });
          }
        });
      } else {
        // If no future installments left, keep overdue as is
        overdue.forEach((inst) => {
          if (inst.dueDate <= ninetyDaysAhead) {
            upcoming.push({
              _id: `${loan._id}-${inst.installment}`,
              loanId: loan._id,
              customer: loan.customer,
              amount: loan.emi,
              dueDate: inst.dueDate,
              installment: inst.installment,
              isOverdue: true,
            });
          }
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

    res.json({ message: 'Document deleted', loan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveLoan = async (req, res) => {
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

    loan.status = 'active';
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.startDate = new Date();

    await loan.save();

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
      const customer = await Customer.findById(loan.customer);
      if (customer && customer.isMember && customer.memberId) {
        const notification = new Notification({
          recipient: customer.memberId,
          recipientModel: 'Member',
          title: 'Loan Approved',
          message: `Your loan request for ${loan.principal} has been approved.`,
          type: 'success',
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Failed to send approval notification:', notifError);
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
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Failed to send rejection notification:', notifError);
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
};
