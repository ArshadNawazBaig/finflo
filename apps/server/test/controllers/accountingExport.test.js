/**
 * Tests for the accounting-export controller — verifies tenant scoping, that
 * reversed/failed rows are excluded, date filtering, and the CSV response shape.
 * Runs against the real in-memory replica set.
 */
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { exportAccounting } = require('../../src/controllers/accountingExportController');
const { makeOwner } = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

const exportRes = () => {
  const r = { statusCode: 200, headers: {}, body: undefined };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
};

const seedTx = (owner, over = {}) =>
  FinancialTransaction.create({
    user: owner._id,
    type: 'income',
    category: 'repayment',
    amount: 1000,
    date: new Date('2026-01-15'),
    description: 'Repayment',
    status: 'Completed',
    ...over,
  });

describe('exportAccounting', () => {
  it('returns a tenant-scoped CSV with the right headers', async () => {
    const owner = await makeOwner();
    await seedTx(owner, { amount: 1500, description: 'AAA repayment' });
    await seedTx(owner, { type: 'expense', category: 'rent', amount: 500, description: 'BBB rent' });

    const req = ownerReq(owner, { query: { format: 'generic' } });
    const res = exportRes();
    await exportAccounting(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toMatch(/text\/csv/);
    expect(res.headers['Content-Disposition']).toMatch(/accounting-export-generic-.*\.csv/);
    expect(res.body).toContain('AAA repayment');
    expect(res.body).toContain('BBB rent');
  });

  it('excludes another tenant\'s rows', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await seedTx(ownerA, { description: 'MINE repayment' });
    await seedTx(ownerB, { description: 'THEIRS repayment' });

    const req = ownerReq(ownerA, { query: { format: 'generic' } });
    const res = exportRes();
    await exportAccounting(req, res);

    expect(res.body).toContain('MINE repayment');
    expect(res.body).not.toContain('THEIRS repayment');
  });

  it('excludes reversed/failed transactions', async () => {
    const owner = await makeOwner();
    await seedTx(owner, { description: 'SETTLED row' });
    await seedTx(owner, { description: 'REVERSED row', status: 'Reversed' });
    await seedTx(owner, { description: 'FAILED row', status: 'Failed' });

    const req = ownerReq(owner, { query: { format: 'quickbooks' } });
    const res = exportRes();
    await exportAccounting(req, res);

    expect(res.body).toContain('SETTLED row');
    expect(res.body).not.toContain('REVERSED row');
    expect(res.body).not.toContain('FAILED row');
  });

  it('filters by date range', async () => {
    const owner = await makeOwner();
    await seedTx(owner, { description: 'IN range', date: new Date('2026-03-10') });
    await seedTx(owner, { description: 'OUT of range', date: new Date('2026-01-10') });

    const req = ownerReq(owner, {
      query: { format: 'generic', startDate: '2026-03-01', endDate: '2026-03-31' },
    });
    const res = exportRes();
    await exportAccounting(req, res);

    expect(res.body).toContain('IN range');
    expect(res.body).not.toContain('OUT of range');
  });

  it('rejects an invalid format with 400', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, { query: { format: 'bogus' } });
    const res = exportRes();
    await exportAccounting(req, res);
    expect(res.statusCode).toBe(400);
  });
});
