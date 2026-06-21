/**
 * deleteMember cleans the member's signature out of Cloudinary on delete,
 * mirroring customerController. We spy on the lazily-invoked
 * `cloudinary.uploader.destroy` (the helper resolves the public_id from the
 * stored URL and calls destroy) — no network call is made.
 */
const { cloudinary } = require('../../src/config/cloudinary');
const Member = require('../../src/models/Member');
const memberController = require('../../src/controllers/memberController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// A real-shaped Cloudinary URL so extractPublicId yields a non-null id and the
// destroy call actually fires.
const SIG_URL =
  'https://res.cloudinary.com/x/image/upload/v1/signatures/stored.png';

let destroySpy;

beforeEach(() => {
  destroySpy = vi
    .spyOn(cloudinary.uploader, 'destroy')
    .mockResolvedValue({ result: 'ok' });
});

afterEach(() => {
  destroySpy.mockRestore();
});

describe('deleteMember — signature cleanup', () => {
  it('deletes the member signature from Cloudinary on delete', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      signature: SIG_URL,
      currentBalance: 0,
      savingBalance: 0,
      shareBalance: 0,
    });

    const req = { ...ownerReq(owner), params: { id: String(member._id) } };
    const res = mockRes();
    await memberController.deleteMember(req, res);

    expect(res.statusCode).toBe(200);
    expect(destroySpy).toHaveBeenCalledWith('signatures/stored', expect.anything());
    expect(await Member.countDocuments({ _id: member._id })).toBe(0);
  });
});
