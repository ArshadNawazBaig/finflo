/**
 * Unit tests for the safe query-string parsers used across list/controller
 * endpoints: boolean coercion, positive-int validation, sort direction, and
 * clamped pagination.
 */
const {
  parseBoolean,
  parsePositiveInt,
  parseSortOrder,
  parsePagination,
} = require('../../src/utils/parseQuery');

describe('parseBoolean', () => {
  it('treats common truthy strings (and real true) as true', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'on', true]) {
      expect(parseBoolean(v)).toBe(true);
    }
  });

  it('treats common falsy strings (and real false) as false', () => {
    for (const v of ['false', '0', 'no', 'off', false]) {
      expect(parseBoolean(v, true)).toBe(false);
    }
  });

  it('returns the default for absent values', () => {
    expect(parseBoolean(undefined)).toBe(false);
    expect(parseBoolean(null, true)).toBe(true);
    expect(parseBoolean('', true)).toBe(true);
  });

  it('returns the default for unrecognised strings', () => {
    expect(parseBoolean('maybe', false)).toBe(false);
    expect(parseBoolean('maybe', true)).toBe(true);
  });
});

describe('parsePositiveInt', () => {
  it('accepts positive integers', () => {
    expect(parsePositiveInt('5')).toBe(5);
    expect(parsePositiveInt(12)).toBe(12);
  });

  it('rejects zero, negatives, floats, and non-numbers', () => {
    expect(parsePositiveInt('0', 1)).toBe(1);
    expect(parsePositiveInt('-3', 1)).toBe(1);
    expect(parsePositiveInt('2.5', 1)).toBe(1);
    expect(parsePositiveInt('abc', 7)).toBe(7);
    expect(parsePositiveInt(undefined, 9)).toBe(9);
    expect(parsePositiveInt({ $ne: 1 }, 1)).toBe(1);
  });
});

describe('parseSortOrder', () => {
  it('maps ascending hints to 1', () => {
    expect(parseSortOrder('asc')).toBe(1);
    expect(parseSortOrder('ascending')).toBe(1);
    expect(parseSortOrder('1')).toBe(1);
  });

  it('defaults everything else to -1 (newest first)', () => {
    expect(parseSortOrder('desc')).toBe(-1);
    expect(parseSortOrder(undefined)).toBe(-1);
    expect(parseSortOrder('garbage')).toBe(-1);
  });
});

describe('parsePagination', () => {
  it('defaults to page 1, limit 10, skip 0', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '20' })).toEqual({
      page: 3,
      limit: 20,
      skip: 40,
    });
  });

  it('clamps limit to maxLimit and ignores invalid page/limit', () => {
    expect(parsePagination({ page: '0', limit: '5000' })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
  });

  it('honours custom default/max limits', () => {
    expect(parsePagination({}, { defaultLimit: 25 })).toMatchObject({ limit: 25 });
    expect(parsePagination({ limit: '999' }, { maxLimit: 50 })).toMatchObject({
      limit: 50,
    });
  });
});
