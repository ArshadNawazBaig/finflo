---
name: scaffold-resource
description: Scaffold a complete tenant-scoped CRUD resource for FinFlo — Mongoose model, controller, routes, central route registration, and a client list page + add/edit modal — all following the project's multi-tenant, paginated conventions. Use when the user asks to add a new entity/resource end-to-end.
---

# Scaffold a new resource

Given a resource name (singular, e.g. `vendor`), generate the full vertical slice. Confirm the resource name and its fields first if not given.

## 1. Model — `apps/server/src/models/<Pascal>.js`

- `user` ref (`ObjectId`, ref `User`, required) for tenant scoping.
- `branchId` ref if the resource is branch-attributable.
- Fields with validation; enums for fixed-value fields; `{ timestamps: true }`.
- Index the fields you'll query (`user`, `branchId`, any search/sort field).
- Any auto-generated required field goes in `pre('validate')`, not `pre('save')`.

## 2. Controller — `apps/server/src/controllers/<camel>Controller.js`

Export `getX` (paginated list), `getXById`, `createX`, `updateX`, `deleteX`.
- Scope every query by `req.user.effectiveOwnerId`.
- List returns `{ data, totalEntries, totalPages, currentPage }` with `page`/`limit`/`search` query params.
- Validate ownership before read/update/delete; unowned → **404**.
- `async/await` in `try/catch`, `{ message }` on error.

## 3. Routes — `apps/server/src/routes/<camel>Routes.js`

`router.route('/')` → GET list + POST create; `router.route('/:id')` → GET/PUT/DELETE. Gate with `protect` + `authorizePermissions('manage_<resource>s', ...)` (or `admin`/`staffOrAdmin`). Custom action routes go before `/:id`.

## 4. Register — `apps/server/src/routes/index.js`

Add `['<resource>s', require('./<camel>Routes')]` to the central table.

## 5. Client — `apps/client/src/pages/admin/<Pascal>s.jsx` + `components/<Pascal>Modal.jsx`

- List page: fetch via `@/lib/axios`, loading/error states, `@/components/ui/Pagination`, search via `TableSearch`, `PageHeader`, `EmptyState`.
- Modal: `{ isOpen, onClose, onSuccess }`, create+edit via `initialData`, submit-button loading state, `sonner` toasts.
- Wire the route into the matching role module in `src/routes`.

## 6. Tests

Add `apps/server/test/controllers/<camel>Controller.test.js` (create validation, ownership 404, pagination) and a focused client test. Run both suites; report results.

Follow `.claude/rules/code-style.md` and `.claude/rules/frontend/react.md` throughout. Mirror an existing similar resource (e.g. `customer`, `expenseCategory`) rather than inventing structure.
