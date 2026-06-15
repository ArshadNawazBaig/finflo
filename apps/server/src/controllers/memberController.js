const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const BusinessShare = require('../models/BusinessShare');
const ProfitDistribution = require('../models/ProfitDistribution');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Repayment = require('../models/Repayment');
const ActivityLog = require('../models/ActivityLog');
const loanRepaymentService = require('../services/loanRepaymentService');
const Loan = require('../models/Loan');
const Checkbook = require('../models/Checkbook');
const { canAddMember } = require('../utils/planLimits');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../utils/notificationHelper');
const { logActivity } = require('./activityLogController');
const {
  deleteCloudinaryFileByUrl,
  uploadSignature,
} = require('../utils/cloudinaryHelper');
const { sendEmail, sendEmailAsync } = require('../utils/email');
const raastService = require('../services/raastService');
const {
  transactionEmail,
  memberApprovalEmail,
} = require('../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../utils/balanceUtils');
const Branch = require('../models/Branch');
const { updateMemberCreditLimit } = require('../services/creditLimitService');
const { getEmailBranding } = require('../utils/brandingUtils');
const { escapeRegExp } = require('../utils/stringUtils');
const { roundMoney } = require('../utils/money');
const { parseBoolean } = require('../utils/parseQuery');

// @desc    Convert Customer to Member
// @route   POST /api/members/convert
// @access  Private (Admin)
const convertCustomerToMember = async (req, res) => {
  const { customerId, password } = req.body;

  try {
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.isMember) {
      return res.status(400).json({ message: 'Customer is already a member' });
    }

    // Check if member with this CNIC already exists under this user
    const memberExists = await Member.findOne({
      user: customer.user,
      cnic: customer.cnic,
    });

    if (memberExists) {
      return res
        .status(400)
        .json({ message: 'Member account already exists for this CNIC' });
    }

    // Check plan limits
    const owner = await User.findById(customer.user).select('plan');
    const userPlan = owner.plan || 'Free';

    // Count existing members for this owner
    const memberCount = await Member.countDocuments({ user: customer.user });

    // Validate against plan limits
    const limitCheck = await canAddMember(userPlan, memberCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    // Create Member
    const member = await Member.create({
      user: customer.user, // Admin/Business Owner
      customer: customer._id,
      branchId: customer.branchId, // Inherit branch from customer
      name: customer.name?.toLowerCase(),
      cnic: customer.cnic,
      email: customer.email?.toLowerCase(),
      phone: customer.phone,
      address: customer.address,
      password, // Will be hashed by pre-save middleware
      mustChangePassword: true,
      jobDetail: customer.jobDetail,
      signature: customer.signature,
    });

    // Update Customer
    customer.isMember = true;
    customer.memberId = member._id;
    await customer.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_converted_to_member',
      category: 'member',
      details: `Converted customer ${customer.name} to member`,
      req,
    });

    // Notify Admin if created by staff
    if (req.user.role === 'staff') {
      try {
        const notification = new Notification({
          recipient: req.user.effectiveOwnerId,
          recipientModel: 'User',
          title: 'Customer Converted to Member',
          message: `Staff member ${req.user.name} has converted customer ${customer.name} to a member.`,
          type: 'info',
        });
        await notification.save();
      } catch (notifError) {
        console.error(
          'Failed to notify admin about customer conversion:',
          notifError,
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Customer converted to Member successfully',
      member,
    });
  } catch (error) {
    console.error('Convert Member Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all members
const getMembers = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      approvalStatus,
      branchId,
    } = req.query;

    const query = { user: userId };
    if (branchId) {
      query.branchId = branchId;
    }
    if (search) {
      const safeSearch = escapeRegExp(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { cnic: { $regex: safeSearch, $options: 'i' } },
        { savingAccountNumber: { $regex: safeSearch, $options: 'i' } },
        { currentAccountNumber: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }
    if (approvalStatus === 'approved') {
      query.approvalStatus = { $in: ['approved', null, undefined] };
    } else if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    } else if (!parseBoolean(req.query.includePending)) {
      // Default to only showing approved members, unless explicitly bypassing
      query.approvalStatus = { $in: ['approved', null, undefined] };
    }

    // Branch Segregation: Staff/Managers only see their branch data + unassigned members of their business
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) {
        const branchFilter = {
          $or: [
            { branchId: branchScope },
            { branchId: { $exists: false } },
            { branchId: null },
          ],
        };

        if (query.$or) {
          const searchFilter = { $or: query.$or };
          delete query.$or;
          query.$and = [searchFilter, branchFilter];
        } else {
          query.$or = branchFilter.$or;
        }
      }
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Calculate Summary (Ignoring pagination but respecting filters)
    const [summaryResult] = await Member.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$currentBalance' },
          totalProfit: { $sum: '$totalProfit' },
          activeMembers: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = summaryResult || {
      totalInvested: 0,
      totalProfit: 0,
      activeMembers: 0,
    };

    const members = await Member.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('branchId', 'name')
      .populate(
        'customer',
        'name email savingAccountNumber currentAccountNumber nominee',
      );

    const count = await Member.countDocuments(query);

    // Active-loan count per member in ONE aggregation (was an N+1: a separate
    // Loan.countDocuments per member row on the page).
    const Loan = mongoose.model('Loan');
    const customerIds = members
      .map((m) => m.customer?._id || m.customer)
      .filter(Boolean);
    const loanCounts = customerIds.length
      ? await Loan.aggregate([
          { $match: { customer: { $in: customerIds }, status: 'active' } },
          { $group: { _id: '$customer', count: { $sum: 1 } } },
        ])
      : [];
    const loanCountMap = new Map(loanCounts.map((r) => [String(r._id), r.count]));

    const membersWithLoans = members.map((member) => {
      const customerId = member.customer?._id || member.customer;
      return {
        ...member.toObject(),
        activeLoans: customerId ? loanCountMap.get(String(customerId)) || 0 : 0,
        savingAccountNumber:
          member.savingAccountNumber || member.customer?.savingAccountNumber,
        currentAccountNumber:
          member.currentAccountNumber || member.customer?.currentAccountNumber,
      };
    });

    res.json({
      data: membersWithLoans,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalEntries: count,
      summary,
    });
  } catch (error) {
    console.error('Get Members Error:', error);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
};

// Get member by ID
const getMemberById = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne(
      req.user.role === 'super_admin' ? { _id: id } : { _id: id, user: userId },
    )
      .populate('customer', 'name email phone nominee')
      .populate('branchId', 'name');

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check authorization (Admin can see all, Member can see self)
    let isAuthorized = false;
    if (
      req.user &&
      member.user.toString() === req.user.effectiveOwnerId.toString()
    ) {
      isAuthorized = true; // Admin viewing their member
    } else if (
      req.member &&
      req.member._id.toString() === member._id.toString()
    ) {
      isAuthorized = true; // Member viewing themselves
    } else if (
      req.user &&
      req.user.role === 'staff' &&
      member.branchId?.toString() === req.user.branchId?.toString()
    ) {
      isAuthorized = true; // Staff viewing member in their branch
    } else if (req.user && req.user.role === 'super_admin') {
      isAuthorized = true; // Super Admin viewing any member
    }

    if (!isAuthorized) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const memberObj = member.toObject();

    // Fetch guarantor data in parallel
    const customerId = member.customer?._id || member.customer;
    const [loansWithGrantors, loansAsGrantor] = await Promise.all([
      // 1. Loans of this member's customer that have grantors assigned
      customerId
        ? Loan.find({
            customer: customerId,
            $or: [
              { grantor1: { $ne: null } },
              { grantor2: { $ne: null } },
            ],
          })
            .select('grantor1 grantor1Status grantor2 grantor2Status principal status')
            .populate('grantor1', 'name cnic profilePicture')
            .populate('grantor2', 'name cnic profilePicture')
            .lean()
        : [],
      // 2. Loans where this member is a grantor for someone else
      Loan.find({
        $or: [{ grantor1: id }, { grantor2: id }],
      })
        .select('customer grantor1 grantor1Status grantor2 grantor2Status principal status')
        .populate('customer', 'name')
        .lean(),
    ]);

    // Extract unique guarantors for this member's loans
    const guarantors = [];
    const seenGrantorIds = new Set();
    for (const loan of loansWithGrantors) {
      if (loan.grantor1 && !seenGrantorIds.has(loan.grantor1._id.toString())) {
        seenGrantorIds.add(loan.grantor1._id.toString());
        guarantors.push({
          _id: loan.grantor1._id,
          name: loan.grantor1.name,
          cnic: loan.grantor1.cnic,
          profilePicture: loan.grantor1.profilePicture,
          status: loan.grantor1Status,
          loanAmount: loan.principal,
          loanStatus: loan.status,
        });
      }
      if (loan.grantor2 && !seenGrantorIds.has(loan.grantor2._id.toString())) {
        seenGrantorIds.add(loan.grantor2._id.toString());
        guarantors.push({
          _id: loan.grantor2._id,
          name: loan.grantor2.name,
          cnic: loan.grantor2.cnic,
          profilePicture: loan.grantor2.profilePicture,
          status: loan.grantor2Status,
          loanAmount: loan.principal,
          loanStatus: loan.status,
        });
      }
    }

    // Extract loans where this member is acting as guarantor
    const actingAsGrantor = loansAsGrantor.map((loan) => {
      const isGrantor1 = loan.grantor1?.toString() === id || loan.grantor1?._id?.toString() === id;
      return {
        loanId: loan._id,
        customerName: loan.customer?.name || 'Unknown',
        customerId: loan.customer?._id,
        status: isGrantor1 ? loan.grantor1Status : loan.grantor2Status,
        loanAmount: loan.principal,
        loanStatus: loan.status,
      };
    });

    memberObj.guarantors = guarantors;
    memberObj.actingAsGrantor = actingAsGrantor;

    res.json(memberObj);
  } catch (error) {
    console.error('Get Member Error:', error);
    res.status(500).json({ message: 'Failed to fetch member' });
  }
};

// Create new member
const createMember = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      name,
      email,
      phone,
      cnic,
      address,
      initialInvestment,
      profitRate,
      customerId,
      jobDetail,
      signature,
    } = req.body;

    const { validateEmail } = require('../utils/emailValidator');
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }

    const lowercaseEmail = email?.toLowerCase();
    const lowercaseName = name?.toLowerCase();

    // Check if CNIC already exists for this user
    const existingMember = await Member.findOne({
      user: userId,
      cnic: cnic?.trim(),
    });
    if (existingMember) {
      return res
        .status(400)
        .json({ message: 'Member with this CNIC already exists' });
    }

    // Check plan limits
    const user = await User.findById(userId).select('plan customerCount');
    const userPlan = user.plan || 'Free';

    // Count existing members for this user
    const memberCount = await Member.countDocuments({ user: userId });

    // Validate against plan limits
    const limitCheck = await canAddMember(userPlan, memberCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    // A tenant must create at least one branch before any member can be added,
    // so every member is attributable to a branch. New members land in the
    // tenant's default branch unless an explicit branch is chosen.
    const { getDefaultBranchId, hasAnyBranch } = require('../utils/branchUtils');
    if (!(await hasAnyBranch(userId))) {
      return res.status(400).json({
        message: 'Create a branch before adding members.',
        code: 'NO_BRANCH',
      });
    }
    const defaultBranchId = await getDefaultBranchId(userId);

    // SECURITY: every admin-created member gets a cryptographically random
    // initial password. The plaintext is returned to the admin once for
    // hand-off to the member; the member is forced to change it on first
    // login. NEVER use a hardcoded constant — a single leak compromises
    // every member account ever onboarded.
    const cryptoLib = require('crypto');
    const initialPassword =
      cryptoLib.randomBytes(9).toString('base64')
        .replace(/[+/=]/g, (c) => ({ '+': 'A', '/': 'B', '=': '' }[c])) + '!1';
    const memberData = {
      user: userId,
      // Staff (branch managers) can only create within their own branch; admins
      // may pick a branch in the form, otherwise it falls back to the tenant's
      // default branch. Admin/manager can move the member afterwards.
      branchId: req.user.branchId || req.body.branchId || defaultBranchId,
      name: lowercaseName,
      email: lowercaseEmail,
      phone,
      cnic: cnic?.trim(),
      address,
      totalInvested: initialInvestment || 0,
      currentBalance: initialInvestment || 0,
      profitRate: profitRate || 0,
      password: initialPassword,
      mustChangePassword: true,
      jobDetail,
      signature,
    };

    // Link to customer if provided
    if (customerId) {
      const customer = await Customer.findOne({
        _id: customerId,
        user: userId,
      });
      if (customer) {
        memberData.customer = customerId;
        // Copy account numbers if they exist
        if (customer.savingAccountNumber)
          memberData.savingAccountNumber = customer.savingAccountNumber;
        if (customer.currentAccountNumber)
          memberData.currentAccountNumber = customer.currentAccountNumber;
      }
    }

    const member = await Member.create(memberData);

    // Update count if it's a new person (not from customer)
    if (!customerId) {
      user.customerCount = (user.customerCount || 0) + 1;
      await user.save();

      // Mirror the new member into the Customer table. A member IS a customer
      // with portal access, so a directly-added member must also show up on the
      // Customers page. Never let a failure here roll back the created member —
      // the linkage is best-effort and recoverable.
      try {
        const { hash } = require('../utils/encryption');

        // If a customer with the same CNIC or email already exists (e.g. added
        // earlier as a plain customer), link to it instead of inserting a
        // duplicate — the (user, cnic) / (user, email) unique indexes would
        // otherwise reject the insert.
        let linkedCustomer = await Customer.findOne({
          user: userId,
          $or: [
            { cnicHash: hash(cnic?.trim()) },
            { email: lowercaseEmail },
          ],
        });

        if (linkedCustomer) {
          if (!linkedCustomer.isMember || !linkedCustomer.memberId) {
            linkedCustomer.isMember = true;
            linkedCustomer.memberId = member._id;
            await linkedCustomer.save();
          }
        } else {
          linkedCustomer = await Customer.create({
            user: userId,
            branchId: member.branchId,
            name: lowercaseName,
            email: lowercaseEmail,
            phone,
            address,
            cnic: cnic?.trim(),
            jobDetail,
            signature,
            isMember: true,
            memberId: member._id,
            // Reuse the member's generated account numbers so both records
            // reference the same accounts.
            savingAccountNumber: member.savingAccountNumber,
            currentAccountNumber: member.currentAccountNumber,
            loanAccountNumber: member.loanAccountNumber,
          });
        }

        // Back-link the member to its customer record.
        member.customer = linkedCustomer._id;
        await member.save();
      } catch (custErr) {
        console.error(
          'Failed to mirror member into Customer table:',
          custErr.message,
        );
      }
    }

    // Create initial investment record AND financial transaction if there's an initial investment
    if (initialInvestment && initialInvestment > 0) {
      const investment = await Investment.create({
        user: userId,
        member: member._id,
        branchId: member.branchId,
        type: 'deposit',
        amount: initialInvestment,
        description: 'Initial investment',
        balanceAfter: initialInvestment,
      });

      await FinancialTransaction.create({
        user: userId,
        branchId: member.branchId,
        type: 'credit',
        category: 'investment',
        amount: initialInvestment,
        date: new Date(),
        description: 'Initial investment',
        member: member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
      });
    }

    // Update customer if linked
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        isMember: true,
        memberId: member._id,
      });
    }

    // Notify Admin if created by staff
    if (req.user.role === 'staff') {
      try {
        const notification = new Notification({
          recipient: req.user.effectiveOwnerId,
          recipientModel: 'User',
          title: 'New Member Created',
          message: `Staff member ${req.user.name} has created a new member: ${name}.`,
          type: 'info',
        });
        await notification.save();
      } catch (notifError) {
        console.error(
          'Failed to notify admin about member creation:',
          notifError,
        );
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'member_created',
      category: 'member',
      details: `Created new member: ${member.name} (${member.email})`,
      metadata: { memberId: member._id },
      req,
    });

    // Return the member document plus the one-time initial password so the
    // admin can hand it to the member. The member is required to change it
    // on first login (mustChangePassword=true).
    const memberJson = member.toObject ? member.toObject() : { ...member };
    delete memberJson.password;
    res.status(201).json({ ...memberJson, initialPassword });
  } catch (error) {
    console.error('Create Member Error:', error);
    res.status(500).json({ message: 'Failed to create member' });
  }
};

