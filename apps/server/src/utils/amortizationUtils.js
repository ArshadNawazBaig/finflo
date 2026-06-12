/**
 * Generates an amortization schedule for a loan.
 * Supports both Simple Interest and EMI (Reducing Balance) types.
 *
 * Interest is calculated on a DAILY basis:
 *   dailyInterest = (principal * annualRate) / 1200 / 30
 * Each installment shows interest for exactly 30 days (one billing period).
 * This matches the actual backend logic in loanRepaymentService.js.
 */
const { roundMoney } = require('./money');

const generateAmortizationSchedule = (loan) => {
  const { principal, rate, duration, startDate, interestType, emi } = loan;

  const schedule = [];
  const start = new Date(startDate);
  const monthlyRate = rate / 12 / 100;
  const dailyRate = monthlyRate / 30;

  // For simple interest: each installment earns 30 days of interest on principal
  const dailySimpleInterest = principal * dailyRate;
  const interestPer30Days = roundMoney(dailySimpleInterest * 30);
  const principalPerInstallment = roundMoney(principal / (duration || 1));

  // Running totals so the LAST installment can absorb any rounding residual.
  // Without this, sum(schedule) drifts from the loan's totalAmount by a few units.
  let allocatedPrincipal = 0;
  let allocatedInterest = 0;
  const totalInterestSimple = interestPer30Days * (duration || 1);

  // For EMI: track remaining principal to compute each period's interest
  let currentPrincipal = principal;

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interest, principalPortion, installmentTotal;
    const isLast = i === duration;

    if (interestType === 'simple' || interestType === 'compound' || !interestType) {
      // Simple & Compound Interest: each installment = principal slice + 30 days of daily interest
      // For compound, the initial schedule is flat (same as simple). The actual compounding
      // happens dynamically via a cron job when installments are missed.
      if (isLast) {
        // Absorb residual so totals reconcile to the loan's principal + total interest
        principalPortion = Math.max(0, principal - allocatedPrincipal);
        interest = Math.max(0, totalInterestSimple - allocatedInterest);
      } else {
        principalPortion = principalPerInstallment;
        interest = interestPer30Days;
      }
      installmentTotal = principalPortion + interest;
    } else {
      // EMI (Reducing Balance): interest is proportional to remaining principal
      // 30 days of daily interest on current principal balance
      interest = roundMoney(currentPrincipal * dailyRate * 30);
      principalPortion = roundMoney(emi - interest);
      principalPortion = Math.max(
        0,
        Math.min(principalPortion, currentPrincipal),
      );
      if (isLast) {
        // Last installment closes out remaining principal exactly
        principalPortion = currentPrincipal;
      }
      installmentTotal = principalPortion + interest;
      currentPrincipal = Math.max(0, currentPrincipal - principalPortion);
    }

    allocatedPrincipal += principalPortion;
    allocatedInterest += interest;

    schedule.push({
      installment: i,
      dueDate,
      amount: roundMoney(installmentTotal),
      interest: roundMoney(interest),
      principal: roundMoney(principalPortion),
      status: 'pending',
    });
  }

  return schedule;
};

module.exports = { generateAmortizationSchedule };
