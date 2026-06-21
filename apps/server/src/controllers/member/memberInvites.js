const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Member = require('../../models/Member');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const MemberInvite = require('../../models/MemberInvite');
const { canAddMember } = require('../../utils/planLimits');
const { logActivity } = require('../activityLogController');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const { memberInviteEmail } = require('../../utils/emailTemplates');
const { getEmailBranding, hslTripletToHex } = require('../../utils/brandingUtils');
const { getDefaultBranchId } = require('../../utils/branchUtils');
const { validateEmail } = require('../../utils/emailValidator');
const { capitalizeName } = require('../../utils/stringUtils');
const { establishSession } = require('../../utils/authCookies');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Hash the raw token the same way the password-reset flow does, so only the
// hash is ever persisted.
const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

// Mint a fresh raw token + its hash + expiry. Returns the RAW token (emailed)
// and what to persist.
const mintInviteToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
};

// Resolve the client base URL exactly the way the member password-reset does:
// CLIENT_URL env (trailing slash trimmed) with a request-origin fallback.
const resolveClientUrl = (req) => {
  let clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) {
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      try {
        const url = new URL(origin);
        clientUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        clientUrl = 'http://localhost:5173';
      }
    } else {
      clientUrl = 'http://localhost:5173';
    }
  }
  return clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
};

const buildInviteUrl = (req, rawToken) =>
  `${resolveClientUrl(req)}/member/accept-invite/${rawToken}`;

// Mint a legacy member token (fallback for the auto-login path; mirrors the
// member auth controller's generateToken).
const generateMemberToken = (id) =>
  jwt.sign({ id, type: 'member' }, process.env.JWT_SECRET, { expiresIn: '1d' });

// @desc    Invite one or more members by email
// @route   POST /api/members/invite
// @access  Private (Admin/Staff)
const inviteMembers = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { emails, branchId, profitRate } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'emails must be a non-empty array' });
    }

    // Resolve branding once (best-effort) for all invite emails in this batch.
    const branding = await getEmailBranding(req.user, branchId);
    const invitedByName = req.user.name || '';

    const sent = [];
    const skipped = [];
    const errors = [];
    const now = Date.now();

    // De-dupe within the request body so the same email isn't processed twice.
    const seen = new Set();

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').toLowerCase().trim();

      if (!email) {
        errors.push({ email: rawEmail, reason: 'Email is required' });
        continue;
      }
      if (seen.has(email)) {
        skipped.push({ email, reason: 'duplicate in request' });
        continue;
      }
      seen.add(email);

      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        errors.push({ email, reason: emailCheck.message });
        continue;
      }

      // Already a member of this tenant → skip.
      const existingMember = await Member.findOne({ user: userId, email });
      if (existingMember) {
        skipped.push({ email, reason: 'already a member' });
        continue;
      }

      // A pending, non-expired invite already exists → resend to it instead of
      // creating a duplicate.
      let invite = await MemberInvite.findOne({
        user: userId,
        email,
        status: 'pending',
        expiresAt: { $gt: new Date(now) },
      });

      const { rawToken, tokenHash, expiresAt } = mintInviteToken();

      try {
        if (invite) {
          invite.tokenHash = tokenHash;
          invite.expiresAt = expiresAt;
          if (branchId) invite.branchId = branchId;
          if (profitRate !== undefined && profitRate !== null) {
            invite.profitRate = profitRate;
          }
          invite.invitedBy = req.user._id;
          invite.invitedByName = invitedByName;
          await invite.save();
        } else {
          invite = await MemberInvite.create({
            user: userId,
            email,
            tokenHash,
            expiresAt,
            branchId: branchId || null,
            profitRate:
              profitRate !== undefined && profitRate !== null ? profitRate : null,
            invitedBy: req.user._id,
            invitedByName,
          });
        }
      } catch (createErr) {
        errors.push({ email, reason: createErr.message || 'Failed to create invite' });
        continue;
      }

      // Email send is best-effort but failures are reported.
      const inviteUrl = buildInviteUrl(req, rawToken);
      try {
        const ok = await sendEmail({
          to: email,
          subject: `You're invited to join ${branding.brandName || 'us'}`,
          html: memberInviteEmail(inviteUrl, {
            businessName: branding.brandName,
            logoUrl: branding.logoUrl,
            brandColor: branding.brandColor,
            invitedByName,
          }),
        });
        if (ok) {
          sent.push({ email });
        } else {
          errors.push({ email, reason: 'email delivery failed' });
        }
      } catch (emailErr) {
        errors.push({ email, reason: emailErr.message || 'email delivery failed' });
      }
    }

    try {
      await logActivity({
        userId: req.user._id,
        action: 'members_invited',
        category: 'member',
        details: `Invited ${sent.length} member(s) by email (${skipped.length} skipped, ${errors.length} errors)`,
        metadata: { sent: sent.length, skipped: skipped.length, errors: errors.length },
        req,
      });
    } catch (_) {
      // non-fatal
    }

    return res.status(200).json({ sent, skipped, errors });
  } catch (error) {
    console.error('Invite Members Error:', error);
    return res.status(500).json({ message: 'Failed to send invites' });
  }
};

