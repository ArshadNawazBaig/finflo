# FinFlo Payroll System — Full-Stack Implementation Plan (v2, corrected)

## Overview

A bank-grade Payroll Management System integrated natively into FinFlo. It reuses the
codebase's existing money, transaction, encryption, tenant-isolation, branch-scoping,
feature-gating, and PDF infrastructure rather than reinventing it.

- **Super Admin control**: toggle payroll on/off per business (tenant).
- **Admin payroll portal**: full employee lifecycle management.
- **Deep integration**: employees optionally link to a `Customer` (lending record) for
  loan-EMI / savings visibility and real settlement.
- **Automated payroll processing**: net pay after deductions (tax, PF, EOBI, loan EMI,
  savings), computed with the money util and persisted transactionally with a ledger trail.
- **Payslips, attendance, leaves, tax, compliance.**

> [!IMPORTANT]
> Payroll is gated by Super Admin **and enforced on the server**. A tenant must be
> explicitly enabled before the API responds, the sidebar shows it, or routes resolve.

---

## Architecture Overview

```
Super Admin → enables payroll for a business
     ↓
User.payrollEnabled = true   (on the User model; surfaced on req.user + userAtom)
     ↓
Server: every /api/payroll* route guarded by  protect → requireFeature('payrollEnabled') → authorizePermissions('manage_payroll')
     ↓
Client: sidebar `condition: (u) => !!u?.payrollEnabled` + RequirePermissions(['manage_payroll'])
     ↓
Employee — optionally linked to a Customer (lending record) for loan/savings
     ↓
Payroll Run (draft) → Approve (lock) → Mark Paid (the ONLY money-movement step:
     transactional, idempotent, ledgered; settles loan EMI via loanRepaymentService)
```

---

## Resolved Design Decisions (were "open questions")

1. **When money moves.** `runPayroll` computes a **draft** (no money). `approve` locks it.
   **`markPaid`** is the only step that moves money — it runs in a single
   `withTransaction`, writes `FinancialTransaction` ledger rows, optionally settles the
   linked loan via `loanRepaymentService.processRepayment(...)`, and is idempotent
   (unique `(user, month, year)` + per-payslip `status` guards).
2. **Money math.** All amounts use [utils/money.js](apps/server/src/utils/money.js)
   (`roundMoney/addMoney/subMoney`) and the Mongoose `moneySetter` on every money field.
   No raw float arithmetic.
