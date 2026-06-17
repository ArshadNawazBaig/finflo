const mongoose = require('mongoose');

/**
 * Session — one row per authenticated login (a "device session"), and the
 * server-side anchor that makes our otherwise-stateless JWT auth REVOCABLE.
 *
 * Design (refresh-token rotation with reuse detection):
 *  - Each row is a rotation *family*. `currentJti` is the id of the ONLY
 *    refresh token currently valid for this session. Every successful refresh
 *    rotates it (issues a new refresh token, bumps `currentJti`).
 *  - Presenting a refresh token whose `jti` is NOT `currentJti` means an
 *    already-rotated (i.e. stolen/replayed) token is in use → we revoke the
 *    session immediately (`reuse_detected`). This is the OAuth refresh-token
 *    rotation BCP and the mechanism that turns "we hope it didn't leak" into
 *    "we detect when it did".
 *  - Access tokens stay stateless + short-lived; revocation bites at refresh
 *    time (a revoked session can't refresh, and the access token expires within
 *    its TTL). `revokedAt` also lets an admin/owner force-logout instantly.
 *
 * Supports BOTH identity systems (business `User`s and portal `Member`s) via
 * `principalModel`, scoped to the owning business via `tenant` for per-tenant
 * audit and admin-driven revocation.
 *
 * Raw refresh tokens are NEVER stored — only their SHA-256 hash, as defence in
 * depth alongside the signed-JWT `jti`/`currentJti` check.
 */
const sessionSchema = new mongoose.Schema(
  {
    // Who this session belongs to (User = business side, Member = portal side).
    principal: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'principalModel',
    },
    principalModel: {
      type: String,
      required: true,
      enum: ['User', 'Member'],
    },
    // Owning business — lets admins revoke a member's sessions and keeps
    // session audit tenant-scoped.
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Rotation state — the currently-valid refresh token for this family.
    currentJti: { type: String, required: true },
    refreshTokenHash: { type: String, required: true },
    rotationCount: { type: Number, default: 0 },

    // Lifetimes. `expiresAt` is the absolute cap; idle is enforced against
    // `lastUsedAt` at refresh time. Mongo TTL index prunes long-dead rows.
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: Date.now },

    // Revocation.
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: [
        'logout',
        'logout_all',
        'reuse_detected',
        'revoked_by_user',
        'password_changed',
        'admin_revoked',
        'expired',
        'superseded_same_device',
        null,
      ],
      default: null,
    },

    // Device / audit metadata for the session-management UI.
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String }, // coarse label e.g. "Mobile · Chrome"
    // Stable per-install id sent by the client (X-Device-Id). Lets a re-login on
    // the SAME device supersede its previous session, so the session list shows
    // one row per device instead of stacking duplicate logins.
    deviceId: { type: String },
  },
  { timestamps: true },
);

// Lookups: by refresh jti (rotation), by principal (list/revoke-all), by tenant.
sessionSchema.index({ currentJti: 1 });
sessionSchema.index({ principal: 1, principalModel: 1, revokedAt: 1 });
// Same-device dedup: revoke a principal's prior active session on this device.
sessionSchema.index({ principal: 1, principalModel: 1, deviceId: 1, revokedAt: 1 });
sessionSchema.index({ tenant: 1, createdAt: -1 });
// TTL: drop rows 7 days past their absolute expiry so the collection self-cleans
// (revoked/expired sessions are kept briefly for audit, then garbage-collected).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// A session is usable only if not revoked and not past its absolute expiry.
sessionSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

module.exports = mongoose.model('Session', sessionSchema);
