# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FinFlo is a multi-tenant **Finance Management SaaS** for lending institutions (micro-finance lenders, lending cooperatives, savings committees). Each business that signs up is an isolated **tenant**; its end-customers sign into a separate **member portal**. The platform covers the full loan lifecycle — customer onboarding/KYC, issuance, repayment scheduling, late fees, default detection, profit distribution — plus savings accounts, term deposits, internal & external (Raast/bank) transfers, AML/CTR compliance, branch-scoped staff with role-based permissions, Stripe billing, and white-label branding. In production a single Express service serves both the JSON API and the built React SPA; the same client also ships as two Capacitor mobile apps (member + business).

## Monorepo layout

npm workspaces with two apps:
- [apps/server](apps/server) — Node.js / Express 5 + Mongoose 9 (MongoDB Atlas). Entry: [apps/server/src/index.js](apps/server/src/index.js).
- [apps/client](apps/client) — React 18 + Vite. Entry: [apps/client/src/main.jsx](apps/client/src/main.jsx) → [apps/client/src/App.jsx](apps/client/src/App.jsx).

The same client build is also packaged as **two Capacitor mobile apps** (member + business) from one codebase, selected at runtime by `APP_MODE`.

## Tech stack & languages

**Language:** JavaScript everywhere — **no TypeScript**. The server is CommonJS (`require` / `module.exports`, Node 18+); the client is ES modules + JSX. Use `.jsx` for React components, `.js` elsewhere.

**Server** ([apps/server](apps/server)) — Node.js + **Express 5**, **Mongoose 9** on MongoDB Atlas.
- Auth & security: `jsonwebtoken`, `bcryptjs`, `otplib` (TOTP 2FA), `google-auth-library` (Google sign-in); `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`, `express-validator`.
- Services: **Socket.io** (realtime), `node-cron` (scheduled jobs), **Stripe** (billing/webhooks), `multer` + **Cloudinary** (uploads), `nodemailer` (email).
- Documents/KYC: `tesseract.js` (OCR), `pdf-parse`, `exceljs`, `qrcode`.
- Tests: **Vitest** + `mongodb-memory-server`.

**Client** ([apps/client](apps/client)) — **React 18** + **Vite 5**.
- State **Jotai**, routing **React Router 6**, HTTP `axios`.
- UI: **Tailwind CSS 3** + **Radix UI** (shadcn-style primitives) + `class-variance-authority` + `lucide-react` + `framer-motion`; forms `react-hook-form`; toasts `sonner`; dates `date-fns`.
- Viz/media: `recharts` (charts), `three` + `@react-three/fiber` (3D), `jspdf`, `html5-qrcode`; `socket.io-client`.
- Mobile: **Capacitor 8** (Android + iOS).
- Tests: **Vitest** + Testing Library + jsdom.

**Tooling:** npm workspaces (monorepo), ESLint (client, `--max-warnings 0`), Docker / docker-compose, GitHub Actions (CI), Vercel + Railway (deploy targets).

## Commands

Run from the repo root unless noted.

