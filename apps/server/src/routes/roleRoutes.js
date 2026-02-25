const express = require('express');
const router = express.Router();
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.route('/').get(getRoles).post(createRole);
router.route('/:id').put(updateRole).delete(deleteRole);

module.exports = router;
