const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Bug Report',
        'Feature Request',
        'Billing',
        'General Assistance',
        'Other',
      ],
      default: 'General Assistance',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isEdited: {
          type: Boolean,
          default: false,
        },
        attachments: [
          {
            url: { type: String, required: true },
            publicId: { type: String, required: true },
            fileType: { type: String, required: true }, // 'image' or 'file'
            originalName: { type: String, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
