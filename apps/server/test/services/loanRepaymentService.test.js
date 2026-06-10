/**
 * processRepayment — the money-movement core. Covers phantom-payment / overdraft
 * guards, overpayment clamping, the $gte stale-balance guard, early-settlement
 * capping, principal tracking and end-to-end ledger reconciliation.
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const Repayment = require('../../src/models/Repayment');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { processRepayment } = require('../../src/services/loanRepaymentService');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

describe('processRepayment — phantom-payment & overdraft guards', () => {
  it('aborts (throws) on insufficient wallet funds and books NOTHING', async () => {
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

  it('applies a normal repayment, debits the wallet once and writes the ledger', async () => {
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
    const loan = await makeLoan(owner, customer, {
      remainingAmount: 5000,
      totalAmount: 124000,
      paidAmount: 119000,
    });

    await processRepayment(loan, 50000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const freshLoan = await Loan.findById(loan._id);
    const freshMember = await Member.findById(member._id);
    expect(freshLoan.remainingAmount).toBe(0);
    expect(freshMember.currentBalance).toBe(995000); // only the 5000 owed debited
  });

  it('rejects a stale-balance repayment via the $gte guard (no over-collection)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer, { remainingAmount: 5000, paidAmount: 119000 });

    await Loan.updateOne({ _id: loan._id }, { $set: { remainingAmount: 2000 } });

    await expect(
      processRepayment(loan, 5000, ownerReq(owner), {
        deductFromWallet: true,
        allowEarlySettlement: false,
      }),
    ).rejects.toThrow(/changed concurrently/i);

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(2000);
  });

  it('caps an early settlement at the current total owed (simple, post-tenure)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000000 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
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
    expect(freshLoan.paidAmount).toBeLessThanOrEqual(124000);
    expect(freshLoan.status).toBe('completed');
  });
});

describe('processRepayment — outstandingPrincipal tracking (B5)', () => {
  it('decrements outstandingPrincipal by exactly the principal portion', async () => {
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
});

describe('Accounting integrity — wallet balance reconciles to the ledger (no drift)', () => {
  it('after deposit + withdrawal + wallet repayment, balance == net ledger', async () => {
    const memberController = require('../../src/controllers/memberController');
    const { mockRes } = require('../helpers/mocks');
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const customer = await makeCustomer(owner, { memberId: member._id, isMember: true });
    const loan = await makeLoan(owner, customer);

    await memberController.addInvestment(
      { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 20000 } },
      mockRes(),
    );
    await memberController.withdrawInvestment(
      { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 5000 } },
      mockRes(),
    );
    const loanDoc = await Loan.findById(loan._id);
    await processRepayment(loanDoc, 10000, ownerReq(owner), {
      deductFromWallet: true,
      allowEarlySettlement: false,
    });

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(5000);

    const ledger = await Investment.find({ member: member._id });
    const CREDIT = new Set(['deposit', 'transfer_receive', 'external_receive', 'p2p_receive']);
    const net = ledger.reduce((s, i) => s + (CREDIT.has(i.type) ? i.amount : -i.amount), 0);
    expect(net).toBe(fresh.currentBalance);

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.paidAmount).toBe(10000);
    expect(freshLoan.remainingAmount).toBe(loan.totalAmount - 10000);
  });
});
