/**
 * Data Masking Utility
 * ────────────────────
 * Masks PII fields in API responses based on user permissions.
 * Banks require that sensitive data is not fully visible to all staff roles.
 */

/**
 * Mask CNIC: 35202-1234567-3 → 35202-*******-3
 */
const maskCNIC = (cnic) => {
  if (!cnic || typeof cnic !== 'string') return cnic;
  const cleaned = cnic.replace(/[\s-]/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 5)}-*******-${cleaned.slice(12)}`;
  }
  // If already formatted with dashes
  if (cnic.includes('-') && cnic.length === 15) {
    const parts = cnic.split('-');
    return `${parts[0]}-*******-${parts[2]}`;
  }
  // Fallback: show first 3 and last 1
  if (cnic.length > 4) {
    return `${cnic.slice(0, 3)}${'*'.repeat(cnic.length - 4)}${cnic.slice(-1)}`;
  }
  return '****';
};

/**
 * Mask phone: 03001234567 → 030*****567
 */
const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  const cleaned = phone.replace(/[\s-()]/g, '');
  if (cleaned.length >= 7) {
    return `${cleaned.slice(0, 3)}${'*'.repeat(cleaned.length - 6)}${cleaned.slice(-3)}`;
  }
  return '****';
};

/**
 * Mask account number: MLO-S-1000012345 → MLO-S-******2345
 */
const maskAccountNumber = (acc) => {
  if (!acc || typeof acc !== 'string') return acc;
  if (acc.length > 4) {
    const visible = acc.slice(-4);
    const masked = '*'.repeat(acc.length - 4);
    // Preserve prefix if it contains letters/dashes
    const prefixMatch = acc.match(/^([A-Z]+-[A-Z]-)/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const rest = acc.slice(prefix.length);
      return `${prefix}${'*'.repeat(rest.length - 4)}${rest.slice(-4)}`;
    }
    return `${masked}${visible}`;
  }
  return '****';
};

/**
 * Mask email: arshadnawaz@gmail.com → ar***@gmail.com
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
};

/**
 * Mask address: only show city/last portion
 */
const maskAddress = (address) => {
  if (!address || typeof address !== 'string') return address;
  if (address.length > 10) {
    return `**** ${address.split(',').pop()?.trim() || '****'}`;
  }
  return '****';
};

/**
 * Mask a document object's PII fields in-place.
 * @param {Object} doc - Document object (plain JS object or Mongoose doc)
 * @param {Object} options - { showFull: boolean } — if true, skip masking
 */
const maskPII = (doc, options = {}) => {
  if (!doc || options.showFull) return doc;

  const obj = doc.toObject ? doc.toObject() : { ...doc };

  if (obj.cnic) obj.cnic = maskCNIC(obj.cnic);
  if (obj.phone) obj.phone = maskPhone(obj.phone);
  if (obj.email) obj.email = maskEmail(obj.email);
  if (obj.address) obj.address = maskAddress(obj.address);
  if (obj.savingAccountNumber) obj.savingAccountNumber = maskAccountNumber(obj.savingAccountNumber);
  if (obj.currentAccountNumber) obj.currentAccountNumber = maskAccountNumber(obj.currentAccountNumber);
  if (obj.loanAccountNumber) obj.loanAccountNumber = maskAccountNumber(obj.loanAccountNumber);

  // Mask nominee PII
  if (obj.nominee) {
    if (obj.nominee.cnic) obj.nominee.cnic = maskCNIC(obj.nominee.cnic);
  }

  return obj;
};

/**
 * Mask an array of documents.
 */
const maskPIIArray = (docs, options = {}) => {
  if (!Array.isArray(docs)) return docs;
  return docs.map((doc) => maskPII(doc, options));
};

module.exports = {
  maskCNIC,
  maskPhone,
  maskAccountNumber,
  maskEmail,
  maskAddress,
  maskPII,
  maskPIIArray,
};
