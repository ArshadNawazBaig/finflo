const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One review per business
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    reviewerRole: {
      type: String,
      trim: true,
      default: 'Business Owner',
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Review', reviewSchema);
