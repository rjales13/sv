// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  CruiseSearchProvider,
  CruiseSearchRequest,
  CruiseSearchResult,
  SearchCatalogs,
  SearchCatalogsProvider,
} from '@vikings/contracts';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../test-setup.ts';
import { ProvidersContext } from '../../app/data/providers-context.tsx';
import { createAppQueryClient } from '../../app/data/query-client.ts';
import { cruiseWorkspaceStore, type WorkspaceState } from '../../store/cruise-workspace.store.ts';
import { RouterHostShell } from '../../test-support/router-host-shell.tsx';
import { CruiseSearchController } from './controller.tsx';
import { resultsViewStore } from './lib/results-view-store.ts';
import { CANNED_RESULTS, STUB_PRINCIPAL } from './test/search-fixtures.mock.ts';
import { stubCatalogsProvider } from './test/search-panel-options.mock.ts';

// The search form reads its lists from the catalogs port (VCX-10507) instead of constants, and
// the search tells the agent when it had to stop at 200 sailings (AC 13).

const NOW = new Date(2026, 8, 3);
const INITIAL_WORKSPACE: WorkspaceState = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL_WORKSPACE, true);
  resultsViewStore.getState().resetView();
});

const CATALOGS: SearchCatalogs = {
  scopes: ['All', 'Ship'],
  products: [
    { product: 'River', brands: ['River'] },
    { product: 'Ocean', brands: ['Ocean', 'Expedition'] },
  ],
  portCities: [{ code: 'LXR', name: 'Luxor' }],
  hotelCities: [{ code: 'CAI', name: 'Cairo' }],
  currencies: [{ office: 'US', currency: 'USD' }],
  promos: [],
};

function searchReturning(result: CruiseSearchResult) {
  return vi.fn<(input: CruiseSearchRequest) => Promise<CruiseSearchResult>>(() =>
    Promise.resolve(result),
  );
}

function renderController(
  search: CruiseSearchProvider['search'],
  catalogs: SearchCatalogsProvider = stubCatalogsProvider({ status: 'ok', catalogs: CATALOGS }),
  agentOffice?: string,
) {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext value={{ cruiseSearch: { search }, searchCatalogs: catalogs }}>
        <MemoryRouter>
          {/* Opening a result navigates through the host shell (ADR-0010). */}
          <RouterHostShell>
            <CruiseSearchController
              principal={STUB_PRINCIPAL}
              now={NOW}
              agentOffice={agentOffice}
            />
          </RouterHostShell>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
}

/** The panel opens expanded (VCX-10588 R1); this reopens it only if a search collapsed it. */
function openFilters() {
  const toggle = screen.getByTestId('sp-toggle');
  if (/more options/i.test(toggle.textContent ?? '')) fireEvent.click(toggle);
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

describe('CruiseSearchController — the form reads its lists from the catalogs', () => {
  it('offers the products the catalogs list', async () => {
    renderController(searchReturning({ status: 'empty' }));
    openFilters();
    const products = screen.getByTestId('sp-products');
    await waitFor(() => expect(products).toHaveTextContent('Ocean'));
    expect(products).toHaveTextContent('River');
    expect(products).not.toHaveTextContent('Mississippi');
  });

  it('searches on the brands a product selects, not on its name', async () => {
    const search = searchReturning({ status: 'empty' });
    renderController(search);
    openFilters();
    // All products locks the types (VCX-10483); release them and leave only Ocean. The types
    // arrive with the catalogs, so wait for them before releasing the rail.
    const river = await screen.findByRole('checkbox', { name: 'River' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'All products' }));
    fireEvent.click(river);
    submit();

    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]?.[0].products).toEqual(['Ocean', 'Expedition']);
  });

  // VCX-10482 R2 / AC 1: an agent of the UK office starts in the UK office currency, and the
  // search runs in it. The office's currencies come with the catalogs, after the panel mounts.
  it("defaults the currency to the agent's CRM office, and searches in it", async () => {
    const search = searchReturning({ status: 'empty' });
    renderController(
      search,
      stubCatalogsProvider({
        status: 'ok',
        catalogs: { ...CATALOGS, currencies: [{ office: 'UK', currency: 'GBP' }] },
      }),
      'UK',
    );
    await waitFor(() => expect(screen.getByLabelText('Currency')).toHaveTextContent('GBP'));
    // The office currency is a default, so on its own it enables nothing.
    expect(screen.getByTestId('search-submit')).toBeDisabled();

    submit();
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]?.[0].currency).toBe('GBP');
  });

  it('says so when the lists fail, and still lets the agent search', async () => {
    const search = searchReturning({ status: 'empty' });
    renderController(
      search,
      stubCatalogsProvider({
        status: 'error',
        kind: 'upstream',
        message: 'The search lists could not be loaded.',
      }),
    );

    expect(await screen.findByTestId('search-catalogs-error')).toHaveTextContent(
      'The search lists could not be loaded.',
    );
    submit();
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  });
});

describe('CruiseSearchController — results limited to 200 (AC 13)', () => {
  it('tells the agent the results were limited and suggests narrowing', async () => {
    renderController(searchReturning({ status: 'ok', results: CANNED_RESULTS, limited: true }));
    submit();
    expect(await screen.findByTestId('results-limited')).toHaveTextContent(/narrow/i);
  });

  it('shows no such notice for a complete result', async () => {
    renderController(searchReturning({ status: 'ok', results: CANNED_RESULTS }));
    submit();
    await screen.findByTestId('results-populated');
    expect(screen.queryByTestId('results-limited')).not.toBeInTheDocument();
  });
});
