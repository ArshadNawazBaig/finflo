/**
 * Custom render that wraps a component in the providers most of the app's
 * components expect: a Jotai store and a router. Re-exports the rest of Testing
 * Library so test files import everything from one place.
 *
 * Pass `atomValues: [[atom, value], ...]` to hydrate atoms before render — needed
 * for atomWithStorage atoms (e.g. userAtom), which start at their default until a
 * storage subscription resolves and so read as null on first synchronous render.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider as JotaiProvider, createStore } from 'jotai';

export function renderWithProviders(
  ui,
  { route = '/', atomValues = [], ...options } = {},
) {
  const store = createStore();
  atomValues.forEach(([atom, value]) => store.set(atom, value));

  const Wrapper = ({ children }) => (
    <JotaiProvider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </JotaiProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
