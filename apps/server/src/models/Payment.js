const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    status: {
      type: String,
      required: true,
      enum: ['succeeded', 'pending', 'failed', 'refunded'],
      default: 'succeeded',
    },
    stripePaymentIntentId: {
      type: String,
    },
    stripeInvoiceId: {
      type: String,
    },
    description: {
      type: String,
    },
    planName: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Payment', paymentSchema);
