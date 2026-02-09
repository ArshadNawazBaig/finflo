const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const User = require('../models/User');
const { canCreateLoan } = require('../utils/planLimits');

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
    if (!customer || customer.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check for existing active loan
    const activeLoan = await Loan.findOne({
      customer: customerId,
      status: 'active',
      user: req.user._id,
    });

    if (activeLoan) {
      return res.status(400).json({
        message: 'Customer already has an active loan. Please close it first.',
      });
    }

    // Check plan limits
    const user = await User.findById(req.user._id).select('plan');
    const userPlan = user.plan || 'Free';

    // Count existing loans for this user
    const loanCount = await Loan.countDocuments({ user: req.user._id });

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

    const loan = new Loan({
      user: req.user._id,
      customer: customerId,
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate,
      remainingAmount: totalAmount,
      interestType,
    });

    const createdLoan = await loan.save();
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
    let query = { user: req.user._id };

    if (req.query.customerId) {
      query.customer = req.query.customerId;
    }

    if (search) {
      // Find customers matching search name
      const matchingCustomers = await Customer.find({
        user: req.user._id,
        name: { $regex: search, $options: 'i' },
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

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate(
      'customer',
      'name email phone trustRating',
    );
    if (loan && loan.user.toString() === req.user._id.toString()) {
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
    if (!loan || loan.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status === 'completed') {
      return res.status(400).json({ message: 'Loan is already completed' });
    }

    const repayment = new Repayment({
      user: req.user._id,
      loan: loanId,
      customer: loan.customer,
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
  const query = { user: req.user._id };
  if (loanId) query.loan = loanId;
  if (customerId) query.customer = customerId;

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    if (search) {
      const matchingCustomers = await Customer.find({
        user: req.user._id,
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
    if (!loan || loan.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Update status if provided and valid
    if (status) {
      const allowedStatuses = ['active', 'completed', 'defaulted'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      loan.status = status;
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
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUpcomingRepayments = async (req, res) => {
  try {
    const { loanId } = req.query;
    const query = {
      user: req.user._id,
      status: 'active',
    };

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
    if (!loan || loan.user.toString() !== req.user._id.toString()) {
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
      url: `/uploads/loans/${req.file.filename}`,
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
};
