const mongoose = require('mongoose');

const checkbookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    checkbookNumber: {
      type: String,
      required: true,
      unique: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfLeaves: {
      type: Number,
      required: true,
      enum: [25, 50, 100],
      default: 25,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'cancelled'],
      default: 'active',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    refunded: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
checkbookSchema.index({ user: 1, member: 1 });
checkbookSchema.index({ member: 1, status: 1 });
checkbookSchema.index({ checkbookNumber: 1 });

// Static: Generate next checkbook number for a business
checkbookSchema.statics.generateCheckbookNumber = async function (userId) {
  const lastCheckbook = await this.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select('checkbookNumber');

  let nextNum = 1;
  if (lastCheckbook && lastCheckbook.checkbookNumber) {
    const match = lastCheckbook.checkbookNumber.match(/CHK-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `CHK-${String(nextNum).padStart(5, '0')}`;
};

module.exports = mongoose.model('Checkbook', checkbookSchema);
