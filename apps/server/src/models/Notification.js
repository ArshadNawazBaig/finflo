const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['User', 'Member'],
      default: 'User',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'error'],
      default: 'info',
    },
    read: { type: Boolean, default: false },
    link: { type: String }, // URL to redirect to on click
    action: { type: String }, // Optional action key for frontend logic
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
