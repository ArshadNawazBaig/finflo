const LoanGroup = require('../models/LoanGroup');
const GroupLoan = require('../models/GroupLoan');
const Customer = require('../models/Customer');
const { logActivity } = require('./activityLogController');
const { escapeRegExp } = require('../utils/stringUtils');

// Resolve the tenant scope, narrowing staff to their branch (mirrors the loans
// controller). Super admin sees all.
const scopeFor = (req) => {
  const query = req.user.isSuperAdmin
    ? {}
    : { user: req.user.effectiveOwnerId };
  if (req.user.role === 'staff') {
    const branchScope = req.user.managedBranchId || req.user.branchId;
    if (branchScope) query.branchId = branchScope;
  }
  return query;
};

// Validate that a list of customer ids all belong to the tenant; returns the
// normalized members array or throws a string message.
const buildMembers = async (members, ownerId) => {
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('A group needs at least one member.');
  }
  const out = [];
  const seen = new Set();
  for (const m of members) {
    const customerId = String(m.customer || m.customerId || m);
    if (seen.has(customerId)) continue;
    seen.add(customerId);
    const customer = await Customer.findOne({ _id: customerId, user: ownerId });
    if (!customer) throw new Error('One of the selected customers was not found.');
    out.push({
      customer: customerId,
      role: m.role === 'leader' ? 'leader' : 'member',
      status: 'active',
    });
  }
  return out;
};

// @desc   Create a joint-liability group
// @route  POST /api/groups
// @access Private (manage_loans)
const createGroup = async (req, res) => {
  try {
    const { name, branchId, members, guaranteePolicy, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    let memberDocs;
    try {
      memberDocs = await buildMembers(members, req.user.effectiveOwnerId);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const group = await LoanGroup.create({
      user: req.user.effectiveOwnerId,
      branchId: branchId || req.user.branchId || undefined,
      name,
      members: memberDocs,
      guaranteePolicy: guaranteePolicy || 'joint',
      notes,
    });

    await logActivity({
      userId: req.user._id,
      action: 'group_created',
      category: 'loan',
      details: `Created lending group "${name}" with ${memberDocs.length} members`,
      metadata: { groupId: group._id, memberCount: memberDocs.length },
      req,
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   List groups (paginated)
// @route  GET /api/groups
// @access Private
const getGroups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = scopeFor(req);

    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.name = { $regex: escapeRegExp(req.query.search), $options: 'i' };
    }

    const totalEntries = await LoanGroup.countDocuments(query);
    const data = await LoanGroup.find(query)
      .populate('members.customer', 'name')
      .populate('branchId', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      data,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get a single group with its loan cycles
// @route  GET /api/groups/:id
// @access Private
const getGroupById = async (req, res) => {
  try {
    const group = await LoanGroup.findOne({
      _id: req.params.id,
      ...scopeFor(req),
    })
      .populate('members.customer', 'name trustRating status')
      .populate('branchId', 'name');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const loans = await GroupLoan.find({
      group: group._id,
      user: req.user.effectiveOwnerId,
    })
      .populate('allocations.customer', 'name')
      .sort({ createdAt: -1 });

    res.json({ group, loans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update a group (name/members/policy/notes)
// @route  PUT /api/groups/:id
// @access Private
const updateGroup = async (req, res) => {
  try {
    const group = await LoanGroup.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const { name, members, guaranteePolicy, notes, branchId } = req.body;
    if (name !== undefined) group.name = name;
    if (guaranteePolicy !== undefined) group.guaranteePolicy = guaranteePolicy;
    if (notes !== undefined) group.notes = notes;
    if (branchId !== undefined) group.branchId = branchId || undefined;
    if (members !== undefined) {
      try {
        group.members = await buildMembers(members, req.user.effectiveOwnerId);
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    }

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete a group (only when it has no active loan cycles)
// @route  DELETE /api/groups/:id
// @access Private
const deleteGroup = async (req, res) => {
  try {
    const group = await LoanGroup.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const activeCycle = await GroupLoan.findOne({
      group: group._id,
      user: req.user.effectiveOwnerId,
      status: { $in: ['pending', 'active', 'overdue', 'defaulted'] },
    });
    if (activeCycle) {
      return res.status(400).json({
        message:
          'This group has active loan cycles. Close or complete them before deleting the group.',
      });
    }

    await group.deleteOne();
    await logActivity({
      userId: req.user._id,
      action: 'group_deleted',
      category: 'loan',
      details: `Deleted lending group "${group.name}"`,
      metadata: { groupId: group._id },
      req,
    });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
};
