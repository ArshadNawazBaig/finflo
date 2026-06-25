/**
 * employeeController — creation (auto id + PII round-trip), tenant isolation,
 * listing, soft-termination, and customer linking.
 */
const Employee = require('../../src/models/Employee');
const {
  createEmployee,
  getEmployees,
  getEmployee,
  terminateEmployee,
  linkCustomer,
} = require('../../src/controllers/employeeController');
const { makeOwner, makeCustomer, uid } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('employeeController.createEmployee', () => {
  it('auto-generates employeeId and round-trips encrypted PII', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, {
      body: { name: 'Asad', cnic: '4210112345671', basicSalary: 80000 },
    });
    const res = mockRes();
    await createEmployee(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.employeeId).toMatch(/^EMP-\d{6}$/);

    // Read back through the model — PII decrypts transparently.
    const fresh = await Employee.findById(res.body._id);
    expect(fresh.cnic).toBe('4210112345671');
    expect(fresh.name).toBe('asad'); // stored lowercase
  });

  it('400s when name or cnic is missing', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await createEmployee(ownerReq(owner, { body: { name: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('employeeController — tenant isolation', () => {
  it("returns 404 when reading another tenant's employee", async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const created = mockRes();
    await createEmployee(
      ownerReq(ownerA, { body: { name: 'A', cnic: `${uid()}` } }),
      created,
    );

    const res = mockRes();
    await getEmployee(
      ownerReq(ownerB, { params: { id: created.body._id } }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('employeeController.getEmployees', () => {
  it('paginates and scopes to the tenant', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    for (let i = 0; i < 3; i++) {
      await createEmployee(
        ownerReq(owner, { body: { name: `e${i}`, cnic: `${uid()}` } }),
        mockRes(),
      );
    }
    await createEmployee(
      ownerReq(other, { body: { name: 'z', cnic: `${uid()}` } }),
      mockRes(),
    );

    const res = mockRes();
    await getEmployees(ownerReq(owner, { query: {} }), res);
    expect(res.body.totalEntries).toBe(3);
    expect(res.body.data).toHaveLength(3);
  });
});

describe('employeeController.terminateEmployee', () => {
  it('soft-terminates (status terminated, not deleted)', async () => {
    const owner = await makeOwner();
    const created = mockRes();
    await createEmployee(
      ownerReq(owner, { body: { name: 'T', cnic: `${uid()}` } }),
      created,
    );

    const res = mockRes();
    await terminateEmployee(
      ownerReq(owner, {
        params: { id: created.body._id },
        body: { reason: 'resigned' },
      }),
      res,
    );
    expect(res.statusCode).toBe(200);

    const fresh = await Employee.findById(created.body._id);
    expect(fresh.status).toBe('terminated');
    expect(fresh.terminationReason).toBe('resigned');
  });
});

describe('employeeController.linkCustomer', () => {
  it('links an owned customer and rejects a foreign one (404)', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const created = mockRes();
    await createEmployee(
      ownerReq(owner, { body: { name: 'L', cnic: `${uid()}` } }),
      created,
    );
    const ownCustomer = await makeCustomer(owner);
    const foreignCustomer = await makeCustomer(other);

    const ok = mockRes();
    await linkCustomer(
      ownerReq(owner, {
        params: { id: created.body._id },
        body: { customerId: ownCustomer._id },
      }),
      ok,
    );
    expect(ok.statusCode).toBe(200);

    const bad = mockRes();
    await linkCustomer(
      ownerReq(owner, {
        params: { id: created.body._id },
        body: { customerId: foreignCustomer._id },
      }),
      bad,
    );
    expect(bad.statusCode).toBe(404);
  });
});
