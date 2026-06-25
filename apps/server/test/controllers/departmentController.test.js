/**
 * departmentController — create/list/rename/delete with tenant isolation, the
 * unique-name guard, rename cascade to employees, and the delete-in-use guard.
 */
const Department = require('../../src/models/Department');
const Employee = require('../../src/models/Employee');
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../../src/controllers/departmentController');
const { makeOwner, uid } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const makeEmployee = (owner, overrides = {}) =>
  Employee.create({
    user: owner._id,
    name: `emp ${uid()}`,
    cnic: `${uid()}`,
    basicSalary: 50000,
    ...overrides,
  });

describe('departmentController.createDepartment', () => {
  it('creates a department and rejects a duplicate name (400)', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await createDepartment(ownerReq(owner, { body: { name: 'Engineering' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Engineering');

    const dup = mockRes();
    await createDepartment(ownerReq(owner, { body: { name: 'Engineering' } }), dup);
    expect(dup.statusCode).toBe(400);
  });

  it('400s without a name', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await createDepartment(ownerReq(owner, { body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('departmentController.getDepartments', () => {
  it('lists tenant departments with a live employee count', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    await Department.create({ user: owner._id, name: 'Sales' });
    await Department.create({ user: owner._id, name: 'HR' });
    await Department.create({ user: other._id, name: 'Foreign' });
    await makeEmployee(owner, { department: 'Sales' });
    await makeEmployee(owner, { department: 'Sales' });

    const res = mockRes();
    await getDepartments(ownerReq(owner, { query: {} }), res);
    expect(res.body.totalEntries).toBe(2); // tenant-scoped
    const sales = res.body.data.find((d) => d.name === 'Sales');
    expect(sales.employeeCount).toBe(2);
  });
});

describe('departmentController.updateDepartment', () => {
  it('renames and cascades the new name to employees', async () => {
    const owner = await makeOwner();
    const dep = await Department.create({ user: owner._id, name: 'Ops' });
    await makeEmployee(owner, { department: 'Ops' });

    const res = mockRes();
    await updateDepartment(
      ownerReq(owner, { params: { id: dep._id }, body: { name: 'Operations' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Operations');

    const moved = await Employee.countDocuments({ user: owner._id, department: 'Operations' });
    expect(moved).toBe(1);
  });

  it("404s when renaming another tenant's department", async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const dep = await Department.create({ user: owner._id, name: 'Finance' });
    const res = mockRes();
    await updateDepartment(
      ownerReq(other, { params: { id: dep._id }, body: { name: 'X' } }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('departmentController.deleteDepartment', () => {
  it('blocks deletion while active employees reference it', async () => {
    const owner = await makeOwner();
    const dep = await Department.create({ user: owner._id, name: 'Support' });
    await makeEmployee(owner, { department: 'Support' });

    const res = mockRes();
    await deleteDepartment(ownerReq(owner, { params: { id: dep._id } }), res);
    expect(res.statusCode).toBe(400);
    expect(await Department.countDocuments({ _id: dep._id })).toBe(1);
  });

  it('deletes an unused department', async () => {
    const owner = await makeOwner();
    const dep = await Department.create({ user: owner._id, name: 'Empty' });
    const res = mockRes();
    await deleteDepartment(ownerReq(owner, { params: { id: dep._id } }), res);
    expect(res.statusCode).toBe(200);
    expect(await Department.countDocuments({ _id: dep._id })).toBe(0);
  });
});
