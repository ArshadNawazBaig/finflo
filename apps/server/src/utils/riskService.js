/**
 * Intelligent Risk Engine Service
 * Calculates Risk Scores (A+ to F) based on:
 * 1. DTI (Debt-to-Income) Ratio
 * 2. Trust Rating
 * 3. Repayment History
 */

const calculateRiskScore = (customer, loanDetail, history = []) => {
  let score = 70; // Base score (C grade)
  const factors = [];

  const { monthlyIncome = 0, trustRating = 5 } = customer;
  const { emi = 0 } = loanDetail;

  // 1. Debt-to-Income (DTI) Analysis
  if (monthlyIncome > 0) {
    const dti = (emi / monthlyIncome) * 100;
    if (dti <= 15) {
      score += 15;
      factors.push('Low debt-to-income ratio (Excellent coverage)');
    } else if (dti <= 30) {
      score += 5;
      factors.push('Manageable debt-to-income ratio');
    } else if (dti <= 50) {
      score -= 10;
      factors.push('High debt-to-income ratio (Caution)');
    } else {
      score -= 30;
      factors.push('Critical debt-to-income ratio (DTI > 50%)');
    }
  } else {
    score -= 10;
    factors.push('Missing income data (Higher risk)');
  }

  // 2. Trust Rating (Internal Rating 0-10)
  if (trustRating >= 9) {
    score += 15;
    factors.push('Exceptional internal trust rating');
  } else if (trustRating >= 7) {
    score += 5;
    factors.push('Good internal trust rating');
  } else if (trustRating <= 3) {
    score -= 20;
    factors.push('Poor internal trust rating');
  }

  // 3. Repayment History
  if (history && history.length > 0) {
    const totalLoans = history.length;
    const completedLoans = history.filter(
      (l) => l.status === 'completed',
    ).length;
    const defaultedLoans = history.filter(
      (l) => l.status === 'defaulted',
    ).length;

    if (defaultedLoans > 0) {
      score -= 40;
      factors.push(`Previous default detected (${defaultedLoans} default(s))`);
    } else if (completedLoans > 0) {
      const completionRate = completedLoans / totalLoans;
      if (completionRate === 1) {
        score += 10;
        factors.push('Perfect repayment history');
      } else {
        score += 5;
        factors.push('Positive repayment history');
      }
    }
  } else {
    factors.push('New customer (No history)');
  }

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  // Assign Grade
  let grade = 'F';
  let suggestion = 'Deny';

  if (score >= 90) {
    grade = 'A+';
    suggestion = 'Approve';
  } else if (score >= 80) {
    grade = 'A';
    suggestion = 'Approve';
  } else if (score >= 70) {
    grade = 'B';
    suggestion = 'Approve';
  } else if (score >= 60) {
    grade = 'C';
    suggestion = 'Caution';
  } else if (score >= 40) {
    grade = 'D';
    suggestion = 'Deny';
  } else {
    grade = 'F';
    suggestion = 'Deny';
  }

  return {
    score,
    grade,
    suggestion,
    factors: factors.slice(0, 4), // Return top 4 factors
  };
};

module.exports = { calculateRiskScore };
