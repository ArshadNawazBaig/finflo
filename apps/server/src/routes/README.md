# API routes

All API routes are registered centrally in [`index.js`](./index.js) as a `[path, module]` table and mounted under **`/api`** in [`../index.js`](../index.js):

```js
const routes = [
  ['/loans', './loanRoutes'],
  ['/members', './memberRoutes'],
  // …
];
routes.forEach(([path, route]) => router.use(path, require(route)));
```

To add a resource: create `xRoutes.js`, then add one `['/x', './xRoutes']` row. Keep the table the single source of truth — don't `app.use` routes elsewhere.

## Two identity systems

- **User side** (super_admin / admin / staff) — guard with `protect` ([`../middleware/authMiddleware.js`](../middleware/authMiddleware.js)). `req.user.effectiveOwnerId` is the tenant scope.
- **Member side** (end-customer portal) — guard with `protectMember` ([`../middleware/memberAuthMiddleware.js`](../middleware/memberAuthMiddleware.js)). `req.member.user` is the owning business.

JWTs carry a `type` claim (`user` / `member` / pin / 2fa-pending); each middleware rejects the wrong type. Tokens arrive via `Authorization: Bearer` (mobile) or the `token` cookie (web).

## Route-file conventions

- Group with `router.route('/')` and `router.route('/:id')`; **custom-action routes go before `/:id`** so they aren't shadowed.
- Authorize with `authorizePermissions('manage_x', …)` (`'*'` / `super_admin` bypass) or the coarser `admin` / `staffOrAdmin`.
- Handlers are imported from `../controllers/xController`. Large controllers are split into `controllers/<domain>/*.js` sub-modules behind a thin re-export **barrel** (`member`, `loan`, `report`, `auth`) — routes import from the barrel unchanged.

## Cross-cutting wiring (in [`../index.js`](../index.js), not here)

- **Stripe webhook** (`/api/webhook`, `./webhookRoutes`) mounts **before** `express.json()` because Stripe needs the raw body — it is intentionally **not** in the table above.
- **Rate limiters** ([`../config/security.js`](../config/security.js)) are applied per-path and wrapped in `skipOptions` (skip CORS preflight):
  - `apiLimiter` — global on `/api/`
  - `authLimiter` — login / google sign-in (user + member)
  - `signupLimiter` — register / forgot-password
  - `otpLimiter` — verify-email / 2FA / reset-password / PIN verify
- Input is sanitized against NoSQL operator injection + HPP before routing.

## Mount table

| Prefix | Module | Prefix | Module |
|---|---|---|---|
| `/auth` | authRoutes | `/member-auth` | memberAuthRoutes |
| `/customers` | customerRoutes | `/members` | memberRoutes |
| `/loans` | loanRoutes | `/loan-products` | loanProductRoutes |
| `/groups` | groupRoutes | `/repayments` | repaymentRoutes |
| `/staff` | staffRoutes | `/roles` | roleRoutes |
| `/ledger` | ledgerRoutes | `/revenue` | revenueRoutes |
| `/reports` | reportRoutes | `/dashboard` | dashboardRoutes |
| `/branches` | branchRoutes | `/subscription` | subscriptionRoutes |
| `/term-deposits` | termDepositRoutes | `/saving-goals` | savingGoalRoutes |
| `/checkbooks` | checkbookRoutes | `/external-transfers` | externalTransferRoutes |
| `/scheduled-payments` | scheduledPaymentRoutes | `/expense-categories` | expenseCategoryRoutes |
| `/transfer-limit-tiers` | transferLimitTierRoutes | `/cash-flow-forecast` | cashFlowForecastRoutes |
| `/aml` | amlRoutes | `/disputes` | disputeRoutes |
| `/reviews` | reviewRoutes | `/tickets` | supportTicketRoutes |
| `/chat` | chatRoutes | `/communication` | communicationRoutes |
| `/notifications` | notificationRoutes | `/member-notifications` | memberNotificationRoutes |
| `/activity-logs` | activityLogRoutes | `/insights` | insightsRoutes |
| `/calendar` | calendarRoutes | `/search` | searchRoutes |
| `/ocr` | ocrRoutes | `/bulk-ops` | bulkOperationsRoutes |
| `/device-tokens` | deviceTokenRoutes | `/backup` | backupRoutes |
| `/system-settings` | systemSettingsRoutes | `/super-admin` | superAdminRoutes |
| `/contact` | contactRoutes | `/public` | publicRoutes |

_(Authoritative list: the `routes` array in [`index.js`](./index.js).)_
