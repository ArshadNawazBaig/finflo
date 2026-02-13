const mongoose = require('mongoose');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Repayment = require('../models/Repayment');
const ActivityLog = require('../models/ActivityLog');
const { canAddMember } = require('../utils/planLimits');
const { logActivity } = require('./activityLogController');
const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');

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

    // Check if member with this email already exists under this user
    const memberExists = await Member.findOne({
      user: customer.user,
      email: customer.email,
    });

    if (memberExists) {
      return res
        .status(400)
        .json({ message: 'Member account already exists for this email' });
    }

    // Create Member
    const member = await Member.create({
      user: customer.user, // Admin/Business Owner
      customer: customer._id,
      branchId: customer.branchId, // Inherit branch from customer
      name: customer.name?.toLowerCase(),
      email: customer.email?.toLowerCase(),
      phone: customer.phone,
      address: customer.address,
      password, // Will be hashed by pre-save middleware
    });

    // Update Customer
    customer.isMember = true;
    customer.memberId = member._id;
    await customer.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_converted_to_member',
      category: 'members',
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
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    const query = { user: userId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { savingAccountNumber: { $regex: search, $options: 'i' } },
        { currentAccountNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    // Branch Segregation: Staff only see their own branch data
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const members = await Member.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate(
        'customer',
        'name email savingAccountNumber currentAccountNumber',
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

    const member = await Member.findOne({ _id: id, user: userId }).populate(
      'customer',
      'name email phone',
    );

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
    }

    if (!isAuthorized) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(member);
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
      address,
      initialInvestment,
      profitRate,
      customerId,
    } = req.body;

    const lowercaseEmail = email?.toLowerCase();
    const lowercaseName = name?.toLowerCase();

    // Check if email already exists for this user
    const existingMember = await Member.findOne({
      user: userId,
      email: lowercaseEmail,
    });
    if (existingMember) {
      return res
        .status(400)
        .json({ message: 'Member with this email already exists' });
    }

    // Check plan limits
    const user = await User.findById(userId).select('plan');
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

    const memberData = {
      user: userId,
      branchId: req.user.branchId, // Assign creator's branch
      name: lowercaseName,
      email: lowercaseEmail,
      phone,
      address,
      totalInvested: initialInvestment || 0,
      currentBalance: initialInvestment || 0,
      profitRate: profitRate || 0,
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

    // Create initial investment record if there's an initial investment
    if (initialInvestment && initialInvestment > 0) {
      await Investment.create({
        user: userId,
        member: member._id,
        type: 'deposit',
        amount: initialInvestment,
        description: 'Initial investment',
        balanceAfter: initialInvestment,
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

    res.status(201).json(member);
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
    const { name, email, phone, address, status, profitRate } = req.body;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== member.email) {
      const existingMember = await Member.findOne({ user: userId, email });
      if (existingMember) {
        return res
          .status(400)
          .json({ message: 'Member with this email already exists' });
      }
    }

    const updatedMember = await Member.findByIdAndUpdate(
      id,
      {
        name: name?.toLowerCase(),
        email: email?.toLowerCase(),
        phone,
        address,
        status,
        profitRate,
      },
      { new: true, runValidators: true },
    );

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

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check if member has active investments
    if (member.currentBalance > 0) {
      return res.status(400).json({
        message:
          'Cannot delete member with active investments. Please withdraw all funds first.',
      });
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

    const investments = await Investment.find({
      member: id,
      user: userId,
    }).sort({ date: -1 });

    res.json(investments);
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
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid investment amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update member balances
    member.totalInvested += amount;
    member.currentBalance += amount;
    await member.save();

    // Create investment record
    const investment = await Investment.create({
      user: userId,
      member: id,
      branchId: member.branchId, // Tag with member's branch
      type: 'deposit',
      amount,
      description: description || 'Investment deposit',
      balanceAfter: member.currentBalance,
    });

    res.status(201).json({ investment, member });
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
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (member.currentBalance < amount) {
      return res
        .status(400)
        .json({ message: 'Insufficient balance for withdrawal' });
    }

    // Update member balances
    member.currentBalance -= amount;
    member.totalWithdrawn += amount;
    await member.save();

    // Create investment record
    const investment = await Investment.create({
      user: userId,
      member: id,
      branchId: member.branchId, // Tag with member's branch
      type: 'withdrawal',
      amount,
      description: description || 'Investment withdrawal',
      balanceAfter: member.currentBalance,
    });

    res.status(201).json({ investment, member });
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

// Distribute profit to all members
const distributeProfit = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { totalProfit, period, description, useCustomRates } = req.body;

    if (!totalProfit || totalProfit <= 0) {
      return res.status(400).json({ message: 'Invalid profit amount' });
    }

    // Get all active members
    const members = await Member.find({ user: userId, status: 'Active' });
    if (members.length === 0) {
      return res.status(400).json({ message: 'No active members found' });
    }

    const distributions = [];

    // Option 1: Use custom profit rates (if specified)
    if (useCustomRates) {
      for (const member of members) {
        if (member.currentBalance > 0 && member.profitRate > 0) {
          // Calculate profit based on custom rate: (balance * rate / 100)
          const profitAmount =
            (member.currentBalance * member.profitRate) / 100;

          // Update member profit
          member.totalProfit += profitAmount;
          member.currentBalance += profitAmount; // Add profit to balance
          await member.save();

          // Create profit distribution record
          const distribution = await ProfitDistribution.create({
            user: userId,
            member: member._id,
            branchId: member.branchId, // Tag with member's branch
            amount: profitAmount,
            period:
              period ||
              new Date().toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              }),
            calculationMethod: `Custom rate: ${member.profitRate}% of balance`,
            investmentShare: member.profitRate,
          });

          distributions.push(distribution);
        }
      }
    } else {
      // Option 2: Proportional distribution based on investment share
      const totalInvested = members.reduce(
        (sum, m) => sum + m.currentBalance,
        0,
      );
      if (totalInvested === 0) {
        return res.status(400).json({ message: 'No active investments found' });
      }

      for (const member of members) {
        if (member.currentBalance > 0) {
          const share = (member.currentBalance / totalInvested) * 100;
          const profitAmount =
            (member.currentBalance / totalInvested) * totalProfit;

          // Update member profit
          member.totalProfit += profitAmount;
          member.currentBalance += profitAmount; // Add profit to balance
          await member.save();

          // Create profit distribution record
          const distribution = await ProfitDistribution.create({
            user: userId,
            member: member._id,
            branchId: member.branchId, // Tag with member's branch
            amount: profitAmount,
            period:
              period ||
              new Date().toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              }),
            calculationMethod:
              description ||
              `Proportional distribution based on ${share.toFixed(2)}% share`,
            investmentShare: share,
          });

          distributions.push(distribution);
        }
      }
    }

    res.status(201).json({
      message: 'Profit distributed successfully',
      distributions,
      totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0),
      membersCount: distributions.length,
    });
  } catch (error) {
    console.error('Distribute Profit Error:', error);
    res.status(500).json({ message: 'Failed to distribute profit' });
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
    const goalLogQuery = { userId: memberId, action: 'goal_contribution' };

    const { category, search } = req.query;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
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
    let activity = [
      ...investments.map((i) => ({
        _id: i._id,
        type: i.type,
        category: 'investment',
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
        metadata: { balanceAfter: i.balanceAfter },
      })),
      ...profits.map((p) => ({
        _id: p._id,
        type: 'deposit',
        category: 'profit',
        amount: p.amount,
        date: p.date,
        description: `Profit Distribution - ${p.period}`,
        metadata: { share: p.investmentShare },
      })),
      ...repayments.map((r) => ({
        _id: r._id,
        type: 'withdrawal',
        category: 'repayment',
        amount: r.amount,
        date: r.date,
        description: r.notes || 'Loan Repayment',
        metadata: { loanId: r.loan },
      })),
      ...goalLogs.map((gl) => ({
        _id: gl._id,
        type: 'withdrawal',
        category: 'goal',
        amount: gl.metadata?.amount || 0,
        date: gl.createdAt,
        description: `Goal Allocation: ${gl.metadata?.title || 'Saving Goal'}`,
        metadata: { goalId: gl.metadata?.goalId },
      })),
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
  const { recipientIdentifier, amount, description } = req.body;
  const senderId = req.member._id;

  if (!recipientIdentifier || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Invalid recipient or amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await Member.findById(senderId).session(session);
    console.log(
      'Sender Balance:',
      sender.currentBalance,
      'Transfer Amount:',
      amount,
    );
    if (sender.currentBalance < parseFloat(amount)) {
      console.log('Insufficient balance error');
      throw new Error('Insufficient balance');
    }

    // Find recipient by email, phone, or account numbers
    console.log('Finding recipient for:', recipientIdentifier);
    const recipient = await Member.findOne({
      $or: [
        { email: recipientIdentifier.toLowerCase() },
        { phone: recipientIdentifier },
        {
          savingAccountNumber: {
            $regex: new RegExp(`^${recipientIdentifier}$`, 'i'),
          },
        },
        {
          currentAccountNumber: {
            $regex: new RegExp(`^${recipientIdentifier}$`, 'i'),
          },
        },
      ],
    }).session(session);

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to yourself');
    }

    const transferAmount = parseFloat(amount);

    // Update balances
    sender.currentBalance -= transferAmount;
    sender.totalWithdrawn += transferAmount;
    recipient.currentBalance += transferAmount;
    recipient.totalInvested += transferAmount;

    await sender.save({ session });
    await recipient.save({ session });

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      balanceAfter: sender.currentBalance,
      description: description || `Transfer to ${recipient.name}`,
      date: new Date(),
    });

    const recipientTransaction = new Investment({
      user: recipient.user,
      member: recipient._id,
      branchId: recipient.branchId,
      type: 'transfer_receive',
      amount: transferAmount,
      balanceAfter: recipient.currentBalance,
      description: description || `Transfer from ${sender.name}`,
      date: new Date(),
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
  const { senderId, recipientIdentifier, amount, description } = req.body;

  if (!senderId || !recipientIdentifier || !amount || parseFloat(amount) <= 0) {
    return res
      .status(400)
      .json({ message: 'Invalid sender, recipient, or amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await Member.findById(senderId).session(session);
    if (!sender) {
      throw new Error('Sender member not found');
    }

    if (sender.currentBalance < parseFloat(amount)) {
      throw new Error('Insufficient balance in sender account');
    }

    // Find recipient by email, phone, or account numbers
    const recipient = await Member.findOne({
      $or: [
        { email: recipientIdentifier.toLowerCase() },
        { phone: recipientIdentifier },
        {
          savingAccountNumber: {
            $regex: new RegExp(`^${recipientIdentifier}$`, 'i'),
          },
        },
        {
          currentAccountNumber: {
            $regex: new RegExp(`^${recipientIdentifier}$`, 'i'),
          },
        },
      ],
    }).session(session);

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to the same member');
    }

    const transferAmount = parseFloat(amount);

    // Update balances
    sender.currentBalance -= transferAmount;
    sender.totalWithdrawn += transferAmount;
    recipient.currentBalance += transferAmount;
    recipient.totalInvested += transferAmount;

    await sender.save({ session });
    await recipient.save({ session });

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      balanceAfter: sender.currentBalance,
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
};
