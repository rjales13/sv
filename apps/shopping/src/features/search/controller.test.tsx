// @vitest-environment happy-dom

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  CruiseSearchProvider,
  CruiseSearchRequest,
  CruiseSearchResult,
} from '@vikings/contracts';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterHostShell } from '@/test-support/router-host-shell.tsx';
import '../../test-setup.ts';
import { ProvidersContext } from '../../app/data/providers-context.tsx';
import { createAppQueryClient } from '../../app/data/query-client.ts';
import { cruiseWorkspaceStore, type WorkspaceState } from '../../store/cruise-workspace.store.ts';
import { CruiseSearchController } from './controller.tsx';
import { resultsViewStore } from './lib/results-view-store.ts';
import {
  CANNED_RESULTS,
  pendingProvider,
  STUB_PRINCIPAL,
  stubProvider,
} from './test/search-fixtures.mock.ts';
import { stubCatalogsProvider } from './test/search-panel-options.mock.ts';

// The FR4 state machine + the NFR5 principal bridge, exercised against a STUB
// `CruiseSearchProvider` — so U6 imports no `@vikings/adapters` (FR6.2; the
// separate adapter-boundary test proves it statically). The stub returns canned
// `ok`/`empty`/`error` results, and the auth denied path is the port returning
// `error{kind:"denied"}`.

const NOW = new Date(2026, 8, 3);
// The form reads its lists from the catalogs port (VCX-10507); these tests are not about them.
const MOCK_CATALOGS = stubCatalogsProvider();

// The workspace store is a module singleton and now holds the search criteria, so without
// this a test inherits the previous one's search and fires a request on mount — which makes
// call-count assertions below meaningless.
const INITIAL_WORKSPACE: WorkspaceState = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL_WORKSPACE, true);
});

function renderController(provider: CruiseSearchProvider) {
  // The port is injected through context now, not a prop, because the controller reaches it
  // via Query — the same path production uses (ADR-006: one injection point). A router is in
  // scope, behind a host shell, because the result card navigates on "cruise details".
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext value={{ cruiseSearch: provider, searchCatalogs: MOCK_CATALOGS }}>
        <MemoryRouter>
          <RouterHostShell>
            <CruiseSearchController principal={STUB_PRINCIPAL} now={NOW} />
          </RouterHostShell>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
}

/**
 * Runs a search. SEARCH stays disabled until the panel holds input (VCX-10588 R7), so an empty
 * search bar gets a term first — the least that enables it. Every adapter these tests stub
 * ignores the term, so it changes nothing else.
 */
function submit() {
  const bar = screen.getByLabelText('Natural language search');
  if ((bar as HTMLInputElement).value === '') fireEvent.change(bar, { target: { value: 'nile' } });
  fireEvent.click(screen.getByTestId('search-submit'));
}

// The results-view store is a module singleton (it has to outlive the Search screen), so a
// filter switched in one test would otherwise still be on in the next.
beforeEach(() => {
  resultsViewStore.getState().resetView();
});

describe('CruiseSearchController — NFR5 principal bridge', () => {
  it('injects the principal and seeds the office currency into the request', async () => {
    const search = vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>(() =>
      Promise.resolve({ status: 'ok', results: CANNED_RESULTS }),
    );
    renderController({ search });

    submit();

    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    const request = search.mock.calls[0]?.[0];
    expect(request?.currency).toBe('USD'); // seeded from principal.officeCurrency
    expect(request?.principal.principalId).toBe('stub-agent');
    expect(request?.principal.officeCurrency).toBe('USD');
    expect(request?.principal.authorizationScopes).toEqual(['cruise.search']);
  });
});

describe('CruiseSearchController — FR4 state machine', () => {
  it('shows the loading state while the search is in flight', async () => {
    renderController(pendingProvider());
    submit();
    await waitFor(() => expect(screen.getByTestId('results-loading')).toBeInTheDocument());
  });

  it('shows the populated state for an ok result', async () => {
    renderController(stubProvider({ status: 'ok', results: CANNED_RESULTS }));
    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());
    // CANNED_RESULTS has 3 entries; GRAND_EUROPEAN is sold-out and hidden by default
    // (the sold-out toggle is OFF until the agent opts in — AC1).
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(2);
  });

  it('shows the empty state for an empty result', async () => {
    renderController(stubProvider({ status: 'empty' }));
    submit();
    await waitFor(() => expect(screen.getByTestId('results-empty')).toBeInTheDocument());
  });

  it('maps a denied error result into the accessible error state (NFR5 denied path)', async () => {
    renderController(
      stubProvider({
        status: 'error',
        kind: 'denied',
        message: 'Access to cruise search is denied.',
      }),
    );
    submit();
    await waitFor(() => expect(screen.getByTestId('results-error')).toBeInTheDocument());
    expect(screen.getByTestId('results-error')).toHaveTextContent(
      'Access to cruise search is denied.',
    );
  });
});

