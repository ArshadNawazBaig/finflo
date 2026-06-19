/**
 * runScheduledPayments (cron job) — guards the atomicity / idempotency fix.
 *
 * The executor now runs each due payment inside its own MongoDB transaction
 * with an in-txn claim (re-read + guard) and an atomic `$inc` balance move, so
 * it can't double-execute under a second replica / crash-retry and can't leave
 * partial money movement if a mid-execution step fails.
 *
 * The job opens its OWN transaction, so per the repo's mongodb-memory-server
 * gotcha we pre-create the written collections + indexes in `beforeAll` to
 * dodge the "catalog changes" error.
 */
const {
  runScheduledPayments,
} = require('../../src/services/scheduledTasksService');
const ScheduledPayment = require('../../src/models/ScheduledPayment');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { makeOwner, makeMember } = require('../helpers/factories');

beforeAll(async () => {
  for (const M of [ScheduledPayment, Member, Investment, FinancialTransaction]) {
    await M.createCollection().catch(() => {});
    await M.createIndexes().catch(() => {});
  }
});

const dueYesterday = () => new Date(Date.now() - 86400000);

const makeDue = (owner, member, over = {}) =>
  ScheduledPayment.create({
    member: member._id,
    user: owner._id,
    type: 'saving_deposit',
    amount: 300,
    sourceAccount: 'current',
    dayOfMonth: 10,
    nextExecutionDate: dueYesterday(),
    status: 'active',
    ...over,
  });

describe('runScheduledPayments', () => {
  it('executes a due saving deposit once: current→saving, ledger written, schedule advanced', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000, savingBalance: 0 });
    const sp = await makeDue(owner, member);

    await runScheduledPayments();

    const m = await Member.findById(member._id);
    expect(m.currentBalance).toBe(700);
    expect(m.savingBalance).toBe(300);
    expect(await Investment.countDocuments({ member: member._id })).toBe(1);
    expect(
      await FinancialTransaction.countDocuments({
        member: member._id,
        category: 'saving_deposit',
      }),
    ).toBe(1);

    const after = await ScheduledPayment.findById(sp._id);
    expect(after.status).toBe('active');
    expect(after.executionCount).toBe(1);
    expect(new Date(after.nextExecutionDate).getTime()).toBeGreaterThan(Date.now());
  });

  it('is idempotent: a repeat run (2nd replica / retry) does not move money twice', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000, savingBalance: 0 });
    await makeDue(owner, member);

    await runScheduledPayments();
    await runScheduledPayments(); // simulate a second runner

    const m = await Member.findById(member._id);
    expect(m.currentBalance).toBe(700); // exactly ONE deduction
    expect(m.savingBalance).toBe(300);
    expect(await Investment.countDocuments({ member: member._id })).toBe(1);
  });

  it('insufficient funds → no money moved, schedule marked failed', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 100, savingBalance: 0 });
    const sp = await makeDue(owner, member, { amount: 300 });

    await runScheduledPayments();

    const m = await Member.findById(member._id);
    expect(m.currentBalance).toBe(100);
    expect(m.savingBalance).toBe(0);
    expect(await Investment.countDocuments({ member: member._id })).toBe(0);
    expect((await ScheduledPayment.findById(sp._id)).status).toBe('failed');
  });

  it('atomic: a mid-execution ledger failure rolls back the balance (no partial money movement)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000, savingBalance: 0 });
    const sp = await makeDue(owner, member);

    // Force the FinancialTransaction write (which happens AFTER the balance
    // $inc) to throw → the whole transaction must abort, leaving balance +
    // Investment untouched. On the pre-fix code this left a partial state
    // (balance debited, investment created, ledger missing).
    const spy = vi
      .spyOn(FinancialTransaction, 'create')
      .mockRejectedValueOnce(new Error('boom'));

    await runScheduledPayments();

    spy.mockRestore();

    const m = await Member.findById(member._id);
    expect(m.currentBalance).toBe(1000); // rolled back, NOT 700
    expect(m.savingBalance).toBe(0);
    expect(await Investment.countDocuments({ member: member._id })).toBe(0);

    const after = await ScheduledPayment.findById(sp._id);
    expect(after.status).not.toBe('completed');
    expect(after.executionCount).toBe(0); // schedule not advanced
  });
});
