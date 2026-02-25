const Role = require('../models/Role');
const User = require('../models/User');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Admin/Super Admin)
const getRoles = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    // Roles created by this user or system roles
    const roles = await Role.find({
      $or: [{ user: userId }, { isSystem: true }],
    }).sort({ createdAt: -1 });

    res.json(roles);
  } catch (error) {
    console.error('Get Roles Error:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (Admin/Super Admin)
const createRole = async (req, res) => {
  try {
    const { name, permissions, description, branchId } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '_');

    // Check if slug already exists for this user
    const existingRole = await Role.findOne({
      slug,
      user: req.user.effectiveOwnerId,
    });
    if (existingRole) {
      return res
        .status(400)
        .json({ message: 'A role with this name already exists' });
    }

    const role = await Role.create({
      name,
      slug,
      permissions: permissions || [],
      description: description || '',
      branchId: branchId || null,
      user: req.user.effectiveOwnerId,
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ message: 'Failed to create role' });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private (Admin/Super Admin)
const updateRole = async (req, res) => {
  try {
    const { name, permissions, description, branchId } = req.body;
    const { id } = req.params;

    const role = await Role.findOne({
      _id: id,
      user: req.user.effectiveOwnerId,
    });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystem) {
      return res
        .status(403)
        .json({ message: 'System roles cannot be modified' });
    }

    if (name) {
      role.name = name;
      role.slug = name.toLowerCase().replace(/\s+/g, '_');
    }
    if (permissions) role.permissions = permissions;
    if (description !== undefined) role.description = description;
    if (branchId !== undefined) role.branchId = branchId;

    await role.save();
    res.json(role);
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private (Admin/Super Admin)
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findOne({
      _id: id,
      user: req.user.effectiveOwnerId,
    });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystem) {
      return res
        .status(403)
        .json({ message: 'System roles cannot be deleted' });
    }

    // Check if any users are using this role
    const usersWithRole = await User.countDocuments({ roleRef: id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        message: 'Cannot delete role that is assigned to one or more users',
      });
    }

    await role.deleteOne();
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete Role Error:', error);
    res.status(500).json({ message: 'Failed to delete role' });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
