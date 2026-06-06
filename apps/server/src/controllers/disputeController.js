const Dispute = require('../models/Dispute');
const Member = require('../models/Member');
const { logActivity } = require('./activityLogController');
const { createTransactionNotification } = require('../utils/notificationHelper');

const buildAdminTenantScope = (req) => {
  const scope = { user: req.user.effectiveOwnerId };
  if (req.user.role === 'staff') {
    const branchScope = req.user.managedBranchId || req.user.branchId;
    if (branchScope) scope.branchId = branchScope;
  }
  return scope;
};

// ── Member side ──────────────────────────────────────────────────────────────

/**
 * @desc    Member creates a dispute / grievance ticket.
 * @route   POST /api/disputes/portal
 * @access  Private (Member)
 */
const createPortalDispute = async (req, res) => {
  try {
    const {
      subject,
      description,
      category,
      priority,
      relatedTransaction,
      relatedLoan,
    } = req.body || {};

    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const member = req.member;
    const dispute = await Dispute.create({
      user: member.user,
      member: member._id,
      branchId: member.branchId,
      subject: subject.trim(),
      description,
      category: category || 'other',
      priority: priority || 'medium',
      relatedTransaction: relatedTransaction || undefined,
      relatedLoan: relatedLoan || undefined,
      messages: [
        {
          authorType: 'member',
          authorId: member._id,
          authorName: member.name,
          body: description,
        },
      ],
    });

    // Notify the business admin (tenant owner) so they see the ticket
    try {
      await createTransactionNotification({
        recipientId: member.user,
        recipientModel: 'User',
        title: 'New Dispute Filed',
        message: `${member.name} filed dispute ${dispute.ticketNumber}: ${subject.trim()}`,
        type: 'warning',
        branchId: member.branchId,
        action: 'dispute_filed',
      });
    } catch (e) {
      console.error('[Dispute] admin notify error:', e.message);
    }

    res.status(201).json(dispute);
  } catch (error) {
    console.error('Create Portal Dispute Error:', error);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
};

/**
 * @desc    Member lists their own disputes.
 * @route   GET /api/disputes/portal
 * @access  Private (Member)
 */
const listPortalDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({ member: req.member._id })
      .select('ticketNumber subject category priority status slaDeadline resolvedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load disputes' });
  }
};

/**
 * @desc    Member fetches one of their own disputes (with thread).
 * @route   GET /api/disputes/portal/:id
 * @access  Private (Member)
 */
const getPortalDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findOne({
      _id: req.params.id,
      member: req.member._id,
    }).lean();
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dispute' });
  }
};

/**
 * @desc    Member appends a reply to their dispute thread.
 * @route   POST /api/disputes/portal/:id/reply
 * @access  Private (Member)
 */
const replyPortalDispute = async (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Reply body is required' });
    }

    const dispute = await Dispute.findOne({
      _id: req.params.id,
      member: req.member._id,
    });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (dispute.status === 'closed') {
      return res.status(400).json({ message: 'Dispute is closed' });
    }

    dispute.messages.push({
      authorType: 'member',
      authorId: req.member._id,
      authorName: req.member.name,
      body: body.trim(),
    });
    // If staff had pushed it to awaiting_member, member's reply moves it back.
    if (dispute.status === 'awaiting_member') {
      dispute.status = 'in_progress';
    }
    await dispute.save();
    res.json(dispute);
  } catch (error) {
    console.error('Reply Portal Dispute Error:', error);
    res.status(500).json({ message: 'Failed to post reply' });
  }
};

// ── Admin side ──────────────────────────────────────────────────────────────

/**
 * @desc    Admin lists disputes with filters (status, priority, branch).
 * @route   GET /api/disputes
 * @access  Private (Admin)
 */
