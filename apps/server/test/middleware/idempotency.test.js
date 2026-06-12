/**
 * Tests for the idempotency middleware — the guard that stops a double-submitted
 * money action (deposit/transfer/repayment) from posting twice. Runs against the
 * real in-memory replica set so the unique-index claim behaves as in production.
 */
const { idempotency } = require('../../src/middleware/idempotency');
const IdempotencyKey = require('../../src/models/IdempotencyKey');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const makeReq = (owner, key, body = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id },
  method: 'POST',
  baseUrl: '/api/members',
  path: '/abc/invest',
  body,
  get: (h) => (h === 'Idempotency-Key' ? key : undefined),
});

// Helper: run middleware and report whether next() was invoked.
const runMw = async (req, res) => {
  let nextCalled = false;
  await idempotency(req, res, () => {
    nextCalled = true;
  });
  return nextCalled;
};

const waitCompleted = async (key) => {
  for (let i = 0; i < 50; i++) {
    const r = await IdempotencyKey.findOne({ key });
    if (r && r.status === 'completed') return r;
    await new Promise((res) => setTimeout(res, 10));
  }
  throw new Error(`idempotency record for ${key} never completed`);
};

describe('idempotency middleware', () => {
  it('passes straight through when no Idempotency-Key header is present', async () => {
    const owner = await makeOwner();
    const req = makeReq(owner, undefined);
    const res = mockRes();
    const nextCalled = await runMw(req, res);
    expect(nextCalled).toBe(true);
    expect(await IdempotencyKey.countDocuments()).toBe(0);
  });

  it('claims a key on first use and replays the stored response on a repeat', async () => {
    const owner = await makeOwner();

    // First request — handler runs and responds 201.
    const req1 = makeReq(owner, 'key-1', { amount: 100 });
    const res1 = mockRes();
    expect(await runMw(req1, res1)).toBe(true);
    res1.status(201).json({ ok: true, id: 'abc' });
    await waitCompleted('key-1');

    // Replay with the same key + body — handler must NOT run again.
    const req2 = makeReq(owner, 'key-1', { amount: 100 });
    const res2 = mockRes();
    expect(await runMw(req2, res2)).toBe(false);
    expect(res2.statusCode).toBe(201);
    expect(res2.body).toEqual({ ok: true, id: 'abc' });

    // Exactly one money action recorded.
    expect(await IdempotencyKey.countDocuments({ key: 'key-1' })).toBe(1);
  });

  it('rejects a key reused with a different request body (422)', async () => {
    const owner = await makeOwner();
    const req1 = makeReq(owner, 'key-2', { amount: 100 });
    const res1 = mockRes();
    await runMw(req1, res1);
    res1.status(201).json({ ok: true });
    await waitCompleted('key-2');

    const req2 = makeReq(owner, 'key-2', { amount: 999 });
    const res2 = mockRes();
    expect(await runMw(req2, res2)).toBe(false);
    expect(res2.statusCode).toBe(422);
  });

  it('returns 409 while a duplicate request is still in flight', async () => {
    const owner = await makeOwner();
    await IdempotencyKey.create({
      owner: owner._id,
      actorId: owner._id,
      key: 'key-3',
      status: 'pending',
    });

    const req = makeReq(owner, 'key-3', { amount: 100 });
    const res = mockRes();
    expect(await runMw(req, res)).toBe(false);
    expect(res.statusCode).toBe(409);
  });

  it('releases the key on a non-2xx response so the client can retry', async () => {
    const owner = await makeOwner();
    const req1 = makeReq(owner, 'key-4', { amount: 100 });
    const res1 = mockRes();
    await runMw(req1, res1);
    res1.status(400).json({ message: 'validation failed' });

    // The pending record is deleted on failure — wait for it to clear.
    for (let i = 0; i < 50; i++) {
      if ((await IdempotencyKey.countDocuments({ key: 'key-4' })) === 0) break;
      await new Promise((res) => setTimeout(res, 10));
    }
    expect(await IdempotencyKey.countDocuments({ key: 'key-4' })).toBe(0);

    // Retry succeeds (handler runs again).
    const req2 = makeReq(owner, 'key-4', { amount: 100 });
    const res2 = mockRes();
    expect(await runMw(req2, res2)).toBe(true);
  });
});
