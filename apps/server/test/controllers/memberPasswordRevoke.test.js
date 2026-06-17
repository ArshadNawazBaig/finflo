/**
 * Member password changes revoke sessions (parity with the business side).
 * updatePassword keeps the caller's CURRENT session and revokes the others;
 * resetPassword (anonymous) revokes ALL of the member's sessions.
 */
const crypto = require('crypto');
const Session = require('../../src/models/Session');
const { issueSession } = require('../../src/services/tokenService');
const {
  updatePassword,
  resetPassword,
} = require('../../src/controllers/memberAuthController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const PASSWORD = 'password123';
const NEWPASS = 'NewSecret456!';

beforeAll(async () => {
  await Session.createCollection().catch(() => {});
  await Session.createIndexes().catch(() => {});
});

const seed = async () => {
  const owner = await makeOwner();
  const member = await makeMember(owner, { password: PASSWORD });
  return { owner, member };
};

describe('member password change → session revocation', () => {
  it('updatePassword revokes other member sessions but keeps the current one', async () => {
    const { owner, member } = await seed();
    const current = await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });
    const other = await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });

    const res = mockRes();
    await updatePassword(
      {
        member: { _id: member._id },
        body: { currentPassword: PASSWORD, newPassword: NEWPASS },
        cookies: { refresh_token: current.refreshToken },
        get: () => undefined,
        headers: {},
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect((await Session.findById(current.session._id)).revokedAt).toBeNull();
    expect((await Session.findById(other.session._id)).revokedAt).toBeTruthy();
  });

  it('resetPassword revokes ALL of the member’s sessions', async () => {
    const { owner, member } = await seed();
    const resettoken = `raw-${member._id}`;
    member.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');
    member.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await member.save();

    await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });
    await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });

    const res = mockRes();
    await resetPassword(
      {
        params: { resettoken },
        body: { password: NEWPASS },
        get: () => undefined,
        headers: {},
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    const active = await Session.countDocuments({
      principal: member._id,
      revokedAt: null,
    });
    expect(active).toBe(0);
  });
});
