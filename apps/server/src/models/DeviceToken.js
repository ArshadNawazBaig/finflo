const mongoose = require('mongoose');

// Push-notification device registration. One row per physical device token.
// Multi-tenant: `user` is always the tenant owner (admin id) so tokens can be
// scoped/cleaned per tenant; `owner` + `ownerType` identify the actual device
// owner (an end-customer Member or a business-side User).
const deviceTokenSchema = new mongoose.Schema(
  {
    // Tenant owner (admin) — for multi-tenant scoping.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The identity that owns this device.
    ownerType: {
      type: String,
      enum: ['Member', 'User'],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerType',
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
    },
    lastSeenAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