// Update member
const updateMember = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      cnic,
      address,
      status,
      profitRate,
      jobDetail,
      signature,
      nominee,
      branchId,
    } = req.body;

    if (email) {
      const { validateEmail } = require('../utils/emailValidator');
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.message });
      }
    }

    const member = await Member.findOne(
      req.user.role === 'super_admin' ? { _id: id } : { _id: id, user: userId },
    );
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check if CNIC is being changed and if it already exists
    if (cnic && cnic !== member.cnic) {
      const existingMember = await Member.findOne({ user: userId, cnic });
      if (existingMember) {
        return res
          .status(400)
          .json({ message: 'Member with this CNIC already exists' });
      }
    }

    // Handle nominee CNIC image update
    let nomineeCnicImageUrl = member.nominee?.cnicImage;

    // We need to fetch the customer to get the current nominee image if we want to delete it
    // But member.customer is not populated here. Let's populate it if needed or just use the one from req.body

    // Actually, nominee lives on CUSTOMER.
    // In memberController, we just sync it.
    // Let's get the customer first to handle image deletion if needed.
    let linkedCustomer = null;
    if (member.customer) {
      linkedCustomer = await Customer.findById(member.customer);
    }

    if (nominee?.cnicImage && nominee.cnicImage.startsWith('data:image')) {
      try {
        // Delete old image if it exists on linked customer
        if (linkedCustomer?.nominee?.cnicImage) {
          await deleteCloudinaryFileByUrl(linkedCustomer.nominee.cnicImage);
        }
        const uploadResult = await uploadSignature(
          nominee.cnicImage,
          'nominee_cnics',
        );
        nomineeCnicImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Nominee CNIC Image Update Error:', uploadError);
        return res
          .status(500)
          .json({ message: 'Failed to update nominee CNIC image' });
      }
    } else if (linkedCustomer?.nominee?.cnicImage) {
      nomineeCnicImageUrl = linkedCustomer.nominee.cnicImage;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      id,
      {
        name: name?.toLowerCase(),
        email: email?.toLowerCase(),
        phone,
        cnic: cnic?.trim(),
        address,
        status,
        profitRate,
        jobDetail,
        signature,
        branchId: branchId || undefined,
      },
      { new: true, runValidators: true },
    ).populate('branchId', 'name');

    // Sync with Customer if linked
    if (updatedMember.customer) {
      const customerUpdate = {
        name: name?.toLowerCase(),
        email: email?.toLowerCase(),
        phone,
        address,
      };

      // Keep the customer's branch in lock-step with the member's.
      if (branchId) customerUpdate.branchId = branchId;

      if (nominee) {
        customerUpdate.nominee = {
          ...nominee,
          cnicImage: nomineeCnicImageUrl,
        };
      }

      await Customer.findByIdAndUpdate(updatedMember.customer, customerUpdate);
    }

    // A branch reassignment must follow the member to every record that drives
    // per-branch analytics — loans, transactions and investments. Otherwise
    // those rows keep pointing at the member's previous (or a since-deleted)
    // branch, so the new branch reads 0 for loans/disbursed/outstanding/cash-flow
    // while the old branchId dangles, unattributable to any existing branch.
    if (branchId) {
      const branchSync = { $set: { branchId } };
      const loanScope = {
        user: userId,
        $or: [
          { member: updatedMember._id },
          ...(updatedMember.customer
            ? [{ customer: updatedMember.customer }]
            : []),
        ],
      };
      await Promise.all([
        Loan.updateMany(loanScope, branchSync),
        FinancialTransaction.updateMany(
          { user: userId, member: updatedMember._id },
          branchSync,
        ),
        Investment.updateMany(
          { user: userId, member: updatedMember._id },
          branchSync,
        ),
      ]);
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'member_updated',
      category: 'member',
      details: `Updated member: ${updatedMember.name}`,
      metadata: { memberId: updatedMember._id },
      req,
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Update Member Error:', error);
    res.status(500).json({ message: 'Failed to update member' });
  }
};

// Delete member
const deleteMember = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne(
      req.user.role === 'super_admin' ? { _id: id } : { _id: id, user: userId },
    );
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Block deletion when ANY balance is non-zero or an unsettled loan exists.
    // Previously only currentBalance was checked, which allowed members with
    // savings, share investments, or active loans to be silently deleted —
    // destroying their audit trail and orphaning the loan.
    if ((member.currentBalance || 0) > 0) {
      return res.status(400).json({
        message:
          'Cannot delete member with funds in their current account. Please withdraw all funds first.',
      });
    }
    if ((member.savingBalance || 0) > 0) {
      return res.status(400).json({
        message:
          'Cannot delete member with funds in their saving account. Please withdraw all savings first.',
      });
    }
    if ((member.shareBalance || 0) > 0) {
      return res.status(400).json({
        message:
          'Cannot delete member with an active share balance. Please liquidate the share investment first.',
      });
    }
    if (member.customer) {
      const unsettledLoan = await Loan.findOne({
        customer: member.customer,
        user: userId,
        status: { $in: ['active', 'overdue', 'pending'] },
      }).select('_id');
      if (unsettledLoan) {
        return res.status(400).json({
          message:
            'Cannot delete member with an active, overdue, or pending loan. Settle or close the loan first.',
        });
      }
    }

    // Delete all member documents from Cloudinary if they exist
    if (member.documents && member.documents.length > 0) {
      for (const doc of member.documents) {
        if (doc.url) {
          await deleteCloudinaryFileByUrl(doc.url, 'file');
        }
      }
    }

    // Unlink from customer if linked
    if (member.customer) {
      await Customer.findByIdAndUpdate(member.customer, {
        isMember: false,
        memberId: null,
      });
    }

    await Member.findByIdAndDelete(id);
    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'member_deleted',
      category: 'member',
      details: `Deleted member: ${member.name} (${member.email})`,
      metadata: { memberId: id },
      req,
    });

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete Member Error:', error);
    res.status(500).json({ message: 'Failed to delete member' });
  }
};

// ── Minimal CSV parser (RFC 4180-ish) ───────────────────────────────────────
// Tiny inline parser instead of adding a dependency. Handles double-quoted
// fields, escaped quotes (""), commas inside quotes, and \r\n / \n line
// endings. Not exotic enough for streaming or alt delimiters — fine for our
// admin-uploaded member rosters which are small (capped at 5MB).
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  // Push trailing field/row when file doesn't end with newline
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
};

// ── Bulk Member Import (CSV) ────────────────────────────────────────────────
// Accepts multipart/form-data with field `file`. Expected header columns
// (case-insensitive, order-flexible): name, email, phone, cnic, address,
// profitRate, initialInvestment. The endpoint validates each row before
// touching the DB, then creates members one by one — failures on individual
// rows do not abort the batch. Each successful row is given a random
// initial password (admin must hand it off out-of-band).
const bulkImportMembers = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    // Block imports until the tenant has a branch; attribute each imported member
    // to the creator's branch (managers) or the tenant default (admins).
    const { getDefaultBranchId, hasAnyBranch } = require('../utils/branchUtils');
    if (!(await hasAnyBranch(userId))) {
      return res.status(400).json({
        message: 'Create a branch before importing members.',
        code: 'NO_BRANCH',
      });
    }
    const defaultBranchId = await getDefaultBranchId(userId);

    const csvText = req.file.buffer.toString('utf8').replace(/^﻿/, '');
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return res.status(400).json({
        message: 'CSV must contain a header row and at least one data row',
      });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);
    const col = (name) => header.indexOf(name);
    const required = ['name', 'email', 'phone', 'cnic'];
    for (const r of required) {
      if (col(r) === -1) {
        return res.status(400).json({
          message: `Missing required column: "${r}"`,
        });
      }
    }

    // Plan limit check — bail early if even the optimistic count exceeds it
    const user = await User.findById(userId).select('plan customerCount');
    const userPlan = user?.plan || 'Free';
    const existingCount = await Member.countDocuments({ user: userId });
    const limitCheck = await canAddMember(userPlan, existingCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }
    const headroom = (limitCheck.limit ?? Infinity) - existingCount;

    const { validateEmail } = require('../utils/emailValidator');
    const cryptoLib = require('crypto');
    const randomPassword = () =>
      cryptoLib
        .randomBytes(9)
        .toString('base64')
        .replace(/[+/=]/g, (c) => ({ '+': 'A', '/': 'B', '=': '' })[c]) + '!1';

    // Track CNICs we've created in *this* batch so a duplicate row doesn't slip
    // past the per-row uniqueness check (Member.findOne would return null until
    // the previous row commits).
    const seenCnicsInBatch = new Set();
    const created = [];
    const errors = [];
    let createdCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2; // +1 for header, +1 for 1-based humans
      const raw = dataRows[i];
      const get = (key) => {
        const idx = col(key);
        return idx === -1 ? '' : String(raw[idx] || '').trim();
      };
      const name = get('name');
      const email = get('email').toLowerCase();
      const phone = get('phone');
      const cnic = get('cnic');
      const address = get('address');
      const profitRateRaw = get('profitrate');
      const initialInvestmentRaw = get('initialinvestment');

      if (!name || !email || !phone || !cnic) {
        errors.push({
          row: rowNum,
          message: 'Missing required field (name / email / phone / cnic)',
        });
        continue;
      }

      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        errors.push({ row: rowNum, message: emailCheck.message });
        continue;
      }

      if (seenCnicsInBatch.has(cnic)) {
        errors.push({ row: rowNum, message: 'Duplicate CNIC in CSV' });
        continue;
      }

      const existing = await Member.findOne({ user: userId, cnic });
      if (existing) {
        errors.push({
          row: rowNum,
          message: `Member with CNIC ${cnic} already exists`,
        });
        continue;
      }

      if (createdCount >= headroom) {
        errors.push({
          row: rowNum,
          message: `Plan limit reached (${limitCheck.limit}) — remaining rows skipped`,
        });
        // No point hammering the DB for the remaining rows; surface a single
        // explicit error per skipped row so the admin sees what was dropped.
        for (let j = i + 1; j < dataRows.length; j++) {
          errors.push({
            row: j + 2,
            message: 'Skipped — plan limit reached',
          });
        }
        break;
      }

      const profitRate = profitRateRaw ? Number(profitRateRaw) : 0;
      const initialInvestment = initialInvestmentRaw
        ? Number(initialInvestmentRaw)
        : 0;
      if (Number.isNaN(profitRate) || profitRate < 0) {
        errors.push({ row: rowNum, message: 'Invalid profitRate' });
        continue;
      }
      if (Number.isNaN(initialInvestment) || initialInvestment < 0) {
        errors.push({ row: rowNum, message: 'Invalid initialInvestment' });
        continue;
      }

      try {
        const member = await Member.create({
          user: userId,
          branchId: req.user.branchId || defaultBranchId,
          name: name.toLowerCase(),
          email,
          phone,
          cnic,
          address,
          totalInvested: initialInvestment,
          currentBalance: initialInvestment,
          profitRate,
          password: randomPassword(),
          mustChangePassword: true,
        });

        if (initialInvestment > 0) {
          const investment = await Investment.create({
            user: userId,
            member: member._id,
            branchId: member.branchId,
            type: 'deposit',
            amount: initialInvestment,
            description: 'Initial investment (CSV import)',
            balanceAfter: initialInvestment,
          });
          await FinancialTransaction.create({
            user: userId,
            branchId: member.branchId,
            type: 'credit',
            category: 'investment',
            amount: initialInvestment,
            date: new Date(),
            description: 'Initial investment (CSV import)',
            member: member._id,
            referenceId: investment._id,
            referenceModel: 'Investment',
          });
        }

        seenCnicsInBatch.add(cnic);
        createdCount++;
        created.push({
          row: rowNum,
          memberId: member._id,
          name: member.name,
          cnic: member.cnic,
        });
      } catch (rowErr) {
        errors.push({
          row: rowNum,
          message: rowErr?.message || 'Failed to create member',
        });
      }
    }

    if (createdCount > 0) {
      user.customerCount = (user.customerCount || 0) + createdCount;
      await user.save();
      await logActivity({
        userId: req.user._id,
        action: 'members_bulk_imported',
        category: 'member',
        details: `Bulk imported ${createdCount} member(s) from CSV (${errors.length} error rows)`,
        metadata: { createdCount, errorCount: errors.length },
        req,
      });
    }

    return res.json({
      total: dataRows.length,
      created: createdCount,
      errors,
      createdMembers: created,
    });
  } catch (error) {
    console.error('Bulk Import Members Error:', error);
    res.status(500).json({ message: 'Failed to import members' });
  }
};

