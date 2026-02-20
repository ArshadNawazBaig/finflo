const Notification = require('../models/Notification');
const { logActivity } = require('../controllers/activityLogController');

/**
 * Creates a notification and logs the activity.
 * @param {Object} options - Notification options
 * @param {string} options.recipientId - ID of the member or user
 * @param {string} options.recipientModel - 'Member' or 'User'
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.type='info'] - 'info', 'success', 'warning', 'error'
 * @param {string} [options.branchId] - Optional branch ID
 * @param {Object} [options.metadata] - Optional metadata for activity log
 * @param {string} [options.action='notification_triggered'] - Action for activity log
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

    // 2. (Optional) In a real app, you'd trigger Socket.io here for real-time alerts

    // 3. Log the event in Activity Logs
    // We don't use the 'req' object here as this is often triggered in background or different context
    // So we call logActivity carefully
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
    // We don't throw here to avoid breaking the main transaction flow
    return null;
  }
};

module.exports = {
  createTransactionNotification,
};
