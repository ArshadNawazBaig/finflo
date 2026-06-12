/**
 * Tests for the entity/schedule exports (loans receivable, member balances,
 * customers) — tenant scoping, columns, and the invalid-type guard.
 */
const { exportEntities } = require('../../src/controllers/accountingExportController');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

const exportRes = () => {
  const r = { statusCode: 200, headers: {}, body: undefined };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
};

describe('exportEntities — loans (receivables)', () => {
  it('exports outstanding loans scoped to the tenant', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const custA = await makeCustomer(ownerA, { name: 'alpha borrower' });
    await makeLoan(ownerA, custA, { remainingAmount: 50000, status: 'active' });
    const custB = await makeCustomer(ownerB, { name: 'beta borrower' });
    await makeLoan(ownerB, custB, { status: 'active' });

    const req = ownerReq(ownerA, { query: { type: 'loans' } });
    const res = exportRes();
    await exportEntities(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Disposition']).toMatch(/loans-.*\.csv/);
    expect(res.body).toContain('alpha borrower');
    expect(res.body).toContain('50000.00'); // outstanding, 2 dp
    expect(res.body).not.toContain('beta borrower');
    expect(res.body.split('\n')[0]).toContain('Outstanding'); // header
  });

  it('omits non-outstanding (completed) loans', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'gamma borrower' });
    await makeLoan(owner, cust, { status: 'completed' });

    const req = ownerReq(owner, { query: { type: 'loans' } });
    const res = exportRes();
    await exportEntities(req, res);
    expect(res.body).not.toContain('gamma borrower');
  });
});

describe('exportEntities — members (liabilities)', () => {
  it('exports member balances scoped to the tenant', async () => {
    const owner = await makeOwner();
    await makeMember(owner, { name: 'saver one', savingBalance: 12345.5 });

    const req = ownerReq(owner, { query: { type: 'members' } });
    const res = exportRes();
    await exportEntities(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('saver one');
    expect(res.body).toContain('12345.50');
    expect(res.body.split('\n')[0]).toContain('SavingBalance');
  });
});

describe('exportEntities — customers', () => {
  it('exports customers with decrypted CNIC and loan totals', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'kyc customer', cnic: '4210112345671' });
    await makeLoan(owner, cust, { principal: 80000, remainingAmount: 30000, status: 'active' });

    const req = ownerReq(owner, { query: { type: 'customers' } });
    const res = exportRes();
    await exportEntities(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('kyc customer');
    expect(res.body).toContain('4210112345671'); // CNIC decrypted, not ciphertext
    expect(res.body).toContain('80000.00'); // total borrowed
    expect(res.body).toContain('30000.00'); // outstanding
  });
});

describe('exportEntities — validation', () => {
  it('rejects an invalid type with 400', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, { query: { type: 'bogus' } });
    const res = exportRes();
    await exportEntities(req, res);
    expect(res.statusCode).toBe(400);
  });
});
