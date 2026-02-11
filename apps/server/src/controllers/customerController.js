const Customer = require('../models/Customer');
const User = require('../models/User');
const Member = require('../models/Member');
const { canAddCustomer } = require('../utils/planLimits');

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const query = { user: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { cnic: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const totalEntries = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    res.json({
      data: customers,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCustomer = async (req, res) => {
  const { name, email, phone, address } = req.body;

  try {
    // Check plan limits
    const user = await User.findById(req.user._id).select('plan customerCount');
    const userPlan = user.plan || 'Free';

    // Count existing customers for this user
    const customerCount = await Customer.countDocuments({ user: req.user._id });

    // Validate against plan limits
    const limitCheck = canAddCustomer(userPlan, customerCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    const customer = new Customer({
      user: req.user._id,
      name,
      email,
      phone,
      address,
    });

    const createdCustomer = await customer.save();

    // Update count
    user.customerCount = user.customerCount + 1;
    await user.save();

    res.status(201).json(createdCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Prevent account number change if already set
    if (
      customer.accountNumber &&
      req.body.accountNumber &&
      customer.accountNumber !== req.body.accountNumber
    ) {
      return res
        .status(400)
        .json({ message: 'Account number cannot be changed once assigned' });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    // Sync to Member if exists
    if (updatedCustomer.memberId) {
      const syncFields = ['cnic', 'job', 'monthlyIncome', 'accountNumber'];
      const memberUpdate = {};
      syncFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          memberUpdate[field] = req.body[field];
        }
      });

      if (Object.keys(memberUpdate).length > 0) {
        await Member.findByIdAndUpdate(updatedCustomer.memberId, memberUpdate);
      }
    }

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await customer.deleteOne();

    // Decrement count
    const user = await User.findById(req.user._id);
    user.customerCount = Math.max(0, user.customerCount - 1);
    await user.save();

    res.json({ message: 'Customer removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadDocuments = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newDocuments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
    }));

    customer.documents.push(...newDocuments);
    await customer.save();

    // Sync to Member if exists
    if (customer.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        member.documents.push(...newDocuments);
        await member.save();
      }
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Filter out the document to delete
    customer.documents = customer.documents.filter(
      (doc) => doc._id.toString() !== docId,
    );
    await customer.save();

    // Sync to Member if exists
    if (customer.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        member.documents = member.documents.filter(
          (doc) => doc._id.toString() !== docId,
        );
        await member.save();
      }
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadDocuments,
  deleteDocument,
};
