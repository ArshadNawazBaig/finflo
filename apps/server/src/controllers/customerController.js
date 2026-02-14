const Customer = require('../models/Customer');
const User = require('../models/User');
const Member = require('../models/Member');
const Notification = require('../models/Notification');
const { canAddCustomer } = require('../utils/planLimits');
const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    let query = { user: req.user.effectiveOwnerId };

    // Branch Segregation: Staff only see their own branch data
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { cnic: { $regex: search, $options: 'i' } },
        { savingAccountNumber: { $regex: search, $options: 'i' } },
        { currentAccountNumber: { $regex: search, $options: 'i' } },
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
  try {
    const {
      name,
      email,
      phone,
      address,
      branchId,
      savingAccountNumber,
      currentAccountNumber,
      cnic,
      job,
      monthlyIncome,
    } = req.body;

    const lowercaseEmail = email?.toLowerCase();
    const lowercaseName = name?.toLowerCase();

    // Check plan limits
    const user = await User.findById(req.user.effectiveOwnerId).select(
      'plan customerCount',
    );
    const userPlan = user.plan || 'Free';

    // Count existing customers for this user
    const customerCount = await Customer.countDocuments({
      user: req.user.effectiveOwnerId,
    });

    // Validate against plan limits
    const limitCheck = await canAddCustomer(userPlan, customerCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    // Determine branchId assignment
    let finalBranchId = branchId;
    if (req.user.role === 'staff') {
      finalBranchId = req.user.branchId;
    }

    if (!finalBranchId) {
      return res.status(400).json({ message: 'Branch selection is required' });
    }

    const customer = new Customer({
      user: req.user.effectiveOwnerId,
      branchId: finalBranchId,
      name: lowercaseName,
      email: lowercaseEmail,
      phone,
      address,
      savingAccountNumber,
      currentAccountNumber,
      cnic,
      job,
      monthlyIncome,
    });

    const createdCustomer = await customer.save();

    // Update count
    user.customerCount = user.customerCount + 1;
    await user.save();

    // Notify Admin if created by staff
    if (req.user.role === 'staff') {
      try {
        const notification = new Notification({
          recipient: req.user.effectiveOwnerId,
          recipientModel: 'User',
          title: 'New Customer Created',
          message: `Staff member ${req.user.name} has created a new customer: ${name}.`,
          type: 'info',
        });
        await notification.save();
      } catch (notifError) {
        console.error(
          'Failed to notify admin about customer creation:',
          notifError,
        );
      }
    }

    res.status(201).json(createdCustomer);
  } catch (error) {
    console.error('Create Customer Error:', error);
    res.status(400).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        name: req.body.name?.toLowerCase(),
        email: req.body.email?.toLowerCase(),
        // Ensure user/owner cannot be changed via update
        user: customer.user,
      },
      { new: true, runValidators: true },
    );

    // Sync to Member if exists
    if (updatedCustomer.memberId) {
      const syncFields = [
        'cnic',
        'job',
        'monthlyIncome',
        'accountNumber',
        'savingAccountNumber',
        'currentAccountNumber',
      ];
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

    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete all customer documents from Cloudinary
    if (customer.documents && customer.documents.length > 0) {
      for (const doc of customer.documents) {
        if (doc.url) {
          await deleteCloudinaryFileByUrl(doc.url, 'file');
        }
      }
    }

    await customer.deleteOne();

    // Decrement count
    const user = await User.findById(req.user.effectiveOwnerId);
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

    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
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
      type: req.body.type || 'Other',
      expiryDate: req.body.expiryDate || null,
      status: 'Pending',
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

    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Find the document to delete
    const docToDelete = customer.documents.find(
      (doc) => doc._id.toString() === docId,
    );

    // Delete from Cloudinary if document exists
    if (docToDelete && docToDelete.url) {
      await deleteCloudinaryFileByUrl(docToDelete.url, 'file');
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

const updateDocumentStatus = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { status, verifiedAt } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const document = customer.documents.id(docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.status = status;
    if (status === 'Verified') {
      document.verifiedAt = verifiedAt || Date.now();
    }

    await customer.save();

    // Sync to Member if exists
    if (customer.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        const memberDoc = member.documents.id(docId);
        if (memberDoc) {
          memberDoc.status = status;
          if (status === 'Verified') {
            memberDoc.verifiedAt = document.verifiedAt;
          }
          await member.save();
        }
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
  updateDocumentStatus,
};
