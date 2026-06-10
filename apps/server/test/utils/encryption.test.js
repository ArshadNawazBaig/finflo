/**
 * Unit tests for AES-256-GCM PII encryption. A 64-hex test key is set BEFORE the
 * module is required so getEncryptionKey() picks it up.
 */
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes of 0xaa — valid hex

const {
  encrypt,
  decrypt,
  hash,
  isEncrypted,
  encryptFields,
  decryptFields,
} = require('../../src/utils/encryption');

describe('encrypt / decrypt round-trip', () => {
  it('encrypts then decrypts back to the original plaintext', () => {
    const plain = '35202-1234567-3';
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(isEncrypted(enc)).toBe(true);
    expect(decrypt(enc)).toBe(plain);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('does not double-encrypt an already-encrypted value', () => {
    const enc = encrypt('secret');
    expect(encrypt(enc)).toBe(enc);
  });

  it('passes through empty / non-string values', () => {
    expect(encrypt('')).toBe('');
    expect(encrypt(null)).toBe(null);
    expect(decrypt(null)).toBe(null);
  });

  it('returns plaintext as-is when decrypting something not encrypted', () => {
    expect(decrypt('plain-value')).toBe('plain-value');
  });
});

describe('hash', () => {
  it('is deterministic and normalizes spacing / case / dashes', () => {
    expect(hash('35202-1234567-3')).toBe(hash('352021234567 3'.replace(' ', '')));
    expect(hash('ABC')).toBe(hash('abc'));
  });

  it('differs for different inputs', () => {
    expect(hash('a@x.com')).not.toBe(hash('b@x.com'));
  });
});

describe('isEncrypted', () => {
  it('recognises the iv:data:tag shape', () => {
    expect(isEncrypted(encrypt('x'))).toBe(true);
  });

  it('rejects plain strings and wrong shapes', () => {
    expect(isEncrypted('plain')).toBe(false);
    expect(isEncrypted('a:b')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});

describe('encryptFields / decryptFields', () => {
  it('encrypts listed fields and writes companion hashes, then decrypts back', () => {
    const doc = { cnic: '35202-1234567-3', phone: '03001234567' };
    encryptFields(doc, ['cnic', 'phone'], ['cnicHash', 'phoneHash']);

    expect(isEncrypted(doc.cnic)).toBe(true);
    expect(isEncrypted(doc.phone)).toBe(true);
    expect(doc.cnicHash).toBeTruthy();
    expect(doc.phoneHash).toBeTruthy();

    decryptFields(doc, ['cnic', 'phone']);
    expect(doc.cnic).toBe('35202-1234567-3');
    expect(doc.phone).toBe('03001234567');
  });
});
