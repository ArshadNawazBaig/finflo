/**
 * middleware/responseEnvelope — wraps outgoing res.json in the standard API
 * envelope: success → { success: true, data }, error → { success: false, … }.
 * Pure middleware unit test (no DB / HTTP).
 */
const responseEnvelope = require('../../src/middleware/responseEnvelope');

const makeRes = (statusCode = 200) => {
  const r = { statusCode, sent: undefined };
  r.json = (b) => {
    r.sent = b;
    return r;
  };
  return r;
};

const apply = (res) => responseEnvelope({}, res, () => {});

describe('responseEnvelope', () => {
  it('wraps a success object payload in { success: true, data }', () => {
    const res = makeRes(200);
    apply(res);
    res.json({ id: 1, name: 'x' });
    expect(res.sent).toEqual({ success: true, data: { id: 1, name: 'x' } });
  });

  it('wraps a 201 created payload', () => {
    const res = makeRes(201);
    apply(res);
    res.json({ id: 1 });
    expect(res.sent).toEqual({ success: true, data: { id: 1 } });
  });

  it('wraps an array payload as data', () => {
    const res = makeRes(200);
    apply(res);
    res.json([1, 2, 3]);
    expect(res.sent).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('wraps a paginated list (data + meta) so the client unwrap recovers it', () => {
    const res = makeRes(200);
    apply(res);
    const list = { data: [1], totalEntries: 1, totalPages: 1, currentPage: 1 };
    res.json(list);
    expect(res.sent).toEqual({ success: true, data: list });
  });

  it('wraps an error response as { success: false, message }', () => {
    const res = makeRes(404);
    apply(res);
    res.json({ message: 'Not found' });
    expect(res.sent).toEqual({ success: false, message: 'Not found' });
  });

  it('does not double-wrap an already-enveloped body', () => {
    const res = makeRes(200);
    apply(res);
    res.json({ success: true, data: { x: 1 } });
    expect(res.sent).toEqual({ success: true, data: { x: 1 } });
  });

  it('calls next()', () => {
    let called = false;
    responseEnvelope({}, makeRes(), () => {
      called = true;
    });
    expect(called).toBe(true);
  });
});
