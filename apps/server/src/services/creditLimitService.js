const Member = require('../models/Member');
const Loan = require('../models/Loan');

/**
 * Calculates a member's credit limit based on their **share balance** (business share investment).
 *
 * Rules:
 * - Members: Credit limit = (shareBalance × 5) × performance multiplier
 * - Non-member customers: No credit limit enforcement (no investment balance exists)
 *
 * Formula: Base Limit (shareBalance × 5) × Multiplier (performance-based)
 *
 * Multiplier Logic:
 * - Base multiplier: 1.0
 * - Completed loans: +0.1 per completed loan (max 1.5 total multiplier)
 * - Risk factor: Fixed 0.5 if member has any 'overdue' or 'defaulted' loans.
 *
 * @param {string} memberId - The ID of the member
 * @returns {Promise<number>} - The calculated credit limit
 */
const calculateCreditLimit = async (memberId) => {
  const member = await Member.findById(memberId);
  if (!member) return 0;

  // Base Limit: 5x share balance
  const baseLimit = (member.shareBalance || 0) * 5;
  let multiplier = 1.0;

  // Fetch loan history for performance multiplier
  const history = await Loan.find({ customer: member.customer });

  const completedCount = history.filter((l) => l.status === 'completed').length;
  const hasNegativeHistory = history.some((l) =>
    ['overdue', 'defaulted'].includes(l.status),
  );

  if (hasNegativeHistory) {
    multiplier = 0.5; // Significant penalty for bad behavior
  } else {
    // Reward for good performance: +0.1 per completed loan, capped at 1.5 total multiplier
    multiplier = Math.min(1.5, 1.0 + completedCount * 0.1);
  }

  return Math.round(baseLimit * multiplier);
};

/**
 * Updates a member's credit limit in the database.
 *
 * @param {string} memberId - The ID of the member
 * @returns {Promise<Object>} - The updated member document
 */
const updateMemberCreditLimit = async (memberId) => {
  const newLimit = await calculateCreditLimit(memberId);

  return await Member.findByIdAndUpdate(
    memberId,
    { creditLimit: newLimit },
    { new: true },
  );
};

module.exports = {
  calculateCreditLimit,
  updateMemberCreditLimit,
};
