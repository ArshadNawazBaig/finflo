const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // The business owner
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    name: { type: String, required: true, lowercase: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          const { validateEmail } = require('../utils/emailValidator');
          return validateEmail(v).isValid;
        },
        message: (props) => {
          const { validateEmail } = require('../utils/emailValidator');
          return validateEmail(props.value).message;
        },
      },
    },
    phone: { type: String, required: true },
    address: { type: String },
    profilePicture: { type: String },
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
    cnic: { type: String, required: true },
    job: { type: String },
    jobDetail: { type: String },
    monthlyIncome: { type: Number },
    signature: { type: String, default: '' },
    nominee: {
      name: { type: String, default: '' },
      cnic: { type: String, default: '' },
      relation: { type: String, default: '' },
      cnicImage: { type: String, default: '' },
    },
    savingAccountNumber: { type: String, sparse: true },
    currentAccountNumber: { type: String, sparse: true },
    loanAccountNumber: { type: String, sparse: true },
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

// Prevent duplicate emails and CNICs PER USER (Tenant)
customerSchema.index({ user: 1, email: 1 }, { unique: true });
customerSchema.index({ user: 1, cnic: 1 }, { unique: true });

// Generate account numbers if missing
customerSchema.pre('save', async function () {
  if (!this.savingAccountNumber || !this.currentAccountNumber) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    const abbr = user?.businessAbbreviation || '';
    const count = (user?.customerCount || 0) + 100001;

    // Helper to generate account number: [ABBR]-[TYPE_INITIAL]-[COUNT][RANDOM] e.g. MLO-S-100001xxx
    const generateAcc = (prefix) => {
      const typeInitial = String(prefix).charAt(0).toUpperCase();
      const prefixStr = abbr ? `${abbr.toUpperCase()}-${typeInitial}` : prefix.toUpperCase();
      const base = `${prefixStr}-${count}`;
      const remaining = 13 - base.length;
      let randomDigits = '';
      if (remaining > 0) {
        for (let i = 0; i < remaining; i++) {
          randomDigits += Math.floor(Math.random() * 10);
        }
      }
      return `${base}${randomDigits}`;
    };

    if (!this.savingAccountNumber) {
      this.savingAccountNumber = generateAcc('SAV');
    }
    if (!this.currentAccountNumber) {
      this.currentAccountNumber = generateAcc('CUR');
    }
    if (!this.loanAccountNumber) {
      this.loanAccountNumber = generateAcc('LON');
    }
  }
});

module.exports = mongoose.model('Customer', customerSchema);
