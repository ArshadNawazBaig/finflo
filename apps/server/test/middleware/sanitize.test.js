/**
 * Unit tests for the NoSQL operator-injection sanitiser. Verifies that `$`-
 * and `.`-prefixed keys are stripped from body/params/query while legitimate
 * values survive — the guard that neutralises payloads like `?status[$ne]=…`.
 */
const { sanitizeMongoKeys, sanitizeRequest } = require('../../src/middleware/sanitize');

describe('sanitizeMongoKeys', () => {
  it('strips operator ($-prefixed) keys', () => {
    const obj = { name: 'ok', $where: 'evil', status: { $ne: 'resolved' } };
    sanitizeMongoKeys(obj);
    expect(obj).toEqual({ name: 'ok', status: {} });
  });

  it('strips dotted (path-injection) keys', () => {
    const obj = { 'a.b': 1, '__proto__.x': 2, keep: 3 };
    sanitizeMongoKeys(obj);
    expect(obj).toEqual({ keep: 3 });
  });

  it('recurses into nested objects and arrays', () => {
    const obj = { list: [{ $gt: 1, ok: 2 }], nested: { deep: { $or: [] } } };
    sanitizeMongoKeys(obj);
    expect(obj).toEqual({ list: [{ ok: 2 }], nested: { deep: {} } });
  });

  it('is a no-op for non-objects', () => {
    expect(() => sanitizeMongoKeys(null)).not.toThrow();
    expect(() => sanitizeMongoKeys('str')).not.toThrow();
    expect(() => sanitizeMongoKeys(42)).not.toThrow();
  });
});

describe('sanitizeRequest middleware', () => {
  it('sanitises body, params, and nested query values then calls next', () => {
    const req = {
      body: { name: 'ok', $set: 'x' },
      params: { id: '1', '$x.y': 'z' },
      query: { status: { $ne: 'resolved' }, plain: 'keep' },
    };
    let called = false;
    sanitizeRequest(req, {}, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(req.body).toEqual({ name: 'ok' });
    expect(req.params).toEqual({ id: '1' });
    // query container is preserved; only the nested operator is stripped.
    expect(req.query.status).toEqual({});
    expect(req.query.plain).toBe('keep');
  });
});
