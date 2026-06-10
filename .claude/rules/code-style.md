# Code style

Conventions that apply across both workspaces. The full reference is `.agent/PROJECT_RULES.md`; this is the short, always-on version.

## Naming

- Components / pages / models: `PascalCase` (`AddLoanModal.jsx`, `Dashboard.jsx`, `Loan.js`).
- Controllers / routes / services / utils: `camelCase` matching the resource (`loanController.js`, `loanRoutes.js`).
- Test files: `<subject>.test.js(x)` in the matching `test/` folder.

## Server controllers

- `async/await` inside `try/catch`. Return `{ message }` on error with the right status (200/201/400/404/500).
- Scope every tenant query by `req.user.effectiveOwnerId` — never `req.user._id` for data reads.
- Validate ownership before mutating; an unowned resource returns **404, not 403** (don't leak existence).
- List endpoints always paginate: `{ data, totalEntries, totalPages, currentPage }`.
- Multi-document money operations use MongoDB sessions/transactions and idempotent patterns; `abortTransaction()` on every early return.

## Models

- Include the `user` tenant ref, `{ timestamps: true }`, enums for fixed-value fields, indexes on queried fields.
- Auto-generated `required` fields go in `pre('validate')`, not `pre('save')`.

## Client

- Functional components + hooks; import via `@/`. Use `@/lib/axios` for requests and `sonner` `toast` for feedback.
- Handle loading + error states explicitly; keep components under ~300 lines.

## Errors & feedback

- Backend: `return res.status(400).json({ message: 'X is required' })`; never throw raw to the client.
- Frontend: `toast.error(error.response?.data?.message || 'Operation failed')`.

## Tests

- Small, single-purpose files organised by folder — never one giant suite.
- Server tests run against a real in-memory replica set (don't mock the DB); client tests use jsdom + Testing Library. Run the suite and report the real result before claiming done.
