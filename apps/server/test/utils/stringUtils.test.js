/** Unit tests for escapeRegExp — guards against NoSQL/regex injection. */
const { escapeRegExp } = require('../../src/utils/stringUtils');

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegExp('(group)')).toBe('\\(group\\)');
    expect(escapeRegExp('a+b?c^d$')).toBe('a\\+b\\?c\\^d\\$');
  });

  it('leaves plain alphanumerics untouched', () => {
    expect(escapeRegExp('hello123')).toBe('hello123');
  });

  it('returns empty string for non-string input', () => {
    expect(escapeRegExp(null)).toBe('');
    expect(escapeRegExp(undefined)).toBe('');
    expect(escapeRegExp(42)).toBe('');
  });

  it('produces a pattern that matches the literal string', () => {
    const evil = 'a.*$';
    const re = new RegExp(escapeRegExp(evil));
    expect(re.test('a.*$')).toBe(true);
    expect(re.test('aXYZ')).toBe(false); // not treated as wildcard
  });
});
