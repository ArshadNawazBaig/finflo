const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const LoanGroup = require('../models/LoanGroup');
const logger = require('../utils/logger');

// Same grace window the trust-rating logic uses (loanRepaymentService) to decide
// whether an installment was paid on time. Keep them in lock-step.
const GRACE_PERIOD_DAYS = 3;

// Score bands. Order matters (highest threshold first). A brand-new customer
// with no history lands on a neutral 'Fair' so first-timers are neither locked
// out nor over-extended.
const BANDS = [
  { band: 'Excellent', min: 85, multiplier: 1.5 },
  { band: 'Good', min: 70, multiplier: 1.15 },
  { band: 'Fair', min: 55, multiplier: 0.85 },
  { band: 'Poor', min: 40, multiplier: 0.5 },
  { band: 'Very Poor', min: 0, multiplier: 0.25 },
];

const NEUTRAL_SCORE = 60; // mid-'Fair' — the no-history baseline.

const scoreToBand = (score) =>
  BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];

const bandMultiplier = (band) => {
  const found = BANDS.find((b) => b.band === band);
  return found ? found.multiplier : 0.85;
};

const monthsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
};

// Due date for a given installment of a loan: startDate + installmentNumber
// months, plus the grace window (mirrors loanRepaymentService).
const installmentDueDate = (loan, installmentNumber) => {
  const due = new Date(loan.startDate);
  due.setMonth(due.getMonth() + (installmentNumber || 1));
  due.setDate(due.getDate() + GRACE_PERIOD_DAYS);
  return due;
};

/**
 * Compute an explainable credit score (0-100) for a customer from real
 * behavioral signals. Pure / compute-only — no DB writes. Every component emits
 * a human-readable factor so a lending decision can be audited.
 *
 * @returns {Promise<{score, band, multiplier, factors:string[], components:object}>}
 */
