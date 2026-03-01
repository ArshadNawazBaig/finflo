const Notification = require('../models/Notification');
const User = require('../models/User');
const { logActivity } = require('./activityLogController');

// Admin: Send Notification
const sendNotification = async (req, res) => {
  const {
    recipientId,
    title,
    message,
    type,
    recipientModel = 'User',
    link, // Added link support
  } = req.body;

  try {
    if (recipientId === 'all') {
      // Send to all users (excluding super admin)
      const users = await User.find({ role: 'admin' });
      const notifications = users.map((user) => ({
        recipient: user._id,
        title,
        message,
        type,
        link, // Added link support
      }));
      await Notification.insertMany(notifications);

      // Log activity
      await logActivity({
        userId: req.user._id,
        action: 'notification_broadcast',
        category: 'notification',
        details: `Admin sent notification to all users: "${title}"`,
        metadata: { recipientCount: users.length, type },
        req,
      });

      return res.json({
        message: `Notification sent to ${users.length} users.`,
      });
    }

    const notification = new Notification({
      recipient: recipientId,
      title,
      message,
      type,
      recipientModel,
      link, // Added link support
    });
    await notification.save();

    // Log activity
    let recipientEmail = 'user';
    if (recipientModel === 'User') {
      const recipient = await User.findById(recipientId);
      recipientEmail = recipient?.email;
    } else if (recipientModel === 'Member') {
      // Lazy load Member model to avoid circular dependency if any
      const Member = require('../models/Member');
      const recipient = await Member.findById(recipientId);
      recipientEmail = recipient?.email;
    }
    await logActivity({
      userId: req.user._id,
      action: 'notification_sent',
      category: 'notification',
      details: `Admin sent notification to ${recipientEmail || 'user'}: "${title}"`,
      metadata: { recipientId, type },
      req,
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User/Member: Get My Notifications
const getMyNotifications = async (req, res) => {
  try {
    const recipientId = req.user
      ? req.user._id
      : req.member
        ? req.member._id
        : null;

    if (!recipientId) {
      console.error('getMyNotifications: No recipient ID found', {
        user: req.user,
        member: req.member,
      });
      return res.status(401).json({ message: 'Not authorized' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'newest';

    const query = { recipient: recipientId };

    // Super Admin Filter: Only show business and support related notifications
    if (req.user && req.user.role === 'super_admin') {
      const superAdminActions = [
        'branch_created',
        'branch_deleted',
        'ticket_created',
        'ticket_reply_received',
        'ticket_status_changed',
        'admin_broadcast_notification',
      ];
      const superAdminKeywords = ['Support', 'Ticket', 'Branch', 'Business'];
      const keywordRegex = new RegExp(superAdminKeywords.join('|'), 'i');

      query.$or = [
        { action: { $in: superAdminActions } },
        { title: keywordRegex },
        { message: keywordRegex },
      ];
    }

    // Search logic (appends to query if present)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchConditions = [
        { title: searchRegex },
        { message: searchRegex },
      ];
      if (query.$or) {
        // If we already have a filter (Super Admin), we must ensure search is within that filter
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Sort logic
    let sort = { createdAt: -1 }; // newest (default)
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    }

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User/Member: Mark as Read
// User/Member: Mark as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user ? req.user._id : req.member._id;

    if (id === 'all') {
      await Notification.updateMany(
        { recipient: recipientId, read: false },
        { read: true },
      );
      return res.json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: recipientId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User/Member: Delete My Notification
const deleteMyNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user ? req.user._id : req.member._id;

    if (id === 'all') {
      const result = await Notification.deleteMany({ recipient: recipientId });
      return res.json({
        message: `${result.deletedCount} notifications deleted successfully`,
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: recipientId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get All Notifications (History)
const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'newest';

    // Build query
    let query = {};

    // Search logic
    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // Get user IDs matching search
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { title: searchRegex },
        { message: searchRegex },
        { recipient: { $in: userIds } },
      ];
    }

    // Sort logic
    let sort = {};
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else {
      sort = { createdAt: -1 }; // newest (default)
    }

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate('recipient', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete Notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      const result = await Notification.deleteMany({});
      // Log activity
      await logActivity({
        userId: req.user._id,
        action: 'notification_history_cleared',
        category: 'notification',
        details: `Admin cleared entire notification history`,
        metadata: { deletedCount: result.deletedCount },
        req,
      });
      return res.json({
        message: `Entire history (${result.deletedCount} notifications) cleared successfully`,
      });
    }

    const notification = await Notification.findById(id).populate(
      'recipient',
      'email',
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(id);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'notification_deleted',
      category: 'notification',
      details: `Admin deleted notification: "${notification.title}"`,
      metadata: { notificationId: id },
      req,
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  deleteMyNotification,
  getAllNotifications,
  deleteNotification,
};
