const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getPublicReviews,
  getMyReview,
  upsertReview,
  deleteReview,
} = require('../controllers/reviewController');

// Public — landing page testimonials
router.get('/public', getPublicReviews);

// Protected — business admin only
router.get('/mine', protect, admin, getMyReview);
router.post('/', protect, admin, upsertReview);
router.delete('/', protect, admin, deleteReview);

module.exports = router;
