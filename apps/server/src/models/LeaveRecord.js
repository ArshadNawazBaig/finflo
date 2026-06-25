const mongoose = require('mongoose');

/**
 * LeaveRecord — an employee leave request and its approval state. Tenant- and
 * branch-scoped. `leaveBalanceSnapshot` captures the remaining balance at the
 * time of the request for audit.
 */
const leaveRecordSchema = new mongoose.Schema(
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
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['annual', 'sick', 'casual', 'unpaid', 'maternity', 'paternity'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String, default: '' },
    leaveBalanceSnapshot: { type: Number },
  },
  { timestamps: true },
);

leaveRecordSchema.index({ user: 1, employee: 1, status: 1 });
leaveRecordSchema.index({ user: 1, status: 1, createdAt: -1 });
leaveRecordSchema.index({ user: 1, branchId: 1 });

module.exports = mongoose.model('LeaveRecord', leaveRecordSchema);
