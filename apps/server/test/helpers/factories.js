/**
 * Fixture factories — build valid model documents with sensible defaults so test
 * cases only specify the fields they actually care about. Every factory returns
 * the created (and persisted) mongoose document.
 */
const User = require('../../src/models/User');
const Branch = require('../../src/models/Branch');
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const Loan = require('../../src/models/Loan');
const Investment = require('../../src/models/Investment');
const TermDeposit = require('../../src/models/TermDeposit');
const LoanGroup = require('../../src/models/LoanGroup');
const GroupLoan = require('../../src/models/GroupLoan');
const Repayment = require('../../src/models/Repayment');

// Monotonic unique-ish suffix so emails / cnics never collide within a run.
let seq = 0;
const uid = () => `${Date.now()}-${seq++}`;

async function makeOwner(overrides = {}) {
  return User.create({
    name: 'Owner',
    email: `owner-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'admin',
    ...overrides,
  });
}

async function makeStaff(owner, overrides = {}) {
  return User.create({
    name: 'Staff',
    email: `staff-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'staff',
    ownerId: owner._id,
    ...overrides,
  });
}

async function makeBranch(owner, overrides = {}) {
  return Branch.create({
    name: `Branch ${uid()}`,
    address: 'x',
    contactNumber: '0300',
    owner: owner._id,
    ...overrides,
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

async function makeInvestment(owner, member, overrides = {}) {
  return Investment.create({
    user: owner._id,
    member: member._id,
    type: overrides.type ?? 'deposit',
    accountType: overrides.accountType ?? 'current',
    amount: overrides.amount ?? 10000,
    ...overrides,
  });
}

async function makeTermDeposit(owner, member, overrides = {}) {
  const DAY = 24 * 60 * 60 * 1000;
  return TermDeposit.create({
    user: owner._id,
    member: member._id,
    principal: overrides.principal ?? 100000,
    profitRate: overrides.profitRate ?? 12,
    duration: overrides.duration ?? 12,
    startDate: overrides.startDate ?? new Date(Date.now() - 180 * DAY),
    maturityDate: overrides.maturityDate ?? new Date(Date.now() + 180 * DAY),
    projectedProfit: overrides.projectedProfit ?? 12000,
    status: overrides.status ?? 'active',
    ...overrides,
  });
}

// A standing joint-liability group. `customers` is an array of Customer docs;
// the first is the leader.
async function makeGroup(owner, customers = [], overrides = {}) {
  return LoanGroup.create({
    user: owner._id,
    name: `Group ${uid()}`,
    members: customers.map((c, i) => ({
      customer: c._id,
      role: i === 0 ? 'leader' : 'member',
      status: 'active',
    })),
    status: overrides.status ?? 'forming',
    guaranteePolicy: overrides.guaranteePolicy ?? 'joint',
    ...overrides,
  });
}

// A pending group-loan cycle. `allocations` is [{ customer, loan, principal }].
async function makeGroupLoan(owner, group, allocations = [], overrides = {}) {
  return GroupLoan.create({
    user: owner._id,
    group: group._id,
    allocations,
    rate: overrides.rate ?? 24,
    duration: overrides.duration ?? 12,
    interestType: overrides.interestType ?? 'simple',
    startDate: overrides.startDate ?? new Date(),
    totalPrincipal:
      overrides.totalPrincipal ??
      allocations.reduce((s, a) => s + (a.principal || 0), 0),
    status: overrides.status ?? 'pending',
    ...overrides,
  });
}

// A repayment row against a loan, used to build punctuality history for credit
// scoring. `date` vs the installment due date determines on-time/late.
async function makeRepayment(owner, loan, customer, overrides = {}) {
  return Repayment.create({
    user: owner._id,
    loan: loan._id,
    customer: customer._id,
    amount: overrides.amount ?? 5000,
    interestAmount: overrides.interestAmount ?? 0,
    principalAmount: overrides.principalAmount ?? (overrides.amount ?? 5000),
    installmentNumber: overrides.installmentNumber ?? 1,
    date: overrides.date ?? new Date(),
    status: overrides.status ?? 'Completed',
    ...overrides,
  });
}

module.exports = {
  uid,
  makeOwner,
  makeStaff,
  makeBranch,
  makeMember,
  makeCustomer,
  makeLoan,
  makeInvestment,
  makeTermDeposit,
  makeGroup,
  makeGroupLoan,
  makeRepayment,
};
