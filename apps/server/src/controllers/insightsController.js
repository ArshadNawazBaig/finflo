const { runAllInsights } = require('../services/insightsService');

/**
 * @desc    Get AI-powered insights for the dashboard
 * @route   GET /api/insights
 * @access  Private (Admin/Staff)
 */
const getInsights = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const insights = await runAllInsights(userId);
    res.json(insights);
  } catch (error) {
    console.error('getInsights Error:', error);
    res.status(500).json({ message: 'Failed to generate insights.' });
  }
};

module.exports = { getInsights };
