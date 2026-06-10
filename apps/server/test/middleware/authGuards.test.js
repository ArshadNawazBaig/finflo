/**
 * authMiddleware role/permission guards — admin, staffOrAdmin, authorizePermissions.
 * These are pure functions of req.user, so no DB/token is needed.
 */
const { admin, staffOrAdmin, authorizePermissions } = require('../../src/middleware/authMiddleware');
const { mockRes } = require('../helpers/mocks');

const run = (mw, user) => {
  const req = { user };
  const res = mockRes();
  const next = vi.fn();
  mw(req, res, next);
  return { res, next };
};

describe('admin', () => {
  it('admits admin, super_admin and managers; blocks plain staff', () => {
    expect(run(admin, { role: 'admin' }).next).toHaveBeenCalledOnce();
    expect(run(admin, { role: 'super_admin' }).next).toHaveBeenCalledOnce();
    expect(run(admin, { role: 'staff', isManager: true }).next).toHaveBeenCalledOnce();

    const blocked = run(admin, { role: 'staff', isManager: false });
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.statusCode).toBe(403);
  });

  it('blocks when there is no user', () => {
    const { res, next } = run(admin, undefined);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});

describe('staffOrAdmin', () => {
  it('admits staff and admins, blocks others', () => {
    expect(run(staffOrAdmin, { role: 'staff' }).next).toHaveBeenCalledOnce();
    expect(run(staffOrAdmin, { role: 'admin' }).next).toHaveBeenCalledOnce();
    const blocked = run(staffOrAdmin, { role: 'member' });
    expect(blocked.res.statusCode).toBe(403);
  });
});

describe('authorizePermissions', () => {
  it('401s with no user', () => {
    const { res } = run(authorizePermissions('manage_loans'), undefined);
    expect(res.statusCode).toBe(401);
  });

  it('passes super_admin and wildcard permission holders', () => {
    expect(run(authorizePermissions('manage_loans'), { role: 'super_admin', permissions: [] }).next)
      .toHaveBeenCalledOnce();
    expect(run(authorizePermissions('manage_loans'), { role: 'admin', permissions: ['*'] }).next)
      .toHaveBeenCalledOnce();
  });

  it('passes when every required permission is held', () => {
    const { next } = run(authorizePermissions('manage_loans'), {
      role: 'staff',
      permissions: ['manage_loans', 'view_reports'],
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('403s when a required permission is missing', () => {
    const { res, next } = run(authorizePermissions('manage_loans', 'manage_members'), {
      role: 'staff',
      permissions: ['manage_loans'],
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
