/**
 * Money guardrail — verifies the rounding setter installed on money fields keeps
 * stored values at 2 dp (rupees + paisa): a >2-decimal value is impossible to
 * persist, while null/undefined and existing stored data are left untouched.
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { moneySetter } = require('../../src/utils/money');
const { makeOwner, makeCustomer, makeMember, makeLoan } = require('../helpers/factories');

describe('moneySetter (unit)', () => {
  it('keeps 2 dp and rounds anything finer', () => {
    expect(moneySetter(1500.5)).toBe(1500.5);
    expect(moneySetter(1500.567)).toBe(1500.57);
    expect(moneySetter(0.1 + 0.2)).toBe(0.3);
  });

  it('passes null/undefined through untouched', () => {
    expect(moneySetter(null)).toBeNull();
    expect(moneySetter(undefined)).toBeUndefined();
  });

  it('passes non-finite through (Mongoose Number cast handles it)', () => {
    expect(moneySetter('NaN')).toBe('NaN');
  });
});

describe('money guardrail on models (DB)', () => {
  it('preserves paisa and rounds >2-decimal Loan money fields on save', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer);
    loan.remainingAmount = 1234.56; // exact 2 dp — preserved
    loan.paidAmount = 99.999; // 3 dp — rounds to 100
    loan.lateFeeAmount = 50.5;
    await loan.save();

    const reloaded = await Loan.findById(loan._id);
    expect(reloaded.remainingAmount).toBe(1234.56);
    expect(reloaded.paidAmount).toBe(100);
    expect(reloaded.lateFeeAmount).toBe(50.5);
  });

  it('preserves paisa on Member balances', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    member.currentBalance = 1000.49;
    member.savingBalance = 2000.005; // rounds to 2000.01
    await member.save();

    const reloaded = await Member.findById(member._id);
    expect(reloaded.currentBalance).toBe(1000.49);
    expect(reloaded.savingBalance).toBe(2000.01);
  });

  it('keeps a FinancialTransaction amount at 2 dp on create', async () => {
    const owner = await makeOwner();
    const tx = await FinancialTransaction.create({
      user: owner._id,
      type: 'income',
      category: 'repayment',
      amount: 4999.999,
      date: new Date(),
      description: 'test',
    });
    expect(tx.amount).toBe(5000);
  });
});