// @desc    List member invites (paginated, tenant-scoped)
// @route   GET /api/members/invites
// @access  Private (Admin/Staff)
const listInvites = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status } = req.query;

    const query = { user: userId };
    if (status) query.status = status;

    const totalEntries = await MemberInvite.countDocuments(query);
    const invites = await MemberInvite.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const now = Date.now();
    const data = invites.map((inv) => ({
      _id: inv._id,
      email: inv.email,
      status: inv.status,
      invitedByName: inv.invitedByName || '',
      branchId: inv.branchId || null,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt || null,
      createdAt: inv.createdAt,
      isExpired:
        inv.status === 'pending' &&
        inv.expiresAt &&
        new Date(inv.expiresAt).getTime() < now,
    }));

    return res.json({
      data,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('List Invites Error:', error);
    return res.status(500).json({ message: 'Failed to fetch invites' });
  }
};

// @desc    Resend a pending invite
// @route   POST /api/members/invites/:id/resend
// @access  Private (Admin/Staff)
const resendInvite = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;

    const invite = await MemberInvite.findOne({
      _id: req.params.id,
      user: userId,
    });
    // 404, not 403 — don't leak existence of another tenant's invite.
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    if (invite.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Cannot resend a ${invite.status} invite` });
    }

    const { rawToken, tokenHash, expiresAt } = mintInviteToken();
    invite.tokenHash = tokenHash;
    invite.expiresAt = expiresAt;
    invite.invitedBy = req.user._id;
    invite.invitedByName = req.user.name || invite.invitedByName;
    await invite.save();

    const branding = await getEmailBranding(req.user, invite.branchId);
    const inviteUrl = buildInviteUrl(req, rawToken);
    sendEmailAsync({
      to: invite.email,
      subject: `You're invited to join ${branding.brandName || 'us'}`,
      html: memberInviteEmail(inviteUrl, {
        businessName: branding.brandName,
        logoUrl: branding.logoUrl,
        brandColor: branding.brandColor,
        invitedByName: invite.invitedByName,
      }),
    });

    try {
      await logActivity({
        userId: req.user._id,
        action: 'member_invite_resent',
        category: 'member',
        details: `Resent member invite to ${invite.email}`,
        metadata: { inviteId: invite._id },
        req,
      });
    } catch (_) {
      // non-fatal
    }

    return res.json({ message: 'Invite resent', invite });
  } catch (error) {
    console.error('Resend Invite Error:', error);
    return res.status(500).json({ message: 'Failed to resend invite' });
  }
};

// @desc    Revoke an invite
// @route   DELETE /api/members/invites/:id
// @access  Private (Admin/Staff)
const revokeInvite = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;

    const invite = await MemberInvite.findOne({
      _id: req.params.id,
      user: userId,
    });
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    invite.status = 'revoked';
    await invite.save();

    try {
      await logActivity({
        userId: req.user._id,
        action: 'member_invite_revoked',
        category: 'member',
        details: `Revoked member invite to ${invite.email}`,
        metadata: { inviteId: invite._id },
        req,
      });
    } catch (_) {
      // non-fatal
    }

    return res.json({ message: 'Invite revoked' });
  } catch (error) {
    console.error('Revoke Invite Error:', error);
    return res.status(500).json({ message: 'Failed to revoke invite' });
  }
};

// ── PUBLIC (no auth) ─────────────────────────────────────────────────────────

// @desc    Look up an invite by raw token (public landing page)
// @route   GET /api/members/invite/:token
// @access  Public
const getInviteByToken = async (req, res) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const invite = await MemberInvite.findOne({ tokenHash });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    if (
      invite.status !== 'pending' ||
      new Date(invite.expiresAt).getTime() < Date.now()
    ) {
      return res
        .status(410)
        .json({ message: 'This invitation has expired or is no longer valid' });
    }

    const business = await User.findById(invite.user).select(
      'businessName name businessLogo primaryColor securityCode',
    );
    if (!business) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    return res.json({
      email: invite.email,
      businessName: business.businessName || business.name || '',
      businessLogo: business.businessLogo || null,
      brandColor: hslTripletToHex(business.primaryColor) || null,
      securityCode: business.securityCode,
    });
  } catch (error) {
    console.error('Get Invite Error:', error);
    return res.status(500).json({ message: 'Failed to load invite' });
  }
};

