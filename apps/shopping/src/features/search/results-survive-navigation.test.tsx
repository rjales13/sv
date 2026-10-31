// @vitest-environment happy-dom
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterHostShell } from '@/test-support/router-host-shell.tsx';
import '../../test-setup.ts';
import type { CruiseSearchResult } from '@vikings/contracts';
import { ProvidersContext } from '../../app/data/providers-context.tsx';
import { createAppQueryClient } from '../../app/data/query-client.ts';
import { cruiseWorkspaceStore, type WorkspaceState } from '../../store/cruise-workspace.store.ts';
import { CruiseSearchController } from './controller.tsx';
import { resultsViewStore } from './lib/results-view-store.ts';
import { CANNED_RESULTS, STUB_PRINCIPAL } from './test/search-fixtures.mock.ts';
import { stubCatalogsProvider } from './test/search-panel-options.mock.ts';

// VCX-10323. The multi-cruise workspace (VCX-10326) is unusable unless results outlive the
// Search screen: an agent opens a cruise, comes back, and opens another. Holding results in
// component state discarded them on unmount, so every return to Search forced a re-search.
//
// This is the test that pins the fix — the state now lives in the Query cache, which is
// shared across mounts.

const NOW = new Date(2026, 8, 3);
// The form reads its lists from the catalogs port (VCX-10507); these tests are not about them.
const MOCK_CATALOGS = stubCatalogsProvider();

// The store is a module singleton, so without this the second test inherits the first's
// criteria and its assertions are vacuous.
const INITIAL: WorkspaceState = cruiseWorkspaceStore.getState();
const INITIAL_VIEW = resultsViewStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL, true);
  resultsViewStore.setState(INITIAL_VIEW, true);
});

/** One client for the whole test, the way the composition root holds one for the app. */
function harness(client = createAppQueryClient()) {
  // Spy-backed so the second assertion can prove the return trip costs no call.
  const search = vi.fn(
    (): Promise<CruiseSearchResult> => Promise.resolve({ status: 'ok', results: CANNED_RESULTS }),
  );
  const provider = { search };
  const ui = (
    <QueryClientProvider client={client}>
      <ProvidersContext value={{ cruiseSearch: provider, searchCatalogs: MOCK_CATALOGS }}>
        <MemoryRouter>
          <RouterHostShell>
            <CruiseSearchController principal={STUB_PRINCIPAL} now={NOW} />
          </RouterHostShell>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>
  );
  return { ui, search };
}

/**
 * A client that treats data as stale immediately, so remounting triggers `refetchOnMount`.
 *
 * This is the realistic case the first version of this fix missed: an agent reads a cruise
 * for longer than `staleTime` and comes back. Remounting instantly (as the tests below do)
 * hides it entirely.
 */
function staleImmediatelyClient(): QueryClient {
  const client = createAppQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, staleTime: 0 } });
  return client;
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

describe('search results across navigation', () => {
  it('still shows results after the Search screen unmounts and remounts', async () => {
    const { ui } = harness();

    const first = render(ui);
    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());

    // Leaving for a cruise and coming back is an unmount/remount of this screen.
    first.unmount();
    render(ui);

    expect(await screen.findByTestId('results-populated')).toBeInTheDocument();
    expect(screen.queryByTestId('results-idle')).not.toBeInTheDocument();
  });

  it('keeps the results on screen while a stale set refetches in the background', async () => {
    // With staleTime elapsed, coming back triggers a refetch. Blanking to the loading state
    // while that runs reproduces the very defect this ticket fixes — just on a delay.
    const { ui } = harness(staleImmediatelyClient());

    const first = render(ui);
    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());

    first.unmount();
    render(ui);

    // Present on the FIRST paint after remount, not merely once the refetch resolves.
    expect(screen.getByTestId('results-populated')).toBeInTheDocument();
    expect(screen.queryByTestId('results-loading')).not.toBeInTheDocument();
  });

  it('does not re-call the port on the way back', async () => {
    // The whole point is that returning is free. A refetch would also re-price the quote the
    // agent is part-way through reading out.
    const { ui, search } = harness();

    const first = render(ui);
    submit();
    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());
    const callsAfterSearch = search.mock.calls.length;

    first.unmount();
    render(ui);
    await screen.findByTestId('results-populated');

    expect(search.mock.calls.length).toBe(callsAfterSearch);
  });
});

// The agent returns to the same place in the list, not just to the same results. That needs
// three things to survive the remount: the scroll offset, and everything that decides which
// cards are in the list and where — the filters, the sort, and the dismissible alert above
// the cards (left dismissed, it would come back and push every card down).
describe('the results list across navigation', () => {
  async function searchAndWait(ui: React.ReactElement) {
    const view = render(ui);
    submit();
    await screen.findByTestId('results-populated');
    return view;
  }

  function scrollResultsTo(top: number) {
    const area = screen.getByTestId('results-scroll');
    area.scrollTop = top;
    fireEvent.scroll(area);
  }

  it('returns to the scroll position the agent left', async () => {
    const { ui } = harness();
    const first = await searchAndWait(ui);
    scrollResultsTo(640);

    first.unmount();
    render(ui);

    await screen.findByTestId('results-populated');
    expect(screen.getByTestId('results-scroll').scrollTop).toBe(640);
  });

  it('keeps the filters the agent set, so the same cards are in the list', async () => {
    const { ui } = harness();
    const first = await searchAndWait(ui);
    fireEvent.click(screen.getByRole('switch', { name: /sold-out cruises/i }));
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(3);

    first.unmount();
    render(ui);

    await screen.findByTestId('results-populated');
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(3);
  });

  it('keeps a dismissed pricing alert dismissed, so the cards do not shift down', async () => {
    const { ui } = harness();
    const first = await searchAndWait(ui);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));

    first.unmount();
    render(ui);

    await screen.findByTestId('results-populated');
    expect(screen.queryByTestId('results-pricing-alert')).not.toBeInTheDocument();
  });

  it('starts a new search at the top of its results', async () => {
    const { ui } = harness();
    await searchAndWait(ui);
    scrollResultsTo(640);

    // Different criteria: a new result set, so the old offset means nothing in it.
    fireEvent.click(screen.getByTestId('sp-toggle'));
    fireEvent.change(screen.getByLabelText('To nights'), { target: { value: '21' } });
    submit();

    await waitFor(() => expect(screen.getByTestId('results-scroll').scrollTop).toBe(0));
  });
});
