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
    } else if (req.query.includePending !== 'true') {
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

    // Get active loans count for each member
    // Import Loan model first (add to top of file if not present, but I see it's missing in imports so I will add it via a separate edit or assume it's there.
    // Wait, I need to check imports. Line 1: const Member = require('../models/Member'); Line 2: ...
    // Loan is NOT imported. I need to import it.

    // I will do this in two steps. First, import Loan.
    // Actually, I can do it here if I am careful.
    // But let's look at the file content again.
    // Step 1122 shows exports. It does NOT show Loan being imported.

    // So I need to add `const Loan = require('../models/Loan');` at the top.

    // Refactoring: I will just return the modified function here, and assume I will add the import in the next step or same step if possible.
    // I can't modify top of file here. So I will just modify the function and use `mongoose.model('Loan')` or similar if I want to avoid import...
    // No, I should import it properly.

    // I will use `const Loan = require('../models/Loan');` inside the function for now if duplicate import validation is strict, OR I will make a separate edit to add the import at the top.

    // Let's modify the function to use Promise.all and map.

    const membersWithLoans = await Promise.all(
      members.map(async (member) => {
        let activeLoans = 0;
        if (member.customer) {
          // member.customer is populated object or ID? logic says populated.
          // If populated, member.customer._id
          // If not populated (e.g. null), then 0.
          const customerId = member.customer._id || member.customer;
          // We need to import Loan. Since I can't add it to top in this single block easily without replacing whole file,
          // I will use a require here for safety or relying on a separate edit.
          // I'll assume I'll add the import in a previous or subsequent step.
          // Wait, I can't rely on assumptions.
          // I will use mongoose.model('Loan') to get the model without direct import if it's already registered, which it is.
          const Loan = mongoose.model('Loan');
          activeLoans = await Loan.countDocuments({
            customer: customerId,
            status: 'active',
          });
        }
        return {
          ...member.toObject(),
          activeLoans,
          savingAccountNumber:
            member.savingAccountNumber || member.customer?.savingAccountNumber,
          currentAccountNumber:
            member.currentAccountNumber ||
            member.customer?.currentAccountNumber,
        };
      }),
    );

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
            .populate('grantor1', 'name cnic')
            .populate('grantor2', 'name cnic')
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
      branchId: req.user.branchId, // Assign creator's branch
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

      if (nominee) {
        customerUpdate.nominee = {
          ...nominee,
          cnicImage: nomineeCnicImageUrl,
        };
      }

      await Customer.findByIdAndUpdate(updatedMember.customer, customerUpdate);
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

    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId },
      { $inc: incFields },
      { new: true },
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const balanceAfter = isSaving ? updatedMember.savingBalance : updatedMember.currentBalance;

    // Create investment record
    const investment = await Investment.create({
      user: userId,
      member: id,
      branchId: member.branchId,
      type: 'deposit',
      amount,
      accountType,
      description: description || systemDescription,
      balanceAfter,
    });

    // Create Financial Transaction
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
    await financialTx.save();

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
    const { amount, description, notes: userNotes, accountType = 'current', paymentMethod = 'cash', checkbookId, checkNo } = req.body;

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

    const isSaving = accountType === 'saving';
    const systemDescription = isSaving ? 'Saving account withdrawal' : 'Investment withdrawal';
    const checkbookLabel = checkbookDoc
      ? ` (Checkbook: ${checkbookDoc.checkbookNumber}${checkNo ? ', Check #' + checkNo : ''})`
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
    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId, [balanceField]: { $gte: amount } },
      { $inc: incFields },
      { new: true },
    );

    if (!updatedMember) {
      // Either the member is gone or another concurrent request consumed
      // the funds — surface as insufficient balance to the caller.
      return res
        .status(400)
        .json({ message: `Insufficient ${isSaving ? 'saving' : 'current'} account balance for withdrawal` });
    }

    const balanceAfter = isSaving ? updatedMember.savingBalance : updatedMember.currentBalance;

    // Create investment record
    const investment = await Investment.create({
      user: userId,
      member: id,
      branchId: member.branchId,
      type: 'withdrawal',
      amount,
      accountType,
      description: (description || systemDescription) + checkbookLabel,
      balanceAfter,
      metadata: checkbookDoc ? { checkbookId: checkbookDoc._id, checkbookNumber: checkbookDoc.checkbookNumber, checkNo: checkNo || undefined } : {},
    });

    // ── Increment checkbook used leaves ───────────────────────────────────
    if (checkbookDoc) {
      checkbookDoc.usedLeaves += 1;
      if (checkbookDoc.usedLeaves >= checkbookDoc.numberOfLeaves) {
        checkbookDoc.status = 'used';
      }
      await checkbookDoc.save();
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
    await financialTx.save();

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

          // Update member profit atomically
          const updatedMember = await Member.findByIdAndUpdate(
            member._id,
            {
              $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
            },
            { new: true },
          );

          // Create profit distribution record
          const distribution = await ProfitDistribution.create({
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
            calculationMethod: `Weighted Avg Balance (Rs. ${Math.round(weightedBalance).toLocaleString()}) × ${member.profitRate}% Rate`,
            investmentShare: member.profitRate,
          });

          // Create Financial Transaction
          const financialTx = new FinancialTransaction({
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
          });
          await financialTx.save();

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

      for (const item of memberBalances) {
        const { member, weightedBalance } = item;
        if (weightedBalance > 0) {
          const share = (weightedBalance / totalWeightedPool) * 100;
          const profitAmount = Math.round(
            (weightedBalance / totalWeightedPool) * totalProfit,
          );

          if (profitAmount <= 0) continue;

          // Update member profit atomically
          const updatedMember = await Member.findByIdAndUpdate(
            member._id,
            {
              $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
            },
            { new: true },
          );

          // Create profit distribution record
          const distribution = await ProfitDistribution.create({
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
              `Weighted Avg Balance: Rs. ${Math.round(weightedBalance).toLocaleString()} (${share.toFixed(2)}% share of pool)`,
            investmentShare: share,
          });

          // Create Financial Transaction
          const financialTx = new FinancialTransaction({
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
          });
          await financialTx.save();

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
    await Member.updateOne(
      { _id: recipient._id },
      {
        $inc: { currentBalance: transferAmount, totalInvested: transferAmount },
      },
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
      balanceAfter: updatedRecipient.currentBalance,
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
        'name email phone cnic memberId savingAccountNumber currentAccountNumber',
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
      // Sum all Investment records for this member
      const investments = await Investment.find({ member: member._id });

      let computed = 0;
      for (const inv of investments) {
        if (
          inv.type === 'deposit' ||
          inv.type === 'transfer_receive' ||
          inv.type === 'external_receive'
        ) {
          computed += inv.amount;
        } else if (
          inv.type === 'withdrawal' ||
          inv.type === 'transfer_send' ||
          inv.type === 'external_send'
        ) {
          computed -= inv.amount;
        }
      }

      // Also add profit distributions (separate documents, not in Investment)
      const profits = await ProfitDistribution.find({ member: member._id });
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
          profitAmount = Math.round(
            (weightedShareBalance / totalWeightedSharePool) * profitPool,
          );
          calculationInfo = `Proportional: ${sharePercent.toFixed(2)}% of pool based on Weighted Avg Share Balance (Rs. ${Math.round(weightedShareBalance).toLocaleString()})`;
        }
      }

      if (profitAmount <= 0) continue;

      // Credit profit to share balance atomically
      const updatedMember = await Member.findByIdAndUpdate(
        member._id,
        {
          $inc: {
            shareBalance: profitAmount,
            totalShareProfit: profitAmount,
            totalProfit: profitAmount,
          },
        },
        { new: true },
      );

      const shareRecord = await BusinessShare.create({
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
      });

      // Create Profit Distribution record (Unified Hub)
      await ProfitDistribution.create({
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
      });

      // FinancialTransaction
      await FinancialTransaction.create({
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
      });

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
  distributeShareProfit,
  getPortalShares,
  getAllDistributions,
  selfRegister,
  updateApprovalStatus,
  initiateRaastDeposit,
};
