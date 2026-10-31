// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { CategoryPricingAvailability, CruiseSearchProvider } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../../test-setup.ts';
import { ProvidersContext } from '../../app/data/providers-context.tsx';
import { createAppQueryClient } from '../../app/data/query-client.ts';
import { cruiseWorkspaceStore, type WorkspaceState } from '../../store/cruise-workspace.store.ts';
import { CruiseDetailsContainer } from './container.tsx';
import { stubAirProvider } from './test-support/air-pricing-stub.ts';
import { stubExtensionsProvider } from './test-support/extensions-stub.ts';

// VCX-10327. The container is the SHELL the four tabs plug into — header, tab strip, footer.
// Tab content is each tab's own story and renders through the <Outlet/>, so nothing here
// asserts on it.

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'agent-1',
  officeCurrency: 'USD',
  authorizationScopes: ['cruise.search'],
};

const REAL_CRUISE_ID = 'SBK270101T';

const CRUISE: CategoryPricingAvailability = {
  cruiseId: REAL_CRUISE_ID,
  cruiseName: 'Pharaohs & Pyramids',
  shipName: 'VIKING SOBEK',
  brand: 'River',
  itinerary: {
    fromPort: 'Luxor',
    toPort: 'Luxor',
    fromPortCode: 'LXR',
    toPortCode: 'LXR',
  },
  sailingDateFrom: '2027-01-01',
  sailingDateTo: '2027-01-08',
  nights: 7,
  availabilityStatus: 'Available',
  availableToSell: 4,
  categories: [],
};

/** A port stub. Feature code — tests included — depends on the port, never on an adapter. */
function stubProvider(results: CategoryPricingAvailability[]): CruiseSearchProvider {
  return { search: () => Promise.resolve({ status: 'ok', results }) };
}

const INITIAL: WorkspaceState = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL, true);
});

function renderAt(path: string, provider: CruiseSearchProvider = stubProvider([CRUISE])) {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext
        value={{
          cruiseSearch: provider,
          airCityPricing: stubAirProvider(),
          cruiseExtensions: stubExtensionsProvider(),
        }}
      >
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/cruise/:cruiseId/:tab"
              element={<CruiseDetailsContainer principal={PRINCIPAL} />}
            />
          </Routes>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
}

describe('CruiseDetailsContainer', () => {
  it('renders the cruise identity from the fixture data', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    // CruiseContextCard replaced the skeleton CruiseContextHeader.
    await screen.findByText('Pharaohs & Pyramids');
    expect(screen.getByText('VIKING SOBEK')).toBeInTheDocument();
    expect(screen.getByText(REAL_CRUISE_ID)).toBeInTheDocument();
    // Brand arrives singular on the wire and is tagged plural in the frames.
    expect(screen.getByText('Rivers')).toBeInTheDocument();
  });

  it('offers all four tabs, in the order the rendered frames show', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    const tabs = await screen.findByTestId('cruise-details-tabs');
    const labels = within(tabs)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Itinerary', 'Staterooms', 'Extensions', 'Viking Air']);
  });

  it('points each tab at its own URL, so any tab is deep-linkable', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    const tabs = await screen.findByTestId('cruise-details-tabs');
    expect(within(tabs).getByRole('link', { name: 'Viking Air' })).toHaveAttribute(
      'href',
      `/cruise/${REAL_CRUISE_ID}/air`,
    );
  });

  it('marks the tab named in the URL as current, not the first one', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/extensions`);

    const tabs = await screen.findByTestId('cruise-details-tabs');
    expect(within(tabs).getByRole('link', { name: 'Extensions' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the cruise in the workspace, so a deep link populates the tab strip', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    await screen.findByText('Pharaohs & Pyramids');
    expect(cruiseWorkspaceStore.getState().openCruises).toEqual([REAL_CRUISE_ID]);
  });

  it('names its tab in the workspace strip once the cruise resolves', async () => {
    // The strip opens a tab from the route before any name is known and shows the id until
    // the container fills it in (VCX-10326).
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    await screen.findByText('Pharaohs & Pyramids');
    await waitFor(() =>
      expect(cruiseWorkspaceStore.getState().cruiseLabels[REAL_CRUISE_ID]).toBe(
        'Pharaohs & Pyramids',
      ),
    );
  });

  it('keeps the build panel footer on screen alongside the header', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    // The Build Panel (VCX-10335) replaces the old placeholder footer bar.
    expect(await screen.findByText(/gross total/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
  });

  it('renders action buttons in the build panel footer', async () => {
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`);

    // The three action buttons render and are inert (not hidden) in the prototype (R5/AC).
    // Collapsed, the primary CTA reads "Review Booking" until the breakdown is expanded.
    expect(await screen.findByRole('button', { name: /save search/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /review booking/i })).toBeInTheDocument();
  });

  it('shows the empty state for a cruise with no detail data (ADR-0011)', async () => {
    // 17 of the 20 fixture records are not walkable, so this is the MAJORITY path, not an
    // edge case — and it must not read as a failure.
    renderAt('/cruise/NOT-A-REAL-CRUISE/itinerary');

    expect(await screen.findByTestId('cruise-details-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('cruise-details-error')).not.toBeInTheDocument();
  });

  it('surfaces a denied outcome as an error, not as an empty cruise', async () => {
    const denied: CruiseSearchProvider = {
      search: () =>
        Promise.resolve({ status: 'error', kind: 'denied', message: 'Not authorized' } as const),
    };
    renderAt(`/cruise/${REAL_CRUISE_ID}/itinerary`, denied);

    await waitFor(() => expect(screen.getByTestId('cruise-details-error')).toBeInTheDocument());
    expect(screen.getByText('Not authorized')).toBeInTheDocument();
  });
});
