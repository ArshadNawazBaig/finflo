const Customer = require('../models/Customer');
const User = require('../models/User');
const Member = require('../models/Member');
const Notification = require('../models/Notification');
const { canAddCustomer } = require('../utils/planLimits');
const { deleteCloudinaryFileByUrl, uploadSignature } = require('../utils/cloudinaryHelper');
const { getFriendlyErrorMessage } = require('../utils/errorHandler');
const { logActivity } = require('./activityLogController');
const { escapeRegExp } = require('../utils/stringUtils');

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    let query = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };

    // Branch Segregation: Staff/Managers only see their branch data
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (search) {
      const safeSearch = escapeRegExp(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { cnic: { $regex: safeSearch, $options: 'i' } },
        { savingAccountNumber: { $regex: safeSearch, $options: 'i' } },
        { currentAccountNumber: { $regex: safeSearch, $options: 'i' } },
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
      jobDetail,
      monthlyIncome,
      signature,
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

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    if (!cnic) {
      return res.status(400).json({ message: 'CNIC is required' });
    }

    if (!signature) {
      return res.status(400).json({ message: 'Signature is required' });
    }

    // CNIC Format Validation (Basic)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnic)) {
      return res
        .status(400)
        .json({ message: 'Invalid CNIC format. Expected: XXXXX-XXXXXXX-X' });
    }

    // Mock Verification Logic: Name must be partially present in the CNIC check
    // (Simulating a verification service that checks ID record name against provided name)
    // For this mock: Name must not be "Unknown" or empty
    // Upload signature to Cloudinary
    let signatureUrl = signature;
    if (signature && signature.startsWith('data:image')) {
      try {
        const uploadResult = await uploadSignature(signature);
        signatureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Signature Upload Error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload signature' });
      }
    }

    // Upload nominee CNIC image to Cloudinary
    let nomineeCnicImageUrl = '';
    if (
      req.body.nominee?.cnicImage &&
      req.body.nominee.cnicImage.startsWith('data:image')
    ) {
      try {
        const uploadResult = await uploadSignature(
          req.body.nominee.cnicImage,
          'nominee_cnics',
        );
        nomineeCnicImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Nominee CNIC Upload Error:', uploadError);
        return res
          .status(500)
          .json({ message: 'Failed to upload nominee CNIC image' });
      }
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
      jobDetail,
      monthlyIncome,
      signature: signatureUrl,
      nominee: {
        ...req.body.nominee,
        cnicImage: nomineeCnicImageUrl,
      },
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
          link: '/customers', // Redirect to customer management
          action: 'customer_created_staff',
        });
        await notification.save();
      } catch (notifError) {
        console.error(
          'Failed to notify admin about customer creation:',
          notifError,
        );
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_created',
      category: 'customer',
      details: `New customer created: ${createdCustomer.name} (${createdCustomer.email})`,
      req,
    });

    res.status(201).json(createdCustomer);
  } catch (error) {
    console.error('Create Customer Error:', error);
    res.status(400).json({ message: getFriendlyErrorMessage(error) });
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
      ) &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { cnic, name, email } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Full name cannot be empty' });
    }

    if (email !== undefined && !email.trim()) {
      return res.status(400).json({ message: 'Email address cannot be empty' });
    }

    if (cnic) {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(cnic)) {
        return res
          .status(400)
          .json({ message: 'Invalid CNIC format. Expected: XXXXX-XXXXXXX-X' });
      }
    }

    const { signature } = req.body;
    let signatureUrl = signature;

    // Upload new signature if provided as base64
    if (signature && signature.startsWith('data:image')) {
      try {
        // Delete old signature if it exists and is a Cloudinary URL
        if (customer.signature) {
          await deleteCloudinaryFileByUrl(customer.signature);
        }
        const uploadResult = await uploadSignature(signature);
        signatureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Signature Update Error:', uploadError);
        return res.status(500).json({ message: 'Failed to update signature' });
      }
    }

    // Handle nominee CNIC image update
    let nomineeCnicImageUrl = customer.nominee?.cnicImage;
    if (
      req.body.nominee?.cnicImage &&
      req.body.nominee.cnicImage.startsWith('data:image')
    ) {
      try {
        // Delete old image if it exists
        if (customer.nominee?.cnicImage) {
          await deleteCloudinaryFileByUrl(customer.nominee.cnicImage);
        }
        const uploadResult = await uploadSignature(
          req.body.nominee.cnicImage,
          'nominee_cnics',
        );
        nomineeCnicImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Nominee CNIC Image Update Error:', uploadError);
        return res
          .status(500)
          .json({ message: 'Failed to update nominee CNIC image' });
      }
    }

    // Whitelist allowed fields to prevent mass-assignment attacks
    const allowedFields = {};
    if (name !== undefined) allowedFields.name = name.toLowerCase();
    if (email !== undefined) allowedFields.email = email.toLowerCase();
    if (req.body.phone !== undefined) allowedFields.phone = req.body.phone;
    if (req.body.address !== undefined) allowedFields.address = req.body.address;
    if (cnic !== undefined) allowedFields.cnic = cnic;
    if (req.body.job !== undefined) allowedFields.job = req.body.job;
    if (req.body.jobDetail !== undefined) allowedFields.jobDetail = req.body.jobDetail;
    if (req.body.monthlyIncome !== undefined) allowedFields.monthlyIncome = req.body.monthlyIncome;
    if (req.body.savingAccountNumber !== undefined) allowedFields.savingAccountNumber = req.body.savingAccountNumber;
    if (req.body.currentAccountNumber !== undefined) allowedFields.currentAccountNumber = req.body.currentAccountNumber;
    if (signatureUrl) allowedFields.signature = signatureUrl;
    if (req.body.nominee) {
      allowedFields.nominee = {
        ...req.body.nominee,
        cnicImage: nomineeCnicImageUrl,
      };
    }
    // branchId can only be changed by admin, not staff
    if (req.body.branchId !== undefined && req.user.role !== 'staff') {
      allowedFields.branchId = req.body.branchId;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      allowedFields,
      { new: true, runValidators: true },
    );

    // Sync to Member if exists
    if (updatedCustomer.memberId) {
      const syncFields = [
        'name',
        'email',
        'address',
        'phone',
        'cnic',
        'job',
        'monthlyIncome',
        'branchId',
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
        await Member.findByIdAndUpdate(updatedCustomer.memberId, {
          ...memberUpdate,
          jobDetail: updatedCustomer.jobDetail,
          signature: updatedCustomer.signature,
        });
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_updated',
      category: 'customer',
      details: `Customer details updated: ${updatedCustomer.name}`,
      req,
    });

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: getFriendlyErrorMessage(error) });
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
      ) &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete signature from Cloudinary
    if (customer.signature) {
      await deleteCloudinaryFileByUrl(customer.signature);
    }

    // Delete nominee CNIC image from Cloudinary
    if (customer.nominee?.cnicImage) {
      await deleteCloudinaryFileByUrl(customer.nominee.cnicImage);
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

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_deleted',
      category: 'customer',
      details: `Customer deleted: ${customer.name} (${customer.email})`,
      req,
    });

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
      ) &&
      req.user.role !== 'super_admin'
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

    // Ownership check: prevent uploading docs to another business's customer
    if (
      customer.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        customer.branchId?.toString() === req.user.branchId?.toString()
      ) &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(401).json({ message: 'Not authorized' });
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

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_documents_uploaded',
      category: 'customer',
      details: `Uploaded ${newDocuments.length} document(s) for customer: ${customer.name}`,
      req,
    });

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

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_document_deleted',
      category: 'customer',
      details: `Deleted document "${docToDelete?.name || 'Unknown'}" for customer: ${customer.name}`,
      req,
    });

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

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'customer_document_status_updated',
      category: 'customer',
      details: `Document "${document.name}" status updated to ${status} for customer: ${customer.name}`,
      req,
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Get all customers that have at least one Pending document */
const getPendingDocuments = async (req, res) => {
  try {
    const query = {
      user: req.user.effectiveOwnerId,
      'documents.status': 'Pending',
    };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const customers = await Customer.find(query).select(
      'name email phone documents',
    );

    // Flatten into a list of pending-doc entries for easy rendering.
    // Each entry tags `entityType` so the verification queue UI can route
    // verify/reject calls to the correct controller (customer- vs member-
    // owned documents).
    const queue = [];
    customers.forEach((c) => {
      c.documents
        .filter((d) => d.status === 'Pending')
        .forEach((d) => {
          queue.push({
            entityType: 'customer',
            entityId: c._id,
            // Legacy shape kept for backwards compatibility with the
            // existing VerificationQueue.jsx until it's migrated to use
            // entityType/entityId.
            customerId: c._id,
            customerName: c.name,
            customerEmail: c.email,
            customerPhone: c.phone,
            doc: d,
          });
        });
    });

    // Members may have direct uploads that aren't mirrored to a Customer
    // (e.g. self-register flow). Pull those too so the queue is complete.
    const Member = require('../models/Member');
    const memberQuery = {
      user: req.user.effectiveOwnerId,
      'documents.status': 'Pending',
    };
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) memberQuery.branchId = scope;
    }
    const members = await Member.find(memberQuery).select(
      'name email phone documents customer',
    );
    members.forEach((m) => {
      m.documents
        .filter((d) => d.status === 'Pending')
        .forEach((d) => {
          // Skip if this document is already in the queue via the Customer
          // mirror — Customer is the canonical source when the link exists.
          if (
            m.customer &&
            queue.some(
              (q) => q.doc?._id?.toString() === d._id.toString(),
            )
          ) {
            return;
          }
          queue.push({
            entityType: 'member',
            entityId: m._id,
            customerId: m._id, // legacy alias for existing UI
            customerName: m.name,
            customerEmail: m.email,
            customerPhone: m.phone,
            doc: d,
          });
        });
    });

    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Live credit-score breakdown for a customer (score, band, components,
//         factors). The stored snapshot rides along on GET /:id; this recomputes
//         on demand for transparency/debugging.
// @route  GET /api/customers/:id/credit-score
// @access Private
const getCustomerCreditScore = async (req, res) => {
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
      ) &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { computeCreditScore } = require('../services/creditScoringService');
    const result = await computeCreditScore(customer._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerCreditScore,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadDocuments,
  deleteDocument,
  updateDocumentStatus,
  getPendingDocuments,
};
