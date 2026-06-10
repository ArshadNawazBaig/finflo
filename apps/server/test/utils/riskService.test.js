/**
 * riskService.calculateRiskScore — deterministic A+…F grading from DTI, internal
 * trust rating and repayment history. Pure function, no DB.
 */
const { calculateRiskScore } = require('../../src/utils/riskService');

describe('calculateRiskScore', () => {
  it('grades a strong borrower A+ / Approve', () => {
    const r = calculateRiskScore(
      { monthlyIncome: 100000, trustRating: 10 },
      { emi: 10000 }, // DTI 10%
      [{ status: 'completed' }],
    );
    // 70 +15 (DTI) +15 (trust) +10 (perfect) = 110 → clamped 100
    expect(r.score).toBe(100);
    expect(r.grade).toBe('A+');
    expect(r.suggestion).toBe('Approve');
  });

  it('penalizes a previous default heavily (Deny)', () => {
    const r = calculateRiskScore(
      { monthlyIncome: 100000, trustRating: 5 },
      { emi: 10000 },
      [{ status: 'defaulted' }],
    );
    // 70 +15 (DTI) -40 (default) = 45 → D / Deny
    expect(r.score).toBe(45);
    expect(r.grade).toBe('D');
    expect(r.suggestion).toBe('Deny');
  });

  it('flags a critical debt-to-income ratio', () => {
    const r = calculateRiskScore(
      { monthlyIncome: 100000, trustRating: 5 },
      { emi: 60000 }, // DTI 60%
      [],
    );
    // 70 -30 (critical DTI) = 40 → D
    expect(r.score).toBe(40);
    expect(r.grade).toBe('D');
  });

  it('treats missing income as higher risk and returns at most 4 factors', () => {
    const r = calculateRiskScore({ trustRating: 5 }, { emi: 5000 }, []);
    // 70 -10 (no income) = 60 → C / Caution
    expect(r.score).toBe(60);
    expect(r.grade).toBe('C');
    expect(r.suggestion).toBe('Caution');
    expect(r.factors.length).toBeLessThanOrEqual(4);
  });

  it('clamps the score within 0–100', () => {
    const worst = calculateRiskScore(
      { monthlyIncome: 10000, trustRating: 1 }, // poor trust + critical DTI
      { emi: 9000 },
      [{ status: 'defaulted' }],
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});
