# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FinFlo is a multi-tenant Finance Management SaaS for lending institutions — it covers the full loan lifecycle (onboarding, issuance, repayment, late fees, profit distribution) plus savings, term deposits, transfers, KYC, AML, and white-label branding. A single Express service serves both the JSON API and the built React SPA in production.

## Monorepo layout

npm workspaces with two apps:
- [apps/server](apps/server) — Node.js / Express 5 + Mongoose 9 (MongoDB Atlas). Entry: [apps/server/src/index.js](apps/server/src/index.js).
- [apps/client](apps/client) — React 18 + Vite. Entry: [apps/client/src/main.jsx](apps/client/src/main.jsx) → [apps/client/src/App.jsx](apps/client/src/App.jsx).

The same client build is also packaged as **two Capacitor mobile apps** (member + business) from one codebase, selected at runtime by `APP_MODE`.

## Commands

Run from the repo root unless noted.

```bash
npm install                 # install all workspace deps
npm run dev                 # server (:5001) + client (:5174) concurrently
npm run build               # build client → moves apps/client/dist to repo-root /public (served by the server)
npm run test                # runs test script in each workspace (none defined yet)
```

Server only ([apps/server](apps/server)):
```bash
npm run dev --workspace=apps/server     # nodemon src/index.js
npm run start --workspace=apps/server   # node src/index.js
```

Client only ([apps/client](apps/client)):
```bash
npm run dev --workspace=apps/client     # vite dev server (proxies /api, /socket.io, /uploads, /downloads → :5001)
npm run lint --workspace=apps/client    # eslint, --max-warnings 0
npm run dev:member / dev:business       # run client in a specific APP_MODE
npm run build:member / build:business   # build + swap in the matching capacitor.config.json
```

Mobile (from [apps/client](apps/client)): rebuild web assets, then `npx cap sync`, then `npx cap open ios|android`.

There is **no test runner configured** and there are no automated tests — `npm run test` is a no-op. Verify changes by running the app.

## Deployment topology

- **Production runs as a single service**: the Express server statically serves the built SPA from repo-root `/public` (see the bottom of [index.js](apps/server/src/index.js)). Anything not under `/api`, `/socket.io`, or `/uploads` falls back to `index.html` for React Router. `vercel.json` and [api/index.js](api/index.js) mirror this for Vercel.
- Docker: [docker-compose.yml](docker-compose.yml) builds separate `server` (:5001) and `client` (nginx, :5174→80) images under the `arshadnawazbaig` Docker Hub registry.
- Server config comes from `apps/server/.env` (see README for the full variable list). **Startup hard-fails** if `JWT_SECRET` (<32 chars / known-weak) or `MONGO_URI` are missing.

## Architecture essentials

### Multi-tenancy (critical)
Every tenant is a business owner = a `User` with `role: 'admin'`. All tenant-scoped data references its owner. Staff are `User`s with `role: 'staff'` and an `ownerId` pointing at their admin. The auth middleware sets **`req.user.effectiveOwnerId`** = `req.user._id` for admins, `req.user.ownerId` for staff — **always scope queries by the effective owner** to preserve tenant isolation. Branch managers are further narrowed by `managedBranchId` (cached on the User doc to avoid a per-request Branch lookup).

### Two separate identity systems
- **Users** (business side: super_admin / admin / staff) — [authMiddleware.js](apps/server/src/middleware/authMiddleware.js), `protect`. Routes under `/api/auth`.
- **Members** (end-customer portal) — [memberAuthMiddleware.js](apps/server/src/middleware/memberAuthMiddleware.js), `protectMember`. Routes under `/api/member-auth`. `req.member.user` is the owning business.

JWTs carry a `type` claim (`user` / `member` / pin / 2fa-pending); each middleware rejects tokens of the wrong type. Tokens arrive via `Authorization: Bearer` (mobile) or the `token` cookie (web).

### Authorization
Role-based via `Role` documents with a `permissions` array. `req.user.getPermissions()` resolves them (with a legacy hardcoded fallback per role). Gate routes with `authorizePermissions('manage_loans', ...)`; `'*'` and `super_admin` bypass all checks. Coarser helpers `admin` and `staffOrAdmin` also exist.

