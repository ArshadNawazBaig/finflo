/**
 * planLimits — subscription gating. Default SystemSettings seed mirrors the
 * static defaults (Free=5 loans, Basic=50, Pro=unlimited), so these assertions
 * hold whether the dynamic or fallback path runs.
 */
const {
  PLAN_LIMITS,
  canCreateLoan,
  canAddMember,
  canAddBranch,
  canAddCustomer,
  getPlanLimits,
  getLoanUsagePercentage,
} = require('../../src/utils/planLimits');

describe('PLAN_LIMITS constant', () => {
  it('encodes the documented tier ceilings', () => {
    expect(PLAN_LIMITS.Free.loans).toBe(5);
    expect(PLAN_LIMITS.Basic.loans).toBe(50);
    expect(PLAN_LIMITS.Pro.loans).toBe(Infinity);
  });
});

describe('canCreateLoan', () => {
  it('blocks once the Free loan ceiling is reached', async () => {
    const r = await canCreateLoan('Free', 5);
    expect(r.allowed).toBe(false);
    expect(r.limit).toBe(5);
    expect(r.message).toMatch(/limit/i);
  });

  it('allows below the ceiling', async () => {
    expect((await canCreateLoan('Free', 4)).allowed).toBe(true);
  });

  it('never blocks on the unlimited Pro plan', async () => {
    expect((await canCreateLoan('Pro', 1_000_000)).allowed).toBe(true);
  });
});

describe('member / branch / customer gating', () => {
  it('blocks Basic members at 3 and Free branches at 1', async () => {
    expect((await canAddMember('Basic', 3)).allowed).toBe(false);
    expect((await canAddBranch('Free', 1)).allowed).toBe(false);
    expect((await canAddCustomer('Free', 10)).allowed).toBe(false);
  });

  it('allows below the ceilings', async () => {
    expect((await canAddMember('Basic', 2)).allowed).toBe(true);
    expect((await canAddCustomer('Basic', 50)).allowed).toBe(true);
  });
});

describe('getLoanUsagePercentage / getPlanLimits', () => {
  it('returns 0% for an unlimited plan', async () => {
    expect(await getLoanUsagePercentage('Pro', 9999)).toBe(0);
  });

  it('computes a clamped percentage for finite plans', async () => {
    expect(await getLoanUsagePercentage('Free', 2)).toBe(40); // 2/5
    expect(await getLoanUsagePercentage('Free', 99)).toBe(100); // clamped
  });

  it('exposes the resolved limits object', async () => {
    const limits = await getPlanLimits('Basic');
    expect(limits.loans).toBe(50);
    expect(limits.members).toBe(3);
  });
});
