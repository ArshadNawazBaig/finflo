# Server test suite

Integration + unit tests for the FinFlo server. Tests run the **real**
production code (services, controllers, models) against an in-memory MongoDB
**replica set** (`mongodb-memory-server`), so transactions, sessions, `$gte`
guards, CAS idempotency and rounding all execute for real.

```bash
npm run test            # one-off run (vitest run)
npm run test:watch      # watch mode
npx vitest run test/utils            # one folder
npx vitest run test/services/loanRepaymentService.test.js   # one file
```

## Layout

Tests are organised by the kind of unit under test. Each file is small and
focused on one module — no monolithic files.

```
test/
├── globalSetup.js     # starts ONE replica set for the whole run (URI → env)
├── setup.js           # connects mongoose once + wipes collections before each test
├── helpers/
│   ├── db.js          # clearCollections()
│   ├── factories.js   # makeOwner / makeMember / makeLoan / … fixtures
│   └── mocks.js       # ownerReq / memberReq / mockRes express doubles
├── utils/             # pure helpers (amortization, masking, encryption, …)
├── services/          # financial engine (repayment, late fees, limits, …)
├── models/            # schema validation (required fields, enums, defaults)
└── controllers/       # controller integration (member, report, raast, …)
```

## How the harness works

`globalSetup.js` boots a single replica set before any file and exposes its URI
via `process.env.MONGO_TEST_URI`; its teardown stops the server at the end.
`setup.js` (a vitest `setupFile`) connects mongoose once and clears every
collection in a `beforeEach`, so each test starts from a clean DB. Vitest runs
with `fileParallelism: false` + `isolate: false`, so the one connection is
shared across all files.

## Conventions

- Use the factories in `helpers/factories.js` for fixtures; only set the fields a
  test actually cares about.
- Pure schema checks use `validateSync()` (no DB round-trip); behavioural tests
  persist through the real models.
- Money is integer PKR; assert exact values — these tests exist to catch drift.
