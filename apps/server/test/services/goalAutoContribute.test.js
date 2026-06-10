/**
 * goalAutoContribute.creditGoal — atomically moves wallet funds into a saving
 * goal, completes the goal on target, and skips (returns null) on insufficient
 * balance or an inactive goal — without throwing, so the parent flow continues.
 */
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const SavingGoal = require('../../src/models/SavingGoal');
const { creditGoal } = require('../../src/services/goalAutoContribute');
const { makeOwner, makeMember } = require('../helpers/factories');

const makeGoal = (owner, member, over = {}) =>
  SavingGoal.create({
    user: owner._id, member: member._id, title: 'Car', targetAmount: 5000,
    currentAmount: 0, status: 'active', ...over,
  });

describe('creditGoal', () => {
  it('debits the wallet, credits the goal and writes the ledger', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 10000 });
    const goal = await makeGoal(owner, member);

    const result = await creditGoal({
      memberId: member._id, goal, amount: 2000, sourceAccount: 'current', trigger: 'recurring',
    });

    expect(result).toBeTruthy();
    expect((await Member.findById(member._id)).currentBalance).toBe(8000);
    expect((await SavingGoal.findById(goal._id)).currentAmount).toBe(2000);
    expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(1);
  });

  it('completes the goal when the target is reached', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 10000 });
    const goal = await makeGoal(owner, member, { targetAmount: 2000 });

    await creditGoal({ memberId: member._id, goal, amount: 2000, sourceAccount: 'current', trigger: 'recurring' });
    expect((await SavingGoal.findById(goal._id)).status).toBe('completed');
  });

  it('returns null and changes nothing on insufficient balance', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 500 });
    const goal = await makeGoal(owner, member);

    const result = await creditGoal({ memberId: member._id, goal, amount: 2000, sourceAccount: 'current', trigger: 'recurring' });
    expect(result).toBe(null);
    expect((await Member.findById(member._id)).currentBalance).toBe(500);
    expect((await SavingGoal.findById(goal._id)).currentAmount).toBe(0);
  });

  it('returns null and rolls back when the goal is not active', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 10000 });
    const goal = await makeGoal(owner, member, { status: 'cancelled' });

    const result = await creditGoal({ memberId: member._id, goal, amount: 2000, sourceAccount: 'current', trigger: 'recurring' });
    expect(result).toBe(null);
    expect((await Member.findById(member._id)).currentBalance).toBe(10000); // rolled back
  });
});
