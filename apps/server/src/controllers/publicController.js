const User = require('../models/User');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');

// @desc    Verify Business Security Code and Get Customer Loans
// @route   POST /api/public/loan-lookup
// @access  Public
const verifyCodeAndGetLoans = async (req, res) => {
  const { securityCode, email, name } = req.body;

  try {
    // 1. Validate Input
    if (!securityCode || !email || !name) {
      return res.status(400).json({
        message: 'Please provide Business Security Code, Email, and Full Name',
      });
    }

    // 2. Find Business by Security Code
    const business = await User.findOne({
      securityCode: securityCode.toUpperCase(),
    });

    if (!business) {
      return res.status(401).json({
        message: 'Invalid Business Security Code',
      });
    }

    // 3. Find Customer in that Business
    // Case-insensitive search for name and email
    const customer = await Customer.findOne({
      user: business._id,
      email: { $regex: new RegExp(`^${email}$`, 'i') },
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found with these details for this business',
      });
    }

    // 4. Fetch Loans for that Customer
    const loans = await Loan.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .select('-__v'); // Exclude internal version field

    res.json({
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
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  verifyCodeAndGetLoans,
};
