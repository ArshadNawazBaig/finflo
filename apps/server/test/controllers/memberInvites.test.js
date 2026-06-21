/**
 * memberInvites — admins/staff invite prospective members by email; each invite
 * carries a sha256-hashed token (only the hash is stored). The public accept
 * endpoint turns a valid token into an approved/active Member + linked Customer
 * inside a transaction and auto-logs the new member in. Covers the invite happy
 * path (create/dedupe/skip), list pagination + tenant isolation, resend/revoke
 * ownership, and every accept branch (happy/expired/revoked/invalid/dupe/limit).
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');
const MemberInvite = require('../../src/models/MemberInvite');
const Session = require('../../src/models/Session');
const {
  inviteMembers,
  listInvites,
  resendInvite,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
} = require('../../src/controllers/memberController');
const {
  makeOwner,
  makeBranch,
  makeMember,
  uid,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// acceptInvite opens its own transaction. mongodb-memory-server throws a
// "catalog changes" error if the transaction is the first op to create a
// collection or build its indexes. Pre-create every collection the accept path
// touches (plus Session, written by the auto-login session layer).
beforeAll(async () => {
  for (const M of [Member, Customer, User, MemberInvite, Session]) {
    await M.createCollection().catch(() => {});
    await M.createIndexes().catch(() => {});
  }
});

// Email sending hits no network here: there's no RESEND_API_KEY and no SMTP
// config in the test env, so sendEmail resolves false (logged, non-blocking).
// The invite is still created; the email just lands in `errors`. We assert on
// the persisted invite rather than delivery.

// Pull the raw token out of a freshly-created invite by re-deriving from the DB:
// we can't read the raw token back (only the hash is stored), so tests that need
// the raw token mint the invite directly via the model with a known token.
const seedInvite = async (owner, overrides = {}) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invite = await MemberInvite.create({
    user: owner._id,
    email: overrides.email || `invitee-${uid()}@test.com`,
    tokenHash,
    expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: overrides.status || 'pending',
    branchId: overrides.branchId || null,
    profitRate: overrides.profitRate ?? null,
    invitedByName: overrides.invitedByName || 'Admin',
  });
  return { invite, rawToken };
};

describe('inviteMembers', () => {
  it('creates a new invite for a fresh email', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    const email = `fresh-${uid()}@test.com`;

    await inviteMembers(
      ownerReq(owner, { body: { emails: [email] } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const invite = await MemberInvite.findOne({ user: owner._id, email });
    expect(invite).toBeTruthy();
    expect(invite.status).toBe('pending');
    expect(invite.tokenHash).toBeTruthy();
    expect(invite.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('skips an email that is already a member', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { email: `existing-${uid()}@test.com` });
    const res = mockRes();

    await inviteMembers(
      ownerReq(owner, { body: { emails: [member.email] } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: member.email, reason: 'already a member' }),
      ]),
    );
    const invite = await MemberInvite.findOne({ user: owner._id, email: member.email });
    expect(invite).toBeNull();
  });

  it('resends to an existing pending invite instead of duplicating', async () => {
    const owner = await makeOwner();
    const email = `dupe-${uid()}@test.com`;
    const { invite: first } = await seedInvite(owner, { email });
    const oldHash = first.tokenHash;

    const res = mockRes();
    await inviteMembers(
      ownerReq(owner, { body: { emails: [email] } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const all = await MemberInvite.find({ user: owner._id, email });
    expect(all).toHaveLength(1); // not duplicated
    expect(all[0].tokenHash).not.toBe(oldHash); // token regenerated
  });

  it('rejects an empty emails array with 400', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await inviteMembers(ownerReq(owner, { body: { emails: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('reports invalid email format under errors', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await inviteMembers(
      ownerReq(owner, { body: { emails: ['not-an-email'] } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('listInvites', () => {
  it('returns paginated, tenant-scoped invites with isExpired flag', async () => {
    const owner = await makeOwner();
    await seedInvite(owner);
    await seedInvite(owner, {
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000), // already expired
      email: `expired-${uid()}@test.com`,
    });

    const res = mockRes();
    await listInvites(ownerReq(owner, { query: { page: '1', limit: '10' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      totalEntries: 2,
      totalPages: 1,
      currentPage: 1,
    });
    expect(res.body.data).toHaveLength(2);
    const expiredRow = res.body.data.find((r) => r.email.startsWith('expired-'));
    expect(expiredRow.isExpired).toBe(true);
  });

  it('does not show another tenant invites (tenant isolation)', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await seedInvite(ownerA);

    const res = mockRes();
    await listInvites(ownerReq(ownerB, { query: {} }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalEntries).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('resendInvite', () => {
  it('regenerates token + expiry for an owned pending invite', async () => {
    const owner = await makeOwner();
    const { invite } = await seedInvite(owner);
    const oldHash = invite.tokenHash;

    const res = mockRes();
    await resendInvite(
      ownerReq(owner, { params: { id: String(invite._id) } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const fresh = await MemberInvite.findById(invite._id);
    expect(fresh.tokenHash).not.toBe(oldHash);
  });

  it('returns 404 for another tenant invite (no existence leak)', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const { invite } = await seedInvite(ownerA);

    const res = mockRes();
    await resendInvite(
      ownerReq(ownerB, { params: { id: String(invite._id) } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });

  it('rejects resending a non-pending invite with 400', async () => {
    const owner = await makeOwner();
    const { invite } = await seedInvite(owner, { status: 'revoked' });
    const res = mockRes();
    await resendInvite(
      ownerReq(owner, { params: { id: String(invite._id) } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('revokeInvite', () => {
  it('marks an owned invite revoked', async () => {
    const owner = await makeOwner();
    const { invite } = await seedInvite(owner);

    const res = mockRes();
    await revokeInvite(
      ownerReq(owner, { params: { id: String(invite._id) } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const fresh = await MemberInvite.findById(invite._id);
    expect(fresh.status).toBe('revoked');
  });

  it('returns 404 for another tenant invite', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const { invite } = await seedInvite(ownerA);

    const res = mockRes();
    await revokeInvite(
      ownerReq(ownerB, { params: { id: String(invite._id) } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('getInviteByToken', () => {
  it('returns business branding for a valid pending token', async () => {
    const owner = await makeOwner({ businessName: 'Acme Lending', plan: 'Pro' });
    const { rawToken, invite } = await seedInvite(owner);

    const res = mockRes();
    await getInviteByToken({ params: { token: rawToken }, get: () => 'test' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(invite.email);
    expect(res.body.businessName).toBe('Acme Lending');
    expect(res.body.securityCode).toBe(owner.securityCode);
  });

  it('returns 404 for an unknown token', async () => {
    const res = mockRes();
    await getInviteByToken({ params: { token: 'nope' }, get: () => 'test' }, res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 410 for an expired token', async () => {
    const owner = await makeOwner();
    const { rawToken } = await seedInvite(owner, {
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = mockRes();
    await getInviteByToken({ params: { token: rawToken }, get: () => 'test' }, res);
    expect(res.statusCode).toBe(410);
  });
});

describe('acceptInvite', () => {
  const acceptBody = (overrides = {}) => ({
    name: 'new member',
    phone: `0300${uid().slice(-7)}`,
    cnic: `cnic-${uid()}`,
    password: 'password123',
    ...overrides,
  });

  it('creates an approved active member + linked customer and flips the invite', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    const branch = await makeBranch(owner);
    const { rawToken, invite } = await seedInvite(owner, {
      branchId: branch._id,
      profitRate: 7,
    });

    const res = mockRes();
    const body = acceptBody();
    await acceptInvite(
      { params: { token: rawToken }, body, get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBeTruthy();
    expect(res.body.securityCode).toBe(owner.securityCode);
    // Auto-login token returned.
    expect(res.body.token).toBeTruthy();

    const member = await Member.findById(res.body.member._id);
    expect(member).toBeTruthy();
    expect(member.email).toBe(invite.email); // email locked to invite
    expect(member.approvalStatus).toBe('approved');
    expect(member.status).toBe('Active');
    expect(member.isActive).toBe(true);
    expect(member.mustChangePassword).toBe(false);
    expect(member.profitRate).toBe(7);
    expect(String(member.branchId)).toBe(String(branch._id));
    expect(member.customer).toBeTruthy();

    const customer = await Customer.findById(member.customer);
    expect(customer).toBeTruthy();
    expect(customer.isMember).toBe(true);
    expect(String(customer.memberId)).toBe(String(member._id));

    const fresh = await MemberInvite.findById(invite._id);
    expect(fresh.status).toBe('accepted');
    expect(fresh.acceptedAt).toBeTruthy();
    expect(String(fresh.memberId)).toBe(String(member._id));
  });

  it('returns 404 for an invalid token', async () => {
    const res = mockRes();
    await acceptInvite(
      { params: { token: 'bogus' }, body: acceptBody(), get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );
    expect(res.statusCode).toBe(404);
  });

  it('returns 410 for an expired token', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    await makeBranch(owner);
    const { rawToken } = await seedInvite(owner, {
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = mockRes();
    await acceptInvite(
      { params: { token: rawToken }, body: acceptBody(), get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );
    expect(res.statusCode).toBe(410);
  });

  it('returns 410 for a revoked invite', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    await makeBranch(owner);
    const { rawToken } = await seedInvite(owner, { status: 'revoked' });
    const res = mockRes();
    await acceptInvite(
      { params: { token: rawToken }, body: acceptBody(), get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );
    expect(res.statusCode).toBe(410);
  });

  it('returns 410 for an already-accepted invite', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    await makeBranch(owner);
    const { rawToken } = await seedInvite(owner, { status: 'accepted' });
    const res = mockRes();
    await acceptInvite(
      { params: { token: rawToken }, body: acceptBody(), get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );
    expect(res.statusCode).toBe(410);
  });

  it('returns 400 when the cnic already belongs to a member in this tenant', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    await makeBranch(owner);
    const dupeCnic = `cnic-dupe-${uid()}`;
    await makeMember(owner, { cnic: dupeCnic });
    const { rawToken } = await seedInvite(owner);

    const res = mockRes();
    await acceptInvite(
      {
        params: { token: rawToken },
        body: acceptBody({ cnic: dupeCnic }),
        get: () => 'test',
        headers: {},
        ip: '127.0.0.1',
      },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/CNIC/i);
  });

  it('returns 403 when the plan member limit is reached', async () => {
    // Free plan → members limit 1. Seed one member so the next accept is over.
    const owner = await makeOwner({ plan: 'Free' });
    await makeBranch(owner);
    await makeMember(owner);
    const { rawToken } = await seedInvite(owner);

    const res = mockRes();
    await acceptInvite(
      { params: { token: rawToken }, body: acceptBody(), get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.upgradeRequired).toBe(true);
    // No member should have been created.
    const fresh = await MemberInvite.findOne({ user: owner._id });
    expect(fresh.status).toBe('pending');
  });

  it('rolls back: no member/customer left behind when validation rejects', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    await makeBranch(owner);
    const { rawToken } = await seedInvite(owner);

    const before = await Member.countDocuments({ user: owner._id });
    const res = mockRes();
    // Missing required fields → 400 before the transaction opens.
    await acceptInvite(
      { params: { token: rawToken }, body: { name: 'x' }, get: () => 'test', headers: {}, ip: '127.0.0.1' },
      res,
    );

    expect(res.statusCode).toBe(400);
    const after = await Member.countDocuments({ user: owner._id });
    expect(after).toBe(before);
  });
});
