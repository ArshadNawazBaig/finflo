/**
 * dashboardController.addBusinessCapital — owner equity inject/withdraw. Updates
 * the cached businessCapital and books a business_capital FinancialTransaction
 * (which is excluded from operating-expense rollups).
 */
const User = require('../../src/models/User');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { addBusinessCapital } = require('../../src/controllers/dashboardController');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const req = (owner, body) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin' },
  body,
});

describe('addBusinessCapital', () => {
  it('400s on a non-positive amount', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await addBusinessCapital(req(owner, { amount: 0, type: 'inject' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s on an invalid type', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await addBusinessCapital(req(owner, { amount: 1000, type: 'transfer' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('injects capital: raises businessCapital and books income', async () => {
    const owner = await makeOwner({ businessCapital: 10000 });
    const res = mockRes();
    await addBusinessCapital(req(owner, { amount: 5000, type: 'inject' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.businessCapital).toBe(15000);
    const ft = await FinancialTransaction.findOne({ user: owner._id, category: 'business_capital' });
    expect(ft.type).toBe('income');
    expect(ft.amount).toBe(5000);
    expect((await User.findById(owner._id)).businessCapital).toBe(15000);
  });

  it('withdraws capital and books an expense', async () => {
    const owner = await makeOwner({ businessCapital: 10000 });
    const res = mockRes();
    await addBusinessCapital(req(owner, { amount: 4000, type: 'withdraw' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.businessCapital).toBe(6000);
    const ft = await FinancialTransaction.findOne({ user: owner._id, category: 'business_capital', type: 'expense' });
    expect(ft.amount).toBe(4000);
  });

  it('blocks a withdrawal that exceeds available capital', async () => {
    const owner = await makeOwner({ businessCapital: 1000 });
    const res = mockRes();
    await addBusinessCapital(req(owner, { amount: 5000, type: 'withdraw' }), res);
    expect(res.statusCode).toBe(400);
    expect((await User.findById(owner._id)).businessCapital).toBe(1000); // unchanged
  });
});
