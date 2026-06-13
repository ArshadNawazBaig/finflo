/**
 * Welcome email is sent exactly once per business, on first signup.
 *
 * `sendWelcomeEmailOnce` stamps `welcomeEmailSentAt` after sending, so it is
 * idempotent across every signup path (email verification / Google) and never
 * double-emails on subsequent logins. `sendEmail` itself never throws (it
 * catches internally and returns false when SMTP is unconfigured, as in tests),
 * so the stamp is the observable signal we assert on.
 */
const User = require('../../src/models/User');
const {
  sendWelcomeEmailOnce,
  verifyEmail,
} = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/mocks');
const { uid } = require('../helpers/factories');

const makeUser = (overrides = {}) =>
  User.create({
    name: 'New Business',
    email: `welcome-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'admin',
    ...overrides,
  });

describe('sendWelcomeEmailOnce', () => {
  it('stamps welcomeEmailSentAt on the first call and persists it', async () => {
    const user = await makeUser();
    expect(user.welcomeEmailSentAt).toBeUndefined();

    await sendWelcomeEmailOnce(user);

    expect(user.welcomeEmailSentAt).toBeInstanceOf(Date);
    const fresh = await User.findById(user._id);
    expect(fresh.welcomeEmailSentAt).toBeInstanceOf(Date);
  });

  it('is idempotent — a second call does not re-stamp (no re-send)', async () => {
    const user = await makeUser();
    await sendWelcomeEmailOnce(user);
    const firstStamp = user.welcomeEmailSentAt.getTime();

    await sendWelcomeEmailOnce(user);

    expect(user.welcomeEmailSentAt.getTime()).toBe(firstStamp);
  });

  it('does nothing when the account was already welcomed', async () => {
    const stampedAt = new Date('2025-01-01T00:00:00.000Z');
    const user = await makeUser({ welcomeEmailSentAt: stampedAt });

    await sendWelcomeEmailOnce(user);

    expect(user.welcomeEmailSentAt.getTime()).toBe(stampedAt.getTime());
  });
});

describe('verifyEmail wiring', () => {
  const verifyReq = (email, code) => ({
    body: { email, code },
    ip: '127.0.0.1',
    get: () => 'test',
    headers: {},
  });

  it('sends the welcome email (stamps the date) on first verification', async () => {
    const code = 'ABC123';
    const user = await makeUser({
      isVerified: false,
      verificationCode: code,
      verificationCodeExpire: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = mockRes();
    await verifyEmail(verifyReq(user.email, code), res);

    expect(res.statusCode).toBe(200);
    const fresh = await User.findById(user._id);
    expect(fresh.isVerified).toBe(true);
    expect(fresh.welcomeEmailSentAt).toBeInstanceOf(Date);
  });
});
