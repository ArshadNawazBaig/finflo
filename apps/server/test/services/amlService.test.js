/**
 * amlService — transaction screening against active rules (threshold alerts),
 * large-cash CTR generation, and the pure compliance-score helper.
 */
const mongoose = require('mongoose');
const AmlRule = require('../../src/models/AmlRule');
const AmlAlert = require('../../src/models/AmlAlert');
const CurrencyTransactionReport = require('../../src/models/CurrencyTransactionReport');
const { screenTransaction, calculateComplianceScore } = require('../../src/services/amlService');
const { makeOwner } = require('../helpers/factories');

// A plain transaction-like object (NOT a persisted FinancialTransaction) so the
// model's post('save') auto-screening hook doesn't fire — this isolates the unit
// under test and avoids double-screening.
const makeTx = (owner, over = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  user: owner._id,
  type: 'credit',
  category: 'investment',
  amount: 150000,
  paymentMethod: 'online',
  date: new Date(),
  ...over,
});

const makeThresholdRule = (owner, amount, over = {}) =>
  AmlRule.create({
    user: owner._id, name: 'Large Transaction', type: 'threshold',
    severity: 'high', isActive: true, conditions: { amount }, ...over,
  });

describe('screenTransaction — threshold alerts', () => {
  it('raises an alert when a transaction exceeds the rule threshold', async () => {
    const owner = await makeOwner();
    await makeThresholdRule(owner, 100000);
    const tx = await makeTx(owner, { amount: 150000 });

    await screenTransaction(tx, { userId: owner._id });

    const alerts = await AmlAlert.find({ user: owner._id });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].totalAmount).toBe(150000);
    expect(alerts[0].severity).toBe('high');
  });

  it('does not alert when below the threshold', async () => {
    const owner = await makeOwner();
    await makeThresholdRule(owner, 100000);
    const tx = await makeTx(owner, { amount: 50000 });

    await screenTransaction(tx, { userId: owner._id });
    expect(await AmlAlert.countDocuments({ user: owner._id })).toBe(0);
  });

  it('no-ops when the business has no active rules', async () => {
    const owner = await makeOwner();
    const tx = await makeTx(owner, { amount: 9_999_999 });
    await screenTransaction(tx, { userId: owner._id });
    expect(await AmlAlert.countDocuments({ user: owner._id })).toBe(0);
  });
});

describe('screenTransaction — CTR for large cash', () => {
  it('generates a Currency Transaction Report for cash ≥ the CTR threshold', async () => {
    const owner = await makeOwner();
    // A non-firing rule so screening proceeds to the CTR check (screening returns
    // early when there are zero rules).
    await makeThresholdRule(owner, 3_000_000);
    const tx = await makeTx(owner, { amount: 2_500_000, paymentMethod: 'cash' });

    await screenTransaction(tx, { userId: owner._id });

    expect(await CurrencyTransactionReport.countDocuments({ user: owner._id })).toBe(1);
    expect(await AmlAlert.countDocuments({ user: owner._id })).toBe(0); // rule didn't fire
  });
});

describe('calculateComplianceScore', () => {
  it('is 100 with a clean slate', () => {
    expect(calculateComplianceScore({ newAlerts: 0, underReview: 0, escalated: 0, pendingSARs: 0, pendingCTRs: 0 })).toBe(100);
  });

  it('deducts per outstanding item and floors at 0', () => {
    expect(
      calculateComplianceScore({ newAlerts: 2, underReview: 1, escalated: 1, pendingSARs: 1, pendingCTRs: 1 }),
    ).toBe(67); // 100 -10 -2 -8 -10 -3
    expect(
      calculateComplianceScore({ newAlerts: 100, underReview: 0, escalated: 0, pendingSARs: 0, pendingCTRs: 0 }),
    ).toBe(0);
  });
});
