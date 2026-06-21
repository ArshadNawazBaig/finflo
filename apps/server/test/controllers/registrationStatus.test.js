/**
 * getRegistrationStatus — public status check backing the /join screen's polling
 * fallback. Returns only the decision fields; a vanished (rejected-and-deleted)
 * member reads as 'rejected'; an invalid id is a 404.
 */
const Member = require('../../src/models/Member');
const {
  getRegistrationStatus,
} = require('../../src/controllers/memberController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const statusReq = (memberId) => ({ params: { memberId: String(memberId) } });

describe('getRegistrationStatus', () => {
  it('returns pending for a pending member', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { approvalStatus: 'pending' });
    const res = mockRes();

    await getRegistrationStatus(statusReq(member._id), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.approvalStatus).toBe('pending');
  });

  it('returns approved with no rejection reason for an approved member', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { approvalStatus: 'approved' });
    const res = mockRes();

    await getRegistrationStatus(statusReq(member._id), res);

    expect(res.body.approvalStatus).toBe('approved');
    expect(res.body.rejectionReason).toBe('');
  });

  it('treats a vanished (deleted-on-reject) member as rejected', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await Member.findByIdAndDelete(member._id);
    const res = mockRes();

    await getRegistrationStatus(statusReq(member._id), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.approvalStatus).toBe('rejected');
  });

  it('404s for an invalid object id', async () => {
    const res = mockRes();

    await getRegistrationStatus(statusReq('not-a-valid-id'), res);

    expect(res.statusCode).toBe(404);
  });
});
