const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Member = require('../models/Member');
const User = require('../models/User');
const Branch = require('../models/Branch');
const multer = require('multer');
const { chatStorage } = require('../config/cloudinary');

const chatUpload = multer({ storage: chatStorage });

// ─── Helper: get participant info from request ────────────────────────────────
const getRequester = (req) => {
  if (req.member) {
    return { id: req.member._id, model: 'Member' };
  }
  return { id: req.user._id, model: 'User' };
};

// ─── GET /api/chat/contacts ───────────────────────────────────────────────────
// For members: returns active staff/managers in their branch
// For admin/staff: returns all members in their branch
const getAvailableContacts = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (req.member) {
      // Member → get staff/managers in their branch
      const member = req.member;
      const branchId = member.branchId;

      let contacts = [];

      // Always show the business owner
      const owner = await User.findById(member.user).select(
        'name email role profilePicture lastLoginAt',
      );
      if (owner) {
        contacts.push({
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
          avatar: owner.profilePicture,
          model: 'User',
          isOnline: owner.lastLoginAt && owner.lastLoginAt > fiveMinutesAgo,
        });
      }

      if (branchId) {
        const staffUsers = await User.find({
          branchId,
          role: { $in: ['staff', 'admin'] },
          isActive: { $ne: false },
          _id: { $ne: owner?._id }, // Don't duplicate owner if they are in this branch
        }).select('name email role profilePicture lastLoginAt');

        const staffContacts = staffUsers.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.profilePicture,
          model: 'User',
          isOnline: u.lastLoginAt && u.lastLoginAt > fiveMinutesAgo,
        }));
        contacts = [...contacts, ...staffContacts];
      }

      return res.json(contacts);
    }

    // Staff/Admin → get members in their branch + other admins (for admin↔manager)
    const user = req.user;
    let contacts = [];

    if (user.role === 'admin' || user.role === 'super_admin') {
      // Admin/Super Admin can chat with all branch managers (staff with manager role)
      const managedBranches = await Branch.find({ manager: { $exists: true } });
      const managerIds = managedBranches.map((b) => b.manager).filter(Boolean);

      const managerUsers = await User.find({
        _id: { $in: managerIds },
        role: 'staff',
      }).select('name email role profilePicture lastLoginAt');

      contacts = managerUsers.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.profilePicture,
        model: 'User',
        isOnline: u.lastLoginAt && u.lastLoginAt > fiveMinutesAgo,
      }));

      // ALSO fetch Members for Admin/Super Admin
      const memberQuery =
        user.role === 'super_admin'
          ? { approvalStatus: 'approved' }
          : { user: user._id, approvalStatus: 'approved' };

      const members = await Member.find(memberQuery).select(
        'name email profilePicture lastLoginAt',
      );

      const memberContacts = members.map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        role: 'member',
        avatar: m.profilePicture,
        model: 'Member',
        isOnline: m.lastLoginAt && m.lastLoginAt > fiveMinutesAgo,
      }));

      contacts = [...contacts, ...memberContacts];
      return res.json(contacts);
    } else if (user.role === 'staff') {
      // Staff sees members in their branch OR members with no branch (unassigned) for their owner
      const branchId = user.branchId;
      const ownerId = user.effectiveOwnerId || user.ownerId;

      const members = await Member.find({
        user: ownerId,
        $or: [
          { branchId: branchId },
          { branchId: { $exists: false } },
          { branchId: null },
        ],
        approvalStatus: 'approved',
        isActive: true,
      }).select('name email profilePicture lastLoginAt');

      return res.json(
        members.map((m) => ({
          _id: m._id,
          name: m.name,
          email: m.email,
          role: 'member',
          avatar: m.profilePicture,
          model: 'Member',
          isOnline: m.lastLoginAt && m.lastLoginAt > fiveMinutesAgo,
        })),
      );
    }

    return res.json([]);
  } catch (error) {
    console.error('getAvailableContacts error:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

// ─── GET /api/chat/conversations ──────────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const { id, model } = getRequester(req);

    const conversations = await Conversation.find({
      participants: {
        $elemMatch: { participantId: id, participantModel: model },
      },
    })
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    // Enrich each conversation with the other participant's info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const other = conv.participants.find(
          (p) => p.participantId.toString() !== id.toString(),
        );
        let otherInfo = null;
        if (other) {
          const Model = other.participantModel === 'Member' ? Member : User;
          otherInfo = await Model.findById(other.participantId).select(
            'name email profilePicture lastLoginAt role',
          );
        }
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return {
          _id: conv._id,
          lastMessage: conv.lastMessage,
          lastActivity: conv.lastActivity,
          unreadCount: conv.unreadCount?.get(id.toString()) || 0,
          participant: otherInfo
            ? {
                _id: otherInfo._id,
                name: otherInfo.name,
                email: otherInfo.email,
                avatar: otherInfo.profilePicture,
                role: otherInfo.role,
                model: other.participantModel,
                isOnline:
                  otherInfo.lastLoginAt &&
                  otherInfo.lastLoginAt > fiveMinutesAgo,
              }
            : null,
        };
      }),
    );

    res.json(enriched);
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// ─── POST /api/chat/conversations ────────────────────────────────────────────
// Get or create a 1:1 conversation
const getOrCreateConversation = async (req, res) => {
  try {
    const { id, model } = getRequester(req);
    const { targetId, targetModel } = req.body;

    if (!targetId || !targetModel) {
      return res
        .status(400)
        .json({ message: 'targetId and targetModel required' });
    }

    // Find existing conversation
    let conv = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { participantId: id, participantModel: model } },
          {
            $elemMatch: {
              participantId: targetId,
              participantModel: targetModel,
            },
          },
        ],
      },
    }).populate('lastMessage');

    if (!conv) {
      conv = await Conversation.create({
        participants: [
          { participantId: id, participantModel: model },
          { participantId: targetId, participantModel: targetModel },
        ],
      });
    }

    // Return enriched
    const TargetModel = targetModel === 'Member' ? Member : User;
    const other = await TargetModel.findById(targetId).select(
      'name email profilePicture lastLoginAt role',
    );
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    res.json({
      _id: conv._id,
      lastMessage: conv.lastMessage,
      lastActivity: conv.lastActivity,
      unreadCount: conv.unreadCount?.get(id.toString()) || 0,
      participant: other
        ? {
            _id: other._id,
            name: other.name,
            email: other.email,
            avatar: other.profilePicture,
            role: other.role,
            model: targetModel,
            isOnline: other.lastLoginAt && other.lastLoginAt > fiveMinutesAgo,
          }
        : null,
    });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    res.status(500).json({ message: 'Failed to get/create conversation' });
  }
};