// ── Member Documents (KYC: CNIC / Selfie / Proof of Address / etc.) ─────────
// Multipart upload helper — multer's req.files is already in Cloudinary by
// the time the handler runs (uploadMiddleware uses generalStorage). The
// handler just appends to the member's documents array with the chosen
// type and optional expiry date. Status defaults to Pending so the
// verification queue picks it up.
const uploadMemberDocuments = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const ALLOWED_TYPES = [
      'CNIC',
      'Selfie',
      'Utility Bill',
      'Tax Return',
      'Proof of Residence',
      'Other',
    ];
    const docType = ALLOWED_TYPES.includes(req.body.type)
      ? req.body.type
      : 'Other';
    let expiryDate = null;
    if (req.body.expiryDate) {
      const d = new Date(req.body.expiryDate);
      if (!Number.isNaN(d.getTime())) expiryDate = d;
    }

    const newDocs = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      type: docType,
      expiryDate,
      status: 'Pending',
    }));
    member.documents.push(...newDocs);
    await member.save();

    // Also mirror onto the linked Customer record (Customer is the
    // canonical KYC entity in this codebase; Member.documents is the
    // member-facing view). Existing customerController.uploadDocuments
    // mirrors the opposite direction; we match that pattern.
    if (member.customer) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        customer.documents.push(...newDocs);
        await customer.save();
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_uploaded',
      category: 'member',
      details: `Uploaded ${newDocs.length} ${docType} document(s) for member: ${member.name}`,
      metadata: { memberId: member._id, type: docType, count: newDocs.length },
      req,
    });

    return res.status(201).json({ documents: member.documents });
  } catch (error) {
    console.error('Upload Member Documents Error:', error);
    res.status(500).json({ message: 'Failed to upload documents' });
  }
};

// PATCH status: Verified | Rejected | Pending. Verified stamps verifiedAt;
// Rejected stores an optional `rejectionReason` to relay back to the member.
const updateMemberDocumentStatus = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id, docId } = req.params;
    const { status, rejectionReason } = req.body || {};

    if (!['Pending', 'Verified', 'Rejected', 'Expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const doc = member.documents.id(docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.status = status;
    if (status === 'Verified') {
      doc.verifiedAt = new Date();
      doc.rejectionReason = '';
    }
    if (status === 'Rejected') {
      doc.rejectionReason = (rejectionReason || '').slice(0, 500);
      doc.verifiedAt = undefined;
    }
    await member.save();

    // Keep the Customer record in lockstep — it's the source of truth for
    // KYC and feeds the legacy customer-side verification queue.
    if (member.customer) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        const mirror = customer.documents.id(docId);
        if (mirror) {
          mirror.status = status;
          if (status === 'Verified') mirror.verifiedAt = doc.verifiedAt;
          if (status === 'Rejected') mirror.rejectionReason = doc.rejectionReason;
          await customer.save();
        }
      }
    }

    // Notify the member when a doc is approved or rejected so they don't
    // need to refresh to find out.
    try {
      const { createTransactionNotification } = require('../utils/notificationHelper');
      if (status === 'Verified' || status === 'Rejected') {
        await createTransactionNotification({
          recipientId: member._id,
          title: status === 'Verified' ? 'Document approved' : 'Document rejected',
          message:
            status === 'Verified'
              ? `Your ${doc.type} document has been approved.`
              : `Your ${doc.type} was rejected${doc.rejectionReason ? `: ${doc.rejectionReason}` : '.'}`,
          type: status === 'Verified' ? 'success' : 'warning',
          branchId: member.branchId,
          action: 'document_status_change',
          metadata: { docId, type: doc.type, status, link: '/member/dashboard' },
        });
      }
    } catch (notifyErr) {
      console.warn('[Documents] Notification failed:', notifyErr.message);
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_status_updated',
      category: 'member',
      details: `Document "${doc.name}" set to ${status} for member: ${member.name}`,
      metadata: { memberId: member._id, docId, status },
      req,
    });

    return res.json({ document: doc });
  } catch (error) {
    console.error('Update Member Doc Status Error:', error);
    res.status(500).json({ message: 'Failed to update document status' });
  }
};

const deleteMemberDocument = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id, docId } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const doc = member.documents.id(docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try {
      if (doc.url) await deleteCloudinaryFileByUrl(doc.url, 'file');
    } catch (cleanupErr) {
      console.warn('[Documents] Cloudinary cleanup failed:', cleanupErr.message);
    }

    member.documents = member.documents.filter(
      (d) => d._id.toString() !== docId,
    );
    await member.save();

    if (member.customer) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(member.customer);
      if (customer) {
        customer.documents = customer.documents.filter(
          (d) => d._id.toString() !== docId,
        );
        await customer.save();
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_document_deleted',
      category: 'member',
      details: `Deleted document "${doc.name}" for member: ${member.name}`,
      metadata: { memberId: member._id, docId, type: doc.type },
      req,
    });

    return res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete Member Doc Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// ── Audit Log (Per-Member Activity Timeline) ────────────────────────────────
// Returns the ActivityLog records that explicitly reference this member via
// `metadata.memberId`. Different controllers stamp memberId as either a raw
// ObjectId or a stringified one (see e.g. termDepositController.js:539),
// so we match both forms.
const getMemberAuditLog = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const member = await Member.findOne({ _id: id, user: userId }).select('_id');
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const skip = (page - 1) * limit;

    let memberOid;
    try {
      memberOid = new mongoose.Types.ObjectId(id);
    } catch {
      memberOid = null;
    }

    const ActivityLog = require('../models/ActivityLog');
    const query = {
      $or: [
        { 'metadata.memberId': id },
        ...(memberOid ? [{ 'metadata.memberId': memberOid }] : []),
      ],
    };

    // Staff are confined to their own branch — actions on this member from
    // outside that branch shouldn't appear in their view.
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) query.branchId = scope;
    }

    const [total, logs] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.find(query)
        .populate('user', 'name email role profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Member Audit Log Error:', error);
    res.status(500).json({ message: 'Failed to load audit log' });
  }
};

