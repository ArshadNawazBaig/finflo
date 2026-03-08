const mongoose = require('mongoose');

const externalTransferSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    direction: {
      type: String,
      enum: ['send', 'receive'],
      required: true,
    },
    bankType: {
      type: String,
      enum: ['wallet', 'bank'],
      required: true,
    },
    bankName: {
      type: String,
      required: true, // e.g. 'JazzCash', 'UBL', 'HBL'
    },
    accountIdentifier: {
      type: String,
      required: true, // IBAN for banks, mobile number for wallets
    },
    accountTitle: {
      type: String, // optional, for bank transfers
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Completed',
    },
    referenceId: {
      type: String,
      unique: true,
    },
    balanceAfter: {
      type: Number,
    },
  },
  { timestamps: true },
);

// Auto-generate reference ID before saving (async style — no next() required)
externalTransferSchema.pre('save', async function () {
  if (!this.referenceId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.referenceId = `EXT-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('ExternalTransfer', externalTransferSchema);
