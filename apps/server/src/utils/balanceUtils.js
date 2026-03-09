const Member = require('../models/Member');
const Loan = require('../models/Loan');

/**
 * Calculates the effective balance for a member:
 * Effective Balance = Savings Balance (currentBalance) - Outstanding Loan Debt (remainingAmount)
 *
 * @param {string} memberId - The ID of the member
 * @returns {Promise<number>} - The net balance (can be negative)
 */
const calculateEffectiveBalance = async (memberId) => {
  try {
    const member = await Member.findById(memberId).select(
      'currentBalance customer',
    );
    if (!member) return 0;

    let netBalance = member.currentBalance || 0;

    // If member has a linked customer, find all active/overdue loans
    if (member.customer) {
      const activeLoans = await Loan.find({
        customer: member.customer,
        status: { $in: ['active', 'overdue'] },
      }).select('remainingAmount');

      const totalDebt = activeLoans.reduce(
        (sum, loan) => sum + (loan.remainingAmount || 0),
        0,
      );
      netBalance -= totalDebt;
    }

    return netBalance;
  } catch (error) {
    console.error('Error calculating effective balance:', error);
    return 0;
  }
};

module.exports = {
  calculateEffectiveBalance,
};