// ─── GET /api/chat/conversations/:id/messages ─────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { id: requesterId, model: requesterModel } = getRequester(req);
    const { id: convId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    // Verify requester is a participant
    const conv = await Conversation.findOne({
      _id: convId,
      participants: {
        $elemMatch: {
          participantId: requesterId,
          participantModel: requesterModel,
        },
      },
    });

    if (!conv) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const total = await ChatMessage.countDocuments({ conversation: convId });
    const messages = await ChatMessage.find({ conversation: convId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Mark as read
    await ChatMessage.updateMany(
      {
        conversation: convId,
        readBy: { $ne: requesterId },
        senderId: { $ne: requesterId },
        isDeleted: false,
      },
      { $addToSet: { readBy: requesterId } },
    );

    // Reset unread count
    await conv.updateOne({
      $set: { [`unreadCount.${requesterId}`]: 0 },
    });

    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// ─── POST /api/chat/conversations/:id/messages ────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { id: senderId, model: senderModel } = getRequester(req);
    const { id: convId } = req.params;
    const { content } = req.body;
    const file = req.file;

    // Verify sender is a participant
    const conv = await Conversation.findOne({
      _id: convId,
      participants: {
        $elemMatch: { participantId: senderId, participantModel: senderModel },
      },
    });

    if (!conv) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    let mediaType = 'text';
    let mediaUrl = null;

    if (file) {
      mediaUrl = file.path;
      mediaType = file.mimetype.startsWith('audio') ? 'audio' : 'image';
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = await ChatMessage.create({
      conversation: convId,
      senderId,
      senderModel,
      content: content || '',
      mediaUrl,
      mediaType,
      readBy: [senderId],
    });

    // Update conversation lastMessage and unread counts for other participants
    const unreadUpdates = {};
    conv.participants.forEach((p) => {
      if (p.participantId.toString() !== senderId.toString()) {
        const currentCount =
          conv.unreadCount?.get(p.participantId.toString()) || 0;
        unreadUpdates[`unreadCount.${p.participantId}`] = currentCount + 1;
      }
    });

    await conv.updateOne({
      lastMessage: message._id,
      lastActivity: new Date(),
      ...unreadUpdates,
    });

    // Emit via socket if available
    if (req.io) {
      conv.participants.forEach((p) => {
        req.io
          .to(`user_${p.participantId}`)
          .emit('message:new', { conversationId: convId, message });
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// ─── PUT /api/chat/messages/:id ───────────────────────────────────────────────
const editMessage = async (req, res) => {
  try {
    const { id: requesterId } = getRequester(req);
    const { id: msgId } = req.params;
    const { content } = req.body;

    const message = await ChatMessage.findOne({
      _id: msgId,
      senderId: requesterId,
      isDeleted: false,
    });

    if (!message) {
      return res
        .status(404)
        .json({ message: 'Message not found or not your message' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    // Emit socket event
    if (req.io) {
      const conv = await Conversation.findById(message.conversation);
      if (conv) {
        conv.participants.forEach((p) => {
          req.io.to(`user_${p.participantId}`).emit('message:edited', {
            conversationId: conv._id.toString(),
            message,
          });
        });
      }
    }

    res.json(message);
  } catch (error) {
    console.error('editMessage error:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
};

// ─── DELETE /api/chat/messages/:id ───────────────────────────────────────────
const deleteMessage = async (req, res) => {
  try {
    const { id: requesterId } = getRequester(req);
    const { id: msgId } = req.params;

    const message = await ChatMessage.findOne({
      _id: msgId,
      senderId: requesterId,
    });

    if (!message) {
      return res
        .status(404)
        .json({ message: 'Message not found or not your message' });
    }

    message.isDeleted = true;
    message.content = '';
    message.mediaUrl = null;
    await message.save();

    // Emit socket event
    if (req.io) {
      const conv = await Conversation.findById(message.conversation);
      if (conv) {
        conv.participants.forEach((p) => {
          req.io.to(`user_${p.participantId}`).emit('message:deleted', {
            conversationId: conv._id.toString(),
            messageId: msgId,
          });
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('deleteMessage error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// ─── POST /api/chat/conversations/:id/read ────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { id: requesterId, model: requesterModel } = getRequester(req);
    const { id: convId } = req.params;

    const conv = await Conversation.findOne({
      _id: convId,
      participants: {
        $elemMatch: {
          participantId: requesterId,
          participantModel: requesterModel,
        },
      },
    });

    if (!conv) return res.status(403).json({ message: 'Not a participant' });

    await ChatMessage.updateMany(
      {
        conversation: convId,
        readBy: { $ne: requesterId },
        senderId: { $ne: requesterId },
      },
      { $addToSet: { readBy: requesterId } },
    );

    await conv.updateOne({
      $set: { [`unreadCount.${requesterId}`]: 0 },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

module.exports = {
  chatUpload,
  getAvailableContacts,
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
};