```bash
npm install                 # install all workspace deps
npm run dev                 # server (:5001) + client (:5174) concurrently
npm run build               # build client → moves apps/client/dist to repo-root /public (served by the server)
npm run test                # runs the Vitest suite in BOTH workspaces (server + client)
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

## Testing

Both workspaces use **Vitest**. Tests live under `apps/*/test/`, organised into folders by kind (`controllers/`, `services/`, `models/`, `middleware/`, `utils/` on the server; `lib/`, `hooks/`, `components/`, plus feature folders on the client). Keep files **small and single-purpose** — one controller/service/component per file — rather than monolithic suites. CI runs both suites on push/PR to `staging` and `main` (`.github/workflows/deploy.yml`).

```bash
npm run test --workspace=apps/server                       # full server suite
npm run test --workspace=apps/client                       # full client suite
npm run test:watch --workspace=apps/server                 # watch mode
npx vitest run test/controllers/loanApproval.test.js       # one file (cd into the workspace first)
npx vitest run -t "rejects a duplicate"                    # one test by name
```

**Server harness** ([apps/server/vitest.config.js](apps/server/vitest.config.js)) runs against a real in-memory MongoDB **replica set** (`mongodb-memory-server`) so production transactions/sessions execute for real — *not* mocked. One replica set + one mongoose connection are shared across the whole run (`globalSetup.js` starts it; `setup.js` connects once and wipes every collection `beforeEach`); `fileParallelism: false` + `isolate: false`. Use the fixture factories and `mockRes`/`ownerReq` helpers in [apps/server/test/helpers](apps/server/test/helpers) — call controllers directly with a fake `req`/`res`, scoped by `effectiveOwnerId`. Gotchas worth knowing: a required field auto-generated in `pre('save')` fails validation — generate it in `pre('validate')`; the replica set's tight transaction-lock timeout is relaxed to 2000ms in `setup.js`.

**Client harness** ([apps/client/vitest.config.js](apps/client/vitest.config.js)) runs in jsdom with the React plugin and the `@`→`src` alias. jest-dom matchers are wired via the framework-agnostic `@testing-library/jest-dom/matchers` + `expect.extend` (the `/vitest` entry breaks under workspace hoisting). `renderWithProviders` in [apps/client/test/helpers/render.jsx](apps/client/test/helpers/render.jsx) wraps a component in a Jotai store + `MemoryRouter`; hydrate `atomWithStorage` atoms (e.g. `userAtom`) via its `atomValues` prop, since they read as null on first synchronous render. Gotchas: stub Radix portal components (Dialog/Select/Tooltip) or query them through `screen` (they portal to `document.body`); under fake timers use `getBy*` not `findBy*` (findBy polls on real timers); mock `@/lib/axios` and `sonner` per file with `vi.hoisted` refs.

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
All API routes are registered centrally in [apps/server/src/routes/index.js](apps/server/src/routes/index.js) (a `[path, module]` table mounted under `/api`; full map in [routes/README.md](apps/server/src/routes/README.md)). The webhook route is mounted **before** `express.json()` in [index.js](apps/server/src/index.js) because Stripe needs the raw body. Rate limiters (auth/otp/signup/generic) are applied per-path in `index.js` and skip OPTIONS preflights. Large controllers are decomposed into `controllers/<domain>/*.js` sub-modules behind a thin re-export **barrel** (`member`, `loan`, `report`, `auth`) — routes import the same handlers unchanged. All `/api` responses are auto-wrapped in a standard envelope (`{ success, data }` / `{ success, message }`) by [responseEnvelope.js](apps/server/src/middleware/responseEnvelope.js) and unwrapped transparently by the client axios instance, so controllers and pages are written as if the envelope didn't exist (`/api/health` is sent raw).

### Financial engine
Money flows live in [apps/server/src/services](apps/server/src/services) (`loanRepaymentService`, `lateFeeService`, `payoutService`, `creditLimitService`, etc.), not in controllers. Multi-document money operations use **MongoDB sessions/transactions** (`startSession` / `withTransaction`) and idempotent patterns (`findOneAndUpdate`, `$inc`, `ProcessedWebhookEvent` dedup) — preserve these when touching balances, repayments, distributions, or transfers. `FinancialTransaction` is the audit ledger; `ActivityLog` records user actions.

### Scheduled jobs
The `run*` job functions live in [services/jobs/](apps/server/src/services/jobs) (`loanJobs`, `savingJobs`, `memberJobs`, `paymentJobs`); [scheduledTasksService.js](apps/server/src/services/scheduledTasksService.js) is the **registrar** — `initScheduledTasks()` imports them and wires the `cron.schedule(...)` calls (overdue downgrade, late-fee accrual, saving-profit accrual/distribution, default detection, term-deposit maturity, scheduled payments) and re-exports every `run*` for direct testing. [reminderService.js](apps/server/src/services/reminderService.js) registers reminders via `initFinanceFlow()`. **All jobs run in `Asia/Karachi` timezone**, started once after DB connect.

### Realtime
Socket.io is initialized in [socket/socketHandler.js](apps/server/src/socket/socketHandler.js) and attached as `req.io`. Used for chat, notifications, and live branding updates (`business:branding_updated`).

### Client structure
- State is **Jotai** atoms in [apps/client/src/atoms.js](apps/client/src/atoms.js); `userAtom` / `memberAtom` persist to localStorage via `atomWithStorage`.
- Routing is split into role modules in [apps/client/src/routes](apps/client/src/routes): `LandingRoutes`, `AuthRoutes`, `AdminRoutes`, `SuperAdminRoutes`, `MemberRoutes`. `App.jsx` picks them based on domain (`IS_LANDING_DOMAIN` / `IS_APP_DOMAIN`), native flag, and `APP_MODE`.
- [apps/client/src/lib/constants.js](apps/client/src/lib/constants.js) derives environment behavior from `window.location.hostname` (prod `finflo.org`/`app.finflo.org` vs staging `test.`/`app-test.`) and detects native + member/business mode. **Note: `EMAIL_AUTH_ENABLED = false`** — only Google sign-in is live until SMTP is restored.
- Use the shared axios instance `@/lib/axios` (injects auth token); for simple GET-on-mount reads, `@/hooks/useApi` wraps the loading/error/abort lifecycle. Show feedback with `sonner` toasts. UI is shadcn/ui-style primitives in [apps/client/src/components/ui](apps/client/src/components/ui), Tailwind, Radix — including composed primitives `FormField`, `SectionHeader`, `AccountNumberField`, `StatusBadge`, `ModalShell`, `DataTable`. Shared hooks live in `@/hooks` (`useLogout`, `useClickOutside`, `useFormField`, `useApi`); display formatters in `@/lib/formatters`. `@/` aliases `src/`.
- `main.jsx` has **stale-chunk recovery**: after a deploy, old hashed chunks 404 and dynamic imports fail with a MIME error — it reloads once (guarded against loops).

## Conventions

The concise, always-on coding rules live in [.claude/rules/](.claude/rules) (imported below) — that's canonical for day-to-day work. [.agent/PROJECT_RULES.md](.agent/PROJECT_RULES.md) is the extended handbook (design system, API design, UI/UX standards) and the rule source for the Cline tool; consult it for depth.

Two repo-specific guards that aren't obvious from the code:
- Sensitive Member fields are encrypted at rest via [utils/encryption.js](apps/server/src/utils/encryption.js) (`encryptFields` / `decryptFields`).
- Input is sanitized against NoSQL operator injection (strips `$` / `.` keys on body, params, query) and HPP in [index.js](apps/server/src/index.js).

One-off maintenance/migration scripts live in [apps/server/src/scripts](apps/server/src/scripts) and [apps/server/scripts](apps/server/scripts) (e.g. `seedSuperAdmin.js`, `backfillLedger.js`); run with `node`.

## Claude toolkit (`.claude/`)

This repo ships project subagents, skills, and modular rules. The shared code-style rule is always-on (imported below). The backend and frontend rules are **scoped**: each app has a nested `CLAUDE.md` ([apps/server/CLAUDE.md](apps/server/CLAUDE.md) / [apps/client/CLAUDE.md](apps/client/CLAUDE.md)) that Claude Code loads automatically when you work in that workspace, so app-specific conventions layer in only when relevant.

@.claude/rules/code-style.md

- **Subagents** ([.claude/agents](.claude/agents)) — `backend-engineer`, `frontend-engineer`, `test-engineer`, `code-reviewer`. Delegate matching work to them via the Agent tool.
- **Skills** ([.claude/skills](.claude/skills)) — `/scaffold-resource`, `/write-tests`.
- **Rules** ([.claude/rules](.claude/rules)) — `code-style.md` (shared, always-on); `backend/express.md` (via apps/server/CLAUDE.md); `frontend/react.md` (via apps/client/CLAUDE.md).
