/**
 * Generates an amortization schedule for a loan.
 * Supports both Simple Interest and EMI (Reducing Balance) types.
 */
const generateAmortizationSchedule = (loan) => {
  const {
    principal,
    rate,
    duration,
    startDate,
    interestType,
    emi,
    totalAmount,
  } = loan;
  const schedule = [];
  const start = new Date(startDate);
  const monthlyRate = rate / 12 / 100;
  let currentPrincipal = principal;

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interest, principalPortion;

    if (interestType === 'simple') {
      // Simple Interest: Interest is fixed per installment
      const totalInterest = totalAmount - principal;
      interest = totalInterest / duration;
      principalPortion = principal / duration;
    } else {
      // EMI (Reducing Balance): Standard amortization
      // interest = currentPrincipal * monthlyRate
      interest = currentPrincipal * monthlyRate;
      principalPortion = emi - interest;
      currentPrincipal -= principalPortion;
    }

    schedule.push({
      installment: i,
      dueDate,
      amount: emi,
      interest: Math.round(interest),
      principal: Math.round(principalPortion),
      status: 'pending',
    });
  }

  return schedule;
};

module.exports = { generateAmortizationSchedule };
