const mongoose = require('mongoose');

/**
 * MemberInvite — a tenant (business owner) invites a prospective member by
 * email. The raw token is emailed to the invitee but NEVER stored; only its
 * sha256 hash (`tokenHash`) is persisted, mirroring the password-reset token
 * pattern. When the invitee opens the link and submits their details they
 * become an approved, active Member and the invite flips to `accepted`.
 */
const memberInviteSchema = new mongoose.Schema(
  {
    // Tenant ref — the business owner who issued the invite. Required + indexed.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // sha256(rawToken). The raw token only ever lives in the email link.
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
    },
    // Branch the accepted member should land in (falls back to tenant default).
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    // Optional profit rate stamped onto the member on acceptance.
    profitRate: {
      type: Number,
      default: null,
    },
    // Who sent it (display only — denormalised so the list endpoint stays cheap).
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    invitedByName: {
      type: String,
      default: '',
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    // The member created when this invite was accepted.
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
  },
  { timestamps: true },
);

memberInviteSchema.index({ tokenHash: 1 });
memberInviteSchema.index({ user: 1, status: 1, createdAt: -1 });
memberInviteSchema.index({ user: 1, email: 1 });

module.exports = mongoose.model('MemberInvite', memberInviteSchema);
