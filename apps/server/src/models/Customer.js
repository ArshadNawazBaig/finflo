const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // The business owner
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isMember: { type: Boolean, default: false },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    trustRating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 10,
    },
  },
  { timestamps: true },
);

// Prevent duplicate emails PER USER (Tenant)
customerSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
