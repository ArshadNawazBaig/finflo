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
const { escapeRegExp, capitalizeName } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

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
          message: `Staff member ${req.user.name} has converted customer ${capitalizeName(customer.name)} to a member.`,
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

    const { validateEmail } = require('../../utils/emailValidator');
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
    const { getDefaultBranchId, hasAnyBranch } = require('../../utils/branchUtils');
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

    // Upload the signature to Cloudinary ONCE if it arrives as a base64 data
    // URL, then reuse the resulting URL for both the Member and its mirrored
    // Customer — never persist raw base64. An already-stored Cloudinary URL is
    // passed through untouched by the guard.
    let signatureUrl = signature;
    if (signature && signature.startsWith('data:image')) {
      try {
        const uploadResult = await uploadSignature(signature);
        signatureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Signature Upload Error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload signature' });
      }
    }

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
      signature: signatureUrl,
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
        const { hash } = require('../../utils/encryption');

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
            signature: signatureUrl,
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
          message: `Staff member ${req.user.name} has created a new member: ${capitalizeName(name)}.`,
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
      const { validateEmail } = require('../../utils/emailValidator');
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

    // Handle signature update: only upload when a fresh base64 data URL arrives.
    // An already-stored Cloudinary URL (or an unchanged value) is passed through
    // untouched, so we never re-upload or persist raw base64. On a real change,
    // delete the member's previous Cloudinary signature first.
    let signatureUrl = signature;
    if (signature && signature.startsWith('data:image')) {
      try {
        if (member.signature) {
          await deleteCloudinaryFileByUrl(member.signature);
        }
        const uploadResult = await uploadSignature(signature);
        signatureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Signature Update Error:', uploadError);
        return res.status(500).json({ message: 'Failed to update signature' });
      }
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
        signature: signatureUrl,
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

      // Mirror the uploaded signature URL onto the linked customer when it was
      // actually changed in this request. Never write raw base64 here, and
      // don't clobber the customer's signature when none was supplied.
      if (signature && signature.startsWith('data:image')) {
        customerUpdate.signature = signatureUrl;
      }

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

    // Delete the member's signature from Cloudinary if it exists.
    if (member.signature) {
      await deleteCloudinaryFileByUrl(member.signature);
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
    const { getDefaultBranchId, hasAnyBranch } = require('../../utils/branchUtils');
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

    const { validateEmail } = require('../../utils/emailValidator');
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

module.exports = {
  convertCustomerToMember,
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  bulkImportMembers,
};
