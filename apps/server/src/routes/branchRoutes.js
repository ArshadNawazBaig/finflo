const express = require('express');
const router = express.Router();
const {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
} = require('../controllers/branchController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, admin, createBranch).get(protect, getBranches);

router.route('/:id').get(protect, getBranch).put(protect, admin, updateBranch);

module.exports = router;
