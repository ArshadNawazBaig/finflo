const { body, validationResult } = require('express-validator');

// Error formatter
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Auth Validations
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate,
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// Loan Validations
const loanValidation = [
  body('principal')
    .isNumeric()
    .withMessage('Principal must be a number')
    .custom((value) => value > 0)
    .withMessage('Principal must be greater than 0'),
  body('rate')
    .isNumeric()
    .withMessage('Interest rate must be a number')
    .custom((value) => value >= 0)
    .withMessage('Interest rate cannot be negative'),
  body('duration')
    .isNumeric()
    .withMessage('Duration must be a number')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 month'),
  validate,
];

// Saving Goal Validations
const savingGoalValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('targetAmount')
    .isNumeric()
    .withMessage('Target amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Target amount must be greater than 0'),
  body('category')
    .optional()
    .isIn([
      'emergency',
      'travel',
      'car',
      'education',
      'home',
      'wedding',
      'gadget',
      'other',
    ])
    .withMessage('Invalid category'),
  body('deadline').optional().isISO8601().withMessage('Invalid date format'),
  validate,
];

const savingGoalContributionValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),
  validate,
];

// Member Validations
const memberValidation = [
  body('name').optional().trim(),

  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('cnic')
    .notEmpty()
    .withMessage('CNIC is required')
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage('Invalid CNIC format. Expected: XXXXX-XXXXXXX-X'),
  validate,
];

// Customer Validations
const customerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('cnic')
    .notEmpty()
    .withMessage('CNIC is required')
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage('Invalid CNIC format. Expected: XXXXX-XXXXXXX-X'),
  body('branchId').notEmpty().withMessage('Branch selection is required'),
  validate,
];

// Branch Validations
const branchValidation = [
  body('name').trim().notEmpty().withMessage('Branch name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('contactNumber').notEmpty().withMessage('Contact number is required'),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  loanValidation,
  savingGoalValidation,
  savingGoalContributionValidation,
  memberValidation,
  customerValidation,
  branchValidation,
};
