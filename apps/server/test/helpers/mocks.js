/**
 * Express req/res test doubles. `mockRes()` captures `statusCode` + `body` so a
 * controller can be driven directly without HTTP. `ownerReq` / `memberReq` build
 * the minimal authenticated-request shape the controllers read.
 */
const ownerReq = (owner, overrides = {}) => ({
  user: {
    _id: owner._id,
    effectiveOwnerId: owner._id,
    role: 'admin',
    isSuperAdmin: false,
    branchId: undefined,
  },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const memberReq = (member, owner, overrides = {}) => ({
  member: { _id: member._id, user: owner._id, branchId: member.branchId },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const r = { statusCode: 200, body: undefined, headers: {} };
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  r.send = (b) => {
    r.body = b;
    return r;
  };
  r.set = (k, v) => {
    r.headers[k] = v;
    return r;
  };
  r.cookies = {};
  r.cookie = (k, v, opts) => {
    r.cookies[k] = { value: v, opts };
    return r;
  };
  r.clearCookie = (k) => {
    delete r.cookies[k];
    return r;
  };
  return r;
};

module.exports = { ownerReq, memberReq, mockRes };
