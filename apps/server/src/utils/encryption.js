/**
 * PII Field-Level Encryption Utility
 * ────────────────────────────────────
 * AES-256-GCM encryption for sensitive data at rest.
 * Used by Customer and Member models to encrypt CNIC, phone, and address fields.
 *
 * Encrypted format: iv:encryptedData:authTag (colon-separated, base64-encoded)
 * Search format:    SHA-256 hash stored in companion `*Hash` fields for indexed lookups
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'base64';

// ── Key Management ───────────────────────────────────────────────────────────
// ENCRYPTION_KEY must be a 64-char hex string (32 bytes) set in .env
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
let _encryptionKey = null;

const getEncryptionKey = () => {
  if (_encryptionKey) return _encryptionKey;

  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    console.warn(
      '[Encryption] WARNING: ENCRYPTION_KEY not set. PII will NOT be encrypted at rest.',
    );
    return null;
  }

  if (keyHex.length !== 64) {
    console.error(
      '[Encryption] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got:',
      keyHex.length,
    );
    return null;
  }

  _encryptionKey = Buffer.from(keyHex, 'hex');
  return _encryptionKey;
};

// ── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:encryptedData:authTag (all base64)
 * Returns the original value if encryption is not configured.
 */
const encrypt = (plainText) => {
  if (!plainText || typeof plainText !== 'string') return plainText;

  const key = getEncryptionKey();
  if (!key) return plainText; // Graceful degradation

  // Don't double-encrypt — if it already looks encrypted, return as-is
  if (isEncrypted(plainText)) return plainText;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plainText, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag().toString(ENCODING);
    const ivStr = iv.toString(ENCODING);

    return `${ivStr}:${encrypted}:${authTag}`;
  } catch (error) {
    console.error('[Encryption] encrypt() failed:', error.message);
    return plainText; // Return original on failure — don't lose data
  }
};

/**
 * Decrypt an encrypted string (iv:encryptedData:authTag format).
 * Returns the original plaintext.
 * Returns the input as-is if it doesn't look encrypted or decryption fails.
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

  const key = getEncryptionKey();
  if (!key) return encryptedText;

  // If it doesn't look encrypted, return as-is (backwards compatibility)
  if (!isEncrypted(encryptedText)) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], ENCODING);
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] decrypt() failed:', error.message);
    return encryptedText; // Return encrypted value on failure
  }
};

// ── Searchable Hash ──────────────────────────────────────────────────────────

/**
 * Generate a deterministic SHA-256 hash for indexed searching on encrypted fields.
 * The hash is salted with ENCRYPTION_KEY to prevent rainbow table attacks.
 * Normalizes input (lowercase, trim) for consistent matching.
 */
const hash = (value) => {
  if (!value || typeof value !== 'string') return value;

  const key = getEncryptionKey();
  const salt = key ? key.toString('hex').slice(0, 16) : 'default-salt';

  const normalized = value.toLowerCase().trim().replace(/[\s-]/g, '');
  return crypto
    .createHash('sha256')
    .update(salt + normalized)
    .digest('hex');
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if a string looks like it's already encrypted (iv:data:tag format).
 */
const isEncrypted = (value) => {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Each part should be valid base64 and reasonable length
  return parts.every(
    (part) => part.length > 0 && /^[A-Za-z0-9+/=]+$/.test(part),
  );
};

/**
 * Encrypt multiple fields on a document object.
 * @param {Object} doc - The document object
 * @param {string[]} fields - Field names to encrypt
 * @param {string[]} hashFields - Corresponding hash field names
 */
const encryptFields = (doc, fields, hashFields) => {
  fields.forEach((field, index) => {
    const value = doc[field];
    if (value && !isEncrypted(value)) {
      if (hashFields && hashFields[index]) {
        doc[hashFields[index]] = hash(value);
      }
      doc[field] = encrypt(value);
    }
  });
};

/**
 * Decrypt multiple fields on a document object.
 * @param {Object} doc - The document object
 * @param {string[]} fields - Field names to decrypt
 */
const decryptFields = (doc, fields) => {
  fields.forEach((field) => {
    if (doc[field] && isEncrypted(doc[field])) {
      doc[field] = decrypt(doc[field]);
    }
  });
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  isEncrypted,
  encryptFields,
  decryptFields,
};
