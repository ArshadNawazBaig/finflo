---
name: write-tests
description: Write focused Vitest tests for a given file or feature in FinFlo, using the established server (replica-set) or client (jsdom) harness and the project's factories/helpers. Use when the user asks to add or improve test coverage.
---

# Write Vitest tests

Identify whether the target is server or client, read the file under test plus a nearby existing test for the pattern, then write small, single-purpose test files into the matching `test/` folder. Never produce one giant suite.

## Server (`apps/server/test/`)

- Runs against a real in-memory replica set — **do not mock the database**. `globals: true`.
- Build fixtures with `test/helpers/factories.js`; drive controllers with `mockRes` / `ownerReq` / `memberReq` from `test/helpers/mocks.js`. Assert on `res.statusCode` / `res.body`.
- Cover: happy path, validation (400), tenant isolation (other owner → 404), and for money flows the ledger row + the rollback path.
- Hooks gotcha: if a model needs a required field that's auto-generated, it must be in `pre('validate')`. If a test exposes this as a bug, fix the model.
- Run one file: `cd apps/server && npx vitest run test/<path>.test.js`.

## Client (`apps/client/test/`)

- jsdom + Testing Library. Use `renderWithProviders` (`test/helpers/render.jsx`); hydrate atoms via `atomValues`.
- Mock `@/lib/axios` and `sonner` per file via `vi.hoisted` refs.
- Radix portals (Dialog/Select/Tooltip) → query via `screen` or stub them.
- Fake timers: use `getBy*`/`queryBy*` (not `findBy*`); advance debounces with `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`. Submit forms with `fireEvent.submit(form)` rather than clicking a shadcn submit button.
- Run one file: `cd apps/client && npx vitest run test/<path>.test.jsx`.

## Finish

Run the full workspace suite (`npm run test --workspace=apps/<server|client>`) and report the true pass/fail count. Genuine product bugs found via tests should be fixed at the source, not papered over.
