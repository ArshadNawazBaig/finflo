const express = require('express');
const router = express.Router();
const {
  getStaff,
  createStaff,
  toggleStaffStatus,
  updateStaff,
  deleteStaff,
} = require('../controllers/staffController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin); // Only Admins/Super Admins can manage staff

router.route('/').get(getStaff).post(createStaff);
router.route('/:id').put(updateStaff).delete(deleteStaff);
router.patch('/:id/toggle', toggleStaffStatus);

module.exports = router;
