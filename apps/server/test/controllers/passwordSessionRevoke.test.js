/**
 * Password changes revoke sessions. A logged-in change (updatePassword) keeps the
 * caller's CURRENT session and revokes the others; an anonymous reset
 * (resetPassword) revokes ALL of the user's sessions (compromise recovery).
 */
const crypto = require('crypto');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const { issueSession } = require('../../src/services/tokenService');
const { updatePassword, resetPassword } = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/mocks');
const { uid } = require('../helpers/factories');

const PASSWORD = 'Secret123!';
const NEWPASS = 'NewSecret456!';

const makeUser = () =>
  User.create({
    name: 'pw user',
    email: `pw-${uid()}@test.com`,
    password: PASSWORD,
    role: 'admin',
    isActive: true,
    isVerified: true,
  });

beforeAll(async () => {
  await Session.createCollection().catch(() => {});
  await Session.createIndexes().catch(() => {});
});

describe('password change → session revocation', () => {
  it('updatePassword revokes other sessions but keeps the current one', async () => {
    const user = await makeUser();
    const current = await issueSession({
      principalId: user._id,
      principalModel: 'User',
    });
    const other = await issueSession({
      principalId: user._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await updatePassword(
      {
        user: { id: user._id },
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

  it('resetPassword revokes ALL of the user’s sessions', async () => {
    const user = await makeUser();
    const resettoken = `raw-${uid()}`;
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save();

    await issueSession({ principalId: user._id, principalModel: 'User' });
    await issueSession({ principalId: user._id, principalModel: 'User' });

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
      principal: user._id,
      revokedAt: null,
    });
    expect(active).toBe(0);
  });
});
