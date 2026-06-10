# Backend (Express/Mongoose) rules

Applies to `apps/server`. Express 5 + Mongoose 9 + MongoDB Atlas, multi-tenant. Full reference: `.agent/PROJECT_RULES.md`.

## Controller

```js
const Model = require('../models/Model');

// @desc   Action description
// @route  POST /api/resource
// @access Private
const createResource = async (req, res) => {
  try {
    const { field } = req.body;
    if (!field) return res.status(400).json({ message: 'field is required' });

    const doc = await Model.create({ ...req.body, user: req.user.effectiveOwnerId });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = { createResource };
```

- `async/await` in `try/catch`; `{ message }` on error; status 200/201/400/404/500.
- **Scope every tenant query by `req.user.effectiveOwnerId`** (admin = own id, staff = their `ownerId`). Never `req.user._id` for data reads. Branch managers narrow further by `req.user.managedBranchId`.
- Validate ownership before read/update/delete; an unowned resource returns **404, not 403** (don't leak existence).
- `protect` = users, `protectMember` = end-customers. `req.member.user` is the owning business.

## Pagination (all list endpoints)

```js
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const totalEntries = await Model.countDocuments(query);
const data = await Model.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
res.json({ data, totalEntries, totalPages: Math.ceil(totalEntries / limit), currentPage: page });
```

## Money & transactions

- Anything touching balances, repayments, distributions, transfers, or writing >1 document runs in a MongoDB session/transaction (`startSession` / `withTransaction`).
- Make it idempotent: `findOneAndUpdate` with a guard filter, `$inc`, `ProcessedWebhookEvent` dedup.
- Call `abortTransaction()` on **every** early-return / error path inside a transaction — a leaked open transaction holds locks (real bug we've hit).
- Write a `FinancialTransaction` ledger row for auditable money movement; `ActivityLog` for user actions.
- Money logic belongs in `src/services/`, not controllers.

## Branch / owner attribution

A `branchId` mutation or branch deletion must cascade to every dependent collection — Member, Customer, Loan, FinancialTransaction, Investment — or per-branch analytics silently read 0. See `updateMember` / `deleteBranch` for the cascade pattern.

## Models

- `user` ref (`ObjectId`, ref `User`, required) on every tenant-scoped model; `{ timestamps: true }`; enums for fixed-value fields; index queried fields.
- Auto-generated `required` fields go in `pre('validate')`, NOT `pre('save')` (save runs after validation → field missing → validation fails).
- Encrypt sensitive Member fields via `utils/encryption.js` (`encryptFields` / `decryptFields`).

## Routing & authorization

- Register routes in the central `[path, module]` table in `src/routes/index.js`.
- Group with `router.route('/')` and `router.route('/:id')`; custom-action routes go **before** `/:id`.
- Gate with `authorizePermissions('manage_x', ...)` (`'*'` / `super_admin` bypass) or the coarser `admin` / `staffOrAdmin`.
- The Stripe webhook route mounts before `express.json()` (needs the raw body). Rate limiters are applied per-path in `index.js`.

## Scheduled jobs

`node-cron` jobs live in `scheduledTasksService.js` / `reminderService.js`, all in `Asia/Karachi`, started once after DB connect via `initScheduledTasks()` / `initFinanceFlow()`.

## Tests

Add focused Vitest files under `apps/server/test/` against the real in-memory replica set (don't mock the DB). Use `helpers/` factories + `mockRes`/`ownerReq`. Cover happy path, 400 validation, tenant isolation (other owner → 404), and money rollback. Run `npm run test --workspace=apps/server` and report the real result.
