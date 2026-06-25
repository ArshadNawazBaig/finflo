const mongoose = require('mongoose');

/**
 * Department — a tenant-scoped payroll department (Sales, Engineering, …). Acts
 * as the managed pick-list behind the employee `department` field. Departments
 * are tenant-wide (shared across branches); renaming one cascades to every
 * employee that referenced the old name (see departmentController.updateDepartment).
 */
const departmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// One department name per tenant.
departmentSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
