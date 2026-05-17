const { runReminderService } = require('../services/reminderService');
const Member = require('../models/Member');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { broadcastEmail } = require('../utils/emailTemplates');
const { logActivity } = require('./activityLogController');

/**
 * Manually trigger a full scan for upcoming/overdue reminders.
 */
const triggerScan = async (req, res) => {
  try {
    // Run as an async background task to not block the response
    runReminderService();

    res.json({
      message:
        'Automated Communication scan triggered successfully. Check server logs for progress.',
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to trigger scan', error: error.message });
  }
};

/**
 * @desc    Send a custom announcement to many members in one request.
 * @route   POST /api/communication/bulk-email-members
 * @access  Private (Admin/Staff)
 *
 * Body: {
 *   scope: 'all' | 'active' | 'branch' | 'ids',
 *   memberIds?: ObjectId[],          // required when scope = 'ids'
 *   branchId?: ObjectId,             // required when scope = 'branch'
 *   subject: string,
 *   body: string,                    // plain text — auto-wrapped in template
 *   bodyHtml?: string,               // trusted HTML override (admin-authored)
 * }
 *
 * Fans out with bounded concurrency (5) and returns a per-recipient pass/fail
 * summary. Members without an email are skipped (not failures).
 */
const sendBulkEmailMembers = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      scope = 'active',
      memberIds = [],
      branchId,
      subject,
      body,
      bodyHtml,
    } = req.body || {};

    if (!subject || (!body && !bodyHtml)) {
      return res
        .status(400)
        .json({ message: 'subject and body are required' });
    }
    if (subject.length > 200) {
      return res.status(400).json({ message: 'subject too long (max 200)' });
    }
    if ((body || '').length > 50000 || (bodyHtml || '').length > 50000) {
      return res.status(400).json({ message: 'body too long (max 50000)' });
    }

    // Build member query based on scope. Staff with a managed branch are
    // confined to their branch regardless of `scope`.
    const query = { user: userId };
    if (scope === 'active') query.status = 'Active';
    if (scope === 'branch') {
      if (!branchId) {
        return res
          .status(400)
          .json({ message: 'branchId is required for scope=branch' });
      }
      query.branchId = branchId;
    }
    if (scope === 'ids') {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res
          .status(400)
          .json({ message: 'memberIds is required for scope=ids' });
      }
      query._id = { $in: memberIds };
    }
    if (req.user.role === 'staff') {
      const staffBranch = req.user.managedBranchId || req.user.branchId;
      if (staffBranch) query.branchId = staffBranch;
    }

    const members = await Member.find(query).select('name email branchId').lean();
    const eligible = members.filter((m) => m.email);
    const skippedNoEmail = members.length - eligible.length;

    if (eligible.length === 0) {
      return res.json({
        total: members.length,
        eligible: 0,
        sent: 0,
        failed: 0,
        skipped: skippedNoEmail,
        results: [],
        message: 'No members with an email on file matched the scope.',
      });
    }

    // Hard cap to protect SMTP quotas. 1000 is generous; tweak when we have
    // per-tenant quota tracking.
    const HARD_CAP = 1000;
    if (eligible.length > HARD_CAP) {
      return res.status(400).json({
        message: `Recipient count (${eligible.length}) exceeds the per-batch cap of ${HARD_CAP}. Narrow the scope and try again.`,
      });
    }

    const sender = await User.findById(userId).select(
      'businessName name businessLogo primaryColor',
    );
    const brandName = sender?.businessName || sender?.name || null;
    const logoUrl = sender?.businessLogo || null;
    const { hslTripletToHex } = require('../utils/brandingUtils');
    const brandColor = hslTripletToHex(sender?.primaryColor) || null;

    const html = broadcastEmail({
      title: subject,
      greeting: 'Hello,',
      bodyHtml: bodyHtml || undefined,
      bodyText: bodyHtml ? undefined : body,
      businessName: brandName,
      logoUrl,
      brandColor,
    });

    const sendOne = async (m) => {
      try {
        const ok = await sendEmail({ to: m.email, subject, html });
        return ok
          ? { memberId: m._id, email: m.email, ok: true }
          : { memberId: m._id, email: m.email, ok: false, reason: 'SMTP send failed' };
      } catch (err) {
        return { memberId: m._id, email: m.email, ok: false, reason: err.message };
      }
    };

    const CHUNK = 5;
    const results = [];
    for (let i = 0; i < eligible.length; i += CHUNK) {
      const slice = eligible.slice(i, i + CHUNK);
      const settled = await Promise.all(slice.map(sendOne));
      results.push(...settled);
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    await logActivity({
      userId: req.user._id,
      action: 'bulk_email_sent',
      category: 'communication',
      details: `Bulk email "${subject}" sent to ${sent}/${results.length} member(s)`,
      metadata: { scope, sent, failed, skipped: skippedNoEmail, total: members.length },
      req,
    });

    res.json({
      total: members.length,
      eligible: eligible.length,
      sent,
      failed,
      skipped: skippedNoEmail,
      results,
    });
  } catch (error) {
    console.error('sendBulkEmailMembers Error:', error);
    res.status(500).json({ message: 'Failed to send bulk email' });
  }
};

module.exports = { triggerScan, sendBulkEmailMembers };
