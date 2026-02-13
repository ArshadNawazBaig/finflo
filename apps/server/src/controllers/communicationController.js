const { runReminderService } = require('../services/reminderService');

/**
 * Manually trigger a full scan for upcoming/overdue reminders.
 */
const triggerScan = async (req, res) => {
  try {
    // Run as an async background task to not block the response
    runReminderService();

    res.json({
      message:
        'Automated Communication scan triggered successfully. Check server logs for progress.',
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to trigger scan', error: error.message });
  }
};

module.exports = { triggerScan };
