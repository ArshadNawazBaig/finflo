// Shared loan interest/term math. Extracted from loanController so both the
// individual-loan flows and the group-lending service compute EMI/totalAmount
// from a single source of truth (no drift between issuance paths).

// EMI Calculation Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
// P = Principal, r = monthly interest rate (annual rate / 12 / 100), n = months
const calculateEMI = (principal, rate, duration) => {
  const r = rate / 12 / 100;
  if (r === 0) return principal / duration;
  const emi =
    (principal * r * Math.pow(1 + r, duration)) /
    (Math.pow(1 + r, duration) - 1);
  return emi;
};

const calculateSimpleInterest = (principal, rate, duration) => {
  const totalInterest = (principal * rate * duration) / 1200;
  const totalAmount = principal + totalInterest;
  const emi = totalAmount / duration;
  return { emi, totalAmount };
};

// Compound interest initial calculation — same as simple at creation time.
// The actual compounding happens dynamically via a cron job when installments
// are missed.
const calculateCompoundInterest = (principal, rate, duration) => {
  const totalInterest = (principal * rate * duration) / 1200;
  const totalAmount = principal + totalInterest;
  const emi = totalAmount / duration;
  return { emi, totalAmount };
};

// Resolve emi/totalAmount for a set of terms using the same rules as
// createLoan/approveLoan. Centralised so every issuance path stays in lock-step.
const computeLoanTerms = (principal, rate, duration, interestType) => {
  if (interestType === 'simple' || interestType === 'compound') {
    const calcFn =
      interestType === 'compound'
        ? calculateCompoundInterest
        : calculateSimpleInterest;
    const result = calcFn(principal, rate, duration);
    return {
      emi: Math.round(result.emi),
      totalAmount: Math.round(result.totalAmount),
    };
  }
  const emi = Math.round(calculateEMI(principal, rate, duration));
  return { emi, totalAmount: emi * duration };
};

module.exports = {
  calculateEMI,
  calculateSimpleInterest,
  calculateCompoundInterest,
  computeLoanTerms,
};
