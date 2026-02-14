const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // The business owner
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    name: { type: String, required: true, lowercase: true },
    email: { type: String, required: true, lowercase: true },
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
    cnic: { type: String },
    job: { type: String },
    monthlyIncome: { type: Number },
    savingAccountNumber: { type: String, sparse: true },
    currentAccountNumber: { type: String, sparse: true },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: {
          type: String,
          enum: [
            'CNIC',
            'Utility Bill',
            'Tax Return',
            'Proof of Residence',
            'Other',
          ],
          default: 'Other',
        },
        status: {
          type: String,
          enum: ['Pending', 'Verified', 'Rejected', 'Expired'],
          default: 'Pending',
        },
        expiryDate: { type: Date },
        isEncrypted: { type: Boolean, default: false },
        uploadedAt: { type: Date, default: Date.now },
        verifiedAt: { type: Date },
      },
    ],
  },
  { timestamps: true },
);

// Prevent duplicate emails PER USER (Tenant)
customerSchema.index({ user: 1, email: 1 }, { unique: true });

// Generate account numbers if missing
customerSchema.pre('save', async function () {
  if (!this.savingAccountNumber) {
    this.savingAccountNumber =
      'SAV-' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }
  if (!this.currentAccountNumber) {
    this.currentAccountNumber =
      'CUR-' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }
});

module.exports = mongoose.model('Customer', customerSchema);
