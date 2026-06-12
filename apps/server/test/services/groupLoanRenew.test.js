/**
 * Group-loan renewal: rollover (carry outstanding into a new cycle), top-up
 * (new per-member principal, disburse only the difference), extend (re-amortize
 * in place), the at-risk top-up freeze, and tenant isolation.
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const GroupLoan = require('../../src/models/GroupLoan');
const LoanGroup = require('../../src/models/LoanGroup');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const groupLoanService = require('../../src/services/groupLoanService');
const groupLoanController = require('../../src/controllers/groupLoanController');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeGroup,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const seedApproved = async (owner, { withWallet } = {}) => {
  const mk = async (name) => {
    if (!withWallet) return makeCustomer(owner, { name });
    const member = await makeMember(owner, { currentBalance: 0 });
    return makeCustomer(owner, { name, isMember: true, memberId: member._id });
  };
  const custA = await mk('alpha');
  const custB = await mk('beta');
  const group = await makeGroup(owner, [custA, custB]);
  const req = ownerReq(owner);
  const groupLoan = await groupLoanService.createGroupLoan(req, {
    groupId: group._id,
    rate: 24,
    duration: 12,
    allocations: [
      { customer: custA._id, principal: 50000 },
      { customer: custB._id, principal: 30000 },
    ],
  });
  await groupLoanService.approveGroupLoan(req, groupLoan._id);
  return { group, groupLoan, custA, custB };
};

describe('renewGroupLoan — rollover', () => {
  it('opens a new cycle carrying each member outstanding and closes the old one', async () => {
    const owner = await makeOwner();
    const { group, groupLoan } = await seedApproved(owner);

    const req = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: { renewalType: 'rollover', duration: 12 },
    });
    const res = mockRes();
    await groupLoanController.renewGroupLoan(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('active');
    expect(res.body.cycleNumber).toBe(2);
    expect(String(res.body.renewedFrom)).toBe(String(groupLoan._id));

    // New sub-loans carry the old outstanding (62000 / 37200) as principal.
    const newLoans = await Loan.find({ groupLoan: res.body._id }).sort({ principal: -1 });
    expect(newLoans.map((l) => l.principal)).toEqual([62000, 37200]);
    expect(newLoans.every((l) => l.status === 'active')).toBe(true);

    // Old cycle is renewed/closed; its sub-loans closed with zero balance.
    const oldCycle = await GroupLoan.findById(groupLoan._id);
    expect(oldCycle.status).toBe('renewed');
    expect(String(oldCycle.renewedTo)).toBe(String(res.body._id));
    const oldLoans = await Loan.find({ groupLoan: groupLoan._id });
    expect(oldLoans.every((l) => l.status === 'renewed' && l.remainingAmount === 0)).toBe(true);

    // Rollover moves no cash — no new disbursement ledger rows from the renewal.
    const renewDisb = await FinancialTransaction.find({
      category: 'loan_disbursement',
      loan: { $in: newLoans.map((l) => l._id) },
    });
    expect(renewDisb).toHaveLength(0);

    const reloadedGroup = await LoanGroup.findById(group._id);
    expect(reloadedGroup.status).toBe('active');
  });
});

describe('renewGroupLoan — top-up', () => {
  it('disburses only the extra above each member outstanding', async () => {
    const owner = await makeOwner();
    const { groupLoan, custA } = await seedApproved(owner, { withWallet: true });
    const subA = await Loan.findOne({ groupLoan: groupLoan._id, customer: custA._id });
    // Drain the disbursed wallet so we can see exactly the top-up credit.
    await Member.updateMany({ user: owner._id }, { $set: { currentBalance: 0 } });

    // custA outstanding 62000 → top up to 100000 (extra 38000).
    const subB = await Loan.findOne({
      groupLoan: groupLoan._id,
      customer: { $ne: custA._id },
    });
    const req = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: {
        renewalType: 'topup',
        duration: 12,
        allocations: [
          { loan: subA._id, principal: 100000 },
          { loan: subB._id, principal: 60000 }, // outstanding 37200 → extra 22800
        ],
      },
    });
    const res = mockRes();
    await groupLoanController.renewGroupLoan(req, res);

    expect(res.statusCode).toBe(201);
    const memberA = await Member.findById(custA.memberId);
    // Only the extra (100000 − 62000 = 38000) is disbursed to the wallet.
    expect(memberA.currentBalance).toBe(38000);

    const newLoans = await Loan.find({ groupLoan: res.body._id });
    expect(newLoans.map((l) => l.principal).sort((a, b) => a - b)).toEqual([60000, 100000]);
  });

  it('rejects a top-up that does not exceed outstanding (400)', async () => {
    const owner = await makeOwner();
    const { groupLoan, custA } = await seedApproved(owner);
    const subA = await Loan.findOne({ groupLoan: groupLoan._id, customer: custA._id });

    const req = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: {
        renewalType: 'topup',
        allocations: [{ loan: subA._id, principal: 1000 }], // below outstanding
      },
    });
    const res = mockRes();
    await groupLoanController.renewGroupLoan(req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('renewGroupLoan — extend', () => {
  it('re-amortizes sub-loans in place without a new cycle', async () => {
    const owner = await makeOwner();
    const { groupLoan } = await seedApproved(owner);

    const req = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: { renewalType: 'extend', duration: 24 },
    });
    const res = mockRes();
    await groupLoanController.renewGroupLoan(req, res);

    expect(res.statusCode).toBe(201);
    // Same cycle, no new GroupLoan created.
    expect(String(res.body._id)).toBe(String(groupLoan._id));
    expect(await GroupLoan.countDocuments({})).toBe(1);

    const subLoans = await Loan.find({ groupLoan: groupLoan._id });
    expect(subLoans.every((l) => l.duration === 24)).toBe(true);
    expect(subLoans.every((l) => l.renewalType === 'extend')).toBe(true);
  });
});

describe('renewGroupLoan — guards', () => {
  it('freezes top-up while the group is at-risk but allows rollover', async () => {
    const owner = await makeOwner();
    const { groupLoan, custA } = await seedApproved(owner);

    // Push a sub-loan overdue → group at-risk.
    const subLoan = await Loan.findOne({ groupLoan: groupLoan._id });
    subLoan.status = 'overdue';
    await subLoan.save();
    await groupLoanService.cascadeGroupRisk(subLoan);

    const subA = await Loan.findOne({ groupLoan: groupLoan._id, customer: custA._id });
    const topupReq = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: {
        renewalType: 'topup',
        allocations: [{ loan: subA._id, principal: 200000 }],
      },
    });
    const topupRes = mockRes();
    await groupLoanController.renewGroupLoan(topupReq, topupRes);
    expect(topupRes.statusCode).toBe(400);
    expect(topupRes.body.message).toMatch(/at-risk/i);

    // Rollover is still allowed (no new cash) and recovers the group.
    const rolloverReq = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: { renewalType: 'rollover' },
    });
    const rolloverRes = mockRes();
    await groupLoanController.renewGroupLoan(rolloverReq, rolloverRes);
    expect(rolloverRes.statusCode).toBe(201);
  });

  it('returns 404 for another tenant', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const { groupLoan } = await seedApproved(ownerA);

    const req = ownerReq(ownerB, {
      params: { groupLoanId: groupLoan._id.toString() },
      body: { renewalType: 'rollover' },
    });
    const res = mockRes();
    await groupLoanController.renewGroupLoan(req, res);
    expect(res.statusCode).toBe(404);
  });
});
