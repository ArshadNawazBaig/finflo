/**
 * Integration tests for the FinFlo audit fixes — they execute the REAL production
 * code (services + controllers) against an in-memory MongoDB replica set, so
 * transactions, $gte guards, CAS idempotency and rounding all run for real.
 *
 *   npm run test --workspace=apps/server
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-definitely-long-enough-xx';
process.env.RAAST_SECRET_KEY = 'raast-test-secret';

// Test API (describe/it/expect/hooks) is injected as globals via vitest.config.js
// `globals: true` — Vitest 4 cannot be `require()`d directly.
const crypto = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// ── Models ───────────────────────────────────────────────────────────────────
const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const Member = require('../src/models/Member');
const Customer = require('../src/models/Customer');
const Loan = require('../src/models/Loan');
const Repayment = require('../src/models/Repayment');
const Investment = require('../src/models/Investment');
const FinancialTransaction = require('../src/models/FinancialTransaction');
const ProfitDistribution = require('../src/models/ProfitDistribution');
const ExternalTransfer = require('../src/models/ExternalTransfer');
const TermDeposit = require('../src/models/TermDeposit');
const reportController = require('../src/controllers/reportController');
const reconciliationController = require('../src/controllers/reconciliationController');

// ── Units under test ─────────────────────────────────────────────────────────
const { processRepayment } = require('../src/services/loanRepaymentService');
const { runCompoundInterestAccrual } = require('../src/services/scheduledTasksService');
const memberController = require('../src/controllers/memberController');
const raastWebhookController = require('../src/controllers/raastWebhookController');
const externalTransferController = require('../src/controllers/externalTransferController');

let replset;

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
let seq = 0;
const uid = () => `${Date.now()}-${seq++}`;

async function makeOwner() {
  return User.create({
    name: 'Owner',
    email: `owner-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'admin',
  });
}

async function makeMember(owner, overrides = {}) {
  return Member.create({
    user: owner._id,
    email: `m-${uid()}@test.com`,
    phone: '03000000000',
    password: 'password123',
    cnic: `cnic-${uid()}`,
    status: 'Active',
    currentBalance: 0,
    savingBalance: 0,
    ...overrides,
  });
}

async function makeCustomer(owner, overrides = {}) {
  return Customer.create({
    user: owner._id,
    name: `cust ${uid()}`,
    email: `c-${uid()}@test.com`,
    phone: '03000000000',
    cnic: `${uid()}`,
    ...overrides,
  });
}

async function makeLoan(owner, customer, overrides = {}) {
  const principal = overrides.principal ?? 100000;
  return Loan.create({
    user: owner._id,
    customer: customer._id,
    principal,
    rate: overrides.rate ?? 24,
    duration: overrides.duration ?? 12,
    emi: overrides.emi ?? 9456,
    totalAmount: overrides.totalAmount ?? 124000,
    startDate: overrides.startDate ?? new Date(),
    remainingAmount: overrides.remainingAmount ?? (overrides.totalAmount ?? 124000),
    outstandingPrincipal: overrides.outstandingPrincipal ?? principal,
    interestType: overrides.interestType ?? 'simple',
    status: overrides.status ?? 'active',
    ...overrides,
  });
}

const ownerReq = (owner) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, branchId: undefined },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

const mockRes = () => {
  const r = { statusCode: 200, body: undefined };
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  return r;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('processRepayment — phantom-payment & overdraft fixes', () => {
  it('aborts (throws) when the wallet has insufficient funds and books NOTHING', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    member.customer = customer._id;
    await member.save();
    const loan = await makeLoan(owner, customer);

    await expect(
      processRepayment(loan, 10000, ownerReq(owner), {
        deductFromWallet: true,
        allowEarlySettlement: false,
      }),
    ).rejects.toThrow(/insufficient wallet balance/i);

    // No phantom: balance untouched, loan untouched, no ledger rows.
    const freshMember = await Member.findById(member._id);
    const freshLoan = await Loan.findById(loan._id);
    expect(freshMember.currentBalance).toBe(0);
    expect(freshLoan.paidAmount).toBe(0);
    expect(freshLoan.remainingAmount).toBe(124000);
    expect(await Repayment.countDocuments({ loan: loan._id })).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({ loan: loan._id, category: 'repayment' }),
    ).toBe(0);
  });

  it('applies a normal repayment, debits the wallet once, and writes the ledger', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 50000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer);

    await processRepayment(loan, 10000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const freshMember = await Member.findById(member._id);
    const freshLoan = await Loan.findById(loan._id);
    expect(freshMember.currentBalance).toBe(40000);
    expect(freshLoan.paidAmount).toBe(10000);
    expect(freshLoan.remainingAmount).toBe(114000);
    expect(await Repayment.countDocuments({ loan: loan._id })).toBe(1);
  });

  it('clamps an overpayment so remainingAmount never goes negative', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer, { remainingAmount: 5000, totalAmount: 124000, paidAmount: 119000 });

    await processRepayment(loan, 50000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const freshLoan = await Loan.findById(loan._id);
    const freshMember = await Member.findById(member._id);
    expect(freshLoan.remainingAmount).toBe(0); // not negative
    // wallet only debited the 5000 actually owed, not the requested 50000
    expect(freshMember.currentBalance).toBe(995000);
  });

  it('rejects a stale-balance repayment via the $gte guard (no over-collection)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer, { remainingAmount: 5000, paidAmount: 119000 });

    // Simulate a concurrent payment having already reduced the DB balance to 2000,
    // while our in-memory loan object still believes 5000 remains.
    await Loan.updateOne({ _id: loan._id }, { $set: { remainingAmount: 2000 } });

    await expect(
      processRepayment(loan, 5000, ownerReq(owner), {
        deductFromWallet: true,
        allowEarlySettlement: false,
      }),
    ).rejects.toThrow(/changed concurrently/i);

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(2000); // unchanged, not negative
  });

  it('caps an early settlement at the current total owed (simple, post-tenure)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    // 1-year simple loan that started 18 months ago → actual-day interest overshoots.
    const start = new Date();
    start.setMonth(start.getMonth() - 18);
    const loan = await makeLoan(owner, customer, {
      principal: 100000,
      rate: 24,
      duration: 12,
      totalAmount: 124000,
      remainingAmount: 124000,
      startDate: start,
    });

    await processRepayment(loan, 1000000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: true,
    });

    const freshLoan = await Loan.findById(loan._id);
    // Settlement must never exceed the contractual total owed (124000), even though
    // 18 months of actual-day interest would compute well above it.
    expect(freshLoan.paidAmount).toBeLessThanOrEqual(124000);
    expect(freshLoan.status).toBe('completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('runCompoundInterestAccrual — once per missed period', () => {
  it('capitalizes ONE month for one missed installment across 30 daily cron runs', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    // Compound loan, started ~40 days ago, no payments → 1 installment overdue.
    const start = new Date();
    start.setDate(start.getDate() - 40);
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: start,
    });

    for (let day = 0; day < 30; day++) {
      await runCompoundInterestAccrual();
    }

    const freshLoan = await Loan.findById(loan._id);
    // Exactly one month of interest (100000 * 24 / 1200 = 2000) — not 30×.
    expect(freshLoan.remainingAmount).toBe(102000);
    expect(freshLoan.compoundedPeriods).toBe(1);
  });

  it('compounds a LEGACY loan that has no compoundedPeriods field (CAS missing-field fix)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const start = new Date();
    start.setDate(start.getDate() - 40);
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: start,
    });
    // Simulate a pre-migration document: strip the field entirely.
    await Loan.collection.updateOne({ _id: loan._id }, { $unset: { compoundedPeriods: '' } });

    await runCompoundInterestAccrual();

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(102000);
    expect(freshLoan.compoundedPeriods).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('outstandingPrincipal (B5) — interest base is principal-only', () => {
  it('a repayment decrements outstandingPrincipal by exactly its principal portion', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 100000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer, { principal: 100000 });

    await processRepayment(loan, 10000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const rep = await Repayment.findOne({ loan: loan._id });
    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.outstandingPrincipal).toBe(100000 - rep.principalAmount);
  });

  it('compound interest accrues on principal, NOT on accrued late fees', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const start = new Date();
    start.setDate(start.getDate() - 40);
    // remainingAmount inflated by 20000 of "late fees"; principal is still 100000.
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 120000,
      remainingAmount: 120000,
      outstandingPrincipal: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: start,
    });

    await runCompoundInterestAccrual();

    const freshLoan = await Loan.findById(loan._id);
    // Interest = 100000 * 24/1200 = 2000 (on principal), NOT 120000-based 2400.
    expect(freshLoan.remainingAmount).toBe(122000);
    expect(freshLoan.outstandingPrincipal).toBe(102000); // capitalized into principal
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Loan-proceeds reclassification (B5 disbursement)', () => {
  it('rebuild separates loan proceeds from member capital; balance still backs out', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      currentBalance: 0,
      totalInvested: 0,
      totalLoanProceeds: 0,
    });
    // A genuine deposit and a loan disbursement, both crediting the wallet.
    await Investment.create({
      user: owner._id,
      member: member._id,
      type: 'deposit',
      accountType: 'current',
      amount: 5000,
    });
    await Investment.create({
      user: owner._id,
      member: member._id,
      type: 'loan_disbursement',
      accountType: 'current',
      amount: 20000,
    });

    const req = {
      user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
    };
    await reconciliationController.resolveMemberBalances(req, mockRes());

    const fresh = await Member.findById(member._id);
    expect(fresh.totalInvested).toBe(5000); // capital only — NOT 25000
    expect(fresh.totalLoanProceeds).toBe(20000); // borrowed money tracked apart
    // Wallet still fully backed: capital + proceeds − withdrawn + profit.
    expect(fresh.currentBalance).toBe(25000);
  });

  it('balance sheet still foots when a wallet is funded by a loan disbursement', async () => {
    const owner = await makeOwner();
    await makeMember(owner, {
      currentBalance: 20000,
      totalInvested: 0,
      totalLoanProceeds: 20000,
    });
    await makeLoan(owner, await makeCustomer(owner), {
      principal: 20000,
      totalAmount: 24000,
      remainingAmount: 24000,
      outstandingPrincipal: 20000,
      paidAmount: 0,
      status: 'active',
    });

    const req = {
      user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
      query: {},
    };
    const res = mockRes();
    await reportController.getBalanceSheet(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.balanceCheck.isBalanced).toBe(true);
    expect(res.body.assets.loansReceivable).toBe(20000);
    expect(res.body.liabilities.memberCurrentAccounts).toBe(20000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Branch Analytics card — loan attribution + deposits not inflated', () => {
  it('a loan-funded member shows Disbursed=principal and Deposits=0 on its branch', async () => {
    const owner = await makeOwner();
    const branch = await Branch.create({
      name: 'Main',
      address: 'x',
      contactNumber: '0300',
      owner: owner._id,
    });
    // Member funded by a 50k loan: proceeds tracked apart from capital (B5).
    await makeMember(owner, {
      branchId: branch._id,
      currentBalance: 50000,
      totalInvested: 0,
      totalLoanProceeds: 50000,
    });
    await makeLoan(owner, await makeCustomer(owner), {
      branchId: branch._id,
      principal: 50000,
      totalAmount: 60000,
      remainingAmount: 60000,
      outstandingPrincipal: 50000,
      status: 'active',
    });

    const req = {
      user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
      query: {},
    };
    const res = mockRes();
    await reportController.getBranchSummary(req, res);

    expect(res.statusCode).toBe(200);
    const card = res.body.find((b) => String(b._id) === String(branch._id));
    expect(card).toBeTruthy();
    expect(card.stats.totalVolume).toBe(50000); // Disbursed — was 0 (branch mismatch)
    expect(card.stats.totalInvested).toBe(0); // Deposits — was 50000 (proceeds bug)
    expect(card.stats.activeLoans).toBe(1);
    expect(card.stats.totalOutstanding).toBe(60000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Late-fee engine gating (B1)', () => {
  it('the daily accrual cron does NOT stack on a fee the manual engine charged this month', async () => {
    const owner = await User.create({
      name: 'O',
      email: `o-${uid()}@test.com`,
      password: 'x'.repeat(20),
      role: 'admin',
      lateFeeEnabled: true,
      lateFeeType: 'fixed',
      lateFeeRate: 1000,
      lateFeeGracePeriodDays: 0,
    });
    const customer = await makeCustomer(owner);
    // Loan whose tenure ended well in the past → eligible for late fees.
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const loan = await makeLoan(owner, customer, {
      duration: 1,
      remainingAmount: 50000,
      startDate: start,
      lateFeeAmount: 1000,
      lateFeeSource: 'manual',
      lateFeeAppliedAt: new Date(), // manual fee charged today (this month)
    });

    await runCompoundInterestAccrual(); // unrelated
    await require('../src/services/scheduledTasksService').runLateFeeAccrual();

    const freshLoan = await Loan.findById(loan._id);
    // Gate held: manual already owns this loan this month, cron added nothing.
    expect(freshLoan.lateFeeAmount).toBe(1000);
    expect(freshLoan.lateFeeSource).toBe('manual');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('distributeProfit — pool conservation', () => {
  it('credits members so the sum equals the declared pool EXACTLY (no rupee lost)', async () => {
    const owner = await makeOwner();
    const members = await Promise.all([makeMember(owner), makeMember(owner), makeMember(owner)]);

    // Equal pre-period deposits → equal weighted balances → 100/3 split that the
    // old independent-rounding code lost a rupee on.
    const before = new Date('2026-01-01');
    for (const m of members) {
      await Investment.create({ user: owner._id, member: m._id, type: 'deposit', amount: 10000, date: before });
    }

    const req = {
      ...ownerReq(owner),
      body: {
        totalProfit: 100,
        period: 'Feb 2026',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      },
    };
    const res = mockRes();
    await memberController.distributeProfit(req, res);

    expect(res.statusCode).toBe(201);
    const dist = await ProfitDistribution.find({ user: owner._id });
    const sum = dist.reduce((s, d) => s + d.amount, 0);
    expect(sum).toBe(100); // conserved — old code produced 99
    expect(res.body.totalDistributed).toBe(100);

    // And member balances received exactly the pool in aggregate.
    const fresh = await Member.find({ user: owner._id });
    const credited = fresh.reduce((s, m) => s + m.currentBalance, 0);
    expect(credited).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Term deposit balance sheet (B4) — accrue profit over the term', () => {
  it('term deposit obligation uses accrued-to-date profit, not full projected', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const DAY = 24 * 60 * 60 * 1000;
    // Exactly mid-term: started 180 days ago, matures in 180 days → ~50% elapsed.
    await TermDeposit.create({
      user: owner._id,
      member: member._id,
      principal: 100000,
      profitRate: 12,
      duration: 12,
      startDate: new Date(Date.now() - 180 * DAY),
      maturityDate: new Date(Date.now() + 180 * DAY),
      projectedProfit: 12000,
      status: 'active',
    });

    const req = {
      user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
      query: {},
    };
    const res = mockRes();
    await reportController.getBalanceSheet(req, res);

    expect(res.statusCode).toBe(200);
    const obligation = res.body.liabilities.termDepositObligations;
    // principal 100000 + accrued ~6000 (half of 12000), NOT principal + full 12000.
    expect(obligation).toBeGreaterThan(105000);
    expect(obligation).toBeLessThan(107500);
    expect(obligation).toBeLessThan(112000); // would be 112000 under the old day-1 recognition
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Raast deposit webhook — idempotency', () => {
  const sign = (body) =>
    crypto.createHmac('sha256', process.env.RAAST_SECRET_KEY).update(JSON.stringify(body)).digest('hex');

  it('credits exactly once even when the same PAID event is delivered twice', async () => {
    const owner = await makeOwner();
    const branch = await Branch.create({
      name: 'Main',
      address: 'x',
      contactNumber: '0300',
      owner: owner._id,
    });
    const member = await makeMember(owner, { currentBalance: 0, branchId: branch._id });
    const investment = await Investment.create({
      user: owner._id,
      member: member._id,
      branchId: branch._id,
      type: 'deposit',
      amount: 5000,
      status: 'Pending',
      metadata: { raastStatus: 'PENDING' },
    });

    const body = { order_reference: String(investment._id), amount: '5000', status: 'PAID', transaction_id: 'TXN-1' };
    const makeReq = () => ({ body, headers: { 'x-signature': sign(body) }, ip: '127.0.0.1' });

    await raastWebhookController.handleRaastWebhook(makeReq(), mockRes());
    await raastWebhookController.handleRaastWebhook(makeReq(), mockRes()); // replay

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(5000); // credited once, not 10000
    const credits = await FinancialTransaction.countDocuments({ member: member._id, type: 'income' });
    expect(credits).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('External transfer — reversal on payout failure', () => {
  it('re-credits the member and marks the transfer Failed when the payout throws', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 100000 });

    // Neutralize the tier limit check and force the payout to hard-fail.
    const transferLimits = require('../src/services/transferLimits');
    const origAssert = transferLimits.assertWithinLimits;
    transferLimits.assertWithinLimits = async () => {};
    const payoutService = require('../src/services/payoutService');
    const origSend = payoutService.sendTransfer;
    payoutService.sendTransfer = async () => {
      throw new Error('bank rejected');
    };

    try {
      const req = {
        member: { _id: member._id, user: owner._id, branchId: undefined },
        body: { bankType: 'bank', bankName: 'HBL', accountIdentifier: 'PK00HABB000', amount: 25000 },
      };
      const res = mockRes();
      await externalTransferController.initiateExternalTransfer(req, res);

      expect(res.statusCode).toBe(502);
      const fresh = await Member.findById(member._id);
      expect(fresh.currentBalance).toBe(100000); // fully reversed
      const xfer = await ExternalTransfer.findOne({ member: member._id });
      expect(xfer.status).toBe('Failed');
      // No phantom withdrawal Investment row for the reversed transfer.
      expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(0);
    } finally {
      transferLimits.assertWithinLimits = origAssert;
      payoutService.sendTransfer = origSend;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Deposit / withdrawal — atomicity & balance correctness', () => {
  it('addInvestment credits balance and writes BOTH ledgers', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const req = { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 7000 } };
    const res = mockRes();
    await memberController.addInvestment(req, res);

    expect(res.statusCode).toBe(201);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(7000);
    expect(await Investment.countDocuments({ member: member._id, type: 'deposit' })).toBe(1);
    expect(await FinancialTransaction.countDocuments({ member: member._id, type: 'credit' })).toBe(1);
  });

  it('withdrawInvestment blocks an overdraft (atomic $gte) and writes nothing', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000 });
    const req = { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 5000 } };
    const res = mockRes();
    await memberController.withdrawInvestment(req, res);

    expect(res.statusCode).toBe(400);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(1000); // untouched
    expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Accounting integrity — balance reconciles to the ledger (no drift)', () => {
  it('after deposit + withdrawal + wallet loan repayment, balance == net ledger', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer);

    // Deposit 20000
    await memberController.addInvestment(
      { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 20000 } },
      mockRes(),
    );
    // Withdraw 5000
    await memberController.withdrawInvestment(
      { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 5000 } },
      mockRes(),
    );
    // Wallet-funded loan repayment 10000
    const loanDoc = await Loan.findById(loan._id);
    await processRepayment(loanDoc, 10000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(5000); // 20000 - 5000 - 10000

    // Reconcile the stored balance against the Investment ledger from first principles.
    const ledger = await Investment.find({ member: member._id });
    const CREDIT = new Set(['deposit', 'transfer_receive', 'external_receive', 'p2p_receive']);
    const net = ledger.reduce((s, i) => s + (CREDIT.has(i.type) ? i.amount : -i.amount), 0);
    expect(net).toBe(fresh.currentBalance); // ledger and balance agree → no drift

    // Loan side: principal reduced by exactly the 10000 applied.
    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.paidAmount).toBe(10000);
    expect(freshLoan.remainingAmount).toBe(loan.totalAmount - 10000);
  });
});