const listDisputes = async (req, res) => {
  try {
    const scope = buildAdminTenantScope(req);
    const { status, priority, page = 1, limit = 25 } = req.query;
    const q = { ...scope };
    if (status) q.status = status;
    if (priority) q.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [disputes, total] = await Promise.all([
      Dispute.find(q)
        .populate('member', 'name accountNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments(q),
    ]);

    // Surface SLA breach flag without storing it
    const now = Date.now();
    const enriched = disputes.map((d) => ({
      ...d,
      slaBreached:
        !['resolved', 'closed'].includes(d.status) &&
        d.slaDeadline &&
        new Date(d.slaDeadline).getTime() < now,
    }));

    res.json({ disputes: enriched, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('List Disputes Error:', error);
    res.status(500).json({ message: 'Failed to load disputes' });
  }
};

/**
 * @desc    Admin fetches single dispute (full thread + related refs).
 * @route   GET /api/disputes/:id
 * @access  Private (Admin)
 */
const getDispute = async (req, res) => {
  try {
    const scope = buildAdminTenantScope(req);
    const dispute = await Dispute.findOne({ _id: req.params.id, ...scope })
      .populate('member', 'name accountNumber email phone')
      .populate('relatedLoan', 'principal status')
      .populate('relatedTransaction', 'amount type category date')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .lean();
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.slaBreached =
      !['resolved', 'closed'].includes(dispute.status) &&
      dispute.slaDeadline &&
      new Date(dispute.slaDeadline).getTime() < Date.now();

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dispute' });
  }
};

/**
 * @desc    Admin updates dispute status / priority / assignment.
 * @route   PATCH /api/disputes/:id
 * @access  Private (Admin)
 */
const updateDispute = async (req, res) => {
  try {
    const scope = buildAdminTenantScope(req);
    const dispute = await Dispute.findOne({ _id: req.params.id, ...scope });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const { status, priority, assignedTo, resolution } = req.body || {};
    let transitioned = false;
    let resolvedNow = false;

    if (priority && Dispute.slaHoursFor(priority)) {
      dispute.priority = priority;
    }
    if (assignedTo !== undefined) {
      dispute.assignedTo = assignedTo || undefined;
    }
    if (
      status &&
      ['open', 'in_progress', 'awaiting_member', 'resolved', 'closed'].includes(status)
    ) {
      if (status !== dispute.status) transitioned = true;
      dispute.status = status;
      if (status === 'resolved' && !dispute.resolvedAt) {
        dispute.resolvedAt = new Date();
        dispute.resolvedBy = req.user._id;
        resolvedNow = true;
      }
      if (status === 'in_progress' && !dispute.firstResponseAt) {
        dispute.firstResponseAt = new Date();
      }
    }
    if (resolution !== undefined) {
      dispute.resolution = resolution;
    }

    // SLA breach stamp (only set once, when first observed past deadline).
    if (
      !dispute.slaBreachedAt &&
      !['resolved', 'closed'].includes(dispute.status) &&
      dispute.slaDeadline &&
      new Date(dispute.slaDeadline).getTime() < Date.now()
    ) {
      dispute.slaBreachedAt = new Date();
    }

    await dispute.save();

    if (transitioned) {
      try {
        await createTransactionNotification({
          recipientId: dispute.member,
          title: `Dispute ${dispute.ticketNumber} — ${dispute.status.replace('_', ' ')}`,
          message: resolvedNow
            ? `Your dispute has been resolved. Resolution: ${dispute.resolution || 'see ticket details'}`
            : `Status updated to ${dispute.status.replace('_', ' ')}.`,
          type: resolvedNow ? 'success' : 'info',
          branchId: dispute.branchId,
          action: 'dispute_updated',
        });
      } catch (e) {
        console.error('[Dispute] member notify error:', e.message);
      }
    }

    await logActivity({
      userId: req.user._id,
      action: 'dispute_updated',
      category: 'support',
      details: `Dispute ${dispute.ticketNumber} updated (${dispute.status})`,
      metadata: { disputeId: dispute._id, status: dispute.status, priority: dispute.priority },
      req,
    });

    res.json(dispute);
  } catch (error) {
    console.error('Update Dispute Error:', error);
    res.status(500).json({ message: 'Failed to update dispute' });
  }
};

/**
 * @desc    Admin/staff appends a reply to the dispute thread.
 * @route   POST /api/disputes/:id/reply
 * @access  Private (Admin)
 */
const replyDispute = async (req, res) => {
  try {
    const scope = buildAdminTenantScope(req);
    const { body, setStatus } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Reply body is required' });
    }

    const dispute = await Dispute.findOne({ _id: req.params.id, ...scope });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (dispute.status === 'closed') {
      return res.status(400).json({ message: 'Dispute is closed' });
    }

    dispute.messages.push({
      authorType: 'staff',
      authorId: req.user._id,
      authorName: req.user.name,
      body: body.trim(),
    });
    if (!dispute.firstResponseAt) {
      dispute.firstResponseAt = new Date();
      if (dispute.status === 'open') dispute.status = 'in_progress';
    }
    if (setStatus && ['in_progress', 'awaiting_member'].includes(setStatus)) {
      dispute.status = setStatus;
    }
    await dispute.save();

    try {
      await createTransactionNotification({
        recipientId: dispute.member,
        title: `Reply on Dispute ${dispute.ticketNumber}`,
        message: body.trim().slice(0, 140),
        type: 'info',
        branchId: dispute.branchId,
        action: 'dispute_reply',
      });
    } catch (e) {
      console.error('[Dispute] member notify error:', e.message);
    }

    res.json(dispute);
  } catch (error) {
    console.error('Reply Dispute Error:', error);
    res.status(500).json({ message: 'Failed to post reply' });
  }
};

/**
 * @desc    Admin dashboard summary: open count, SLA breached, by priority.
 * @route   GET /api/disputes/stats/summary
 * @access  Private (Admin)
 */
const getDisputeStats = async (req, res) => {
  try {
    const scope = buildAdminTenantScope(req);
    const now = new Date();

    const [open, inProgress, awaiting, resolvedThisMonth, slaBreached] = await Promise.all([
      Dispute.countDocuments({ ...scope, status: 'open' }),
      Dispute.countDocuments({ ...scope, status: 'in_progress' }),
      Dispute.countDocuments({ ...scope, status: 'awaiting_member' }),
      Dispute.countDocuments({
        ...scope,
        status: 'resolved',
        resolvedAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      }),
      Dispute.countDocuments({
        ...scope,
        status: { $nin: ['resolved', 'closed'] },
        slaDeadline: { $lt: now },
      }),
    ]);

    res.json({
      open,
      inProgress,
      awaitingMember: awaiting,
      resolvedThisMonth,
      slaBreached,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dispute stats' });
  }
};

module.exports = {
  createPortalDispute,
  listPortalDisputes,
  getPortalDispute,
  replyPortalDispute,
  listDisputes,
  getDispute,
  updateDispute,
  replyDispute,
  getDisputeStats,
};
