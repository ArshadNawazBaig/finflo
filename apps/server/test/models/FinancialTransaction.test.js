/** FinancialTransaction (audit ledger) schema — required fields, enums, defaults. */
const mongoose = require('mongoose');
const FinancialTransaction = require('../../src/models/FinancialTransaction');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  type: 'income',
  category: 'fee_income',
  amount: 500,
});

describe('FinancialTransaction schema', () => {
  it('validates a complete row', () => {
    expect(new FinancialTransaction(base()).validateSync()).toBeUndefined();
  });

  it('requires user, type, category and amount', () => {
    const err = new FinancialTransaction({}).validateSync();
    ['user', 'type', 'category', 'amount'].forEach((f) => expect(err.errors[f]).toBeTruthy());
  });

  it('rejects an invalid type', () => {
    const err = new FinancialTransaction({ ...base(), type: 'refund' }).validateSync();
    expect(err.errors.type).toBeTruthy();
  });

  it('defaults status=Completed and paymentMethod=cash', () => {
    const ft = new FinancialTransaction(base());
    expect(ft.status).toBe('Completed');
    expect(ft.paymentMethod).toBe('cash');
  });

  it('accepts each allowed type', () => {
    ['income', 'expense', 'loan', 'credit', 'debit'].forEach((type) => {
      expect(new FinancialTransaction({ ...base(), type }).validateSync()).toBeUndefined();
    });
  });
});
