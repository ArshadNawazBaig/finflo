/**
 * branchUtils — default-branch resolution and the "has any branch" gate used by
 * every member-creation path.
 */
const { getDefaultBranchId, hasAnyBranch } = require('../../src/utils/branchUtils');
const { makeOwner, makeBranch } = require('../helpers/factories');

describe('hasAnyBranch', () => {
  it('is false for a tenant with no branches, true once one exists', async () => {
    const owner = await makeOwner();
    expect(await hasAnyBranch(owner._id)).toBe(false);
    await makeBranch(owner);
    expect(await hasAnyBranch(owner._id)).toBe(true);
  });

  it('is false for a null owner', async () => {
    expect(await hasAnyBranch(null)).toBe(false);
  });
});

describe('getDefaultBranchId', () => {
  it('returns null when the tenant has no branches', async () => {
    const owner = await makeOwner();
    expect(await getDefaultBranchId(owner._id)).toBe(null);
  });

  it('prefers the branch flagged isDefault', async () => {
    const owner = await makeOwner();
    await makeBranch(owner, { name: 'A' });
    const def = await makeBranch(owner, { name: 'B', isDefault: true });
    expect(String(await getDefaultBranchId(owner._id))).toBe(String(def._id));
  });

  it('falls back to the oldest branch when none is flagged', async () => {
    const owner = await makeOwner();
    const first = await makeBranch(owner, { name: 'First' });
    await makeBranch(owner, { name: 'Second' });
    expect(String(await getDefaultBranchId(owner._id))).toBe(String(first._id));
  });

  it('scopes to the owner (no cross-tenant leak)', async () => {
    const a = await makeOwner();
    const b = await makeOwner();
    await makeBranch(a, { isDefault: true });
    expect(await getDefaultBranchId(b._id)).toBe(null);
  });
});
