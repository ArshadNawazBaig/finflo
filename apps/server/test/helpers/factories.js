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
};
