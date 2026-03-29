const Member = require('../models/Member');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Lead = require('../models/Lead');
const SystemSettings = require('../models/SystemSettings');
const sendEmail = require('../utils/sendEmail');

// @desc    Get landing page stats (Active Members, Global Branches)
// @route   GET /api/public/stats
// @access  Public
exports.getLandingStats = async (req, res) => {
  try {
    // Count active businesses (User role: 'admin' and isActive: true)
    const activeBusinessesCount = await User.countDocuments({
      role: 'admin',
      isActive: true,
    });

    // Count active members (isActive: true)
    const activeMembersCount = await Member.countDocuments({ isActive: true });

    // Count active branches
    const globalBranchesCount = await Branch.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        activeBusinesses: activeBusinessesCount,
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

// @desc    Submit Contact/Lead form
// @route   POST /api/public/contact
// @access  Public
exports.submitLead = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and message',
      });
    }

    await Lead.create({
      name,
      email,
      message,
    });

    // Send email notification to admin
    try {
      const settings = await SystemSettings.getSettings();
      const adminEmail = settings.supportEmail || 'support@finflo.org';

      await sendEmail({
        email: adminEmail,
        subject: `New Lead: ${name} from FinFlo Landing`,
        message: `You have a new contact inquiry from the landing page.\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #6366f1;">New Landing Page Lead</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin-top: 10px;">
              ${message}
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send lead notification email:', emailError);
      // We don't fail the request if email sending fails, as the lead is already saved in DB
    }

    res.status(201).json({
      success: true,
      message:
        'Your message has been received. Our team will contact you soon.',
    });
  } catch (error) {
    console.error('Lead Submission Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error submitting contact form',
    });
  }
};
