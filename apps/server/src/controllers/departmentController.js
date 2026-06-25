const mongoose = require('mongoose');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { logActivity } = require('./activityLogController');

// @desc   List departments (paginated; default limit high enough for a pick-list)
// @route  GET /api/payroll/departments
// @access Private (manage_payroll)
const getDepartments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const query = { user: req.user.effectiveOwnerId };

    const totalEntries = await Department.countDocuments(query);
    const data = await Department.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Attach a live employee count per department (by name) so the UI can show
    // usage and guard deletes.
    const counts = await Employee.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.effectiveOwnerId),
          status: { $ne: 'terminated' },
        },
      },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const countMap = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});
    const withCounts = data.map((d) => ({
      ...d.toObject(),
      employeeCount: countMap[d.name] || 0,
    }));

    res.json({
      data: withCounts,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Create a department
// @route  POST /api/payroll/departments
// @access Private (manage_payroll)
const createDepartment = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });

    const department = await Department.create({
      user: req.user.effectiveOwnerId,
      name,
      description: req.body.description || '',
    });

    await logActivity({
      userId: req.user._id,
      action: 'department_created',
      category: 'payroll',
      details: `Created department "${name}"`,
      metadata: { departmentId: department._id },
      req,
    });

    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A department with this name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update / rename a department (rename cascades to employees)
// @route  PUT /api/payroll/departments/:id
// @access Private (manage_payroll)
const updateDepartment = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const department = await Department.findOne({ _id: req.params.id, user: ownerId });
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const oldName = department.name;
    const newName = req.body.name !== undefined ? req.body.name.trim() : oldName;
    if (!newName) return res.status(400).json({ message: 'name is required' });

    department.name = newName;
    if (req.body.description !== undefined) department.description = req.body.description;
    if (req.body.isActive !== undefined) department.isActive = req.body.isActive;
    await department.save();

    // Keep the denormalised employee.department string consistent on rename.
    if (newName !== oldName) {
      await Employee.updateMany(
        { user: ownerId, department: oldName },
        { $set: { department: newName } },
      );
    }

    res.json(department);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A department with this name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete a department (blocked while employees still reference it)
// @route  DELETE /api/payroll/departments/:id
// @access Private (manage_payroll)
const deleteDepartment = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const department = await Department.findOne({ _id: req.params.id, user: ownerId });
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const inUse = await Employee.countDocuments({
      user: ownerId,
      department: department.name,
      status: { $ne: 'terminated' },
    });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${inUse} active employee(s) are assigned to "${department.name}". Reassign them first.`,
      });
    }

    await department.deleteOne();

    await logActivity({
      userId: req.user._id,
      action: 'department_deleted',
      category: 'payroll',
      details: `Deleted department "${department.name}"`,
      metadata: { departmentId: department._id },
      req,
    });

    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
