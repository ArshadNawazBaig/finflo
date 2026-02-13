const Member = require('../models/Member');
const Branch = require('../models/Branch');

// @desc    Get landing page stats (Active Members, Global Branches)
// @route   GET /api/public/stats
// @access  Public
exports.getLandingStats = async (req, res) => {
  try {
    // Count active members (isActive: true)
    // You might also want to check if the associated user is active, but keeping it simple for now
    const activeMembersCount = await Member.countDocuments({ isActive: true });

    // Count active branches
    const globalBranchesCount = await Branch.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        activeMembers: activeMembersCount,
        globalBranches: globalBranchesCount,
      },
    });
  } catch (error) {
    console.error('Error fetching landing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error fetching stats',
    });
  }
};
