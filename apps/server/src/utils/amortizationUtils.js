/**
 * Generates an amortization schedule for a loan.
 * Supports both Simple Interest and EMI (Reducing Balance) types.
 *
 * Interest is calculated on a DAILY basis:
 *   dailyInterest = (principal * annualRate) / 1200 / 30
 * Each installment shows interest for exactly 30 days (one billing period).
 * This matches the actual backend logic in loanRepaymentService.js.
 */
const generateAmortizationSchedule = (loan) => {
  const { principal, rate, duration, startDate, interestType, emi } = loan;

  const schedule = [];
  const start = new Date(startDate);
  const monthlyRate = rate / 12 / 100;
  const dailyRate = monthlyRate / 30;

  // For simple interest: each installment earns 30 days of interest on principal
  const dailySimpleInterest = principal * dailyRate;
  const interestPer30Days = Math.round(dailySimpleInterest * 30);
  const principalPerInstallment = Math.round(principal / (duration || 1));

  // For EMI: track remaining principal to compute each period's interest
  let currentPrincipal = principal;

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interest, principalPortion, installmentTotal;

    if (interestType === 'simple' || interestType === 'compound' || !interestType) {
      // Simple & Compound Interest: each installment = principal slice + 30 days of daily interest
      // For compound, the initial schedule is flat (same as simple). The actual compounding
      // happens dynamically via a cron job when installments are missed.
      interest = interestPer30Days;
      principalPortion = principalPerInstallment;
      installmentTotal = principalPortion + interest;
    } else {
      // EMI (Reducing Balance): interest is proportional to remaining principal
      // 30 days of daily interest on current principal balance
      interest = Math.round(currentPrincipal * dailyRate * 30);
      principalPortion = Math.round(emi - interest);
      principalPortion = Math.max(
        0,
        Math.min(principalPortion, currentPrincipal),
      );
      installmentTotal = principalPortion + interest;
      currentPrincipal = Math.max(0, currentPrincipal - principalPortion);
    }

    schedule.push({
      installment: i,
      dueDate,
      amount: Math.round(installmentTotal),
      interest: Math.round(interest),
      principal: Math.round(principalPortion),
      status: 'pending',
    });
  }

  return schedule;
};

module.exports = { generateAmortizationSchedule };
