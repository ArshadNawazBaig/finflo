const Notification = require('../models/Notification');
const User = require('../models/User');
const { logActivity } = require('./activityLogController');

// Admin: Send Notification
const sendNotification = async (req, res) => {
  const { recipientId, title, message, type } = req.body;

  try {
    if (recipientId === 'all') {
      // Send to all users (excluding super admin)
      const users = await User.find({ role: { $ne: 'super_admin' } });
      const notifications = users.map((user) => ({
        recipient: user._id,
        title,
        message,
        type,
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
    });
    await notification.save();

    // Log activity
    const recipient = await User.findById(recipientId);
    await logActivity({
      userId: req.user._id,
      action: 'notification_sent',
      category: 'notification',
      details: `Admin sent notification to ${recipient?.email || 'user'}: "${title}"`,
      metadata: { recipientId, type },
      req,
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User: Get My Notifications
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User: Mark as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { read: true },
      );
      return res.json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user._id,
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
  getAllNotifications,
  deleteNotification,
};
