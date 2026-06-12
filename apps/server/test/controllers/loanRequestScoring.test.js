/**
 * Credit-score gating on member self-service loan requests: a 'Very Poor' member
 * is blocked (400), a healthy member is allowed, and admin createLoan is NOT
 * gated (staff can still lend manually).
 */
const { requestLoan, createLoan } = require('../../src/controllers/loanController');
const {
  makeOwner,
  makeBranch,
  makeMember,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const DAY = 24 * 60 * 60 * 1000;

// A fully-formed member request (req.member is the Member doc in production).
const memberLoanReq = (member, customer, owner, body) => ({
  member: {
    _id: member._id,
    user: owner._id,
    customer: customer._id,
    cnic: member.cnic,
    phone: member.phone,
    branchId: member.branchId,
  },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
  query: {},
  files: [],
  body,
});

// Build a tenant with a branch + two grantor members so requestLoan's grantor
// resolution succeeds. Returns helpers to make a borrower.
const seedTenant = async () => {
  const owner = await makeOwner();
  const branch = await makeBranch(owner);
  await makeMember(owner, { name: 'grantor one' });
  await makeMember(owner, { name: 'grantor two' });

  const makeBorrower = async (custOverrides = {}) => {
    const member = await makeMember(owner, { shareBalance: 100000, branchId: branch._id });
    const customer = await makeCustomer(owner, {
      isMember: true,
      memberId: member._id,
      branchId: branch._id,
      savingAccountNumber: `SA-${member._id.toString().slice(-6)}`,
      ...custOverrides,
    });
    member.customer = customer._id;
    await member.save();
    return { member, customer };
  };

  return { owner, branch, makeBorrower };
};

const requestBody = {
  principal: 5000,
  duration: 6,
  grantor1Identifier: 'grantor one',
  grantor2Identifier: 'grantor two',
};

describe('requestLoan — credit-score gating', () => {
  it('blocks a Very Poor member from self-requesting (400)', async () => {
    const { owner, makeBorrower } = await seedTenant();
    const { member, customer } = await makeBorrower({ name: 'risky borrower' });
    // A recent default drives the score into the lowest band.
    await makeLoan(owner, customer, {
      status: 'defaulted',
      defaultedAt: new Date(),
      startDate: new Date(Date.now() - 400 * DAY),
    });

    const res = mockRes();
    await requestLoan(memberLoanReq(member, customer, owner, requestBody), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.creditBand).toBe('Very Poor');
  });

  it('allows a healthy member to self-request', async () => {
    const { owner, makeBorrower } = await seedTenant();
    const { member, customer } = await makeBorrower({ name: 'healthy borrower' });

    const res = mockRes();
    await requestLoan(memberLoanReq(member, customer, owner, requestBody), res);

    // A fresh borrower is 'Fair' — not gated; the request goes through.
    expect(res.statusCode).toBe(201);
  });

  it('does NOT gate admin-issued loans for a Very Poor customer', async () => {
    const { owner, branch, makeBorrower } = await seedTenant();
    const { customer } = await makeBorrower({ name: 'risky2' });
    await makeLoan(owner, customer, {
      status: 'defaulted',
      defaultedAt: new Date(),
      startDate: new Date(Date.now() - 400 * DAY),
    });

    const req = ownerReq(owner, {
      branchId: branch._id,
      body: {
        customerId: customer._id.toString(),
        principal: 5000,
        rate: 12,
        duration: 6,
        startDate: new Date().toISOString(),
      },
    });
    req.user.branchId = branch._id;
    const res = mockRes();
    await createLoan(req, res);

    // Admin issuance is intentionally un-gated by the score.
    expect(res.statusCode).toBe(201);
  });
});
