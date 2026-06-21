/**
 * memberAuthController.updateDetails — members self-edit their own profile from
 * the portal (and the onboarding wizard). Verifies the field whitelist
 * (address / job / jobDetail / monthlyIncome / nominee, plus name/email),
 * encryption round-trip for the encrypted `address` field (the handler must
 * save() rather than findByIdAndUpdate so the pre-save encrypt hook runs),
 * partial updates that don't wipe untouched fields, nominee.cnicImage
 * preservation, email validation, and that non-whitelisted fields are ignored.
 */
const Member = require('../../src/models/Member');
const { updateDetails } = require('../../src/controllers/memberAuthController');
const { makeOwner, makeMember, uid } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const detailsReq = (member, body) => ({
  member: { _id: member._id },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

describe('updateDetails (member self-edit)', () => {
  it('persists address through the encryption round-trip', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(detailsReq(member, { address: 'House 5, Gulberg' }), res);

    expect(res.statusCode).toBe(200);
    // Re-read via the model so the post-find decrypt hook runs; a plaintext
    // (un-encrypted) write would fail to decrypt back to the original.
    const reloaded = await Member.findById(member._id);
    expect(reloaded.address).toBe('House 5, Gulberg');
  });

  it('persists job, jobDetail and numeric monthlyIncome', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(
      detailsReq(member, {
        job: 'Shopkeeper',
        jobDetail: 'Al-Madina Store',
        monthlyIncome: '50000',
      }),
      res,
    );

    const reloaded = await Member.findById(member._id);
    expect(reloaded.job).toBe('Shopkeeper');
    expect(reloaded.jobDetail).toBe('Al-Madina Store');
    expect(reloaded.monthlyIncome).toBe(50000);
  });

  it('persists nominee subfields and preserves nominee.cnicImage', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      nominee: { cnicImage: 'https://cdn/nominee.png' },
    });
    const res = mockRes();

    await updateDetails(
      detailsReq(member, {
        nominee: { name: 'Ayesha', cnic: '35202-1', relation: 'Spouse' },
      }),
      res,
    );

    const reloaded = await Member.findById(member._id);
    expect(reloaded.nominee.name).toBe('Ayesha');
    expect(reloaded.nominee.cnic).toBe('35202-1');
    expect(reloaded.nominee.relation).toBe('Spouse');
    expect(reloaded.nominee.cnicImage).toBe('https://cdn/nominee.png');
  });

  it('partial update does not wipe untouched fields', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      name: 'original name',
      job: 'Farmer',
    });
    const res = mockRes();

    await updateDetails(detailsReq(member, { address: 'New Street 9' }), res);

    const reloaded = await Member.findById(member._id);
    expect(reloaded.address).toBe('New Street 9');
    expect(reloaded.name).toBe('original name');
    expect(reloaded.job).toBe('Farmer');
  });

  it('rejects an invalid email with 400', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(detailsReq(member, { email: 'not-an-email' }), res);

    expect(res.statusCode).toBe(400);
  });

  it('ignores non-whitelisted fields (currentBalance, approvalStatus)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      currentBalance: 1000,
      approvalStatus: 'approved',
    });
    const res = mockRes();

    await updateDetails(
      detailsReq(member, {
        address: 'Somewhere',
        currentBalance: 999999,
        approvalStatus: 'pending',
        profitRate: 50,
      }),
      res,
    );

    const reloaded = await Member.findById(member._id);
    expect(reloaded.currentBalance).toBe(1000);
    expect(reloaded.approvalStatus).toBe('approved');
    expect(reloaded.profitRate).toBe(0);
  });

  it('persists a new CNIC (encrypted round-trip)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { cnic: `OLD-${uid()}` });
    const newCnic = `35202-${uid()}`;
    const res = mockRes();

    await updateDetails(detailsReq(member, { cnic: newCnic }), res);

    expect(res.statusCode).toBe(200);
    const reloaded = await Member.findById(member._id);
    expect(reloaded.cnic).toBe(newCnic);
  });

  it('rejects an empty CNIC with 400', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(detailsReq(member, { cnic: '   ' }), res);

    expect(res.statusCode).toBe(400);
  });

  it('rejects a CNIC already used by another member in the tenant', async () => {
    const owner = await makeOwner();
    const taken = `42101-${uid()}`;
    await makeMember(owner, { cnic: taken });
    const member = await makeMember(owner);
    const res = mockRes();

    await updateDetails(detailsReq(member, { cnic: taken }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/CNIC already exists/i);
  });

  it('stores a signature passed as a plain URL', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const url = 'https://res.cloudinary.com/demo/image/upload/sig.png';
    const res = mockRes();

    await updateDetails(detailsReq(member, { signature: url }), res);

    expect(res.statusCode).toBe(200);
    const reloaded = await Member.findById(member._id);
    expect(reloaded.signature).toBe(url);
  });

  it('404s for a missing member', async () => {
    const ghostId = (await makeMember(await makeOwner()))._id;
    await Member.findByIdAndDelete(ghostId);
    const res = mockRes();

    await updateDetails(detailsReq({ _id: ghostId }, { address: 'x' }), res);

    expect(res.statusCode).toBe(404);
  });
});
