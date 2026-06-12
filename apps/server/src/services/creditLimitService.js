const Member = require('../models/Member');
const { computeCreditScore, bandMultiplier } = require('./creditScoringService');

/**
 * Calculates a member's credit limit. Capacity stays anchored to their **share
 * balance** (business share investment), but the multiplier is now driven by the
 * member's real **credit score** rather than a near-binary good/bad flag — so
 * strong repayment behavior visibly raises borrowing capacity and poor behavior
 * lowers it.
 *
 * Formula: Base Limit (shareBalance × 5) × score-band multiplier
 *   Excellent 1.5 · Good 1.15 · Fair 0.85 · Poor 0.5 · Very Poor 0.25
 *
 * Non-member customers have no shareBalance, so no limit is enforced for them.
 *
 * @param {string} memberId - The ID of the member
 * @returns {Promise<number>} - The calculated credit limit
 */
const calculateCreditLimit = async (memberId) => {
  const member = await Member.findById(memberId);
  if (!member) return 0;

  // Base Limit: 5x share balance (unchanged capacity anchor).
  const baseLimit = (member.shareBalance || 0) * 5;

  // Score-driven multiplier. If the member has a linked customer we score their
  // real history; otherwise fall back to the neutral 'Fair' multiplier.
  let multiplier = bandMultiplier('Fair');
  try {
    if (member.customer) {
      const { band } = await computeCreditScore(member.customer);
      multiplier = bandMultiplier(band);
    }
  } catch (err) {
    // Scoring must never break limit resolution — fall back to the neutral band.
    multiplier = bandMultiplier('Fair');
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
