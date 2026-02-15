const Member = require('../models/Member');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');

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
// @desc    Check Loan Status (CNIC based)
// @route   POST /api/public/loan-lookup
// @access  Public
exports.loanLookup = async (req, res) => {
  const { cnic, securityCode } = req.body;

  try {
    if (!cnic || !securityCode) {
      return res.status(400).json({
        message: 'Please provide both CNIC and business security code',
      });
    }

    // 1. Find the business
    const business = await User.findOne({
      securityCode: securityCode.toUpperCase().trim(),
    });

    if (!business) {
      return res
        .status(404)
        .json({ message: 'Invalid business security code' });
    }

    // 2. Find the customer in this business
    const customer = await Customer.findOne({
      cnic: cnic.trim(),
      user: business._id,
    });

    if (!customer) {
      return res.status(404).json({
        message: 'No loan records found for this CNIC in this business',
      });
    }

    // 3. Find loans for this customer
    const loans = await Loan.find({
      customer: customer._id,
      user: business._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      businessName: business.businessName || business.name,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      loans,
    });
  } catch (error) {
    console.error('Loan Lookup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during lookup',
    });
  }
};
