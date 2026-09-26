import { prepareDirectUploads, uploadKind } from '../../src/lib/directUploads';

describe('direct uploads', () => {
  it('sends files to storage and only proofs to the application', async () => {
    const data = new FormData();
    data.append('description', 'Document');
    data.append('documents', new File(['test'], 'file.pdf', { type: 'application/pdf' }));
    const api = { post: vi.fn().mockResolvedValue({ data: {
      url: 'https://api.cloudinary.com/test/image/upload',
      params: { timestamp: 123, signature: 'signed' }, proof: 'upload-proof',
    } }) };
    const uploadFetch = vi.fn().mockResolvedValue({ ok: true });
    const config = await prepareDirectUploads({ url: '/loans/request', data, headers: { 'Content-Type': 'multipart/form-data' } }, api, uploadFetch);
    expect(config.data).toEqual({ description: 'Document', __directUploads: [{ fieldname: 'documents', proof: 'upload-proof' }] });
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(uploadFetch.mock.calls[0][1].credentials).toBe('omit');
    expect(uploadFetch.mock.calls[0][1].body.get('file')).toBeInstanceOf(File);
  });

  it('does not submit the original form when storage rejects the upload', async () => {
    const data = new FormData();
    data.append('documents', new File(['test'], 'file.pdf'));
    const api = { post: vi.fn().mockResolvedValue({ data: { url: 'https://api.cloudinary.com/test/upload', params: {}, proof: 'proof' } }) };
    await expect(prepareDirectUploads({ url: '/loans/request', data }, api, vi.fn().mockResolvedValue({ ok: false }))).rejects.toThrow('File upload failed');
  });

  it('keeps user, member, CSV and OCR upload purposes distinct', () => {
    expect(uploadKind('/member-auth/updateprofilepicture')).toBe('user');
    expect(uploadKind('/loans/my-loans/123/documents')).toBe('loanDoc');
    expect(uploadKind('/customers/123/documents')).toBe('customer');
    expect(uploadKind('/api/members/bulk-import')).toBe('csv');
    expect(uploadKind('/ocr/process-id')).toBe('ocr');
    expect(uploadKind('/public/contact')).toBeNull();
  });
});
