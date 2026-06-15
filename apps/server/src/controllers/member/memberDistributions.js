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
    const { getDefaultBranchId } = require('../../utils/branchUtils');
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
      const { getIO } = require('../../utils/socketInstance');
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
        const Customer = require('../../models/Customer');
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
      const { getIO } = require('../../utils/socketInstance');
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
          const Customer = require('../../models/Customer');
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
  getAllDistributions,
  selfRegister,
  updateApprovalStatus,
};
