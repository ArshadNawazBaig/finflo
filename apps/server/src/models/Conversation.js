const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Array of participants — can be Member or User (staff/admin)
    participants: [
      {
        participantId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        participantModel: {
          type: String,
          required: true,
          enum: ['Member', 'User'],
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    // Map of participantId -> unread count
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    // Serverless Real-time Sync (Vercel Fix)
    // Map of participantId -> Date (expires after 5 seconds of inactivity)
    typingStatus: {
      type: Map,
      of: Date,
      default: {},
    },
    recordingStatus: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true },
);

// Index for fast lookup by participant
conversationSchema.index({ 'participants.participantId': 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
