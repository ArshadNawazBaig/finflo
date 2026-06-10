/**
 * scheduledPaymentController — member-scoped CRUD for recurring saving deposits /
 * loan repayments: validation, next-execution scheduling, pause/resume, and
 * ownership isolation.
 */
const ScheduledPayment = require('../../src/models/ScheduledPayment');
const spc = require('../../src/controllers/scheduledPaymentController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');
const mongoose = require('mongoose');

const req = (member, owner, over = {}) => ({
  member: { _id: member._id, user: owner._id },
  body: {},
  params: {},
  ...over,
});

describe('createScheduledPayment', () => {
  it('400s on missing required fields', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.createScheduledPayment(req(member, owner, { body: { amount: 1000 } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s when dayOfMonth is out of the 1–28 range', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.createScheduledPayment(
      req(member, owner, { body: { type: 'saving_deposit', amount: 1000, dayOfMonth: 31 } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it('400s on a non-positive amount', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.createScheduledPayment(
      req(member, owner, { body: { type: 'saving_deposit', amount: 0, dayOfMonth: 5 } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it('400s for a loan_repayment schedule without a loanId', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.createScheduledPayment(
      req(member, owner, { body: { type: 'loan_repayment', amount: 1000, dayOfMonth: 5 } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it('creates an active schedule with a future next-execution date', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.createScheduledPayment(
      req(member, owner, { body: { type: 'saving_deposit', amount: 1500, dayOfMonth: 10 } }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('active');
    expect(res.body.sourceAccount).toBe('current');
    expect(new Date(res.body.nextExecutionDate).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('updateScheduledPayment', () => {
  const makeSchedule = (owner, member) =>
    ScheduledPayment.create({
      member: member._id, user: owner._id, type: 'saving_deposit',
      amount: 1000, sourceAccount: 'current', dayOfMonth: 10,
      nextExecutionDate: new Date(Date.now() + 86400000),
    });

  it('pauses an active schedule', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const sched = await makeSchedule(owner, member);
    const res = mockRes();
    await spc.updateScheduledPayment(
      req(member, owner, { params: { id: String(sched._id) }, body: { status: 'paused' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('paused');
  });

  it('rejects an invalid status value', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const sched = await makeSchedule(owner, member);
    const res = mockRes();
    await spc.updateScheduledPayment(
      req(member, owner, { params: { id: String(sched._id) }, body: { status: 'deleted' } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it('404s for another member’s schedule', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const stranger = await makeMember(owner);
    const sched = await makeSchedule(owner, member);
    const res = mockRes();
    await spc.updateScheduledPayment(
      req(stranger, owner, { params: { id: String(sched._id) }, body: { status: 'paused' } }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('deleteScheduledPayment', () => {
  it('cancels an existing schedule', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const sched = await ScheduledPayment.create({
      member: member._id, user: owner._id, type: 'saving_deposit',
      amount: 1000, dayOfMonth: 10, nextExecutionDate: new Date(Date.now() + 86400000),
    });
    const res = mockRes();
    await spc.deleteScheduledPayment(req(member, owner, { params: { id: String(sched._id) } }), res);
    expect(res.statusCode).toBe(200);
    expect(await ScheduledPayment.countDocuments({ _id: sched._id })).toBe(0);
  });

  it('404s when deleting a non-existent schedule', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();
    await spc.deleteScheduledPayment(
      req(member, owner, { params: { id: String(new mongoose.Types.ObjectId()) } }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});
