const LoanProduct = require('../models/LoanProduct');

// @desc    Get all loan products
// @route   GET /api/loan-products
// @access  Private (Admin/Staff)
const getLoanProducts = async (req, res) => {
  try {
    const products = await LoanProduct.find({
      user: req.user.effectiveOwnerId,
    }).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching loan products' });
  }
};

// @desc    Create a loan product
// @route   POST /api/loan-products
// @access  Private (Admin)
const createLoanProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      interestRate,
      duration,
      interestType,
      minAmount,
      maxAmount,
    } = req.body;

    const product = await LoanProduct.create({
      user: req.user.effectiveOwnerId,
      name,
      description,
      interestRate,
      duration,
      interestType,
      minAmount,
      maxAmount,
      createdBy: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message || 'Error creating product' });
  }
};

// @desc    Update a loan product
// @route   PUT /api/loan-products/:id
// @access  Private (Admin)
const updateLoanProduct = async (req, res) => {
  try {
    const product = await LoanProduct.findOneAndUpdate(
      { _id: req.params.id, user: req.user.effectiveOwnerId },
      req.body,
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message || 'Error updating product' });
  }
};

// @desc    Delete a loan product
// @route   DELETE /api/loan-products/:id
// @access  Private (Admin)
const deleteLoanProduct = async (req, res) => {
  try {
    const product = await LoanProduct.findOneAndDelete({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product' });
  }
};

module.exports = {
  getLoanProducts,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
};
