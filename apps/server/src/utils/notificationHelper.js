const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { logActivity } = require('../controllers/activityLogController');

/**
 * Creates a notification and logs the activity.
 */
const createTransactionNotification = async ({
  recipientId,
  recipientModel = 'Member',
  title,
  message,
  type = 'info',
  branchId,
  metadata = {},
  action = 'transaction_notification',
}) => {
  try {
    // 1. Create In-App Notification
    const notification = new Notification({
      recipient: recipientId,
      recipientModel,
      title,
      message,
      type,
      link: metadata.link || metadata.url, // Support common names
      action,
      branchId,
    });
    await notification.save();

    // 2. Log the event in Activity Logs
    try {
      await logActivity({
        userId: recipientModel === 'User' ? recipientId : null,
        memberId: recipientModel === 'Member' ? recipientId : null,
        action,
        category: 'transaction',
        details: `${title}: ${message}`,
        metadata: { ...metadata, notificationId: notification._id },
      });
    } catch (logError) {
      console.error('Notification log error (non-fatal):', logError);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

/**
 * Notifies all super admins and the relevant branch manager of a member action.
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.type='info'] - 'info', 'success', 'warning', 'error'
 * @param {string} [options.branchId] - Branch ID to notify branch manager
 * @param {Object} [options.metadata] - Optional metadata for activity log
 */
const notifyAdminsOfMemberAction = async ({
  title,
  message,
  type = 'info',
  branchId,
  ownerId, // Added ownerId to ensure business owner is notified
  metadata = {},
  link, // Added link support
}) => {
  try {
    // Find all super admins
    const superAdmins = await User.find({
      role: 'super_admin',
      isActive: true,
    });

    // Find branch-specific admins and managers if branchId is provided
    let branchStaff = [];
    if (branchId) {
      // 1. Find all admins in this branch
      const branchAdmins = await User.find({
        role: 'admin',
        branchId,
        isActive: true,
      });

      // 2. Find the designated branch manager (who might be 'staff' role)
      const branch = await mongoose.model('Branch').findById(branchId);
      let branchManager = [];
      if (branch && branch.manager) {
        const managerUser = await User.findOne({
          _id: branch.manager,
          isActive: true,
        });
        if (managerUser) branchManager = [managerUser];
      }

      branchStaff = [...branchAdmins, ...branchManager];
    }

    // 3. Find the business owner (who owns the member/loan)
    let businessOwner = [];
    if (ownerId) {
      const ownerUser = await User.findById(ownerId);
      if (ownerUser && ownerUser.isActive) businessOwner = [ownerUser];
    }

    // Combine recipients (unique list)
    const allRecipients = [...superAdmins, ...branchStaff, ...businessOwner];
    const uniqueAdminIds = [
      ...new Set(allRecipients.map((u) => u._id.toString())),
    ];

    // Create notifications for all identified admins
    const notificationPromises = uniqueAdminIds.map((adminId) =>
      new Notification({
        recipient: adminId,
        recipientModel: 'User',
        title,
        message,
        type,
        link: link || metadata.link || metadata.url, // Support common names
        branchId: branchId, // Source branch context
      }).save(),
    );

    await Promise.all(notificationPromises);

    // Single activity log entry for the system-wide action
    await logActivity({
      action: 'admin_broadcast_notification',
      category: 'system',
      details: `Admin Broadcast: ${title} - ${message}`,
      metadata: { ...metadata, recipientsCount: uniqueAdminIds.length },
    });
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};

module.exports = {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
};
