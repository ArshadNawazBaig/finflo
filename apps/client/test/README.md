# Client test suite

Unit + component tests for the React client, run with **Vitest + Testing Library**
in a **jsdom** environment.

```bash
npm run test --workspace=apps/client       # one-off run
npm run test:watch --workspace=apps/client # watch mode
npx vitest run test/lib                     # one folder
npx vitest run test/branches/Branches.setDefault.test.jsx  # one file
```

## Layout

Tests are organised by functionality into folders, each file small and focused —
no monolithic suites.

```
test/
├── setup.js                # jest-dom matchers + per-test cleanup / localStorage reset
├── helpers/
│   └── render.jsx          # renderWithProviders (Jotai store + Router; hydrate atoms)
├── lib/                    # pure helpers from src/lib — one file per concern
│   ├── validation.test.js          (validateEmail, validatePassword)
│   ├── formatting.test.js          (currency / compact / date / CNIC)
│   ├── accountNumber.test.js       (generateDynamicAccountNumber)
│   ├── notificationLink.test.js    (getSafeNotificationLink)
│   ├── clipboard.test.js           (copyToClipboard + execCommand fallback)
│   ├── cn.test.js                  (tailwind class merge)
│   └── jwt.test.js                 (decodeJwt, isTokenExpired)
├── members/                # AddMemberModal branch-gating behaviour
│   ├── AddMemberModal.noBranch.test.jsx
│   └── AddMemberModal.defaultBranch.test.jsx
└── branches/               # Branches page default-branch UI
    └── Branches.setDefault.test.jsx
```

## Conventions

- Render components with `renderWithProviders` from `helpers/render`. For
  components that read `userAtom` (atomWithStorage), pass
  `{ atomValues: [[userAtom, { role: 'admin' }]] }` — these atoms read as `null`
  on first synchronous render otherwise.
- Mock `@/lib/axios` per test file (`vi.mock('@/lib/axios', …)`) and drive
  responses with `api.get.mockResolvedValue(...)`.
- Mock heavy/global-context children that aren't under test (KYC scanner,
  SignaturePad, the global-`TooltipProvider`-dependent `Tooltip`).
- Keep the `@` → `src` alias (configured in `vitest.config.js`) so imports match
  app code.
```
