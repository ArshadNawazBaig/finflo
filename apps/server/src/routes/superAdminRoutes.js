const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemAnalytics,
  createSuperAdmin,
} = require('../controllers/superAdminController');

// All routes require authentication + super admin role
router.use(protect);
router.use(superAdminProtect);

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getSystemAnalytics);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Super Admin Management
router.post('/create-admin', createSuperAdmin);

module.exports = router;