// ── Account Statement (Current / Saving) ────────────────────────────────────
// Returns opening balance, period transactions with running balance, and
// closing balance for a single account (current or saving). Period defaults
// to the previous calendar month if from/to are omitted — matching the
// "monthly statement" mental model.
//
// Works for both staff/admin (uses req.params.id + req.user.effectiveOwnerId)
// and the member portal (no :id param — uses req.member).
const getAccountStatement = async (req, res) => {
  try {
    const isPortal = !!req.member;
    const memberId = isPortal ? req.member._id : req.params.id;
    const ownerId = isPortal ? req.member.user : req.user.effectiveOwnerId;

    const accountType = (req.query.accountType || 'current').toLowerCase();
    if (!['current', 'saving'].includes(accountType)) {
      return res.status(400).json({ message: 'Invalid accountType' });
    }

    // Default period = previous calendar month
    let fromDate;
    let toDate;
    if (req.query.from && req.query.to) {
      fromDate = new Date(req.query.from);
      toDate = new Date(req.query.to);
      // Make `to` inclusive — push to end of day if a bare date was sent
      if (req.query.to.length === 10) toDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: 'Invalid from/to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ message: '`from` must be before `to`' });
    }

    const member = await Member.findOne({ _id: memberId, user: ownerId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Sign convention for each Investment type
    const signFor = (t) =>
      t === 'deposit' ||
      t === 'transfer_receive' ||
      t === 'profit' ||
      t === 'loan_disbursement'
        ? 1
        : -1;

    const baseQuery = {
      member: member._id,
      user: ownerId,
      accountType,
      status: { $ne: 'Reversed' },
    };

    const [priorTxns, periodTxns] = await Promise.all([
      Investment.find({ ...baseQuery, date: { $lt: fromDate } })
        .select('type amount date')
        .lean(),
      Investment.find({ ...baseQuery, date: { $gte: fromDate, $lte: toDate } })
        .sort({ date: 1, createdAt: 1 })
        .lean(),
    ]);

    const opening = priorTxns.reduce(
      (sum, t) => sum + signFor(t.type) * t.amount,
      0,
    );

    let running = opening;
    let totalCredits = 0;
    let totalDebits = 0;
    const transactions = periodTxns.map((t) => {
      const direction = signFor(t.type);
      const signed = direction * t.amount;
      running += signed;
      if (direction > 0) totalCredits += t.amount;
      else totalDebits += t.amount;
      return {
        _id: t._id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        direction: direction > 0 ? 'credit' : 'debit',
        description: t.description || '',
        balanceAfter: running,
      };
    });

    const accountNumber =
      accountType === 'current'
        ? member.currentAccountNumber
        : member.savingAccountNumber;
    const currentBalance =
      accountType === 'current' ? member.currentBalance : member.savingBalance;

    return res.json({
      account: {
        type: accountType,
        number: accountNumber || null,
        holderName: member.name,
        memberId: member._id,
        currentBalance,
      },
      period: { from: fromDate, to: toDate },
      opening,
      closing: running,
      totals: {
        credits: totalCredits,
        debits: totalDebits,
        net: totalCredits - totalDebits,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (error) {
    console.error('Account Statement Error:', error);
    res.status(500).json({ message: 'Failed to generate account statement' });
  }
};

// Get member's investment history
const getMemberInvestments = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = req.query;
    const query = {
      member: id,
      user: userId,
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [investments, total] = await Promise.all([
      Investment.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Investment.countDocuments(query),
    ]);

    res.json({
      investments,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Investments Error:', error);
    res.status(500).json({ message: 'Failed to fetch investments' });
  }
};

// Add investment (deposit)
const addInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const {
      amount,
      description,
      notes: userNotes,
      applyDeduction = true,
      repaymentType = 'settlement',
      accountType = 'current', // 'current' or 'saving'
      paymentMethod = 'cash', // 'cash' or 'online'
    } = req.body;

    const isSaving = accountType === 'saving';
    const systemDescription = isSaving ? 'Saving account deposit' : 'Investment deposit';

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid investment amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const balanceBefore = isSaving ? member.savingBalance : member.currentBalance;
    const investedBefore = isSaving ? member.totalSavingDeposited : member.totalInvested;

    // Update member balances atomically
    const incFields = isSaving
      ? { totalSavingDeposited: amount, savingBalance: amount }
      : { totalInvested: amount, currentBalance: amount };

    // Wrap the balance mutation + both ledger writes in one transaction so a crash
    // can never leave the member balance changed without a matching Investment /
    // FinancialTransaction (ledger drift). Previously these were three unguarded
    // sequential writes.
    const depositSession = await mongoose.startSession();
    let updatedMember;
    let investment;
    let balanceAfter;
    try {
      depositSession.startTransaction();

      updatedMember = await Member.findOneAndUpdate(
        { _id: id, user: userId },
        { $inc: incFields },
        { new: true, session: depositSession },
      );

      if (!updatedMember) {
        throw new Error('Member not found');
      }

      balanceAfter = isSaving
        ? updatedMember.savingBalance
        : updatedMember.currentBalance;

      const [createdInvestment] = await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'deposit',
            amount,
            accountType,
            description: description || systemDescription,
            balanceAfter,
          },
        ],
        { session: depositSession },
      );
      investment = createdInvestment;

      const financialTx = new FinancialTransaction({
        user: userId,
        branchId: member.branchId,
        type: 'credit',
        category: isSaving ? 'saving_deposit' : 'investment',
        amount,
        date: new Date(),
        description: description || systemDescription,
        notes: userNotes || undefined,
        paymentMethod,
        member: member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
      });
      await financialTx.save({ session: depositSession });

      await depositSession.commitTransaction();
    } catch (depositErr) {
      await depositSession.abortTransaction();
      depositSession.endSession();
      return res
        .status(depositErr.message === 'Member not found' ? 404 : 500)
        .json({ message: depositErr.message || 'Failed to add deposit' });
    }
    depositSession.endSession();

    // Log activity with before/after state
    await logActivity({
      userId: req.user._id,
      action: isSaving ? 'member_saving_deposit' : 'member_investment_added',
      category: 'member',
      details: `Added ${isSaving ? 'saving' : 'investment'} deposit of ${amount} for member: ${member.name}`,
      metadata: {
        memberId: id,
        amount,
        accountType,
        investmentId: investment._id,
        before: { balance: balanceBefore, totalDeposited: investedBefore },
        after: { balance: balanceAfter, totalDeposited: isSaving ? updatedMember.totalSavingDeposited : updatedMember.totalInvested },
      },
      req,
    });

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      const accountLabel = isSaving ? 'Saving Account' : 'Current Account';
      await createTransactionNotification({
        recipientId: member._id,
        title: `${accountLabel} Deposit`,
        message: `Your ${accountLabel.toLowerCase()} has been credited with Rs. ${amount.toLocaleString()} (${description || 'Manual Deposit'}).`,
        type: 'success',
        branchId: member.branchId,
        action: 'member_deposit_notification',
        metadata: {
          amount,
          accountType,
          investmentId: investment._id,
          link: '/member/investments',
        },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: `${accountLabel} Deposit Confirmation`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: `${accountLabel} Deposit`,
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: balanceAfter.toLocaleString(),
            branchName: branchName,
            reference: investment._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Deposit Notification Error:', notifError);
    }

    // ── Automatic Loan Deduction (only for current account) ────────────────
    if (!isSaving) {
      try {
        // Tenant scope (`user: userId`) is defensive — `customer` is already
        // tied to this business via the member fetch above, but keying the
        // lookup on user too closes any cross-tenant edge case.
        // Deterministic order (oldest first) so multiple active loans behave
        // predictably and the oldest debt gets paid first.
        const activeLoan = await Loan.findOne({
          customer: member.customer,
          user: userId,
          status: 'active',
        }).sort({ createdAt: 1 });

        if (activeLoan && applyDeduction) {
          let deductionAmount = Math.min(amount, activeLoan.remainingAmount);

          // If monthly installment, cap deduction at 1 EMI
          if (repaymentType === 'installment') {
            deductionAmount = Math.min(deductionAmount, activeLoan.emi);
          }

          if (deductionAmount > 0) {
            await loanRepaymentService.processRepayment(
              activeLoan,
              deductionAmount,
              req,
              {
                notes: `Auto-deduction from deposit: ${description || 'Manual Deposit'}`,
                isAutoValue: true,
                allowEarlySettlement: repaymentType === 'settlement',
              },
            );
            // Refetch member to get updated balance for the response
            const updatedMember = await Member.findById(member._id);
            return res.status(201).json({
              investment,
              member: updatedMember,
              autoRepayment: {
                applied: true,
                amount: deductionAmount,
                loanId: activeLoan._id,
              },
            });
          }
        }
      } catch (autoRepoError) {
        console.error('Auto Repayment Error in addInvestment:', autoRepoError);
        // Non-fatal, return the deposit success
      }

      // Update member's credit limit
      await updateMemberCreditLimit(id);
    }

    res.status(201).json({ investment, member: updatedMember });
  } catch (error) {
    console.error('Add Investment Error:', error);
    res.status(500).json({ message: 'Failed to add investment' });
  }
};


// Withdraw investment
const withdrawInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description, notes: userNotes, accountType = 'current', paymentMethod = 'cash', checkbookId, checkNo, bearer } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // ── Checkbook validation ──────────────────────────────────────────────
    let checkbookDoc = null;
    if (checkbookId) {
      checkbookDoc = await Checkbook.findOne({
        _id: checkbookId,
        member: id,
        user: userId,
        status: 'active',
      });
      if (!checkbookDoc) {
        return res.status(400).json({ message: 'Invalid or inactive checkbook' });
      }
      if (checkbookDoc.usedLeaves >= checkbookDoc.numberOfLeaves) {
        return res.status(400).json({ message: 'All checkbook leaves have been used. Please issue a new checkbook.' });
      }
    }

    // ── Check Bearer KYC ──────────────────────────────────────────────────
    // When the check is being cashed by someone other than the account holder
    // (bearer.type === 'other') we require their name + CNIC so the audit
    // trail can identify who physically received the funds.
    let bearerInfo = null;
    if (checkbookDoc && bearer && typeof bearer === 'object') {
      if (bearer.type === 'other') {
        const name = (bearer.name || '').trim();
        const cnic = (bearer.cnic || '').trim();
        if (!name || !cnic) {
          return res.status(400).json({
            message:
              'When a check is cashed by someone other than the account holder, both name and CNIC are required for the bearer.',
          });
        }
        bearerInfo = {
          type: 'other',
          name,
          cnic,
          phone: (bearer.phone || '').trim() || undefined,
        };
      } else {
        bearerInfo = { type: 'self' };
      }
    }

    const isSaving = accountType === 'saving';
    const systemDescription = isSaving ? 'Saving account withdrawal' : 'Investment withdrawal';
    const checkbookLabel = checkbookDoc
      ? ` (Checkbook: ${checkbookDoc.checkbookNumber}${checkNo ? ', Check #' + checkNo : ''}${
          bearerInfo?.type === 'other'
            ? `, Bearer: ${bearerInfo.name} — CNIC ${bearerInfo.cnic}`
            : ''
        })`
      : '';
    const availableBalance = isSaving ? member.savingBalance : member.currentBalance;

    if (availableBalance < amount) {
      return res
        .status(400)
        .json({ message: `Insufficient ${isSaving ? 'saving' : 'current'} account balance for withdrawal` });
    }

    const balanceBefore = availableBalance;
    const withdrawnBefore = isSaving ? member.totalSavingWithdrawn : member.totalWithdrawn;

    // Update member balances atomically — the `$gte` predicate closes the
    // TOCTOU window: if two parallel requests both pass the read above, only
    // the first one whose decrement keeps balance non-negative succeeds.
    const incFields = isSaving
      ? { savingBalance: -amount, totalSavingWithdrawn: amount }
      : { currentBalance: -amount, totalWithdrawn: amount };

    const balanceField = isSaving ? 'savingBalance' : 'currentBalance';

    // Wrap the balance decrement + ledger writes + checkbook leaf increment in one
    // transaction so a crash can never leave the balance reduced without a matching
    // withdrawal record (or a consumed check leaf without a debit). The `$gte`
    // predicate still closes the concurrent-overdraft TOCTOU window.
    const withdrawSession = await mongoose.startSession();
    let updatedMember;
    let investment;
    let balanceAfter;
    try {
      withdrawSession.startTransaction();

      updatedMember = await Member.findOneAndUpdate(
        { _id: id, user: userId, [balanceField]: { $gte: amount } },
        { $inc: incFields },
        { new: true, session: withdrawSession },
      );

      if (!updatedMember) {
        // Either the member is gone or another concurrent request consumed the
        // funds — surface as insufficient balance to the caller.
        throw new Error('INSUFFICIENT_BALANCE');
      }

      balanceAfter = isSaving
        ? updatedMember.savingBalance
        : updatedMember.currentBalance;

      const [createdInvestment] = await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'withdrawal',
            amount,
            accountType,
            description: (description || systemDescription) + checkbookLabel,
            balanceAfter,
            metadata: checkbookDoc
              ? {
                  checkbookId: checkbookDoc._id,
                  checkbookNumber: checkbookDoc.checkbookNumber,
                  checkNo: checkNo || undefined,
                  ...(bearerInfo ? { bearer: bearerInfo } : {}),
                }
              : {},
          },
        ],
        { session: withdrawSession },
      );
      investment = createdInvestment;

      // ── Increment checkbook used leaves ───────────────────────────────────
      if (checkbookDoc) {
        checkbookDoc.usedLeaves += 1;
        if (checkbookDoc.usedLeaves >= checkbookDoc.numberOfLeaves) {
          checkbookDoc.status = 'used';
        }
        await checkbookDoc.save({ session: withdrawSession });
      }

      // Create Financial Transaction
      const financialTx = new FinancialTransaction({
        user: userId,
        branchId: member.branchId,
        type: 'debit',
        category: isSaving ? 'saving_withdrawal' : 'withdrawal',
        amount,
        date: new Date(),
        description: (description || systemDescription) + checkbookLabel,
        notes: userNotes || undefined,
        paymentMethod,
        member: member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
        checkbookId: checkbookDoc?._id || undefined,
      });
      await financialTx.save({ session: withdrawSession });

      await withdrawSession.commitTransaction();
    } catch (withdrawErr) {
      await withdrawSession.abortTransaction();
      withdrawSession.endSession();
      if (withdrawErr.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          message: `Insufficient ${isSaving ? 'saving' : 'current'} account balance for withdrawal`,
        });
      }
      return res
        .status(500)
        .json({ message: withdrawErr.message || 'Failed to process withdrawal' });
    }
    withdrawSession.endSession();

    // Log activity with before/after state
    await logActivity({
      userId: req.user._id,
      action: isSaving ? 'member_saving_withdrawal' : 'member_withdrawal_added',
      category: 'member',
      details: `Processed ${isSaving ? 'saving' : ''} withdrawal of ${amount} for member: ${member.name}`,
      metadata: {
        memberId: id,
        amount,
        accountType,
        investmentId: investment._id,
        before: { balance: balanceBefore, totalWithdrawn: withdrawnBefore },
        after: { balance: balanceAfter, totalWithdrawn: isSaving ? updatedMember.totalSavingWithdrawn : updatedMember.totalWithdrawn },
        ...(bearerInfo ? { bearer: bearerInfo } : {}),
      },
      req,
    });

    // Update member's credit limit (only for current account)
    if (!isSaving) {
      await updateMemberCreditLimit(id);
    }

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      const accountLabel = isSaving ? 'Saving Account' : 'Current Account';
      await createTransactionNotification({
        recipientId: member._id,
        title: `${accountLabel} Withdrawal`,
        message: `A withdrawal of Rs. ${amount.toLocaleString()} has been processed from your ${accountLabel.toLowerCase()} (${description || 'Manual Withdrawal'}).`,
        type: 'info',
        branchId: member.branchId,
        action: 'member_withdrawal_notification',
        metadata: {
          amount,
          accountType,
          investmentId: investment._id,
          link: '/member/investments',
        },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: `${accountLabel} Withdrawal Confirmation`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: `${accountLabel} Withdrawal`,
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: balanceAfter.toLocaleString(),
            branchName: branchName,
            reference: investment._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Withdrawal Notification Error:', notifError);
    }

    res.status(201).json({ investment, member: updatedMember });
  } catch (error) {
    console.error('Withdraw Investment Error:', error);
    res.status(500).json({ message: 'Failed to withdraw investment' });
  }
};

// Get member's profit history
const getMemberProfits = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const profits = await ProfitDistribution.find({
      member: id,
      user: userId,
    }).sort({ date: -1 });

    res.json(profits);
  } catch (error) {
    console.error('Get Profits Error:', error);
    res.status(500).json({ message: 'Failed to fetch profits' });
  }
};

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

// Distribute profit to all members
const distributeProfit = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      totalProfit,
      period,
      description,
      useCustomRates,
      startDate,
      endDate,
    } = req.body;

    if (!totalProfit || totalProfit <= 0) {
      return res.status(400).json({ message: 'Invalid profit amount' });
    }

    // Default dates to current month if not provided
    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all active members
    const members = await Member.find({ user: userId, status: 'Active' });
    if (members.length === 0) {
      return res.status(400).json({ message: 'No active members found' });
    }

    const distributions = [];

    // Option 1: Use custom profit rates (if specified)
    if (useCustomRates) {
      for (const member of members) {
        // Use Weighted Average Balance for calculation
        const weightedBalance = await calculateWeightedAverageBalance(
          member._id,
          periodStart,
          periodEnd,
          'regular',
        );

        if (weightedBalance > 0 && member.profitRate > 0) {
          const profitAmount = Math.round(
            (weightedBalance * member.profitRate) / 100,
          );

          if (profitAmount <= 0) continue;

          // Credit the member's wallet, book the distribution record AND its
          // ledger row as ONE atomic unit. These are three documents; without a
          // transaction a crash between them leaves a member credited with no
          // distribution/ledger row (or a distribution with no credit) — the
          // missing-income / orphan-row drift the backfill scripts exist to repair.
          let distribution;
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              // Update member profit atomically
              await Member.findByIdAndUpdate(
                member._id,
                {
                  $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
                },
                { session },
              );

              // Create profit distribution record
              [distribution] = await ProfitDistribution.create(
                [
                  {
                    user: userId,
                    member: member._id,
                    branchId: member.branchId,
                    amount: profitAmount,
                    type: 'regular',
                    period:
                      period ||
                      periodStart.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      }),
                    calculationMethod: `Weighted Avg Balance (Rs. ${roundMoney(weightedBalance).toLocaleString()}) × ${member.profitRate}% Rate`,
                    investmentShare: member.profitRate,
                  },
                ],
                { session },
              );

              // Create Financial Transaction
              await FinancialTransaction.create(
                [
                  {
                    user: userId,
                    branchId: member.branchId,
                    type: 'expense',
                    category: 'profit_distribution',
                    amount: profitAmount,
                    date: new Date(),
                    description: `Profit distribution for ${period || 'current period'} (Weighted Avg)`,
                    member: member._id,
                    referenceId: distribution._id,
                    referenceModel: 'ProfitDistribution',
                    paymentMethod: 'online',
                  },
                ],
                { session },
              );
            });
          } finally {
            await session.endSession();
          }

          // Notify member
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: 'Profit Credited',
              message: `Profit of Rs. ${profitAmount.toLocaleString()} has been added. Calculated on Weighted Avg Balance of Rs. ${Math.round(weightedBalance).toLocaleString()} at ${member.profitRate}% rate.`,
              type: 'success',
              branchId: member.branchId,
              action: 'member_profit_notification',
              metadata: {
                amount: profitAmount,
                distributionId: distribution._id,
                link: '/member/investments',
              },
            });

            // Send Email Notification (non-blocking)
            const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
            sendEmailAsync({
              to: member.email,
              subject: `Profit Credited - ${branchName}`,
              html: transactionEmail({
                memberName: member.name,
                transactionType: 'Profit Distribution',
                amount: profitAmount.toLocaleString(),
                date: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                balance: (
                  await calculateEffectiveBalance(member._id)
                ).toLocaleString(),
                reference: distribution._id.toString().slice(-8).toUpperCase(),
                branchName: branchName,
                logoUrl: logoUrl,
              }),
            });
          } catch (notifError) {
            console.error('Profit Notification Error:', notifError);
          }

          distributions.push(distribution);
        }
      }
    } else {
      // Option 2: Proportional distribution based on Weighted Average Investment share
      const memberBalances = await Promise.all(
        members.map(async (m) => ({
          member: m,
          weightedBalance: await calculateWeightedAverageBalance(
            m._id,
            periodStart,
            periodEnd,
            'regular',
          ),
        })),
      );

      const totalWeightedPool = memberBalances.reduce(
        (sum, item) => sum + item.weightedBalance,
        0,
      );

      if (totalWeightedPool === 0) {
        return res
          .status(400)
          .json({ message: 'No weighted average balance found in period' });
      }

      // Largest-remainder allocation: the sum of credited amounts must equal the
      // declared pool EXACTLY. Rounding each member's share independently lost or
      // created rupees (e.g. 100 split 3 ways → 33+33+33 = 99) and silently broke
      // the "sum of payouts == pool" invariant. Floor everyone, then hand the
      // leftover rupees to the largest fractional remainders, one each.
      const profitAllocations = (() => {
        const eligible = memberBalances.filter((i) => i.weightedBalance > 0);
        const rows = eligible.map((i) => {
          const exact = (i.weightedBalance / totalWeightedPool) * totalProfit;
          const floorAmt = Math.floor(exact);
          return { id: String(i.member._id), amount: floorAmt, frac: exact - floorAmt };
        });
        let leftover = Math.round(
          totalProfit - rows.reduce((s, r) => s + r.amount, 0),
        );
        rows
          .slice()
          .sort((a, b) => b.frac - a.frac)
          .forEach((r) => {
            if (leftover > 0) {
              r.amount += 1;
              leftover -= 1;
            }
          });
        return new Map(rows.map((r) => [r.id, r.amount]));
      })();

      for (const item of memberBalances) {
        const { member, weightedBalance } = item;
        if (weightedBalance > 0) {
          const share = (weightedBalance / totalWeightedPool) * 100;
          const profitAmount = profitAllocations.get(String(member._id)) || 0;

          if (profitAmount <= 0) continue;

          // Credit the member's wallet, book the distribution record AND its
          // ledger row as ONE atomic unit (see the custom-rate branch above for
          // why) so a mid-loop crash can't half-apply a member's profit.
          let distribution;
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              // Update member profit atomically
              await Member.findByIdAndUpdate(
                member._id,
                {
                  $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
                },
                { session },
              );

              // Create profit distribution record
              [distribution] = await ProfitDistribution.create(
                [
                  {
                    user: userId,
                    member: member._id,
                    branchId: member.branchId,
                    amount: profitAmount,
                    type: 'regular',
                    period:
                      period ||
                      periodStart.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      }),
                    calculationMethod:
                      description ||
                      `Weighted Avg Balance: Rs. ${roundMoney(weightedBalance).toLocaleString()} (${share.toFixed(2)}% share of pool)`,
                    investmentShare: share,
                  },
                ],
                { session },
              );

              // Create Financial Transaction
              await FinancialTransaction.create(
                [
                  {
                    user: userId,
                    branchId: member.branchId,
                    type: 'expense',
                    category: 'profit_distribution',
                    amount: profitAmount,
                    date: new Date(),
                    description: `Profit distribution for ${period || 'current period'} (Weighted Avg)`,
                    member: member._id,
                    referenceId: distribution._id,
                    referenceModel: 'ProfitDistribution',
                    paymentMethod: 'online',
                  },
                ],
                { session },
              );
            });
          } finally {
            await session.endSession();
          }

          // Notify member
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: 'Profit Credited',
              message: `Profit of Rs. ${profitAmount.toLocaleString()} has been added (Share: ${share.toFixed(2)}%). Calculated on Weighted Avg Balance of Rs. ${Math.round(weightedBalance).toLocaleString()}.`,
              type: 'success',
              branchId: member.branchId,
              action: 'member_profit_notification',
              metadata: {
                amount: profitAmount,
                distributionId: distribution._id,
                link: '/member/investments',
              },
            });

            // Send Email Notification (non-blocking)
            const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
            sendEmailAsync({
              to: member.email,
              subject: `Profit Credited - ${branchName}`,
              html: transactionEmail({
                memberName: member.name,
                transactionType: 'Profit Distribution',
                amount: profitAmount.toLocaleString(),
                date: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                balance: (
                  await calculateEffectiveBalance(member._id)
                ).toLocaleString(),
                reference: distribution._id.toString().slice(-8).toUpperCase(),
                branchName: branchName,
                logoUrl: logoUrl,
              }),
            });
          } catch (notifError) {
            console.error('Profit Notification Error:', notifError);
          }

          distributions.push(distribution);
        }
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'profit_distributed',
      category: 'member',
      details: `Distributed total profit of ${totalProfit} to ${distributions.length} members for period: ${period}`,
      metadata: {
        totalProfit,
        period,
        membersCount: distributions.length,
      },
      req,
    });

    res.status(201).json({
      message: 'Profit distributed successfully',
      distributions,
      totalDistributed: Math.round(
        distributions.reduce((sum, d) => sum + d.amount, 0),
      ),
      membersCount: distributions.length,
    });
  } catch (error) {
    console.error('Distribute Profit Error:', error);
    res.status(500).json({ message: 'Failed to distribute profit' });
  }
};

