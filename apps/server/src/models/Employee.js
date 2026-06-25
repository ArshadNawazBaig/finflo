const mongoose = require('mongoose');
const { encryptFields, decryptFields } = require('../utils/encryption');
const { applyMoneySetter } = require('../utils/money');

/**
 * Employee — the payroll equivalent of Member/Customer.
 *
 * Tenant-scoped (`user`) and branch-scoped (`branchId`). Sensitive PII (cnic,
 * phone, address, bankAccountNumber) is encrypted at rest, mirroring the Member
 * model. Salary/allowance amounts are NOT encrypted — payroll reports aggregate
 * ($sum) on them, and encrypting numeric fields breaks aggregation. A `Customer`
 * link (optional) exposes the lending side (loans/savings) for payroll
 * deductions; loans hang off Customer, not Member.
 */
const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    // Auto-generated in pre('validate') (EMP-000001). Required fields that are
    // auto-generated MUST be set in pre('validate'), not pre('save').
    employeeId: { type: String, required: true },

    name: { type: String, required: true, lowercase: true },
    email: { type: String, lowercase: true },
    phone: { type: String },
    cnic: { type: String, required: true },
    cnicHash: { type: String, index: true }, // SHA-256 for searchable lookups
    address: { type: String },
    dob: { type: Date },
    profileImage: { type: String, default: '' },

    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract'],
      default: 'full-time',
    },
    joiningDate: { type: Date, default: Date.now },
    probationEndDate: { type: Date },
    terminationDate: { type: Date },
    terminationReason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'on-leave', 'probation', 'terminated'],
      default: 'active',
    },

    // ── Compensation model ───────────────────────────────────────────
    // 'fixed'    — salaried: recurring basicSalary + allowances (below).
    // 'variable' — freelancer/contractor: no recurring salary; the pay for
    //              each month is entered on the draft payroll run. `payRate` /
    //              `payRateUnit` are an optional reference rate (informational).
    payType: {
      type: String,
      enum: ['fixed', 'variable'],
      default: 'fixed',
    },
    payRate: { type: Number, default: 0, min: 0 },
    payRateUnit: {
      type: String,
      enum: ['hour', 'day', 'month', 'task'],
      default: 'month',
    },

    // ── Salary structure (money fields → moneySetter) ────────────────
    // Used for `payType: 'fixed'`. Ignored for variable employees, whose gross
    // is set per payroll run.
    basicSalary: { type: Number, default: 0, min: 0 },
    houseRentAllowance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    transportAllowance: { type: Number, default: 0, min: 0 },
    otherAllowances: {
      type: [
        {
          label: { type: String, default: '' },
          amount: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    // Optional recurring savings deduction (informational unless wired through
    // the savings service inside the payroll transaction).
    savingsContribution: { type: Number, default: 0, min: 0 },

    // ── Tax / contribution config ────────────────────────────────────
    taxSlabType: { type: String, enum: ['flat', 'slab'], default: 'slab' },
    taxRate: { type: Number, default: 0, min: 0, max: 100 }, // used when taxSlabType = 'flat'
    providentFundEnabled: { type: Boolean, default: false },
    providentFundRate: { type: Number, default: 8.33, min: 0, max: 100 }, // % of basic
    eobiEnabled: { type: Boolean, default: false },

    // ── Bank info (account number encrypted at rest) ─────────────────
    bankName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankAccountNumberHash: { type: String, index: true },
    bankBranch: { type: String, default: '' },

    // ── Linked lending record (optional) ─────────────────────────────
    // Loans/savings hang off Customer. linkedMember is only for portal identity.
    linkedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    linkedMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },

    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: {
          type: String,
          enum: ['Contract', 'CNIC', 'Offer Letter', 'Other'],
          default: 'Other',
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────
employeeSchema.index({ user: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ user: 1, branchId: 1 });
employeeSchema.index({ user: 1, status: 1 });
employeeSchema.index({ user: 1, linkedCustomer: 1 });

// ── Auto-generate employeeId (pre-validate so the required check passes) ──────
employeeSchema.pre('validate', async function () {
  if (!this.employeeId) {
    const count = await mongoose
      .model('Employee')
      .countDocuments({ user: this.user });
    this.employeeId = `EMP-${String(count + 1).padStart(6, '0')}`;
  }
});

// ── PII Encryption Hooks (mirror Member) ─────────────────────────────────────
employeeSchema.pre('save', function () {
  encryptFields(
    this,
    ['cnic', 'phone', 'address', 'bankAccountNumber'],
    ['cnicHash', null, null, 'bankAccountNumberHash'],
  );
});

const decryptEmployeePII = (doc) => {
  if (!doc) return;
  decryptFields(doc, ['cnic', 'phone', 'address', 'bankAccountNumber']);
};

employeeSchema.post('findOne', decryptEmployeePII);
employeeSchema.post('findById', decryptEmployeePII);
employeeSchema.post('save', decryptEmployeePII);
employeeSchema.post('find', (docs) => {
  if (Array.isArray(docs)) docs.forEach(decryptEmployeePII);
});

// ── Money guardrail: round salary/allowance fields at rest ───────────────────
applyMoneySetter(employeeSchema, [
  'payRate',
  'basicSalary',
  'houseRentAllowance',
  'medicalAllowance',
  'transportAllowance',
  'savingsContribution',
  'otherAllowances.amount',
]);

module.exports = mongoose.model('Employee', employeeSchema);
