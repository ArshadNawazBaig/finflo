/**
 * updateGrantorStatus — on approval the grantor's base64 signature is uploaded
 * to Cloudinary and only the URL is stored on the loan (grantor1/2Signature).
 * We spy on the lazily-invoked `cloudinary.uploader.upload` — no network call.
 */
const { cloudinary } = require('../../src/config/cloudinary');
const Loan = require('../../src/models/Loan');
const loanController = require('../../src/controllers/loanController');
const { makeOwner, makeCustomer, makeMember, makeLoan } = require('../helpers/factories');
const { memberReq, mockRes } = require('../helpers/mocks');

const CLOUD_URL =
  'https://res.cloudinary.com/x/image/upload/v1/grantor_signatures/test.png';
const BASE64_SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

let uploadSpy;

beforeEach(() => {
  uploadSpy = vi
    .spyOn(cloudinary.uploader, 'upload')
    .mockResolvedValue({ secure_url: CLOUD_URL });
});

afterEach(() => {
  uploadSpy.mockRestore();
});

describe('updateGrantorStatus — signature upload', () => {
  it('stores a Cloudinary URL (not base64) when the grantor approves', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const grantor = await makeMember(owner, { name: 'Guarantor One' });
    const loan = await makeLoan(owner, customer, {
      grantor1: grantor._id,
      grantor1Status: 'pending',
    });

    const req = {
      ...memberReq(grantor, owner),
      params: { id: String(loan._id) },
      body: { status: 'approved', signature: BASE64_SIG },
    };
    req.member.name = grantor.name;
    const res = mockRes();
    await loanController.updateGrantorStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).toHaveBeenCalledTimes(1);

    const fresh = await Loan.findById(loan._id);
    expect(fresh.grantor1Status).toBe('approved');
    expect(fresh.grantor1Signature).toBe(CLOUD_URL);
    expect(fresh.grantor1Signature.startsWith('data:image')).toBe(false);
  });

  it('does not upload when the grantor rejects', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const grantor = await makeMember(owner, { name: 'Guarantor Two' });
    const loan = await makeLoan(owner, customer, {
      grantor1: grantor._id,
      grantor1Status: 'pending',
    });

    const req = {
      ...memberReq(grantor, owner),
      params: { id: String(loan._id) },
      body: { status: 'rejected' },
    };
    req.member.name = grantor.name;
    const res = mockRes();
    await loanController.updateGrantorStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).not.toHaveBeenCalled();
    const fresh = await Loan.findById(loan._id);
    expect(fresh.grantor1Status).toBe('rejected');
  });
});
