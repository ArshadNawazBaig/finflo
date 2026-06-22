/**
 * memberAuthController.updateDetails — CNIC document upload during onboarding.
 * Members upload both sides of their CNIC; each base64 `data:image` is pushed to
 * Cloudinary and stored in the KYC `documents` array (type 'CNIC'), then mirrored
 * onto the linked Customer (the canonical KYC entity). Re-uploading a side
 * replaces the prior Cloudinary asset rather than duplicating the document.
 *
 * Like the signature suite, we spy on the lazily-invoked `cloudinary.uploader`
 * methods so no network call is ever made (vi.mock is unreliable under
 * isolate: false — the controller captured the real reference at load time).
 */
const { cloudinary } = require('../../src/config/cloudinary');
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const { updateDetails } = require('../../src/controllers/memberAuthController');
const { makeOwner, makeMember, makeCustomer, uid } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const FRONT_URL =
  'https://res.cloudinary.com/x/image/upload/v1/member_documents/front.jpg';
const BACK_URL =
  'https://res.cloudinary.com/x/image/upload/v1/member_documents/back.jpg';
const BASE64_IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

const detailsReq = (member, body) => ({
  member: { _id: member._id },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

let uploadSpy;
let destroySpy;

beforeEach(() => {
  // Resolve a distinct URL per side based on the supplied folder/order so the
  // two uploads are distinguishable.
  let call = 0;
  uploadSpy = vi
    .spyOn(cloudinary.uploader, 'upload')
    .mockImplementation(async () => ({
      secure_url: call++ === 0 ? FRONT_URL : BACK_URL,
    }));
  destroySpy = vi
    .spyOn(cloudinary.uploader, 'destroy')
    .mockResolvedValue({ result: 'ok' });
});

afterEach(() => {
  uploadSpy.mockRestore();
  destroySpy.mockRestore();
});

describe('updateDetails — CNIC document upload', () => {
  it('uploads both sides and stores them as CNIC documents (not base64)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(
      detailsReq(member, { cnicFront: BASE64_IMG, cnicBack: BASE64_IMG }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).toHaveBeenCalledTimes(2);

    const reloaded = await Member.findById(member._id);
    const cnicDocs = reloaded.documents.filter((d) => d.type === 'CNIC');
    expect(cnicDocs).toHaveLength(2);

    const front = cnicDocs.find((d) => d.name === 'CNIC Front');
    const back = cnicDocs.find((d) => d.name === 'CNIC Back');
    expect(front.url).toBe(FRONT_URL);
    expect(back.url).toBe(BACK_URL);
    expect(front.status).toBe('Pending');
    expect(front.url.startsWith('data:image')).toBe(false);
  });

  it('mirrors the CNIC documents onto the linked customer', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { customer: customer._id });
    const res = mockRes();

    await updateDetails(
      detailsReq(member, { cnicFront: BASE64_IMG, cnicBack: BASE64_IMG }),
      res,
    );

    const freshCustomer = await Customer.findById(customer._id);
    const cnicDocs = freshCustomer.documents.filter((d) => d.type === 'CNIC');
    expect(cnicDocs).toHaveLength(2);
    expect(cnicDocs.map((d) => d.url).sort()).toEqual(
      [FRONT_URL, BACK_URL].sort(),
    );
  });

  it('re-uploading a side replaces it instead of adding a duplicate', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      documents: [
        { name: 'CNIC Front', url: FRONT_URL, type: 'CNIC', status: 'Pending' },
      ],
    });
    const res = mockRes();

    await updateDetails(detailsReq(member, { cnicFront: BASE64_IMG }), res);

    expect(res.statusCode).toBe(200);
    // Old asset deleted before re-upload.
    expect(destroySpy).toHaveBeenCalled();
    const reloaded = await Member.findById(member._id);
    const fronts = reloaded.documents.filter(
      (d) => d.type === 'CNIC' && d.name === 'CNIC Front',
    );
    expect(fronts).toHaveLength(1);
  });

  it('ignores a non-data-url cnicFront value (no upload, no document)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(
      detailsReq(member, { cnicFront: 'https://example.com/not-base64.jpg' }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).not.toHaveBeenCalled();
    const reloaded = await Member.findById(member._id);
    expect(reloaded.documents.filter((d) => d.type === 'CNIC')).toHaveLength(0);
  });

  it('uploads a single side when only the front is supplied', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(detailsReq(member, { cnicFront: BASE64_IMG }), res);

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const reloaded = await Member.findById(member._id);
    const cnicDocs = reloaded.documents.filter((d) => d.type === 'CNIC');
    expect(cnicDocs).toHaveLength(1);
    expect(cnicDocs[0].name).toBe('CNIC Front');
  });
});

describe('updateDetails — nominee CNIC image upload', () => {
  it('uploads base64 nominee CNIC front & back and stores them as URLs (not base64)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(
      detailsReq(member, {
        nominee: {
          name: 'Ayesha',
          cnicImage: BASE64_IMG,
          cnicImageBack: BASE64_IMG,
        },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).toHaveBeenCalledTimes(2);
    const reloaded = await Member.findById(member._id);
    expect(reloaded.nominee.cnicImage).toBe(FRONT_URL);
    expect(reloaded.nominee.cnicImageBack).toBe(BACK_URL);
    expect(reloaded.nominee.cnicImage.startsWith('data:image')).toBe(false);
    expect(reloaded.nominee.name).toBe('Ayesha');
  });

  it('mirrors the nominee (front & back images) onto the linked customer', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { customer: customer._id });
    const res = mockRes();

    await updateDetails(
      detailsReq(member, {
        nominee: {
          name: 'Bilal',
          relation: 'Brother',
          cnicImage: BASE64_IMG,
          cnicImageBack: BASE64_IMG,
        },
      }),
      res,
    );

    const freshCustomer = await Customer.findById(customer._id);
    expect(freshCustomer.nominee.name).toBe('Bilal');
    expect(freshCustomer.nominee.relation).toBe('Brother');
    expect(freshCustomer.nominee.cnicImage).toBe(FRONT_URL);
    expect(freshCustomer.nominee.cnicImageBack).toBe(BACK_URL);
  });

  it('stores a nominee CNIC image passed as a plain URL without re-uploading', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const url = 'https://res.cloudinary.com/x/image/upload/v1/nominee_cnics/n.jpg';
    const res = mockRes();

    await updateDetails(
      detailsReq(member, { nominee: { cnicImage: url } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(uploadSpy).not.toHaveBeenCalled();
    const reloaded = await Member.findById(member._id);
    expect(reloaded.nominee.cnicImage).toBe(url);
  });

  it('replaces an existing nominee CNIC image (deletes the old asset)', async () => {
    const owner = await makeOwner();
    const oldUrl =
      'https://res.cloudinary.com/x/image/upload/v1/nominee_cnics/old.jpg';
    const member = await makeMember(owner, {
      nominee: { cnicImage: oldUrl },
    });
    const res = mockRes();

    await updateDetails(
      detailsReq(member, { nominee: { cnicImage: BASE64_IMG } }),
      res,
    );

    expect(destroySpy).toHaveBeenCalled();
    const reloaded = await Member.findById(member._id);
    expect(reloaded.nominee.cnicImage).toBe(FRONT_URL);
  });
});
