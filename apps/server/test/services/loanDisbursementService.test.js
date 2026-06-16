/**
 * loanDisbursementService — the money-out side of lending. disburseLoan writes
 * the disbursement ledger row and (for member borrowers) credits the wallet +
 * records the Investment ledger entry; settleLoanRenewal closes the old loan and,
 * for a top-up, disburses only the extra cash above the carried-over balance.
 *
 * These paths had zero coverage. Covers: member vs non-member disbursement, the
 * exact ledger/wallet shape, tenant attribution, rollover (no cash) vs top-up
 * (extra cash only), and the top-up-with-no-headroom edge (extraCash === 0).
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const {
  disburseLoan,
  settleLoanRenewal,
} = require('../../src/services/loanDisbursementService');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

describe('disburseLoan', () => {
  it('credits a member borrower wallet, writes the ledger row and the investment entry', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0, totalLoanProceeds: 0 });
    const customer = await makeCustomer(owner, {
      memberId: member._id,
      isMember: true,
    });
    const loan = await makeLoan(owner, customer); // principal 100000

    await disburseLoan(loan, ownerReq(owner));

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(100000);
    // Loan proceeds are tracked separately from member capital (totalInvested).
    expect(fresh.totalLoanProceeds).toBe(100000);

    const txn = await FinancialTransaction.findOne({
      loan: loan._id,
      category: 'loan_disbursement',
    });
    expect(txn).toBeTruthy();
    expect(txn.amount).toBe(100000);
    expect(txn.type).toBe('loan');
    expect(String(txn.user)).toBe(String(owner._id)); // tenant attribution
    expect(String(txn.member)).toBe(String(member._id));

    const inv = await Investment.findOne({
      loan: loan._id,
      type: 'loan_disbursement',
    });
    expect(inv).toBeTruthy();
    expect(inv.amount).toBe(100000);
    expect(inv.balanceAfter).toBe(100000); // mirrors the post-credit wallet
  });

  it('disburses a non-member customer with a ledger row but NO wallet/investment entry', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner); // plain customer, not a member
    const loan = await makeLoan(owner, customer);

    await disburseLoan(loan, ownerReq(owner));

    expect(
      await FinancialTransaction.countDocuments({
        loan: loan._id,
        category: 'loan_disbursement',
      }),
    ).toBe(1);
    expect(
      await Investment.countDocuments({ loan: loan._id, type: 'loan_disbursement' }),
    ).toBe(0);
  });
});

describe('settleLoanRenewal', () => {
  it('rollover: closes the old loan and disburses NO cash', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 5000 });
    const customer = await makeCustomer(owner, {
      memberId: member._id,
      isMember: true,
    });
    const oldLoan = await makeLoan(owner, customer, { remainingAmount: 50000 });
    const newLoan = await makeLoan(owner, customer, { principal: 80000 });

    await settleLoanRenewal(oldLoan, newLoan, 'rollover', ownerReq(owner));

    const reloaded = await Loan.findById(oldLoan._id);
    expect(reloaded.status).toBe('renewed');
    expect(reloaded.remainingAmount).toBe(0);
    expect(String(reloaded.renewedTo)).toBe(String(newLoan._id));

    // Rollover carries debt forward — no new disbursement, wallet untouched.
    expect(
      await FinancialTransaction.countDocuments({
        loan: newLoan._id,
        category: 'loan_disbursement',
      }),
    ).toBe(0);
    expect((await Member.findById(member._id)).currentBalance).toBe(5000);
  });

  it('top-up: closes the old loan and disburses only the extra cash above the carried-over balance', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 5000, totalLoanProceeds: 0 });
    const customer = await makeCustomer(owner, {
      memberId: member._id,
      isMember: true,
    });
    const oldLoan = await makeLoan(owner, customer, { remainingAmount: 50000 });
    const newLoan = await makeLoan(owner, customer, { principal: 80000 });

    await settleLoanRenewal(oldLoan, newLoan, 'topup', ownerReq(owner));

    const extraCash = 80000 - 50000; // 30000

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(5000 + extraCash);
    expect(fresh.totalLoanProceeds).toBe(extraCash);

    const txn = await FinancialTransaction.findOne({
      loan: newLoan._id,
      category: 'loan_disbursement',
    });
    expect(txn).toBeTruthy();
    expect(txn.amount).toBe(extraCash);

    const inv = await Investment.findOne({
      loan: newLoan._id,
      type: 'loan_disbursement',
    });
    expect(inv.amount).toBe(extraCash);
    expect(inv.balanceAfter).toBe(5000 + extraCash);
  });

  it('top-up with no headroom (new principal <= carried balance) disburses nothing', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 5000 });
    const customer = await makeCustomer(owner, {
      memberId: member._id,
      isMember: true,
    });
    const oldLoan = await makeLoan(owner, customer, { remainingAmount: 50000 });
    const newLoan = await makeLoan(owner, customer, { principal: 40000 }); // < 50000

    await settleLoanRenewal(oldLoan, newLoan, 'topup', ownerReq(owner));

    expect((await Loan.findById(oldLoan._id)).status).toBe('renewed');
    expect(
      await FinancialTransaction.countDocuments({
        loan: newLoan._id,
        category: 'loan_disbursement',
      }),
    ).toBe(0);
    expect((await Member.findById(member._id)).currentBalance).toBe(5000);
  });
});
