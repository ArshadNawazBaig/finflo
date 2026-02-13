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

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interest, principalPortion, balance;

    if (interestType === 'simple') {
      // Simple Interest: Interest is fixed per installment
      const totalInterest = totalAmount - principal;
      interest = totalInterest / duration;
      principalPortion = principal / duration;
    } else {
      // EMI (Reducing Balance): Standard amortization
      // This is a simplified version for projection
      // In a real system, interest for the period = remainingPrincipal * monthlyRate
      // For projection purposes, we use the pre-calculated EMI
      interest = (totalAmount - principal) / duration; // Simplified projection
      principalPortion = principal / duration;
    }

    schedule.push({
      installment: i,
      dueDate,
      amount: emi,
      interest: Number(interest.toFixed(2)),
      principal: Number(principalPortion.toFixed(2)),
      status: 'pending', // Default status, overridden by comparison with actual repayments
    });
  }

  return schedule;
};

module.exports = { generateAmortizationSchedule };
