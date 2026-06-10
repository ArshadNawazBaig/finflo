/**
 * savingGoalController.contributeToGoal — atomic wallet debit, the active-goal
 * status guard (no contributing into a closed goal), and overdraft protection.
 */
const SavingGoal = require('../../src/models/SavingGoal');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const savingGoalController = require('../../src/controllers/savingGoalController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const goalReq = (member, owner, goalId, amount) => ({
  member: { _id: member._id, user: owner._id, branchId: member.branchId, name: 'M' },
  params: { id: String(goalId) },
  body: { amount },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

async function makeGoal(owner, member, overrides = {}) {
  return SavingGoal.create({
    user: owner._id,
    member: member._id,
    title: 'New Car',
    targetAmount: 100000,
    currentAmount: 0,
    status: 'active',
    ...overrides,
  });
}

describe('contributeToGoal', () => {
  it('debits the wallet and credits the goal atomically', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 20000 });
    const goal = await makeGoal(owner, member);

    const res = mockRes();
    await savingGoalController.contributeToGoal(goalReq(member, owner, goal._id, 5000), res);

    expect(res.body.success).toBe(true);
    const freshMember = await Member.findById(member._id);
    const freshGoal = await SavingGoal.findById(goal._id);
    expect(freshMember.currentBalance).toBe(15000);
    expect(freshGoal.currentAmount).toBe(5000);
    expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(1);
  });

  it('marks the goal completed once the target is reached', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 100000 });
    const goal = await makeGoal(owner, member, { targetAmount: 10000 });

    await savingGoalController.contributeToGoal(goalReq(member, owner, goal._id, 10000), mockRes());

    const freshGoal = await SavingGoal.findById(goal._id);
    expect(freshGoal.status).toBe('completed');
  });

  it('refuses to contribute into a cancelled goal and does not debit', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 20000 });
    const goal = await makeGoal(owner, member, { status: 'cancelled' });

    const res = mockRes();
    await savingGoalController.contributeToGoal(goalReq(member, owner, goal._id, 5000), res);

    expect(res.statusCode).toBe(400);
    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(20000); // rolled back
  });

  it('blocks an overdraft contribution', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000 });
    const goal = await makeGoal(owner, member);

    const res = mockRes();
    await savingGoalController.contributeToGoal(goalReq(member, owner, goal._id, 5000), res);

    expect(res.statusCode).toBe(400);
    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(1000);
  });

  it('rejects a non-positive amount', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 20000 });
    const goal = await makeGoal(owner, member);

    const res = mockRes();
    await savingGoalController.contributeToGoal(goalReq(member, owner, goal._id, -100), res);
    expect(res.statusCode).toBe(400);
  });
});
