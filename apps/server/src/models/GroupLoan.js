const mongoose = require('mongoose');

// A GroupLoan is one disbursement cycle for a LoanGroup. It is purely an
// orchestration/aggregation layer over individual Loan documents: each member
// gets their OWN Loan (sized to their request — per-member amounts), and the
// GroupLoan ties them together via `allocations`. The existing per-loan money
// engine (repayment service, late-fee + default crons, ledger) keeps running
// unchanged on each sub-loan; the aggregate fields here are denormalized
// roll-ups kept in sync inside the repayment transaction for fast list/stat
// reads.
const groupLoanSchema = new mongoose.Schema(
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
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanGroup',
      required: true,
    },
    allocations: [
      {
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
          required: true,
        },
        // The individual Loan doc created for this member. The whole money
        // engine operates on this; the GroupLoan never holds a balance of
        // its own beyond the roll-ups below.
        loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
        principal: { type: Number, required: true },
      },
    ],
    // Shared terms applied to every sub-loan so their schedules stay aligned
    // for group-meeting collection.
    rate: { type: Number, required: true },
    duration: { type: Number, required: true },
    interestType: {
      type: String,
      enum: ['simple', 'emi', 'compound'],
      default: 'simple',
    },
    startDate: { type: Date, required: true },
    // Denormalized aggregates (sum across sub-loans), refreshed inside the
    // disbursement/repayment transactions.
    totalPrincipal: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalLateFees: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'active', 'overdue', 'completed', 'defaulted', 'renewed'],
      default: 'pending',
    },
    // Supports repeat group cycles (a group that pays off — or rolls over —
    // cycle 1 and borrows again as cycle 2).
    cycleNumber: { type: Number, default: 1 },
    // ── Renewal linkage (mirrors Loan's) ─────────────────────────────────────
    // renewedFrom is set on the NEW cycle and points back to the cycle it
    // renewed; renewedTo is set on the OLD cycle and points forward. 'extend'
    // mutates the same cycle in place and bumps renewalCount/lastRenewedAt.
    renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupLoan' },
    renewedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupLoan' },
    renewalType: { type: String, enum: ['rollover', 'topup', 'extend'] },
    renewalCount: { type: Number, default: 0 },
    lastRenewedAt: { type: Date },
  },
  { timestamps: true },
);

groupLoanSchema.index({ user: 1 });
groupLoanSchema.index({ group: 1 });
groupLoanSchema.index({ branchId: 1 });
groupLoanSchema.index({ status: 1 });
groupLoanSchema.index({ createdAt: -1 });

// Money guardrail (P1.3): round all money fields to 2dp at rest so a fractional
// paisa can never be persisted, even if a caller forgets to round.
require('../utils/money').applyMoneySetter(groupLoanSchema, [
  'totalPrincipal',
  'totalOutstanding',
  'totalPaid',
  'totalLateFees',
  'allocations.principal',
  'rate',
]);

module.exports = mongoose.model('GroupLoan', groupLoanSchema);
