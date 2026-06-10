# Frontend (React) rules

Applies to `apps/client`. React 18 + Vite, shadcn/ui + Tailwind + Radix, Jotai state, axios + sonner. `@/` aliases `src/`.

## Page component

```jsx
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/axios';
import { toast } from 'sonner';

const Resource = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/resource');
      setData(data.data); // paginated: { data, totalEntries, totalPages, currentPage }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  return (<div className="p-6"><PageHeader title="Resource" />{/* … */}</div>);
};
export default Resource;
```

## Modal component

Accept `{ isOpen, onClose, onSuccess }`; support create + edit via `initialData`; loading state on the submit button; call `onSuccess()` then `onClose()` on success. Use `@/components/ui/dialog`.

## State (Jotai)

- Atoms live in `@/atoms`. `userAtom` / `memberAtom` persist via `atomWithStorage`.
- Read with `useAtomValue(atom)`, write with `const set = useSetAtom(atom)`.
- After mutating the cached user, dispatch `window.dispatchEvent(new Event('userUpdated'))` so `usePermissions` re-reads.

## Data & auth

- Only `@/lib/axios` (injects token + base URL). Never import `axios` directly.
- Permission checks via `usePermissions()` (`hasPermission` / `hasAllPermissions` / `hasAnyPermission`; `'*'` is wildcard).
- Route guards: `RequireAuth`, `RequireAdmin` (super-admin), `RequireMemberAuth`, `RequirePaidPlan`.

## Environment & platform

- `@/lib/constants.js` derives prod vs staging from `window.location.hostname` and detects native (Capacitor) + member/business `APP_MODE`. Don't hardcode URLs — use the `getAppUrl` / `getLandingUrl` / `BACKEND_URL` helpers.
- `EMAIL_AUTH_ENABLED = false` — only Google sign-in is live; don't build email/password auth UI as the primary path.

## UI

- Reuse `@/components/ui` primitives (Button, Dialog, Input, Select, Card, Pagination, EmptyState, SensitiveData…). Check before creating a new one.
- Sensitive values render through `SensitiveData` / `SensitiveBalance`.
- Loading: skeleton components, not spinners, for lists/cards.

## Tests

Vitest + Testing Library under `apps/client/test/`. Use `renderWithProviders` and hydrate atoms via `atomValues`. Mock `@/lib/axios` + `sonner` with `vi.hoisted`. Lint must pass at `--max-warnings 0`.
