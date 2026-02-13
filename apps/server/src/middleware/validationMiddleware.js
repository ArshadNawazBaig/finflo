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
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate,
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// Loan Validations
const loanValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),
  body('interestRate')
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

module.exports = {
  registerValidation,
  loginValidation,
  loanValidation,
  savingGoalValidation,
  savingGoalContributionValidation,
};
