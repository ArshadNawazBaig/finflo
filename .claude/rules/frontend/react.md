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
- For a simple GET-on-mount read, prefer `useApi(url, opts)` (`@/hooks/useApi`) → `{ data, loading, error, refetch, setData }`; it cancels the in-flight request on unmount/param change (no stale-overwrite race). Paginated list pages with search/sort/infinite-scroll keep their bespoke `useCallback` fetcher.
- Format display values with `@/lib/formatters` (re-exported from `@/lib/utils`): `formatCurrency`, `formatDate`, `formatCNIC`, `formatPhoneNumber`, `formatAccountNumber`, `getInitials`. Don't hand-roll formatting.
- Permission checks via `usePermissions()` (`hasPermission` / `hasAllPermissions` / `hasAnyPermission`; `'*'` is wildcard).
- Route guards: `RequireAuth`, `RequireAdmin` (super-admin), `RequireMemberAuth`, `RequirePaidPlan`.

## Environment & platform

- `@/lib/constants.js` derives prod vs staging from `window.location.hostname` and detects native (Capacitor) + member/business `APP_MODE`. Don't hardcode URLs — use the `getAppUrl` / `getLandingUrl` / `BACKEND_URL` helpers.
- `EMAIL_AUTH_ENABLED = false` — only Google sign-in is live; don't build email/password auth UI as the primary path.

## UI

- Reuse `@/components/ui` primitives (Button, Dialog, Input, Select, Card, Pagination, EmptyState, SensitiveData…). Check before creating a new one.
- Composed primitives to prefer over re-inventing: `FormField` (label + control + error/hint), `SectionHeader`, `AccountNumberField` (read-only number + Generate), `StatusBadge` (semantic status → tone; extend its `STATUS_TONE` map rather than hand-coding status pills), `ModalShell` (fixed header / scroll body / fixed footer — use inside `<DialogContent className="p-0 overflow-hidden">`), `DataTable` (config-driven list + loading skeleton + empty state).
- Shared hooks in `@/hooks`: `useLogout` (user + member), `useClickOutside`, `useFormField`, `useApi`.
- Sensitive values render through `SensitiveData` / `SensitiveBalance`.
- Loading: skeleton components, not spinners, for lists/cards. `@/components/ui/PageSkeletons` is a barrel over `ui/skeletons/{shared,admin,member,teller}Skeletons`.
- New `ui/` files use a top-of-file `/* eslint-disable react/prop-types -- project convention: no propTypes */` (the repo has no propTypes); don't add propTypes.

## Tests

Vitest + Testing Library under `apps/client/test/`. Use `renderWithProviders` and hydrate atoms via `atomValues`. Mock `@/lib/axios` + `sonner` with `vi.hoisted`. Lint must pass at `--max-warnings 0`.
