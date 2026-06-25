/**
 * requireFeature — server-side feature gating. The flag lives on the tenant
 * OWNER; staff resolve it via their owner. super_admin bypasses.
 */
const { requireFeature } = require('../../src/middleware/authMiddleware');
const { makeOwner, makeStaff } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const gate = requireFeature('payrollEnabled');

const run = async (user) => {
  const res = mockRes();
  let nexted = false;
  await gate(user ? { user } : {}, res, () => {
    nexted = true;
  });
  return { res, nexted };
};

describe('requireFeature', () => {
  it('allows an admin whose tenant has the feature enabled', async () => {
    const { nexted } = await run({ role: 'admin', payrollEnabled: true });
    expect(nexted).toBe(true);
  });

  it('403s an admin whose tenant does not have the feature', async () => {
    const { res, nexted } = await run({ role: 'admin', payrollEnabled: false });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('lets super_admin bypass', async () => {
    const { nexted } = await run({ role: 'super_admin' });
    expect(nexted).toBe(true);
  });

  it('resolves the flag from the OWNER for staff', async () => {
    const owner = await makeOwner({ payrollEnabled: true });
    const staff = await makeStaff(owner);
    const { nexted } = await run({
      role: 'staff',
      _id: staff._id,
      effectiveOwnerId: owner._id,
    });
    expect(nexted).toBe(true);
  });

  it('403s staff whose owner has the feature disabled', async () => {
    const owner = await makeOwner({ payrollEnabled: false });
    const staff = await makeStaff(owner);
    const { res, nexted } = await run({
      role: 'staff',
      _id: staff._id,
      effectiveOwnerId: owner._id,
    });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('401s when no user is present', async () => {
    const { res } = await run(null);
    expect(res.statusCode).toBe(401);
  });
});
