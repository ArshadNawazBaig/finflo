/**
 * Raast deposit webhook — HMAC-signed, idempotent crediting. A replayed PAID
 * event must credit the wallet exactly once.
 */
const crypto = require('crypto');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const raastWebhookController = require('../../src/controllers/raastWebhookController');
const { makeOwner, makeMember, makeBranch } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const sign = (body) =>
  crypto.createHmac('sha256', process.env.RAAST_SECRET_KEY).update(JSON.stringify(body)).digest('hex');

describe('handleRaastWebhook — idempotency', () => {
  it('credits exactly once even when the same PAID event is delivered twice', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner, { name: 'Main' });
    const member = await makeMember(owner, { currentBalance: 0, branchId: branch._id });
    const investment = await Investment.create({
      user: owner._id,
      member: member._id,
      branchId: branch._id,
      type: 'deposit',
      amount: 5000,
      status: 'Pending',
      metadata: { raastStatus: 'PENDING' },
    });

    const body = {
      order_reference: String(investment._id),
      amount: '5000',
      status: 'PAID',
      transaction_id: 'TXN-1',
    };
    const makeReq = () => ({ body, headers: { 'x-signature': sign(body) }, ip: '127.0.0.1' });

    await raastWebhookController.handleRaastWebhook(makeReq(), mockRes());
    await raastWebhookController.handleRaastWebhook(makeReq(), mockRes()); // replay

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(5000); // once, not 10000
    expect(await FinancialTransaction.countDocuments({ member: member._id, type: 'income' })).toBe(1);
  });
});
