const { cloudinary } = require('../../src/config/cloudinary');
const { signUpload, verifyUpload, directUploadMiddleware } = require('../../src/services/directUploadService');
const { mockRes } = require('../helpers/mocks');

describe('direct Cloudinary uploads', () => {
  let previous;
  beforeEach(() => {
    previous = { ...cloudinary.config() };
    cloudinary.config({ cloud_name: 'test-cloud', api_key: 'test-key', api_secret: 'test-cloudinary-secret' });
  });
  afterEach(() => { cloudinary.config(previous); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const request = () => ({
    user: { _id: 'owner-a' },
    body: { kind: 'loanDoc', name: 'document.pdf', size: 1024, mimetype: 'application/pdf' },
  });
  const sign = (req) => {
    const res = mockRes();
    signUpload(req, res, (e) => { throw e; });
    return res.body;
  };

  it('binds signatures to the user and purpose and uses only trusted URLs', async () => {
    const req = request();
    const signed = sign(req);
    expect(JSON.stringify(signed)).not.toContain('test-cloudinary-secret');
    const metadata = vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: signed.params.public_id, bytes: 1024, format: 'pdf', secure_url: 'https://res.cloudinary.com/test/document.pdf',
    });
    const descriptor = { fieldname: 'documents', proof: signed.proof, url: 'https://attacker.invalid' };
    const file = await verifyUpload(req, descriptor, 'loanDoc', 5 * 1024 * 1024);
    expect(file.path).toBe('https://res.cloudinary.com/test/document.pdf');
    await expect(verifyUpload({ user: { _id: 'owner-b' } }, descriptor, 'loanDoc', 1024)).rejects.toThrow(/authorization/);
    await expect(verifyUpload(req, descriptor, 'user', 1024)).rejects.toThrow(/purpose/);
    expect(metadata).toHaveBeenCalledTimes(1);
  });

  it('rejects disallowed formats and oversized files before signing', () => {
    const req = request();
    req.body.name = 'script.svg';
    expect(() => sign(req)).toThrow(/Allowed formats/);
    req.body.name = 'document.pdf';
    req.body.size = 10 * 1024 * 1024;
    expect(() => sign(req)).toThrow(/maximum/);
  });

  it('checks actual provider-reported size, not the client declaration', async () => {
    const req = request();
    const signed = sign(req);
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: signed.params.public_id, bytes: 20 * 1024 * 1024, format: 'pdf',
    });
    await expect(verifyUpload(req, { proof: signed.proof }, 'loanDoc', 1024)).rejects.toThrow(/size/);
  });

  it('enforces the original multipart field count before reading assets', async () => {
    const req = request();
    const signed = sign(req);
    const descriptor = { fieldname: 'documents', proof: signed.proof };
    req.body = { __directUploads: [descriptor, descriptor] };
    const next = vi.fn();
    const middleware = directUploadMiddleware(vi.fn(), {
      kind: 'loanDoc', maxBytes: 1024, fields: [{ name: 'documents', maxCount: 1 }], mode: 'array',
    });
    await middleware(req, mockRes(), next);
    expect(next.mock.calls[0][0].message).toMatch(/too many/);
  });

  it('downloads temporary CSVs privately and deletes them after reading', async () => {
    const req = request();
    req.body = { kind: 'csv', name: 'members.csv', size: 11, mimetype: 'text/csv' };
    const signed = sign(req);
    expect(signed.params.type).toBe('authenticated');
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: signed.params.public_id, bytes: 11,
    });
    const download = vi.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://storage.invalid/private');
    const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('name\nAlice\n')));
    const file = await verifyUpload(req, { fieldname: 'file', proof: signed.proof }, 'csv', 1024);
    expect(file.buffer.toString()).toBe('name\nAlice\n');
    expect(download).toHaveBeenCalledWith(signed.params.public_id, '', expect.objectContaining({ type: 'authenticated', resource_type: 'raw' }));
    expect(destroy).toHaveBeenCalledWith(signed.params.public_id, expect.objectContaining({ type: 'authenticated', resource_type: 'raw' }));
  });

  it('enforces the streamed download size and still deletes a rejected temporary file', async () => {
    const req = request();
    req.body = { kind: 'ocr', name: 'id.png', size: 5, mimetype: 'image/png' };
    const signed = sign(req);
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: signed.params.public_id, bytes: 5, format: 'png',
    });
    vi.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://storage.invalid/private');
    const destroy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('larger than allowed')));
    await expect(verifyUpload(req, { proof: signed.proof }, 'ocr', 5)).rejects.toThrow(/too large/);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
