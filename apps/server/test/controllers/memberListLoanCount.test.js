/**
 * getMembers active-loan count: the per-member `activeLoans` figure is computed
 * in ONE aggregation (was an N+1 — a Loan.countDocuments per member row). This
 * locks in that the count stays correct per member and only counts ACTIVE loans.
 */
const memberController = require('../../src/controllers/memberController');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('getMembers — active-loan count (single aggregation)', () => {
  it('reports the correct active-loan count per member', async () => {
    const owner = await makeOwner();

    // Member A: customer with 2 active + 1 completed loan → activeLoans = 2.
    const custA = await makeCustomer(owner, { name: 'alpha' });
    await makeMember(owner, { customer: custA._id });
    await makeLoan(owner, custA, { status: 'active' });
    await makeLoan(owner, custA, { status: 'active' });
    await makeLoan(owner, custA, { status: 'completed' });

    // Member B: customer with no loans → activeLoans = 0.
    const custB = await makeCustomer(owner, { name: 'beta' });
    await makeMember(owner, { customer: custB._id });

    const req = ownerReq(owner, { query: { limit: 50 } });
    const res = mockRes();
    await memberController.getMembers(req, res);

    expect(res.statusCode === 200 || res.statusCode === undefined).toBe(true);
    const byCustomer = new Map(
      res.body.data.map((m) => [String(m.customer?._id || m.customer), m]),
    );

    expect(byCustomer.get(String(custA._id)).activeLoans).toBe(2);
    expect(byCustomer.get(String(custB._id)).activeLoans).toBe(0);
  });

  it('does not count another tenant’s loans toward a member', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();

    // Same-name customers in two tenants; only ownerA's loan should count.
    const custA = await makeCustomer(ownerA, { name: 'shared' });
    await makeMember(ownerA, { customer: custA._id });
    await makeLoan(ownerA, custA, { status: 'active' });

    const custB = await makeCustomer(ownerB, { name: 'shared' });
    await makeMember(ownerB, { customer: custB._id });
    await makeLoan(ownerB, custB, { status: 'active' });
    await makeLoan(ownerB, custB, { status: 'active' });

    const req = ownerReq(ownerA, { query: { limit: 50 } });
    const res = mockRes();
    await memberController.getMembers(req, res);

    // ownerA sees only their own member, with their own single active loan.
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].activeLoans).toBe(1);
  });
});
