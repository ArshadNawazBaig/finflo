/**
 * expenseCategoryController — create (dedup, regex-injection-safe) and delete
 * (system-protected, ownership-scoped).
 */
const ExpenseCategory = require('../../src/models/ExpenseCategory');
const ecc = require('../../src/controllers/expenseCategoryController');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const req = (owner, over = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin' },
  body: {},
  params: {},
  ...over,
});

describe('createExpenseCategory', () => {
  it('400s without a name', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await ecc.createExpenseCategory(req(owner, { body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a category (lowercased)', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await ecc.createExpenseCategory(req(owner, { body: { name: 'Rent' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('rent');
  });

  it('rejects a case-insensitive duplicate', async () => {
    const owner = await makeOwner();
    await ecc.createExpenseCategory(req(owner, { body: { name: 'Rent' } }), mockRes());
    const res = mockRes();
    await ecc.createExpenseCategory(req(owner, { body: { name: 'RENT' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('treats a regex-special name as a literal (no injection match)', async () => {
    const owner = await makeOwner();
    await ecc.createExpenseCategory(req(owner, { body: { name: 'rent' } }), mockRes());
    // ".*" must NOT be considered a duplicate of "rent" — escapeRegExp guards this.
    const res = mockRes();
    await ecc.createExpenseCategory(req(owner, { body: { name: '.*' } }), res);
    expect(res.statusCode).toBe(201);
  });
});

describe('deleteExpenseCategory', () => {
  it('deletes an owned, non-system category', async () => {
    const owner = await makeOwner();
    const cat = await ExpenseCategory.create({ name: 'travel', user: owner._id, isSystem: false });
    const res = mockRes();
    await ecc.deleteExpenseCategory(req(owner, { params: { id: String(cat._id) } }), res);
    expect(res.statusCode).toBe(200);
    expect(await ExpenseCategory.countDocuments({ _id: cat._id })).toBe(0);
  });

  it('refuses to delete a system category', async () => {
    const owner = await makeOwner();
    const cat = await ExpenseCategory.create({ name: 'salaries', isSystem: true });
    const res = mockRes();
    await ecc.deleteExpenseCategory(req(owner, { params: { id: String(cat._id) } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('403s when deleting another tenant’s category', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const cat = await ExpenseCategory.create({ name: 'misc', user: owner._id, isSystem: false });
    const res = mockRes();
    await ecc.deleteExpenseCategory(req(other, { params: { id: String(cat._id) } }), res);
    expect(res.statusCode).toBe(403);
  });
});
