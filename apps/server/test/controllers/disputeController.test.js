/**
 * Dispute controller — unread-badge lifecycle + member-name capitalization.
 * The owner-side / member-side unread flags drive the real-time Disputes badge
 * (kept in sync via dispute:* socket events; socket emit is a no-op in tests
 * since the io singleton is never initialised).
 */
const Dispute = require('../../src/models/Dispute');
const Notification = require('../../src/models/Notification');
const {
  createPortalDispute,
  getPortalDispute,
  getMemberUnreadCount,
  getDispute,
  replyDispute,
  updateDispute,
  getOwnerUnreadCount,
} = require('../../src/controllers/disputeController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, memberReq, mockRes } = require('../helpers/mocks');

// File a dispute as the member. The controller reads req.member.name, so set it
// explicitly (memberReq only carries _id/user/branchId).
const fileDispute = async (owner, member, name = 'john doe', body = {}) => {
  const req = memberReq(member, owner, {
    body: { subject: 'Wrong fee', description: 'Charged twice', ...body },
  });
  req.member.name = name;
  const res = mockRes();
  await createPortalDispute(req, res);
  return res.body;
};

describe('createPortalDispute', () => {
  it('files unread for the owner and notifies with a capitalized name', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const dispute = await fileDispute(owner, member, 'john doe');

    expect(dispute._id).toBeTruthy();
    const fresh = await Dispute.findById(dispute._id).lean();
    expect(fresh.unreadByOwner).toBe(true);
    expect(fresh.unreadByMember).toBe(false);

    const notif = await Notification.findOne({ recipient: owner._id }).lean();
    expect(notif).toBeTruthy();
    expect(notif.message).toMatch(/^John Doe filed dispute DSP-/);
  });

  it('400s without subject/description', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const req = memberReq(member, owner, { body: { subject: '' } });
    req.member.name = 'x';
    const res = mockRes();
    await createPortalDispute(req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('owner-side unread count', () => {
  it('counts unread disputes and clears when staff opens one', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const a = await fileDispute(owner, member);
    await fileDispute(owner, member);

    let res = mockRes();
    await getOwnerUnreadCount(ownerReq(owner), res);
    expect(res.body.count).toBe(2);

    // Admin opens dispute A → owner-side unread flag clears for the tenant.
    res = mockRes();
    await getDispute(ownerReq(owner, { params: { id: a._id.toString() } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.unreadByOwner).toBe(false);

    res = mockRes();
    await getOwnerUnreadCount(ownerReq(owner), res);
    expect(res.body.count).toBe(1);
  });

  it('is tenant-scoped (another owner sees zero)', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const member = await makeMember(owner);
    await fileDispute(owner, member);

    const res = mockRes();
    await getOwnerUnreadCount(ownerReq(other), res);
    expect(res.body.count).toBe(0);
  });

  it('returns 404 for a dispute owned by another tenant', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const member = await makeMember(owner);
    const d = await fileDispute(owner, member);

    const res = mockRes();
    await getDispute(ownerReq(other, { params: { id: d._id.toString() } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('member-side unread count', () => {
  it('staff reply makes it unread for the member; opening clears it', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const d = await fileDispute(owner, member);

    // Staff replies → unread for the member, read for the owner.
    let res = mockRes();
    await replyDispute(
      ownerReq(owner, { params: { id: d._id.toString() }, body: { body: 'Looking into it' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    const afterReply = await Dispute.findById(d._id).lean();
    expect(afterReply.unreadByMember).toBe(true);
    expect(afterReply.unreadByOwner).toBe(false);

    res = mockRes();
    await getMemberUnreadCount(memberReq(member, owner), res);
    expect(res.body.count).toBe(1);

    // Member opens the thread → member-side unread clears.
    res = mockRes();
    await getPortalDispute(
      memberReq(member, owner, { params: { id: d._id.toString() } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.unreadByMember).toBe(false);

    res = mockRes();
    await getMemberUnreadCount(memberReq(member, owner), res);
    expect(res.body.count).toBe(0);
  });

  it('a status transition flags the member and clears the owner', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const d = await fileDispute(owner, member);

    const res = mockRes();
    await updateDispute(
      ownerReq(owner, { params: { id: d._id.toString() }, body: { status: 'in_progress' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    const fresh = await Dispute.findById(d._id).lean();
    expect(fresh.unreadByMember).toBe(true);
    expect(fresh.unreadByOwner).toBe(false);
  });
});