/**
 * @desc    Initiate a Raast P2M Deposit via Bank API
 * @route   POST /api/members/portal/raast-deposit
 * @access  Private (Member)
 */
const initiateRaastDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const memberId = req.member._id;
    const userId = req.member.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    // 1. Create a "Pending" Investment record that the Webhook will finalize
    const pendingInvestment = await Investment.create({
      user: userId,
      member: memberId,
      branchId: req.member.branchId,
      type: 'deposit',
      amount,
      description: 'Wallet deposit via Raast',
      balanceAfter: req.member.currentBalance,
      status: 'Pending',
      metadata: {
        method: 'Raast P2M',
        raastStatus: 'PENDING',
      },
    });

    // 2. Generate the Raast QR / Intent via Service
    const raastResponse = await raastService.generateDynamicQR(
      amount,
      pendingInvestment._id.toString(),
    );

    res.status(200).json({
      success: true,
      data: raastResponse, // Contains qrCode or intentUrl
      investmentId: pendingInvestment._id,
    });
  } catch (error) {
    console.error('Initiate Raast Deposit Error:', error);
    res.status(500).json({ message: 'Failed to initiate Raast deposit' });
  }
};

// @desc    Get all activity for a member (Investments, Profits, Repayments, Goals)
// @route   GET /api/members/portal/activity
// @access  Private (Member)
const getMemberActivity = async (req, res) => {
  try {
    const memberId = req.member._id;
    const customerId = req.member.customer;

    // Build query objects
    const investmentQuery = { member: memberId };
    const profitQuery = { member: memberId };
    const repaymentQuery = { customer: customerId };
    const goalLogQuery = { user: memberId, action: 'goal_contribution' };

    const { category, search, startDate, endDate } = req.query;

    if (startDate && endDate) {
      const dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
      investmentQuery.date = dateRange;
      profitQuery.date = dateRange;
      repaymentQuery.date = dateRange;
      goalLogQuery.createdAt = dateRange;
    }

    if (search) {
      const searchRegex = { $regex: escapeRegExp(String(search)), $options: 'i' };
      investmentQuery.description = searchRegex;
      // Note: Profit distributions might not have descriptions in the model,
      // but we'll apply it to the period if applicable or just filter after combining.
      repaymentQuery.notes = searchRegex;
    }

    const [investments, profits, repayments, goalLogs] = await Promise.all([
      Investment.find(investmentQuery).sort({ date: -1 }),
      ProfitDistribution.find(profitQuery).sort({ date: -1 }),
      Repayment.find(repaymentQuery).sort({ date: -1 }),
      ActivityLog.find(goalLogQuery).sort({ createdAt: -1 }),
    ]);

    // Format and combine
    const formattedInvestments = investments.map((i) => {
      const isRepayment =
        i.metadata?.isRepayment ||
        (i.description && i.description.includes('Loan repayment'));
      return {
        _id: i._id,
        type: i.type,
        category: isRepayment ? 'repayment' : 'investment',
        amount: i.amount,
        date: i.date,
        description:
          i.description ||
          (i.type === 'deposit'
            ? 'Investment Deposit'
            : i.type === 'withdrawal'
              ? 'Investment Withdrawal'
              : i.type === 'transfer_send'
                ? 'P2P Fund Transfer (Sent)'
                : 'P2P Fund Transfer (Received)'),
        status: i.status || 'Completed',
        metadata: { ...i.metadata, balanceAfter: i.balanceAfter },
      };
    });

    const formattedProfits = profits.map((p) => ({
      _id: p._id,
      type: 'deposit',
      category: 'profit',
      amount: p.amount,
      date: p.date,
      description: `Profit Distribution - ${p.period}`,
      metadata: { share: p.investmentShare },
    }));

    // Filter out repayments that are already represented as Investment withdrawals
    // (Member-initiated repayments from wallet)
    const walletRepaymentLoanIds = new Set(
      formattedInvestments
        .filter((i) => i.category === 'repayment')
        .map((i) => i.description.split('#').pop()?.substring(0, 6)), // A bit brittle, but accurate enough for descriptions
    );

    const formattedRepayments = repayments
      .filter((r) => {
        // Exclude repayments that are already represented as Investment records
        const loanShortId = r.loan.toString().slice(-6).toUpperCase();
        if (walletRepaymentLoanIds.has(loanShortId)) {
          return false;
        }

        // Fallback checks for notes if something didn't match exactly
        const isWalletRepayment =
          r.notes &&
          (r.notes.includes('FinFlo') ||
            r.notes.includes('Self-repayment') ||
            r.notes.includes('Automatic deduction'));
        return !isWalletRepayment;
      })
      .map((r) => ({
        _id: r._id,
        type: 'withdrawal',
        category: 'repayment',
        amount: r.amount,
        date: r.date,
        description: r.notes || 'Loan Repayment',
        metadata: { loanId: r.loan },
      }));

    const formattedGoalLogs = goalLogs.map((gl) => ({
      _id: gl._id,
      type: 'withdrawal',
      category: 'goal',
      amount: gl.metadata?.amount || 0,
      date: gl.createdAt,
      description: `Goal Allocation: ${gl.metadata?.title || 'Saving Goal'}`,
      metadata: { goalId: gl.metadata?.goalId },
    }));

    let activity = [
      ...formattedInvestments,
      ...formattedProfits,
      ...formattedRepayments,
      ...formattedGoalLogs,
    ];

    // Filter by search if model query didn't catch everything (like profit distribution descriptions)
    if (search) {
      const searchLower = search.toLowerCase();
      activity = activity.filter((a) =>
        a.description.toLowerCase().includes(searchLower),
      );
    }

    // Filter by category
    if (category) {
      activity = activity.filter((a) => a.category === category);
    }

    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary (on full filtered activity)
    const summary = activity.reduce(
      (acc, item) => {
        if (
          item.type === 'deposit' ||
          item.type === 'transfer_receive' ||
          item.type === 'external_receive'
        ) {
          acc.totalDeposits += item.amount;
        } else if (
          item.type === 'withdrawal' ||
          item.type === 'transfer_send'
        ) {
          acc.totalWithdrawals += item.amount;
        }
        return acc;
      },
      { totalDeposits: 0, totalWithdrawals: 0 },
    );

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalEntries = activity.length;

    const paginatedActivity = activity.slice(skip, skip + limit);

    res.json({
      data: paginatedActivity,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      summary,
    });
  } catch (error) {
    console.error('Get Member Activity Error:', error);
    res.status(500).json({ message: 'Failed to fetch activity records' });
  }
};

/**
 * @desc    Transfer funds to another member
 * @route   POST /api/members/portal/transfer
 * @access  Private (Member)
 */
