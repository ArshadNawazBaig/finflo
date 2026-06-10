const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branding: {
      companyName: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      primaryColor: { type: String, default: '' },
      secondaryColor: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true },
    // The tenant's default branch. New members (admin-created without an explicit
    // branch, and self/Google-registered members) are attributed here until an
    // admin/manager moves them. Exactly one branch per owner should carry this
    // flag — enforced in branchController.setDefaultBranch (and the first branch a
    // tenant creates is auto-flagged). See utils/branchUtils.getDefaultBranchId.
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Fast lookup of a tenant's default branch.
branchSchema.index({ owner: 1, isDefault: 1 });

module.exports = mongoose.model('Branch', branchSchema);
