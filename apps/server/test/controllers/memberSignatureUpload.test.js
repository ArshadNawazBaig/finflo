/**
 * createMember / updateMember signature handling — a base64 `data:image` signature
 * must be uploaded to Cloudinary and persisted as a URL (never raw base64), on
 * BOTH the member and its mirrored/linked customer.
 *
 * The suite runs with `isolate: false`, so `vi.mock` of a module the controllers
 * already require is unreliable (the controller captured the real reference at
 * load time). Instead we spy on the lazily-invoked `cloudinary.uploader` methods
 * the helper calls at runtime — no network call is ever made.
 */
const { cloudinary } = require('../../src/config/cloudinary');
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const memberController = require('../../src/controllers/memberController');
const { makeOwner, makeBranch, makeMember, makeCustomer, uid } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const CLOUD_URL =
  'https://res.cloudinary.com/x/image/upload/v1/signatures/test.png';
const BASE64_SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

let uploadSpy;
let destroySpy;

beforeEach(() => {
  uploadSpy = vi
    .spyOn(cloudinary.uploader, 'upload')
    .mockResolvedValue({ secure_url: CLOUD_URL });
  destroySpy = vi
    .spyOn(cloudinary.uploader, 'destroy')
    .mockResolvedValue({ result: 'ok' });
});

afterEach(() => {
  uploadSpy.mockRestore();
  destroySpy.mockRestore();
});

describe('createMember — signature upload', () => {
  it('persists a Cloudinary URL (not base64) on BOTH the member and its linked customer', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    await makeBranch(owner); // createMember requires a branch to exist
    const u = uid();
    const req = {
      ...ownerReq(owner),
      body: {
        name: 'Jane Doe',
        email: `jane-${u}@test.com`,
        phone: '03001234567',
        cnic: `35202-${u.slice(-7)}-1`,
        address: 'somewhere',
        signature: BASE64_SIG,
      },
    };
    const res = mockRes();
    await memberController.createMember(req, res);

    expect(res.statusCode).toBe(201);
    // Uploaded exactly ONCE, then reused for both member and customer.
    expect(uploadSpy).toHaveBeenCalledTimes(1);

    const member = await Member.findById(res.body._id);
    expect(member.signature).toBe(CLOUD_URL);
    expect(member.signature.startsWith('data:image')).toBe(false);

    const customer = await Customer.findById(member.customer);
    expect(customer).toBeTruthy();
    expect(customer.signature).toBe(CLOUD_URL);
    expect(customer.signature.startsWith('data:image')).toBe(false);
  });

  it('does NOT re-upload an already-stored Cloudinary URL', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    await makeBranch(owner);
    const u = uid();
    const req = {
      ...ownerReq(owner),
      body: {
        name: 'No Upload',
        email: `noup-${u}@test.com`,
        phone: '03001234567',
        cnic: `35202-${u.slice(-7)}-2`,
        signature: CLOUD_URL, // already a Cloudinary URL
      },
    };
    const res = mockRes();
    await memberController.createMember(req, res);

    expect(res.statusCode).toBe(201);
    expect(uploadSpy).not.toHaveBeenCalled();
    const member = await Member.findById(res.body._id);
    expect(member.signature).toBe(CLOUD_URL);
  });
});

describe('updateMember — signature swap', () => {
  it('swaps a base64 signature for a Cloudinary URL and syncs it to the linked customer', async () => {
    const owner = await makeOwner();
    // A real-shaped Cloudinary URL so the old-asset deletion actually reaches
    // cloudinary.uploader.destroy (extractPublicId needs an `upload/` segment).
    const OLD_URL =
      'https://res.cloudinary.com/x/image/upload/v1/signatures/old.png';
    const customer = await makeCustomer(owner, { signature: OLD_URL });
    const member = await makeMember(owner, {
      customer: customer._id,
      signature: OLD_URL,
    });

    const req = {
      ...ownerReq(owner),
      params: { id: String(member._id) },
      body: { signature: BASE64_SIG },
    };
    const res = mockRes();
    await memberController.updateMember(req, res);

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).toHaveBeenCalledTimes(1);
    // old signature deleted from Cloudinary before re-upload
    expect(destroySpy).toHaveBeenCalled();

    const fresh = await Member.findById(member._id);
    expect(fresh.signature).toBe(CLOUD_URL);
    expect(fresh.signature.startsWith('data:image')).toBe(false);

    const freshCustomer = await Customer.findById(customer._id);
    expect(freshCustomer.signature).toBe(CLOUD_URL);
  });

  it('leaves the signature untouched when none is supplied', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { signature: CLOUD_URL });

    const req = {
      ...ownerReq(owner),
      params: { id: String(member._id) },
      body: { name: 'Renamed' },
    };
    const res = mockRes();
    await memberController.updateMember(req, res);

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).not.toHaveBeenCalled();
    const fresh = await Member.findById(member._id);
    expect(fresh.signature).toBe(CLOUD_URL);
  });
});
