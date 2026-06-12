/**
 * Tests for the device-token registration controller. Verifies a member's token
 * is upserted (scoped to the tenant owner), re-registering the same token does
 * not create a duplicate, unregister deactivates only the caller's own token,
 * and a different device owner cannot deactivate someone else's token.
 */
const {
  registerDeviceToken,
  unregisterDeviceToken,
} = require('../../src/controllers/deviceTokenController');
const DeviceToken = require('../../src/models/DeviceToken');
const { makeOwner, makeMember, makeStaff } = require('../helpers/factories');
const { memberReq, ownerReq, mockRes } = require('../helpers/mocks');

describe('deviceTokenController', () => {
  it('registers a token scoped to the member and its tenant owner', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);

    const req = memberReq(member, owner, {
      body: { token: 'tok-aaa', platform: 'android' },
    });
    const res = mockRes();
    await registerDeviceToken(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBe('tok-aaa');

    const doc = await DeviceToken.findOne({ token: 'tok-aaa' });
    expect(doc.ownerType).toBe('Member');
    expect(doc.owner.toString()).toBe(member._id.toString());
    expect(doc.user.toString()).toBe(owner._id.toString());
    expect(doc.platform).toBe('android');
    expect(doc.isActive).toBe(true);
    expect(doc.lastSeenAt).toBeTruthy();
  });

  it('400s when token is missing', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const req = memberReq(member, owner, { body: {} });
    const res = mockRes();
    await registerDeviceToken(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('upserts the same token instead of duplicating', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);

    await registerDeviceToken(
      memberReq(member, owner, { body: { token: 'tok-dup', platform: 'ios' } }),
      mockRes(),
    );
    await registerDeviceToken(
      memberReq(member, owner, { body: { token: 'tok-dup', platform: 'web' } }),
      mockRes(),
    );

    const count = await DeviceToken.countDocuments({ token: 'tok-dup' });
    expect(count).toBe(1);
    const doc = await DeviceToken.findOne({ token: 'tok-dup' });
    expect(doc.platform).toBe('web'); // last write wins
  });

  it('registers a staff/user token with ownerType User', async () => {
    const owner = await makeOwner();
    const staff = await makeStaff(owner);

    const req = ownerReq(owner, {
      user: {
        _id: staff._id,
        effectiveOwnerId: owner._id,
        role: 'staff',
      },
      body: { token: 'tok-staff', platform: 'web' },
    });
    const res = mockRes();
    await registerDeviceToken(req, res);

    expect(res.statusCode).toBe(201);
    const doc = await DeviceToken.findOne({ token: 'tok-staff' });
    expect(doc.ownerType).toBe('User');
    expect(doc.owner.toString()).toBe(staff._id.toString());
    expect(doc.user.toString()).toBe(owner._id.toString());
  });

  it('unregister deactivates the caller-owned token', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await registerDeviceToken(
      memberReq(member, owner, { body: { token: 'tok-off' } }),
      mockRes(),
    );

    const res = mockRes();
    await unregisterDeviceToken(
      memberReq(member, owner, { body: { token: 'tok-off' } }),
      res,
    );
    expect(res.statusCode).toBe(200);

    const doc = await DeviceToken.findOne({ token: 'tok-off' });
    expect(doc.isActive).toBe(false);
  });

  it('does not deactivate another owner’s token (tenant/owner isolation)', async () => {
    const ownerA = await makeOwner();
    const memberA = await makeMember(ownerA);
    const ownerB = await makeOwner();
    const memberB = await makeMember(ownerB);

    await registerDeviceToken(
      memberReq(memberA, ownerA, { body: { token: 'tok-victim' } }),
      mockRes(),
    );

    // memberB tries to unregister memberA's token
    const res = mockRes();
    await unregisterDeviceToken(
      memberReq(memberB, ownerB, { body: { token: 'tok-victim' } }),
      res,
    );
    expect(res.statusCode).toBe(200); // call succeeds but matches nothing

    const doc = await DeviceToken.findOne({ token: 'tok-victim' });
    expect(doc.isActive).toBe(true); // untouched
  });
});
