const Review = require('../models/Review');

// Simple seeded random for daily shuffle
const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

// @desc    Get top 5-star reviews for landing page (shuffled daily)
// @route   GET /api/reviews/public
// @access  Public
exports.getPublicReviews = async (req, res) => {
  try {
    // Only fetch approved 5-star reviews, populate user for live profile picture
    const reviews = await Review.find({ isApproved: true, rating: 5 })
      .populate('user', 'profilePicture name')
      .select('businessName reviewerName reviewerRole content rating profilePicture createdAt user')
      .lean();

    // Map reviews: prefer live profilePicture from User model over stale snapshot
    const mapped = reviews.map((r) => ({
      _id: r._id,
      businessName: r.businessName,
      reviewerName: r.reviewerName,
      reviewerRole: r.reviewerRole,
      content: r.content,
      rating: r.rating,
      profilePicture: r.user?.profilePicture || r.profilePicture || '',
      createdAt: r.createdAt,
    }));

    // Shuffle based on today's date so the order changes daily
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const rng = seededRandom(daySeed);

    const shuffled = [...mapped].sort(() => rng() - 0.5);

    // Return top 5
    res.status(200).json({ success: true, data: shuffled.slice(0, 5) });
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get current business's own review
// @route   GET /api/reviews/mine
// @access  Private (admin)
exports.getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user._id }).lean();
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching own review:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create or update own review (upsert)
// @route   POST /api/reviews
// @access  Private (admin)
exports.upsertReview = async (req, res) => {
  try {
    const { reviewerRole, content, rating } = req.body;

    if (!content || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide review content and rating',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    if (content.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Review content must be 300 characters or less',
      });
    }

    const businessName =
      req.user.businessName || req.user.name || 'FinFlo Business';

    // Auto-fill name and profile picture from the logged-in user
    const reviewerName = req.user.name || 'Business User';
    const profilePicture = req.user.profilePicture || '';

    const review = await Review.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        businessName,
        reviewerName,
        profilePicture,
        reviewerRole: (reviewerRole || 'Business Owner').trim(),
        content: content.trim(),
        rating: Math.round(rating),
        isApproved: true,
      },
      { upsert: true, new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: 'Review saved successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete own review
// @route   DELETE /api/reviews
// @access  Private (admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ user: req.user._id });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'No review found to delete',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
