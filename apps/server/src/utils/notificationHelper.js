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
  metadata = {},
}) => {
  try {
    // Find all super admins
    const superAdmins = await User.find({
      role: 'super_admin',
      isActive: true,
    });

    // Find branch-specific admins if branchId is provided
    let branchAdmins = [];
    if (branchId) {
      branchAdmins = await User.find({
        role: 'admin',
        branchId,
        isActive: true,
      });
    }

    // Combine recipients (unique list)
    const adminRecipients = [...superAdmins, ...branchAdmins];
    const uniqueAdminIds = [
      ...new Set(adminRecipients.map((u) => u._id.toString())),
    ];

    // Create notifications for all identified admins
    const notificationPromises = uniqueAdminIds.map((adminId) =>
      new Notification({
        recipient: adminId,
        recipientModel: 'User',
        title,
        message,
        type,
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
