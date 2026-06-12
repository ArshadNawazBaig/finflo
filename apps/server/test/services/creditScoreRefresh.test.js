/**
 * refreshCreditScore persists the snapshot onto the Customer, and a repayment
 * keeps it current.
 */
const Customer = require('../../src/models/Customer');
const { refreshCreditScore } = require('../../src/services/creditScoringService');
const loanRepaymentService = require('../../src/services/loanRepaymentService');
const {
  makeOwner,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

describe('refreshCreditScore', () => {
  it('persists the score snapshot onto the customer', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'snap' });
    await makeLoan(owner, cust, { status: 'completed' });

    const result = await refreshCreditScore(cust._id);
    const reloaded = await Customer.findById(cust._id);

    expect(reloaded.creditScore).toBeTruthy();
    expect(reloaded.creditScore.score).toBe(result.score);
    expect(reloaded.creditScore.band).toBe(result.band);
    expect(reloaded.creditScore.computedAt).toBeTruthy();
  });

  it('refreshes the snapshot when a repayment is processed', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'payer' });
    const loan = await makeLoan(owner, cust, {
      status: 'active',
      remainingAmount: 124000,
    });

    expect((await Customer.findById(cust._id)).creditScore?.computedAt).toBeFalsy();

    await loanRepaymentService.processRepayment(loan, 5000, ownerReq(owner), {
      deductFromWallet: false,
      allowEarlySettlement: false,
    });

    const reloaded = await Customer.findById(cust._id);
    expect(reloaded.creditScore?.computedAt).toBeTruthy();
    expect(typeof reloaded.creditScore.score).toBe('number');
  });
});
