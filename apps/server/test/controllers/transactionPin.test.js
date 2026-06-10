/**
 * transactionPinController — 4-digit PIN set (password-gated), verify (issues a
 * short-lived transaction_pin token), wrong-PIN counting and lockout.
 */
const jwt = require('jsonwebtoken');
const Member = require('../../src/models/Member');
const pinc = require('../../src/controllers/transactionPinController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const PASSWORD = 'password123';
const req = (member, body) => ({ member: { _id: member._id }, body });

const setPin = (member, pin = '1234') =>
  pinc.setTransactionPin(req(member, { pin, currentPassword: PASSWORD }), mockRes());

describe('setTransactionPin', () => {
  it('400s on a non-4-digit PIN', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    const res = mockRes();
    await pinc.setTransactionPin(req(member, { pin: '12', currentPassword: PASSWORD }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s without the current password', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    const res = mockRes();
    await pinc.setTransactionPin(req(member, { pin: '1234' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s on the wrong current password', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    const res = mockRes();
    await pinc.setTransactionPin(req(member, { pin: '1234', currentPassword: 'nope' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('sets a hashed PIN with the correct password', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    const res = mockRes();
    await pinc.setTransactionPin(req(member, { pin: '1234', currentPassword: PASSWORD }), res);
    expect(res.statusCode).toBe(200);
    const fresh = await Member.findById(member._id).select('+transactionPin');
    expect(fresh.transactionPin).toBeTruthy();
    expect(fresh.transactionPin).not.toBe('1234'); // hashed, not plaintext
  });
});

describe('verifyTransactionPin', () => {
  it('400s when no PIN has been set', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    const res = mockRes();
    await pinc.verifyTransactionPin(req(member, { pin: '1234' }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PIN_NOT_SET');
  });

  it('issues a transaction_pin token for the correct PIN', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    await setPin(member, '1234');

    const res = mockRes();
    await pinc.verifyTransactionPin(req(member, { pin: '1234' }), res);
    expect(res.statusCode).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).type).toBe('transaction_pin');
  });

  it('422s with attemptsRemaining on a wrong PIN', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    await setPin(member, '1234');

    const res = mockRes();
    await pinc.verifyTransactionPin(req(member, { pin: '0000' }), res);
    expect(res.statusCode).toBe(422);
    expect(res.body.code).toBe('WRONG_PIN');
    expect(res.body.attemptsRemaining).toBe(4);
  });

  it('locks the PIN after 5 wrong attempts', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { password: PASSWORD });
    await setPin(member, '1234');

    let res;
    for (let i = 0; i < 5; i++) {
      res = mockRes();
      await pinc.verifyTransactionPin(req(member, { pin: '0000' }), res);
    }
    expect(res.statusCode).toBe(423);
    expect(res.body.code).toBe('PIN_LOCKED');
  });
});