### Routing
All API routes are registered centrally in [apps/server/src/routes/index.js](apps/server/src/routes/index.js) (a `[path, module]` table mounted under `/api`). The webhook route is mounted **before** `express.json()` in [index.js](apps/server/src/index.js) because Stripe needs the raw body. Rate limiters (auth/otp/signup/generic) are applied per-path in `index.js` and skip OPTIONS preflights.

### Financial engine
Money flows live in [apps/server/src/services](apps/server/src/services) (`loanRepaymentService`, `lateFeeService`, `payoutService`, `creditLimitService`, etc.), not in controllers. Multi-document money operations use **MongoDB sessions/transactions** (`startSession` / `withTransaction`) and idempotent patterns (`findOneAndUpdate`, `$inc`, `ProcessedWebhookEvent` dedup) — preserve these when touching balances, repayments, distributions, or transfers. `FinancialTransaction` is the audit ledger; `ActivityLog` records user actions.

### Scheduled jobs
[scheduledTasksService.js](apps/server/src/services/scheduledTasksService.js) and [reminderService.js](apps/server/src/services/reminderService.js) register `node-cron` jobs (overdue downgrade, late-fee accrual, saving-profit accrual/distribution, default detection, term-deposit maturity, scheduled payments, reminders) — **all in `Asia/Karachi` timezone**. They start once after DB connect via `initScheduledTasks()` / `initFinanceFlow()`.

### Realtime
Socket.io is initialized in [socket/socketHandler.js](apps/server/src/socket/socketHandler.js) and attached as `req.io`. Used for chat, notifications, and live branding updates (`business:branding_updated`).

### Client structure
- State is **Jotai** atoms in [apps/client/src/atoms.js](apps/client/src/atoms.js); `userAtom` / `memberAtom` persist to localStorage via `atomWithStorage`.
- Routing is split into role modules in [apps/client/src/routes](apps/client/src/routes): `LandingRoutes`, `AuthRoutes`, `AdminRoutes`, `SuperAdminRoutes`, `MemberRoutes`. `App.jsx` picks them based on domain (`IS_LANDING_DOMAIN` / `IS_APP_DOMAIN`), native flag, and `APP_MODE`.
- [apps/client/src/lib/constants.js](apps/client/src/lib/constants.js) derives environment behavior from `window.location.hostname` (prod `finflo.org`/`app.finflo.org` vs staging `test.`/`app-test.`) and detects native + member/business mode. **Note: `EMAIL_AUTH_ENABLED = false`** — only Google sign-in is live until SMTP is restored.
- Use the shared axios instance `@/lib/axios` (injects auth token); show feedback with `sonner` toasts. UI is shadcn/ui-style primitives in [apps/client/src/components/ui](apps/client/src/components/ui), Tailwind, Radix. `@/` aliases `src/`.
- `main.jsx` has **stale-chunk recovery**: after a deploy, old hashed chunks 404 and dynamic imports fail with a MIME error — it reloads once (guarded against loops).

## Conventions

[.agent/PROJECT_RULES.md](.agent/PROJECT_RULES.md) is the authoritative style guide — read it before adding features. Highlights:
- Controllers: `async/await` in `try/catch`, return `{ message }` on error, validate ownership (return **404** not 403 to avoid leaking existence).
- List endpoints: always paginate, returning `{ data, totalEntries, totalPages, currentPage }`.
- Models: include the tenant `user` ref, `{ timestamps: true }`, enums for fixed-value fields.
- File naming: components/pages/models `PascalCase`, controllers/routes `camelCase` matching their resource.

Sensitive Member fields are encrypted at rest via [utils/encryption.js](apps/server/src/utils/encryption.js) (`encryptFields`/`decryptFields`). Input is sanitized against NoSQL operator injection (strips `$`/`.` keys on body, params, and query) and HPP in [index.js](apps/server/src/index.js).

One-off maintenance/migration scripts live in [apps/server/src/scripts](apps/server/src/scripts) and [apps/server/scripts](apps/server/scripts) (e.g. `seedSuperAdmin.js`, `backfillLedger.js`); run with `node`.
