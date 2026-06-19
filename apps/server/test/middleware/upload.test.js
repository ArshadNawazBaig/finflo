/**
 * Unit tests for the upload middleware factory that replaced the six
 * near-identical `*UploadMiddleware.js` files. Verifies storage routing,
 * limit options, and that the legacy delegate files still export the same
 * (multer instance) shape consumers rely on.
 */
const { createUploadMiddleware, STORAGES } = require('../../src/middleware/upload');

describe('createUploadMiddleware', () => {
  it('returns a usable multer instance for each known storage key', () => {
    for (const key of Object.keys(STORAGES)) {
      const mw = createUploadMiddleware(key);
      expect(typeof mw.single).toBe('function');
      expect(typeof mw.array).toBe('function');
      expect(typeof mw.fields).toBe('function');
    }
  });

  it('defaults to the general storage', () => {
    expect(() => createUploadMiddleware()).not.toThrow();
  });

  it('accepts maxSizeMB and maxFiles options without throwing', () => {
    expect(() => createUploadMiddleware('customer', { maxSizeMB: 1, maxFiles: 5 })).not.toThrow();
  });

  it('throws a helpful error for an unknown storage key', () => {
    expect(() => createUploadMiddleware('nope')).toThrow(/Unknown upload storage/);
  });

  it('builds an independent instance per call', () => {
    const a = createUploadMiddleware('user', { maxSizeMB: 2 });
    const b = createUploadMiddleware('user', { maxSizeMB: 2 });
    expect(a).not.toBe(b);
  });
});

describe('legacy delegate middleware files', () => {
  it('uploadMiddleware exports a multer instance directly', () => {
    const upload = require('../../src/middleware/uploadMiddleware');
    expect(typeof upload.array).toBe('function');
  });

  it('ticketUploadMiddleware still exports { ticketUpload }', () => {
    const { ticketUpload } = require('../../src/middleware/ticketUploadMiddleware');
    expect(typeof ticketUpload.array).toBe('function');
  });

  it('customerUploadMiddleware exports a multer instance directly', () => {
    const upload = require('../../src/middleware/customerUploadMiddleware');
    expect(typeof upload.array).toBe('function');
  });
});
