/** Unit tests for PII masking helpers. */
const {
  maskCNIC,
  maskPhone,
  maskAccountNumber,
  maskEmail,
  maskAddress,
  maskPII,
  maskPIIArray,
} = require('../../src/utils/dataMasking');

describe('maskCNIC', () => {
  it('masks a 13-digit raw CNIC', () => {
    expect(maskCNIC('3520212345673')).toBe('35202-*******-3');
  });

  it('masks a dash-formatted CNIC', () => {
    expect(maskCNIC('35202-1234567-3')).toBe('35202-*******-3');
  });

  it('passes through non-strings', () => {
    expect(maskCNIC(null)).toBe(null);
  });
});

describe('maskPhone', () => {
  it('masks a standard 11-digit phone keeping first 3 / last 3', () => {
    expect(maskPhone('03001234567')).toBe('030*****567');
  });

  it('returns **** for very short input', () => {
    expect(maskPhone('123')).toBe('****');
  });
});

describe('maskEmail', () => {
  it('keeps the first two chars of the local part', () => {
    expect(maskEmail('arshadnawaz@gmail.com')).toBe('ar***@gmail.com');
  });

  it('handles a 1-char local part', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });

  it('returns ***@*** when there is no domain', () => {
    expect(maskEmail('nodomain')).toBe('***@***');
  });
});

describe('maskAccountNumber', () => {
  it('preserves a typed prefix and shows only the last 4', () => {
    expect(maskAccountNumber('MLO-S-1000012345')).toBe('MLO-S-******2345');
  });

  it('masks a plain numeric account', () => {
    expect(maskAccountNumber('1234567890')).toBe('******7890');
  });
});

describe('maskAddress', () => {
  it('keeps only the trailing city segment', () => {
    expect(maskAddress('123 Main Street, Lahore')).toBe('**** Lahore');
  });
});

describe('maskPII', () => {
  it('masks all PII fields on a plain object', () => {
    const out = maskPII({
      cnic: '3520212345673',
      phone: '03001234567',
      email: 'arshadnawaz@gmail.com',
      name: 'Visible',
    });
    expect(out.cnic).toBe('35202-*******-3');
    expect(out.phone).toBe('030*****567');
    expect(out.email).toBe('ar***@gmail.com');
    expect(out.name).toBe('Visible'); // non-PII untouched
  });

  it('skips masking when showFull is set', () => {
    const doc = { cnic: '3520212345673' };
    expect(maskPII(doc, { showFull: true })).toBe(doc);
  });

  it('masks an array of docs', () => {
    const out = maskPIIArray([{ phone: '03001234567' }]);
    expect(out[0].phone).toBe('030*****567');
  });
});