// @desc    Accept an invite — create an approved/active member and auto-login
// @route   POST /api/members/invite/:token/accept
// @access  Public
const acceptInvite = async (req, res) => {
  try {
    const { name, phone, cnic, password, address } = req.body;

    const tokenHash = hashToken(req.params.token);
    const invite = await MemberInvite.findOne({ tokenHash });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    if (
      invite.status !== 'pending' ||
      new Date(invite.expiresAt).getTime() < Date.now()
    ) {
      return res
        .status(410)
        .json({ message: 'This invitation has expired or is no longer valid' });
    }

    if (!name || !phone || !cnic || !password) {
      return res
        .status(400)
        .json({ message: 'name, phone, cnic and password are required' });
    }

    const business = await User.findById(invite.user).select(
      'plan customerCount securityCode',
    );
    if (!business) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    const ownerId = business._id;

    // Plan member-limit enforcement (same check as createMember).
    const userPlan = business.plan || 'Free';
    const memberCount = await Member.countDocuments({ user: ownerId });
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

    // Resolve the branch: invite.branchId, else the tenant's default branch.
    const branchId = invite.branchId || (await getDefaultBranchId(ownerId));

    // Uniqueness within the tenant. CNIC and phone are encrypted at rest, so we
    // match CNIC via its searchable sha256 hash (`cnicHash`) — the same pattern
    // createMember uses. Email is plaintext on Member and is locked to the
    // invite (the member is always created with invite.email).
    const { hash } = require('../../utils/encryption');
    const trimmedCnic = String(cnic).trim();
    const existingByEmail = await Member.findOne({
      user: ownerId,
      email: invite.email,
    });
    if (existingByEmail) {
      return res.status(400).json({
        message: 'A member with this email already exists in this business',
      });
    }
    const existingByCnic = await Member.findOne({
      user: ownerId,
      cnicHash: hash(trimmedCnic),
    });
    if (existingByCnic) {
      return res.status(400).json({
        message: 'A member with this CNIC already exists in this business',
      });
    }

    // ── Transaction: create member + customer + flip invite atomically ────────
    const session = await mongoose.startSession();
    let createdMember = null;
    try {
      await session.withTransaction(async () => {
        const memberDocs = await Member.create(
          [
            {
              user: ownerId,
              branchId,
              name,
              phone,
              email: invite.email,
              cnic: trimmedCnic,
              address,
              password,
              approvalStatus: 'approved',
              status: 'Active',
              isActive: true,
              mustChangePassword: false,
              ...(invite.profitRate !== undefined && invite.profitRate !== null
                ? { profitRate: invite.profitRate }
                : {}),
            },
          ],
          { session },
        );
        const member = memberDocs[0];

        // Auto-create the linked Customer record (mirrors the self-register flow).
        let customer = await Customer.findOne({
          user: ownerId,
          $or: [{ cnic: trimmedCnic }, { email: invite.email }],
        }).session(session);

        if (!customer) {
          const customerDocs = await Customer.create(
            [
              {
                user: ownerId,
                branchId,
                name,
                phone,
                email: invite.email,
                cnic: trimmedCnic,
                address,
                isMember: true,
                memberId: member._id,
              },
            ],
            { session },
          );
          customer = customerDocs[0];
        } else {
          customer.isMember = true;
          customer.memberId = member._id;
          await customer.save({ session });
        }

        member.customer = customer._id;
        await member.save({ session });

        // Flip the invite to accepted.
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        invite.memberId = member._id;
        await invite.save({ session });

        createdMember = member;
      });
    } catch (txErr) {
      // withTransaction aborts automatically on a thrown error, but guard the
      // session is ended in finally below. Surface a clean failure.
      console.error('Accept Invite Transaction Error:', txErr);
      await session.endSession();
      // Duplicate-key races (two concurrent accepts) surface as a 400.
      if (txErr.code === 11000) {
        return res
          .status(400)
          .json({ message: 'A member with these details already exists' });
      }
      return res.status(500).json({ message: 'Failed to accept invitation' });
    }
    await session.endSession();

    // Bump the tenant's customer count (best-effort, outside the txn — mirrors
    // the non-transactional count bump used elsewhere).
    try {
      await User.findByIdAndUpdate(ownerId, { $inc: { customerCount: 1 } });
    } catch (_) {
      // non-fatal
    }

    try {
      await logActivity({
        userId: ownerId,
        action: 'member_invite_accepted',
        category: 'member',
        details: `Invited member ${capitalizeName(name)} accepted and was activated`,
        metadata: { memberId: createdMember._id, inviteId: invite._id },
        req,
      });
    } catch (_) {
      // non-fatal
    }

    // Auto-login: establish a revocable member session + access token, exactly
    // like the member-auth login does on success.
    let token = null;
    try {
      const sessionResult = await establishSession(req, res, {
        principalId: createdMember._id,
        principalModel: 'Member',
        tenant: ownerId,
      });
      token = sessionResult?.accessToken || generateMemberToken(createdMember._id);
    } catch (sessionErr) {
      console.error('[Invite] auto-login session failed:', sessionErr.message);
      token = generateMemberToken(createdMember._id);
    }

    const memberJson = createdMember.toObject();
    delete memberJson.password;

    return res.status(201).json({
      message: 'Invitation accepted. Welcome aboard!',
      token,
      member: memberJson,
      securityCode: business.securityCode,
    });
  } catch (error) {
    console.error('Accept Invite Error:', error);
    return res.status(500).json({ message: 'Failed to accept invitation' });
  }
};

module.exports = {
  inviteMembers,
  listInvites,
  resendInvite,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
};
