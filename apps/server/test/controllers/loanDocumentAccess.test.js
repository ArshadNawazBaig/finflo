/**
 * Loan document upload/delete must gate on `effectiveOwnerId` (not `req.user._id`),
 * so branch staff can manage documents on their own branch's loans while other
 * tenants stay locked out. Regression for the `_id`-vs-`effectiveOwnerId` bug that
 * silently 404'd every staff document operation.
 */
const Loan = require('../../src/models/Loan');
const loanController = require('../../src/controllers/loanController');
const {
  makeOwner,
  makeStaff,
  makeBranch,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const reqFor = (user, overrides = {}) => ({
  user,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
  body: {},
  ...overrides,
});

const adminUser = (owner) => ({
  _id: owner._id,
  effectiveOwnerId: owner._id,
  role: 'admin',
  branchId: undefined,
  name: 'Admin',
});

const staffUser = (owner, staff, branchId) => ({
  _id: staff._id,
  effectiveOwnerId: owner._id,
  role: 'staff',
  branchId,
  name: 'Staff',
});

// A loan owned by `owner`, attributed to `branch`, pre-seeded with one document.
const seedLoanWithDoc = async (owner, branch) => {
  const customer = await makeCustomer(owner);
  return makeLoan(owner, customer, {
    branchId: branch._id,
    documents: [{ name: 'cnic', url: 'uploads/cnic.png', type: 'image/png' }],
  });
};

describe('uploadDocument — ownership gate', () => {
  const file = { path: 'uploads/new.png', mimetype: 'image/png', originalname: 'new.png' };

  it('lets branch staff upload to a loan in their branch (was 404 before the fix)', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const staff = await makeStaff(owner, { managedBranchId: branch._id });
    const loan = await seedLoanWithDoc(owner, branch);

    const res = mockRes();
    await loanController.uploadDocument(
      reqFor(staffUser(owner, staff, branch._id), {
        params: { id: String(loan._id) },
        body: { name: 'payslip' },
        file,
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    const fresh = await Loan.findById(loan._id);
    expect(fresh.documents).toHaveLength(2);
  });

  it('lets the owner admin upload to their own loan', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const loan = await seedLoanWithDoc(owner, branch);

    const res = mockRes();
    await loanController.uploadDocument(
      reqFor(adminUser(owner), { params: { id: String(loan._id) }, file }),
      res,
    );

    expect(res.statusCode).toBe(201);
  });

  it('404s for an admin of a different tenant', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const loan = await seedLoanWithDoc(owner, branch);
    const other = await makeOwner();

    const res = mockRes();
    await loanController.uploadDocument(
      reqFor(adminUser(other), { params: { id: String(loan._id) }, file }),
      res,
    );

    expect(res.statusCode).toBe(404);
    const fresh = await Loan.findById(loan._id);
    expect(fresh.documents).toHaveLength(1); // unchanged
  });

  // The per-resource gate is tenant-level, not branch-level: because a staff's
  // effectiveOwnerId already equals the loan owner, any same-tenant staff passes
  // (the branch clause only bites when effectiveOwnerId itself differs). This
  // matches deleteLoan / addRepayment / getLoanById; branch isolation for staff
  // is enforced at list-query time, not here.
  it('allows same-tenant staff even from another branch (gate is tenant-scoped)', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const otherBranch = await makeBranch(owner);
    const staff = await makeStaff(owner, { managedBranchId: otherBranch._id });
    const loan = await seedLoanWithDoc(owner, branch);

    const res = mockRes();
    await loanController.uploadDocument(
      reqFor(staffUser(owner, staff, otherBranch._id), {
        params: { id: String(loan._id) },
        file,
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
  });
});

describe('deleteDocument — ownership gate', () => {
  it('lets branch staff delete a document on a loan in their branch (was 404 before the fix)', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const staff = await makeStaff(owner, { managedBranchId: branch._id });
    const loan = await seedLoanWithDoc(owner, branch);
    const docId = String(loan.documents[0]._id);

    const res = mockRes();
    await loanController.deleteDocument(
      reqFor(staffUser(owner, staff, branch._id), {
        params: { id: String(loan._id), docId },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const fresh = await Loan.findById(loan._id);
    expect(fresh.documents).toHaveLength(0);
  });

  it('404s for an admin of a different tenant and leaves the document intact', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const loan = await seedLoanWithDoc(owner, branch);
    const docId = String(loan.documents[0]._id);
    const other = await makeOwner();

    const res = mockRes();
    await loanController.deleteDocument(
      reqFor(adminUser(other), {
        params: { id: String(loan._id), docId },
      }),
      res,
    );

    expect(res.statusCode).toBe(404);
    const fresh = await Loan.findById(loan._id);
    expect(fresh.documents).toHaveLength(1); // untouched
  });
});
