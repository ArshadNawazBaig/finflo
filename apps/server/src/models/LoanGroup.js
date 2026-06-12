const mongoose = require('mongoose');

// A LoanGroup is a standing joint-liability group of borrowers (the core
// microfinance methodology). It holds the membership and the guarantee policy;
// the actual lending happens through GroupLoan "cycles", each of which fans out
// to one individual Loan per member. The group is the social collateral: when
// any member's sub-loan goes overdue/defaulted the whole group is flagged
// `at_risk` and new group lending is frozen until it recovers.
const loanGroupSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    name: { type: String, required: true },
    members: [
      {
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
          required: true,
        },
        // 'leader' is informational (the group's point of contact); it carries
        // no extra liability — joint guarantee is shared equally.
        role: { type: String, enum: ['leader', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['active', 'exited'], default: 'active' },
      },
    ],
    status: {
      type: String,
      enum: ['forming', 'active', 'at_risk', 'closed'],
      default: 'forming',
    },
    // Documents the liability model. 'joint' (all-for-one) is what drives the
    // at-risk cascade; 'several' (each only liable for their own) and 'none'
    // are recorded for reporting but treated like individual loans.
    guaranteePolicy: {
      type: String,
      enum: ['joint', 'several', 'none'],
      default: 'joint',
    },
    notes: { type: String },
  },
  { timestamps: true },
);

loanGroupSchema.index({ user: 1 });
loanGroupSchema.index({ branchId: 1 });
loanGroupSchema.index({ status: 1 });
loanGroupSchema.index({ 'members.customer': 1 });

module.exports = mongoose.model('LoanGroup', loanGroupSchema);
