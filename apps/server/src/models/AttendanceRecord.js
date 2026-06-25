const mongoose = require('mongoose');

/**
 * AttendanceRecord — one row per employee per day (manual entry for v1). The
 * unique (user, employee, date) index prevents duplicate attendance for a day,
 * so marking is an idempotent upsert. `date` is normalised to midnight by the
 * controller before writing.
 */
const attendanceRecordSchema = new mongoose.Schema(
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
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
      default: 'present',
    },
    checkIn: { type: String, default: '' }, // "HH:mm"
    checkOut: { type: String, default: '' }, // "HH:mm"
    hoursWorked: { type: Number, default: 0, min: 0 },
    overtime: { type: Number, default: 0, min: 0 }, // hours beyond standard
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

// One attendance row per employee per day.
attendanceRecordSchema.index(
  { user: 1, employee: 1, date: 1 },
  { unique: true },
);
attendanceRecordSchema.index({ user: 1, date: 1 });
attendanceRecordSchema.index({ user: 1, branchId: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
