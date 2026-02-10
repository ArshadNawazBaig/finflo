const Member = require('../models/Member');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { canAddMember } = require('../utils/planLimits');
const { logActivity } = require('./activityLogController');

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
      name: customer.name,
      email: customer.email,
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
    const userId = req.user._id;
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    const query = { user: userId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const members = await Member.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('customer', 'name email');

    const count = await Member.countDocuments(query);

    res.json({
      data: members,
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
    const userId = req.user._id;
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
    if (req.user && member.user.toString() === req.user._id.toString()) {
      isAuthorized = true; // Admin viewing their member
    } else if (
      req.member &&
      req.member._id.toString() === member._id.toString()
    ) {
      isAuthorized = true; // Member viewing themselves
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
    const userId = req.user._id;
    const {
      name,
      email,
      phone,
      address,
      initialInvestment,
      profitRate,
      customerId,
    } = req.body;

    // Check if email already exists for this user
    const existingMember = await Member.findOne({ user: userId, email });
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
    const limitCheck = canAddMember(userPlan, memberCount);
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
      name,
      email,
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

    res.status(201).json(member);
  } catch (error) {
    console.error('Create Member Error:', error);
    res.status(500).json({ message: 'Failed to create member' });
  }
};

// Update member
const updateMember = async (req, res) => {
  try {
    const userId = req.user._id;
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
      { name, email, phone, address, status, profitRate },
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
};
