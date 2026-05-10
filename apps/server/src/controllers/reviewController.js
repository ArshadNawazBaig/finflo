const Review = require('../models/Review');

// @desc    Get all approved reviews for landing page
// @route   GET /api/reviews/public
// @access  Public
exports.getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('businessName reviewerName reviewerRole content rating createdAt')
      .lean();

    res.status(200).json({ success: true, data: reviews });
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
    const { reviewerName, reviewerRole, content, rating } = req.body;

    if (!reviewerName || !content || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reviewer name, content, and rating',
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

    const review = await Review.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        businessName,
        reviewerName: reviewerName.trim(),
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
