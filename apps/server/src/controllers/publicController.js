const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const User = require('../models/User');

/**
 * Public endpoint for customers to look up their loans
 * Requires: businessPin, email, and name
 */
const lookupLoans = async (req, res) => {
  try {
    const { pin, email, name } = req.body;

    // Validate required fields
    if (!pin || !email || !name) {
      return res.status(400).json({
        message: 'PIN, email, and name are required',
      });
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        message: 'Invalid PIN format. PIN must be 6 digits.',
      });
    }

    // Find business owner by PIN
    const businessOwner = await User.findOne({ customerPortalPin: pin });

    if (!businessOwner) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Find customer by email and name (case-insensitive) for this business
    const customer = await Customer.findOne({
      user: businessOwner._id,
      email: email.toLowerCase(),
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (!customer) {
      return res.status(404).json({
        message: 'No loans found for the provided credentials',
      });
    }

    // Get all loans for this customer
    const loans = await Loan.find({
      customer: customer._id,
      user: businessOwner._id,
    }).sort({ createdAt: -1 });

    // Return customer info and loans
    res.json({
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        trustRating: customer.trustRating || 5.0,
      },
      loans: loans.map((loan) => ({
        _id: loan._id,
        principal: loan.principal,
        interestRate: loan.rate,
        duration: loan.duration,
        emi: loan.emi,
        totalAmount: loan.totalAmount,
        paidAmount: loan.paidAmount,
        remainingAmount: loan.remainingAmount,
        startDate: loan.startDate,
        status: loan.status,
        createdAt: loan.createdAt,
      })),
    });
  } catch (error) {
    console.error('Loan lookup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  lookupLoans,
};