3. **Loan-EMI deduction = real settlement.** The withheld EMI actually pays down the
   linked `Customer`'s active loan through `loanRepaymentService.processRepayment(loan,
   emi, req, { session, deductFromWallet: false, notes: 'Payroll deduction' })`. We never
   re-implement the principal/interest split, schedule update, ledger, or credit-score
   refresh. If no linked customer / no active loan, EMI deduction is 0.
4. **PDF.** Generated **client-side** with `jspdf` + `jspdf-autotable`, reusing the branded
   templates in [pdfExportUtils.js](apps/client/src/lib/pdfExportUtils.js). The server has
   **no** HTML→PDF capability (`pdf-parse` is parse-only); there is **no** server PDF route.
   The server returns payslip JSON; the client renders it.
5. **Email delivery.** Best-effort only — `EMAIL_AUTH_ENABLED = false` (SMTP not restored).
   The primary delivery path is client-side PDF download; email is feature-flagged and
   degrades gracefully if SMTP is unavailable.
6. **Currency.** Inherit the existing `User.currency`. Do **not** add a payroll-specific
   currency field (single source of truth).
7. **Tax.** Simplified configurable slab/flat system per business; Pakistan **FBR** slabs as
   the seeded default. EOBI is a fixed contribution tied to minimum wage (configurable),
   not a flat percentage.
8. **Branch scoping.** `Employee`, `PayrollRun`, `Payslip` carry `branchId`; staff/branch
   managers are narrowed by `req.user.managedBranchId`; branch delete/reassign cascades to
   these collections (same pattern as `deleteBranch` / `updateMember`).
9. **Attendance/leaves.** Manual entry for v1 (biometric is v2).

---

## Proposed Changes

### 1. Backend — Database Models

All tenant-scoped models include: `user` ref (`ObjectId`, ref `User`, required),
`branchId` (`ObjectId`, ref `Branch`), `{ timestamps: true }`, enums for fixed-value
fields, indexes on queried fields, and `applyMoneySetter(schema, [...moneyPaths])` on
every money field.

#### [NEW] `models/Employee.js`
The payroll equivalent of `Member.js`.

- `user`, `branchId`
- `employeeId` — auto-generated in **`pre('validate')`** (e.g. `EMP-000001`), unique per `user`
- `name`, `email`, `phone`, `cnic`, `address`, `dob`, `profileImage`
- `department`, `designation`, `employmentType` (enum: full-time/part-time/contract)
- `joiningDate`, `probationEndDate`, `terminationDate`, `terminationReason`
- `status` (enum: active/on-leave/probation/terminated)
- **Salary structure** (money fields → `moneySetter`): `basicSalary`, `houseRentAllowance`,
  `medicalAllowance`, `transportAllowance`, `otherAllowances: [{ label, amount }]`
- **Tax/contrib config**: `taxSlabType` (flat/slab), `taxRate`, `providentFundEnabled`,
  `providentFundRate`, `eobiEnabled`
- **Bank info**: `bankName`, `bankAccountNumber`, `bankBranch`
- **Linked lending record** (optional): `linkedCustomer` — `ObjectId` ref `Customer`
  (loans/savings hang off `Customer`, **not** `Member`). Optional `linkedMember` only if a
  portal identity is needed.
- `documents: [...]`
- **Encryption (at rest)** — mirror `Member`'s hooks exactly:
  - `pre('save')`: `encryptFields(this, ['cnic','phone','address','bankAccountNumber'], ['cnicHash', null, null, 'bankAccountNumberHash'])`
  - `post('find'|'findOne'|'findById'|'save')`: `decryptFields(...)`
  - companion `cnicHash`, `bankAccountNumberHash` (indexed) for searchable lookup
  - **Do not encrypt salary/allowance fields** — reports aggregate (`$sum`) on them.
- **Indexes**: `{ user: 1, employeeId: 1 }` unique; `{ user: 1, branchId: 1 }`;
  `{ user: 1, status: 1 }`; `{ user: 1, cnicHash: 1 }`.

#### [NEW] `models/PayrollRun.js`
One month's processing for all active employees.

- `user`, `branchId`, `month`, `year`
- `status` (enum: draft/approved/paid/cancelled)
- `runDate`, `approvedBy`, `approvedAt`, `paidAt`, `paymentMethod`
- `totalGross`, `totalDeductions`, `totalNet`, `employeeCount` (money fields → `moneySetter`)
- **Index**: unique `{ user: 1, month: 1, year: 1 }` (idempotency: a month can't be run twice).

#### [NEW] `models/Payslip.js`
One payslip per employee per run.

- `user`, `branchId`, `employee`, `payrollRun`, `month`, `year`
- `earnings: { basic, hra, medical, transport, otherAllowances, overtime }` (money)
- `deductions: { tax, providentFund, eobi, loanEMI, savingsContribution, otherDeductions }` (money)
- `gross`, `totalDeductions`, `netPay` (money)
- `status` (enum: draft/approved/paid)
- `paidAt`, `paymentMethod` (enum: bank/cash/cheque), `remarks`
- `loanRepaymentRef` — `ObjectId` ref `Repayment` (set when EMI is actually settled)
- **Index**: unique `{ employee: 1, payrollRun: 1 }` (one payslip per employee per run).

#### [NEW] `models/LeaveRecord.js`
- `user`, `branchId`, `employee`
- `type` (enum: annual/sick/casual/unpaid/maternity/paternity)
- `startDate`, `endDate`, `totalDays`, `reason`
- `status` (enum: pending/approved/rejected), `approvedBy`, `remarks`
- `leaveBalanceSnapshot`
- **Index**: `{ user: 1, employee: 1, status: 1 }`.

#### [NEW] `models/AttendanceRecord.js`
- `user`, `branchId`, `employee`, `date`
- `status` (enum: present/absent/late/half-day/holiday/leave)
- `checkIn`, `checkOut`, `hoursWorked`, `overtime`, `notes`
- **Index**: unique `{ user: 1, employee: 1, date: 1 }` (no duplicate attendance per day).

---

### 2. Backend — Model Modifications

#### [MODIFY] [User.js](apps/server/src/models/User.js)
```js
payrollEnabled: { type: Boolean, default: false }
payrollSettings: {
  workingDaysPerMonth: { type: Number, default: 26 },
  standardWorkHours:   { type: Number, default: 8 },
  defaultTaxSlabType:  { type: String, enum: ['flat', 'slab'], default: 'slab' },
  taxSlabs: [{ min: Number, max: Number, rate: Number }], // seeded FBR defaults
  providentFundRate:   { type: Number, default: 8.33 },   // % of basic
  eobiEnabled:         { type: Boolean, default: true },
  eobiAmount:          { type: Number, default: 250 },     // fixed contribution, configurable
  payrollDay:          { type: Number, default: 25 },
  leaveSettings: {
    annualLeave: { type: Number, default: 14 },
    sickLeave:   { type: Number, default: 10 },
    casualLeave: { type: Number, default: 10 },
  }
}
// NOTE: no `currency` here — use the existing top-level User.currency.
```
Also add `'manage_payroll'` to the admin fallback permissions list in `User.getPermissions()`
so role-based gating works (and custom roles can grant/deny it).

> `SystemSettings.js` — no change (the toggle lives on `User`).

---

### 3. Backend — Services (money logic lives here, NOT controllers)

#### [NEW] `services/payrollService.js`
- `computePayslip(employee, settings)` → pure calc using `addMoney/subMoney/roundMoney`:
  ```
  gross      = addMoney(basic, hra, medical, transport, ...otherAllowances, overtime)
  tax        = roundMoney(taxFromSlabs(annualize(gross), settings) / 12)
  pf         = employee.providentFundEnabled ? roundMoney(basic * pfRate / 100) : 0
  eobi       = employee.eobiEnabled ? settings.eobiAmount : 0
  emi        = linkedActiveLoan ? linkedActiveLoan.emi : 0
  savings    = configured savings contribution (0 if none)
  deductions = addMoney(tax, pf, eobi, emi, savings, otherDeductions)
  netPay     = subMoney(gross, deductions)            // clamp ≥ 0, flag if deductions > gross
  ```
- `runPayroll(req, month, year)` → creates a **draft** `PayrollRun` + draft `Payslip`s for
  every active employee (no money moves). Guarded by the unique `(user, month, year)` index;
  re-running returns the existing draft.
- `approvePayrollRun(req, runId)` → `draft → approved`, locks edits, stamps `approvedBy`.
- `markPayrollPaid(req, runId)` → **the only money-movement step**, in one
  `withTransaction(session => { ... })`:
  - For each `approved` payslip not already `paid`:
    - if `loanEMI > 0` and a linked active loan exists →
      `processRepayment(loan, emi, req, { session, deductFromWallet: false, notes: 'Payroll deduction' })`;
      store `loanRepaymentRef`.
    - write `FinancialTransaction { user, branchId, type: 'expense', category: 'payroll', amount: netPay, referenceModel: 'Payslip', referenceId: payslip._id }`.
    - if tax/EOBI withheld → optional `FinancialTransaction` withholding rows.
    - `payslip.status = 'paid'`, `payslip.paidAt = now`.
  - `payrollRun.status = 'paid'`, totals finalised.
  - `abortTransaction()` on **every** early return / error path.
  - Idempotent: payslips already `paid` are skipped; safe to retry.
- `ActivityLog` entries for run/approve/pay.

> Savings-contribution deductions that actually move money into a savings account must go
> through the existing savings service inside the same session — never write balances directly.

---

### 4. Backend — Controllers (thin; delegate to services)

#### [NEW] `controllers/payrollController.js`
`getPayrollDashboard`, `runPayroll`, `getPayrollRuns` (paginated),
`getPayrollRunDetail` (paginated payslips), `approvePayrollRun`, `markPayrollPaid`,
`getPayslip` (JSON for client-side PDF). All scoped by `req.user.effectiveOwnerId`;
unowned → **404**.

#### [NEW] `controllers/employeeController.js`
`createEmployee` (image upload + salary setup), `getEmployees` (paginated, filterable),
`getEmployee` (profile; linked-`Customer` loans/savings read **scoped by effectiveOwnerId**,
404 if unowned), `updateEmployee`, `terminateEmployee` (soft — sets `status: 'terminated'`,
`terminationReason`, excluded from future runs, payslips retained),
`getEmployeePayslips`, `linkCustomer` / `unlinkCustomer`.

#### [NEW] `controllers/leaveController.js`
`createLeaveRequest`, `getLeaveRequests` (paginated), `approveLeave`, `rejectLeave`,
`getLeaveBalance`.

#### [NEW] `controllers/attendanceController.js`
`markAttendance` (upsert on the unique key), `getAttendance` (paginated),
`bulkMarkAttendance`, `getAttendanceSummary`.

---

### 5. Backend — Middleware

#### [NEW] `requireFeature(flag)` in [authMiddleware.js](apps/server/src/middleware/authMiddleware.js)
```js
const requireFeature = (flag) => (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  if (req.user?.[flag]) return next();
  return res.status(403).json({ message: 'This feature is not enabled for your account.' });
};
module.exports = { ...exports, requireFeature };
```
Applied to **every** payroll route. (No such gate exists today — client guards alone are
insufficient.)

---

### 6. Backend — Routes

Each route chain: `protect → requireFeature('payrollEnabled') → authorizePermissions('manage_payroll') → handler`.
Custom-action routes go **before** `/:id`. All list endpoints paginate.

#### [NEW] `payrollRoutes.js`
```
GET  /payroll/dashboard
POST /payroll/run
GET  /payroll/runs
GET  /payroll/runs/:id
POST /payroll/runs/:id/approve
POST /payroll/runs/:id/mark-paid
GET  /payroll/payslips/:payslipId        # JSON; client renders the PDF (NO server PDF route)
```

#### [NEW] `employeeRoutes.js`
```
GET    /employees
POST   /employees
GET    /employees/:id
PUT    /employees/:id
DELETE /employees/:id                     # soft terminate
GET    /employees/:id/payslips
POST   /employees/:id/link-customer
DELETE /employees/:id/unlink-customer
```

#### [NEW] `leaveRoutes.js`
```
GET  /leaves
POST /leaves
PUT  /leaves/:id/approve
PUT  /leaves/:id/reject
GET  /leaves/balance/:employeeId
```

#### [NEW] `attendanceRoutes.js`
```
GET  /attendance
POST /attendance
POST /attendance/bulk
GET  /attendance/summary/:employeeId
```

#### [MODIFY] [routes/index.js](apps/server/src/routes/index.js)
Register the 4 route files in the central `[path, module]` table.

#### [MODIFY] branch cascade
Add `Employee`, `PayrollRun`, `Payslip` to the `branchId` cascade in `deleteBranch` and the
`updateMember`-style reassignment, so per-branch payroll analytics don't silently read 0.

---

### 7. Backend — Super Admin

#### [MODIFY] [superAdminController.js](apps/server/src/controllers/superAdminController.js)
- `togglePayroll(userId, enabled)` → sets `user.payrollEnabled` (or fold into the existing
  `updateUser` plan-update handler).
- `getPayrollStats` → aggregate payroll across tenants.

#### [MODIFY] [superAdminRoutes.js](apps/server/src/routes/superAdminRoutes.js)
```
POST /super-admin/users/:id/toggle-payroll
GET  /super-admin/payroll-stats
```

---

### 8. Frontend — Super Admin Panel

#### [MODIFY] [UserDetail.jsx](apps/client/src/pages/superadmin/UserDetail.jsx)
A **"Feature Flags"** card: a "Payroll System" toggle → `POST /super-admin/users/:id/toggle-payroll`,
sonner feedback. After success, the tenant's next login carries `payrollEnabled`.

---

### 9. Frontend — Sidebar

#### [MODIFY] [sidebarConfig.js](apps/client/src/config/sidebarConfig.js)
A "Payroll" category, visible only when enabled **and** permitted (matches the existing
`condition` + `permissions` pattern):
```js
{
  category: 'Payroll',
  condition: (user) => !!user?.payrollEnabled,   // truthy check (default is false)
  permissions: ['manage_payroll'],
  items: [
    { to: '/payroll',            icon: Briefcase,      label: 'Payroll Dashboard' },
    { to: '/payroll/employees',  icon: Users,          label: 'Employees' },
    { to: '/payroll/runs',       icon: PlayCircle,     label: 'Pay Runs' },
    { to: '/payroll/leaves',     icon: CalendarOff,    label: 'Leaves' },
    { to: '/payroll/attendance', icon: ClipboardCheck, label: 'Attendance' },
  ],
}
```

---

### 10. Frontend — Admin Payroll Pages

Existing design language: glass cards, `Plus Jakarta Sans`, indigo primary, dark/light,
`animate-in fade-in`. Skeletons (not spinners) for loading. Reuse `@/components/ui`
primitives (`DataTable`, `ModalShell`, `FormField`, `StatusBadge`, `PageHeader`,
`SensitiveData`). All money via `formatCurrency`.

- [NEW] `pages/admin/payroll/PayrollDashboard.jsx`
- [NEW] `pages/admin/payroll/Employees.jsx`
- [NEW] `pages/admin/payroll/EmployeeProfile.jsx` — tabs: Overview / Salary / Payslips /
  Leaves / Attendance / **Linked Account** (read-only loans + savings from the lending side)
- [NEW] `pages/admin/payroll/PayrollRuns.jsx`
- [NEW] `pages/admin/payroll/PayrollRunDetail.jsx`
- [NEW] `pages/admin/payroll/Leaves.jsx`
- [NEW] `pages/admin/payroll/Attendance.jsx`
- [NEW] `components/payroll/AddEmployeeModal.jsx` — 5-step (Personal / Employment / Salary /
  Bank / Link Customer); `bankAccountNumber` + `cnic` via `SensitiveData`.
- [NEW] `components/payroll/PayslipCard.jsx`
- [NEW] `components/payroll/PayslipPDFPreview.jsx` — renders via `jspdf` + `pdfExportUtils`
  branding (client-side; the server never sends a PDF).

---

### 11. Frontend — Routes

#### [MODIFY] [AdminRoutes.jsx](apps/client/src/routes/AdminRoutes.jsx)
Wrap payroll routes with the existing permission guard (no new guard needed):
```jsx
<Route element={<RequirePermissions permissions={['manage_payroll']} />}>
  <Route path="/payroll"                element={<PayrollDashboard />} />
  <Route path="/payroll/employees"      element={<Employees />} />
  <Route path="/payroll/employees/:id"  element={<EmployeeProfile />} />
  <Route path="/payroll/runs"           element={<PayrollRuns />} />
  <Route path="/payroll/runs/:id"       element={<PayrollRunDetail />} />
  <Route path="/payroll/leaves"         element={<Leaves />} />
  <Route path="/payroll/attendance"     element={<Attendance />} />
