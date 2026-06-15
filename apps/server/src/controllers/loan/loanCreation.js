const mongoose = require('mongoose');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const FinancialTransaction = require('../../models/FinancialTransaction');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const Branch = require('../../models/Branch');
const LoanProduct = require('../../models/LoanProduct');
const SystemSettings = require('../../models/SystemSettings');
const { canCreateLoan } = require('../../utils/planLimits');
const { calculateRiskScore } = require('../../utils/riskService');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const { escapeRegExp } = require('../../utils/stringUtils');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const loanRepaymentService = require('../../services/loanRepaymentService');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const { transactionEmail } = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const {
  updateMemberCreditLimit,
  calculateCreditLimit,
} = require('../../services/creditLimitService');
const {
  computeCreditScore,
  refreshCreditScore,
} = require('../../services/creditScoringService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { roundMoney } = require('../../utils/money');

// Loan interest/term math now lives in utils/loanMath.js so the group-lending
// service computes EMI/totalAmount from the same source of truth as these flows.
const {
  calculateEMI,
  calculateSimpleInterest,
  calculateCompoundInterest,
  computeLoanTerms,
} = require('../../utils/loanMath');
const createLoan = async (req, res) => {
  const {
    customerId,
    principal: principalInput,
    rate: rateInput,
    duration: durationInput,
    startDate,
    interestType: interestTypeInput,
    grantor1Identifier,
    grantor2Identifier,
    product, // Optional LoanProduct ID
  } = req.body;

  let principal = Number(principalInput);
  let rate = Number(rateInput);
  let duration = Number(durationInput);
  let interestType = interestTypeInput || 'simple';

  try {
    // Fetch product details if provided to fill in defaults
    if (product) {
      const loanProduct = await LoanProduct.findById(product);
      if (loanProduct) {
        if (!rateInput && rateInput !== 0) rate = loanProduct.interestRate;
        if (!durationInput) duration = loanProduct.duration;
        if (!interestTypeInput) interestType = loanProduct.interestType;
      }
    }

    let grantor1Id = null;
    let grantor2Id = null;

    if (grantor1Identifier) {
      const { hash } = require('../../utils/encryption');
      const mongoose = require('mongoose');

      let grantor1Final = null;
      // Try _id first (most reliable — client sends member._id)
      if (mongoose.Types.ObjectId.isValid(grantor1Identifier)) {
        grantor1Final = await Member.findOne({ _id: grantor1Identifier, user: req.user.effectiveOwnerId });
      }
      // Fallback: cnicHash
      if (!grantor1Final) {
        grantor1Final = await Member.findOne({ user: req.user.effectiveOwnerId, cnicHash: hash(grantor1Identifier) });
      }
      // Fallback: name
      if (!grantor1Final) {
        grantor1Final = await Member.findOne({ user: req.user.effectiveOwnerId, name: grantor1Identifier.toLowerCase().trim() });
      }

      if (!grantor1Final) {
        return res.status(404).json({
          message: 'Grantor 1 not found. Please provide a valid Member CNIC or Phone number.',
        });
      }
      grantor1Id = grantor1Final._id;
    }

    if (grantor2Identifier) {
      const { hash: hashFn } = require('../../utils/encryption');
      const mongoose = require('mongoose');

      let grantor2Final = null;
      if (mongoose.Types.ObjectId.isValid(grantor2Identifier)) {
        grantor2Final = await Member.findOne({ _id: grantor2Identifier, user: req.user.effectiveOwnerId });
      }
      if (!grantor2Final) {
        grantor2Final = await Member.findOne({ user: req.user.effectiveOwnerId, cnicHash: hashFn(grantor2Identifier) });
      }
      if (!grantor2Final) {
        grantor2Final = await Member.findOne({ user: req.user.effectiveOwnerId, name: grantor2Identifier.toLowerCase().trim() });
      }

      if (!grantor2Final) {
        return res.status(404).json({
          message: 'Grantor 2 not found. Please provide a valid Member CNIC or Phone number.',
        });
      }
      grantor2Id = grantor2Final._id;
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
      !customer.currentAccountNumber &&
      !customer.loanAccountNumber
    ) {
      return res.status(400).json({
        message:
          'Customer does not have an account number. Please assign a Saving, Current, or Loan account before issuing a loan.',
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

    // Credit Limit (members only).
    // The share-based credit limit is a guardrail for member SELF-SERVICE loan
    // requests (see requestLoan). When an admin / branch manager assigns a loan
    // directly — and this endpoint is admin/manager-only — they may lend to any
    // member regardless of share balance, including members with no shares. So
    // we DON'T block here; we only recompute and store the limit for
    // display/reporting so it stays in sync.
    if (customer.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        // Dynamically calculate from live shareBalance to avoid stale stored values
        const effectiveCreditLimit = await calculateCreditLimit(member._id);
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

    // A loan must be attributed to a branch, so a tenant cannot issue loans until
    // they have created at least one branch.
    const { getDefaultBranchId, hasAnyBranch } = require('../../utils/branchUtils');
    if (!(await hasAnyBranch(req.user.effectiveOwnerId))) {
      return res.status(400).json({
        message: 'Create a branch before issuing loans.',
        code: 'NO_BRANCH',
      });
    }

    let emi, totalAmount;

    if (interestType === 'simple' || interestType === 'compound') {
      const calcFn = interestType === 'compound' ? calculateCompoundInterest : calculateSimpleInterest;
      const result = calcFn(principal, rate, duration);
      emi = Math.round(result.emi);
      totalAmount = Math.round(result.totalAmount);
    } else {
      emi = Math.round(calculateEMI(principal, rate, duration));
      totalAmount = emi * duration;
    }

    // Calculate Risk Score
    const customerHistory = await Loan.find({ customer: customerId });
    // Score the borrower's real history and fold it into the origination grade.
    // Best-effort: a scoring hiccup must not block an admin issuing a loan.
    let creditScoreResult = null;
    try {
      creditScoreResult = await refreshCreditScore(customerId);
    } catch (e) {
      creditScoreResult = null;
    }
    const riskDetails = calculateRiskScore(
      customer,
      { emi },
      customerHistory,
      creditScoreResult,
    );

    // Resolve the branch from the most reliable source so the loan lands on the
    // SAME branch as the member/customer. Business owners usually have no
    // branchId, and the Customer record can lack one even when the Member has it —
    // without this fallback the loan (and its disbursement) gets a null branch and
    // disappears from every per-branch report (Disbursed/Outstanding/Active/Outflow).
    let resolvedBranchId = req.user.branchId || customer.branchId;
    if (!resolvedBranchId && customer.memberId) {
      const branchMember = await Member.findById(customer.memberId).select('branchId');
      resolvedBranchId = branchMember?.branchId || resolvedBranchId;
    }
    // Final fallback: the tenant's default branch, so the loan is never branch-less.
    if (!resolvedBranchId) {
      resolvedBranchId = await getDefaultBranchId(req.user.effectiveOwnerId);
    }

    const loan = new Loan({
      user: req.user.effectiveOwnerId,
      customer: customerId,
      branchId: resolvedBranchId, // member/customer branch (owner has none)
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate,
      remainingAmount: totalAmount,
      // Principal still owed, tracked separately from remainingAmount so interest
      // and late fees never accrue on top of fees/capitalized interest.
      outstandingPrincipal: principal,
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
        const Notification = require('../../models/Notification');
        const notifications = [];

        if (grantor1Id) {
          notifications.push({
            recipient: grantor1Id,
            recipientModel: 'Member',
            title: 'New Grantor Assignment',
            message: `Admin has assigned you as Grantor 1 for a new loan of ${principal} for customer ${customer.name}.`,
            type: 'info',
            link: '/member/grantor-requests',
            action: 'grantor_request',
          });
        }

        if (grantor2Id) {
          notifications.push({
            recipient: grantor2Id,
            recipientModel: 'Member',
            title: 'New Grantor Assignment',
            message: `Admin has assigned you as Grantor 2 for a new loan of ${principal} for customer ${customer.name}.`,
            type: 'info',
            link: '/member/grantor-requests',
            action: 'grantor_request',
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
    duration: durationInput,
    grantor1Identifier,
    grantor2Identifier,
    notes,
  } = req.body;

  const principal = Number(principalInput);
  const duration = Number(durationInput);

  try {
    // SECURITY: ignore any borrower-supplied `rate`. The interest rate is
    // ALWAYS sourced from server-side configuration. Previously a member could
    // post `rate: 0` and the admin's approveLoan() preserved it unchanged.
    const settings = await SystemSettings.getSettings();
    const rate = settings.defaultInterestRate || 0;

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

    // Loans must be attributed to a branch; the business must have created one.
    const { getDefaultBranchId, hasAnyBranch } = require('../../utils/branchUtils');
    if (!(await hasAnyBranch(req.member.user))) {
      return res.status(400).json({
        message: 'Loans are not available yet. Please contact your branch.',
        code: 'NO_BRANCH',
      });
    }
    const requestDefaultBranchId = await getDefaultBranchId(req.member.user);

    if (
      !customer.accountNumber &&
      !customer.savingAccountNumber &&
      !customer.currentAccountNumber &&
      !customer.loanAccountNumber
    ) {
      return res.status(400).json({
        message:
          'Cannot request loan: Your profile is missing an account number. Please contact admin to update your profile.',
      });
    }

    // Find grantor (another member)
    const Member = require('../../models/Member');

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

    const { hash: hashIdentifier } = require('../../utils/encryption');
    const mongoose = require('mongoose');

    // Grantor 1 resolution: try _id → cnicHash → name
    let grantor1 = null;
    if (mongoose.Types.ObjectId.isValid(grantor1Identifier)) {
      grantor1 = await Member.findOne({ _id: grantor1Identifier, user: req.member.user, _id: { $ne: req.member._id } });
    }
    if (!grantor1) {
      const grantor1Hash = hashIdentifier(grantor1Identifier);
      grantor1 = await Member.findOne({
        user: req.member.user,
        cnicHash: grantor1Hash,
        _id: { $ne: req.member._id },
      });
    }
    if (!grantor1) {
      grantor1 = await Member.findOne({
        user: req.member.user,
        name: grantor1Identifier.toLowerCase().trim(),
        _id: { $ne: req.member._id },
      });
    }

    if (!grantor1) {
      return res.status(404).json({
        message:
          'Grantor 1 not found. Please provide a valid Member CNIC or Phone number of another member.',
      });
    }

    // Grantor 2 resolution: try _id → cnicHash → name
    let grantor2 = null;
    if (mongoose.Types.ObjectId.isValid(grantor2Identifier)) {
      grantor2 = await Member.findOne({ _id: grantor2Identifier, user: req.member.user, _id: { $ne: req.member._id } });
    }
    if (!grantor2) {
      const grantor2Hash = hashIdentifier(grantor2Identifier);
      grantor2 = await Member.findOne({
        user: req.member.user,
        cnicHash: grantor2Hash,
        _id: { $ne: req.member._id },
      });
    }
    if (!grantor2) {
      grantor2 = await Member.findOne({
        user: req.member.user,
        name: grantor2Identifier.toLowerCase().trim(),
        _id: { $ne: req.member._id },
      });
    }

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

    // Credit-score gate (member self-service only). A borrower in the lowest
    // band can't self-request — but staff can still issue a loan manually
    // (createLoan is intentionally un-gated). Computed once and reused for the
    // origination risk grade below. Best-effort: never hard-block on a scoring
    // error.
    let memberScore = null;
    try {
      memberScore = await refreshCreditScore(req.member.customer);
    } catch (e) {
      memberScore = null;
    }
    if (memberScore && memberScore.band === 'Very Poor') {
      return res.status(400).json({
        message:
          'Your current credit score is too low to request a loan online. Please speak with your branch — repaying existing loans on time will improve it.',
        creditScore: memberScore.score,
        creditBand: memberScore.band,
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

    // Member self-service requests are always booked as simple interest (see the
    // Loan document below: interestType: 'simple'). `interestType` was never
    // destructured from req.body in this handler, so referencing it here threw a
    // ReferenceError and broke every member loan request whenever rate > 0.
    const interestType = 'simple';

    if (rate > 0) {
      const calcFn = interestType === 'compound' ? calculateCompoundInterest : calculateSimpleInterest;
      const result = calcFn(principal, rate, duration);
      emi = Math.round(result.emi);
      totalAmount = Math.round(result.totalAmount);
    } else {
      // FIX: 0% interest still requires an EMI based on principal
      emi = Math.round(principal / duration);
      totalAmount = principal;
    }

    const customerHistory = await Loan.find({ customer: req.member.customer });
    const riskDetails = calculateRiskScore(
      customer,
      { emi },
      customerHistory,
      memberScore,
    );

    // Build documents array from uploaded files
    const uploadedDocs = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // documentTypes is sent as a JSON string array from the frontend
        const docTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : [];
        const idx = req.files.indexOf(file);
        uploadedDocs.push({
          name: docTypes[idx] || file.originalname || 'Document',
          url: file.path, // Cloudinary URL
          type: file.mimetype?.includes('pdf') ? 'pdf' : 'image',
          uploadedAt: new Date(),
        });
      }
    }

    const loan = new Loan({
      user: req.member.user,
      customer: req.member.customer,
      branchId: req.member.branchId || customer.branchId || requestDefaultBranchId, // Set branchId for proper segregation
      principal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate: new Date(),
      remainingAmount: totalAmount,
      outstandingPrincipal: principal,
      interestType: 'simple',
      status: 'pending',
      grantor1: grantor1._id,
      grantor1Status: 'pending',
      grantor2: grantor2._id,
      grantor2Status: 'pending',
      riskDetails,
      notes: notes || '',
      documents: uploadedDocs,
    });

    const createdLoan = await loan.save();

    // Notify Grantors
    try {
      const Notification = require('../../models/Notification');
      const notifications = [
        {
          recipient: grantor1._id,
          recipientModel: 'Member',
          title: 'New Grantor Request',
          message: `${req.member.name} has requested you to be Grantor 1 for a loan of Rs. ${principal.toLocaleString()}.`,
          type: 'info',
          branchId: req.member.branchId || customer.branchId || requestDefaultBranchId,
          link: '/member/grantor-requests', // Grantors can see requests on their dedicated page
          action: 'grantor_request',
        },
        {
          recipient: grantor2._id,
          recipientModel: 'Member',
          title: 'New Grantor Request',
          message: `${req.member.name} has requested you to be Grantor 2 for a loan of Rs. ${principal.toLocaleString()}.`,
          type: 'info',
          branchId: req.member.branchId || customer.branchId || requestDefaultBranchId,
          link: '/member/grantor-requests', // Grantors can see requests on their dedicated page
          action: 'grantor_request',
        },
      ];
      await Notification.insertMany(notifications);
    } catch (notifError) {
      console.error('Failed to notify grantors:', notifError);
    }

    // Notify Admins and Managers
    try {
      await notifyAdminsOfMemberAction({
        title: 'New Loan Request',
        message: `Member ${req.member.name} has requested a loan of Rs. ${principal.toLocaleString()}.`,
        type: 'info',
        branchId: req.member.branchId || customer.branchId || requestDefaultBranchId,
        ownerId: req.member.user,
        link: '/loan-requests',
        metadata: {
          loanId: createdLoan._id,
          memberId: req.member._id,
          principal,
        },
      });
    } catch (adminNotifError) {
      console.error(
        'Failed to notify admins of loan request:',
        adminNotifError,
      );
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
 * @desc    Member uploads documents to their own pending loan
 * @route   POST /api/loans/my-loans/:id/documents
 * @access  Private (Member)
 */
const memberUploadDocuments = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      customer: req.member.customer,
      status: 'pending',
    });

    if (!loan) {
      return res.status(404).json({
        message: 'Pending loan not found or you do not have access.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    const docTypes = req.body.documentTypes
      ? JSON.parse(req.body.documentTypes)
      : [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      loan.documents.push({
        name: docTypes[i] || file.originalname || 'Document',
        url: file.path,
        type: file.mimetype?.includes('pdf') ? 'pdf' : 'image',
        uploadedAt: new Date(),
      });
    }

    await loan.save();
    res.json({ message: 'Documents uploaded successfully', documents: loan.documents });
  } catch (error) {
    console.error('memberUploadDocuments Error:', error);
    res.status(500).json({ message: error.message });
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
    })
      .populate('customer', 'name phone cnic')
      .populate('grantor1', 'name')
      .populate('grantor2', 'name');

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
  const { status, signature } = req.body; // 'approved' or 'rejected', signature is base64 data URL
  try {
    // Require signature for approval
    if (status === 'approved' && !signature) {
      return res
        .status(400)
        .json({ message: 'Signature is required to approve a guarantor request' });
    }

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
        loan.grantor1Signature = signature;
        loan.grantor1AgreementAcceptedAt = new Date();
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
        loan.grantor2Signature = signature;
        loan.grantor2AgreementAcceptedAt = new Date();
      }
    }

    await loan.save();

    // ── Notifications (Borrower & Admin) ───────────────────────────────────
    try {
      const borrowerCustomer = await Customer.findById(loan.customer);

      // Notify Borrower (Member)
      if (
        borrowerCustomer &&
        borrowerCustomer.isMember &&
        borrowerCustomer.memberId
      ) {
        const notifTitle =
          status === 'approved' ? 'Grantor Approved' : 'Grantor Rejected';
        const notifMessage = `Grantor ${req.member.name} has ${status} your loan request for ${loan.principal.toLocaleString()}.`;

        await createTransactionNotification({
          recipientId: borrowerCustomer.memberId,
          recipientModel: 'Member',
          title: notifTitle,
          message: notifMessage,
          type: status === 'approved' ? 'success' : 'error',
          branchId: loan.branchId,
          action: 'grantor_action_notification',
          metadata: {
            loanId: loan._id,
            link: '/member/loans',
          },
        });
      }

      // Notify Admin
      if (status === 'approved') {
        const notification = new Notification({
          recipient: loan.user,
          recipientModel: 'User',
          title: 'Grantor Approved Loan',
          message: `Grantor ${req.member.name} has approved the loan request for ${borrowerCustomer?.name || loan._id}.`,
          type: 'info',
          link: `/loan-requests`,
          action: 'grantor_approved',
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Grantor status update notification error:', notifError);
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

module.exports = {
  createLoan,
  requestLoan,
  memberUploadDocuments,
  getGrantorLoans,
  updateGrantorStatus,
};