const computeCreditScore = async (customerId, { session = null } = {}) => {
  const customer = await Customer.findById(customerId).session(session);
  if (!customer) {
    return {
      score: NEUTRAL_SCORE,
      band: 'Fair',
      multiplier: bandMultiplier('Fair'),
      factors: ['No customer record'],
      components: {},
    };
  }

  const [loans, repayments, member] = await Promise.all([
    Loan.find({ customer: customerId, user: customer.user }).session(session),
    Repayment.find({ customer: customerId, user: customer.user })
      .populate('loan', 'startDate')
      .session(session),
    customer.memberId
      ? Member.findById(customer.memberId).session(session)
      : null,
  ]);

  const factors = [];
  const components = {};
  const now = new Date();

  // Loans that actually establish a track record (exclude pending/rejected).
  const realLoans = loans.filter(
    (l) => !['pending', 'rejected'].includes(l.status),
  );

  // Brand-new customer with no track record → neutral baseline. We don't
  // fabricate signal from nothing.
  if (realLoans.length === 0 && repayments.length === 0) {
    return {
      score: NEUTRAL_SCORE,
      band: 'Fair',
      multiplier: bandMultiplier('Fair'),
      factors: ['New customer — no borrowing history yet'],
      components: { newCustomer: true },
    };
  }

  // ── 1. Repayment punctuality (~30) — the strongest signal ────────────────
  // Reconstruct on-time/late per installment exactly like the trust-rating
  // logic: a repayment is on time if it landed on/before its due date + grace.
  let onTime = 0;
  let late = 0;
  for (const rp of repayments) {
    if (rp.status && rp.status !== 'Completed') continue;
    const loan = rp.loan;
    if (!loan || !loan.startDate) continue;
    const due = installmentDueDate(loan, rp.installmentNumber);
    if (new Date(rp.date) <= due) onTime += 1;
    else late += 1;
  }
  const totalPaidInstallments = onTime + late;
  let punctuality;
  if (totalPaidInstallments === 0) {
    punctuality = 18; // some loan activity but nothing paid yet — mild credit
    factors.push('No installments paid yet');
  } else {
    const ratio = onTime / totalPaidInstallments;
    punctuality = Math.round(ratio * 30);
    if (ratio >= 0.95)
      factors.push(`Excellent punctuality — ${onTime}/${totalPaidInstallments} on time`);
    else if (ratio >= 0.8)
      factors.push(`Good punctuality — ${onTime}/${totalPaidInstallments} on time`);
    else if (ratio >= 0.5)
      factors.push(`Inconsistent punctuality — ${late} late payment(s)`);
    else factors.push(`Poor punctuality — ${late}/${totalPaidInstallments} late`);
  }
  components.punctuality = { points: punctuality, max: 30, onTime, late };

  // ── 2. Delinquency & default history (~25) ───────────────────────────────
  const defaulted = realLoans.filter((l) => l.status === 'defaulted');
  const currentlyOverdue = realLoans.filter((l) => l.status === 'overdue');
  const historicallyOverdue = realLoans.filter(
    (l) => l.status !== 'overdue' && l.overdueAt,
  );
  let delinquency = 25;
  if (defaulted.length > 0) {
    // Recency-weighted: a default in the last year hurts far more than an old one.
    const mostRecent = defaulted
      .map((l) => l.defaultedAt || l.updatedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    const monthsSince = mostRecent ? monthsBetween(new Date(mostRecent), now) : 24;
    const recencyPenalty = monthsSince < 12 ? 25 : monthsSince < 24 ? 18 : 12;
    delinquency -= recencyPenalty;
    factors.push(
      `${defaulted.length} prior default(s)${monthsSince < 12 ? ' (recent)' : ''}`,
    );
  }
  if (currentlyOverdue.length > 0) {
    delinquency -= 12;
    factors.push(`${currentlyOverdue.length} loan(s) currently overdue`);
  }
  if (historicallyOverdue.length > 0) {
    delinquency -= Math.min(8, historicallyOverdue.length * 3);
  }
  delinquency = Math.max(0, delinquency);
  components.delinquency = {
    points: delinquency,
    max: 25,
    defaults: defaulted.length,
    overdue: currentlyOverdue.length,
  };

  // ── 3. Track-record depth (~15) ──────────────────────────────────────────
  const completed = realLoans.filter((l) => l.status === 'completed');
  const completedValue = completed.reduce((s, l) => s + (l.principal || 0), 0);
  let depth = Math.min(10, completed.length * 2.5);
  if (completedValue >= 100000) depth += 5;
  else if (completedValue >= 25000) depth += 3;
  else if (completedValue > 0) depth += 1;
  depth = Math.min(15, Math.round(depth));
  if (completed.length > 0)
    factors.push(`${completed.length} loan(s) fully repaid`);
  components.depth = { points: depth, max: 15, completed: completed.length };

  // ── 4. Affordability / DTI (~10) ─────────────────────────────────────────
  // Burden of the customer's live EMIs against declared monthly income.
  const activeEmi = realLoans
    .filter((l) => ['active', 'overdue'].includes(l.status))
    .reduce((s, l) => s + (l.emi || 0), 0);
  const income = customer.monthlyIncome || 0;
  let affordability;
  if (income <= 0) {
    affordability = 4;
    factors.push('Income not on file');
  } else {
    const dti = (activeEmi / income) * 100;
    if (dti <= 15) affordability = 10;
    else if (dti <= 30) affordability = 8;
    else if (dti <= 50) affordability = 4;
    else {
      affordability = 0;
      factors.push('High debt-to-income burden');
    }
  }
  components.affordability = { points: affordability, max: 10 };

  // ── 5. Savings & share commitment (~10) ──────────────────────────────────
  const capital = (member?.shareBalance || 0) + (member?.savingBalance || 0);
  let commitment;
  if (capital >= 50000) commitment = 10;
  else if (capital >= 10000) commitment = 7;
  else if (capital > 0) commitment = 4;
  else commitment = 0;
  if (capital > 0) factors.push('Holds savings/share capital');
  components.commitment = { points: commitment, max: 10, capital };

  // ── 6. Relationship tenure (~5) ──────────────────────────────────────────
  const tenureMonths = monthsBetween(customer.createdAt || now, now);
  const tenure = Math.min(5, Math.round(tenureMonths / 6)); // +1 per 6 months
  components.tenure = { points: tenure, max: 5, months: tenureMonths };

  // ── 7. Group joint-liability standing (~5 penalty) ───────────────────────
  let groupAdj = 5;
  const atRiskGroup = await LoanGroup.findOne({
    user: customer.user,
    'members.customer': customerId,
    status: 'at_risk',
  }).session(session);
  if (atRiskGroup) {
    groupAdj = 0;
    factors.push('Member of an at-risk lending group');
  }
  components.group = { points: groupAdj, max: 5 };

  let score =
    punctuality +
    delinquency +
    depth +
    affordability +
    commitment +
    tenure +
    groupAdj;
  score = Math.min(100, Math.max(0, Math.round(score)));

  const { band, multiplier } = scoreToBand(score);

  return { score, band, multiplier, factors: factors.slice(0, 5), components };
};

/**
 * Compute + persist a customer's credit-score snapshot. Best-effort: callers in
 * money flows wrap this in try/catch so a scoring hiccup never breaks a payment.
 */
const refreshCreditScore = async (customerId, { session = null } = {}) => {
  const result = await computeCreditScore(customerId, { session });
  await Customer.findByIdAndUpdate(
    customerId,
    {
      creditScore: {
        score: result.score,
        band: result.band,
        factors: result.factors,
        components: result.components,
        computedAt: new Date(),
      },
    },
    { session },
  );
  return result;
};

module.exports = {
  computeCreditScore,
  refreshCreditScore,
  scoreToBand,
  bandMultiplier,
  BANDS,
  NEUTRAL_SCORE,
};