const transferFunds = async (req, res) => {
  const { recipientId, recipientIdentifier, amount, description, accountType = 'current' } = req.body;
  const senderId = req.member._id;

  if (
    (!recipientId && !recipientIdentifier) ||
    !amount ||
    parseFloat(amount) <= 0
  ) {
    return res.status(400).json({ message: 'Invalid recipient or amount' });
  }

  // Per-tier limit check before we start a session — if rejected, surfaces a
  // clear 403 to the client and nothing in the ledger is touched.
  try {
    const { assertWithinLimits } = require('../services/transferLimits');
    await assertWithinLimits({
      memberId: senderId,
      channel: 'internal_transfer',
      amount: parseFloat(amount),
    });
  } catch (limitErr) {
    if (limitErr.code === 'LIMIT_EXCEEDED') {
      return res
        .status(limitErr.status || 403)
        .json({ message: limitErr.message, code: limitErr.code, details: limitErr.details });
    }
    throw limitErr;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await Member.findById(senderId).session(session);
    if (!sender) throw new Error('Sender not found');
    const tenantOwnerId = sender.user;
    const availableBalance = accountType === 'current' ? sender.currentBalance : sender.savingBalance;
    if (availableBalance < parseFloat(amount)) {
      throw new Error(`Insufficient ${accountType} balance`);
    }

    // Find recipient by ID, email, phone, or account numbers — scoped to the
    // sender's business so a member of tenant A cannot send funds to a member
    // of tenant B (cross-tenant IDOR).
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let recipient;
    if (recipientId) {
      recipient = await Member.findOne({
        _id: recipientId,
        user: tenantOwnerId,
      }).session(session);
    } else {
      const identifier = String(recipientIdentifier || '');
      const exact = escapeRegex(identifier);
      recipient = await Member.findOne({
        user: tenantOwnerId,
        $or: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
          { savingAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
          { currentAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
        ],
      }).session(session);
    }

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to yourself');
    }

    const transferAmount = Math.round(parseFloat(amount));

    // Update balances atomically inside session, guarded by a $gte predicate
    // that prevents concurrent overdrafts.
    const senderField = accountType === 'current' ? 'currentBalance' : 'savingBalance';
    const senderInc = accountType === 'current'
      ? { currentBalance: -transferAmount, totalWithdrawn: transferAmount }
      : { savingBalance: -transferAmount, totalSavingWithdrawn: transferAmount };

    const senderRes = await Member.updateOne(
      { _id: sender._id, [senderField]: { $gte: transferAmount } },
      { $inc: senderInc },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error(`Insufficient ${accountType} balance`);
    }
    // Credit the recipient into the SAME account type the sender debited. Crediting
    // a saving-account debit into the recipient's CURRENT balance silently moved
    // funds across account types and distorted the saving-profit accrual base.
    const recipientInc = accountType === 'current'
      ? { currentBalance: transferAmount, totalInvested: transferAmount }
      : { savingBalance: transferAmount, totalSavingDeposited: transferAmount };
    await Member.updateOne(
      { _id: recipient._id },
      { $inc: recipientInc },
      { session },
    );

    // Refresh objects for subsequent logic if needed (e.g., balanceAfter)
    const updatedSender = await Member.findById(senderId).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      accountType,
      balanceAfter: accountType === 'current' ? updatedSender.currentBalance : updatedSender.savingBalance,
      description: description || `Transfer to ${recipient.name}`,
      date: new Date(),
      metadata: {
        transferType: 'internal',
        senderId: sender._id,
        senderName: sender.name,
        recipientId: recipient._id,
        recipientName: recipient.name,
      },
    });

    const recipientTransaction = new Investment({
      user: recipient.user,
      member: recipient._id,
      branchId: recipient.branchId,
      type: 'transfer_receive',
      amount: transferAmount,
      accountType,
      balanceAfter: accountType === 'current' ? updatedRecipient.currentBalance : updatedRecipient.savingBalance,
      description: description || `Transfer from ${sender.name}`,
      date: new Date(),
      metadata: {
        transferType: 'internal',
        senderId: sender._id,
        senderName: sender.name,
        recipientId: recipient._id,
        recipientName: recipient.name,
      },
    });

    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });

    // Internal Activity Log for Sender
    await ActivityLog.create(
      [
        {
          user: sender.user,
          action: 'fund_transfer_sent',
          category: 'member',
          details: `Sent ${transferAmount} to ${recipient.name}`,
          metadata: { recipientId: recipient._id, amount: transferAmount },
          branchId: sender.branchId,
        },
      ],
      { session },
    );

    // Internal Activity Log for Recipient
    await ActivityLog.create(
      [
        {
          user: recipient.user,
          action: 'fund_transfer_received',
          category: 'member',
          details: `Received ${transferAmount} from ${sender.name}`,
          metadata: { senderId: sender._id, amount: transferAmount },
          branchId: recipient.branchId,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Goal round-up auto-contribute ──────────────────────────────────────
    // Fire after the main transfer commits so a roundup failure can't
    // unwind the user's actual transfer. Best-effort: if the member has no
    // roundup-enabled goal or insufficient slack, this silently no-ops.
    try {
      const { applyRoundupOnDebit } = require('../services/goalAutoContribute');
      await applyRoundupOnDebit({
        memberId: sender._id,
        debitAmount: transferAmount,
      });
    } catch (roundupErr) {
      console.warn('[Transfer] roundup hook failed:', roundupErr.message);
    }

    // ── Notifications (outside transaction for performance) ────────────────
    try {
      // Notify Sender
      await createTransactionNotification({
        recipientId: sender._id,
        title: 'Transfer Sent',
        message: `You sent Rs. ${transferAmount.toLocaleString()} to ${recipient.name}.`,
        type: 'info',
        branchId: sender.branchId,
        action: 'fund_transfer_sent',
        metadata: {
          recipientId: recipient._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });

      // Notify Recipient
      await createTransactionNotification({
        recipientId: recipient._id,
        title: 'Transfer Received',
        message: `You received Rs. ${transferAmount.toLocaleString()} from ${sender.name}.`,
        type: 'success',
        branchId: recipient.branchId,
        action: 'fund_transfer_received',
        metadata: {
          senderId: sender._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });
    } catch (notifError) {
      console.error('P2P Transfer Notification Error:', notifError);
    }

    // Email Notifications
    try {
      const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, sender.branchId);

      // Email to Sender
      if (sender.email) {
        sendEmailAsync({
          to: sender.email,
          subject: 'Transfer Sent Confirmation',
          html: transactionEmail({
            memberName: sender.name,
            transactionType: 'Transfer Sent',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(sender._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: senderTransaction._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
            recipientName: recipient.name,
          }),
        });
      }

      // Email to Recipient
      if (recipient.email) {
        // Reuse business and branch context defined above
        sendEmailAsync({
          to: recipient.email,
          subject: 'Transfer Received Confirmation',
          html: transactionEmail({
            memberName: recipient.name,
            transactionType: 'Transfer Received',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(recipient._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: recipientTransaction._id
              .toString()
              .slice(-8)
              .toUpperCase(),
            logoUrl: logoUrl,
            senderName: sender.name,
          }),
        });
      }
    } catch (emailError) {
      console.error('Transfer Email Notification Error:', emailError);
    }

    res.status(200).json({
      message: 'Transfer successful',
      balance: sender.currentBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Admin/Staff initiation of fund transfer between members
 * @route   POST /api/members/admin/transfer
 * @access  Private (Admin/Staff)
 */
const adminTransferFunds = async (req, res) => {
  const { senderId, recipientIdentifier, amount, description, accountType = 'current' } = req.body;

  if (!senderId || !recipientIdentifier || !amount || parseFloat(amount) <= 0) {
    return res
      .status(400)
      .json({ message: 'Invalid sender, recipient, or amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Scope both sender and recipient to the calling admin's business.
    const tenantOwnerId = req.user.effectiveOwnerId || req.user._id;
    const sender = await Member.findOne({ _id: senderId, user: tenantOwnerId }).session(session);
    if (!sender) {
      throw new Error('Sender member not found');
    }

    const availableBalance = accountType === 'current' ? sender.currentBalance : sender.savingBalance;
    if (availableBalance < parseFloat(amount)) {
      throw new Error(`Insufficient balance in sender ${accountType} account`);
    }

    // Find recipient by email, phone, or account numbers — scoped to the
    // same business as the admin/sender (prevents cross-tenant IDOR).
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const identifier = String(recipientIdentifier || '');
    const exact = escapeRegex(identifier);
    const recipient = await Member.findOne({
      user: tenantOwnerId,
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { savingAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
        { currentAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
      ],
    }).session(session);

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to the same member');
    }

    const transferAmount = Math.round(parseFloat(amount));

    // Atomic + concurrency-safe balance update: $gte predicate prevents
    // two parallel admin transfers both passing the read-then-decrement check.
    const senderField = accountType === 'current' ? 'currentBalance' : 'savingBalance';
    const senderInc = accountType === 'current'
      ? { currentBalance: -transferAmount, totalWithdrawn: transferAmount }
      : { savingBalance: -transferAmount, totalSavingWithdrawn: transferAmount };

    const senderRes = await Member.updateOne(
      { _id: sender._id, [senderField]: { $gte: transferAmount } },
      { $inc: senderInc },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error(`Insufficient balance in sender ${accountType} account`);
    }
    await Member.updateOne(
      { _id: recipient._id },
      {
        $inc: { currentBalance: transferAmount, totalInvested: transferAmount },
      },
      { session },
    );

    // Refresh objects for logs/response
    const updatedSender = await Member.findById(senderId).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      balanceAfter: accountType === 'current' ? updatedSender.currentBalance : updatedSender.savingBalance,
      description: description || `Admin Transfer to ${recipient.name}`,
      date: new Date(),
    });

    const recipientTransaction = new Investment({
      user: recipient.user,
      member: recipient._id,
      branchId: recipient.branchId,
      type: 'transfer_receive',
      amount: transferAmount,
      balanceAfter: recipient.currentBalance,
      description: description || `Admin Transfer from ${sender.name}`,
      date: new Date(),
    });

    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });

    // Internal Activity Log showing Admin/Staff action
    await ActivityLog.create(
      [
        {
          user: req.user.effectiveOwnerId,
          action: 'admin_fund_transfer_initiated',
          category: 'member',
          details: `${req.user.name} transferred ${transferAmount} from ${sender.name} to ${recipient.name}`,
          metadata: {
            senderId: sender._id,
            recipientId: recipient._id,
            amount: transferAmount,
            initiatedBy: req.user.role,
          },
          branchId: req.user.branchId || sender.branchId,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Automatic Loan Deduction for Recipient ─────────────────────────────
    try {
      const activeLoan = await Loan.findOne({
        customer: recipient.customer,
        status: 'active',
      });

      if (activeLoan) {
        const deductionAmount = Math.min(
          transferAmount,
          activeLoan.remainingAmount,
        );
        if (deductionAmount > 0) {
          // We need a dummy req-like object if we are outside a standard path or just pass req
          await loanRepaymentService.processRepayment(
            activeLoan,
            deductionAmount,
            req,
            {
              notes: `Auto-deduction from received transfer: ${description || 'Admin Transfer'}`,
              isAutoValue: true,
            },
          );
        }
      }
    } catch (autoRepoError) {
      console.error(
        'Auto Repayment Error in adminTransferFunds:',
        autoRepoError,
      );
    }

    // Dashboard Notifications
    try {
      // Notify Sender
      await createTransactionNotification({
        recipientId: sender._id,
        title: 'Transfer Sent (Admin)',
        message: `An admin transferred Rs. ${transferAmount.toLocaleString()} from your account to ${recipient.name}.`,
        type: 'info',
        branchId: sender.branchId,
        action: 'admin_fund_transfer_sent',
        metadata: {
          recipientId: recipient._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });

      // Notify Recipient
      await createTransactionNotification({
        recipientId: recipient._id,
        title: 'Transfer Received (Admin)',
        message: `An admin transferred Rs. ${transferAmount.toLocaleString()} to your account from ${sender.name}.`,
        type: 'success',
        branchId: recipient.branchId,
        action: 'admin_fund_transfer_received',
        metadata: {
          senderId: sender._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });
    } catch (notifError) {
      console.error('Admin Transfer Notification Error:', notifError);
    }

    // Email Notifications
    try {
      // Email to Sender
      if (sender.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, sender.branchId);
        sendEmailAsync({
          to: sender.email,
          subject: 'Transfer Sent Confirmation',
          html: transactionEmail({
            memberName: sender.name,
            transactionType: 'Transfer Sent',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(sender._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: senderTransaction._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
            recipientName: recipient.name,
          }),
        });
      }

      // Email to Recipient
      if (recipient.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, recipient.branchId);
        sendEmailAsync({
          to: recipient.email,
          subject: 'Transfer Received Confirmation',
          html: transactionEmail({
            memberName: recipient.name,
            transactionType: 'Transfer Received',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(recipient._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: recipientTransaction._id
              .toString()
              .slice(-8)
              .toUpperCase(),
            senderName: sender.name,
          }),
        });
      }
    } catch (emailError) {
      console.error('Admin Transfer Email Notification Error:', emailError);
    }

    res.status(200).json({
      message: 'Admin transfer successful',
      senderBalance: sender.currentBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const lookupMember = async (req, res) => {
  const { identifier } = req.query;

  if (!identifier || identifier.length < 3) {
    return res.json([]);
  }

  try {
    const effectiveOwnerId = req.user
      ? req.user.effectiveOwnerId
      : req.member.user;

    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedIdentifier, 'i');

    const orConditions = [
      { name: regex },
      { cnic: regex },
      { phone: regex },
      { email: regex },
      { savingAccountNumber: regex },
      { currentAccountNumber: regex },
    ];

    // Also try digits-only match for account/phone numbers
    const digitsOnly = identifier.replace(/\D/g, '');
    if (digitsOnly.length >= 3) {
      orConditions.push({ cnic: new RegExp(digitsOnly) });
      orConditions.push({ phone: new RegExp(digitsOnly) });
      orConditions.push({ savingAccountNumber: new RegExp(digitsOnly) });
      orConditions.push({ currentAccountNumber: new RegExp(digitsOnly) });
    }

    const members = await Member.find({
      user: effectiveOwnerId,
      $or: orConditions,
    })
      .select(
        'name email phone cnic memberId savingAccountNumber currentAccountNumber profilePicture',
      )
      .limit(6);

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc  Recalculate and fix currentBalance for one or all members from Investment records
 * @route POST /api/members/recalculate-balance        (single: body { memberId })
 * @route POST /api/members/recalculate-balance/all   (all members for owner)
 * @access Private (Admin/Staff)
 */
const recalculateBalance = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { memberId } = req.body;

    const query = memberId ? { _id: memberId, user: userId } : { user: userId };

    const members = await Member.find(query);
    if (!members.length) {
      return res.status(404).json({ message: 'No members found' });
    }

    const results = [];

    for (const member of members) {
      // Sum current-account Investment records only. Saving-account entries
      // belong to savingBalance; Reversed entries never happened.
      const investments = await Investment.find({
        member: member._id,
        accountType: 'current',
        status: { $ne: 'Reversed' },
      });

      let computed = 0;
      for (const inv of investments) {
        if (
          inv.type === 'deposit' ||
          inv.type === 'transfer_receive' ||
          inv.type === 'loan_disbursement' // proceeds credit the wallet too
        ) {
          computed += inv.amount;
        } else if (
          inv.type === 'withdrawal' ||
          inv.type === 'transfer_send'
        ) {
          computed -= inv.amount;
        }
        // 'profit' Investment type intentionally ignored — TD profit is baked
        // into the matching 'deposit' Investment at maturity (amount =
        // principal + profit), and regular profit is captured below via
        // ProfitDistribution.
      }

      // Only 'regular' profit lands in currentBalance. 'share' lives in
      // shareBalance; 'saving' lives in savingBalance; 'term_deposit' is
      // already in the corresponding Investment(deposit) row above.
      const profits = await ProfitDistribution.find({
        member: member._id,
        type: 'regular',
        status: { $ne: 'Failed' },
      });
      const totalProfit = profits.reduce((s, p) => s + p.amount, 0);
      computed += totalProfit;

      const oldBalance = member.currentBalance;
      member.currentBalance = Math.round(computed); // Allow negative — member owes more than invested
      await member.save();

      results.push({
        memberId: member._id,
        name: member.name,
        oldBalance,
        newBalance: member.currentBalance,
        diff: member.currentBalance - oldBalance,
      });
    }

    return res.json({
      message: `Recalculated balance for ${results.length} member(s)`,
      results,
    });
  } catch (error) {
    console.error('Recalculate Balance Error:', error);
    return res.status(500).json({ message: 'Failed to recalculate balance' });
  }
};

// @desc  Get logged-in member's own business share history
// @route GET /api/members/portal/shares
// @access Private (Member)
const getPortalShares = async (req, res) => {
  try {
    const memberId = req.member._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = { member: memberId };
    if (search) {
      query.description = { $regex: escapeRegExp(String(search)), $options: 'i' };
    }

    const [shares, total] = await Promise.all([
      BusinessShare.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      BusinessShare.countDocuments(query),
    ]);

    res.json({
      shares,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Portal Shares Error:', error);
    res.status(500).json({ message: 'Failed to fetch share history' });
  }
};

// ─── BUSINESS SHARE FUNCTIONS ─────────────────────────────────────────────────

// @desc  Get member's business share transaction history
// @route GET /api/members/:id/shares
// @access Private (Admin/Staff)
const getMemberShares = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [shares, total] = await Promise.all([
      BusinessShare.find({ member: id, user: userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      BusinessShare.countDocuments({ member: id, user: userId }),
    ]);

    res.json({
      shares,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Business Shares Error:', error);
    res.status(500).json({ message: 'Failed to fetch business shares' });
  }
};

// @desc  Add a business share investment (deposit)
//        NOTE: intentionally does NOT trigger auto-loan repayment
// @route POST /api/members/:id/share-invest
// @access Private (Admin/Staff)
const addShareInvestment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description, deductFromBalance = false } = req.body;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: 'Invalid share investment amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId }).session(
      session,
    );
    if (!member) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Member not found' });
    }

    if (deductFromBalance && member.currentBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: 'Insufficient current balance for auto-deduction' });
    }

    // Update member share fields atomically
    const incObj = { shareBalance: amount, totalShareInvested: amount };
    if (deductFromBalance) {
      incObj.currentBalance = -amount;
      incObj.totalWithdrawn = amount;
    }

    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId },
      { $inc: incObj },
      { new: true, session },
    );

    if (!updatedMember) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Member not found' });
    }

    // Create business share record
    const [shareRecord] = await BusinessShare.create(
      [
        {
          user: userId,
          member: id,
          branchId: member.branchId,
          type: 'share_deposit',
          amount,
          description:
            description ||
            (deductFromBalance
              ? 'Share Investment (Auto-Deducted)'
              : 'Business share investment'),
          shareBalanceAfter: updatedMember.shareBalance,
        },
      ],
      { session },
    );

    // If deducted from balance, log withdrawal from main ledger
    if (deductFromBalance) {
      await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'withdrawal',
            amount,
            description: description || 'Share Investment (Auto-Deduction)',
            balanceAfter: updatedMember.currentBalance,
          },
        ],
        { session },
      );
    } else {
      // Financial transaction only for external injections (income)
      await FinancialTransaction.create(
        [
          {
            user: userId,
            branchId: member.branchId,
            type: 'credit',
            category: 'investment',
            amount,
            date: new Date(),
            description: description || 'Business share investment',
            member: member._id,
            referenceId: shareRecord._id,
            referenceModel: 'BusinessShare',
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Notify member (Outside transaction)
    try {
      await createTransactionNotification({
        recipientId: member._id,
        title: 'Business Share Invested',
        message: `Rs. ${amount.toLocaleString()} has been added to your business share portfolio${deductFromBalance ? ' via auto-deduction from your main balance' : ''}.`,
        type: 'success',
        branchId: member.branchId,
        action: 'member_share_deposit_notification',
        metadata: { amount, shareId: shareRecord._id, link: '/member/shares' },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: 'Share Investment Confirmation',
          html: transactionEmail({
            memberName: member.name,
            transactionType: deductFromBalance
              ? 'Share Investment (Auto-Deduction)'
              : 'Share Investment',
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: updatedMember.shareBalance.toLocaleString(),
            branchName: branchName,
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
          }),
        });
      }
    } catch (notifError) {
      console.error('Share Deposit Notification Error:', notifError);
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'member_share_invested',
      category: 'member',
      details: `Added share investment of ${amount} for member: ${member.name}${deductFromBalance ? ' (Deducted from balance)' : ''}`,
      metadata: {
        memberId: id,
        amount,
        shareId: shareRecord._id,
        deducted: deductFromBalance,
      },
      req,
    });

    // Update member's credit limit
    await updateMemberCreditLimit(id);

    res.status(201).json({ shareRecord, member: updatedMember });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Add Share Investment Error:', error);
    res.status(500).json({ message: 'Failed to add share investment' });
  }
};

// @desc  Withdraw from business share balance
// @route POST /api/members/:id/share-withdraw
// @access Private (Admin/Staff)
const withdrawShareInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (member.shareBalance < amount) {
      return res
        .status(400)
        .json({ message: 'Insufficient share balance for withdrawal' });
    }

    // Update member share balance atomically
    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId },
      { $inc: { shareBalance: -amount } },
      { new: true },
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const shareRecord = await BusinessShare.create({
      user: userId,
      member: id,
      branchId: member.branchId,
      type: 'share_withdrawal',
      amount,
      description: description || 'Business share withdrawal',
      shareBalanceAfter: updatedMember.shareBalance,
    });

    await FinancialTransaction.create({
      user: userId,
      branchId: member.branchId,
      type: 'debit',
      category: 'withdrawal',
      amount,
      date: new Date(),
      description: description || 'Business share withdrawal',
      member: member._id,
      referenceId: shareRecord._id,
      referenceModel: 'BusinessShare',
    });

    try {
      await createTransactionNotification({
        recipientId: member._id,
        title: 'Business Share Withdrawal',
        message: `Rs. ${amount.toLocaleString()} has been withdrawn from your business share portfolio.`,
        type: 'info',
        branchId: member.branchId,
        action: 'member_share_withdrawal_notification',
        metadata: { amount, shareId: shareRecord._id, link: '/member/shares' },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: 'Share Withdrawal Confirmation',
          html: transactionEmail({
            memberName: member.name,
            transactionType: 'Share Withdrawal',
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: updatedMember.shareBalance.toLocaleString(),
            branchName: branchName,
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Share Withdrawal Notification Error:', notifError);
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_share_withdrawn',
      category: 'member',
      details: `Processed share withdrawal of ${amount} for member: ${member.name}`,
      metadata: { memberId: id, amount },
      req,
    });

    // Update member's credit limit
    await updateMemberCreditLimit(id);

    res.status(201).json({ shareRecord, member });
  } catch (error) {
    console.error('Withdraw Share Investment Error:', error);
    res.status(500).json({ message: 'Failed to withdraw share investment' });
  }
};

// @desc   Transfer Business Share from one member to another (admin/staff only)
// @route  POST /api/members/admin/transfer-share
// @access Private (business users; members cannot reach this — it is mounted
//         behind `protect`, the member portal uses `protectMember`)
//
// A share transfer is modelled as a `share_withdrawal` on the sender + a
// `share_deposit` on the recipient rather than a dedicated type. This keeps it
// in lockstep with every share aggregation that already exists — the
// reconciliation share check (deposited − withdrawn + profit), the
// weighted-average share-balance calc, and the balance-sheet share-cash figure
// (shareBalance − totalShareProfit). The tenant-wide share liability is
// unchanged by a transfer, so the books still foot. Mirrors adminTransferFunds.
const transferShareBetweenMembers = async (req, res) => {
  const { senderId, recipientIdentifier, description } = req.body;

  // A share transfer always moves the member's ENTIRE share balance — there is
  // no partial amount. The amount is derived server-side from the sender so it
  // can't be under/over-stated by the client.
  if (!senderId || !recipientIdentifier) {
    return res
      .status(400)
      .json({ message: 'Sender and recipient are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantOwnerId = req.user.effectiveOwnerId || req.user._id;

    // Sender must belong to the calling business.
    const sender = await Member.findOne({
      _id: senderId,
      user: tenantOwnerId,
    }).session(session);
    if (!sender) throw new Error('Sender member not found');

    // Branch managers may only move shares within their managed branch.
    if (
      req.user.managedBranchId &&
      String(sender.branchId) !== String(req.user.managedBranchId)
    ) {
      throw new Error('Sender is outside your branch');
    }

    // Move the full share balance.
    const transferAmount = Math.round(sender.shareBalance || 0);
    if (transferAmount <= 0) {
      throw new Error('Member has no share balance to transfer');
    }

    // Resolve recipient within the SAME tenant (prevents cross-tenant IDOR).
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const identifier = String(recipientIdentifier || '');
    const exact = escapeRegex(identifier);
    const recipient = await Member.findOne({
      user: tenantOwnerId,
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { savingAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
        { currentAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
      ],
    }).session(session);

    if (!recipient) throw new Error('Recipient not found');
    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer shares to the same member');
    }
    if (
      req.user.managedBranchId &&
      String(recipient.branchId) !== String(req.user.managedBranchId)
    ) {
      throw new Error('Recipient is outside your branch');
    }

    // Debit sender — concurrency-safe `$gte` guard so two parallel transfers
    // can't both pass the read-then-decrement check and overdraw the balance.
    const senderRes = await Member.updateOne(
      { _id: sender._id, shareBalance: { $gte: transferAmount } },
      { $inc: { shareBalance: -transferAmount } },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error('Insufficient share balance');
    }

    // Credit recipient. totalShareInvested rises just as a received fund
    // transfer credits totalInvested — keeps the reconciliation share check
    // (deposited − withdrawn + profit) matching the new shareBalance.
    await Member.updateOne(
      { _id: recipient._id },
      { $inc: { shareBalance: transferAmount, totalShareInvested: transferAmount } },
      { session },
    );

    const updatedSender = await Member.findById(sender._id).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Ledger rows: withdrawal on the sender, deposit on the recipient, each
    // tagged with the counterparty so the UI can label it as a transfer.
    await BusinessShare.create(
      [
        {
          user: tenantOwnerId,
          member: sender._id,
          branchId: sender.branchId,
          type: 'share_withdrawal',
          amount: transferAmount,
          description: description || `Share transfer to ${recipient.name}`,
          shareBalanceAfter: updatedSender.shareBalance,
          metadata: {
            transfer: true,
            direction: 'send',
            counterpartyId: recipient._id,
            counterpartyName: recipient.name,
          },
        },
        {
          user: tenantOwnerId,
          member: recipient._id,
          branchId: recipient.branchId,
          type: 'share_deposit',
          amount: transferAmount,
          description: description || `Share transfer from ${sender.name}`,
          shareBalanceAfter: updatedRecipient.shareBalance,
          metadata: {
            transfer: true,
            direction: 'receive',
            counterpartyId: sender._id,
            counterpartyName: sender.name,
          },
        },
      ],
      { session, ordered: true },
    );

    await ActivityLog.create(
      [
        {
          user: tenantOwnerId,
          action: 'member_share_transfer',
          category: 'member',
          details: `${req.user.name} transferred share Rs. ${transferAmount.toLocaleString()} from ${sender.name} to ${recipient.name}`,
          metadata: {
            senderId: sender._id,
            recipientId: recipient._id,
            amount: transferAmount,
            initiatedBy: req.user.role,
          },
          branchId: req.user.branchId || sender.branchId,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Recompute both members' credit limits (share balance can feed it).
    try {
      await Promise.all([
        updateMemberCreditLimit(sender._id),
        updateMemberCreditLimit(recipient._id),
      ]);
    } catch (limitErr) {
      console.error('Share Transfer Credit Limit Error:', limitErr);
    }

    // Notify both members (outside the transaction).
    try {
      await Promise.all([
        createTransactionNotification({
          recipientId: sender._id,
          title: 'Business Share Transferred',
          message: `Rs. ${transferAmount.toLocaleString()} was transferred from your business share to ${recipient.name}.`,
          type: 'info',
          branchId: sender.branchId,
          action: 'member_share_transfer_notification',
          metadata: { amount: transferAmount, link: '/member/shares' },
        }),
        createTransactionNotification({
          recipientId: recipient._id,
          title: 'Business Share Received',
          message: `Rs. ${transferAmount.toLocaleString()} was added to your business share from ${sender.name}.`,
          type: 'success',
          branchId: recipient.branchId,
          action: 'member_share_transfer_notification',
          metadata: { amount: transferAmount, link: '/member/shares' },
        }),
      ]);
    } catch (notifError) {
      console.error('Share Transfer Notification Error:', notifError);
    }

    res.status(200).json({
      message: 'Share transfer successful',
      recipientName: recipient.name,
      senderShareBalance: updatedSender.shareBalance,
      recipientShareBalance: updatedRecipient.shareBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc  Distribute share profit to all active members with share balance
//        Profit is proportional to shareBalance.
//        Credited to: shareBalance (re-invested) + totalProfit (net profit reporting)
// @route POST /api/members/distribute-share-profit
// @access Private (Admin)
const distributeShareProfit = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      totalProfit: profitPool,
      period,
      description,
      useCustomRates,
      startDate,
      endDate,
    } = req.body;

    if (!useCustomRates && (!profitPool || profitPool <= 0)) {
      return res.status(400).json({ message: 'Invalid profit amount' });
    }

    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const members = await Member.find({
      user: userId,
      status: 'Active',
      shareBalance: { $gt: 0 },
    });
    if (members.length === 0) {
      return res
        .status(400)
        .json({ message: 'No active members with share investments found' });
    }

    const distributions = [];

    // Calculate all weighted balances first
    const memberShares = await Promise.all(
      members.map(async (m) => ({
        member: m,
        weightedShareBalance: await calculateWeightedAverageBalance(
          m._id,
          periodStart,
          periodEnd,
          'share',
        ),
      })),
    );

    const totalWeightedSharePool = memberShares.reduce(
      (sum, item) => sum + item.weightedShareBalance,
      0,
    );

    if (totalWeightedSharePool === 0 && !useCustomRates) {
      return res
        .status(400)
        .json({ message: 'No weighted average share balance found in period' });
    }

    // Largest-remainder allocation for the proportional (pool-based) path so the
    // sum of credited share-profit equals the declared pool EXACTLY. The custom-rate
    // path is per-member (rate% of own balance) and has no pool to conserve.
    const shareAllocations = (() => {
      if (useCustomRates || totalWeightedSharePool === 0) return new Map();
      const eligible = memberShares.filter((i) => i.weightedShareBalance > 0);
      const rows = eligible.map((i) => {
        const exact =
          (i.weightedShareBalance / totalWeightedSharePool) * profitPool;
        const floorAmt = Math.floor(exact);
        return {
          id: String(i.member._id),
          amount: floorAmt,
          frac: exact - floorAmt,
        };
      });
      let leftover = Math.round(
        profitPool - rows.reduce((s, r) => s + r.amount, 0),
      );
      rows
        .slice()
        .sort((a, b) => b.frac - a.frac)
        .forEach((r) => {
          if (leftover > 0) {
            r.amount += 1;
            leftover -= 1;
          }
        });
      return new Map(rows.map((r) => [r.id, r.amount]));
    })();

    for (const item of memberShares) {
      const { member, weightedShareBalance } = item;
      let profitAmount = 0;
      let calculationInfo = '';
      let sharePercent = 0;

      if (useCustomRates) {
        if (member.shareProfitRate > 0) {
          profitAmount = Math.round(
            (weightedShareBalance * member.shareProfitRate) / 100,
          );
          calculationInfo = `Custom rate: ${member.shareProfitRate}% on Weighted Avg Share Balance (Rs. ${Math.round(weightedShareBalance).toLocaleString()})`;
          sharePercent = member.shareProfitRate;
        } else {
          continue;
        }
      } else {
        if (weightedShareBalance > 0) {
          sharePercent = (weightedShareBalance / totalWeightedSharePool) * 100;
          profitAmount = shareAllocations.get(String(member._id)) || 0;
          calculationInfo = `Proportional: ${sharePercent.toFixed(2)}% of pool based on Weighted Avg Share Balance (Rs. ${Math.round(weightedShareBalance).toLocaleString()})`;
        }
      }

      if (profitAmount <= 0) continue;

      // Credit profit to share balance, book the BusinessShare record, the
      // ProfitDistribution row AND the ledger row as ONE atomic unit. Without a
      // transaction a mid-loop crash leaves a member's shareBalance bumped with
      // no matching records (or records with no credit) — the orphan-row /
      // missing-income drift the backfill scripts exist to repair.
      // NOTE: totalProfit must NOT be incremented here. It tracks profit credited
      // to currentBalance only; share profits live in shareBalance and are
      // tracked by totalShareProfit. Including them in totalProfit caused the
      // Member Balance reconciliation to flag a phantom drift equal to the
      // cumulative share profit (currentBalance never sees this money).
      let shareRecord;
      let updatedMember;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Keep { new: true } — shareBalanceAfter reads the updated doc.
          updatedMember = await Member.findByIdAndUpdate(
            member._id,
            {
              $inc: {
                shareBalance: profitAmount,
                totalShareProfit: profitAmount,
              },
            },
            { new: true, session },
          );

          [shareRecord] = await BusinessShare.create(
            [
              {
                user: userId,
                member: member._id,
                branchId: member.branchId,
                type: 'share_profit',
                amount: profitAmount,
                description:
                  description ||
                  `Share profit (Weighted Avg) for ${period || periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                shareBalanceAfter: updatedMember.shareBalance,
                period:
                  period ||
                  periodStart.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
              },
            ],
            { session },
          );

          // Create Profit Distribution record (Unified Hub)
          await ProfitDistribution.create(
            [
              {
                user: userId,
                member: member._id,
                branchId: member.branchId,
                amount: profitAmount,
                type: 'share',
                period:
                  period ||
                  periodStart.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
                calculationMethod: calculationInfo,
                investmentShare: sharePercent,
              },
            ],
            { session },
          );

          // FinancialTransaction
          await FinancialTransaction.create(
            [
              {
                user: userId,
                branchId: member.branchId,
                type: 'expense',
                category: 'profit_distribution',
                amount: profitAmount,
                date: new Date(),
                description: `Share profit: ${calculationInfo}`,
                member: member._id,
                referenceId: shareRecord._id,
                referenceModel: 'BusinessShare',
                paymentMethod: 'online',
              },
            ],
            { session },
          );
        });
      } finally {
        await session.endSession();
      }

      // Notify member
      try {
        await createTransactionNotification({
          recipientId: member._id,
          title: 'Share Profit Credited',
          message: `Rs. ${profitAmount.toLocaleString()} share profit added. Calculated on Weighted Avg Share Balance of Rs. ${Math.round(weightedShareBalance).toLocaleString()}.`,
          type: 'success',
          branchId: member.branchId,
          action: 'member_share_profit_notification',
          metadata: {
            amount: profitAmount,
            shareId: shareRecord._id,
            link: '/member/shares',
          },
        });

        // Send Email Notification (non-blocking)
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
        sendEmailAsync({
          to: member.email,
          subject: `Share Profit Credited - ${branchName}`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: 'Share Profit Distribution',
            amount: profitAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            balance: (member.shareBalance + profitAmount).toLocaleString(),
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
            branchName: branchName,
            logoUrl: logoUrl,
          }),
        });
      } catch (notifError) {
        console.error('Share Profit Notification Error:', notifError);
      }

      // Update credit limit after profit distribution
      await updateMemberCreditLimit(member._id);

      distributions.push(shareRecord);
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'share_profit_distributed',
      category: 'member',
      details: `Distributed share profit to ${distributions.length} members for ${period} using ${useCustomRates ? 'custom rates' : 'proportional method'}`,
      metadata: {
        profitPool: useCustomRates ? 'Custom Rates' : profitPool,
        period,
        membersCount: distributions.length,
        method: useCustomRates ? 'custom' : 'proportional',
      },
      req,
    });

    res.status(201).json({
      message: 'Share profit distributed successfully',
      distributions,
      totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0),
      membersCount: distributions.length,
    });
  } catch (error) {
    console.error('Distribute Share Profit Error:', error);
    res.status(500).json({ message: 'Failed to distribute share profit' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

// Get all profit distributions (Admin)
const getAllDistributions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {
      user: req.user.effectiveOwnerId,
      branchId: req.user.branchId || { $exists: true },
    };

    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      delete query.branchId;
    }

    // Add search functionality
    if (search) {
      const matchingMembers = await Member.find({
        name: { $regex: escapeRegExp(String(search)), $options: 'i' },
      }).select('_id');
      const memberIds = matchingMembers.map((m) => m._id);
      query.member = { $in: memberIds };
    }

    const total = await ProfitDistribution.countDocuments(query);
    const distributions = await ProfitDistribution.find(query)
      .populate('member', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Summary stats
    const allDistributions = await ProfitDistribution.find(query);
    const summary = {
      totalRegular: allDistributions
        .filter((d) => d.type === 'regular' || !d.type)
        .reduce((sum, d) => sum + d.amount, 0),
      totalShare: allDistributions
        .filter((d) => d.type === 'share')
        .reduce((sum, d) => sum + d.amount, 0),
      totalSaving: allDistributions
        .filter((d) => d.type === 'saving')
        .reduce((sum, d) => sum + d.amount, 0),
      count: total,
    };

    res.json({
      distributions,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get All Distributions Error:', error);
    res.status(500).json({ message: 'Failed to fetch distributions' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Member Self-Onboarding

/**
 * @desc    Public endpoint for members to self-register
 * @route   POST /api/members/self-register
 * @access  Public
 */
const selfRegister = async (req, res) => {
  try {
    const { name, phone, email, cnic, password, securityCode } = req.body;

    if (!phone || !cnic || !password || !securityCode || !name) {
      return res.status(400).json({
        message: 'Please provide all required fields including security code',
      });
    }

    // Identify the business owner via securityCode
    const businessOwner = await User.findOne({
      securityCode: securityCode.toUpperCase(),
      role: 'admin',
    });
    if (!businessOwner) {
      return res
        .status(404)
        .json({ message: 'Invalid security code. Business not found.' });
    }

    // The business must have at least one branch before it can accept members.
    // New self-registered members are attributed to the tenant's default branch
    // (an admin can move them after approval).
    const { getDefaultBranchId } = require('../utils/branchUtils');
    const defaultBranchId = await getDefaultBranchId(businessOwner._id);
    if (!defaultBranchId) {
      return res.status(400).json({
        message: 'This business is not accepting registrations yet.',
        code: 'NO_BRANCH',
      });
    }

    // Check if phone, email, or cnic already exists for this business
    const existingMember = await Member.findOne({
      user: businessOwner._id,
      $or: [
        { phone },
        { cnic },
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });

    if (existingMember) {
      const conflictField =
        existingMember.phone === phone
          ? 'phone number'
          : existingMember.cnic === cnic
            ? 'CNIC'
            : 'email';
      return res.status(400).json({
        message: `A member with this ${conflictField} already exists in this business`,
      });
    }

    // Create the member as pending (password will be hashed by Member model pre-save hook)
    const member = await Member.create({
      user: businessOwner._id,
      branchId: defaultBranchId,
      name,
      phone,
      email: email || undefined,
      cnic,
      password,
      approvalStatus: 'pending',
      isActive: false, // Prevents login until approved
    });

    // Update business customer count
    businessOwner.customerCount = (businessOwner.customerCount || 0) + 1;
    await businessOwner.save();

    // Auto-create a linked Customer account for the member
    try {
      // Only create if no existing customer with this CNIC or Email for this business
      let customer = await Customer.findOne({
        user: businessOwner._id,
        $or: [{ cnic }, ...(email ? [{ email: email.toLowerCase() }] : [])],
      });

      if (!customer) {
        customer = await Customer.create({
          user: businessOwner._id,
          branchId: defaultBranchId,
          name,
          phone,
          email: email || undefined,
          cnic,
          isMember: true,
          memberId: member._id,
        });
      } else {
        // Already exists (e.g. added by admin before), just link
        await Customer.findByIdAndUpdate(customer._id, {
          isMember: true,
          memberId: member._id,
        });
      }

      // Link the customer back to the member
      await Member.findByIdAndUpdate(member._id, { customer: customer._id });
    } catch (customerError) {
      // Non-fatal: member is created; customer link can be fixed by admin
      console.error('Auto-create customer error (non-fatal):', customerError);
    }

    // Notify admin & managers about the pending approval
    try {
      await notifyAdminsOfMemberAction({
        title: 'New Member Registration Pending',
        message: `${name} has registered and is awaiting account approval.`,
        type: 'info',
        ownerId: businessOwner._id,
        link: '/members?type=pending',
        metadata: { memberId: member._id, phone },
      });
    } catch (notifError) {
      console.error(
        'Failed to notify admins of new self-registration:',
        notifError,
      );
    }

    // Real-time socket: increment pending badge on all admin/staff connections for this business
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${businessOwner._id.toString()}`).emit(
          'member:new_registration',
          {
            memberId: member._id,
            name: member.name,
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit member:new_registration:',
        socketErr.message,
      );
    }

    // We can't log activity for the member yet because they aren't logged in, but we can log for the business
    await logActivity({
      userId: businessOwner._id,
      action: 'member_registration_pending',
      category: 'admin',
      details: `New self-registration request from ${name}`,
      metadata: { memberId: member._id, phone },
      req,
    });

    res.status(201).json({
      message:
        'Registration successful. Your account is pending admin approval.',
      memberId: member._id,
    });
  } catch (error) {
    console.error('Self Register Error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

/**
 * @desc    Admin endpoint to approve or reject a pending member
 * @route   PUT /api/members/:id/approval
 * @access  Private (Admin/Staff)
 */
const updateApprovalStatus = async (req, res) => {
  try {
    const { status, branchId, rejectionReason } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res
        .status(400)
        .json({ message: 'Invalid status. Must be approved or rejected' });
    }

    const member = await Member.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (member.approvalStatus !== 'pending') {
      return res
        .status(400)
        .json({ message: `Member is already ${member.approvalStatus}` });
    }

    member.approvalStatus = status;
    member.isActive = status === 'approved';
    if (status === 'rejected' && rejectionReason) {
      member.rejectionReason = rejectionReason;
    }
    if (branchId) {
      member.branchId = branchId;
    }
    await member.save();

    // If rejected, remove the associated customer record
    if (status === 'rejected' && member.customer) {
      try {
        const Customer = require('../models/Customer');
        await Customer.findByIdAndDelete(member.customer);
      } catch (custError) {
        console.error(
          'Failed to delete associated customer on rejection:',
          custError,
        );
      }
    }

    // Send email notification to the member
    if (member.email) {
      try {
        const owner = await User.findById(req.user.effectiveOwnerId).select(
          'businessName name businessLogo',
        );
        const ownerBrandName = owner ? owner.businessName || owner.name : null;
        const logoUrl = owner?.businessLogo;
        sendEmailAsync({
          to: member.email,
          subject:
            status === 'approved'
              ? '🎉 Your Account Has Been Approved!'
              : 'Update on Your Registration Request',
          html: memberApprovalEmail(
            member.name,
            status,
            ownerBrandName,
            logoUrl,
          ),
        });
      } catch (emailError) {
        // error already logged by sendEmailAsync internally
      }
    }

    await logActivity({
      userId: req.user._id,
      action: `member_registration_${status}`,
      category: 'admin',
      details: `Self-registration for ${member.name} was ${status}`,
      metadata: { memberId: member._id },
      req,
    });

    // Real-time socket: notify the pending member's waiting screen of the decision
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`pending_member_${member._id.toString()}`).emit(
          'member:approval_result',
          {
            status,
            memberId: member._id,
            rejectionReason: member.rejectionReason,
            message:
              status === 'approved'
                ? 'Your account has been approved! You can now log in.'
                : 'Your registration was not approved at this time.',
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit member:approval_result:',
        socketErr.message,
      );
    }

    // If rejected, remove the associated records to allow re-registration
    if (status === 'rejected') {
      if (member.customer) {
        try {
          const Customer = require('../models/Customer');
          await Customer.findByIdAndDelete(member.customer);
        } catch (custError) {
          console.error(
            'Failed to delete associated customer on rejection:',
            custError,
          );
        }
      }
      // Delete the member record itself
      await Member.findByIdAndDelete(member._id);
    }

    if (status !== 'rejected') {
      await member.populate('branchId', 'name');
    }

    res.json({ message: `Member successfully ${status}`, member });
  } catch (error) {
    console.error('Update Approval Status Error:', error);
    res.status(500).json({ message: 'Failed to update approval status' });
  }
};

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberInvestments,
  addInvestment,
  withdrawInvestment,
  getMemberProfits,
  distributeProfit,
  convertCustomerToMember,
  getMemberActivity,
  transferFunds,
  adminTransferFunds,
  lookupMember,
  recalculateBalance,
  getMemberShares,
  addShareInvestment,
  withdrawShareInvestment,
  transferShareBetweenMembers,
  distributeShareProfit,
  getPortalShares,
  getAllDistributions,
  selfRegister,
  updateApprovalStatus,
  initiateRaastDeposit,
  getAccountStatement,
  bulkImportMembers,
  getMemberAuditLog,
  uploadMemberDocuments,
  updateMemberDocumentStatus,
  deleteMemberDocument,
};