describe('CruiseSearchController — FR3.2 client-side sort/filter', () => {
  it('does not re-call the provider when the results are already populated (FR3.2)', async () => {
    // FR3.2: sort/filter are client-side; they must not trigger a new backend call.
    // The FiltersBar uses Radix Select which cannot be driven with fireEvent.change in
    // the happy-dom test environment ("only ever rendered closed" per test-setup.ts).
    // The invariant is proven here: provider is called exactly once on submit, and never
    // again simply because the populated results are on screen.
    const search = vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>(() =>
      Promise.resolve({ status: 'ok', results: CANNED_RESULTS }),
    );
    renderController({ search });

    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());
    expect(search).toHaveBeenCalledTimes(1);

    // No additional interactions — the point is that just showing the results
    // page does not cause a re-fetch. Filter/sort interaction is unit-tested in
    // results-view-model.test.ts.
    expect(search).toHaveBeenCalledTimes(1);
  });
});

// VCX-10482 R9 / AC 8: a running search never blocks the agent. Changing the criteria and
// searching again IS how a search is cancelled — the running one is dropped, not waited on —
// so the form stays usable and the newer search's results are what the screen shows.
describe('CruiseSearchController — a search that is still running', () => {
  it('lets the agent search again, and shows the newer results', async () => {
    const search = vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>((input) =>
      input.naturalLanguageQuery === 'slow'
        ? new Promise<CruiseSearchResult>(() => {})
        : Promise.resolve({ status: 'ok', results: CANNED_RESULTS }),
    );
    renderController({ search });

    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'slow' },
    });
    submit();
    expect(await screen.findByTestId('results-loading')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Natural language search'), {
      target: { value: 'rhine' },
    });
    submit();
    expect(await screen.findByTestId('results-populated')).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(2);
  });
});

describe('CruiseSearchController — recovering from a failure', () => {
  it('offers a retry on the error state, and retrying re-calls the port', async () => {
    // Without this the error state is a dead end: re-submitting identical criteria resolves
    // to the same cache key, so pressing Search again does nothing.
    const search = vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>(() =>
      Promise.resolve({ status: 'error', kind: 'upstream', message: 'EVO is down' }),
    );
    renderController({ search });

    submit();
    await waitFor(() => expect(screen.getByTestId('results-error')).toBeInTheDocument());
    expect(search).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('results-retry'));

    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  });

  it('re-runs the search when identical criteria are submitted again', async () => {
    // Same cache key, so the store write alone is a no-op inside staleTime — the agent would
    // press Search and see nothing happen.
    const search = vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>(() =>
      Promise.resolve({ status: 'ok', results: CANNED_RESULTS }),
    );
    renderController({ search });

    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());

    submit();

    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  });
});

// Regression, reported from the running app: the empty state's "Reset filters" cleared the
// RESULTS but left every field populated, so the screen claimed the filters were reset while
// the form still held the search that found nothing — and pressing Search reproduced it.
// Asserted end to end rather than on the panel alone, because the defect was in the WIRING:
// the controller was dropping the criteria instead of resetting the panel.
// VCX-10588 R1: a new search session opens with every filter in view.
describe('CruiseSearchController — the panel on first load', () => {
  it('opens expanded, with SEARCH and RESET disabled until there is input', async () => {
    renderController(stubProvider({ status: 'ok', results: [] }));
    expect(screen.getByTestId('sp-products')).toBeInTheDocument();
    expect(screen.getByTestId('sp-toggle')).toHaveTextContent(/less options/i);
    expect(screen.getByTestId('search-submit')).toBeDisabled();
    expect(screen.getByTestId('search-reset')).toBeDisabled();
    // AC 16: before any search, the pre-search state, not the empty one.
    expect(screen.getByTestId('results-idle')).toBeInTheDocument();
  });
});

describe('CruiseSearchController — the empty state resets the filters, not just the results', () => {
  it('returns the fields to their defaults when "Reset filters" is pressed', async () => {
    renderController(stubProvider({ status: 'ok', results: [] }));

    // The panel opens expanded (VCX-10588 R1), so the filters are already in reach.
    fireEvent.change(screen.getByLabelText('From nights'), { target: { value: '99' } });
    // The product list comes from the catalogs port (VCX-10507), so it arrives a tick later.
    fireEvent.click(await screen.findByLabelText('All products'));
    fireEvent.click(await screen.findByLabelText('River'));
    submit();

    fireEvent.click(await screen.findByTestId('results-reset'));

    // Searching collapsed the options, so reopen them to inspect the fields — the half that
    // used to be left behind.
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    await waitFor(() => expect(screen.getByLabelText('From nights')).toHaveValue(''));
    expect(screen.getByLabelText('All products')).toBeChecked();
    expect(screen.getByLabelText('River')).toBeDisabled();
    expect(screen.getByTestId('search-reset')).toBeDisabled();
    // And the results return to the pre-search placeholder.
    expect(screen.getByTestId('results-idle')).toBeInTheDocument();
  });
});
