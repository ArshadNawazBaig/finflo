const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { logActivity } = require('./activityLogController');
const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private (Admin/User)
const createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    const attachments = req.files
      ? req.files.map((file) => {
          let fileType = 'file';
          if (file.mimetype.startsWith('image/')) fileType = 'image';
          else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

          return {
            url: file.path,
            publicId: file.filename,
            fileType,
            originalName: file.originalname,
          };
        })
      : [];

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      description,
      category,
      priority,
      attachments,
    });

    await logActivity({
      userId: req.user._id,
      action: 'ticket_created',
      category: 'support',
      details: `Created support ticket: ${subject}`,
      metadata: { ticketId: ticket._id },
      req,
    });

    // Notify User
    try {
      const Notification = require('../models/Notification');
      await new Notification({
        recipient: req.user._id,
        recipientModel: 'User',
        title: 'Ticket Received',
        message: `Your support ticket "${subject}" has been submitted successfully.`,
        type: 'success',
        link: '/support',
        action: 'ticket_created',
      }).save();
    } catch (notifErr) {
      console.error('Failed to notify user of ticket creation:', notifErr);
    }

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's support tickets
// @route   GET /api/tickets
// @access  Private
const getUserTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({
      updatedAt: -1,
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all support tickets (Super Admin only)
// @route   GET /api/tickets/all
// @access  Private/SuperAdmin
const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({})
      .populate('user', 'name email businessName')
      .sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single support ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email businessName')
      .populate('replies.user', 'name role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is the owner or super admin
    if (
      ticket.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add reply to ticket
// @route   POST /api/tickets/:id/reply
// @access  Private
const addReply = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is the owner or super admin
    if (
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const attachments = req.files
      ? req.files.map((file) => {
          let fileType = 'file';
          if (file.mimetype.startsWith('image/')) fileType = 'image';
          else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

          return {
            url: file.path,
            publicId: file.filename,
            fileType,
            originalName: file.originalname,
          };
        })
      : [];

    // Allow empty message if there are attachments
    if (!message && attachments.length === 0) {
      return res
        .status(400)
        .json({ message: 'Message or attachments required' });
    }

    ticket.replies.push({
      user: req.user._id,
      message: message || '', // Default to empty string if no message
      attachments,
    });

    // If super admin replies, set status to In Progress if it was Open
    if (req.user.role === 'super_admin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email businessName')
      .populate('replies.user', 'name role');

    // Notify the other party
    try {
      const Notification = require('../models/Notification');
      const isSuperAdmin = req.user.role === 'super_admin';
      const recipientId = isSuperAdmin ? ticket.user : null; // If admin replies, notify user

      if (recipientId) {
        // Notify User
        await new Notification({
          recipient: recipientId,
          recipientModel: 'User',
          title: 'New Reply on Support Ticket',
          message: `Technical support has replied to your ticket: ${ticket.subject}`,
          type: 'info',
          link: '/support', // Users see their tickets on /support
          action: 'ticket_reply_received',
        }).save();
      } else if (!isSuperAdmin) {
        // If user replies, notify super admin (broadcast or specific)
        // Here we can use a helper or just broad notification to super admins
        const {
          notifyAdminsOfMemberAction,
        } = require('../utils/notificationHelper');
        await notifyAdminsOfMemberAction({
          title: 'Support Ticket Reply',
          message: `${req.user.name} replied to ticket: ${ticket.subject}`,
          type: 'info',
          link: `/super-admin/tickets`, // Direct link for super admin
          metadata: { ticketId: ticket._id },
        });
      }
    } catch (notifErr) {
      console.error('Failed to send ticket notification:', notifErr);
    }

    res.status(201).json(populatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update ticket status (Super Admin only)
// @route   PATCH /api/tickets/:id/status
// @access  Private/SuperAdmin
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status;
    await ticket.save();

    await logActivity({
      userId: req.user._id,
      action: 'ticket_status_updated',
      category: 'support',
      details: `Updated ticket ${ticket._id} status to ${status}`,
      metadata: { ticketId: ticket._id, status },
      req,
    });

    // Notify User of status change
    try {
      const Notification = require('../models/Notification');
      await new Notification({
        recipient: ticket.user,
        recipientModel: 'User',
        title: 'Ticket Status Updated',
        message: `Your ticket "${ticket.subject}" status has been updated to: ${status}`,
        type: 'info',
        link: '/support',
        action: 'ticket_status_changed',
      }).save();
    } catch (notifErr) {
      console.error('Failed to notify user of status update:', notifErr);
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a reply in a ticket
// @route   PATCH /api/tickets/:id/reply/:replyId
// @access  Private
const updateReply = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const reply = ticket.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user is the owner or super admin
    if (
      reply.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    reply.message = message;
    reply.isEdited = true;
    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email businessName')
      .populate('replies.user', 'name role');

    res.json(populatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a reply from a ticket
// @route   DELETE /api/tickets/:id/reply/:replyId
// @access  Private
const deleteReply = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const reply = ticket.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user is the owner or super admin
    if (
      reply.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete attachments from Cloudinary before removing reply
    if (reply.attachments && reply.attachments.length > 0) {
      for (const attachment of reply.attachments) {
        await deleteCloudinaryFileByUrl(attachment.url, attachment.fileType);
      }
    }

    // Remove the reply using Mongoose subdocument pull
    ticket.replies.pull(req.params.replyId);
    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email businessName')
      .populate('replies.user', 'name role');

    res.json(populatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a support ticket
// @route   DELETE /api/tickets/:id
// @access  Private
const deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is the owner or super admin
    if (
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all attachments from Cloudinary before deleting ticket
    if (ticket.replies && ticket.replies.length > 0) {
      for (const reply of ticket.replies) {
        if (reply.attachments && reply.attachments.length > 0) {
          for (const attachment of reply.attachments) {
            await deleteCloudinaryFileByUrl(
              attachment.url,
              attachment.fileType,
            );
          }
        }
      }
    }

    await SupportTicket.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user._id,
      action: 'ticket_deleted',
      category: 'support',
      details: `Deleted support ticket: ${ticket.subject}`,
      metadata: { ticketId: ticket._id, subject: ticket.subject },
      req,
    });

    res.json({ message: 'Ticket removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTicket,
  getUserTickets,
  getAllTickets,
  getTicketById,
  addReply,
  updateReply,
  deleteReply,
  updateTicketStatus,
  deleteTicket,
};