</Route>
```
The server's `requireFeature` gate is the real enforcement; the client guard is UX only.
(No separate `RequirePayroll` component — `RequirePermissions` + sidebar condition suffice.)

---

### 12. Frontend — Atoms

`userAtom` already carries the user object; `payrollEnabled` flows in automatically once the
backend includes it in the login/`/auth/me` response. After a super-admin toggle, the tenant
re-reads on next login (or via the existing `userUpdated` event if self-refreshed).

---

## Verification Plan

### Server (Vitest, real in-memory replica set — don't mock the DB)
- Employee CRUD: create (verify `employeeId` from `pre('validate')`, encrypted `cnic`/`bankAccountNumber` at rest, decrypted on read), tenant isolation (other owner → 404), 400 validation.
- `runPayroll`: draft payslip math (`gross`/deductions/`netPay`) via the money util; re-run is idempotent (unique `(user, month, year)`).
- `markPayrollPaid`: money rollback on forced failure (no partial pay, no leaked transaction); idempotent retry; loan EMI actually settles via `processRepayment` (Repayment + ledger rows written); `FinancialTransaction` payroll-expense row exists.
  - Gotcha: pre-create collections/indexes in `beforeAll` for any service that opens its own transaction (mongodb-memory-server `catalog changes`).
- `requireFeature`: tenant with `payrollEnabled: false` → 403; super_admin bypass.
- Branch cascade: deleting a branch re-homes `Employee`/`PayrollRun`/`Payslip`.

### Client (Vitest + Testing Library, jsdom)
- Sidebar hidden when `payrollEnabled` falsy; visible + permitted when true (`atomValues`).
- AddEmployeeModal 5-step flow; payslip PDF renders via jsPDF mock.

### Manual
- Super-admin toggle flips the sidebar for the tenant.
- Direct `curl /api/payroll/dashboard` on a non-enabled tenant → 403.
- Full run → approve → mark-paid; linked-account tab shows loans/savings read-only.

Run `npm run test` (both workspaces) and report the real result.

---

## File Count Summary (updated)

| Layer | New | Modified |
|-------|-----|----------|
| Backend Models | 5 | 2 (`User`, branch cascade) |
| Backend Services | 1 (`payrollService`) | 1 (savings/loan integration touchpoints) |
| Backend Controllers | 4 | 1 (`superAdmin`) |
| Backend Middleware | 0 | 1 (`authMiddleware` → `requireFeature`) |
| Backend Routes | 4 | 2 (`index`, `superAdminRoutes`) |
| Frontend Pages | 7 | 2 (`UserDetail`, `AdminRoutes`) |
| Frontend Components | 3 | 2 (`sidebarConfig`, atoms auto) |
| **Total** | **24** | **11** |

> Removed from v1: the server-side PDF route/controller method (no server PDF capability)
> and the standalone `RequirePayroll` guard (folded into `RequirePermissions` + sidebar).
> Added: `payrollService`, `requireFeature` middleware, Employee encryption, branch cascade.
