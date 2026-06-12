/**
 * Migration 0002 — backfill missing loan risk grades.
 *
 * Group sub-loans (and any older loans) created without a `riskDetails.grade`
 * surface as "Grade N/A" in the dashboard "Risk distribution" chart. Group
 * lending originally created sub-loans without grading them; createGroupLoan /
 * renewGroupLoan now grade them at creation, but loans already in the database
 * need this one-off backfill.
 *
 * Idempotent: only touches loans missing a grade, so re-running is a no-op.
 * Best-effort credit score per loan — a scoring hiccup just falls back to a
 * grade computed from history alone.
 */
const Loan = require('../src/models/Loan');
const Customer = require('../src/models/Customer');
const { calculateRiskScore } = require('../src/utils/riskService');
const { computeCreditScore } = require('../src/services/creditScoringService');

module.exports = {
  name: '0002-backfill-loan-risk-grades',
  up: async () => {
    // Only loans that lack a grade. Skip terminal states that never appear in
    // the active risk chart anyway (rejected); keep everything else so reports
    // over historical loans are consistent too.
    const loans = await Loan.find({
      'riskDetails.grade': { $in: [null, undefined, ''] },
      status: { $ne: 'rejected' },
    });

    for (const loan of loans) {
      const customer = await Customer.findById(loan.customer);
      if (!customer) continue;

      const history = await Loan.find({
        customer: loan.customer,
        user: loan.user,
      });

      let score = null;
      try {
        score = await computeCreditScore(loan.customer);
      } catch (e) {
        score = null;
      }

      loan.riskDetails = calculateRiskScore(
        customer,
        { emi: loan.emi || 0 },
        history,
        score,
      );
      await loan.save();
    }
  },
};
