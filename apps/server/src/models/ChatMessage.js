const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['Member', 'User'],
    },
    content: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'audio'],
      default: 'text',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // IDs of participants who have read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true },
);

chatMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
